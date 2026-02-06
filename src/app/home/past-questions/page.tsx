

"use client";

import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { ArrowLeft, Loader2, Sparkles, FileQuestion, Calendar, Check, Send, Clock, Lightbulb, CheckCircle, XCircle, Save, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { aiAssessmentRevisionRoadmap, AiAssessmentRevisionRoadmapOutput } from "@/ai/flows/ai-assessment-revision-roadmap";
import { generateQuiz, GenerateQuizOutput } from "@/ai/flows/generate-quiz";
import { universities } from "@/lib/ghana-universities";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


type ViewState = 'select' | 'mode-select' | 'taking' | 'results';
type ExamMode = 'trial' | 'exam';

const universityData = {
    "University of Ghana": {
        "Business School": {
            "ECON 101": ["2023 Mid-Sem"],
        },
        "College of Basic and Applied Sciences": {
            "CSIT 101": ["2023 Final", "2022 Final"],
        },
    },
    "Kwame Nkrumah University of Science and Technology (KNUST)": {
        "College of Engineering": {
            "MATH 151": ["2023 Final"],
        },
    },
};

const examData = {
    "WASSCE": {
        "Core Mathematics": ["2023", "2022", "2021"],
        "Integrated Science": ["2023", "2022", "2021"],
        "Social Studies": ["2023", "2022", "2021"],
    },
    "BECE": {
        "Mathematics": ["2023", "2022", "2021"],
        "Integrated Science": ["2023", "2022", "2021"],
        "Social Studies": ["2023", "2022", "2021"],
    },
    "University": universityData,
};

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
    const [viewState, setViewState] = useState<ViewState>('select');
    const [examMode, setExamMode] = useState<ExamMode>('trial');
    const [selections, setSelections] = useState({ examBody: "", university: "", schoolFaculty: "", subject: "", year: "" });
    
    const [faculties, setFaculties] = useState<string[]>([]);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [years, setYears] = useState<string[]>([]);
    
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<AiAssessmentRevisionRoadmapOutput | null>(null);
    const { toast } = useToast();

    // State for exam results
    const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
    const [examScore, setExamScore] = useState(0);

    // State for saved exams
    const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
    const [currentExamId, setCurrentExamId] = useState<number>(0);

    // New state for dialogs and pagination
    const [isNewExamDialogOpen, setIsNewExamDialogOpen] = useState(false);
    const [questionsCurrentPage, setQuestionsCurrentPage] = useState(0);

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
        let newSubjects: string[] = [];
        setFaculties([]);
        if (value === "University") {
            setSubjects([]);
        } else {
            newSubjects = Object.keys(examData[value as "WASSCE" | "BECE"] || {});
            setSubjects(newSubjects);
        }
        setYears([]);
        setSelections({ examBody: value, university: "", schoolFaculty: "", subject: "", year: "" });
    };

    const handleUniversityChange = (value: string) => {
        const newFaculties = Object.keys(examData.University[value as keyof typeof examData.University] || {});
        setFaculties(newFaculties);
        setSubjects([]);
        setYears([]);
        setSelections(prev => ({ ...prev, university: value, schoolFaculty: "", subject: "", year: "" }));
    }

    const handleSchoolFacultyChange = (value: string) => {
        const newSubjects = Object.keys(examData.University[selections.university as keyof typeof examData.University]?.[value] || {});
        setSubjects(newSubjects);
        setYears([]);
        setSelections(prev => ({ ...prev, schoolFaculty: value, subject: "", year: "" }));
    };

    const handleSubjectChange = (value: string) => {
        let newYears: string[] = [];
        if (selections.examBody === "University") {
            newYears = examData.University[selections.university as keyof typeof examData.University]?.[selections.schoolFaculty]?.[value] || [];
        } else {
            newYears = examData[selections.examBody as "WASSCE" | "BECE"]?.[value] || [];
        }
        setYears(newYears);
        setSelections(prev => ({ ...prev, subject: value, year: "" }));
    };

    const handleStart = () => {
        if (!selections.examBody || !selections.subject || !selections.year || (selections.examBody === 'University' && (!selections.university || !selections.schoolFaculty))) {
            toast({ variant: 'destructive', title: 'Please complete all selections.' });
            return;
        }
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
                content: `Generate 20 questions for the topic: ${selections.subject}. The exam is ${selections.examBody} ${selections.year}. The school/faculty is ${selections.schoolFaculty}.`
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
                                <Button onClick={() => setIsNewExamDialogOpen(true)} className="shrink-0">
                                    <Plus className="mr-2 h-4 w-4" />
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
                                        <SelectContent><SelectItem value="WASSCE">WASSCE</SelectItem><SelectItem value="BECE">BECE</SelectItem><SelectItem value="University">University</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                {selections.examBody === 'University' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="font-medium">University</label>
                                            <Select onValueChange={handleUniversityChange} value={selections.university}>
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
            return <>{header}<TrialModeView questions={questions} topic={selections.subject} /></>;
        }
        
        if (examMode === 'exam') {
            return <>{header}<ExamModeView questions={questions} topic={selections.subject} onSubmit={handleSubmitForReview} /></>;
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

function Timer({ durationInSeconds }: { durationInSeconds: number }) {
  const [timeLeft, setTimeLeft] = useState(durationInSeconds);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex items-center gap-2 font-mono text-lg font-semibold">
      <Clock className="w-5 h-5"/>
      <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
    </div>
  );
}


function TrialModeView({ questions, topic }: { questions: QuizQuestion[], topic: string }) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
    const [quizState, setQuizState] = useState<'in-progress' | 'results'>('in-progress');
    const [score, setScore] = useState(0);
    
    const currentQuestion = questions[currentQuestionIndex];
    const isAnswered = selectedAnswers[currentQuestionIndex] !== undefined;

    const handleAnswerSelect = (answer: string) => {
        if (isAnswered) return;
        setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: answer }));
        setShowExplanation(prev => ({ ...prev, [currentQuestionIndex]: true }));
    };
    
    const handleSeeResults = () => {
        let finalScore = 0;
        questions.forEach((q, index) => {
            if(selectedAnswers[index] === q.correctAnswer) finalScore++;
        });
        setScore(finalScore);
        setQuizState('results');
    };

    const handleRestart = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setShowExplanation({});
        setScore(0);
        setQuizState('in-progress');
    };
    
    if (quizState === 'results') {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Quiz Results for "{topic}"</CardTitle>
                    <CardDescription>You scored {score} out of {questions.length}</CardDescription>
                </CardHeader>
                <CardContent><Progress value={(score / questions.length) * 100} className="w-full mb-4" /><div className="space-y-4">{questions.map((q, index) => (<Card key={index} className={cn(selectedAnswers[index] === q.correctAnswer ? "border-green-500" : "border-destructive")}><CardHeader><p className="font-semibold">{index + 1}. {q.questionText}</p></CardHeader><CardContent><p className="text-sm">Your answer: <span className={cn("font-bold", selectedAnswers[index] === q.correctAnswer ? "text-green-500" : "text-destructive")}>{selectedAnswers[index] || "Not answered"}</span></p><p className="text-sm">Correct answer: <span className="font-bold text-green-500">{q.correctAnswer}</span></p><details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Show Explanation</summary><p className="pt-1">{q.explanation}</p></details></CardContent></Card>))}</div></CardContent>
                <CardFooter><Button onClick={handleRestart}>Take Again</Button></CardFooter>
            </Card>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2"><FileQuestion className="text-primary"/> {topic}</CardTitle>
                    <Timer durationInSeconds={questions.length * 90} />
                </div>
                <CardDescription>Question {currentQuestionIndex + 1} of {questions.length}</CardDescription>
                <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full" />
            </CardHeader>
            <CardContent>
                <p className="font-semibold text-lg mb-4">{currentQuestion.questionText}</p>
                <RadioGroup onValueChange={handleAnswerSelect} value={selectedAnswers[currentQuestionIndex]} disabled={isAnswered}>
                    {currentQuestion.options.map((option, i) => {
                        const isCorrect = option === currentQuestion.correctAnswer;
                        const isSelected = selectedAnswers[currentQuestionIndex] === option;
                        return (
                            <div key={i} className={cn("flex items-center space-x-3 space-y-0 p-3 rounded-md border cursor-pointer", isAnswered && isCorrect && "bg-green-100 dark:bg-green-900/50 border-green-500", isAnswered && isSelected && !isCorrect && "bg-red-100 dark:bg-red-900/50 border-destructive")} onClick={() => handleAnswerSelect(option)}>
                                <RadioGroupItem value={option} />
                                <label className="font-normal flex-1 cursor-pointer">{option}</label>
                                {isAnswered && isCorrect && <CheckCircle className="text-green-500" />}
                                {isAnswered && isSelected && !isCorrect && <XCircle className="text-destructive" />}
                            </div>
                        )
                    })}
                </RadioGroup>
                
                {isAnswered && showExplanation[currentQuestionIndex] && (
                    <Card className="mt-4 bg-secondary/50"><CardHeader className="flex-row items-center gap-2 pb-2"><Lightbulb className="w-5 h-5 text-yellow-500" /><CardTitle className="text-md">Explanation</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p></CardContent></Card>
                )}
                 {!isAnswered && currentQuestion.hint && (
                    <details className="mt-4 text-sm text-muted-foreground"><summary className="cursor-pointer">Need a hint?</summary><p className="pt-1">{currentQuestion.hint}</p></details>
                )}

            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => setCurrentQuestionIndex(p => p - 1)} disabled={currentQuestionIndex === 0}>Previous</Button>
                {currentQuestionIndex < questions.length - 1 ? (
                     <Button onClick={() => setCurrentQuestionIndex(p => p + 1)} disabled={!isAnswered}>Next</Button>
                ) : (
                    <Button onClick={handleSeeResults} disabled={!isAnswered}>See Results</Button>
                )}
            </CardFooter>
        </Card>
        </div>
    );
}

function ExamModeView({ questions, topic, onSubmit }: { questions: QuizQuestion[], topic: string, onSubmit: (answers: Record<number, string>) => void }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const questionsPerPage = 5;
    const totalPages = Math.ceil(questions.length / questionsPerPage);
    const startIndex = currentPage * questionsPerPage;
    const endIndex = startIndex + questionsPerPage;
    const currentQuestions = questions.slice(startIndex, endIndex);

    const handleAnswerChange = (questionIndex: number, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2"><FileQuestion className="text-primary"/> {topic}</CardTitle>
                    <Timer durationInSeconds={questions.length * 60} />
                </div>
                <CardDescription>Page {currentPage + 1} of {totalPages}</CardDescription>
                <Progress value={((currentPage + 1) / totalPages) * 100} className="w-full" />
            </CardHeader>
            <CardContent className="space-y-6">
                {currentQuestions.map((q, i) => {
                    const questionIndex = startIndex + i;
                    return (
                        <div key={questionIndex}>
                            <p className="font-semibold mb-2">
                                {questionIndex + 1}. {q.questionText}
                            </p>
                            <RadioGroup 
                                value={answers[questionIndex]} 
                                onValueChange={(value) => handleAnswerChange(questionIndex, value)}
                                className="space-y-1"
                            >
                                {q.options.map((opt, j) => (
                                    <div key={j} className="flex items-center space-x-2">
                                        <RadioGroupItem value={opt} id={`q${questionIndex}-opt${j}`} />
                                        <label htmlFor={`q${questionIndex}-opt${j}`} className="font-normal">{opt}</label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    )
                })}
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>Previous Page</Button>
                {currentPage < totalPages - 1 ? (
                     <Button onClick={() => setCurrentPage(p => p + 1)}>Next Page</Button>
                ) : (
                    <Button onClick={() => onSubmit(answers)}>
                        <Send className="mr-2"/> Submit for AI Review
                    </Button>
                )}
            </CardFooter>
        </Card>
        </div>
    );
}
