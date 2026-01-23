"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, ArrowRight, BrainCircuit, FileText, Briefcase, Search, MessageCircle, Download, Sparkles, Loader2, ArrowLeft, Bot, Send } from "lucide-react";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { improveCv, ImproveCvOutput } from "@/ai/flows/improve-cv";
import { getCareerAdvice, CareerAdviceOutput } from "@/ai/flows/career-advisor";
import { generateCvTemplate } from "@/ai/flows/generate-cv-template";
import { searchForJobs, SearchForJobsOutput } from "@/ai/flows/search-jobs-flow";
import { cn } from "@/lib/utils";

type View = "onboarding" | "hub";
type HubTab = "cv" | "chat" | "jobs";

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
};

export default function CareerPage() {
    const [view, setView] = useState<View>("onboarding");
    const [cvContent, setCvContent] = useState<string>("");
    const [careerGoals, setCareerGoals] = useState<string>("");

    const startHub = (cv: string, goals: string) => {
        setCvContent(cv);
        setCareerGoals(goals);
        setView("hub");
    }

    if (view === "onboarding") {
        return <OnboardingView onCompleted={startHub} />
    }

    return <HubView initialCv={cvContent} initialGoals={careerGoals} backToOnboarding={() => setView("onboarding")} />;
}

function OnboardingView({ onCompleted }: { onCompleted: (cv: string, goals: string) => void }) {
    const { toast } = useToast();
    const [goals, setGoals] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templateInfo, setTemplateInfo] = useState({ fullName: "", email: "", phone: "", careerGoal: "" });

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf" && !file.type.startsWith("text/")) {
            toast({
                variant: 'destructive',
                title: 'Unsupported File Type',
                description: 'Please upload a PDF or a plain text file.',
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            onCompleted(content, goals);
        };
        reader.onerror = () => {
            toast({
                variant: 'destructive',
                title: 'File Read Error',
                description: 'Could not read the selected file.',
            });
        };
        reader.readAsText(file);
    };

    const handleGenerateTemplate = async () => {
        if (!templateInfo.fullName || !templateInfo.careerGoal) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out your full name and career goal.' });
            return;
        }
        setIsLoading(true);
        try {
            const result = await generateCvTemplate({
                ...templateInfo,
                email: templateInfo.email || "email@example.com",
                phone: templateInfo.phone || "0123456789",
            });
            onCompleted(result.cvTemplate, templateInfo.careerGoal);
        } catch (e) {
            console.error("Template generation error", e);
            toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not generate a CV template.' });
        } finally {
            setIsLoading(false);
            setIsTemplateModalOpen(false);
        }
    }
    
    return (
        <>
            <HomeHeader />
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Career Hub Onboarding</h1>
                    <p className="text-muted-foreground">Your personal AI career assistant. Let's get you started.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 items-start">
                    <Card className="flex-1">
                        <CardHeader>
                            <CardTitle>1. Tell us about you</CardTitle>
                            <CardDescription>What are your career aspirations? The more detail, the better.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="e.g., I'm a final year computer science student looking for a junior software engineering role in fintech..."
                                value={goals}
                                onChange={e => setGoals(e.target.value)}
                                rows={6}
                            />
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="flex-1">
                            <CardHeader>
                                <CardTitle>2. Provide your CV</CardTitle>
                                <CardDescription>Upload your existing CV or let us help you write one.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="w-6 h-6" /> Upload CV
                                </Button>
                                <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setIsTemplateModalOpen(true)}>
                                    <Sparkles className="w-6 h-6" /> Help me write one
                                </Button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md" />
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={() => onCompleted("", goals)} disabled={!goals}>
                                    Continue with just my goals <ArrowRight className="ml-2" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>

                <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Generate a CV Template</DialogTitle>
                            <DialogDescription>Provide some basic info and we'll create a professional template for you.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <Input placeholder="Full Name *" value={templateInfo.fullName} onChange={e => setTemplateInfo(p => ({...p, fullName: e.target.value}))} />
                            <Input placeholder="Email Address" type="email" value={templateInfo.email} onChange={e => setTemplateInfo(p => ({...p, email: e.target.value}))} />
                            <Input placeholder="Phone Number" value={templateInfo.phone} onChange={e => setTemplateInfo(p => ({...p, phone: e.target.value}))} />
                            <Input placeholder="Target Role / Career Goal *" value={templateInfo.careerGoal} onChange={e => setTemplateInfo(p => ({...p, careerGoal: e.target.value}))} />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleGenerateTemplate} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 animate-spin" />}
                                Generate
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    )
}


function HubView({ initialCv, initialGoals, backToOnboarding }: { initialCv: string, initialGoals: string, backToOnboarding: () => void }) {
    const [activeTab, setActiveTab] = useState<HubTab>("cv");
    const [cvContent, setCvContent] = useState(initialCv);
    const [careerGoals, setCareerGoals] = useState(initialGoals);
    
    // CV Tab State
    const [cvResult, setCvResult] = useState<ImproveCvOutput | null>(null);
    const [isImprovingCv, setIsImprovingCv] = useState(false);
    const [isCvDirty, setIsCvDirty] = useState(false);

    // Chat Tab State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatting, setIsChatting] = useState(false);

    // Jobs Tab State
    const [jobResults, setJobResults] = useState<SearchForJobsOutput | null>(null);
    const [isSearchingJobs, setIsSearchingJobs] = useState(false);
    const [jobSearchLocation, setJobSearchLocation] = useState("Ghana");

    const { toast } = useToast();

    const handleImproveCv = async () => {
        if (!cvContent.trim()) {
            toast({ variant: 'destructive', title: 'CV is empty', description: 'Please provide your CV content.'});
            return;
        }
        setIsImprovingCv(true);
        setCvResult(null);
        try {
            const result = await improveCv({ currentCv: cvContent, careerGoals });
            setCvResult(result);
            setIsCvDirty(false);
        } catch(e) {
            console.error("CV improvement error", e);
            toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Could not improve your CV at this time.' });
        } finally {
            setIsImprovingCv(false);
        }
    };
    
    useEffect(() => {
        if(initialCv && activeTab === "cv" && !cvResult) {
            handleImproveCv();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCv, activeTab]);

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMessage: ChatMessage = { role: 'user', content: chatInput };
        setChatHistory(prev => [...prev, userMessage]);
        setIsChatting(true);
        const currentInput = chatInput;
        setChatInput("");

        try {
            const result = await getCareerAdvice({ background: cvContent, careerObjectives: currentInput });
            const assistantMessage: ChatMessage = { role: 'assistant', content: <CareerAdviceCard result={result} /> };
            setChatHistory(prev => [...prev, assistantMessage]);
        } catch(e) {
            console.error("Career advice error", e);
            const errorMessage: ChatMessage = { role: 'assistant', content: "Sorry, I couldn't process that request." };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsChatting(false);
        }
    };
    
    const handleJobSearch = async () => {
        if (!cvContent.trim() && !careerGoals.trim()) {
            toast({ variant: 'destructive', title: 'Not enough info', description: 'Please provide your CV or career goals to search for jobs.'});
            return;
        }
        setIsSearchingJobs(true);
        setJobResults(null);
        try {
            const results = await searchForJobs({ cv: cvContent, careerGoals, location: jobSearchLocation });
            setJobResults(results);
        } catch(e) {
             console.error("Job search error", e);
            toast({ variant: 'destructive', title: 'Search Failed', description: 'Could not find jobs at this time.' });
        } finally {
            setIsSearchingJobs(false);
        }
    };

    const downloadCv = (content: string) => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rewritten_cv.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    return (
        <div className="flex flex-col h-screen">
            <HomeHeader left={
                <Button variant="outline" onClick={backToOnboarding}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Start Over
                </Button>
            } />
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HubTab)} className="flex-1 flex flex-col">
                <div className="px-4 sm:px-6 lg:px-8 border-b">
                    <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
                        <TabsTrigger value="cv"><FileText className="mr-2"/>CV Improver</TabsTrigger>
                        <TabsTrigger value="chat"><MessageCircle className="mr-2"/>Career Chat</TabsTrigger>
                        <TabsTrigger value="jobs"><Briefcase className="mr-2"/>Job Search</TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="cv" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 mt-0">
                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="flex flex-col">
                           <CardHeader>
                               <CardTitle>Your CV</CardTitle>
                               <CardDescription>Edit your CV here. When ready, click "Improve CV".</CardDescription>
                           </CardHeader>
                           <CardContent className="flex-1">
                               <Textarea 
                                   className="h-full min-h-[400px] resize-none" 
                                   value={cvContent} 
                                   onChange={e => {
                                       setCvContent(e.target.value);
                                       setIsCvDirty(true);
                                   }}
                               />
                           </CardContent>
                           <CardFooter className="justify-between">
                                <p className="text-sm text-muted-foreground">{cvContent.split(/\s+/).filter(Boolean).length} words</p>
                                <Button onClick={handleImproveCv} disabled={isImprovingCv || !isCvDirty}>
                                    {isImprovingCv && <Loader2 className="mr-2 animate-spin" />}
                                    Improve CV
                                </Button>
                           </CardFooter>
                        </Card>
                         <Card className="flex flex-col">
                           <CardHeader>
                               <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>AI Analysis & Rewrite</CardTitle>
                               <CardDescription>Here is the AI's feedback and suggested rewrite.</CardDescription>
                           </CardHeader>
                           <CardContent className="flex-1 relative">
                                {isImprovingCv && <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
                                {cvResult ? (
                                    <div className="space-y-6 h-full overflow-y-auto">
                                        <div>
                                            <h3 className="font-semibold mb-2">Critique</h3>
                                            <p className="text-sm text-muted-foreground">{cvResult.critique}</p>
                                        </div>
                                         <div>
                                            <h3 className="font-semibold mb-2">Rewritten Experience</h3>
                                            <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md h-64 overflow-y-auto">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{cvResult.rewrittenExperience}</ReactMarkdown>
                                            </div>
                                            <Button variant="outline" size="sm" className="mt-2" onClick={() => downloadCv(cvResult.rewrittenExperience)}><Download className="mr-2"/>Download</Button>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold mb-2">Skill Gap Analysis</h3>
                                            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                                                {cvResult.skillGapAnalysis.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </div>
                                         <div>
                                            <h3 className="font-semibold mb-2">Action Plan</h3>
                                             <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                                                {cvResult.actionPlan.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                ) : !isImprovingCv && (
                                    <div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                                        <BrainCircuit className="w-12 h-12 mb-4" />
                                        <p>Your CV analysis will appear here.</p>
                                    </div>
                                )}
                           </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatHistory.length === 0 ? (
                           <div className="text-center text-muted-foreground pt-10 px-6 h-full flex flex-col justify-center items-center">
                               <Bot className="w-12 h-12 mx-auto text-primary/80 mb-4" />
                               <h3 className="font-semibold text-foreground text-lg">AI Career Advisor</h3>
                               <p className="mt-2 text-sm">Ask about career paths, interview tips, or academic choices based on your profile.</p>
                           </div>
                        ) : chatHistory.map((msg, i) => (
                             <div key={i} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Bot className="w-5 h-5"/></div>}
                                <div className={cn("p-3 rounded-lg max-w-[80%]", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                                    {typeof msg.content === 'string' ? <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown> : msg.content}
                                </div>
                            </div>
                        ))}
                         {isChatting && <div className="flex justify-start"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                    </div>
                    <div className="p-4 border-t bg-background">
                        <form onSubmit={handleChatSubmit} className="relative">
                            <Textarea
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Ask a question..."
                                className="pr-12"
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e as any); }}}
                                disabled={isChatting}
                            />
                            <Button size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" type="submit" disabled={isChatting}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="jobs" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 mt-0">
                    <Card className="max-w-4xl mx-auto">
                        <CardHeader>
                            <CardTitle>AI Job Search</CardTitle>
                            <CardDescription>Find jobs tailored to your profile and goals.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <label htmlFor="location" className="text-sm font-medium">Location</label>
                                    <Input id="location" value={jobSearchLocation} onChange={e => setJobSearchLocation(e.target.value)} placeholder="e.g. Accra, Ghana" />
                                </div>
                                <Button onClick={handleJobSearch} disabled={isSearchingJobs}>
                                    {isSearchingJobs && <Loader2 className="mr-2 animate-spin" />}
                                    <Search className="mr-2" /> Search Jobs
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    {isSearchingJobs && <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>}
                    {jobResults && (
                        <div className="max-w-4xl mx-auto mt-8 space-y-4">
                            {jobResults.results.length > 0 ? (
                                <>
                                    <h3 className="font-bold text-lg">Found {jobResults.results.length} jobs</h3>
                                    {jobResults.results.map((job, i) => (
                                        <Card key={i}>
                                            <CardHeader>
                                                <CardTitle>{job.title}</CardTitle>
                                                <CardDescription>{job.company} - {job.location}</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground mb-4">{job.snippet}</p>
                                                <Button asChild>
                                                    <a href={job.url} target="_blank" rel="noopener noreferrer">View & Apply <ArrowRight className="ml-2"/></a>
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </>
                            ) : (
                                <p className="text-center text-muted-foreground py-10">No jobs found matching your profile. Try broadening your goals.</p>
                            )}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}

function CareerAdviceCard({ result }: { result: CareerAdviceOutput }) {
    return (
        <Card className="bg-background">
            <CardHeader>
                <CardTitle>Your Career & Academic Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div>
                    <h4 className="font-semibold mb-1">Target Role Analysis</h4>
                    <p className="text-muted-foreground">{result.targetRoleAnalysis}</p>
                </div>
                 <div>
                    <h4 className="font-semibold mb-1">Academic Roadmap</h4>
                    <ul className="space-y-2">
                        {result.academicRoadmap.map((item, i) => (
                            <li key={i} className="p-2 border rounded-md">
                                <p className="font-medium">{item.recommendation}</p>
                                <p className="text-muted-foreground text-xs">{item.reason}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold mb-1">Career Stepping Stones</h4>
                     <ul className="list-disc pl-5 text-muted-foreground">
                        {result.careerSteppingStones.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold mb-1">Insider Tip 💡</h4>
                    <p className="text-muted-foreground italic">&quot;{result.insiderTip}&quot;</p>
                </div>
            </CardContent>
        </Card>
    );
}
