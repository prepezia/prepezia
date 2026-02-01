
"use client";

import { useState } from "react";
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
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { ArrowLeft, Loader2, Sparkles, FileQuestion, BookCopy, Calendar, Check, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { aiAssessmentRevisionRoadmap, AiAssessmentRevisionRoadmapOutput } from "@/ai/flows/ai-assessment-revision-roadmap";
import AdBanner from "@/components/ads/AdBanner";
import { Separator } from "@/components/ui/separator";

type ViewState = 'select' | 'taking' | 'results';

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
    "University": {
        "Calculus I": ["Midsem 2023", "Finals 2022"],
        "Organic Chemistry": ["Midsem 2023", "Finals 2022"],
    }
}

export default function PastQuestionsPage() {
    const [viewState, setViewState] = useState<ViewState>('select');
    const [selections, setSelections] = useState({ examBody: "", subject: "", year: "" });
    const [subjects, setSubjects] = useState<string[]>([]);
    const [years, setYears] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<AiAssessmentRevisionRoadmapOutput | null>(null);
    const { toast } = useToast();

    const handleExamBodyChange = (value: string) => {
        const newSubjects = Object.keys(examData[value as keyof typeof examData] || {});
        setSubjects(newSubjects);
        setSelections({ examBody: value, subject: "", year: "" });
    };

    const handleSubjectChange = (value: string) => {
        const newYears = examData[selections.examBody as keyof typeof examData]?.[value] || [];
        setYears(newYears);
        setSelections(prev => ({ ...prev, subject: value, year: "" }));
    };

    const handleStartExam = () => {
        if (!selections.examBody || !selections.subject || !selections.year) {
            toast({ variant: 'destructive', title: 'Please complete all selections.' });
            return;
        }
        setViewState('taking');
    };

    const handleSubmitForReview = async () => {
        setIsLoading(true);
        setResults(null);
        try {
            // In a real app, we would process actual exam answers.
            // Here, we simulate a result to send to the AI.
            const mockExamResults = `
                Exam: ${selections.examBody} - ${selections.subject} (${selections.year})
                Student Performance:
                - Section A (Multiple Choice): 15/20 correct. Struggled with questions on trigonometry.
                - Section B (Theory): 25/40 marks. Answers lacked depth, especially on questions related to chemical bonding.
                - Overall Score: 40/60 (66.7%)
            `;
            const revisionPlan = await aiAssessmentRevisionRoadmap({
                examResults: mockExamResults,
                studentLevel: selections.examBody,
                course: selections.subject
            });
            setResults(revisionPlan);
            setViewState('results');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to get revision plan', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (viewState === 'select') {
        return (
            <>
                <HomeHeader />
                <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-2xl mx-auto">
                    <div className="text-center">
                        <h1 className="text-3xl font-headline font-bold">Past Questions Hub</h1>
                        <p className="text-muted-foreground mt-1">Test your knowledge and get an AI-powered revision plan.</p>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Your Exam</CardTitle>
                            <CardDescription>Choose the exam, subject, and year you want to practice.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <label className="font-medium">Exam Body</label>
                                <Select onValueChange={handleExamBodyChange} value={selections.examBody}>
                                    <SelectTrigger><SelectValue placeholder="Select an exam body..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="WASSCE">WASSCE</SelectItem>
                                        <SelectItem value="BECE">BECE</SelectItem>
                                        <SelectItem value="University">University</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="font-medium">Subject</label>
                                <Select onValueChange={handleSubjectChange} value={selections.subject} disabled={!selections.examBody}>
                                    <SelectTrigger><SelectValue placeholder="Select a subject..." /></SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <label className="font-medium">Year</label>
                                <Select onValueChange={(value) => setSelections(prev => ({...prev, year: value}))} value={selections.year} disabled={!selections.subject}>
                                    <SelectTrigger><SelectValue placeholder="Select a year..." /></SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={handleStartExam}>Start Exam</Button>
                        </CardFooter>
                    </Card>
                    <AdBanner />
                </div>
            </>
        );
    }
    
    if (viewState === 'taking') {
        return (
            <>
                <HomeHeader left={<Button variant="outline" onClick={() => setViewState('select')}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>} />
                <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>{selections.subject} - {selections.year}</CardTitle>
                            <CardDescription>This is a mock exam. Answer the questions to the best of your ability.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-center text-muted-foreground p-8 border rounded-lg border-dashed">
                                [ Exam Questions Interface Placeholder ]
                            </p>
                            <p className="text-xs text-muted-foreground text-center">In a real application, interactive questions would appear here.</p>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={handleSubmitForReview} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2"/>}
                                Submit for AI Review
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </>
        )
    }

     if (viewState === 'results') {
        return (
            <>
                <HomeHeader left={<Button variant="outline" onClick={() => setViewState('select')}><ArrowLeft className="mr-2 h-4 w-4" />Try Another</Button>} />
                <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>Your AI Revision Roadmap</CardTitle>
                            <CardDescription>Based on your performance in the {selections.subject} ({selections.year}) exam.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading && <div className="flex justify-center items-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>}
                            {results && (
                                <div className="prose dark:prose-invert max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {results.revisionRoadmap}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </>
        )
    }

    return null;
}
