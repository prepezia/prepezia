

"use client";

import { useState, useRef, useEffect, Suspense, useCallback, useMemo } from "react";
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
import { Upload, ArrowRight, BrainCircuit, FileText, Search, MessageCircle, Download, Sparkles, Loader2, ArrowLeft, Bot, Send, School, File, ImageIcon, Image as LucideImage, Clipboard, Printer, Mic, Volume2, Pause } from "lucide-react";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";
import { improveAcademicCv, ImproveAcademicCvOutput } from "@/ai/flows/improve-academic-cv";
import { getAdmissionsAdvice, GetAdmissionsAdviceOutput } from "@/ai/flows/get-admissions-advice";
import { generateSop, GenerateSopOutput } from "@/ai/flows/generate-sop";
import { extractTextFromFile } from "@/ai/flows/extract-text-from-file";
import { designCv, DesignCvOutput } from "@/ai/flows/design-cv-flow";
import { admissionsChat } from "@/ai/flows/admissions-chat";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";

type View = "loading" | "onboarding" | "hub";
type HubTab = "cv" | "chat" | "opportunities";
type OnboardingStep = "intro" | "goals" | "cv";

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
};

type CvData = {
  content?: string;
  fileName?: string;
  contentType?: string;
};

// Supported file types
const ACCEPTED_FILE_TYPES = {
  pdf: 'application/pdf',
  images: 'image/jpeg,image/jpg,image/png,image/webp',
  text: 'text/plain,text/markdown,.txt,.md',
  doc: 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx'
};

const ALL_ACCEPTED_FILES = Object.values(ACCEPTED_FILE_TYPES).join(',');


export default function AdmissionsPageWrapper() {
    return (
        <Suspense fallback={
            <div className="flex flex-col min-h-screen">
                <HomeHeader />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
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
                 try {
                    const parsedCv = JSON.parse(savedCv);
                    if (typeof parsedCv === 'object' && parsedCv !== null) {
                        setCv(parsedCv);
                    } else {
                       throw new Error("Invalid CV object");
                    }
                } catch (e) {
                    console.error("Corrupted CV JSON in localStorage. Clearing.", e);
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
            <div className="flex flex-col min-h-screen">
                <HomeHeader />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
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
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const savedProgress = localStorage.getItem('learnwithtemi_admissions_onboarding_progress');
        if (savedProgress) {
            try {
                setGoals(JSON.parse(savedProgress).goals);
            } catch {
                // ignore corrupted data
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('learnwithtemi_admissions_onboarding_progress', JSON.stringify({ goals }));
    }, [goals]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            toast({ title: 'Extracting Text...', description: 'The AI is reading your document. Please wait.' });
            let extractedText;

            if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.includes('word')) {
                const dataUri = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = (e) => reject(e);
                    reader.readAsDataURL(file);
                });
                const result = await extractTextFromFile({
                    fileDataUri: dataUri,
                    fileContentType: file.type,
                });
                extractedText = result.extractedText;
            } else {
                extractedText = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                });
            }

            onCompleted({ 
                content: extractedText, 
                fileName: file.name, 
                contentType: file.type,
            }, goals);

        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Text Extraction Failed', description: err.message || 'Could not read text from the uploaded file.' });
        } finally {
            setIsLoading(false);
        }
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
            <div className="flex flex-col min-h-screen">
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
            </div>
        )
    }

    if (step === 'goals') {
        return (
            <div className="flex flex-col min-h-screen">
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
            </div>
        );
    }

    if (step === 'cv') {
        return (
            <div className="flex flex-col min-h-screen">
                <HomeHeader />
                <div className="p-4 sm:p-6 lg:p-8 space-y-8 flex-1 flex flex-col justify-center">
                     <Card className="max-w-2xl mx-auto w-full relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-lg z-10">
                                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                                <p className="text-muted-foreground">Extracting text from your document...</p>
                            </div>
                        )}
                        <CardHeader>
                            <CardTitle>Admissions Hub Onboarding</CardTitle>
                            <CardDescription>Step 2 of 2: Provide your Academic CV.</CardDescription>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline" className="flex items-center gap-1"><File className="h-3 w-3" /> PDF</Badge>
                                <Badge variant="outline" className="flex items-center gap-1"><LucideImage className="h-3 w-3" /> JPG/PNG</Badge>
                                <Badge variant="outline" className="flex items-center gap-1"><FileText className="h-3 w-3" /> Word</Badge>
                                <Badge variant="outline" className="flex items-center gap-1"><FileText className="h-3 w-3" /> TXT</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Button variant="outline" className="w-full h-24 flex-col gap-2" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                                <Upload className="w-6 h-6" /> Upload Academic CV
                                <span className="text-xs text-muted-foreground">PDF, Images, Word, TXT</span>
                            </Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={ALL_ACCEPTED_FILES} />
                        </CardContent>
                        <CardFooter className="flex-col items-stretch space-y-4">
                            <Button className="w-full" onClick={handleContinueWithGoals} disabled={isLoading}>
                                Finish Onboarding (No CV)
                            </Button>
                             <Button variant="outline" className="w-full" onClick={() => setStep('goals')} disabled={isLoading}>
                                 <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        )
    }

    return null;
}

function HubView({ initialCv, initialGoals, backToOnboarding }: { initialCv: CvData, initialGoals: string, backToOnboarding: () => void }) {
    const [activeTab, setActiveTab] = useState<HubTab>("cv");
    const [activeCvTab, setActiveCvTab] = useState<'editor' | 'analysis' | 'sop' | 'designer'>('editor');
    const [cv, setCv] = useState<CvData>(initialCv);
    const [academicObjectives, setAcademicObjectives] = useState(initialGoals);
    
    // CV Tab State
    const [cvResult, setCvResult] = useState<ImproveAcademicCvOutput | null>(null);
    const [rewrittenCvContent, setRewrittenCvContent] = useState("");
    const [isImprovingCv, setIsImprovingCv] = useState(false);
    const [isCvDirty, setIsCvDirty] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    // Chat Tab State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isChatting, setIsChatting] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const recognitionRef = useRef<any>(null);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);


    // SOP Tab State
    const [sopResult, setSopResult] = useState<GenerateSopOutput | null>(null);
    const [isGeneratingSop, setIsGeneratingSop] = useState(false);
    const [sopInputs, setSopInputs] = useState({ targetUniversity: "", targetProgram: "", personalMotivation: ""});
    
    // Designer Tab State
    const [designedCv, setDesignedCv] = useState<DesignCvOutput | null>(null);
    const [isDesigningCv, setIsDesigningCv] = useState(false);

    // Opportunities Tab State
    const [opportunitiesResult, setOpportunitiesResult] = useState<GetAdmissionsAdviceOutput | null>(null);
    const [isFindingOpportunities, setIsFindingOpportunities] = useState(false);

    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { user } = useUser();
    const firestore = useFirestore();
    const userDocRef = useMemo(() => {
      if (user && firestore) {
          return doc(firestore, 'users', user.uid);
      }
      return null;
    }, [user, firestore]);
    const { data: firestoreUser } = useDoc(userDocRef);

    const handlePlayAudio = useCallback(async (messageId: string, text: string) => {
        if (speakingMessageId === messageId && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setSpeakingMessageId(null);
            return;
        }

        if (generatingAudioId || (speakingMessageId && speakingMessageId !== messageId)) {
            if(audioRef.current) audioRef.current.pause();
        }

        setGeneratingAudioId(messageId);
        setSpeakingMessageId(null);
        try {
            const ttsResponse = await textToSpeech({ text });
            if (audioRef.current) {
                audioRef.current.src = ttsResponse.audio;
                audioRef.current.play();
                setSpeakingMessageId(messageId);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Audio Error', description: 'Could not generate AI speech.'});
        } finally {
            setGeneratingAudioId(null);
        }
    }, [generatingAudioId, speakingMessageId, toast]);

    const submitChat = useCallback(async (currentInput: string, isVoiceInput: boolean) => {
        if (!currentInput?.trim()) return;

        const userMessageId = `user-${Date.now()}`;
        const userMessage: ChatMessage = { id: userMessageId, role: 'user', content: currentInput };
        setChatHistory(prev => [...prev, userMessage]);
        setIsChatting(true);
        
        try {
            const result = await admissionsChat({ 
                cvContent: cv.content,
                academicObjectives: academicObjectives,
                question: currentInput,
                educationalLevel: firestoreUser?.educationalLevel,
            });
            const assistantMessageId = `asst-${Date.now()}`;
            const assistantMessage: ChatMessage = { id: assistantMessageId, role: 'assistant', content: result.answer };
            setChatHistory(prev => [...prev, assistantMessage]);

             if (isVoiceInput) {
                await handlePlayAudio(assistantMessageId, result.answer);
            }

        } catch(e: any) {
            const errorId = `err-${Date.now()}`;
            const errorMessage: ChatMessage = { id: errorId, role: 'assistant', content: "Sorry, I couldn't process that request." };
            setChatHistory(prev => [...prev, errorMessage]);
            toast({
                variant: "destructive",
                title: "Chat Error",
                description: e.message || "The AI advisor failed to respond."
            });
        } finally {
            setIsChatting(false);
        }
    }, [cv.content, academicObjectives, toast, handlePlayAudio, firestoreUser]);


    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                submitChat(transcript, true);
            };
            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                let description = `Could not recognize speech: ${event.error}`;
                if (event.error === 'network') {
                    description = 'Network error. Please check your internet connection and try again.';
                } else if (event.error === 'not-allowed') {
                    description = 'Microphone access denied. Please enable it in your browser settings.';
                }
                toast({ variant: 'destructive', title: 'Speech Error', description });
            };
            recognition.onend = () => setIsListening(false);
            recognitionRef.current = recognition;
        } else {
            console.warn("Speech Recognition API not supported in this browser.");
        }
    }, [toast, submitChat]);

    const handleMicClick = () => {
        if (speakingMessageId && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setSpeakingMessageId(null);
            return;
        }
        if (!recognitionRef.current) {
            toast({ variant: 'destructive', title: 'Not Supported', description: 'Speech recognition is not supported by your browser.' });
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };


    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        setActiveCvTab('editor');
        setIsExtracting(true);
        setCvResult(null);
        try {
            toast({ title: 'Extracting Text...', description: 'The AI is reading your document. Please wait.' });
            let extractedText;

            if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.includes('word')) {
                const dataUri = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = (e) => reject(e);
                    reader.readAsDataURL(file);
                });
                const result = await extractTextFromFile({
                    fileDataUri: dataUri,
                    fileContentType: file.type,
                });
                extractedText = result.extractedText;
            } else {
                extractedText = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                });
            }
            
            setCv({ 
                content: extractedText, 
                fileName: file.name, 
                contentType: file.type,
            });
            setIsCvDirty(true);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Text Extraction Failed', description: err.message || 'Could not read text from the uploaded file.' });
        } finally {
            setIsExtracting(false);
        }
    };
    
    const handleImproveCv = async () => {
        if (!cv.content) {
            toast({ variant: 'destructive', title: 'CV is empty' });
            return;
        }
        setIsImprovingCv(true);
        setCvResult(null);
        try {
            const result = await improveAcademicCv({ 
                cvContent: cv.content,
                educationalLevel: firestoreUser?.educationalLevel,
            });
            setCvResult(result);
            setRewrittenCvContent(result.fullRewrittenCv);
            setIsCvDirty(false); // Analysis is based on current content
            localStorage.setItem('learnwithtemi_academic_cv', JSON.stringify(cv)); // Save extracted CV
            setActiveCvTab('analysis');
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Analysis Failed', description: e.message || 'Could not improve your CV.' });
        } finally {
            setIsImprovingCv(false);
        }
    };

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentInput = chatInputRef.current?.value;
        if (!currentInput?.trim()) return;
        submitChat(currentInput, false);
        if (chatInputRef.current) chatInputRef.current.value = "";
    };

    const handleGenerateSop = async () => {
        if (!sopInputs.targetUniversity || !sopInputs.targetProgram || !sopInputs.personalMotivation) {
            toast({ variant: 'destructive', title: 'All fields are required.' });
            return;
        }
        setIsGeneratingSop(true);
        setSopResult(null);
        try {
            const result = await generateSop({ 
                ...sopInputs, 
                cvContent: cv.content,
                educationalLevel: firestoreUser?.educationalLevel,
            });
            setSopResult(result);
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'SOP Generation Failed', description: e.message || 'Could not generate the SOP.' });
        } finally {
            setIsGeneratingSop(false);
        }
    }
    
    const handleFindOpportunities = async () => {
        if (!academicObjectives.trim()) {
            toast({ variant: 'destructive', title: 'Academic Objectives Required', description: 'Please provide your academic objectives to find opportunities.' });
            return;
        }
        setIsFindingOpportunities(true);
        setOpportunitiesResult(null);
        try {
            const result = await getAdmissionsAdvice({
                backgroundContent: cv.content,
                academicObjectives,
                educationalLevel: firestoreUser?.educationalLevel,
            });
            setOpportunitiesResult(result);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to Find Opportunities', description: e.message || 'Could not find opportunities at this time.' });
        } finally {
            setIsFindingOpportunities(false);
        }
    };
    
    const handleDesignCv = async () => {
        if (!rewrittenCvContent) {
            toast({ variant: 'destructive', title: 'Rewritten CV is not available' });
            return;
        }
        setIsDesigningCv(true);
        setDesignedCv(null);
        try {
            const result = await designCv({ cvMarkdown: rewrittenCvContent });
            setDesignedCv(result);
            setActiveCvTab('designer');
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Design Failed', description: e.message || 'Could not design your CV.' });
        } finally {
            setIsDesigningCv(false);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('cv-print-area')?.innerHTML;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: 'destructive', title: 'Could not open print window', description: 'Please disable your pop-up blocker.' });
            return;
        }

        const styles = Array.from(document.getElementsByTagName('link'))
            .filter(link => link.rel === 'stylesheet')
            .map(link => link.outerHTML)
            .join('');
            
        const styleBlocks = Array.from(document.getElementsByTagName('style'))
            .map(style => style.outerHTML)
            .join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print CV</title>
                    ${styles}
                    ${styleBlocks}
                    <style>
                        @page { size: A4; margin: 0; }
                        body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    </style>
                </head>
                <body>
                    ${printContent}
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 1000);
    };


    const downloadMarkdown = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const copyToClipboard = (content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            toast({ title: "Copied to clipboard!" });
        }).catch(err => {
            toast({ variant: 'destructive', title: "Failed to copy", description: "Could not copy text to clipboard." });
        });
    };
    
    const clearCv = () => {
        setCv({ content: "", contentType: undefined, fileName: undefined });
        setCvResult(null);
        setRewrittenCvContent("");
        setIsCvDirty(false);
        localStorage.removeItem('learnwithtemi_academic_cv');
        setActiveCvTab('editor');
    };

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <HomeHeader left={ <Button variant="outline" onClick={backToOnboarding}><ArrowLeft className="mr-2 h-4 w-4" /> Start Over</Button> } />
            <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HubTab)} className="w-full flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-3 bg-secondary">
                        <TabsTrigger value="cv"><FileText className="mr-2"/>CV Improver</TabsTrigger>
                        <TabsTrigger value="chat"><MessageCircle className="mr-2"/>Admissions Chat</TabsTrigger>
                        <TabsTrigger value="opportunities"><Search className="mr-2"/>Opportunities</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="cv" className="mt-4 flex-1 flex flex-col pb-24">
                        <Tabs value={activeCvTab} onValueChange={(v) => setActiveCvTab(v as any)} className="w-full flex-1 flex flex-col">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="editor">Your CV</TabsTrigger>
                                <TabsTrigger value="analysis">AI Rewrite</TabsTrigger>
                                <TabsTrigger value="sop">SOP Generator</TabsTrigger>
                                <TabsTrigger value="designer" disabled={!cvResult}>AI Designer</TabsTrigger>
                            </TabsList>
                            <TabsContent value="editor" className="mt-4 flex-1 pb-8">
                                <Card className="flex flex-col h-full">
                                    <CardHeader>
                                        <CardTitle>Your Academic CV</CardTitle>
                                        <CardDescription>
                                            {cv.content 
                                            ? `CV text extracted from ${cv.fileName || 'your file'}. You can edit it below.`
                                            : 'Upload your CV to get started. Text will be automatically extracted.'
                                            }
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 relative">
                                        {isExtracting && <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-md z-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="mt-2 text-muted-foreground">Extracting text...</p></div>}
                                        <Textarea 
                                            className="h-full min-h-[400px] resize-none" 
                                            value={cv.content || ''} 
                                            onChange={e => {
                                                setCv(prev => ({...prev, content: e.target.value}));
                                                setIsCvDirty(true);
                                            }}
                                            readOnly={isExtracting}
                                            placeholder={isExtracting ? 'Extracting text...' : 'Your CV content will appear here.'}
                                        />
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={ALL_ACCEPTED_FILES} />
                                        {!cv.content && !isExtracting && (
                                            <div className="absolute inset-0 h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center bg-background">
                                                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                                                <p className="text-muted-foreground mb-2">Upload your Academic CV to get started</p>
                                                <p className="text-sm text-muted-foreground mb-4">Supports PDF, JPG/PNG, Word docs, and TXT files</p>
                                                <Button onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Upload CV</Button>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="justify-between pt-6">
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isExtracting}><Upload className="mr-2 h-4 w-4" /> Upload New</Button>
                                            {(cv.content) && (<Button variant="outline" size="sm" onClick={clearCv} disabled={isExtracting}>Clear</Button>)}
                                        </div>
                                        <Button onClick={handleImproveCv} disabled={isImprovingCv || isExtracting || !cv.content}>
                                            {isImprovingCv ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                                            {isImprovingCv ? 'Analyzing...' : cvResult ? 'Re-analyze CV' : 'Improve CV'}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </TabsContent>
                            <TabsContent value="analysis" className="mt-4 flex-1">
                                <Card className="h-full">
                                    <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>AI Rewrite</CardTitle><CardDescription>Feedback from the Scholar-Architect AI.</CardDescription></CardHeader>
                                    <CardContent className="flex-1 relative">
                                        {isImprovingCv && <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
                                        {cvResult ? (
                                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                                                <div className="flex flex-col gap-6">
                                                    <div>
                                                        <h3 className="font-semibold mb-2 text-lg">CV Analysis</h3>
                                                        <Card>
                                                            <CardContent className="p-4 space-y-4">
                                                                <div>
                                                                    <h4 className="font-semibold">CV Audit</h4>
                                                                    <p className="text-sm text-muted-foreground">{cvResult.analysis.audit}</p>
                                                                </div>
                                                                <Separator />
                                                                <div>
                                                                    <h4 className="font-semibold">Citation Style Check</h4>
                                                                    <p className="text-sm text-muted-foreground">{cvResult.analysis.citationStyleCheck}</p>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <h3 className="font-semibold mb-2 text-lg">Full Rewritten Academic CV (Editable)</h3>
                                                    <Card className="flex-1 flex flex-col">
                                                        <CardContent className="p-4 flex-1">
                                                            <Textarea
                                                                className="h-full min-h-[400px] resize-none"
                                                                value={rewrittenCvContent}
                                                                onChange={(e) => setRewrittenCvContent(e.target.value)}
                                                            />
                                                        </CardContent>
                                                        <CardFooter className="flex-col items-start gap-4">
                                                            <div className="flex flex-wrap gap-2">
                                                                <Button variant="outline" size="sm" onClick={() => downloadMarkdown(rewrittenCvContent, 'rewritten_academic_cv.md')}>
                                                                    <Download className="mr-2"/>Download
                                                                </Button>
                                                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(rewrittenCvContent)}>
                                                                    <Clipboard className="mr-2"/>Copy Text
                                                                </Button>
                                                                <Button onClick={handleDesignCv} disabled={isDesigningCv}>
                                                                    {isDesigningCv ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                                                                    Approve & Design CV
                                                                </Button>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground pt-2">To save as PDF or Word, open the downloaded document or paste the copied text into an editor like Google Docs or MS Word.</p>
                                                        </CardFooter>
                                                    </Card>
                                                </div>
                                            </div>
                                        ) : !isImprovingCv && (<div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center"><BrainCircuit className="w-12 h-12 mb-4" /><p>Your CV analysis will appear here.</p></div>)}
                                    </CardContent>
                                </Card>
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
                                        {sopResult && (
                                            <CardFooter className="flex-wrap gap-2">
                                                <Button variant="outline" size="sm" onClick={() => downloadMarkdown(sopResult.sopDraft, 'statement_of_purpose.md')}>
                                                    <Download className="mr-2" /> Download SOP
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(sopResult.sopDraft)}>
                                                    <Clipboard className="mr-2" /> Copy Text
                                                </Button>
                                            </CardFooter>
                                        )}
                                    </Card>
                                </div>
                            </TabsContent>
                            <TabsContent value="designer" className="mt-4 flex-1">
                                <Card className="h-full">
                                    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>AI-Designed CV</CardTitle>
                                            <CardDescription>Your CV, professionally styled by AI. Use the print option to save as PDF.</CardDescription>
                                        </div>
                                        {designedCv && (
                                            <Button onClick={handlePrint} className="w-full md:w-auto">
                                                <Printer className="mr-2"/> Print / Save as PDF
                                            </Button>
                                        )}
                                    </CardHeader>
                                    <CardContent className="flex-1 relative">
                                        {isDesigningCv && <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center rounded-md"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="mt-2 text-muted-foreground">Designing your CV...</p></div>}
                                        {designedCv ? (
                                            <div id="cv-print-area-wrapper" className="bg-gray-200 dark:bg-gray-800 p-4 md:p-8 rounded-md overflow-y-auto">
                                                <div id="cv-print-area" className="bg-white rounded-md shadow-lg aspect-[210/297] w-full max-w-[8.5in] mx-auto p-4 md:p-8 text-black" dangerouslySetInnerHTML={{ __html: designedCv.cvHtml }} />
                                            </div>
                                        ) : !isDesigningCv && (
                                            <div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                                                <Sparkles className="w-12 h-12 mb-4" />
                                                <p>Your designed CV will appear here.</p>
                                                <p className="text-sm mt-2">Approve the rewritten CV in the "AI Rewrite" tab to get started.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </TabsContent>

                    <TabsContent value="chat" className="mt-4 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chatHistory.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4"><Bot className="w-12 h-12 mx-auto text-primary/80 mb-4" /><h3 className="font-semibold text-foreground text-lg">AI Admissions Advisor</h3><p className="mt-2 text-sm">Ask about universities, scholarships, or application strategies. Try voice mode for a hands-free chat.</p></div>) 
                            : chatHistory.map((msg, i) => (
                                <div key={msg.id} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                    {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Bot className="w-5 h-5"/></div>}
                                    <div className={cn("p-3 rounded-lg max-w-[80%]", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                                        {typeof msg.content === 'string' ? <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown> : msg.content}
                                        {msg.role === 'assistant' && typeof msg.content === 'string' && (
                                            <div className="text-right mt-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 bg-secondary-foreground/10 hover:bg-secondary-foreground/20"
                                                    onClick={() => { if (typeof msg.content === 'string') handlePlayAudio(msg.id, msg.content); }}
                                                    disabled={isChatting}
                                                >
                                                    {generatingAudioId === msg.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : speakingMessageId === msg.id ? (
                                                        <Pause className="h-4 w-4" />
                                                    ) : (
                                                        <Volume2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isChatting && <div className="flex justify-start"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                        </div>
                        <div className="p-4 border-t bg-background">
                            <form onSubmit={handleChatSubmit} className="relative">
                                <Textarea ref={chatInputRef} placeholder="Ask a question..." className="pr-20" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e as any); }}} disabled={isChatting}/>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <Button size="icon" variant="ghost" className={cn("h-8 w-8", isListening && "text-destructive")} onClick={handleMicClick} type="button" disabled={isChatting}>
                                        {speakingMessageId ? <Pause className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                    </Button>
                                    <Button size="icon" className="h-8 w-8" type="submit" disabled={isChatting || isListening}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </form>
                             <audio ref={audioRef} onEnded={() => setSpeakingMessageId(null)} className="hidden"/>
                        </div>
                    </TabsContent>

                    <TabsContent value="opportunities" className="mt-4 flex-1 flex flex-col">
                        <Card className="max-w-4xl mx-auto w-full">
                            <CardHeader>
                            <CardTitle>Opportunity Finder</CardTitle>
                            <CardDescription>Find universities and scholarships tailored to your profile and goals.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                            <Textarea
                                value={academicObjectives}
                                onChange={(e) => setAcademicObjectives(e.target.value)}
                                placeholder="e.g., I want to pursue a Master's in Computer Science in Germany, focusing on AI, and I'm looking for a full scholarship..."
                                rows={4}
                                className="bg-secondary/50"
                            />
                            <Button onClick={handleFindOpportunities} disabled={isFindingOpportunities}>
                                {isFindingOpportunities && <Loader2 className="mr-2 animate-spin" />}
                                <Search className="mr-2" /> Find Opportunities
                            </Button>
                            </CardContent>
                        </Card>
                        {isFindingOpportunities && <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>}
                        {opportunitiesResult && (
                            <div className="max-w-4xl mx-auto mt-8 w-full">
                                <AdmissionsAdviceCard result={opportunitiesResult} />
                            </div>
                        )}
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
            <CardContent className="space-y-6 text-sm">
                <div>
                    <h4 className="font-semibold text-base mb-2">Profile Strengths</h4>
                    <p className="text-muted-foreground">{result.profileStrengths}</p>
                </div>
                <Separator />
                <div>
                    <h4 className="font-semibold text-base mb-2">University & Program Shortlist</h4>
                    <ul className="space-y-3">
                        {result.universityShortlist.map((item, i) => (
                            <li key={i} className="p-3 border rounded-lg bg-secondary/50">
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{item.school} - {item.program}</a>
                                <p className="text-muted-foreground text-xs mt-1">{item.reason}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                <Separator />
                <div>
                    <h4 className="font-semibold text-base mb-2">Scholarship Radar</h4>
                    <ul className="space-y-3">
                        {result.scholarshipRadar.map((item, i) => (
                            <li key={i} className="p-3 border rounded-lg bg-secondary/50">
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{item.name}</a>
                                <p className="text-muted-foreground text-xs mt-1">{item.description}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                 <Separator />
                <div>
                    <h4 className="font-semibold text-base mb-2">Admissions Calendar</h4>
                    <p className="text-muted-foreground whitespace-pre-line">{result.admissionsCalendar}</p>
                </div>
            </CardContent>
        </Card>
    );
}

