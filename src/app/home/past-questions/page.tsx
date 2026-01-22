"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiAssessmentRevisionRoadmap } from "@/ai/flows/ai-assessment-revision-roadmap";
import { Loader2, Zap } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import AdBanner from "@/components/ads/AdBanner";
import { HomeHeader } from "@/components/layout/HomeHeader";

const setupSchema = z.object({
  examType: z.enum(["BECE", "WASSCE", "University"]),
  university: z.string().optional(),
  department: z.string().optional(),
  course: z.string().optional(),
});

const mockQuestions = [
    { id: 'q1', text: 'Which of these is the powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Chloroplast'], answer: 'Mitochondria' },
    { id: 'q2', text: 'What is the capital of Ghana?', options: ['Kumasi', 'Accra', 'Takoradi', 'Tamale'], answer: 'Accra' },
    { id: 'q3', text: 'Solve for x: 2x + 5 = 15', options: ['5', '10', '2.5', '7.5'], answer: '5' },
    { id: 'q4', text: 'Who was the first president of Ghana?', options: ['J.B. Danquah', 'Kwame Nkrumah', 'Kofi Annan', 'Jerry Rawlings'], answer: 'Kwame Nkrumah' },
    { id: 'q5', text: 'What does "www" stand for in a website browser?', options: ['World Wide Web', 'World Web Wide', 'Web World Wide', 'Wide World Web'], answer: 'World Wide Web' },
];

type QuizState = "setup" | "quiz" | "results" | "roadmap";

export default function PastQuestionsPage() {
  const [quizState, setQuizState] = useState<QuizState>("setup");
  const [examConfig, setExamConfig] = useState<z.infer<typeof setupSchema> | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<string | null>(null);

  const form = useForm<z.infer<typeof setupSchema>>({
    resolver: zodResolver(setupSchema),
    defaultValues: { examType: "WASSCE" },
  });

  function startQuiz(values: z.infer<typeof setupSchema>) {
    setExamConfig(values);
    setQuizState("quiz");
  }

  function handleAnswerChange(questionId: string, value: string) {
    setAnswers(prev => ({...prev, [questionId]: value}));
  }

  function submitQuiz() {
    let correctAnswers = 0;
    mockQuestions.forEach(q => {
        if (answers[q.id] === q.answer) {
            correctAnswers++;
        }
    });
    setScore(correctAnswers);
    setQuizState("results");
  }
  
  async function generateRoadmap() {
    if (!examConfig) return;
    setIsLoading(true);
    setRoadmap(null);
    const examResults = `
      Student took a mock ${examConfig.examType} exam.
      Score: ${score} out of ${mockQuestions.length}.
      Correct answers for questions on: ${mockQuestions.filter(q => answers[q.id] === q.answer).map(q => `'${q.text}'`).join(', ')}.
      Incorrect answers for questions on: ${mockQuestions.filter(q => answers[q.id] !== q.answer && answers[q.id]).map(q => `'${q.text}'`).join(', ')}.
    `;
    
    try {
        const result = await aiAssessmentRevisionRoadmap({
            examResults,
            studentLevel: examConfig.examType,
            university: examConfig.university,
            department: examConfig.department,
            course: examConfig.course
        });
        setRoadmap(result.revisionRoadmap);
        setQuizState("roadmap");
    } catch(e) {
        console.error("Failed to generate roadmap", e)
    } finally {
        setIsLoading(false);
    }
  }


  const pageContent = () => {
    if (quizState === "quiz") {
        return (
            <div className="space-y-8">
                <h1 className="text-3xl font-headline font-bold mb-2">Mock Exam</h1>
                <p className="text-muted-foreground mb-6">Answer the questions below. (This is a mock-up)</p>
                <div className="space-y-8">
                    {mockQuestions.map((q, index) => (
                        <Card key={q.id}>
                            <CardHeader><CardTitle>{index + 1}. {q.text}</CardTitle></CardHeader>
                            <CardContent>
                                 <RadioGroup onValueChange={(value) => handleAnswerChange(q.id, value)}>
                                    {q.options.map(option => (
                                        <div key={option} className="flex items-center space-x-2">
                                            <RadioGroupItem value={option} id={`${q.id}-${option}`} />
                                            <label htmlFor={`${q.id}-${option}`}>{option}</label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </CardContent>
                        </Card>
                    ))}
                    <Button onClick={submitQuiz}>Submit Exam</Button>
                </div>
            </div>
        );
      }
      
      if (quizState === "results") {
        return (
          <div className="space-y-8 max-w-3xl mx-auto text-center">
            <h1 className="text-3xl font-headline font-bold">Exam Results</h1>
            <Card>
                <CardContent className="pt-6">
                    <p className="text-6xl font-bold text-primary">{score}<span className="text-2xl text-muted-foreground">/{mockQuestions.length}</span></p>
                    <p className="text-lg mt-2">You answered {score} out of {mockQuestions.length} questions correctly.</p>
                </CardContent>
            </Card>
            <p>Based on your results, we can generate a personalized revision plan to help you improve.</p>
            <Button size="lg" onClick={generateRoadmap} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4" />}
                Generate AI Revision Roadmap
            </Button>
            <div className="pt-4">
                <AdBanner />
            </div>
          </div>
        );
      }
    
      if(quizState === "roadmap") {
        return (
            <div className="space-y-8">
                <h1 className="text-3xl font-headline font-bold">Your AI Revision Roadmap</h1>
                <Card>
                    <CardContent className="pt-6">
                        <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: roadmap?.replace(/\n/g, '<br />') || "" }} />
                    </CardContent>
                </Card>
                <Button onClick={() => setQuizState("setup")}>Start New Exam</Button>
            </div>
        )
      }
    
      return (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-headline font-bold">Past Questions Hub</h1>
            <p className="text-muted-foreground">Select your exam type to start a timed mock exam.</p>
          </div>
    
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Exam Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(startQuiz)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="examType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exam Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select an exam" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BECE">BECE</SelectItem>
                            <SelectItem value="WASSCE">WASSCE</SelectItem>
                            <SelectItem value="University">University</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
    
                  {form.watch("examType") === "University" && (
                    <>
                      {/* In a real app, these would be dynamic selects based on previous choices */}
                      <FormField control={form.control} name="university" render={({ field }) => (
                        <FormItem>
                          <FormLabel>University</FormLabel>
                          <Select onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select University" /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="UG">University of Ghana</SelectItem><SelectItem value="KNUST">KNUST</SelectItem></SelectContent>
                          </Select>
                        </FormItem>
                      )}/>
                       <FormField control={form.control} name="department" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="CS">Computer Science</SelectItem></SelectContent>
                          </Select>
                        </FormItem>
                      )}/>
                       <FormField control={form.control} name="course" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course</FormLabel>
                           <Select onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="DCIT205">DCIT 205</SelectItem></SelectContent>
                          </Select>
                        </FormItem>
                      )}/>
                    </>
                  )}
    
                  <Button type="submit" className="w-full">Start Mock Exam</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      );
  }

  return (
    <>
        <HomeHeader />
        <div className="p-4 sm:p-6 lg:p-8">
            {pageContent()}
        </div>
    </>
  )
}
