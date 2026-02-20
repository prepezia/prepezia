
"use client";

import { useState, useRef, useEffect, Suspense, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Upload, ArrowRight, BrainCircuit, FileText, Briefcase, Search, MessageCircle, Download, Sparkles, Loader2, ArrowLeft, Bot, Send, File, Image as LucideImage, Clipboard, Printer, Mic, Volume2, Pause, HelpCircle, CheckCircle, XCircle, Trash2, Eye, Clock, Calendar } from "lucide-react";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { improveCv, ImproveCvOutput } from "@/ai/flows/improve-cv";
import { careerChat } from "@/ai/flows/career-chat";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { generateCvTemplate } from "@/ai/flows/generate-cv-template";
import { searchForJobs, SearchForJobsOutput } from "@/ai/flows/search-jobs-flow";
import { extractTextFromFile } from "@/ai/flows/extract-text-from-file";
import { designCv, DesignCvOutput } from "@/ai/flows/design-cv-flow";
import { generateAptitudeTest, GenerateAptitudeTestOutput } from "@/ai/flows/generate-aptitude-test";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

type View = "loading" | "onboarding" | "hub" | "aptitude";
type HubTab = "cv" | "chat" | "jobs";
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

type SavedAptitudeTest = {
    id: string;
    industry: string;
    score: number;
    total: number;
    date: string;
    questions: GenerateAptitudeTestOutput['questions'];
    answers: Record<number, string>;
};

const ACCEPTED_FILE_TYPES = {
  pdf: 'application/pdf',
  images: 'image/jpeg,image/jpg,image/png,image/webp',
  text: 'text/plain,text/markdown,.txt,.md'
};

const ALL_ACCEPTED_FILES = Object.values(ACCEPTED_FILE_TYPES).join(',');

const industries = ["Any", "Technology", "Finance", "Healthcare", "Education", "Marketing", "Engineering", "Sales", "Consulting"];

export default function CareerPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <HomeHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    }>
      <CareerPage />
    </Suspense>
  )
}

function CareerPage() {
  const [view, setView] = useState<View>("loading");
  const [cv, setCv] = useState<CvData>({ content: "" });
  const [careerGoals, setCareerGoals] = useState<string>("");
  const [onboarded, setOnboarded] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const isDone = localStorage.getItem('learnwithtemi_career_onboarded') === 'true';
    setOnboarded(isDone);
    
    const savedCv = localStorage.getItem('learnwithtemi_cv');
    const savedGoals = localStorage.getItem('learnwithtemi_goals') || "";
    if (savedCv) {
      try {
        const parsedCv = JSON.parse(savedCv);
        if (typeof parsedCv === 'object' && parsedCv !== null) {
          setCv(parsedCv);
        }
      } catch (e) {
        localStorage.removeItem('learnwithtemi_cv');
        setCv({ content: "" });
      }
    }
    setCareerGoals(savedGoals);

    if (searchParams.get('tab')) {
        setView("hub");
    } else {
        setView("onboarding");
    }
  }, [searchParams]);

  const handleOnboardingComplete = (cvData: CvData, goals: string) => {
    setCv(cvData);
    setCareerGoals(goals);
    setOnboarded(true);
    localStorage.setItem('learnwithtemi_career_onboarded', 'true');
    localStorage.setItem('learnwithtemi_cv', JSON.stringify(cvData));
    localStorage.setItem('learnwithtemi_goals', goals);
    localStorage.removeItem('learnwithtemi_onboarding_progress');
    setView("hub");
  }

  const handleBackToChoice = () => {
    setView("onboarding");
  };

  const handleOpenHubWithTab = (tab: HubTab) => {
      setView("hub");
      router.push(`/home/career?tab=${tab}`);
  };

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
    return (
      <OnboardingFlow 
        onCompleted={handleOnboardingComplete} 
        initialGoals={careerGoals} 
        onboarded={onboarded}
        onAptitudeClick={() => setView("aptitude")}
      />
    );
  }

  if (view === "aptitude") {
    return (
      <AptitudeTestView 
        cvContent={cv.content} 
        onBack={handleBackToChoice} 
        onOpenHub={handleOpenHubWithTab}
      />
    );
  }

  return (
    <HubView 
      initialCv={cv} 
      initialGoals={careerGoals} 
      onBack={handleBackToChoice} 
    />
  );
}

function OnboardingFlow({ onCompleted, initialGoals, onboarded, onAptitudeClick }: { onCompleted: (cv: CvData, goals: string) => void, initialGoals?: string, onboarded: boolean, onAptitudeClick: () => void }) {
  const searchParams = useSearchParams();
  const startAsForm = searchParams.get('start') === 'form';

  const [step, setStep] = useState<OnboardingStep>(startAsForm ? 'goals' : 'intro');
  const { toast } = useToast();
  const [goals, setGoals] = useState(initialGoals || "");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateInfo, setTemplateInfo] = useState({ fullName: "", email: "", phone: "", careerGoal: "" });

  useEffect(() => {
    const savedProgress = localStorage.getItem('learnwithtemi_onboarding_progress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        if (parsed.goals && !goals) setGoals(parsed.goals);
      } catch {}
    }
  }, [goals]);

  useEffect(() => {
    if (goals) {
      localStorage.setItem('learnwithtemi_onboarding_progress', JSON.stringify({ goals }));
    }
  }, [goals]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
        toast({ title: 'Extracting Text...' });
        let extractedText;
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            const dataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = (e) => reject(e);
                reader.readAsDataURL(file);
            });
            const result = await extractTextFromFile({ fileDataUri: dataUri, fileContentType: file.type });
            extractedText = result.extractedText;
        } else {
            extractedText = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });
        }
        onCompleted({ content: extractedText, fileName: file.name, contentType: file.type }, goals);
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Text Extraction Failed' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!templateInfo.fullName || !templateInfo.careerGoal) {
      toast({ variant: 'destructive', title: 'Missing Information' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await generateCvTemplate({
        ...templateInfo,
        email: templateInfo.email || "email@example.com",
        phone: templateInfo.phone || "0123456789",
      });
      onCompleted({ content: result.cvTemplate, fileName: 'generated_cv.md', contentType: 'text/markdown' }, templateInfo.careerGoal);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Generation Failed' });
    } finally {
      setIsLoading(false);
      setIsTemplateModalOpen(false);
    }
  }

  const handleContinueWithGoals = () => {
    if (!goals.trim()) {
      toast({ variant: 'destructive', title: 'Goals are required' });
      return;
    }
    onCompleted({ content: "" }, goals);
  }

  const handleNextToCvStep = () => {
    if (!goals.trim()) {
      toast({ variant: 'destructive', title: 'Goals are required' });
      return;
    }
    setStep('cv');
  };
  
  if (step === 'intro') {
    return (
      <div className="flex flex-col min-h-screen">
        <HomeHeader />
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-center items-center">
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col border-2 border-primary/10 hover:border-primary/30 transition-all shadow-sm">
              <CardHeader className="text-center flex-1">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto mb-6">
                  <Briefcase className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl font-headline font-bold">Career Strategist</CardTitle>
                <CardDescription className="text-base">
                  Get personalized CV feedback, find relevant jobs, and receive expert career advice powered by AI.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button className="w-full font-bold" size="lg" onClick={() => onboarded ? onCompleted({content: ""}, initialGoals || "") : setStep('goals')}>
                  {onboarded ? 'Open Hub' : 'Get Started'} <ArrowRight className="ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col border-2 border-orange-100 hover:border-orange-200 transition-all shadow-sm">
              <CardHeader className="text-center flex-1">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 text-orange-600 mx-auto mb-6">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl font-headline font-bold">Aptitude Assessment</CardTitle>
                <CardDescription className="text-base">
                  Test your skills with an industry-focused evaluation generated specifically for your target role.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className="w-full font-bold bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-md hover:shadow-lg border-none" 
                  size="lg" 
                  onClick={onAptitudeClick}
                >
                  Start Test <ArrowRight className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'goals') {
    return (
      <div className="flex flex-col min-h-screen">
        <HomeHeader />
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-center">
          <Card className="max-w-2xl mx-auto w-full">
            <CardHeader>
              <CardTitle>Career Hub Onboarding</CardTitle>
              <CardDescription>Step 1 of 2: Tell us about your career aspirations.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g., I'm a final year computer science student looking for a junior software engineering role in fintech..."
                value={goals}
                onChange={e => setGoals(e.target.value)}
                rows={8}
              />
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('intro')}><ArrowLeft className="mr-2" /> Back</Button>
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
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-center">
          <Card className="max-w-2xl mx-auto w-full relative">
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-lg z-10">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Extracting text...</p>
              </div>
            )}
            <CardHeader>
              <CardTitle>Career Hub Onboarding</CardTitle>
              <CardDescription>Step 2 of 2: Provide your CV to get personalized advice.</CardDescription>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="flex items-center gap-1"><File className="h-3 w-3" /> PDF</Badge>
                <Badge variant="outline" className="flex items-center gap-1"><LucideImage className="h-3 w-3" /> JPG/PNG</Badge>
                <Badge variant="outline" className="flex items-center gap-1"><FileText className="h-3 w-3" /> TXT</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                <Upload className="w-6 h-6" /> Upload CV
                <span className="text-xs text-muted-foreground">PDF, Images, or TXT</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setIsTemplateModalOpen(true)} disabled={isLoading}>
                <Sparkles className="w-6 h-6" /> Help me write one
                <span className="text-xs text-muted-foreground">Generate a template</span>
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={ALL_ACCEPTED_FILES} />
            </CardContent>
            <CardFooter className="flex-col items-stretch space-y-4">
              <Button className="w-full" onClick={handleContinueWithGoals} disabled={isLoading}>Finish Onboarding (No CV)</Button>
              <Button variant="outline" className="w-full" onClick={() => setStep('goals')} disabled={isLoading}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
            </CardFooter>
          </Card>
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
                  {isLoading && <Loader2 className="mr-2 animate-spin" />} Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }
  return null;
}

function HubView({ initialCv, initialGoals, onBack }: { initialCv: CvData, initialGoals: string, onBack: () => void }) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as HubTab) || "cv";
  
  const [activeTab, setActiveTab] = useState<HubTab>(initialTab);
  const [activeCvTab, setActiveCvTab] = useState<'editor' | 'analysis' | 'designer'>('editor');
  const [cv, setCv] = useState<CvData>(initialCv);
  const [careerGoals, setCareerGoals] = useState(initialGoals);
  
  const [cvResult, setCvResult] = useState<ImproveCvOutput | null>(null);
  const [rewrittenCvContent, setRewrittenCvContent] = useState("");
  const [isImprovingCv, setIsImprovingCv] = useState(false);
  const [isCvDirty, setIsCvDirty] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [designedCv, setDesignedCv] = useState<DesignCvOutput | null>(null);
  const [isDesigningCv, setIsDesigningCv] = useState(false);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const [jobResults, setJobResults] = useState<SearchForJobsOutput | null>(null);
  const [isSearchingJobs, setIsSearchingJobs] = useState(false);
  const [jobSearchFilters, setJobSearchFilters] = useState({ role: "", jobType: "", industry: "", experienceLevel: "", location: "Ghana" });

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemo(() => (user && firestore) ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
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
        toast({ variant: 'destructive', title: 'Audio Error' });
    } finally {
        setGeneratingAudioId(null);
    }
  }, [generatingAudioId, speakingMessageId, toast]);

  const submitChat = useCallback(async (currentInput: string, isVoiceInput: boolean) => {
    if (!currentInput?.trim()) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: currentInput };
    setChatHistory(prev => [...prev, userMessage]);
    setIsChatting(true);
    try {
      const result = await careerChat({ cvContent: cv.content, careerObjectives: careerGoals, question: currentInput, educationalLevel: firestoreUser?.educationalLevel });
      const assistantMessage: ChatMessage = { id: `asst-${Date.now()}`, role: 'assistant', content: result.answer };
      setChatHistory(prev => [...prev, assistantMessage]);
      if (isVoiceInput) await handlePlayAudio(assistantMessage.id, result.answer);
    } catch(e: any) {
      setChatHistory(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: "Sorry, I couldn't process that request." }]);
    } finally {
      setIsChatting(false);
    }
  }, [cv.content, careerGoals, toast, handlePlayAudio, firestoreUser]);

  useEffect(() => {
    const contextJSON = sessionStorage.getItem('learnwithtemi_chat_context');
    if (contextJSON && activeTab === 'chat' && chatHistory.length === 0) {
        sessionStorage.removeItem('learnwithtemi_chat_context');
        try {
            const context = JSON.parse(contextJSON);
            if (context.type === 'aptitude_test') {
                const welcomeMsg: ChatMessage = {
                    id: 'welcome-aptitude',
                    role: 'assistant',
                    content: `Hello! I see you just finished the **${context.industry}** aptitude test. You scored **${context.score} out of ${context.total}**. 

Would you like to discuss your results, review any difficult concepts, or explore how we can improve your score for next time?`
                };
                setChatHistory([welcomeMsg]);
            }
        } catch (e) {}
    }
  }, [activeTab, chatHistory]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.onresult = (event: any) => submitChat(event.results[0][0].transcript, true);
      recognition.onerror = (event: any) => console.error('Speech recognition error:', event.error);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [submitChat]);

  const handleMicClick = () => {
    if (speakingMessageId && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setSpeakingMessageId(null);
        return;
    }
    if (!recognitionRef.current) return;
    if (isListening) recognitionRef.current.stop();
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setActiveCvTab('editor');
    setIsExtracting(true);
    setCvResult(null);
    try {
        toast({ title: 'Extracting Text...' });
        let extractedText;
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            const dataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = (e) => reject(e);
                reader.readAsDataURL(file);
            });
            const result = await extractTextFromFile({ fileDataUri: dataUri, fileContentType: file.type });
            extractedText = result.extractedText;
        } else {
            extractedText = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });
        }
        setCv({ content: extractedText, fileName: file.name, contentType: file.type });
        setIsCvDirty(true);
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Extraction Failed' });
    } finally {
        setIsExtracting(false);
    }
  };

  const handleImproveCv = async () => {
    if (!cv.content) return;
    setIsImprovingCv(true);
    setCvResult(null);
    try {
      const result = await improveCv({ cvContent: cv.content, careerGoals, educationalLevel: firestoreUser?.educationalLevel });
      setCvResult(result);
      setRewrittenCvContent(result.fullRewrittenCv);
      setIsCvDirty(false);
      localStorage.setItem('learnwithtemi_cv', JSON.stringify(cv));
      setActiveCvTab('analysis');
    } catch(e: any) {
      toast({ variant: 'destructive', title: 'Analysis Failed' });
    } finally {
      setIsImprovingCv(false);
    }
  };
  
  const handleDesignCv = async () => {
    if (!rewrittenCvContent) return;
    setIsDesigningCv(true);
    setDesignedCv(null);
    try {
        const result = await designCv({ cvMarkdown: rewrittenCvContent });
        setDesignedCv(result);
        setActiveCvTab('designer');
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Design Failed' });
    } finally {
        setIsDesigningCv(false);
    }
  };

  const handlePrint = () => {
      const printContent = document.getElementById('cv-print-area')?.innerHTML;
      if (!printContent) return;
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      const styles = Array.from(document.getElementsByTagName('link')).filter(link => link.rel === 'stylesheet').map(link => link.outerHTML).join('');
      const styleBlocks = Array.from(document.getElementsByTagName('style')).map(style => style.outerHTML).join('');
      printWindow.document.write(`<html><head><title>Print CV</title>${styles}${styleBlocks}<style>@page { size: A4; margin: 20mm; } body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } p, li { orphans: 3; widows: 3; } h1, h2, h3, h4, h5, h6 { break-after: avoid; }</style></head><body>${printContent}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 1000);
  };

  const handleJobSearch = async () => {
    if (!cv.content && !careerGoals.trim()) return;
    setIsSearchingJobs(true);
    setJobResults(null);
    try {
      const results = await searchForJobs({ cvContent: cv.content, careerGoals, ...jobSearchFilters });
      setJobResults(results);
    } catch(e: any) {
      toast({ variant: 'destructive', title: 'Search Failed' });
    } finally {
      setIsSearchingJobs(false);
    }
  };

  const downloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => toast({ title: "Copied!" }));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <HomeHeader left={<Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Career Home</Button>} />
      <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HubTab)} className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-secondary">
            <TabsTrigger value="cv"><FileText className="mr-2"/>CV Improver</TabsTrigger>
            <TabsTrigger value="chat"><MessageCircle className="mr-2"/>Advice Chat</TabsTrigger>
            <TabsTrigger value="jobs"><Briefcase className="mr-2"/>Job Search</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cv" className="mt-4 flex-1 flex flex-col pb-24">
            <Tabs value={activeCvTab} onValueChange={(v) => setActiveCvTab(v as any)} className="w-full flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="editor">Your CV</TabsTrigger>
                <TabsTrigger value="analysis">AI Rewrite</TabsTrigger>
                <TabsTrigger value="designer" disabled={!cvResult}>AI Designer</TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="mt-4 flex-1 pb-8">
                <Card className="flex flex-col h-full">
                  <CardHeader><CardTitle>Your CV</CardTitle><CardDescription>{cv.content ? 'CV text extracted. You can edit it below.' : 'Upload your CV to get started.'}</CardDescription></CardHeader>
                  <CardContent className="flex-1 relative">
                    {isExtracting && <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-md z-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
                    <Textarea className="h-full min-h-[400px] resize-none" value={cv.content || ''} onChange={e => { setCv(prev => ({...prev, content: e.target.value})); setIsCvDirty(true); }} readOnly={isExtracting} />
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={ALL_ACCEPTED_FILES} />
                    {!cv.content && !isExtracting && (<div className="absolute inset-0 h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center bg-background"><Upload className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground mb-4">Upload your CV to get started</p><Button onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Upload CV</Button></div>)}
                  </CardContent>
                  <CardFooter className="justify-between pt-6">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isExtracting}><Upload className="mr-2 h-4 w-4" /> Upload New</Button>
                    <Button onClick={handleImproveCv} disabled={isImprovingCv || isExtracting || !cv.content}>{isImprovingCv ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}{isImprovingCv ? 'Analyzing...' : 'Improve CV'}</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              <TabsContent value="analysis" className="mt-4 flex-1">
                <Card className="flex flex-col h-full">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>AI Rewrite</CardTitle></CardHeader>
                  <CardContent className="flex-1 relative">
                    {isImprovingCv && <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
                    {cvResult ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                          <div className="flex flex-col gap-6">
                              <Card><CardContent className="p-4 space-y-4">
                                  <div><h4 className="font-semibold">Critique</h4><p className="text-sm text-muted-foreground">{cvResult.analysis.critique}</p></div>
                                  <Separator />
                                  <div><h4 className="font-semibold">Skill Gaps</h4><ul className="list-disc pl-5 text-sm text-muted-foreground">{cvResult.analysis.skillGapAnalysis.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                              </CardContent></Card>
                          </div>
                          <Card className="flex-1 flex flex-col">
                              <CardContent className="p-4 flex-1"><Textarea className="h-full min-h-[400px] resize-none" value={rewrittenCvContent} onChange={(e) => setRewrittenCvContent(e.target.value)} /></CardContent>
                              <CardFooter className="flex-col items-start gap-4">
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" size="sm" onClick={() => downloadMarkdown(rewrittenCvContent, 'rewritten_cv.md')}><Download className="mr-2"/>Download</Button>
                                    <Button onClick={handleDesignCv} disabled={isDesigningCv}>{isDesigningCv ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}Design CV</Button>
                                </div>
                              </CardFooter>
                          </Card>
                      </div>
                    ) : (<div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center"><BrainCircuit className="w-12 h-12 mb-4" /><p>Your CV analysis will appear here.</p></div>)}
                  </CardContent>
                </Card>
              </TabsContent>
               <TabsContent value="designer" className="mt-4 flex-1 pb-24">
                <Card className="h-full flex flex-col">
                    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div><CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>AI-Designed CV</CardTitle></div>
                        {designedCv && <Button onClick={handlePrint} className="w-full md:w-auto"><Printer className="mr-2"/> Print / Save as PDF</Button>}
                    </CardHeader>
                    <CardContent className="flex-1 relative w-full max-w-0 min-w-full">
                        {isDesigningCv && <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center rounded-md z-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
                        {designedCv ? (<div className="bg-gray-200 dark:bg-gray-800 p-4 md:p-8 rounded-md overflow-x-auto"><div id="cv-print-area" className="bg-white rounded-md shadow-lg aspect-[210/297] w-full max-w-[8.5in] min-w-[600px] md:min-w-0 mx-auto p-4 md:p-8 text-black" dangerouslySetInnerHTML={{ __html: designedCv.cvHtml }} /></div>) : !isDesigningCv && (<div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center"><Sparkles className="w-12 h-12 mb-4" /><p>Your designed CV will appear here.</p></div>)}
                    </CardContent>
                </Card>
            </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="chat" className="mt-4 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4"><Bot className="w-12 h-12 mx-auto text-primary/80 mb-4" /><h3 className="font-semibold text-foreground text-lg">AI Career Advisor</h3></div>) 
              : chatHistory.map((msg) => (
                <div key={msg.id} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Bot className="w-5 h-5"/></div>}
                  <div className={cn("p-3 rounded-lg max-w-[80%]", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                    {typeof msg.content === 'string' ? <ReactMarkdown className="prose prose-sm dark:prose-invert max-none" remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown> : msg.content}
                    {msg.role === 'assistant' && typeof msg.content === 'string' && (<div className="text-right mt-2"><Button variant="ghost" size="icon" className="h-7 w-7 bg-secondary-foreground/10" onClick={() => handlePlayAudio(msg.id, msg.content as string)} disabled={isChatting}>{generatingAudioId === msg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : speakingMessageId === msg.id ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button></div>)}
                  </div>
                </div>
              ))}
              {isChatting && <div className="flex justify-start"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
            </div>
            <div className="p-4 border-t bg-background">
              <form onSubmit={(e) => { e.preventDefault(); submitChat(chatInputRef.current?.value || "", false); if(chatInputRef.current) chatInputRef.current.value=""; }} className="relative">
                <Textarea ref={chatInputRef} placeholder="Ask a question..." className="pr-20" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitChat(chatInputRef.current?.value || "", false); if(chatInputRef.current) chatInputRef.current.value=""; }}} disabled={isChatting}/>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1"><Button size="icon" variant="ghost" className={cn("h-8 w-8", isListening && "text-destructive")} onClick={handleMicClick} type="button" disabled={isChatting}>{speakingMessageId ? <Pause className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button><Button size="icon" className="h-8 w-8" type="submit" disabled={isChatting || isListening}><Send className="h-4 w-4" /></Button></div>
              </form>
              <audio ref={audioRef} onEnded={() => setSpeakingMessageId(null)} className="hidden"/>
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="mt-4 flex-1 flex flex-col">
              <Card className="max-w-4xl mx-auto w-full"><CardHeader><CardTitle>Job Search</CardTitle></CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><Label htmlFor="role">Role</Label><Input id="role" value={jobSearchFilters.role} onChange={e => setJobSearchFilters(p => ({...p, role: e.target.value}))} /></div>
                    <div><Label>Industry</Label><Select value={jobSearchFilters.industry || "Any"} onValueChange={v => setJobSearchFilters(p => ({...p, industry: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                    <div className="md:col-span-2"><Label>Location</Label><Input value={jobSearchFilters.location} onChange={e => setJobSearchFilters(p => ({...p, location: e.target.value}))} /></div>
                  </div>
                  <Button onClick={handleJobSearch} disabled={isSearchingJobs} size="lg" className="w-full md:w-auto"><Search className="mr-2" /> Search</Button>
                </CardContent>
              </Card>
            <div className="flex-1 overflow-y-auto mt-4">
                {isSearchingJobs && <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>}
                {jobResults && (<div className="max-w-4xl mx-auto w-full space-y-4 pb-4">{jobResults.results.map((job, i) => (<Card key={i}><CardHeader><CardTitle>{job.title}</CardTitle><CardDescription>{job.company} - {job.location}</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground mb-4">{job.snippet}</p><Button asChild><a href={job.url} target="_blank" rel="noopener noreferrer">Apply <ArrowRight className="ml-2"/></a></Button></CardContent></Card>))}</div>)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function AptitudeTestView({ cvContent, onBack, onOpenHub }: { cvContent?: string, onBack: () => void, onOpenHub: (tab: HubTab) => void }) {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const userDocRef = useMemo(() => (user && firestore) ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: firestoreUser } = useDoc(userDocRef);

    const [isGenerating, setIsGenerating] = useState(false);
    const [test, setTest] = useState<GenerateAptitudeTestOutput | null>(null);
    const [industry, setIndustry] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [viewState, setViewState] = useState<'intro' | 'taking' | 'results' | 'review'>('intro');
    const [score, setScore] = useState(0);
    
    const [savedTests, setSavedTests] = useState<SavedAptitudeTest[]>([]);
    const [selectedSavedTest, setSelectedSavedTest] = useState<SavedAptitudeTest | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('learnwithtemi_saved_aptitude');
        if (saved) {
            try { setSavedTests(JSON.parse(saved)); } catch (e) {}
        }
    }, []);

    const saveTestsToStorage = (tests: SavedAptitudeTest[]) => {
        try { localStorage.setItem('learnwithtemi_saved_aptitude', JSON.stringify(tests)); } catch (e) {}
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const result = await generateAptitudeTest({ industry: industry || "General Professional", cvContent, educationalLevel: firestoreUser?.educationalLevel });
            setTest(result);
            setAnswers({});
            setCurrentIndex(0);
            setViewState('taking');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Generation Failed' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRetake = () => {
        if (!test) return;
        const shuffledQuestions = [...test.questions].sort(() => Math.random() - 0.5);
        setTest({ ...test, questions: shuffledQuestions });
        setAnswers({});
        setCurrentIndex(0);
        setViewState('taking');
    };

    const handleSubmit = () => {
        let s = 0;
        test?.questions.forEach((q, i) => { if (answers[i] === q.correctAnswer) s++; });
        setScore(s);
        setViewState('results');
    };

    const handleSave = () => {
        if (!test) return;
        const newSaved: SavedAptitudeTest = {
            id: `apt-${Date.now()}`,
            industry: industry || "General Professional",
            score,
            total: test.questions.length,
            date: new Date().toLocaleDateString(),
            questions: test.questions,
            answers: answers
        };
        const updated = [newSaved, ...savedTests];
        setSavedTests(updated);
        saveTestsToStorage(updated);
        toast({ title: "Assessment Saved!" });
    };

    const handleDeleteSaved = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updated = savedTests.filter(t => t.id !== id);
        setSavedTests(updated);
        saveTestsToStorage(updated);
        toast({ title: "Assessment Removed" });
    };

    const handleViewSaved = (st: SavedAptitudeTest) => {
        setSelectedSavedTest(st);
        setViewState('review');
    };

    const handleDiscussWithAI = (currentScore: number, currentTotal: number, currentIndustry: string) => {
        sessionStorage.setItem('learnwithtemi_chat_context', JSON.stringify({
            type: 'aptitude_test',
            score: currentScore,
            total: currentTotal,
            industry: currentIndustry
        }));
        onOpenHub('chat');
    };

    return (
        <div className="flex flex-col flex-1 h-full">
            <HomeHeader left={<Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Career Home</Button>} />
            <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col py-4">
                <Card className="max-w-4xl mx-auto w-full flex-1 flex flex-col border-2 border-orange-100 overflow-hidden">
                    <CardHeader className="border-b bg-orange-50/30">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2"><HelpCircle className="text-orange-600"/>AI Aptitude Assessment</CardTitle>
                                <CardDescription>Test your skills with industry-focused evaluations.</CardDescription>
                            </div>
                            {viewState !== 'intro' && (
                                <Button variant="ghost" size="sm" onClick={() => setViewState('intro')}>
                                    <XCircle className="mr-2 h-4 w-4"/> Exit
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-6">
                        {viewState === 'intro' && (
                            <div className="space-y-10 max-w-2xl mx-auto py-6">
                                <Card className="border-2 border-dashed">
                                    <CardContent className="pt-6 space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-base font-bold">Focus Industry / Role</Label>
                                            <Input placeholder="e.g., Software Engineering, Banking" value={industry} onChange={e => setIndustry(e.target.value)} className="h-12" />
                                            <p className="text-xs text-muted-foreground">The test will be tailored to this field and your background.</p>
                                        </div>
                                        <Button className="w-full py-8 text-lg font-bold bg-orange-600 text-white hover:bg-orange-700 transition-all shadow-md hover:shadow-lg border-none" onClick={handleGenerate} disabled={isGenerating}>
                                            {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <Sparkles className="mr-2"/>}
                                            {isGenerating ? 'Generating Test...' : 'Start Assessment'}
                                        </Button>
                                    </CardContent>
                                </Card>

                                {savedTests.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-lg font-bold">
                                            <Clock className="h-5 w-5 text-muted-foreground" />
                                            Your Recent Assessments
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {savedTests.map(st => (
                                                <div 
                                                    key={st.id} 
                                                    className="flex items-center justify-between p-4 rounded-xl border-2 hover:border-orange-200 hover:bg-orange-50/20 cursor-pointer transition-all group"
                                                    onClick={() => handleViewSaved(st)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                                            <CheckCircle className="h-5 w-5" />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <div className="font-bold">{st.industry}</div>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Calendar className="h-3 w-3" /> {st.date}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <div className="text-lg font-bold">{st.score} <span className="text-xs text-muted-foreground">/ {st.total}</span></div>
                                                            <div className="text-[10px] uppercase font-bold text-orange-600 tracking-wider">Score</div>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => handleDeleteSaved(e, st.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {viewState === 'taking' && test && (
                            <div className="space-y-6 max-w-2xl mx-auto">
                                <div className="flex justify-between items-center text-sm mb-4">
                                    <span className="font-bold">Question {currentIndex + 1} of {test.questions.length}</span>
                                    <span className="text-muted-foreground font-mono">{Math.round(((currentIndex + 1) / test.questions.length) * 100)}%</span>
                                </div>
                                <Progress value={((currentIndex + 1) / test.questions.length) * 100} className="h-2 mb-8" />
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-bold leading-tight tracking-tight">{test.questions[currentIndex].questionText}</h3>
                                    <RadioGroup value={answers[currentIndex] || ""} onValueChange={val => setAnswers(p => ({...p, [currentIndex]: val}))}>
                                        {test.questions[currentIndex].options.map((opt, i) => (
                                            <div key={i} className={cn("flex items-center space-x-3 p-5 rounded-xl border-2 transition-all cursor-pointer", answers[currentIndex] === opt ? "border-orange-500 bg-orange-50 shadow-sm" : "hover:bg-secondary/50")} onClick={() => setAnswers(p => ({...p, [currentIndex]: opt}))}>
                                                <RadioGroupItem value={opt} id={`opt-${i}`} /><Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer text-base font-medium">{opt}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                                <div className="flex justify-between pt-8 border-t mt-10">
                                    <Button variant="outline" onClick={() => setCurrentIndex(p => p - 1)} disabled={currentIndex === 0}>Previous</Button>
                                    {currentIndex < test.questions.length - 1 ? (
                                        <Button className="bg-orange-600 hover:bg-orange-700 text-white min-w-[100px]" onClick={() => setCurrentIndex(p => p + 1)} disabled={!answers[currentIndex]}>Next</Button>
                                    ) : (
                                        <Button onClick={handleSubmit} disabled={!answers[currentIndex]} className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]">Submit Test</Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {viewState === 'results' && (
                            <div className="text-center space-y-8 max-w-lg mx-auto py-10">
                                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-50 text-green-600 mb-2 shadow-inner border border-green-100"><CheckCircle className="w-12 h-12"/></div>
                                <div className="space-y-2">
                                    <h2 className="text-4xl font-headline font-bold">Assessment Complete!</h2>
                                    <p className="text-xl text-muted-foreground">You scored <span className="text-foreground font-black">{score}</span> out of <span className="font-bold">{test?.questions.length}</span></p>
                                </div>
                                <Progress value={(score / (test?.questions.length || 1)) * 100} className="h-4 max-w-md mx-auto" />
                                
                                <div className="pt-8 flex flex-col gap-3">
                                    <Button onClick={() => handleDiscussWithAI(score, test?.questions.length || 0, industry || "General Professional")} className="bg-orange-600 hover:bg-orange-700 text-white h-12 font-bold text-base shadow-md">
                                        <MessageCircle className="mr-2 h-5 w-5" /> Discuss Results with AI Advisor
                                    </Button>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button variant="outline" onClick={handleSave} className="h-12 border-2"><Save className="mr-2 h-4 w-4"/> Save Assessment</Button>
                                        <Button variant="outline" onClick={handleRetake} className="h-12 border-2">Retake Test</Button>
                                    </div>
                                    <Button variant="link" onClick={() => setViewState('intro')} className="text-muted-foreground">Back to History</Button>
                                </div>
                            </div>
                        )}

                        {viewState === 'review' && selectedSavedTest && (
                            <div className="space-y-8 pb-10">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-secondary/30 p-6 rounded-2xl border">
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedSavedTest.industry} Assessment</h2>
                                        <p className="text-sm text-muted-foreground mt-1">Completed on {selectedSavedTest.date}</p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <div className="text-3xl font-black text-orange-600">{selectedSavedTest.score} <span className="text-base text-muted-foreground">/ {selectedSavedTest.total}</span></div>
                                            <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Total Score</div>
                                        </div>
                                        <Button onClick={() => handleDiscussWithAI(selectedSavedTest.score, selectedSavedTest.total, selectedSavedTest.industry)} size="sm">
                                            <MessageCircle className="mr-2 h-4 w-4"/> Discuss
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold flex items-center gap-2"><Eye className="h-5 w-5 text-muted-foreground" /> Correction Review</h3>
                                    {selectedSavedTest.questions.map((q, i) => (
                                        <div key={i} className={cn("p-5 border-2 rounded-2xl transition-all", selectedSavedTest.answers[i] === q.correctAnswer ? "border-green-100 bg-green-50/20" : "border-red-100 bg-red-50/20")}>
                                            <div className="flex items-start gap-3">
                                                <span className="font-black text-muted-foreground/50 text-lg">Q{i+1}.</span>
                                                <p className="font-bold text-lg leading-tight flex-1">{q.questionText}</p>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Your Answer</span>
                                                    <div className={cn("text-sm font-bold flex items-center gap-2", selectedSavedTest.answers[i] === q.correctAnswer ? "text-green-600" : "text-destructive")}>
                                                        {selectedSavedTest.answers[i] === q.correctAnswer ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                        {selectedSavedTest.answers[i] || "Skipped"}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Correct Answer</span>
                                                    <div className="text-sm font-bold text-green-600 flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4" />
                                                        {q.correctAnswer}
                                                    </div>
                                                </div>
                                            </div>
                                            <Separator className="my-4 opacity-50" />
                                            <div className="bg-background rounded-xl p-4 border border-dashed text-sm">
                                                <div className="flex items-center gap-2 font-bold mb-2"><Lightbulb className="h-4 w-4 text-yellow-500" /> Explanation</div>
                                                <p className="text-muted-foreground italic leading-relaxed">{q.explanation}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
