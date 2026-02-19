
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { ArrowLeft, Loader2, Sparkles, FileQuestion, Calendar, Check, Send, Clock, Lightbulb, CheckCircle, XCircle, Save, Trash2, Plus, Timer as TimerIcon, ChevronLeft, ChevronRight, AlertCircle, ArrowRight, PlayCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { aiAssessmentRevisionRoadmap, AiAssessmentRevisionRoadmapOutput } from "@/ai/flows/ai-assessment-revision-roadmap";
import { generateQuiz, GenerateQuizOutput } from "@/ai/flows/generate-quiz";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore } from "@/firebase";
import { collection, DocumentData, CollectionReference, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Label } from "@/components/ui/label";
import { universities as staticUnis } from "@/lib/ghana-universities";

interface PastQuestion extends DocumentData {
    id: string;
    level: string;
    subject: string;
    year: string;
    university?: string;
    schoolFaculty?: string;
    durationMinutes?: number;
    totalQuestions?: number;
    extractedText?: string;
}

type ViewState = 'select' | 'mode-select' | 'taking' | 'results';
type ExamMode = 'trial' | 'exam';

type QuizQuestion = GenerateQuizOutput['quiz'][0];

type SavedExam = {
    id: number;
    date: string;
    selections: { examBody: string; university: string; schoolFaculty: string; subject: string; year: string; courseCode?: string };
    questions: QuizQuestion[];
    examAnswers: Record<number, string>;
    examScore: number;
    results: AiAssessmentRevisionRoadmapOutput | null;
    status: 'Completed' | 'In Progress';
    currentPart: number;
    examMode: ExamMode;
    totalQuestionsInPaper: number;
};

export default function PastQuestionsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const questionsQuery = useMemo(() => firestore ? collection(firestore, 'past_questions') as CollectionReference<PastQuestion> : null, [firestore]);
    const { data: allQuestions, loading: questionsLoading } = useCollection<PastQuestion>(questionsQuery);
    
    const { data: customUnis } = useCollection<{id: string, name: string}>(
        useMemo(() => firestore ? collection(firestore, 'custom_universities') as any : null, [firestore])
    );

    const [viewState, setViewState] = useState<ViewState>('select');
    const [examMode, setExamMode] = useState<ExamMode>('trial');
    const [selections, setSelections] = useState({ examBody: "", university: "", schoolFaculty: "", subject: "", year: "", courseCode: "" });
    
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [allQuestionsInSession, setAllQuestionsInSession] = useState<QuizQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<AiAssessmentRevisionRoadmapOutput | null>(null);

    const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
    const [examScore, setExamScore] = useState(0);
    const [examDuration, setExamDuration] = useState(20);
    const [totalQuestionsInPaper, setTotalQuestionsInPaper] = useState(20);
    const [currentPart, setCurrentPart] = useState(1);
    const [loadingPart, setLoadingPart] = useState(1);
    const [currentExamId, setCurrentExamId] = useState<number | null>(null);
    const [hasSavedResults, setHasSavedResults] = useState(false);

    const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
    const [isNewExamDialogOpen, setIsNewExamDialogOpen] = useState(false);

    const allUniversities = useMemo(() => {
        const customNames = customUnis?.map(u => u.name) || [];
        return Array.from(new Set([...staticUnis, ...customNames])).sort();
    }, [customUnis]);

    const examBodies = useMemo(() => allQuestions ? Array.from(new Set(allQuestions.map(q => q.level))) : [], [allQuestions]);
    
    const universities = useMemo(() => selections.examBody === 'University'
        ? allUniversities.filter(name => allQuestions?.some(q => q.university === name))
        : [], [allQuestions, selections.examBody, allUniversities]);

    const subjects = useMemo(() => {
        if (!allQuestions || !selections.examBody) return [];
        let filtered = allQuestions.filter(q => q.level === selections.examBody);
        if (selections.examBody === 'University') {
            filtered = filtered.filter(q => q.university === selections.university);
        }
        return Array.from(new Set(filtered.map(q => q.subject)));
    }, [allQuestions, selections]);

    const years = useMemo(() => {
        if (!allQuestions || !selections.subject) return [];
        let filtered = allQuestions.filter(q => q.level === selections.examBody && q.subject === selections.subject);
        if (selections.examBody === 'University') {
            filtered = filtered.filter(q => q.university === selections.university);
        }
        return Array.from(new Set(filtered.map(q => q.year)));
    }, [allQuestions, selections]);

    useEffect(() => {
        try {
            const data = localStorage.getItem('learnwithtemi_saved_exams');
            if (data) setSavedExams(JSON.parse(data));
        } catch (e) {}
    }, []);

    const saveExamsToStorage = (exams: SavedExam[]) => {
        try { localStorage.setItem('learnwithtemi_saved_exams', JSON.stringify(exams)); } catch (e) {}
    };

    const handleStart = () => {
        if (!selections.examBody || !selections.subject || !selections.year || (selections.examBody === 'University' && !selections.university)) {
            toast({ variant: 'destructive', title: 'Complete selections' });
            return;
        }
        
        const paper = allQuestions?.find(q => 
            q.level === selections.examBody && 
            q.subject === selections.subject && 
            q.year === selections.year &&
            (!selections.university || q.university === selections.university)
        );
        
        setCurrentExamId(null); // Fresh session
        setHasSavedResults(false);
        setExamDuration(paper?.durationMinutes || 20);
        setTotalQuestionsInPaper(paper?.totalQuestions || 20);
        setSelections(p => ({ ...p, courseCode: paper?.courseCode || "" }));
        setCurrentPart(1);
        setExamAnswers({});
        setAllQuestionsInSession([]);
        setExamScore(0);
        setResults(null);
        setIsNewExamDialogOpen(false);
        setViewState('mode-select');
    };
    
    const handleSelectMode = async (mode: ExamMode) => {
        setExamMode(mode);
        setViewState('taking');
        loadBatch(1);
    };

    const loadBatch = async (part: number) => {
        if (!firestore) return;
        setLoadingPart(part);
        setIsLoading(true);
        
        try {
            const paper = allQuestions?.find(q => 
                q.level === selections.examBody && 
                q.subject === selections.subject && 
                q.year === selections.year &&
                (!selections.university || q.university === selections.university)
            );

            if (!paper) throw new Error("Paper metadata not found.");

            const batchDocRef = doc(firestore, "past_questions", paper.id, "batches", part.toString());
            const batchSnap = await getDoc(batchDocRef);

            let batchQuestions: QuizQuestion[] = [];

            if (batchSnap.exists()) {
                batchQuestions = batchSnap.data().questions;
            } else {
                const sourceContent = paper?.extractedText || `Generate high-quality MCQ questions for ${selections.subject} ${selections.examBody} ${selections.year}.`;

                const result = await generateQuiz({
                    context: 'past-question',
                    topic: `${selections.subject} - ${selections.year}`,
                    academicLevel: selections.examBody as any,
                    content: sourceContent,
                    partNumber: part
                });
                
                batchQuestions = result.quiz;

                await setDoc(batchDocRef, {
                    questions: batchQuestions,
                    partNumber: part,
                    generatedAt: serverTimestamp()
                }).catch(e => console.warn("Failed to cache batch:", e));
            }
            
            setQuestions(batchQuestions);
            setAllQuestionsInSession(prev => {
                const combined = [...prev];
                const startIdx = (part - 1) * 20;
                combined.splice(startIdx, 20, ...batchQuestions);
                return combined;
            });
            setCurrentPart(part);
        } catch (e: any) {
            console.error("Batch load error:", e);
            toast({ variant: 'destructive', title: 'Error', description: "Could not load exam questions. Check your connection." });
            setViewState('mode-select');
        } finally {
            setIsLoading(false);
        }
    }

    const handleNextPart = (answersFromBatch: Record<number, string>) => {
        setExamAnswers(prev => ({ ...prev, ...answersFromBatch }));
        loadBatch(currentPart + 1);
    };

    const handleSubmitForReview = async (finalAnswers: Record<number, string>) => {
        setIsLoading(true);
        setViewState('results');
        setHasSavedResults(false);
        
        const mergedAnswers = { ...examAnswers, ...finalAnswers };
        setExamAnswers(mergedAnswers);

        let finalCumulativeScore = 0;
        allQuestionsInSession.forEach((q, i) => { 
            if (mergedAnswers[i] === q.correctAnswer) finalCumulativeScore++; 
        });
        setExamScore(finalCumulativeScore);

        try {
            const result = await aiAssessmentRevisionRoadmap({
                examResults: `Score: ${finalCumulativeScore}/${allQuestionsInSession.length}`,
                studentLevel: selections.examBody,
                university: selections.university,
                course: selections.subject
            });
            setResults(result);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Review Failed' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAndExit = (currentAnswers: Record<number, string>) => {
        const mergedAnswers = { ...examAnswers, ...currentAnswers };
        const examId = currentExamId || Date.now();
        
        const score = allQuestionsInSession.reduce((acc, q, i) => {
            return mergedAnswers[i] === q.correctAnswer ? acc + 1 : acc;
        }, 0);
        
        const isFullyComplete = (currentPart * 20) >= totalQuestionsInPaper;

        const newExam: SavedExam = {
            id: examId,
            date: new Date().toLocaleDateString(),
            selections,
            questions: allQuestionsInSession,
            examAnswers: mergedAnswers,
            examScore: score,
            results: results,
            status: isFullyComplete ? 'Completed' : 'In Progress',
            currentPart,
            examMode,
            totalQuestionsInPaper
        };
        const updated = [newExam, ...savedExams.filter(e => e.id !== examId)];
        setSavedExams(updated);
        saveExamsToStorage(updated);
        setViewState('select');
        toast({ title: "Progress Saved", description: "You can resume this session later from your hub." });
    };

    const handleResume = (exam: SavedExam) => {
        setSelections(exam.selections);
        setAllQuestionsInSession(exam.questions);
        setQuestions(exam.questions.slice((exam.currentPart-1)*20, exam.currentPart*20)); 
        setExamAnswers(exam.examAnswers);
        setExamScore(exam.examScore);
        setResults(exam.results);
        setExamMode(exam.examMode);
        setCurrentPart(exam.currentPart);
        setTotalQuestionsInPaper(exam.totalQuestionsInPaper);
        setCurrentExamId(exam.id);
        setHasSavedResults(false);
        
        const paper = allQuestions?.find(q => 
            q.level === exam.selections.examBody && 
            q.subject === exam.selections.subject && 
            q.year === exam.selections.year &&
            (!exam.selections.university || q.university === exam.selections.university)
        );
        setExamDuration(paper?.durationMinutes || 20);

        if (exam.status === 'Completed') {
            setViewState('results');
        } else {
            setViewState('taking');
            const questionsAnsweredInCurrentBatch = Object.keys(exam.examAnswers).filter(k => {
                const idx = parseInt(k);
                return idx >= (exam.currentPart - 1) * 20 && idx < exam.currentPart * 20;
            }).length;

            if (questionsAnsweredInCurrentBatch >= 20 && (exam.currentPart * 20) < exam.totalQuestionsInPaper) {
                loadBatch(exam.currentPart + 1);
            }
        }
    };

    const handleDeleteSavedExam = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        const updated = savedExams.filter(exam => exam.id !== id);
        setSavedExams(updated);
        saveExamsToStorage(updated);
        toast({ title: "Session Removed" });
    };

    if (viewState === 'select') {
        return (
            <>
                <HomeHeader />
                <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-4xl font-headline font-bold">Past Questions Hub</h1>
                            <p className="text-muted-foreground mt-1 text-balance">Test your knowledge and get an AI-powered revision plan.</p>
                        </div>
                        <Button 
                            variant="outline"
                            onClick={() => setIsNewExamDialogOpen(true)} 
                            disabled={questionsLoading}
                            className="bg-primary hover:bg-primary/90 font-semibold w-fit text-primary-foreground self-end"
                        >
                            Take New Exam
                        </Button>
                    </div>

                    <div className="mt-8">
                        {savedExams.length === 0 ? (
                            <Card className="flex flex-col items-center justify-center p-12 border-dashed border-2">
                                <h3 className="text-2xl font-bold mb-2">No Saved Exams</h3>
                                <p className="text-muted-foreground">Your completed or in-progress exam sessions will appear here.</p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {savedExams.map(exam => {
                                    const progress = Math.min(Math.round(((exam.currentPart * 20) / exam.totalQuestionsInPaper) * 100), 100);
                                    return (
                                        <Card key={exam.id} className="cursor-pointer hover:shadow-md transition-shadow relative flex flex-col" onClick={() => handleResume(exam)}>
                                            <CardHeader>
                                                <div className="flex justify-between items-start pr-6 gap-2">
                                                    <CardTitle className="text-lg leading-tight">{exam.selections.subject}</CardTitle>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        {exam.status === 'In Progress' ? (
                                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{progress}% Done</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>
                                                        )}
                                                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">{exam.examMode === 'trial' ? 'Trial Mode' : 'Exam Mode'}</Badge>
                                                    </div>
                                                </div>
                                                <CardDescription className="space-y-1 pt-2">
                                                    <div className="font-medium text-foreground/80">{exam.selections.university || exam.selections.examBody}</div>
                                                    {exam.selections.courseCode && <div className="text-xs text-primary font-semibold">{exam.selections.courseCode}</div>}
                                                    <div className="flex items-center gap-2 mt-2 pt-1 border-t">
                                                        <Calendar className="h-3 w-3" /> {exam.date}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 font-medium text-foreground">
                                                        {exam.status === 'Completed' ? (
                                                            <><CheckCircle className="h-3 w-3 text-green-500" /> Final Score: {exam.examScore}/{exam.questions.length}</>
                                                        ) : (
                                                            <><Clock className="h-3 w-3 text-blue-500" /> Score so far: {exam.examScore}/{exam.questions.length}</>
                                                        )}
                                                    </div>
                                                </CardDescription>
                                            </CardHeader>
                                            <CardFooter className="pt-0 mt-auto">
                                                <Button variant="ghost" size="sm" className="ml-auto text-primary gap-2">
                                                    {exam.status === 'In Progress' ? <PlayCircle className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                    {exam.status === 'In Progress' ? 'Continue Exam' : 'View Results'}
                                                </Button>
                                            </CardFooter>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteSavedExam(e, exam.id); }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <Dialog open={isNewExamDialogOpen} onOpenChange={setIsNewExamDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>New Exam Session</DialogTitle>
                                <DialogDescription>Select the details of the exam paper you want to practice.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Exam Level</Label>
                                    <Select onValueChange={v => setSelections({examBody: v, university: "", schoolFaculty: "", subject: "", year: "", courseCode: ""})} value={selections.examBody}>
                                        <SelectTrigger><SelectValue placeholder="Select level..." /></SelectTrigger>
                                        <SelectContent>{examBodies.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>

                                {selections.examBody === 'University' && (
                                    <div className="space-y-2 text-left">
                                        <Label>Institution</Label>
                                        <Select onValueChange={v => setSelections(p => ({...p, university: v, schoolFaculty: "", subject: "", year: "", courseCode: ""}))} value={selections.university}>
                                            <SelectTrigger><SelectValue placeholder="Select institution..." /></SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {allUniversities.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="space-y-2 text-left">
                                    <Label>Subject</Label>
                                    <Select onValueChange={v => setSelections(p => ({...p, subject: v, year: "", courseCode: ""}))} value={selections.subject} disabled={!selections.examBody}>
                                        <SelectTrigger><SelectValue placeholder="Select subject..." /></SelectTrigger>
                                        <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 text-left">
                                    <Label>Year</Label>
                                    <Select onValueChange={v => setSelections(p => ({...p, year: v}))} value={selections.year} disabled={!selections.subject}>
                                        <SelectTrigger><SelectValue placeholder="Select year..." /></SelectTrigger>
                                        <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleStart} className="w-full h-12 text-base font-bold">Continue</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </>
        );
    }

    if (viewState === 'mode-select') {
        return (
            <>
                <HomeHeader left={<Button variant="outline" onClick={() => setViewState('select')}><ArrowLeft className="mr-2 h-4 w-4"/></Button>} />
                <div className="p-8 max-w-2xl mx-auto space-y-8 flex-1 flex flex-col justify-center">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-headline font-bold">Choose Mode</h2>
                        <p className="text-muted-foreground">Practice or simulate the real exam environment.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card 
                            className="hover:border-primary cursor-pointer transition-all hover:shadow-md p-6 flex flex-col gap-4" 
                            onClick={() => handleSelectMode('trial')}
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Trial Mode</h3>
                                <p className="text-sm text-muted-foreground mt-1">Perfect for learning. Get instant AI explanations and hints for every question.</p>
                            </div>
                        </Card>
                        <Card 
                            className="hover:border-primary cursor-pointer transition-all hover:shadow-md p-6 flex flex-col gap-4" 
                            onClick={() => handleSelectMode('exam')}
                        >
                            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                <TimerIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Exam Mode</h3>
                                <p className="text-sm text-muted-foreground mt-1">Timed simulation. Test yourself under pressure with no assistance until the end.</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </>
        );
    }

    if (viewState === 'taking') {
        const header = <HomeHeader left={<Button variant="outline" onClick={() => setViewState('mode-select')}><ArrowLeft className="mr-2 h-4 w-4"/></Button>} />;
        if (isLoading) return (
            <>
                {header}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                    <p className="mt-4 text-muted-foreground font-medium">Preparing Part {loadingPart} of your AI-powered exam...</p>
                </div>
            </>
        );
        return (
            <>
                {header}
                {examMode === 'trial' ? (
                    <TrialModeView 
                        questions={questions} 
                        topic={selections.subject} 
                        part={currentPart}
                        totalQuestions={totalQuestionsInPaper}
                        onNextPart={handleNextPart}
                        onSaveAndExit={handleSaveAndExit}
                        onFinish={handleSubmitForReview} 
                    />
                ) : (
                    <ExamModeView 
                        questions={questions} 
                        topic={selections.subject} 
                        durationMinutes={examDuration} 
                        totalQuestions={totalQuestionsInPaper}
                        part={currentPart}
                        onNextPart={handleNextPart}
                        onSaveAndExit={handleSaveAndExit}
                        onSubmit={handleSubmitForReview}
                        onTimeout={handleSaveAndExit}
                    />
                )}
            </>
        );
    }

    if (viewState === 'results') {
        return (
            <>
                <HomeHeader left={<Button variant="outline" onClick={() => setViewState('select')}><ArrowLeft className="mr-2 h-4 w-4"/></Button>} />
                <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
                    <Card>
                        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-2xl font-headline">Results: {examScore}/{allQuestionsInSession.length}</CardTitle>
                                <CardDescription>{selections.subject} - {selections.year} ({examMode === 'trial' ? 'Trial Mode' : 'Exam Mode'})</CardDescription>
                            </div>
                            <Button 
                                disabled={hasSavedResults}
                                onClick={() => {
                                    const examId = currentExamId || Date.now();
                                    const isFullyComplete = (currentPart * 20) >= totalQuestionsInPaper;
                                    const newExam: SavedExam = {
                                        id: examId,
                                        date: new Date().toLocaleDateString(),
                                        selections,
                                        questions: allQuestionsInSession,
                                        examAnswers,
                                        examScore,
                                        results: results,
                                        status: isFullyComplete ? 'Completed' : 'In Progress',
                                        currentPart,
                                        examMode,
                                        totalQuestionsInPaper
                                    };
                                    const updated = [newExam, ...savedExams.filter(e => e.id !== examId)];
                                    setSavedExams(updated);
                                    saveExamsToStorage(updated);
                                    setHasSavedResults(true);
                                    toast({ title: "Session Saved", description: "Your results have been added to your hub." });
                                }}
                            >
                                <Save className="mr-2 h-4 w-4"/> {hasSavedResults ? "Saved" : "Save Session"}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="roadmap">
                                <TabsList className="grid grid-cols-2 bg-secondary">
                                    <TabsTrigger value="roadmap">AI Revision Roadmap</TabsTrigger>
                                    <TabsTrigger value="corrections">Corrections</TabsTrigger>
                                </TabsList>
                                <TabsContent value="roadmap" className="mt-6 w-full max-w-0 min-w-full">
                                    {isLoading ? (
                                        <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary"/></div>
                                    ) : (
                                        <div className="prose dark:prose-invert max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{results?.revisionRoadmap || "No roadmap available."}</ReactMarkdown>
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="corrections" className="space-y-4 mt-6">
                                    {allQuestionsInSession.map((q, i) => (
                                        <div key={i} className={cn("p-4 border rounded-lg", examAnswers[i] === q.correctAnswer ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30")}>
                                            <p className="font-semibold">{i+1}. {q.questionText}</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                                                <div className="text-sm">
                                                    <span className="text-muted-foreground block">Your Answer:</span>
                                                    <span className={cn("font-bold", examAnswers[i] === q.correctAnswer ? "text-green-600" : "text-destructive")}>
                                                        {examAnswers[i] || "Skipped"}
                                                    </span>
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-muted-foreground block">Correct Answer:</span>
                                                    <span className="font-bold text-green-600">{q.correctAnswer}</span>
                                                </div>
                                            </div>
                                            <Separator className="my-4" />
                                            <div className="mt-4 p-3 bg-background rounded border text-xs italic">
                                                <p className="font-semibold not-italic mb-1">Explanation:</p>
                                                {q.explanation}
                                            </div>
                                        </div>
                                    ))}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return null;
}

function TrialModeView({ questions, topic, part, totalQuestions, onNextPart, onSaveAndExit, onFinish }: { 
    questions: QuizQuestion[], 
    topic: string, 
    part: number,
    totalQuestions: number,
    onNextPart: (answers: Record<number, string>) => void,
    onSaveAndExit: (answers: Record<number, string>) => void,
    onFinish: (answers: Record<number, string>) => void 
}) {
    const [index, setIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [allAnswers, setAllAnswers] = useState<Record<number, string>>({});
    
    const q = questions[index];
    const maxParts = Math.ceil(totalQuestions / 20) || 1;
    const isEndOfBatch = index === questions.length - 1;
    const hasNextPart = part < maxParts;

    const handleAnswerSelect = (val: string) => {
        if (isAnswered) return;
        setSelectedAnswer(val);
    };

    const handleCheck = () => {
        setIsAnswered(true);
        setAllAnswers(prev => ({ ...prev, [(part - 1) * 20 + index]: selectedAnswer || "" }));
    };

    const handleNext = () => {
        if (!isEndOfBatch) {
            setIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsAnswered(false);
        } else {
            if (hasNextPart) {
                onNextPart(allAnswers);
            } else {
                onFinish(allAnswers);
            }
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6 pb-24">
            <div className="space-y-3">
                <div className="flex justify-between items-end text-sm">
                    <span className="font-medium font-headline">Trial Mode - Part {part} of {maxParts}: Question {(part-1)*20 + index + 1} of {totalQuestions}</span>
                    <span className="text-muted-foreground">{Math.round(((index+1)/questions.length)*100)}% of part</span>
                </div>
                <Progress value={((index+1)/questions.length)*100} className="h-2" />
            </div>

            <Card className="shadow-lg border-2">
                <CardHeader>
                    <CardTitle className="text-xl leading-relaxed font-headline">{q.questionText}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <RadioGroup 
                        value={selectedAnswer || ""} 
                        onValueChange={handleAnswerSelect}
                        disabled={isAnswered}
                        className="space-y-3"
                    >
                        {q.options.map((option, i) => {
                            const isOptionCorrect = option === q.correctAnswer;
                            const isOptionSelected = selectedAnswer === option;
                            
                            return (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "flex items-center space-x-3 space-y-0 p-4 rounded-xl border-2 transition-all cursor-pointer",
                                        !isAnswered && isOptionSelected && "bg-primary/5 border-primary shadow-sm",
                                        isAnswered && isOptionCorrect && "bg-green-100 dark:bg-green-900/50 border-green-500",
                                        isAnswered && isOptionSelected && !isOptionCorrect && "bg-red-100 dark:bg-red-900/50 border-destructive",
                                        !isOptionSelected && "hover:bg-secondary/50 border-border"
                                    )} 
                                    onClick={() => handleAnswerSelect(option)}
                                >
                                    <RadioGroupItem value={option} id={`option-${i}`} />
                                    <Label htmlFor={`option-${i}`} className="font-medium flex-1 cursor-pointer text-base leading-tight">
                                        {option}
                                    </Label>
                                    {isAnswered && isOptionCorrect && <CheckCircle className="text-green-500 shrink-0 h-5 w-5" />}
                                    {isAnswered && isOptionSelected && !isOptionCorrect && <XCircle className="text-destructive shrink-0 h-5 w-5" />}
                                </div>
                            );
                        })}
                    </RadioGroup>

                    {isAnswered && (
                        <Card className="mt-6 bg-secondary/30 border-primary/20">
                            <CardHeader className="flex-row items-center gap-2 pb-2">
                                <Lightbulb className="w-5 h-5 text-yellow-500" />
                                <CardTitle className="text-base font-bold">Explanation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground leading-relaxed italic">
                                    {q.explanation}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {!isAnswered && q.hint && (
                        <details className="mt-4 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-dashed">
                            <summary className="cursor-pointer font-semibold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                Need a hint?
                            </summary>
                            <p className="pt-2 pl-6">{q.hint}</p>
                        </details>
                    )}
                </CardContent>
                <CardFooter className="flex-col gap-4 pt-6 border-t mt-4">
                    {isEndOfBatch && isAnswered && hasNextPart && (
                        <Alert className="bg-primary/5 border-primary/20 mb-2">
                            <AlertCircle className="h-4 w-4 text-primary" />
                            <AlertTitle className="font-bold">Part {part} Complete!</AlertTitle>
                            <AlertDescription>
                                You've finished this batch. There are a total of {totalQuestions} questions in this paper ({maxParts} parts). Click below to proceed to the next part or save for later.
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    <div className="flex justify-between items-center w-full gap-2">
                        <Button variant="ghost" onClick={() => onSaveAndExit(allAnswers)} className="text-muted-foreground hover:text-primary shrink-0">
                            <Save className="mr-2 h-4 w-4"/> Save & Exit
                        </Button>
                        
                        <div className="flex gap-2 ml-auto">
                            {!isAnswered ? (
                                <Button 
                                    onClick={handleCheck} 
                                    disabled={!selectedAnswer} 
                                    size="lg" 
                                    className="font-bold"
                                >
                                    Check Answer
                                </Button>
                            ) : (
                                <Button 
                                    onClick={handleNext} 
                                    size="lg" 
                                    className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    {isEndOfBatch ? (hasNextPart ? "Continue to Part " + (part + 1) : "Complete Trial") : "Next Question"} 
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

function ExamModeView({ questions, topic, durationMinutes, totalQuestions, part, onSubmit, onNextPart, onSaveAndExit, onTimeout }: { 
    questions: QuizQuestion[], 
    topic: string, 
    durationMinutes: number, 
    totalQuestions: number,
    part: number,
    onSubmit: (answers: Record<number, string>) => void,
    onNextPart: (answers: Record<number, string>) => void,
    onSaveAndExit: (answers: Record<number, string>) => void,
    onTimeout: (answers: Record<number, string>) => void
}) {
    const [index, setIndex] = useState(0);
    const [ans, setAns] = useState<Record<number, string>>({});
    
    const totalParts = Math.ceil(totalQuestions / 20) || 1;
    const partDurationSeconds = (durationMinutes / totalParts) * 60;
    const [time, setTime] = useState(Math.floor(partDurationSeconds));

    const isEndOfBatch = index === questions.length - 1;
    const hasNextPart = part < totalParts;

    const ansRef = useRef(ans);
    useEffect(() => { ansRef.current = ans; }, [ans]);

    useEffect(() => {
        if (time > 0) {
            const t = setInterval(() => {
                setTime(v => v - 1);
            }, 1000);
            return () => clearInterval(t);
        } else {
            onTimeout(ansRef.current);
        }
    }, [time, onTimeout]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnsSelect = (val: string) => {
        const absoluteIndex = (part - 1) * 20 + index;
        setAns(p => ({ ...p, [absoluteIndex]: val }));
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-24">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border shadow-sm sticky top-0 z-10">
                <div className={cn(
                    "flex items-center gap-3 text-2xl font-mono font-bold",
                    time < 60 ? "text-destructive animate-pulse" : "text-primary"
                )}>
                    <TimerIcon className="h-6 w-6"/> {formatTime(time)}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onSaveAndExit(ans)} className="text-muted-foreground hover:text-primary">
                        <Save className="mr-2 h-4 w-4"/> Save for Later
                    </Button>
                    <Button variant="destructive" onClick={() => onSubmit(ans)} className="font-bold">
                        Submit Exam
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <Card className="lg:col-span-3 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xl leading-relaxed">
                            <span className="text-primary mr-2">Q{(part-1)*20 + index + 1}.</span>
                            {questions[index].questionText}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {questions[index].options.map((opt, i) => {
                            const absoluteIndex = (part-1)*20 + index;
                            return (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "flex items-center p-4 border rounded-xl cursor-pointer transition-all hover:bg-secondary/50", 
                                        ans[absoluteIndex] === opt && "border-primary bg-primary/5 ring-1 ring-primary"
                                    )} 
                                    onClick={() => handleAnsSelect(opt)}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center shrink-0", 
                                        ans[absoluteIndex] === opt ? "border-primary" : "border-muted-foreground/30"
                                    )}>
                                        {ans[absoluteIndex] === opt && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                    </div>
                                    <span className="text-sm font-medium">{opt}</span>
                                </div>
                            );
                        })}
                    </CardContent>
                    <CardFooter className="flex-col gap-4 pt-6 border-t mt-4">
                        {isEndOfBatch && hasNextPart && (
                            <Alert className="bg-primary/5 border-primary/20 mb-2">
                                <AlertCircle className="h-4 w-4 text-primary" />
                                <AlertTitle className="font-bold">Part {part} Batch Complete!</AlertTitle>
                                <AlertDescription>
                                    You've reached the end of this 20-question segment. Click "Continue" to proceed to Part {part+1} with a fresh timer.
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="flex justify-between items-center w-full">
                            <Button variant="ghost" onClick={() => setIndex(i => i-1)} disabled={index === 0}>
                                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                            </Button>
                            
                            <Button 
                                variant={isEndOfBatch ? "default" : "ghost"}
                                onClick={() => {
                                    if (!isEndOfBatch) setIndex(i => i + 1);
                                    else if (hasNextPart) onNextPart(ans);
                                    else onSubmit(ans);
                                }}
                            >
                                {isEndOfBatch ? (hasNextPart ? "Continue to Part " + (part + 1) : "Submit Exam") : <>Next <ChevronRight className="ml-2 h-4 w-4" /></>}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
                <Card className="shadow-sm border-2">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Part {part} Navigator</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-5 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                            {questions.map((_, i) => {
                                const absIdx = (part-1)*20 + i;
                                return (
                                    <button 
                                        key={i} 
                                        onClick={() => setIndex(i)} 
                                        className={cn(
                                            "h-10 w-full rounded-lg text-xs border-2 font-bold transition-all", 
                                            index === i ? "bg-primary text-primary-foreground border-primary shadow-inner" : (ans[absIdx] ? "bg-green-100 border-green-200 text-green-700" : "bg-background border-muted hover:border-muted-foreground/50")
                                        )}
                                    >
                                        {(part-1)*20 + i + 1}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-6 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="w-3 h-3 bg-primary rounded shadow-sm" /> Current
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded" /> Answered
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="w-3 h-3 bg-background border border-muted rounded" /> Unanswered
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
