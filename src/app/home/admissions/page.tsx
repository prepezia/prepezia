"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { Upload, ArrowRight, BrainCircuit, FileText, Search, MessageCircle, Download, Sparkles, Loader2, ArrowLeft, Bot, Send, School } from "lucide-react";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";
import { improveAcademicCv, ImproveAcademicCvOutput } from "@/ai/flows/improve-academic-cv";
import { getAdmissionsAdvice, GetAdmissionsAdviceOutput } from "@/ai/flows/get-admissions-advice";
import { generateSop, GenerateSopOutput } from "@/ai/flows/generate-sop";
import { cn } from "@/lib/utils";
import { PDFViewer } from "@/components/pdf/PDFViewer";

type View = "loading" | "onboarding" | "hub";
type HubTab = "cv" | "chat" | "sop";
type OnboardingStep = "intro" | "goals" | "cv";

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
};

type CvData = {
    content?: string;
    dataUri?: string;
    fileName?: string;
    contentType?: string;
};

export default function AdmissionsPageWrapper() {
    return (
        <Suspense fallback={
            <>
                <HomeHeader />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </>
        }>
            <AdmissionsPage />
        </Suspense>
    )
}

function AdmissionsPage() {
    const [view, setView] = useState<View>("loading");
    const [cv, setCv] = useState<CvData>({ content: "" });
    const [academicObjectives, setAcademicObjectives] = useState<string>("");

    useEffect(() => {
        const onboarded = localStorage.getItem('learnwithtemi_admissions_onboarded') === 'true';
        if (onboarded) {
            const savedCv = localStorage.getItem('learnwithtemi_academic_cv');
            const savedGoals = localStorage.getItem('learnwithtemi_academic_goals') || "";
            if (savedCv) {
                const trimmedCv = savedCv.trim();
                if (trimmedCv.startsWith('{') && trimmedCv.endsWith('}')) {
                    try {
                        const parsedCv = JSON.parse(trimmedCv);
                        if (typeof parsedCv === 'object' && parsedCv !== null && !Array.isArray(parsedCv)) {
                            setCv(parsedCv);
                        } else {
                           localStorage.removeItem('learnwithtemi_academic_cv');
                           setCv({ content: "" });
                        }
                    } catch (e) {
                        localStorage.removeItem('learnwithtemi_academic_cv');
                        setCv({ content: "" });
                    }
                } else {
                    localStorage.removeItem('learnwithtemi_academic_cv');
                    setCv({ content: "" });
                }
            }
            setAcademicObjectives(savedGoals);
            setView("hub");
        } else {
            setView("onboarding");
        }
    }, []);

    const handleOnboardingComplete = (cv: CvData, goals: string) => {
        setCv(cv);
        setAcademicObjectives(goals);
        localStorage.setItem('learnwithtemi_admissions_onboarded', 'true');
        localStorage.setItem('learnwithtemi_academic_cv', JSON.stringify(cv));
        localStorage.setItem('learnwithtemi_academic_goals', goals);
        localStorage.removeItem('learnwithtemi_admissions_onboarding_progress');
        setView("hub");
    }
    
    const handleStartOver = () => {
        localStorage.removeItem('learnwithtemi_admissions_onboarded');
        localStorage.removeItem('learnwithtemi_academic_cv');
        localStorage.removeItem('learnwithtemi_academic_goals');
        setCv({ content: "" });
        setAcademicObjectives("");
        setView("onboarding");
    }

    if (view === "loading") {
        return (
            <>
                <HomeHeader />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </>
        );
    }
    
    if (view === "onboarding") {
        return <OnboardingFlow onCompleted={handleOnboardingComplete} initialGoals={academicObjectives} />
    }

    return <HubView initialCv={cv} initialGoals={academicObjectives} backToOnboarding={handleStartOver} />;
}

function OnboardingFlow({ onCompleted, initialGoals }: { onCompleted: (cv: CvData, goals: string) => void, initialGoals?: string }) {
    const [step, setStep] = useState<OnboardingStep>('intro');
    const { toast } = useToast();
    const [goals, setGoals] = useState(initialGoals || "");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const savedProgress = localStorage.getItem('learnwithtemi_admissions_onboarding_progress');
        if (savedProgress) {
            setGoals(JSON.parse(savedProgress).goals);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('learnwithtemi_admissions_onboarding_progress', JSON.stringify({ goals }));
    }, [goals]);

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
            const result = e.target?.result as string;
            onCompleted({ dataUri: result, fileName: file.name, contentType: file.type }, goals);
        };
        reader.onerror = () => toast({ variant: 'destructive', title: 'File Read Error' });
        reader.readAsDataURL(file);
    };
    
    const handleContinueWithGoals = () => {
        if (!goals.trim()) {
            toast({ variant: 'destructive', title: 'Goals are required', description: "Please go back and tell us about your aspirations."});
            return;
        }
        onCompleted({ content: "" }, goals);
    }

    const handleNextToCvStep = () => {
        if (!goals.trim()) {
            toast({ variant: 'destructive', title: 'Objectives are required', description: "Please tell us about your academic aspirations."});
            return;
        }
        setStep('cv');
    };
    
    if (step === 'intro') {
        return (
            <>
                <HomeHeader />
                <div className="p-4 sm:p-6 lg:p-8 space-y-8 flex-1 flex flex-col justify-center items-center">
                    <Card className="max-w-2xl w-full">
                        <CardHeader className="text-center">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto mb-6">
                                <School className="w-8 h-8" />
                            </div>
                            <CardTitle className="text-3xl font-headline font-bold">Your Global Admissions Partner</CardTitle>
                            <CardDescription>Find top universities, secure scholarships, and craft the perfect application—all with AI assistance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" size="lg" onClick={() => setStep('goals')}>
                                Get Started <ArrowRight className="ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </>
        )
    }

    if (step === 'goals') {
        return (
            <>
                <HomeHeader />
                <div className="p-4 sm:p-6 lg:p-8 space-y-8 flex-1 flex flex-col justify-center">
                    <Card className="max-w-2xl mx-auto w-full">
                        <CardHeader>
                            <CardTitle>Admissions Hub Onboarding</CardTitle>
                            <CardDescription>Step 1 of 2: What are your academic objectives?</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="e.g., I want to pursue a Master's in Computer Science in Germany, focusing on AI, and I'm looking for a full scholarship..."
                                value={goals}
                                onChange={e => setGoals(e.target.value)}
                                rows={8}
                            />
                        </CardContent>
                        <CardFooter className="justify-end">
                            <Button onClick={handleNextToCvStep}>
                                Next <ArrowRight className="ml-2" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </>
        );
    }

    if (step === 'cv') {
        return (
            <>
                <HomeHeader />
                <div className="p-4 sm:p-6 lg:p-8 space-y-8 flex-1 flex flex-col justify-center">
                     <Card className="max-w-2xl mx-auto w-full">
                        <CardHeader>
                            <CardTitle>Admissions Hub Onboarding</CardTitle>
                            <CardDescription>Step 2 of 2: Provide your Academic CV.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Button variant="outline" className="w-full h-24 flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="w-6 h-6" /> Upload CV
                            </Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md" />
                        </CardContent>
                        <CardFooter className="flex-col items-stretch space-y-4">
                            <Button className="w-full" onClick={handleContinueWithGoals}>
                                Finish Onboarding (No CV)
                            </Button>
                             <Button variant="outline" className="w-full" onClick={() => setStep('goals')}>
                                 <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </>
        )
    }

    return null;
}

function HubView({ initialCv, initialGoals, backToOnboarding }: { initialCv: CvData, initialGoals: string, backToOnboarding: () => void }) {
    const [activeTab, setActiveTab] = useState<HubTab>("cv");
    const [cv, setCv] = useState<CvData>(initialCv);
    
    // CV Tab State
    const [cvResult, setCvResult] = useState<ImproveAcademicCvOutput | null>(null);
    const [isImprovingCv, setIsImprovingCv] = useState(false);
    const [isCvDirty, setIsCvDirty] = useState(false);

    // Chat Tab State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatting, setIsChatting] = useState(false);

    // SOP Tab State
    const [sopResult, setSopResult] = useState<GenerateSopOutput | null>(null);
    const [isGeneratingSop, setIsGeneratingSop] = useState(false);
    const [sopInputs, setSopInputs] = useState({ targetUniversity: "", targetProgram: "", personalMotivation: ""});

    const { toast } = useToast();
    
    const handleImproveCv = async () => {
        if (!cv.content && !cv.dataUri) {
            toast({ variant: 'destructive', title: 'CV is empty' });
            return;
        }
        setIsImprovingCv(true);
        setCvResult(null);
        try {
            const result = await improveAcademicCv({ cvContent: cv.content, cvDataUri: cv.dataUri, cvContentType: cv.contentType });
            setCvResult(result);
            setIsCvDirty(false);
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Analysis Failed', description: e.message || 'Could not improve your CV.' });
        } finally {
            setIsImprovingCv(false);
        }
    };
    
    useEffect(() => {
        if((initialCv.content || initialCv.dataUri) && activeTab === "cv" && !cvResult) {
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
            const result = await getAdmissionsAdvice({ backgroundContent: cv.content, backgroundDataUri: cv.dataUri, backgroundContentType: cv.contentType, academicObjectives: currentInput });
            const assistantMessage: ChatMessage = { role: 'assistant', content: <AdmissionsAdviceCard result={result} /> };
            setChatHistory(prev => [...prev, assistantMessage]);
        } catch(e: any) {
            const errorMessage: ChatMessage = { role: 'assistant', content: "Sorry, I couldn't process that request." };
            setChatHistory(prev => [...prev, errorMessage]);
            toast({
                variant: "destructive",
                title: "Chat Error",
                description: e.message || "The AI advisor failed to respond."
            });
        } finally {
            setIsChatting(false);
        }
    };

    const handleGenerateSop = async () => {
        if (!sopInputs.targetUniversity || !sopInputs.targetProgram || !sopInputs.personalMotivation) {
            toast({ variant: 'destructive', title: 'All fields are required.' });
            return;
        }
        setIsGeneratingSop(true);
        setSopResult(null);
        try {
            const result = await generateSop({ ...sopInputs, cvContent: cv.content, cvDataUri: cv.dataUri, cvContentType: cv.contentType });
            setSopResult(result);
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'SOP Generation Failed', description: e.message || 'Could not generate the SOP.' });
        } finally {
            setIsGeneratingSop(false);
        }
    }
    
    const downloadCv = (content: string) => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rewritten_academic_cv.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    return (
        <div className="flex flex-col h-screen">
            <HomeHeader left={ <Button variant="outline" onClick={backToOnboarding}><ArrowLeft className="mr-2 h-4 w-4" /> Start Over</Button> } />
            <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HubTab)} className="w-full flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-3 bg-secondary">
                        <TabsTrigger value="cv"><FileText className="mr-2"/>CV Improver</TabsTrigger>
                        <TabsTrigger value="chat"><MessageCircle className="mr-2"/>Admissions Chat</TabsTrigger>
                        <TabsTrigger value="sop"><Sparkles className="mr-2"/>SOP Generator</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="cv" className="mt-4 flex-1 flex flex-col">
                        <Tabs defaultValue="editor" className="w-full flex-1 flex flex-col">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="editor">Your CV</TabsTrigger>
                                <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
                            </TabsList>
                            <TabsContent value="editor" className="mt-4 flex-1">
                                <Card className="flex flex-col h-full">
                                    <CardHeader><CardTitle>Your Academic CV</CardTitle><CardDescription>{cv.dataUri ? "PDF preview. To edit, clear and start over." : 'Edit your CV content.'}</CardDescription></CardHeader>
                                    <CardContent className="flex-1 relative">
                                    {cv.dataUri ? (
                                        <PDFViewer 
                                            dataUri={cv.dataUri} 
                                            fileName={cv.fileName}
                                            onClear={backToOnboarding}
                                        />
                                    ) : (
                                        <Textarea className="h-full min-h-[400px] resize-none" value={cv.content || ''} onChange={e => { setCv({ content: e.target.value }); setIsCvDirty(true); }} />
                                    )}
                                    </CardContent>
                                    <CardFooter className="justify-end">
                                        {!cv.dataUri && (
                                            <p className="text-sm text-muted-foreground mr-auto">{`${cv.content?.split(/\s+/).filter(Boolean).length || 0} words`}</p>
                                        )}
                                        <Button onClick={handleImproveCv} disabled={isImprovingCv || !isCvDirty}>
                                            {isImprovingCv && <Loader2 className="mr-2 animate-spin" />} Improve CV
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </TabsContent>
                            <TabsContent value="analysis" className="mt-4 flex-1">
                                <Card className="h-full">
                                    <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>AI Analysis & Rewrite</CardTitle><CardDescription>Feedback from the Scholar-Architect AI.</CardDescription></CardHeader>
                                    <CardContent className="flex-1 relative">
                                        {isImprovingCv && <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
                                        {cvResult ? (
                                            <div className="space-y-6 h-full overflow-y-auto">
                                                <div><h3 className="font-semibold mb-2">CV Audit</h3><p className="text-sm text-muted-foreground">{cvResult.audit}</p></div>
                                                <div><h3 className="font-semibold mb-2">Rewritten Experience</h3><div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md h-64 overflow-y-auto"><ReactMarkdown remarkPlugins={[remarkGfm]}>{cvResult.rewrittenExperience}</ReactMarkdown></div><Button variant="outline" size="sm" className="mt-2" onClick={() => downloadCv(cvResult.rewrittenExperience)}><Download className="mr-2"/>Download Rewrite</Button></div>
                                                <div><h3 className="font-semibold mb-2">Citation Style Check</h3><p className="text-sm text-muted-foreground">{cvResult.citationStyleCheck}</p></div>
                                            </div>
                                        ) : !isImprovingCv && (<div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center"><BrainCircuit className="w-12 h-12 mb-4" /><p>Your CV analysis will appear here.</p></div>)}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </TabsContent>

                    <TabsContent value="chat" className="mt-4 flex-1 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chatHistory.length === 0 ? (<div className="text-center text-muted-foreground pt-10 px-6 h-full flex flex-col justify-center items-center"><Bot className="w-12 h-12 mx-auto text-primary/80 mb-4" /><h3 className="font-semibold text-foreground text-lg">AI Admissions Advisor</h3><p className="mt-2 text-sm">Ask about universities, scholarships, or application strategies.</p></div>) 
                            : chatHistory.map((msg, i) => (<div key={i} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>{msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Bot className="w-5 h-5"/></div>}<div className={cn("p-3 rounded-lg max-w-[80%]", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>{typeof msg.content === 'string' ? <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown> : msg.content}</div></div>))}
                            {isChatting && <div className="flex justify-start"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                        </div>
                        <div className="p-4 border-t bg-background">
                            <form onSubmit={handleChatSubmit} className="relative"><Textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask a question..." className="pr-12" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e as any); }}} disabled={isChatting}/><Button size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" type="submit" disabled={isChatting}><Send className="h-4 w-4" /></Button></form>
                        </div>
                    </TabsContent>

                    <TabsContent value="sop" className="mt-4 flex-1 flex flex-col">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                            <Card>
                                <CardHeader><CardTitle>SOP Generator</CardTitle><CardDescription>Provide the details to generate your Statement of Purpose.</CardDescription></CardHeader>
                                <CardContent className="space-y-4">
                                    <div><label className="text-sm font-medium">Target University</label><Input value={sopInputs.targetUniversity} onChange={e => setSopInputs(p => ({...p, targetUniversity: e.target.value}))} /></div>
                                    <div><label className="text-sm font-medium">Target Program</label><Input value={sopInputs.targetProgram} onChange={e => setSopInputs(p => ({...p, targetProgram: e.target.value}))} /></div>
                                    <div><label className="text-sm font-medium">Personal Motivation</label><Textarea value={sopInputs.personalMotivation} onChange={e => setSopInputs(p => ({...p, personalMotivation: e.target.value}))} placeholder="Why this field? What's your story?" rows={5}/></div>
                                    <Button onClick={handleGenerateSop} disabled={isGeneratingSop}>{isGeneratingSop && <Loader2 className="mr-2 animate-spin"/>} Generate SOP</Button>
                                </CardContent>
                            </Card>
                            <Card className="flex flex-col">
                                <CardHeader><CardTitle>Generated SOP</CardTitle></CardHeader>
                                <CardContent className="flex-1 relative">
                                    {isGeneratingSop && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>}
                                    {sopResult ? (<div className="prose prose-sm dark:prose-invert max-w-none h-full overflow-y-auto rounded-md border p-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{sopResult.sopDraft}</ReactMarkdown></div>) 
                                    : (<div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center"><FileText className="w-12 h-12 mb-4" /><p>Your generated SOP will appear here.</p></div>)}
                                </CardContent>
                                {sopResult && <CardFooter><Button variant="outline" onClick={() => downloadCv(sopResult.sopDraft)}>Download SOP</Button></CardFooter>}
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

function AdmissionsAdviceCard({ result }: { result: GetAdmissionsAdviceOutput }) {
    return (
        <Card className="bg-background">
            <CardHeader><CardTitle>Your Admissions & Scholarship Strategy</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div><h4 className="font-semibold mb-1">Profile Strengths</h4><p className="text-muted-foreground">{result.profileStrengths}</p></div>
                <div><h4 className="font-semibold mb-1">University Shortlist</h4><ul className="space-y-2">{result.universityShortlist.map((item, i) => (<li key={i} className="p-2 border rounded-md"><p className="font-medium">{item.school}</p><p className="text-muted-foreground text-xs">{item.reason}</p></li>))}</ul></div>
                <div><h4 className="font-semibold mb-1">Scholarship Radar</h4><ul className="list-disc pl-5 text-muted-foreground">{result.scholarshipRadar.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
                <div><h4 className="font-semibold mb-1">Admissions Calendar</h4><p className="text-muted-foreground">{result.admissionsCalendar}</p></div>
            </CardContent>
        </Card>
    );
}
