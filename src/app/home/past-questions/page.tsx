
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

    // Dynamic dropdown options derived from Firestore data
    const examBodies = useMemo(() => allQuestions ? [...new Set(allQuestions.map(q => q.level))] : [], [allQuestions]);
    
    const universities = useMemo(() => selections.examBody === 'University' && allQuestions
        ? [...new Set(allQuestions.filter(q => q.level === 'University').map(q => q.university).filter(Boolean) as string[])]
        : [], [allQuestions, selections.examBody]);

    const faculties = useMemo(() => selections.university && allQuestions
        ? [...new Set(allQuestions.filter(q => q.university === selections.university).map(q => q.schoolFaculty).filter(Boolean) as string[])]
        : [], [allQuestions, selections.university]);

    const subjects = useMemo(() => {
        if (!allQuestions || !selections.examBody) return [];
        if (selections.examBody === 'University') {
            if (!selections.university) return [];
            return [...new Set(allQuestions.filter(q => q.university === selections.university && (!selections.schoolFaculty || q.schoolFaculty === selections.schoolFaculty)).map(q => q.subject))];
        }
        return [...new Set(allQuestions.filter(q => q.level === selections.examBody).map(q => q.subject))];
    }, [allQuestions, selections]);

    const years = useMemo(() => {
        if (!allQuestions || !selections.subject) return [];
        return [...new Set(allQuestions.filter(q => q.level === selections.examBody && q.subject === selections.subject && (!selections.university || q.university === selections.university) && (!selections.schoolFaculty || q.schoolFaculty === selections.schoolFaculty)).map(q => q.year))];
    }, [allQuestions, selections]);

    useEffect(() => {
        try {
            const data = localStorage.getItem('learnwithtemi_saved_exams');
            if (data) {
                setSavedExams(JSON.parse(data));
            }
        } catch (e) {
            console.error("Failed to load saved exams", e);
        }
    }, []);

    const saveExamsToStorage = (exams: SavedExam[]) => {
        try {
            localStorage.setItem('learnwithtemi_saved_exams', JSON.stringify(exams));
        } catch (e) {
            console.error("Failed to save exams", e);
            toast({ variant: 'destructive', title: 'Could not save exam', description: 'Your browser storage might be full.' });
        }
    };

    const handleExamBodyChange = (value: string) => {
        setSelections({ examBody: value, university: "", schoolFaculty: "", subject: "", year: "" });
    };

    const handleUniversityChange = (value: string) => {
        setSelections(prev => ({ ...prev, university: value, schoolFaculty: "", subject: "", year: "" }));
    }

    const handleSchoolFacultyChange = (value: string) => {
        setSelections(prev => ({ ...prev, schoolFaculty: value, subject: "", year: "" }));
    };

    const handleSubjectChange = (value: string) => {
        setSelections(prev => ({ ...prev, subject: value, year: "" }));
    };

    const handleStart = () => {
        if (!selections.examBody || !selections.subject || !selections.year || (selections.examBody === 'University' && !selections.university)) {
            toast({ variant: 'destructive', title: 'Please complete all selections.' });
            return;
        }
        
        // Find matching duration from the papers
        const matchingPaper = allQuestions?.find(q => 
            q.level === selections.examBody && 
            q.subject === selections.subject && 
            q.year === selections.year &&
            (!selections.university || q.university === selections.university)
        );
        
        setExamDuration(matchingPaper?.durationMinutes || 20);
        setCurrentExamId(0);
        setIsNewExamDialogOpen(false);
        setViewState('mode-select');
    };
    
    const handleSelectMode = async (mode: ExamMode) => {
        setExamMode(mode);
        setViewState('taking');
        setIsLoading(true);
        setQuestions([]);
        
        try {
            const result = await generateQuiz({
                context: 'note-generator',
                topic: `${selections.subject} for ${selections.examBody === 'University' ? `${selections.university} ${selections.schoolFaculty}` : selections.examBody}`,
                academicLevel: selections.examBody as any,
                content: `Generate 20 questions for the topic: ${selections.subject}. The exam is ${selections.examBody} ${selections.year}. ${selections.schoolFaculty ? `The school/faculty is ${selections.schoolFaculty}` : ''}`
            });

            if (!result.quiz || result.quiz.length === 0) {
                throw new Error("The AI could not generate questions for this topic.");
            }
            
            setQuestions(result.quiz.slice(0, 20));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to generate exam', description: e.message });
            setViewState('mode-select');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitForReview = async (finalAnswers: Record<number, string>) => {
        setIsLoading(true);
        setViewState('results');
        setResults(null);

        let finalScore = 0;
        questions.forEach((q, index) => {
            if (finalAnswers[index] === q.correctAnswer) {
                finalScore++;
            }
        });

        setExamAnswers(finalAnswers);
        setExamScore(finalScore);

        try {
            let performanceDetails = questions.map((q, index) => {
                const isCorrect = finalAnswers[index] === q.correctAnswer;
                return `Q${index+1}: ${q.questionText.substring(0, 30)}... - User Answer: ${finalAnswers[index] || 'Skipped'}, Correct: ${q.correctAnswer}. Status: ${isCorrect ? 'Correct' : 'Incorrect'}.`
            }).join('\n');

            const mockExamResults = `
                Exam: ${selections.examBody} ${selections.university} ${selections.schoolFaculty} - ${selections.subject} (${selections.year})
                Student Performance Summary:
                - Overall Score: ${finalScore}/${questions.length} (${((finalScore/questions.length)*100).toFixed(1)}%)
                - Detailed Breakdown:
                ${performanceDetails}
            `;
            const revisionPlan = await aiAssessmentRevisionRoadmap({
                examResults: mockExamResults,
                studentLevel: selections.examBody,
                university: selections.university,
                department: selections.schoolFaculty,
                course: selections.subject
            });
            setResults(revisionPlan);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to get revision plan', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleViewSavedExam = (exam: SavedExam) => {
        setSelections(exam.selections);
        setQuestions(exam.questions);
        setExamAnswers(exam.examAnswers);
        setExamScore(exam.examScore);
        setResults(exam.results);
        setCurrentExamId(exam.id);
        setQuestionsCurrentPage(0);
        setViewState('results');
    };

    const handleDeleteSavedExam = (examId: number) => {
        const updatedExams = savedExams.filter(exam => exam.id !== examId);
        setSavedExams(updatedExams);
        saveExamsToStorage(updatedExams);
        toast({ title: "Exam Deleted", description: "The saved exam session has been removed." });
    };

    const handleSaveResults = () => {
        if (!results) {
            toast({ variant: 'destructive', title: 'Cannot Save', description: 'Results are not available to save.' });
            return;
        }
        const newExam: SavedExam = {
            id: Date.now(),
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            selections,
            questions,
            examAnswers,
            examScore,
            results,
        };
        const updatedExams = [newExam, ...savedExams];
        setSavedExams(updatedExams);
        saveExamsToStorage(updatedExams);
        setCurrentExamId(newExam.id);
        toast({ title: 'Exam Saved', description: 'You can view your results anytime.' });
    };

    const resetToSelection = () => {
        setViewState('select');
        setCurrentExamId(0);
    };

    if (viewState === 'select') {
        return (
            <>
                <HomeHeader />
                <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-headline font-bold">Past Questions Hub</h1>
                                <p className="text-muted-foreground mt-1 text-balance">
                                    Test your knowledge and get an AI-powered revision plan.
                                </p>
                            </div>
                            <div className="flex justify-end md:block">
                                <Button onClick={() => setIsNewExamDialogOpen(true)} className="shrink-0" disabled={questionsLoading}>
                                    {questionsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Take New Exam
                                </Button>
                            </div>
                        </div>

                        {savedExams.length > 0 ? (
                            <div className="space-y-4 mt-8">
                                <h2 className="text-2xl font-headline font-bold">Saved Exam Sessions</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {savedExams.map(exam => (
                                        <Card key={exam.id}>
                                            <CardHeader>
                                                <CardTitle className="truncate">{exam.selections.subject}</CardTitle>
                                                <CardDescription>{exam.selections.examBody}{exam.selections.university && ` - ${exam.selections.university}`}{exam.selections.schoolFaculty && ` - ${exam.selections.schoolFaculty}`} - {exam.selections.year}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="text-sm">
                                                <p>Completed on: {exam.date}</p>
                                                <p>Score: <span className="font-bold">{exam.examScore} / {exam.questions.length}</span></p>
                                            </CardContent>
                                            <CardFooter className="justify-between">
                                                <Button onClick={() => handleViewSavedExam(exam)}>View Results</Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteSavedExam(exam.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <Card className="text-center p-12 border-dashed mt-8">
                                <h3 className="text-xl font-semibold">No Saved Exams</h3>
                                <p className="text-muted-foreground mt-2">Your completed exam sessions will appear here.</p>
                            </Card>
                        )}
                    </div>

                    <Dialog open={isNewExamDialogOpen} onOpenChange={setIsNewExamDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Take a New Exam</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                                <div className="space-y-2">
                                    <label className="font-medium">Exam Body</label>
                                    <Select onValueChange={handleExamBodyChange} value={selections.examBody}>
                                        <SelectTrigger><SelectValue placeholder="Select an exam body..." /></SelectTrigger>
                                        <SelectContent>{examBodies.map(body => <SelectItem key={body} value={body}>{body}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                {selections.examBody === 'University' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="font-medium">University</label>
                                            <Select onValueChange={handleUniversityChange} value={selections.university} disabled={universities.length === 0}>
                                                <SelectTrigger><SelectValue placeholder="Select a university..." /></SelectTrigger>
                                                <SelectContent className="max-h-[300px]">{universities.map(uni => <SelectItem key={uni} value={uni}>{uni}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <label className="font-medium">School / Faculty</label>
                                            <Select onValueChange={handleSchoolFacultyChange} value={selections.schoolFaculty} disabled={faculties.length === 0}>
                                                <SelectTrigger><SelectValue placeholder="Select a school/faculty..." /></SelectTrigger>
                                                <SelectContent className="max-h-[300px]">{faculties.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}
                                <div className="space-y-2">
                                    <label className="font-medium">Subject / Course</label>
                                    <Select onValueChange={handleSubjectChange} value={selections.subject} disabled={subjects.length === 0}>
                                        <SelectTrigger><SelectValue placeholder="Select a subject..." /></SelectTrigger>
                                        <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2">
                                    <label className="font-medium">Year</label>
                                    <Select onValueChange={(value) => setSelections(prev => ({...prev, year: value}))} value={selections.year} disabled={years.length === 0}>
                                        <SelectTrigger><SelectValue placeholder="Select a year..." /></SelectTrigger>
                                        <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button className="w-full" onClick={handleStart}>Start</Button>
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
                <HomeHeader left={<Button variant="outline" onClick={() => setViewState('select')}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>} />
                <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto flex-1 flex flex-col justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-headline font-bold">Choose Your Mode</h2>
                        <p className="text-muted-foreground mt-1">How would you like to practice?</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="flex flex-col">
                            <CardHeader><CardTitle>Trial Mode</CardTitle><CardDescription>Practice with AI assistance.</CardDescription></CardHeader>
                            <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
                                <p className="flex items-start"><Check className="w-4 h-4 mr-2 mt-1 shrink-0"/>One question at a time.</p>
                                <p className="flex items-start"><Check className="w-4 h-4 mr-2 mt-1 shrink-0"/>Get hints and detailed AI explanations instantly.</p>
                                <p className="flex items-start"><Check className="w-4 h-4 mr-2 mt-1 shrink-0"/>Perfect for learning and understanding concepts.</p>
                            </CardContent>
                            <CardFooter><Button className="w-full" onClick={() => handleSelectMode('trial')}>Start Trial</Button></CardFooter>
                        </Card>
                         <Card className="flex flex-col">
                            <CardHeader><CardTitle>Exam Mode</CardTitle><CardDescription>Simulate the real exam experience.</CardDescription></CardHeader>
                            <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
                                <p className="flex items-start"><Check className="w-4 h-4 mr-2 mt-1 shrink-0"/>All questions under a time limit.</p>
                                <p className="flex items-start"><Check className="w-4 h-4 mr-2 mt-1 shrink-0"/>No hints or help during the test.</p>
                                <p className="flex items-start"><Check className="w-4 h-4 mr-2 mt-1 shrink-0"/>Get a full AI-powered performance review at the end.</p>
                            </CardContent>
                            <CardFooter><Button className="w-full" onClick={() => handleSelectMode('exam')}>Start Exam</Button></CardFooter>
                        </Card>
                    </div>
                </div>
            </>
        )
    }
    
    if (viewState === 'taking') {
        const header = <HomeHeader left={<Button variant="outline" onClick={() => setViewState('mode-select')}><ArrowLeft className="mr-2 h-4 w-4" />Change Mode</Button>} />;
        
        if (isLoading) {
             return <>{header}<div className="flex-1 flex flex-col items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="mt-2 text-muted-foreground">Generating your exam...</p></div></>;
        }

        if (examMode === 'trial') {
            return <>{header}<TrialModeView questions={questions} topic={selections.subject} onFinish={handleSubmitForReview} /></>;
        }
        
        if (examMode === 'exam') {
            return <>{header}<ExamModeView questions={questions} topic={selections.subject} durationMinutes={examDuration} onSubmit={handleSubmitForReview} /></>;
        }
    }

    if (viewState === 'results') {
        const questionsPerPage = 5;
        const totalPages = Math.ceil(questions.length / questionsPerPage);
        const startIndex = questionsCurrentPage * questionsPerPage;
        const endIndex = startIndex + questionsPerPage;
        const currentQuestions = questions.slice(startIndex, endIndex);

        return (
            <>
                <HomeHeader left={<Button variant="outline" onClick={resetToSelection}><ArrowLeft className="mr-2 h-4 w-4" />Back to Exams</Button>} />
                <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 gap-2">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="text-muted-foreground">Generating your review...</p>
                        </div>
                    ) : (
                        <Card>
                             <CardHeader>
                                <div className="flex justify-between items-center gap-4">
                                    <div>
                                        <CardTitle className="text-3xl font-headline font-bold">Exam Results</CardTitle>
                                        <CardDescription>Your score: <span className="font-bold text-primary">{examScore} / {questions.length}</span></CardDescription>
                                    </div>
                                    {currentExamId === 0 && !isLoading && (
                                        <Button onClick={handleSaveResults}><Save className="mr-2"/> Save Results</Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="roadmap" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="questions">Questions</TabsTrigger>
                                        <TabsTrigger value="roadmap">Revision Roadmap</TabsTrigger>
                                        <TabsTrigger value="corrections">Corrections</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="questions" className="mt-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Exam Questions</CardTitle>
                                                <CardDescription>Review all questions from the exam.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                {currentQuestions.map((q, i) => {
                                                    const questionIndex = startIndex + i;
                                                    const userAnswer = examAnswers[questionIndex];
                                                    return (
                                                        <div key={questionIndex} className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0">
                                                            <p className="font-semibold">{questionIndex + 1}. {q.questionText}</p>
                                                            <div className="space-y-1">
                                                                {q.options.map((opt, j) => (
                                                                    <div key={j} className={cn(
                                                                        "flex items-center space-x-2 rounded-md p-2 text-sm",
                                                                        opt === q.correctAnswer && "bg-green-100 dark:bg-green-900/50 font-medium",
                                                                        opt === userAnswer && opt !== q.correctAnswer && "bg-red-100 dark:bg-red-900/50"
                                                                    )}>
                                                                        {opt === q.correctAnswer ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" /> : (opt === userAnswer ? <XCircle className="h-4 w-4 text-destructive shrink-0" /> : <div className="h-4 w-4 shrink-0" />)}
                                                                        <span>{opt}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </CardContent>
                                            <CardFooter className="justify-between">
                                                <Button variant="outline" onClick={() => setQuestionsCurrentPage(p => p - 1)} disabled={questionsCurrentPage === 0}>Previous</Button>
                                                <span className="text-sm text-muted-foreground">Page {questionsCurrentPage + 1} of {totalPages}</span>
                                                <Button variant="outline" onClick={() => setQuestionsCurrentPage(p => p + 1)} disabled={questionsCurrentPage >= totalPages - 1}>Next</Button>
                                            </CardFooter>
                                        </Card>
                                    </TabsContent>
                                    <TabsContent value="roadmap" className="mt-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>Your AI Revision Roadmap</CardTitle>
                                                <CardDescription>Based on your performance in the {selections.subject} ({selections.schoolFaculty && `${selections.schoolFaculty} - `}{selections.year}) exam.</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                {results ? (
                                                    <div className="prose dark:prose-invert max-w-none">
                                                        <ReactMarkdown 
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                                                            }}
                                                        >
                                                            {results.revisionRoadmap}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : <p className="text-muted-foreground">Could not generate revision roadmap.</p>}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                    <TabsContent value="corrections" className="mt-4">
                                        <Card>
                                             <CardHeader>
                                                <CardTitle className="flex items-center gap-2"><XCircle className="text-destructive"/>Your Corrections</CardTitle>
                                                <CardDescription>Here are the questions you got wrong.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {questions.filter((q, index) => examAnswers[index] !== q.correctAnswer).length > 0 ? (
                                                    questions.map((q, index) => {
                                                        if (examAnswers[index] === q.correctAnswer) return null;
                                                        return (
                                                            <Card key={index} className="border-destructive/50">
                                                                <CardHeader>
                                                                    <p className="font-semibold">{index + 1}. {q.questionText}</p>
                                                                </CardHeader>
                                                                <CardContent className="space-y-2 text-sm">
                                                                    <p className="text-destructive">Your answer: <span className="font-bold">{examAnswers[index] || "Skipped"}</span></p>
                                                                    <p className="text-green-600">Correct answer: <span className="font-bold">{q.correctAnswer}</span></p>
                                                                    <Card className="mt-2 bg-secondary/50">
                                                                        <CardHeader className="flex-row items-center gap-2 pb-2 pt-4">
                                                                           <Lightbulb className="w-5 h-5 text-yellow-500" />
                                                                           <CardTitle className="text-md">Explanation</CardTitle>
                                                                        </CardHeader>
                                                                        <CardContent>
                                                                            <p className="text-sm text-muted-foreground">{q.explanation}</p>
                                                                        </CardContent>
                                                                    </Card>
                                                                </CardContent>
                                                            </Card>
                                                        )
                                                    })
                                                ) : (
                                                    <Alert variant="default" className="border-green-500 text-green-700">
                                                        <CheckCircle className="h-4 w-4 !text-green-700" />
                                                        <AlertTitle>Excellent Work!</AlertTitle>
                                                        <AlertDescription>
                                                            You answered all questions correctly.
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </>
        );
    }

    return null;
}

function TrialModeView({ questions, topic, onFinish }: { questions: QuizQuestion[], topic: string, onFinish: (answers: Record<number, string>) => void }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [allAnswers, setAllAnswers] = useState<Record<number, string>>({});
    
    const currentQuestion = questions[currentIndex];

    const handleCheck = () => {
        if (!selectedAnswer) return;
        setIsAnswered(true);
        setAllAnswers(prev => ({ ...prev, [currentIndex]: selectedAnswer }));
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsAnswered(false);
        } else {
            onFinish(allAnswers);
        }
    };

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium">
                    <span>Question {currentIndex + 1} of {questions.length}</span>
                    <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
                </div>
                <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">{currentQuestion.questionText}</CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup 
                        onValueChange={(val) => !isAnswered && setSelectedAnswer(val)} 
                        value={selectedAnswer || ""}
                        className="space-y-3"
                    >
                        {currentQuestion.options.map((option, i) => (
                            <div key={i} className={cn(
                                "flex items-center space-x-3 p-4 border rounded-lg transition-colors cursor-pointer",
                                !isAnswered && selectedAnswer === option && "border-primary bg-primary/5",
                                isAnswered && option === currentQuestion.correctAnswer && "border-green-500 bg-green-50 dark:bg-green-900/20",
                                isAnswered && selectedAnswer === option && option !== currentQuestion.correctAnswer && "border-destructive bg-destructive/5",
                                !isAnswered && "hover:border-primary/50"
                            )} onClick={() => !isAnswered && setSelectedAnswer(option)}>
                                <RadioGroupItem value={option} id={`q-${currentIndex}-opt-${i}`} disabled={isAnswered} />
                                <Label htmlFor={`q-${currentIndex}-opt-${i}`} className="flex-1 cursor-pointer font-normal">
                                    {option}
                                </Label>
                                {isAnswered && option === currentQuestion.correctAnswer && <CheckCircle className="h-5 w-5 text-green-600" />}
                                {isAnswered && selectedAnswer === option && option !== currentQuestion.correctAnswer && <XCircle className="h-5 w-5 text-destructive" />}
                            </div>
                        ))}
                    </RadioGroup>

                    {isAnswered && (
                        <Alert className={cn("mt-6", isCorrect ? "bg-green-50 border-green-200" : "bg-destructive/5 border-destructive/20")}>
                            <div className="flex gap-3">
                                {isCorrect ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-destructive" />}
                                <div className="space-y-1">
                                    <AlertTitle className={cn("font-bold", isCorrect ? "text-green-800" : "text-destructive")}>
                                        {isCorrect ? "Correct!" : "Incorrect"}
                                    </AlertTitle>
                                    <AlertDescription className="text-sm">
                                        <p className="font-semibold mb-2">AI Explanation:</p>
                                        <p className="opacity-90">{currentQuestion.explanation}</p>
                                    </AlertDescription>
                                </div>
                            </div>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end gap-3 border-t pt-6">
                    {!isAnswered ? (
                        <Button onClick={handleCheck} disabled={!selectedAnswer}>Check Answer</Button>
                    ) : (
                        <Button onClick={handleNext}>
                            {currentIndex === questions.length - 1 ? "Finish & Review" : "Next Question"}
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}

function ExamModeView({ questions, topic, durationMinutes, onSubmit }: { questions: QuizQuestion[], topic: string, durationMinutes: number, onSubmit: (answers: Record<number, string>) => void }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isFinished, setIsFinished] = useState(false);

    const handleSelect = (answer: string) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: answer }));
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleTimeUp = () => {
        onSubmit(answers);
    };

    return (
        <div className="p-4 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Timer durationInSeconds={durationMinutes * 60} onTimeUp={handleTimeUp} />
                    <Separator orientation="vertical" className="h-8" />
                    <span className="text-sm font-medium">Question {currentIndex + 1} of {questions.length}</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsFinished(true)}>Submit Exam</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">{questions[currentIndex].questionText}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup 
                                onValueChange={handleSelect} 
                                value={answers[currentIndex] || ""}
                                className="space-y-3"
                            >
                                {questions[currentIndex].options.map((option, i) => (
                                    <div key={i} className={cn(
                                        "flex items-center space-x-3 p-4 border rounded-lg transition-colors cursor-pointer",
                                        answers[currentIndex] === option ? "border-primary bg-primary/5" : "hover:border-primary/50"
                                    )} onClick={() => handleSelect(option)}>
                                        <RadioGroupItem value={option} id={`exam-opt-${i}`} />
                                        <Label htmlFor={`exam-opt-${i}`} className="flex-1 cursor-pointer font-normal">
                                            {option}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </CardContent>
                        <CardFooter className="justify-between border-t pt-6">
                            <Button variant="ghost" onClick={handlePrev} disabled={currentIndex === 0}>
                                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                            </Button>
                            <Button onClick={handleNext} disabled={currentIndex === questions.length - 1}>
                                Next <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Navigator</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentIndex(i)}
                                        className={cn(
                                            "h-8 w-8 rounded-md text-xs font-bold transition-all border",
                                            currentIndex === i ? "bg-primary text-primary-foreground border-primary" : (answers[i] ? "bg-secondary text-secondary-foreground" : "bg-background hover:border-primary/50")
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isFinished} onOpenChange={setIsFinished}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ready to submit?</DialogTitle>
                        <DialogDescription>
                            You have answered {Object.keys(answers).length} out of {questions.length} questions. Once submitted, you cannot change your answers.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsFinished(false)}>Keep Reviewing</Button>
                        <Button onClick={() => onSubmit(answers)}>Submit Exam</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Timer({ durationInSeconds, onTimeUp }: { durationInSeconds: number, onTimeUp: () => void }) {
    const [timeLeft, setTimeLeft] = useState(durationInSeconds);
    const hasCalledEnd = useRef(false);

    useEffect(() => {
        if (timeLeft <= 0) {
            if (!hasCalledEnd.current) {
                hasCalledEnd.current = true;
                onTimeUp();
            }
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, onTimeUp]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={cn("flex items-center gap-2 font-mono text-xl", timeLeft < 60 ? "text-destructive animate-pulse" : "text-primary")}>
            <TimerIcon className="h-5 w-5" />
            {formatTime(timeLeft)}
        </div>
    );
}
