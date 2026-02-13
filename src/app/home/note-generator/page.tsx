
'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { generateStudyNotes, GenerateStudyNotesOutput, GenerateStudyNotesInput } from "@/ai/flows/generate-study-notes";
import { interactiveChatWithSources } from "@/ai/flows/interactive-chat-with-sources";
import { generateFlashcards, GenerateFlashcardsOutput } from "@/ai/flows/generate-flashcards";
import { generateQuiz, GenerateQuizOutput } from "@/ai/flows/generate-quiz";
import { generateSlideDeck, GenerateSlideDeckOutput } from "@/ai/flows/generate-slide-deck";
import { generateInfographic, GenerateInfographicOutput } from "@/ai/flows/generate-infographic";
import { generateMindMap, GenerateMindMapOutput } from "@/ai/flows/generate-mind-map";
import { generatePodcastFromSources, GeneratePodcastFromSourcesOutput } from "@/ai/flows/generate-podcast-from-sources";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { Loader2, Sparkles, BookOpen, Plus, ArrowLeft, ArrowRight, MessageCircle, Send, Bot, HelpCircle, Presentation, SquareStack, FlipHorizontal, Lightbulb, CheckCircle, XCircle, Printer, View, Grid, Save, MoreVertical, Trash2, AreaChart, Download, GitFork, Mic, Volume2, Pause } from "lucide-react";
import { HomeHeader } from "@/components/layout/HomeHeader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { InteractiveMindMap } from "@/components/mind-map/InteractiveMindMap";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser, useFirestore, useDoc, useCollection, useStorage } from "@/firebase";
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, query, where, orderBy, Timestamp, DocumentData } from "firebase/firestore";
import { Separator } from "@/components/ui/separator";
import { uploadDataUrlToStorage, deleteFolderFromStorage } from "@/lib/storage";


type GeneratedContent = {
  flashcards?: GenerateFlashcardsOutput['flashcards'];
  quiz?: GenerateQuizOutput['quiz'];
  deck?: GenerateSlideDeckOutput;
  infographic?: Omit<GenerateInfographicOutput, 'imageUrl'> & { imageUrl?: string };
  mindmap?: GenerateMindMapOutput;
  podcast?: Omit<GeneratePodcastFromSourcesOutput, 'podcastAudio'> & { podcastAudioUrl?: string };
};

type InteractionProgress = {
  notesViewed?: number;
  flashcardsFlipped?: number;
  quizCompleted?: number;
  deckViewed?: boolean;
  infographicViewed?: boolean;
  mindmapViewed?: boolean;
  podcastListened?: boolean;
};

interface Note extends DocumentData {
  id: string;
  userId: string;
  topic: string;
  level: string;
  date: Timestamp;
  content: string;
  nextStepsPrompt?: string;
  generatedContent?: GeneratedContent;
  interactionProgress?: InteractionProgress;
  progress?: number;
  status?: 'Not Started' | 'In Progress' | 'Completed';
};

type AcademicLevel = GenerateStudyNotesInput['academicLevel'];
type ActiveView = 'notes' | 'flashcards' | 'quiz' | 'deck' | 'infographic' | 'mindmap' | 'podcast';


function NoteListPage({ onSelectNote, onCreateNew }: { onSelectNote: (noteId: string) => void, onCreateNew: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [visibleCount, setVisibleCount] = useState(7);

  const notesQuery = useMemo(() => {
    if (user && firestore) {
      return query(
        collection(firestore, "notes"),
        where("userId", "==", user.uid),
        orderBy("date", "desc")
      );
    }
    return null;
  }, [user, firestore]);

  const { data: recentNotes, loading: notesLoading } = useCollection<Note>(notesQuery);

  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (!firestore || !user) return;
    
    // Optimistically update UI
    // In a real app with many users, you might not do this, but for a single user it's fine.
    // setRecentNotes(prev => prev.filter(note => note.id !== noteId));
    
    try {
      await deleteDoc(doc(firestore, "notes", noteId));
      if (storage) {
        await deleteFolderFromStorage(storage, `users/${user.uid}/notes/${noteId}`);
      }
      toast({ title: "Note Deleted", description: "The note has been successfully removed." });
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete the note. Please try again." });
      // Re-fetch or revert optimistic update if it failed
    }
  };
  
  return (
    <>
      <HomeHeader />
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-headline font-bold">Notes</h1>
              <p className="text-muted-foreground mt-1 text-balance">Your personal AI-powered note-taking assistant.</p>
            </div>
            <Button onClick={onCreateNew} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" /> Create New
            </Button>
        </div>

        <div>
            <h2 className="text-2xl font-headline font-bold mb-4">Recent Notes</h2>
            {notesLoading ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <Card key={i}><CardHeader><div className="space-y-2"><div className="h-6 bg-muted rounded-md w-3/4"></div><div className="h-4 bg-muted rounded-md w-1/2"></div></div></CardHeader><CardContent><div className="h-4 bg-muted rounded-md w-1/3"></div></CardContent></Card>)}
                 </div>
            ) : !recentNotes || recentNotes.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 border-dashed">
                    <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold text-muted-foreground">No recent notes.</h3>
                    <p className="text-muted-foreground mb-4">Click the button above to generate your first one!</p>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recentNotes.slice(0, visibleCount).map(note => (
                            <Card key={note.id} className="cursor-pointer hover:shadow-lg transition-shadow relative flex flex-col" onClick={() => onSelectNote(note.id)}>
                                <CardHeader>
                                    <CardTitle>{note.topic}</CardTitle>
                                    <CardDescription>{note.level}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground">Generated on {note.date ? new Date(note.date.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                                    {note.status !== 'Not Started' && typeof note.progress === 'number' && (
                                        <div className="mt-2">
                                            <Progress value={note.progress} className="h-2" />
                                            <p className="text-xs text-muted-foreground mt-1">{note.status} - {Math.round(note.progress)}%</p>
                                        </div>
                                    )}
                                </CardContent>
                                <div className="absolute top-1 right-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={(e) => handleDeleteNote(e, note.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </Card>
                        ))}
                    </div>
                    {visibleCount < recentNotes.length && (
                      <div className="text-center mt-8">
                          <Button variant="outline" onClick={() => setVisibleCount(prev => prev + 7)}>Load More</Button>
                      </div>
                  )}
                </>
            )}
        </div>
      </div>
    </>
  );
}

// ... other imports

// Helper function to extract YouTube video ID
const getYoutubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const NOTE_PAGE_MIN_VIEW_TIME = 10000;

const PROGRESS_WEIGHTS = {
  notes: 20,
  quiz: 40,
  flashcards: 15,
  deck: 10,
  mindmap: 10,
  infographic: 5,
};

function NoteViewPage({ noteId, onBack }: { noteId: string; onBack: () => void; }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const noteDocRef = useMemo(() => firestore ? doc(firestore, 'notes', noteId) as DocumentData : null, [firestore, noteId]);
  const { data: note, loading: noteLoading } = useDoc<Note>(noteDocRef as any);

  const { data: firestoreUser } = useDoc(useMemo(() => user && firestore ? doc(firestore, 'users', user.uid) : null, [user, firestore]));

  const [topic, setTopic] = useState("");
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>("Undergraduate");
  const [isGenerating, setIsGenerating] = useState<keyof GeneratedContent | 'notes' | null>(null);
  
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const pageStartTime = useRef(Date.now());
  const [viewedPages, setViewedPages] = useState<Set<number>>(new Set());

  const [activeView, setActiveView] = useState<ActiveView>('notes');
  const [activeTab, setActiveTab] = useState<'notes' | 'chat' | 'generate'>('notes');

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  
  const calculateAndUpdateProgress = useCallback(() => {
    if (!note || !note.interactionProgress || !noteDocRef) return;
    const ip = note.interactionProgress;
    let totalProgress = 0;
    if (ip.notesViewed) totalProgress += (ip.notesViewed / 100) * PROGRESS_WEIGHTS.notes;
    if (ip.quizCompleted) totalProgress += (ip.quizCompleted / 100) * PROGRESS_WEIGHTS.quiz;
    if (ip.flashcardsFlipped) totalProgress += (ip.flashcardsFlipped / 100) * PROGRESS_WEIGHTS.flashcards;
    if (ip.deckViewed) totalProgress += PROGRESS_WEIGHTS.deck;
    if (ip.mindmapViewed) totalProgress += PROGRESS_WEIGHTS.mindmap;
    if (ip.infographicViewed) totalProgress += PROGRESS_WEIGHTS.infographic;
    
    const finalProgress = Math.min(Math.round(totalProgress), 100);
    const status = finalProgress >= 100 ? 'Completed' : (finalProgress > 0 ? 'In Progress' : 'Not Started');
    
    if (note.progress !== finalProgress || note.status !== status) {
        updateDoc(noteDocRef, { progress: finalProgress, status });
    }
  }, [note, noteDocRef]);

  useEffect(() => {
    calculateAndUpdateProgress();
  }, [note?.interactionProgress, calculateAndUpdateProgress]);

  useEffect(() => {
    if (note) {
      setTopic(note.topic);
      setAcademicLevel(note.level as AcademicLevel);
      const notePages = note.content.split(/\n---\n/);
      setPages(notePages);
      setCurrentPage(0);
      setViewedPages(new Set(note.interactionProgress?.notesViewed ? Array.from({length: Math.floor(note.interactionProgress.notesViewed * notePages.length / 100)}, (_, i) => i) : []));
      setChatHistory([]);
    }
  }, [note]);

  const updateNote = useCallback((data: DocumentData) => {
    if (noteDocRef) {
      updateDoc(noteDocRef, data).catch(err => {
        console.error("Failed to update note:", err);
        toast({ variant: 'destructive', title: "Save failed", description: "Could not save your changes." });
      });
    }
  }, [noteDocRef, toast]);
  
  const handleSetCurrentPage = (pageIndex: number) => {
    const timeSpent = Date.now() - pageStartTime.current;
    if(timeSpent > NOTE_PAGE_MIN_VIEW_TIME) {
      setViewedPages(prev => {
        const newSet = new Set(prev);
        newSet.add(currentPage);
        if (note && pages.length > 0) {
          const notesViewed = (newSet.size / pages.length) * 100;
          updateNote({ 'interactionProgress.notesViewed': notesViewed });
        }
        return newSet;
      });
    }
    setCurrentPage(pageIndex);
    pageStartTime.current = Date.now();
  };

  const handlePlayAudio = useCallback(async (messageId: string, text: string) => {
    // ... same as before
  }, []);
  
  const submitChat = useCallback(async (currentInput: string, isVoiceInput: boolean) => {
    if (!currentInput?.trim() || isChatting || !note?.content) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: currentInput };
    setChatHistory(prev => [...prev, userMessage]);
    setIsChatting(true);
    try {
        const response = await interactiveChatWithSources({
            sources: [{ type: 'text', name: 'Note Content', dataUri: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(note.content)))}`, contentType: 'text/plain' }],
            question: currentInput
        });
        const assistantMessage: ChatMessage = { id: `asst-${Date.now()}`, role: 'assistant', content: response.answer };
        setChatHistory(prev => [...prev, assistantMessage]);
        if (isVoiceInput) await handlePlayAudio(assistantMessage.id, response.answer);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Chat Error", description: error.message || "The AI failed to respond." });
        setChatHistory(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: "Sorry, an error occurred." }]);
    } finally {
        setIsChatting(false);
    }
  }, [note, isChatting, toast, handlePlayAudio]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentInput = chatInputRef.current?.value;
    if (!currentInput?.trim()) return;
    submitChat(currentInput, false);
    if (chatInputRef.current) chatInputRef.current.value = "";
  };

  const handleGenerateContent = async (type: keyof GeneratedContent) => {
    if (!note || !user || !storage) return;
    setIsGenerating(type);

    try {
        const input: GeneratePodcastFromSourcesInput & GenerateFlashcardsInput & GenerateQuizInput & GenerateSlideDeckInput & GenerateInfographicInput = {
            context: 'note-generator', topic: note.topic, academicLevel: note.level as AcademicLevel, content: note.content,
        };
      
        let resultData: any;
        let updateData: any = {};

        switch(type) {
            case 'podcast':
                const podcastResult = await generatePodcastFromSources(input as GeneratePodcastFromSourcesInput);
                const audioUrl = await uploadDataUrlToStorage(storage, `users/${user.uid}/notes/${note.id}/podcast.wav`, podcastResult.podcastAudio);
                resultData = { podcastScript: podcastResult.podcastScript, podcastAudioUrl: audioUrl };
                updateData = { 'generatedContent.podcast': resultData };
                break;
            case 'infographic':
                const infographicResult = await generateInfographic(input);
                const imageUrl = await uploadDataUrlToStorage(storage, `users/${user.uid}/notes/${note.id}/infographic.png`, infographicResult.imageUrl);
                resultData = { prompt: infographicResult.prompt, imageUrl: imageUrl };
                updateData = { 'generatedContent.infographic': resultData };
                break;
            case 'flashcards':
                resultData = (await generateFlashcards(input as GenerateFlashcardsInput)).flashcards;
                updateData = { 'generatedContent.flashcards': resultData };
                break;
            case 'quiz':
                resultData = (await generateQuiz(input as GenerateQuizInput)).quiz;
                updateData = { 'generatedContent.quiz': resultData };
                break;
            case 'deck':
                resultData = await generateSlideDeck(input);
                updateData = { 'generatedContent.deck': resultData };
                break;
            case 'mindmap':
                 resultData = await generateMindMap({ context: 'note-generator', topic: note.topic, academicLevel: note.level as AcademicLevel, content: note.content });
                 updateData = { 'generatedContent.mindmap': resultData };
                 break;
            default: throw new Error("Unknown generation type");
        }
        updateNote(updateData);
        setActiveView(type);
    } catch (e: any) {
        toast({ variant: 'destructive', title: `Failed to generate ${type}`, description: e.message });
    } finally {
        setIsGenerating(null);
    }
  };

  const handleFinishAndGoBack = (progressUpdate: Partial<InteractionProgress>) => {
    updateNote({ interactionProgress: { ...note?.interactionProgress, ...progressUpdate } });
    setActiveView('notes');
  };

  const handleDeleteGeneratedContent = (contentType: keyof GeneratedContent) => {
    const newProgress = { ...note?.interactionProgress };
    if (contentType === 'quiz') delete newProgress.quizCompleted;
    if (contentType === 'flashcards') delete newProgress.flashcardsFlipped;
    if (contentType === 'deck') delete newProgress.deckViewed;
    if (contentType === 'infographic') delete newProgress.infographicViewed;
    if (contentType === 'mindmap') delete newProgress.mindmapViewed;
    if (contentType === 'podcast') delete newProgress.podcastListened;
    
    updateNote({ [`generatedContent.${contentType}`]: deleteField(), interactionProgress: newProgress });
    toast({ title: 'Content Deleted' });
  };
  
  if (noteLoading) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary"/>
        </div>
    );
  }

  if (!note) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-4">
            <Alert variant="destructive" className="max-w-md">
                <AlertTitle>Note Not Found</AlertTitle>
                <AlertDescription>The note you are looking for could not be found or may have been deleted.</AlertDescription>
            </Alert>
            <Button onClick={onBack}><ArrowLeft className="mr-2"/> Back to Notes</Button>
        </div>
    );
  }
  
  // Render logic continues here, using `note` from `useDoc`
  // ...
  return (
     <>
      <HomeHeader left={<Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes</Button>} />
      <div className="flex-1 flex flex-col min-h-0">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
          {activeView !== 'notes' ? (
              <div className="mt-8 flex-1">
                  {/* renderGeneratedContent logic here */}
              </div>
          ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-1 flex flex-col">
                  {/* ... Tabs and TabsContent using `note` data ... */}
              </Tabs>
          )}
        </div>
      </div>
    </>
  )
}

function NoteGeneratorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const noteIdParam = searchParams.get('noteId');
    const isNewParam = searchParams.get('new');
    const topicParam = searchParams.get('topic'); // for deep-linking a new note
    
    const needsNoteView = !!noteIdParam;
    const needsCreationView = isNewParam === 'true' || topicParam;

    const handleSelectNote = useCallback((noteId: string) => {
        router.push(`/home/note-generator?noteId=${noteId}`);
    }, [router]);

    const handleCreateNew = useCallback(() => {
        router.push('/home/note-generator?new=true');
    }, [router]);

    const handleBackToList = useCallback(() => {
        router.push('/home/note-generator');
    }, [router]);

    if (needsNoteView) {
        return <NoteViewPage noteId={noteIdParam} onBack={handleBackToList} />;
    }
    
    if (needsCreationView) {
        return <CreateNoteView onBack={handleBackToList} initialTopic={topicParam || ""} />;
    }
    
    return <NoteListPage onSelectNote={handleSelectNote} onCreateNew={handleCreateNew} />;
}

function CreateNoteView({ onBack, initialTopic }: { onBack: () => void, initialTopic?: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const { data: firestoreUser } = useDoc(useMemo(() => user && firestore ? doc(firestore, 'users', user.uid) : null, [user, firestore]));

    const [topic, setTopic] = useState(initialTopic || "");
    const [academicLevel, setAcademicLevel] = useState<AcademicLevel | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        if (firestoreUser?.educationalLevel && !academicLevel) {
            setAcademicLevel(firestoreUser.educationalLevel as AcademicLevel);
        }
    }, [firestoreUser, academicLevel]);

    const handleGenerateClick = async () => {
        const levelToUse = academicLevel;
        if (!topic.trim()) {
            toast({ variant: "destructive", title: "Topic is required" });
            return;
        }
        if (!levelToUse) {
            toast({ variant: "destructive", title: "Academic Level is required" });
            return;
        }
        if (!user || !firestore) {
             toast({ variant: "destructive", title: "Authentication error" });
             return;
        }
        
        setIsLoading(true);
        try {
            const result = await generateStudyNotes({ topic, academicLevel: levelToUse });
            
            const newNoteRef = await addDoc(collection(firestore, "notes"), {
                userId: user.uid,
                topic,
                level: levelToUse,
                content: result.notes,
                nextStepsPrompt: result.nextStepsPrompt,
                date: serverTimestamp(),
                progress: 0,
                status: 'Not Started',
                generatedContent: {},
                interactionProgress: {},
            });

            router.push(`/home/note-generator?noteId=${newNoteRef.id}`);

        } catch (error: any) {
            console.error("Error generating notes:", error);
            toast({ variant: "destructive", title: "Generation Failed", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
       <>
        <HomeHeader left={<Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes</Button>} />
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-headline font-bold">Generate New Study Notes</CardTitle>
                        <CardDescription>Enter any topic and select the academic level to get started.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2 text-left">
                            <Label htmlFor="topic-input">Topic</Label>
                            <Input id="topic-input" placeholder="e.g., Photosynthesis" value={topic} onChange={(e) => setTopic(e.target.value)} className="h-12 text-base" onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateClick(); }} />
                        </div>
                        <div className="space-y-2 text-left">
                            <Label htmlFor="level-select">Academic Level</Label>
                            <Select value={academicLevel} onValueChange={(value) => setAcademicLevel(value as AcademicLevel)}>
                                <SelectTrigger id="level-select" className="h-12 text-base"><SelectValue placeholder="Select an academic level..." /></SelectTrigger>
                                <SelectContent>{/* ... SelectItems ... */}</SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleGenerateClick} disabled={!topic.trim() || isLoading} className="w-full h-12" size="lg">
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                            Generate Notes
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
       </>
    )
}

export default function NoteGeneratorPageWrapper() {
    return (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin"/></div>}>
            <NoteGeneratorPage />
        </Suspense>
    )
}
