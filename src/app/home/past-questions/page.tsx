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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { ArrowLeft, Loader2, Sparkles, FileQuestion, Calendar, Check, Send, Clock, Lightbulb, CheckCircle, XCircle, Save, Trash2, Plus, Timer as TimerIcon, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
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
import { useCollection, useFirestore } from "@/firebase";
import { collection, DocumentData, CollectionReference } from "firebase/firestore";
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
}

type ViewState = 'select' | 'mode-select' | 'taking' | 'results';
type ExamMode = 'trial' | 'exam';

type QuizQuestion = GenerateQuizOutput['quiz'][0];

type SavedExam = {
    id: number;
    date: string;
    selections: { examBody: string; university: string; schoolFaculty: string; subject: string; year: string; };
    questions: QuizQuestion[];
    examAnswers: Record<number, string>;
    examScore: number;
    results: AiAssessmentRevisionRoadmapOutput;
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
    const [selections, setSelections] = useState({ examBody: "", university: "", schoolFaculty: "", subject: "", year: "" });
    
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<AiAssessmentRevisionRoadmapOutput | null>(null);

    const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
    const [examScore, setExamScore] = useState(0);
    const [examDuration, setExamDuration] = useState(20);

    const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
    const [currentExamId, setCurrentExamId] = useState<number>(0);

    const [isNewExamDialogOpen, setIsNewExamDialogOpen] = useState(false);
    const [questionsCurrentPage, setQuestionsCurrentPage] = useState(0);

    // Merged institutions
    const allUniversities = useMemo(() => {
        const customNames = customUnis?.map(u => u.name) || [];
        return Array.from(new Set([...staticUnis, ...customNames])).sort();
    }, [customUnis]);

    // Dynamic options
    const examBodies = useMemo(() => allQuestions ? Array.from(new Set(allQuestions.map(q => q.level))) : [], [allQuestions]);
    
    const universities = useMemo(() => selections.examBody === 'University'
        ? allUniversities.filter(name => allQuestions?.some(q => q.university === name))
        : [], [allQuestions, selections.examBody, allUniversities]);

    const faculties = useMemo(() => selections.university && allQuestions
        ? Array.from(new Set(allQuestions.filter(q => q.university === selections.university).map(q => q.schoolFaculty).filter(Boolean) as string[]))
        : [], [allQuestions, selections.university]);

    const subjects = useMemo(() => {
        if (!allQuestions || !selections.examBody) return [];
        let filtered = allQuestions.filter(q => q.level === selections.examBody);
        if (selections.examBody === 'University') {
            filtered = filtered.filter(q => q.university === selections.university && (!selections.schoolFaculty || q.schoolFaculty === selections.schoolFaculty));
        }
        return Array.from(new Set(filtered.map(q => q.subject)));
    }, [allQuestions, selections]);

    const years = useMemo(() => {
        if (!allQuestions || !selections.subject) return [];
        let filtered = allQuestions.filter(q => q.level === selections.examBody && q.subject === selections.subject);
        if (selections.examBody === 'University') {
            filtered = filtered.filter(q => q.university === selections.university && (!selections.schoolFaculty || q.schoolFaculty === selections.schoolFaculty));
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
        
        setExamDuration(paper?.durationMinutes || 20);
        setIsNewExamDialogOpen(false);
        setViewState('mode-select');
    };
    
    const handleSelectMode = async (mode: ExamMode) => {
        setExamMode(mode);
        setViewState('taking');
        setIsLoading(true);
        try {
            const result = await generateQuiz({
                context: 'note-generator',
                topic: `${selections.subject} - ${selections.year}`,
                academicLevel: selections.examBody as any,
                content: `Generate 20 MCQ questions for ${selections.subject} ${selections.examBody} ${selections.year}.`
            });
            setQuestions(result.quiz.slice(0, 20));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            setViewState('mode-select');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitForReview = async (finalAnswers: Record<number, string>) => {
        setIsLoading(true);
        setViewState('results');
        
        let finalScore = 0;
        questions.forEach((q, i) => { if (finalAnswers[i] === q.correctAnswer) finalScore++; });
        setExamAnswers(finalAnswers);
        setExamScore(finalScore);

        try {
            const result = await aiAssessmentRevisionRoadmap({
                examResults: `Score: ${finalScore}/${questions.length}`,
                studentLevel: selections.examBody,
                university: selections.university,
                department: selections.schoolFaculty,
                course: selections.subject
            });
            setResults(result);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Review Failed' });
        } finally {
            setIsLoading(false);
        }
    };

    if (viewState === 'select') {
        return (
            <>
                <HomeHeader />
                <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Past Questions</h1>
                        <Button onClick={() => setIsNewExamDialogOpen(true)} disabled={questionsLoading}>New Exam</Button>
                    </div>
                    {savedExams.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {savedExams.map(exam => (
                                <Card key={exam.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => {
                                    setSelections(exam.selections);
                                    setQuestions(exam.questions);
                                    setExamAnswers(exam.examAnswers);
                                    setExamScore(exam.examScore);
                                    setResults(exam.results);
                                    setViewState('results');
                                }}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{exam.selections.subject}</CardTitle>
                                        <CardDescription>{exam.date} • Score: {exam.examScore}/{exam.questions.length}</CardDescription>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    ) : <p className="text-center text-muted-foreground py-20">No saved sessions yet.</p>}

                    <Dialog open={isNewExamDialogOpen} onOpenChange={setIsNewExamDialogOpen}>
                        <DialogContent>
                            <DialogHeader><DialogTitle>New Exam</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <Select onValueChange={v => setSelections({examBody: v, university: "", schoolFaculty: "", subject: "", year: ""})} value={selections.examBody}>
                                    <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                                    <SelectContent>{examBodies.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                </Select>
                                {selections.examBody === 'University' && (
                                    <Select onValueChange={v => setSelections(p => ({...p, university: v, schoolFaculty: "", subject: "", year: ""}))} value={selections.university}>
                                        <SelectTrigger><SelectValue placeholder="University" /></SelectTrigger>
                                        <SelectContent>{universities.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                    </Select>
                                )}
                                <Select onValueChange={v => setSelections(p => ({...p, subject: v, year: ""}))} value={selections.subject} disabled={!selections.examBody}>
                                    <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                                    <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select onValueChange={v => setSelections(p => ({...p, year: v}))} value={selections.year} disabled={!selections.subject}>
                                    <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                                    <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <DialogFooter><Button onClick={handleStart} className="w-full">Start</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </>
        );
    }

    if (viewState === 'mode-select') {
        return (
            <><HomeHeader left={<Button variant="outline" onClick={() => setViewState('select')}><ArrowLeft className="mr-2"/></Button>} />
            <div className="p-8 max-w-2xl mx-auto space-y-8 flex-1 flex flex-col justify-center">
                <div className="text-center space-y-2"><h2 className="text-3xl font-bold">Choose Mode</h2><p className="text-muted-foreground">Practice or simulate the real thing.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="hover:border-primary cursor-pointer transition-all" onClick={() => handleSelectMode('trial')}><CardHeader><CardTitle>Trial</CardTitle><CardDescription>Hints and instant AI explanations.</CardDescription></CardHeader></Card>
                    <Card className="hover:border-primary cursor-pointer transition-all" onClick={() => handleSelectMode('exam')}><CardHeader><CardTitle>Exam</CardTitle><CardDescription>Timed test without assistance.</CardDescription></CardHeader></Card>
                </div>
            </div></>
        );
    }

    if (viewState === 'taking') {
        const header = <HomeHeader left={<Button variant="outline" onClick={() => setViewState('mode-select')}><ArrowLeft className="mr-2"/></Button>} />;
        if (isLoading) return <>{header}<div className="flex-1 flex flex-col items-center justify-center"><Loader2 className="animate-spin text-primary"/><p className="mt-4">Preparing questions...</p></div></>;
        return <>{header}{examMode === 'trial' ? <TrialModeView questions={questions} topic={selections.subject} onFinish={handleSubmitForReview} /> : <ExamModeView questions={questions} topic={selections.subject} durationMinutes={examDuration} onSubmit={handleSubmitForReview} />}</>;
    }

    if (viewState === 'results') {
        return (
            <><HomeHeader left={<Button variant="outline" onClick={() => setViewState('select')}><ArrowLeft className="mr-2"/></Button>} />
            <div className="p-4 max-w-4xl mx-auto space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div><CardTitle className="text-2xl">Results: {examScore}/{questions.length}</CardTitle><CardDescription>{selections.subject} ({selections.year})</CardDescription></div>
                        <Button onClick={() => {
                            const updated = [{id: Date.now(), date: new Date().toLocaleDateString(), selections, questions, examAnswers, examScore, results}, ...savedExams];
                            setSavedExams(updated);
                            saveExamsToStorage(updated);
                            toast({ title: "Saved" });
                        }}><Save className="mr-2"/>Save</Button>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="roadmap">
                            <TabsList className="grid grid-cols-2"><TabsTrigger value="roadmap">Revision Roadmap</TabsTrigger><TabsTrigger value="corrections">Corrections</TabsTrigger></TabsList>
                            <TabsContent value="roadmap" className="p-4 prose dark:prose-invert max-w-none">
                                {isLoading ? <Loader2 className="animate-spin mx-auto"/> : <ReactMarkdown remarkPlugins={[remarkGfm]}>{results?.revisionRoadmap || "No roadmap available."}</ReactMarkdown>}
                            </TabsContent>
                            <TabsContent value="corrections" className="space-y-4 mt-4">
                                {questions.map((q, i) => (
                                    <div key={i} className={cn("p-4 border rounded-lg", examAnswers[i] === q.correctAnswer ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30")}>
                                        <p className="font-semibold">{i+1}. {q.questionText}</p>
                                        <p className="text-sm mt-2">Your: <span className="font-bold">{examAnswers[i] || "Skipped"}</span></p>
                                        <p className="text-sm">Correct: <span className="font-bold text-green-600">{q.correctAnswer}</span></p>
                                        <div className="mt-2 text-xs italic opacity-80">{q.explanation}</div>
                                    </div>
                                ))}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div></>
        );
    }

    return null;
}

function TrialModeView({ questions, topic, onFinish }: { questions: QuizQuestion[], topic: string, onFinish: (answers: Record<number, string>) => void }) {
    const [index, setIndex] = useState(0);
    const [ans, setAns] = useState<string | null>(null);
    const [checked, setChecked] = useState(false);
    const [all, setAll] = useState<Record<number, string>>({});
    
    const q = questions[index];
    const isCorrect = ans === q.correctAnswer;

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-6">
            <div className="space-y-2"><div className="flex justify-between text-sm"><span>Question {index+1}/{questions.length}</span></div><Progress value={((index+1)/questions.length)*100} /></div>
            <Card>
                <CardHeader><CardTitle>{q.questionText}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {q.options.map((opt, i) => (
                        <div key={i} className={cn("flex items-center p-4 border rounded-lg cursor-pointer transition-all", !checked && ans === opt && "border-primary bg-primary/5", checked && opt === q.correctAnswer && "border-green-500 bg-green-50", checked && ans === opt && !isCorrect && "border-destructive bg-destructive/5")} onClick={() => !checked && setAns(opt)}>
                            <div className={cn("w-4 h-4 rounded-full border mr-3", ans === opt && "bg-primary border-primary")}/>
                            <span className="text-sm">{opt}</span>
                        </div>
                    ))}
                    {checked && <Alert className={cn("mt-4", isCorrect ? "bg-green-50" : "bg-destructive/5")}><div className="flex gap-2"><Lightbulb className="h-4 w-4"/><AlertDescription><p className="font-bold">{isCorrect ? "Correct!" : "Incorrect"}</p><p className="text-xs mt-1">{q.explanation}</p></AlertDescription></div></Alert>}
                </CardContent>
                <CardFooter className="justify-end gap-2">
                    {!checked ? <Button onClick={() => { setChecked(true); setAll(p => ({...p, [index]: ans || ""})) }} disabled={!ans}>Check</Button> : <Button onClick={() => { if(index < questions.length - 1) { setIndex(i => i+1); setAns(null); setChecked(false); } else onFinish(all); }}>{index === questions.length - 1 ? "Finish" : "Next"}</Button>}
                </CardFooter>
            </Card>
        </div>
    );
}

function ExamModeView({ questions, topic, durationMinutes, onSubmit }: { questions: QuizQuestion[], topic: string, durationMinutes: number, onSubmit: (answers: Record<number, string>) => void }) {
    const [index, setIndex] = useState(0);
    const [ans, setAns] = useState<Record<number, string>>({});
    const [time, setTime] = useState(durationMinutes * 60);

    useEffect(() => {
        const t = setInterval(() => setTime(v => { if(v <= 1) { clearInterval(t); onSubmit(ans); return 0; } return v - 1; }), 1000);
        return () => clearInterval(t);
    }, [ans, onSubmit]);

    return (
        <div className="p-4 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-4 text-xl font-mono"><TimerIcon className="h-5 w-5"/>{Math.floor(time/60)}:{(time%60).toString().padStart(2,'0')}</div>
                <Button variant="outline" onClick={() => onSubmit(ans)}>Submit</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader><CardTitle>{questions[index].questionText}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {questions[index].options.map((opt, i) => (
                            <div key={i} className={cn("flex items-center p-4 border rounded-lg cursor-pointer", ans[index] === opt && "border-primary bg-primary/5")} onClick={() => setAns(p => ({...p, [index]: opt}))}>
                                <div className={cn("w-4 h-4 rounded-full border mr-3", ans[index] === opt && "bg-primary border-primary")}/>
                                <span className="text-sm">{opt}</span>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="justify-between"><Button variant="ghost" onClick={() => setIndex(i => i-1)} disabled={index === 0}>Prev</Button><Button onClick={() => setIndex(i => i+1)} disabled={index === questions.length-1}>Next</Button></CardFooter>
                </Card>
                <Card><CardHeader><CardTitle className="text-sm uppercase text-muted-foreground">Progress</CardTitle></CardHeader><CardContent><div className="grid grid-cols-5 gap-2">{questions.map((_, i) => <button key={i} onClick={() => setIndex(i)} className={cn("h-8 w-8 rounded text-xs border font-bold", index === i ? "bg-primary text-primary-foreground border-primary" : ans[i] ? "bg-secondary" : "bg-background")}>{i+1}</button>)}</div></CardContent></Card>
            </div>
        </div>
    );
}