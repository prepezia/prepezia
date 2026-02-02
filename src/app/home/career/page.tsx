
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
import { Upload, ArrowRight, BrainCircuit, FileText, Briefcase, Search, MessageCircle, Download, Sparkles, Loader2, ArrowLeft, Bot, Send, File, Image as LucideImage, Clipboard, Printer, Mic } from "lucide-react";
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
import { getCareerAdvice, CareerAdviceOutput } from "@/ai/flows/career-advisor";
import { generateCvTemplate } from "@/ai/flows/generate-cv-template";
import { searchForJobs, SearchForJobsOutput } from "@/ai/flows/search-jobs-flow";
import { extractTextFromFile } from "@/ai/flows/extract-text-from-file";
import { designCv, DesignCvOutput } from "@/ai/flows/design-cv-flow";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type View = "loading" | "onboarding" | "hub";
type HubTab = "cv" | "chat" | "jobs";
type OnboardingStep = "intro" | "goals" | "cv";

type ChatMessage = {
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

const jobTypes = ["Any", "Full-time", "Part-time", "Internship", "Contract", "Remote"];
const industries = ["Any", "Technology", "Finance", "Healthcare", "Education", "Marketing", "Engineering", "Sales", "Consulting"];
const experienceLevels = ["Any", "Entry-level", "Mid-level", "Senior-level", "Executive"];


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

  useEffect(() => {
    const onboarded = localStorage.getItem('learnwithtemi_career_onboarded') === 'true';
    if (onboarded) {
      const savedCv = localStorage.getItem('learnwithtemi_cv');
      const savedGoals = localStorage.getItem('learnwithtemi_goals') || "";
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
            localStorage.removeItem('learnwithtemi_cv');
            setCv({ content: "" });
        }
      }
      setCareerGoals(savedGoals);
      setView("hub");
    } else {
      setView("onboarding");
    }
  }, []);

  const handleOnboardingComplete = (cv: CvData, goals: string) => {
    setCv(cv);
    setCareerGoals(goals);
    localStorage.setItem('learnwithtemi_career_onboarded', 'true');
    localStorage.setItem('learnwithtemi_cv', JSON.stringify(cv));
    localStorage.setItem('learnwithtemi_goals', goals);
    localStorage.removeItem('learnwithtemi_onboarding_progress');
    setView("hub");
  }

  const handleStartOver = (startFrom: 'cv' | 'intro' = 'intro') => {
    localStorage.removeItem('learnwithtemi_career_onboarded');
    localStorage.removeItem('learnwithtemi_cv');
    localStorage.removeItem('learnwithtemi_goals');
    setCv({ content: "" });
    setCareerGoals("");
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
    return <OnboardingFlow onCompleted={handleOnboardingComplete} initialGoals={careerGoals} />
  }

  return <HubView initialCv={cv} initialGoals={careerGoals} backToOnboarding={handleStartOver} />;
}

function OnboardingFlow({ onCompleted, initialGoals }: { onCompleted: (cv: CvData, goals: string) => void, initialGoals?: string }) {
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
        setGoals(JSON.parse(savedProgress).goals);
      } catch {
        // ignore corrupted data
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('learnwithtemi_onboarding_progress', JSON.stringify({ goals }));
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
      onCompleted({ 
        content: result.cvTemplate, 
        fileName: 'generated_cv.md',
        contentType: 'text/markdown',
      }, templateInfo.careerGoal);
    } catch (e: any) {
      console.error("Template generation error", e);
      toast({ variant: 'destructive', title: 'Generation Failed', description: e.message || 'Could not generate a CV template.' });
    } finally {
      setIsLoading(false);
      setIsTemplateModalOpen(false);
    }
  }

  const handleContinueWithGoals = () => {
    if (!goals.trim()) {
      toast({ variant: 'destructive', title: 'Goals are required', description: "Please go back and tell us about your aspirations."});
      return;
    }
    onCompleted({ content: "" }, goals);
  }

  const handleNextToCvStep = () => {
    if (!goals.trim()) {
      toast({ variant: 'destructive', title: 'Goals are required', description: "Please tell us about your aspirations."});
      return;
    }
    setStep('cv');
  };
  
  if (step === 'intro') {
    return (
      <div className="flex flex-col min-h-screen">
        <HomeHeader />
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-center items-center">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto mb-6">
                <Briefcase className="w-8 h-8" />
              </div>
              <CardTitle className="text-3xl font-headline font-bold">Unlock Your Career Potential</CardTitle>
              <CardDescription>Get personalized CV feedback, find relevant jobs, and receive expert career advice all powered by AI.</CardDescription>
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
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-center">
          <Card className="max-w-2xl mx-auto w-full relative">
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-lg z-10">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Extracting text from your document...</p>
              </div>
            )}
            <CardHeader>
              <CardTitle>Career Hub Onboarding</CardTitle>
              <CardDescription>Step 2 of 2: Provide your CV to get personalized advice.</CardDescription>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <File className="h-3 w-3" /> PDF
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <LucideImage className="h-3 w-3" /> JPG/PNG
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Word
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> TXT
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                <Upload className="w-6 h-6" /> Upload CV
                <span className="text-xs text-muted-foreground">PDF, Images, Word, TXT</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setIsTemplateModalOpen(true)} disabled={isLoading}>
                <Sparkles className="w-6 h-6" /> Help me write one
                <span className="text-xs text-muted-foreground">Generate a template</span>
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept={ALL_ACCEPTED_FILES}
              />
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
      </div>
    )
  }

  return null;
}

function HubView({ initialCv, initialGoals, backToOnboarding }: { initialCv: CvData, initialGoals: string, backToOnboarding: (startFrom?: 'cv' | 'intro') => void }) {
  const [activeTab, setActiveTab] = useState<HubTab>("cv");
  const [activeCvTab, setActiveCvTab] = useState<'editor' | 'analysis' | 'designer'>('editor');
  const [cv, setCv] = useState<CvData>(initialCv);
  const [careerGoals, setCareerGoals] = useState(initialGoals);
  
  // CV Tab State
  const [cvResult, setCvResult] = useState<ImproveCvOutput | null>(null);
  const [rewrittenCvContent, setRewrittenCvContent] = useState("");
  const [isImprovingCv, setIsImprovingCv] = useState(false);
  const [isCvDirty, setIsCvDirty] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  
  // Designer Tab State
  const [designedCv, setDesignedCv] = useState<DesignCvOutput | null>(null);
  const [isDesigningCv, setIsDesigningCv] = useState(false);

  // Chat Tab State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Jobs Tab State
  const [jobResults, setJobResults] = useState<SearchForJobsOutput | null>(null);
  const [isSearchingJobs, setIsSearchingJobs] = useState(false);
  const [jobSearchAccordion, setJobSearchAccordion] = useState<string[]>(['filters']);
  const [jobSearchFilters, setJobSearchFilters] = useState({
    role: "",
    jobType: "",
    industry: "",
    experienceLevel: "",
    location: "Ghana",
  });


  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (chatInputRef.current) {
          chatInputRef.current.value = transcript;
          const form = chatInputRef.current.closest('form');
          if (form) {
            // Create and dispatch a submit event
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
          }
        }
      };
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast({ variant: 'destructive', title: 'Speech Error', description: `Could not recognize speech: ${event.error}` });
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }
  }, [toast]);

  const handleMicClick = () => {
    if (isAISpeaking && audioRef.current) {
        audioRef.current.pause();
        setIsAISpeaking(false);
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
    setCvResult(null); // Clear old analysis
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
      toast({ variant: 'destructive', title: 'CV is empty', description: 'Please provide your CV content.'});
      return;
    }
    setIsImprovingCv(true);
    setCvResult(null);
    try {
      const result = await improveCv({ 
        cvContent: cv.content, 
        careerGoals,
      });
      setCvResult(result);
      setRewrittenCvContent(result.fullRewrittenCv);
      setIsCvDirty(false);
      localStorage.setItem('learnwithtemi_cv', JSON.stringify(cv)); // Save extracted CV
      setActiveCvTab('analysis');
    } catch(e: any) {
      console.error("CV improvement error", e);
      toast({ 
        variant: 'destructive', 
        title: 'Analysis Failed', 
        description: e.message || 'Could not improve your CV at this time.' 
      });
    } finally {
      setIsImprovingCv(false);
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

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentInput = chatInputRef.current?.value;
    if (!currentInput?.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: currentInput };
    setChatHistory(prev => [...prev, userMessage]);
    setIsChatting(true);
    if(chatInputRef.current) chatInputRef.current.value = "";

    try {
      const result = await careerChat({ 
        cvContent: cv.content,
        careerObjectives: careerGoals,
        question: currentInput,
      });
      const assistantMessage: ChatMessage = { role: 'assistant', content: result.answer };
      setChatHistory(prev => [...prev, assistantMessage]);

      if (voiceMode) {
        setIsAISpeaking(true);
        try {
            const ttsResponse = await textToSpeech({ text: result.answer });
            if (audioRef.current) {
                audioRef.current.src = ttsResponse.audio;
                audioRef.current.play();
            }
        } catch (ttsError: any) {
            console.error("TTS Error:", ttsError);
            toast({ variant: 'destructive', title: 'Audio Error', description: 'Could not generate AI speech.' });
            setIsAISpeaking(false);
        }
      }

    } catch(e: any) {
      console.error("Career advice error", e);
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
  
  const handleJobSearch = async () => {
    if (!cv.content && !careerGoals.trim()) {
      toast({ variant: 'destructive', title: 'Not enough info', description: 'Please provide your CV or career goals to search for jobs.'});
      return;
    }
    setIsSearchingJobs(true);
    setJobResults(null);
    setJobSearchAccordion([]);
    try {
      const results = await searchForJobs({ 
        cvContent: cv.content, 
        careerGoals, 
        ...jobSearchFilters,
      });
      setJobResults(results);
    } catch(e: any) {
      console.error("Job search error", e);
      toast({ variant: 'destructive', title: 'Search Failed', description: e.message || 'Could not find jobs at this time.' });
    } finally {
      setIsSearchingJobs(false);
    }
  };

  const handleFilterChange = (filterName: keyof typeof jobSearchFilters, value: string) => {
    setJobSearchFilters(prev => ({...prev, [filterName]: value}));
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
    localStorage.removeItem('learnwithtemi_cv');
    setActiveCvTab('editor');
  };
  
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <HomeHeader left={
        <Button variant="outline" onClick={() => backToOnboarding('intro')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Start Over
        </Button>
      } />
      <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HubTab)} className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-secondary">
            <TabsTrigger value="cv"><FileText className="mr-2"/>CV Improver</TabsTrigger>
            <TabsTrigger value="chat"><MessageCircle className="mr-2"/>Career Chat</TabsTrigger>
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
                  <CardHeader>
                    <CardTitle>Your CV</CardTitle>
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
                            <p className="text-muted-foreground mb-2">Upload your CV to get started</p>
                            <p className="text-sm text-muted-foreground mb-4">Supports PDF, JPG/PNG, Word docs, and TXT files</p>
                            <Button onClick={() => fileInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" /> Upload CV
                            </Button>
                        </div>
                    )}
                  </CardContent>
                  <CardFooter className="justify-between pt-6">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isExtracting}>
                        <Upload className="mr-2 h-4 w-4" /> Upload New
                      </Button>
                      {(cv.content) && (
                        <Button variant="outline" size="sm" onClick={clearCv} disabled={isExtracting}>
                          Clear
                        </Button>
                      )}
                    </div>
                    <Button onClick={handleImproveCv} disabled={isImprovingCv || isExtracting || !cv.content}>
                        {isImprovingCv ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                        {isImprovingCv ? 'Analyzing...' : cvResult ? 'Re-analyze CV' : 'Improve CV'}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="analysis" className="mt-4 flex-1">
                <Card className="flex flex-col h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>AI Rewrite</CardTitle>
                    <CardDescription>Here is the AI&apos;s feedback and suggested rewrite. You can edit the text before designing.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 relative">
                    {isImprovingCv && <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
                    {cvResult ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                          <div className="flex flex-col gap-6">
                              <div>
                                  <h3 className="font-semibold mb-2 text-lg">Critique & Action Plan</h3>
                                  <Card>
                                      <CardContent className="p-4 space-y-4">
                                          <div>
                                              <h4 className="font-semibold">Critique</h4>
                                              <p className="text-sm text-muted-foreground">{cvResult.analysis.critique}</p>
                                          </div>
                                          <Separator />
                                          <div>
                                              <h4 className="font-semibold">Skill Gap Analysis</h4>
                                              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                                                  {cvResult.analysis.skillGapAnalysis.map((s, i) => <li key={i}>{s}</li>)}
                                              </ul>
                                          </div>
                                          <Separator />
                                          <div>
                                              <h4 className="font-semibold">Action Plan</h4>
                                              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                                                  {cvResult.analysis.actionPlan.map((s, i) => <li key={i}>{s}</li>)}
                                              </ul>
                                          </div>
                                      </CardContent>
                                  </Card>
                              </div>
                          </div>
                          <div className="flex flex-col">
                              <h3 className="font-semibold mb-2 text-lg">Full Rewritten CV (Editable)</h3>
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
                                        <Button variant="outline" size="sm" onClick={() => downloadMarkdown(rewrittenCvContent, 'rewritten_cv.md')}>
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
                    ) : !isImprovingCv && (
                      <div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                        <BrainCircuit className="w-12 h-12 mb-4" />
                        <p>Your CV analysis will appear here.</p>
                        <p className="text-sm mt-2">Upload a CV and click "Improve CV" to get started.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
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

          <TabsContent value="chat" className="mt-4 flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 ? (
                <div className="text-center text-muted-foreground pt-10 px-6 h-full flex flex-col justify-center items-center">
                  <Bot className="w-12 h-12 mx-auto text-primary/80 mb-4" />
                  <h3 className="font-semibold text-foreground text-lg">AI Career Advisor</h3>
                  <p className="mt-2 text-sm">Ask about career paths or interview tips. Try voice mode for a hands-free chat.</p>
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
                  ref={chatInputRef}
                  placeholder="Ask a question..."
                  className="pr-20"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e as any); }}}
                  disabled={isChatting}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button size="icon" variant={voiceMode ? 'secondary': 'ghost'} className={cn("h-8 w-8", isListening && "text-destructive")} onClick={handleMicClick} type="button" disabled={isChatting}>
                        <Mic className="h-4 w-4" />
                    </Button>
                    <Button size="icon" className="h-8 w-8" type="submit" disabled={isChatting || isListening}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
              </form>
              <audio ref={audioRef} onEnded={() => setIsAISpeaking(false)} className="hidden"/>
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="mt-4 flex-1 flex flex-col">
              <Accordion type="multiple" value={jobSearchAccordion} onValueChange={setJobSearchAccordion} className="max-w-4xl mx-auto w-full">
                <AccordionItem value="filters" className="border-b-0">
                    <Card>
                        <AccordionTrigger className="p-6 w-full hover:no-underline" disabled={isSearchingJobs}>
                            <div className="flex-1 text-left">
                                <h3 className="text-2xl font-semibold leading-none tracking-tight">Job Search</h3>
                                <p className="text-sm text-muted-foreground mt-1.5">
                                    {jobSearchAccordion.includes('filters')
                                    ? 'Find jobs tailored to your profile and goals.'
                                    : 'Click to show filters and find matching jobs.'}
                                </p>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="space-y-4 pt-0">
                              <p className="text-sm text-muted-foreground">
                                  Use the filters below to refine your search. The AI also uses your CV and goals.
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                  <Label htmlFor="role">Role / Title</Label>
                                  <Input id="role" value={jobSearchFilters.role} onChange={e => handleFilterChange('role', e.target.value)} placeholder="e.g., Software Engineer" />
                                </div>
                                <div>
                                  <Label htmlFor="jobType">Job Type</Label>
                                  <Select value={jobSearchFilters.jobType || "Any"} onValueChange={value => handleFilterChange('jobType', value === 'Any' ? '' : value)}>
                                    <SelectTrigger id="jobType"><SelectValue placeholder="Select type..." /></SelectTrigger>
                                    <SelectContent>{jobTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="industry">Industry</Label>
                                  <Select value={jobSearchFilters.industry || "Any"} onValueChange={value => handleFilterChange('industry', value === 'Any' ? '' : value)}>
                                    <SelectTrigger id="industry"><SelectValue placeholder="Select industry..." /></SelectTrigger>
                                    <SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="experienceLevel">Experience Level</Label>
                                  <Select value={jobSearchFilters.experienceLevel || "Any"} onValueChange={value => handleFilterChange('experienceLevel', value === 'Any' ? '' : value)}>
                                    <SelectTrigger id="experienceLevel"><SelectValue placeholder="Select level..." /></SelectTrigger>
                                    <SelectContent>{experienceLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                                <div className="md:col-span-2">
                                  <Label htmlFor="location">Location</Label>
                                  <Input id="location" value={jobSearchFilters.location} onChange={e => handleFilterChange('location', e.target.value)} placeholder="e.g., Accra, Ghana" />
                                </div>
                              </div>
                              <div className="flex justify-end pt-4">
                                <Button onClick={handleJobSearch} disabled={isSearchingJobs} size="lg">
                                    {isSearchingJobs && <Loader2 className="mr-2 animate-spin" />}
                                    <Search className="mr-2" /> Search for Jobs
                                </Button>
                              </div>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            </Accordion>
            <div className="flex-1 overflow-y-auto mt-4">
                {isSearchingJobs && <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>}
                {jobResults && (
                <div className="max-w-4xl mx-auto w-full space-y-4 pb-4">
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
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
          <h4 className="font-semibold mb-1">Insider Tip</h4>
          <p className="text-muted-foreground italic">&quot;{result.insiderTip}&quot;</p>
        </div>
      </CardContent>
    </Card>
  );
}

    

    


