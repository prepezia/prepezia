'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { generateStudyNotes, GenerateStudyNotesOutput, GenerateStudyNotesInput } from "@/ai/flows/generate-study-notes";
import { interactiveChatWithSources, InteractiveChatWithSourcesInput, InteractiveChatWithSourcesOutput } from "@/ai/flows/interactive-chat-with-sources";
import { generateFlashcards, GenerateFlashcardsOutput } from "@/ai/flows/generate-flashcards";
import { generateQuiz, GenerateQuizOutput } from "@/ai/flows/generate-quiz";
import { generateSlideDeck, GenerateSlideDeckOutput } from "@/ai/flows/generate-slide-deck";
import { generateInfographic, GenerateInfographicOutput } from "@/ai/flows/generate-infographic";
import { generatePodcastFromSources, GeneratePodcastFromSourcesOutput } from "@/ai/flows/generate-podcast-from-sources";
import { generateMindMap, GenerateMindMapOutput } from "@/ai/flows/generate-mind-map";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { Loader2, Sparkles, BookOpen, Plus, ArrowLeft, ArrowRight, MessageCircle, Send, Bot, HelpCircle, Presentation, SquareStack, FlipHorizontal, Lightbulb, CheckCircle, XCircle, Printer, View, Grid, Save, MoreVertical, Trash2, AreaChart, Download, GitFork, Mic, Volume2, Pause, Eye, BrainCircuit, Minus } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser, useFirestore, useDoc, useCollection, useStorage } from "@/firebase";
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, query, where, orderBy, Timestamp, DocumentData, deleteField, CollectionReference, DocumentReference } from "firebase/firestore";
import { Separator } from "@/components/ui/separator";
import { uploadDataUrlToStorage, deleteFolderFromStorage } from "@/lib/storage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InteractiveMindMap, MindMapNodeData } from "@/components/mind-map/InteractiveMindMap";
import { toPng } from 'html-to-image';

type GeneratedContent = {
  flashcards?: GenerateFlashcardsOutput['flashcards'];
  quiz?: GenerateQuizOutput['quiz'];
  deck?: GenerateSlideDeckOutput;
  infographic?: { imageUrl?: string };
  podcast?: Omit<GeneratePodcastFromSourcesOutput, 'podcastAudio'> & { podcastAudioUrl?: string };
  mindMap?: GenerateMindMapOutput['mindMap'];
};

type InteractionProgress = {
  notesViewed?: number;
  flashcardsFlipped?: number;
  quizCompleted?: number;
  deckViewed?: boolean;
  infographicViewed?: boolean;
  podcastListened?: boolean;
  mindmapViewed?: boolean;
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

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: InteractiveChatWithSourcesOutput['citations'];
    isError?: boolean;
};

type AcademicLevel = GenerateStudyNotesInput['academicLevel'];
type ActiveView = 'notes' | 'flashcards' | 'quiz' | 'deck' | 'infographic' | 'podcast' | 'mindMap';

async function downloadUrl(url: string, filename: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
        console.error('Download failed:', error);
        throw error; // Re-throw to be caught by caller
    }
}

function NoteGeneratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteId = searchParams.get('noteId');
  const action = searchParams.get('action');

  const handleSelectNote = (noteId: string) => {
    router.push(`/home/note-generator?noteId=${noteId}`);
  };

  const handleCreateNew = () => {
    router.push(`/home/note-generator?action=create`);
  };

  const handleBackToList = () => {
    router.push(`/home/note-generator`);
  };

  if (noteId) {
    return <NoteViewPage noteId={noteId} onBack={handleBackToList} />;
  }

  if (action === 'create') {
    return <CreateNoteView onBack={handleBackToList} initialTopic={searchParams.get('topic') || ''} />;
  }

  return <NoteListPage onSelectNote={handleSelectNote} onCreateNew={handleCreateNew} />;
}

function NoteListPage({ onSelectNote, onCreateNew }: { onSelectNote: (id: string) => void, onCreateNew: () => void }) {
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
      ) as CollectionReference<Note>;
    }
    return null;
  }, [user, firestore]);

  const { data: recentNotes, loading: notesLoading } = useCollection<Note>(notesQuery);

  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (!firestore || !user || !storage) return;
    
    try {
      await deleteDoc(doc(firestore, "notes", noteId));
      await deleteFolderFromStorage(storage, `users/${user.uid}/notes/${noteId}`);
      toast({ title: "Note Deleted", description: "The note has been successfully removed." });
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete the note. Please try again." });
    }
  };

  const handleSaveNoteForOffline = async (note: Note) => {
    if (!note?.generatedContent) {
        toast({ description: "No generated content to save." });
        return;
    }

    toast({ title: "Saving for Offline...", description: "Your generated media files will be downloaded." });

    let downloadedCount = 0;
    const content = note.generatedContent;

    if (content.infographic?.imageUrl) {
        try {
            await downloadUrl(content.infographic.imageUrl, `infographic_${note.topic.replace(/\s+/g, '_')}.png`);
            downloadedCount++;
        } catch (error) {
            toast({ variant: "destructive", title: "Infographic Download Failed" });
        }
    }
    if (content.podcast?.podcastAudioUrl) {
        try {
            await downloadUrl(content.podcast.podcastAudioUrl, `podcast_${note.topic.replace(/\s+/g, '_')}.wav`);
            downloadedCount++;
        } catch (error) {
            toast({ variant: "destructive", title: "Podcast Download Failed" });
        }
    }

    if (downloadedCount > 0) {
        toast({ title: "Media files downloaded", description: "Infographics and podcasts have been saved to your device." });
    } else {
        toast({ title: "No media to download", description: "Your text notes are automatically available offline once viewed." });
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
                            <Card key={note.id} className="cursor-pointer hover:shadow-lg transition-shadow relative flex flex-col">
                                <div className="flex-grow" onClick={() => onSelectNote(note.id)}>
                                    <CardHeader>
                                        <CardTitle>{note.topic}</CardTitle>
                                        <CardDescription>{note.level}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">Generated on {note.date ? new Date(note.date.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                                        {note.status !== 'Not Started' && typeof note.progress === 'number' && (
                                            <div className="mt-2">
                                                <Progress value={note.progress} className="h-2" />
                                                <p className="text-xs text-muted-foreground mt-1">{note.status} - {Math.round(note.progress)}%</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </div>
                                <CardFooter>
                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleSaveNoteForOffline(note); }}>
                                        <Save className="mr-2 h-4 w-4" /> Save Offline
                                    </Button>
                                </CardFooter>
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

const NOTE_PAGE_MIN_VIEW_TIME = 10000;

const PROGRESS_WEIGHTS = {
  notes: 20,
  quiz: 40,
  flashcards: 15,
  deck: 10,
  infographic: 5,
  podcast: 0, // Not currently tracked for progress
  mindMap: 10,
};



function NoteViewPage({ noteId, onBack }: { noteId: string; onBack: () => void; }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const noteDocRef = useMemo(() => firestore ? doc(firestore, 'notes', noteId) as DocumentReference<Note> : null, [firestore, noteId]);
  const { data: note, loading: noteLoading } = useDoc<Note>(noteDocRef);

  const [isGenerating, setIsGenerating] = useState<keyof GeneratedContent | null>(null);
  
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
  
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  
  const updateNoteInFirestore = useCallback((data: DocumentData) => {
    if (noteDocRef) {
      updateDoc(noteDocRef, data).catch(err => {
        console.error("Failed to update note in Firestore:", err);
        toast({ variant: 'destructive', title: "Save failed", description: "Could not save your changes to the server." });
      });
    }
  }, [noteDocRef, toast]);
  
  const calculateAndUpdateProgress = useCallback(() => {
    if (!note || !note.interactionProgress || !noteDocRef) return;
    const ip = note.interactionProgress;
    let totalProgress = 0;
    if (ip.notesViewed) totalProgress += (ip.notesViewed / 100) * PROGRESS_WEIGHTS.notes;
    if (ip.quizCompleted) totalProgress += (ip.quizCompleted / 100) * PROGRESS_WEIGHTS.quiz;
    if (ip.flashcardsFlipped) totalProgress += (ip.flashcardsFlipped / 100) * PROGRESS_WEIGHTS.flashcards;
    if (ip.deckViewed) totalProgress += PROGRESS_WEIGHTS.deck;
    if (ip.infographicViewed) totalProgress += PROGRESS_WEIGHTS.infographic;
    if (ip.mindmapViewed) totalProgress += PROGRESS_WEIGHTS.mindMap;
    
    const finalProgress = Math.min(Math.round(totalProgress), 100);
    const status = finalProgress >= 100 ? 'Completed' : (finalProgress > 0 ? 'In Progress' : 'Not Started');
    
    if (note.progress !== finalProgress || note.status !== status) {
        updateNoteInFirestore({ progress: finalProgress, status });
    }
  }, [note, noteDocRef, updateNoteInFirestore]);

  useEffect(() => {
    calculateAndUpdateProgress();
  }, [note?.interactionProgress, calculateAndUpdateProgress]);

  useEffect(() => {
    if (note) {
      const notePages = note.content.split(/\n---\n/);
      setPages(notePages);
      setCurrentPage(0);
      setViewedPages(new Set(note.interactionProgress?.notesViewed ? Array.from({length: Math.floor(note.interactionProgress.notesViewed * notePages.length / 100)}, (_, i) => i) : []));
      setChatHistory([]);
    }
  }, [note]);

  const handleSetCurrentPage = (pageIndex: number) => {
    const timeSpent = Date.now() - pageStartTime.current;
    if(timeSpent > NOTE_PAGE_MIN_VIEW_TIME) {
      setViewedPages(prev => {
        const newSet = new Set(prev);
        newSet.add(currentPage);
        if (note && pages.length > 0) {
          const notesViewed = (newSet.size / pages.length) * 100;
          updateNoteInFirestore({ 'interactionProgress.notesViewed': notesViewed });
        }
        return newSet;
      });
    }
    setCurrentPage(pageIndex);
    pageStartTime.current = Date.now();
  };

  const handlePlayAudio = useCallback(async (messageId: string, text: string) => {
    if (speakingMessageId === messageId && audioRef.current) {
        audioRef.current.pause();
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
    if (!currentInput?.trim() || isChatting || !note?.content) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: currentInput };
    setChatHistory(prev => [...prev, userMessage]);
    setIsChatting(true);
    try {
        const response = await interactiveChatWithSources({
            sources: [{ type: 'text', name: 'Note Content', dataUri: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(note.content)))}`, contentType: 'text/plain' }],
            question: currentInput
        });
        const assistantMessage: any = { id: `asst-${Date.now()}`, role: 'assistant', content: response.answer, citations: response.citations };
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
    
    const handleGenerateContent = async (type: keyof GeneratedContent) => {
        if (!note || !user || !storage) return;
        setIsGenerating(type);
        setIsGenerateDialogOpen(false);
    
        try {
            const inputBase = {
                context: 'note-generator' as const,
                topic: note.topic,
                academicLevel: note.level as AcademicLevel,
                content: note.content,
            };
    
            let dataForDb: any;
            
            if (type === 'infographic') {
                const result = await generateInfographic({ ...inputBase, style: 'educational', maxPoints: 5 });
                
                if (!result.imageDataUrl) {
                    throw new Error(`AI failed to return image data for the infographic.`);
                }

                const storagePath = `users/${user.uid}/notes/${note.id}/infographic.png`;
                const downloadUrl = await uploadDataUrlToStorage(storage, storagePath, result.imageDataUrl);
                dataForDb = { imageUrl: downloadUrl };

            } else if (type === 'podcast') {
                const result = await generatePodcastFromSources(inputBase);
                if (!result.podcastAudio) {
                    throw new Error(`AI failed to return audio data for the podcast.`);
                }
                const storagePath = `users/${user.uid}/notes/${note.id}/podcast.wav`;
                const downloadUrl = await uploadDataUrlToStorage(storage, storagePath, result.podcastAudio);
                dataForDb = { podcastScript: result.podcastScript, podcastAudioUrl: downloadUrl };

            } else {
                switch (type) {
                    case 'mindMap':
                        dataForDb = (await generateMindMap(inputBase)).mindMap;
                        break;
                    case 'flashcards':
                        dataForDb = (await generateFlashcards(inputBase)).flashcards;
                        break;
                    case 'quiz':
                        dataForDb = (await generateQuiz(inputBase)).quiz;
                        break;
                    case 'deck':
                        dataForDb = await generateSlideDeck(inputBase);
                        break;
                    default:
                        throw new Error("Unknown generation type");
                }
            }
    
            await updateNoteInFirestore({ [`generatedContent.${type}`]: dataForDb });
            setActiveView(type);
    
        } catch (e: any) {
            console.error(`Error generating ${type}:`, e);
            const description = e.message || `An unknown error occurred while generating the ${type}.`;
            toast({ variant: 'destructive', title: `Failed to generate ${type}`, description });
        } finally {
            setIsGenerating(null);
        }
    };

  const handleFinishAndGoBack = (progressUpdate: Partial<InteractionProgress>) => {
    updateNoteInFirestore({ interactionProgress: { ...note?.interactionProgress, ...progressUpdate } });
    setActiveView('notes');
  };

  const handleDeleteGeneratedContent = (contentType: keyof GeneratedContent) => {
    const newProgress = { ...note?.interactionProgress };
    if (contentType === 'quiz') delete newProgress.quizCompleted;
    if (contentType === 'flashcards') delete newProgress.flashcardsFlipped;
    if (contentType === 'deck') delete newProgress.deckViewed;
    if (contentType === 'infographic') delete newProgress.infographicViewed;
    if (contentType === 'podcast') delete newProgress.podcastListened;
    if (contentType === 'mindMap') delete newProgress.mindmapViewed;
    
    updateNoteInFirestore({ [`generatedContent.${contentType}`]: deleteField(), interactionProgress: newProgress });
    toast({ title: 'Content Deleted' });
  };

  const handlePrintNote = () => {
    const printContent = document.getElementById('note-content-area')?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ variant: 'destructive', title: 'Could not open print window' });
      return;
    }

    const styles = Array.from(document.getElementsByTagName('link')).filter(link => link.rel === 'stylesheet').map(link => link.outerHTML).join('');
    const styleBlocks = Array.from(document.getElementsByTagName('style')).map(style => style.outerHTML).join('');

    printWindow.document.write(`<html><head><title>Print Note - ${note?.topic}</title>${styles}${styleBlocks}</head><body><div class="prose dark:prose-invert max-w-none p-8"><h1>${note?.topic}</h1><h2>${note?.level}</h2><hr />${printContent}</div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 1000);
  };

  const handleSaveOffline = async () => {
    if (!note?.generatedContent) {
        toast({ description: "No generated content to save." });
        return;
    }

    toast({ title: "Saving for Offline...", description: "Your generated media files will be downloaded." });

    let downloadedCount = 0;
    const content = note.generatedContent;

    if (content.infographic?.imageUrl) {
        try {
            await downloadUrl(content.infographic.imageUrl, `infographic_${note.topic.replace(/\s+/g, '_')}.png`);
            downloadedCount++;
        } catch (error) {
            toast({ variant: "destructive", title: "Infographic Download Failed" });
        }
    }
    if (content.podcast?.podcastAudioUrl) {
        try {
            await downloadUrl(content.podcast.podcastAudioUrl, `podcast_${note.topic.replace(/\s+/g, '_')}.wav`);
            downloadedCount++;
        } catch (error) {
            toast({ variant: "destructive", title: "Podcast Download Failed" });
        }
    }

    if (downloadedCount > 0) {
        toast({ title: "Media files downloaded", description: "Infographics and podcasts have been saved to your device." });
    } else {
        toast({ title: "No media to download", description: "Your text notes are automatically available offline once viewed." });
    }
  }

  const handleDownloadMedia = (type: 'infographic' | 'podcast') => {
      if (!note?.generatedContent) return;
      const content = note.generatedContent;
      let url: string | undefined;
      let filename: string | undefined;
  
      if (type === 'infographic' && content.infographic?.imageUrl) {
          url = content.infographic.imageUrl;
          filename = `infographic_${note.topic.replace(/\s+/g, '_')}.png`;
      } else if (type === 'podcast' && content.podcast?.podcastAudioUrl) {
          url = content.podcast.podcastAudioUrl;
          filename = `podcast_${note.topic.replace(/\s+/g, '_')}.wav`;
      }
  
      if (url && filename) {
          toast({ title: 'Starting download...' });
          downloadUrl(url, filename).catch(() => {
              toast({ variant: 'destructive', title: 'Download Failed' });
          });
      } else {
          toast({ variant: 'destructive', title: 'No file to download' });
      }
  };

  const renderGeneratedContent = () => {
    if (!activeView || activeView === 'notes' || !note?.generatedContent) return null;

    const content = note.generatedContent[activeView as keyof GeneratedContent];

    if (!content) {
        return (
            <Card>
                <CardHeader>
                    <Button onClick={() => setActiveView('notes')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Note</Button>
                </CardHeader>
                <CardContent className="text-center p-8">
                    <p className="text-muted-foreground">This content has not been generated yet or was deleted.</p>
                    <Button onClick={() => setActiveView('notes')} className="mt-4">Go Back</Button>
                </CardContent>
            </Card>
        );
    }
    
    switch (activeView) {
      case 'flashcards':
        return <FlashcardView flashcards={content as any} onBack={(p) => handleFinishAndGoBack({ flashcardsFlipped: p })} topic={note.topic} />;
      case 'quiz':
        return <QuizView quiz={content as any} onBack={(score, total) => handleFinishAndGoBack({ quizCompleted: (score/total)*100 })} topic={note.topic} />;
      case 'deck':
        return <SlideDeckView deck={content as any} onBack={() => handleFinishAndGoBack({ deckViewed: true })} />;
      case 'infographic':
        return <InfographicView infographic={content as any} onBack={() => handleFinishAndGoBack({ infographicViewed: true })} topic={note.topic} />;
      case 'podcast':
        return <PodcastView podcast={content as any} onBack={() => handleFinishAndGoBack({ podcastListened: true })} topic={note.topic} />;
      case 'mindMap':
        return <MindMapView mindMap={content as any} onBack={() => handleFinishAndGoBack({ mindmapViewed: true })} topic={note.topic} />;
      default:
        return null;
    }
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

  const generationOptions: { name: string; icon: React.ElementType; type: keyof GeneratedContent }[] = [
      { name: "Podcast", icon: Mic, type: "podcast" },
      { name: "Quiz", icon: HelpCircle, type: "quiz" },
      { name: "Slide Deck", icon: Presentation, type: "deck" },
      { name: "Flashcards", icon: SquareStack, type: "flashcards" },
      { name: "Infographic", icon: AreaChart, type: "infographic" },
      { name: "Mind Map", icon: BrainCircuit, type: "mindMap" },
  ];

  const savedItems = Object.entries(note.generatedContent || {}).filter(([_, value]) => !!value);
  
  return (
     <>
      <HomeHeader />
      <div className="flex-1 flex flex-col min-h-0">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center gap-4 py-4">
                <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes</Button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handleSaveOffline}><Save className="h-4 w-4"/></Button>
                    <Button variant="outline" size="icon" onClick={handlePrintNote}><Printer className="h-4 w-4"/></Button>
                </div>
            </div>
        </div>
        
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
          {activeView !== 'notes' ? (
              <div className="my-8 flex-1">
                  {renderGeneratedContent()}
              </div>
          ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-1 flex flex-col">
                   <TabsList className="grid w-full grid-cols-3 bg-secondary">
                        <TabsTrigger value="notes">Notes</TabsTrigger>
                        <TabsTrigger value="chat">Chat</TabsTrigger>
                        <TabsTrigger value="generate">Generate</TabsTrigger>
                    </TabsList>

                    <TabsContent value="notes" className="mt-4 flex-1 w-full max-w-0 min-w-full">
                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <h1 className="text-3xl font-headline font-bold">{note.topic}</h1>
                                <p className="text-muted-foreground">{note.level}</p>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-0">
                                <div id="note-content-area" className="prose dark:prose-invert w-full max-none h-full overflow-y-auto rounded-md border p-4">
                                    {pages.length > 0 ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}>
                                            {pages[currentPage]}
                                        </ReactMarkdown>
                                    ) : (
                                        <p>This note is empty.</p>
                                    )}
                                </div>
                            </CardContent>
                            {pages.length > 1 && (
                                <CardFooter className="justify-between">
                                    <Button variant="outline" onClick={() => handleSetCurrentPage(currentPage - 1)} disabled={currentPage === 0}>Previous</Button>
                                    <span className="text-sm text-muted-foreground">Page {currentPage + 1} of {pages.length}</span>
                                    <Button variant="outline" onClick={() => handleSetCurrentPage(currentPage + 1)} disabled={currentPage >= pages.length - 1}>Next</Button>
                                </CardFooter>
                            )}
                        </Card>
                    </TabsContent>

                    <TabsContent value="chat" className="mt-4 flex flex-col flex-1">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chatHistory.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                                    <Bot className="w-12 h-12 mx-auto text-primary/80 mb-4" />
                                    <h3 className="font-semibold text-foreground text-lg">Chat with Your Notes</h3>
                                    <p className="mt-2 text-sm">Ask a question and I will answer based on your notes.</p>
                                </div>
                            ) : chatHistory.map((msg) => (
                                <div key={msg.id} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                    {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Bot className="w-5 h-5"/></div>}
                                    <div className={cn("p-3 rounded-lg max-w-[80%]", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                                        <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
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

                    <TabsContent value="generate" className="mt-4 flex-none">
                        <Card>
                            <CardHeader>
                                <CardTitle>Generate from Notes</CardTitle>
                                <CardDescription>
                                    {savedItems.length > 0
                                        ? "View your generated study materials or create new ones."
                                        : "Create supplementary study materials from your notes."
                                    }
                                </CardDescription>
                                {savedItems.length > 0 && (
                                    <div className="flex justify-end pt-2.5">
                                        <Button variant="outline" onClick={() => setIsGenerateDialogOpen(true)}>
                                            <Plus className="mr-2 h-4 w-4" /> Generate New
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {isGenerating && (
                                    <div className="p-4 rounded-md bg-secondary/50">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Generating {isGenerating}... Please wait.
                                        </h4>
                                    </div>
                                )}

                                {(savedItems.length === 0 && !isGenerating) ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                        {generationOptions.map((option) => (
                                            <Button key={option.name} variant="outline" className="h-24 flex-col gap-2" onClick={() => handleGenerateContent(option.type)} disabled={!!isGenerating}>
                                                <option.icon className="w-6 h-6 text-primary" />
                                                <span>{option.name}</span>
                                            </Button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {generationOptions.map((option) => {
                                            const savedItem = note.generatedContent?.[option.type as keyof GeneratedContent];
                                            if (!savedItem) return null;
                                            
                                            return (
                                                <div key={option.type} className="flex items-center justify-between p-2 rounded-md bg-secondary/50 hover:bg-secondary">
                                                    <div className="flex items-center gap-3 font-medium">
                                                        <option.icon className="h-5 w-5 text-muted-foreground" />
                                                        {option.name}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button size="icon" variant="outline" onClick={() => setActiveView(option.type as ActiveView)}>
                                                            <Eye className="h-4 w-4"/>
                                                        </Button>
                                                        {(option.type === 'infographic' || option.type === 'podcast') && (
                                                            <Button size="icon" variant="outline" onClick={() => handleDownloadMedia(option.type as 'infographic' | 'podcast')}>
                                                                <Download className="h-4 w-4"/>
                                                            </Button>
                                                        )}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuItem onClick={() => handleDeleteGeneratedContent(option.type as keyof GeneratedContent)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                    <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
              </Tabs>
          )}
        </div>
         <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate New Content</DialogTitle>
                    <DialogDescription>Select a new type of study material to generate from your notes.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
                    {generationOptions.map((option) => {
                         const isAlreadyGenerated = !!note.generatedContent?.[option.type as keyof GeneratedContent];
                         return(
                            <Button key={option.name} variant="outline" className="h-24 flex-col gap-2" onClick={() => handleGenerateContent(option.type as keyof GeneratedContent)} disabled={!!isGenerating || isAlreadyGenerated}>
                                {isGenerating === option.type ? <Loader2 className="w-6 h-6 animate-spin" /> : <option.icon className="w-6 h-6 text-primary" />}
                                <span>{option.name}</span>
                                {isAlreadyGenerated && <span className="text-xs text-muted-foreground">(Generated)</span>}
                            </Button>
                        )
                    })}
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

function CreateNoteView({ onBack, initialTopic }: { onBack: () => void, initialTopic?: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const { data: firestoreUser } = useDoc(useMemo(() => user && firestore ? doc(firestore, 'users', user.uid) : null, [user, firestore]));

    const [topic, setTopic] = useState(initialTopic || "");
    const [academicLevel, setAcademicLevel] = useState<AcademicLevel | "">("");
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        if (firestoreUser?.educationalLevel && !academicLevel) {
            setAcademicLevel(firestoreUser.educationalLevel as AcademicLevel);
        }
    }, [firestoreUser, academicLevel]);

    const noteGeneratorLevels: { label: string, levels: GenerateStudyNotesInput['academicLevel'][] }[] = [
        {
          label: "Academic",
          levels: [
            "Junior High (JHS/BECE)",
            "Senior High (SHS/WASSCE)",
            "Undergraduate",
            "Masters",
            "PhD"
          ]
        },
        {
          label: "Professional",
          levels: [
            "Beginner",
            "Intermediate",
            "Advanced"
          ]
        },
        {
            label: "Other",
            levels: ["Other"]
        }
    ];

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
                                <SelectContent>
                                    {noteGeneratorLevels.map(group => (
                                        <SelectGroup key={group.label}>
                                            <SelectLabel>{group.label}</SelectLabel>
                                            {group.levels.map(level => (
                                                <SelectItem key={level} value={level}>
                                                    {level}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
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

function PodcastView({ podcast, onBack, topic }: { podcast: { podcastScript: string; podcastAudioUrl?: string }, onBack: () => void, topic: string }) {
    return (
        <Card>
            <CardHeader>
                <Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <CardTitle className="pt-4 flex items-center gap-2"> Podcast for "{topic}"</CardTitle>
                <CardDescription>Listen to the AI-generated podcast based on your sources.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {podcast.podcastAudioUrl ? (
                    <audio controls src={podcast.podcastAudioUrl} className="w-full"></audio>
                ) : (
                    <Alert variant="destructive">
                        <AlertTitle>Audio Not Available</AlertTitle>
                        <AlertDescription>
                            The podcast audio could not be loaded. It might need to be regenerated.
                        </AlertDescription>
                    </Alert>
                )}
                 <details className="w-full">
                    <summary className="cursor-pointer text-sm font-medium">View Script</summary>
                    <div className="mt-2 text-left max-h-80 overflow-y-auto rounded-md border bg-secondary/50 p-4">
                        <pre className="text-sm whitespace-pre-wrap font-body">{podcast.podcastScript}</pre>
                    </div>
                </details>
            </CardContent>
        </Card>
    );
}

function FlashcardView({ flashcards, onBack, topic }: { flashcards: GenerateFlashcardsOutput['flashcards'], onBack: (flippedPercentage: number) => void, topic: string }) {
    const [flippedStates, setFlippedStates] = useState<boolean[]>(Array(flashcards.length).fill(false));
    const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const flippedIndices = useRef(new Set<number>());
    const { toast } = useToast();

    const handleFlip = (index: number) => {
        flippedIndices.current.add(index);
        setFlippedStates(prev => {
            const newStates = [...prev];
            newStates[index] = !newStates[index];
            return newStates;
        });
    };

    const handleBack = () => {
        const flippedPercentage = (flippedIndices.current.size / flashcards.length) * 100;
        onBack(flippedPercentage);
    };

    const handlePrint = () => {
        const printContent = document.getElementById('flashcard-print-area')?.innerHTML;
        if (!printContent) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) { toast({ variant: 'destructive', title: 'Could not open print window' }); return; }
        const styles = Array.from(document.getElementsByTagName('link')).filter(link => link.rel === 'stylesheet').map(link => link.outerHTML).join('');
        const styleBlocks = Array.from(document.getElementsByTagName('style')).map(style => style.outerHTML).join('');
        printWindow.document.write(`<html><head><title>Print Flashcards</title>${styles}${styleBlocks}<style>@media print { @page { size: A4; margin: 20mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .flashcard-print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; } .flashcard-print-item { border: 1px solid #ccc; padding: 10px; page-break-inside: avoid; } .flashcard-print-item h4 { font-weight: bold; } }</style></head><body>${printContent}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 1000);
    };

    const currentCard = flashcards[currentCardIndex];

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <Button onClick={handleBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back</Button>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setViewMode('grid')} variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon"><Grid className="h-4 w-4"/></Button>
                        <Button onClick={() => setViewMode('single')} variant={viewMode === 'single' ? 'secondary' : 'ghost'} size="icon"><View className="h-4 w-4"/></Button>
                        <Button onClick={handlePrint} variant="ghost" size="icon"><Printer className="h-4 w-4"/></Button>
                    </div>
                </div>
                <CardTitle className="pt-4 flex items-center gap-2"> Flashcards for "{topic}"</CardTitle>
            </CardHeader>
            <CardContent>
                 {viewMode === 'grid' ? (
                    <div id="flashcard-print-area">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flashcard-print-grid">
                            {flashcards.map((card, index) => (
                                <div key={index} className="perspective-1000 flashcard-print-item" onClick={() => handleFlip(index)}>
                                    <div className={cn("relative w-full h-64 transform-style-3d transition-transform duration-500 cursor-pointer", flippedStates[index] && "rotate-y-180")}>
                                        <div className="absolute w-full h-full backface-hidden rounded-lg border bg-card flex items-center justify-center p-6 text-center"><div><h4 className="print-only">Front:</h4><p className="font-semibold text-lg">{card.front}</p></div></div>
                                        <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-lg border bg-secondary flex items-center justify-center p-6 text-center"><div><h4 className="print-only">Back:</h4><p className="text-sm">{card.back}</p></div></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                     <div>
                        <div className="perspective-1000 mx-auto max-w-lg" onClick={() => handleFlip(currentCardIndex)}>
                            <div className={cn("relative w-full h-80 transform-style-3d transition-transform duration-500 cursor-pointer", flippedStates[currentCardIndex] && "rotate-y-180")}>
                                <div className="absolute w-full h-full backface-hidden rounded-lg border bg-card flex items-center justify-center p-6 text-center"><p className="font-semibold text-xl">{currentCard.front}</p></div>
                                <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-lg border bg-secondary flex items-center justify-center p-6 text-center"><p>{currentCard.back}</p></div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-4 max-w-lg mx-auto">
                            <Button variant="outline" onClick={() => setCurrentCardIndex(p => p - 1)} disabled={currentCardIndex === 0}><ArrowLeft className="mr-2"/> Previous</Button>
                            <span className="text-sm text-muted-foreground">{currentCardIndex + 1} / {flashcards.length}</span>
                            <Button variant="outline" onClick={() => setCurrentCardIndex(p => p + 1)} disabled={currentCardIndex === flashcards.length - 1}>Next <ArrowRight className="ml-2"/></Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function QuizView({ quiz, onBack, topic }: { quiz: GenerateQuizOutput['quiz'], onBack: (score: number, total: number) => void, topic: string }) {
    const [shuffledQuiz, setShuffledQuiz] = useState(() => [...quiz].sort(() => Math.random() - 0.5));
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [quizState, setQuizState] = useState<'in-progress' | 'results'>('in-progress');
    const [score, setScore] = useState(0);
    const { toast } = useToast();

    if (!shuffledQuiz || shuffledQuiz.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <Button onClick={() => onBack(0, 0)} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back</Button>
                    <CardTitle className="pt-4">Quiz Error</CardTitle>
                    <CardDescription>No questions were generated for these sources.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const handleAnswerSelect = (answer: string) => {
        if (selectedAnswers[currentQuestionIndex] !== undefined) return;
        setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: answer }));
    };

    const handleSeeResults = () => {
        let finalScore = 0;
        shuffledQuiz.forEach((q, index) => { if(selectedAnswers[index] === q.correctAnswer) finalScore++; });
        setScore(finalScore);
        setQuizState('results');
    };

    const handleFinishAndGoBack = () => {
        onBack(score, shuffledQuiz.length);
    };

    const handleRestart = () => {
        setShuffledQuiz(prev => [...prev].sort(() => Math.random() - 0.5));
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setScore(0);
        setQuizState('in-progress');
    };

    const handlePrint = () => {
        const printContent = document.getElementById('quiz-results-print-area')?.innerHTML;
        if (!printContent) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) { toast({ variant: 'destructive', title: 'Could not open print window' }); return; }
        const styles = Array.from(document.getElementsByTagName('link')).filter(link => link.rel === 'stylesheet').map(link => link.outerHTML).join('');
        const styleBlocks = Array.from(document.getElementsByTagName('style')).map(style => style.outerHTML).join('');
        printWindow.document.write(`<html><head><title>Print Quiz Results</title>${styles}${styleBlocks}</head><body>${printContent}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 1000);
    };

    if (quizState === 'results') {
        return (
            <Card>
                <CardHeader><div className="flex justify-between items-start"><Button onClick={handleFinishAndGoBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back</Button><Button onClick={handlePrint} variant="ghost" size="icon"><Printer className="h-4 w-4"/></Button></div><CardTitle className="pt-4">Quiz Results for "{topic}"</CardTitle><CardDescription>You scored {score} out of {shuffledQuiz.length}</CardDescription></CardHeader>
                <CardContent id="quiz-results-print-area"><Progress value={(score / shuffledQuiz.length) * 100} className="w-full mb-4" /><div className="space-y-4">{shuffledQuiz.map((q, index) => (<Card key={index} className={cn(selectedAnswers[index] === q.correctAnswer ? "border-green-500" : "border-destructive")}><CardHeader><p className="font-semibold">{index + 1}. {q.questionText}</p></CardHeader><CardContent><p className="text-sm">Your answer: <span className={cn("font-bold", selectedAnswers[index] === q.correctAnswer ? "text-green-500" : "text-destructive")}>{selectedAnswers[index] || "Not answered"}</span></p><p className="text-sm">Correct answer: <span className="font-bold text-green-500">{q.correctAnswer}</span></p><details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Show Explanation</summary><p className="pt-1">{q.explanation}</p></details></CardContent></Card>))}</div></CardContent>
                <CardFooter><Button onClick={handleRestart}>Take Again</Button></CardFooter>
            </Card>
        );
    }
    
    const currentQuestion = shuffledQuiz[currentQuestionIndex];
    const isAnswered = selectedAnswers[currentQuestionIndex] !== undefined;
    return (
        <Card>
            <CardHeader><Button onClick={() => onBack(0,0)} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back</Button><CardTitle className="pt-4 flex items-center gap-2"> Quiz for "{topic}"</CardTitle><CardDescription>Question {currentQuestionIndex + 1} of {shuffledQuiz.length}</CardDescription><Progress value={((currentQuestionIndex + 1) / shuffledQuiz.length) * 100} className="w-full" /></CardHeader>
            <CardContent>
                <p className="font-semibold text-lg mb-4">{currentQuestion.questionText}</p>
                <RadioGroup onValueChange={handleAnswerSelect} value={selectedAnswers[currentQuestionIndex]} disabled={isAnswered}>
                    {currentQuestion.options.map((option, i) => {
                        const isCorrect = option === currentQuestion.correctAnswer;
                        const isSelected = selectedAnswers[currentQuestionIndex] === option;
                        return (<div key={i} className={cn("flex items-center space-x-3 space-y-0 p-3 rounded-md border cursor-pointer", isAnswered && isCorrect && "bg-green-100 dark:bg-green-900/50 border-green-500", isAnswered && isSelected && !isCorrect && "bg-red-100 dark:bg-red-900/50 border-destructive")} onClick={() => handleAnswerSelect(option)}><RadioGroupItem value={option} /><Label className="font-normal flex-1 cursor-pointer">{option}</Label>{isAnswered && isCorrect && <CheckCircle className="text-green-500" />}{isAnswered && isSelected && !isCorrect && <XCircle className="text-destructive" />}</div>);
                    })}
                </RadioGroup>
                {isAnswered && <Card className="mt-4 bg-secondary/50"><CardHeader className="flex-row items-center gap-2 pb-2"><Lightbulb className="w-5 h-5 text-yellow-500" /><CardTitle className="text-md">Explanation</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p></CardContent></Card>}
                {!isAnswered && currentQuestion.hint && <details className="mt-4 text-sm text-muted-foreground"><summary className="cursor-pointer">Need a hint?</summary><p className="pt-1">{currentQuestion.hint}</p></details>}
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => setCurrentQuestionIndex(p => p - 1)} disabled={currentQuestionIndex === 0}>Previous</Button>
                {currentQuestionIndex < shuffledQuiz.length - 1 ? <Button onClick={() => setCurrentQuestionIndex(p => p + 1)} disabled={!isAnswered}>Next</Button> : <Button onClick={handleSeeResults} disabled={!isAnswered}>See Results</Button>}
            </CardFooter>
        </Card>
    );
}


function SlideDeckView({ deck, onBack }: { deck: GenerateSlideDeckOutput, onBack: () => void }) {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const { toast } = useToast();
    const handlePrint = () => {
        const printContent = document.getElementById('deck-print-area')?.innerHTML;
        if (!printContent) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) { toast({ variant: 'destructive', title: 'Could not open print window' }); return; }
        const styles = Array.from(document.getElementsByTagName('link')).filter(link => link.rel === 'stylesheet').map(link => link.outerHTML).join('');
        const styleBlocks = Array.from(document.getElementsByTagName('style')).map(style => style.outerHTML).join('');
        printWindow.document.write(`<html><head><title>Print Deck</title>${styles}${styleBlocks}<style>@page { size: landscape; }</style></head><body>${printContent}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 1000);
    };
    const currentSlide = deck.slides[currentSlideIndex];
    return (
        <Card className="flex flex-col">
            <CardHeader><div className="flex justify-between items-start"><Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back</Button><Button onClick={handlePrint} variant="ghost" size="icon"><Printer className="h-4 w-4"/></Button></div><CardTitle className="pt-4 flex items-center gap-2"> {deck.title}</CardTitle><CardDescription>Slide {currentSlideIndex + 1} of {deck.slides.length}</CardDescription></CardHeader>
            <CardContent className="flex-1" id="deck-print-area">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 rounded-lg border p-6 bg-secondary/30 min-h-[40vh] flex flex-col justify-center"><h3 className="text-2xl font-bold mb-4">{currentSlide.title}</h3><div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{currentSlide.content}</ReactMarkdown></div></div>
                    <div className="md:col-span-1 rounded-lg border p-4 bg-background"><h4 className="font-semibold mb-2">Speaker Notes</h4><p className="text-sm text-muted-foreground">{currentSlide.speakerNotes}</p></div>
                </div>
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => setCurrentSlideIndex(p => p - 1)} disabled={currentSlideIndex === 0}>Previous</Button>
                <Button onClick={() => setCurrentSlideIndex(p => p + 1)} disabled={currentSlideIndex === deck.slides.length - 1}>Next</Button>
            </CardFooter>
        </Card>
    );
}

function InfographicView({ infographic, onBack, topic }: { infographic: { imageUrl?: string }, onBack: () => void, topic: string }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back</Button>
                    <Button variant="ghost" size="icon"><Download className="h-4 w-4"/></Button>
                </div>
                <CardTitle className="pt-4 flex items-center gap-2"> Infographic for "{topic}"</CardTitle>
                <CardDescription>An AI-generated visual summary of the key points.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
                 {infographic.imageUrl ? (
                    <div className="relative w-full aspect-square max-w-2xl border rounded-lg overflow-hidden bg-muted">
                        <Image src={infographic.imageUrl} alt={`Infographic for ${topic}`} fill className="object-contain" />
                    </div>
                ) : (
                    <Alert variant="destructive" className="w-full max-w-2xl">
                        <AlertTitle>Image Not Available</AlertTitle>
                        <AlertDescription>
                            The infographic image could not be loaded. It might need to be regenerated.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

function MindMapView({ mindMap, onBack, topic }: { mindMap: MindMapNodeData, onBack: () => void, topic: string }) {
    const [isAllExpanded, setIsAllExpanded] = useState(false);
    const [mindMapKey, setMindMapKey] = useState(Date.now());
    const { toast } = useToast();
    const mindMapRef = useRef<HTMLDivElement>(null);
    const exportMindMapRef = useRef<HTMLDivElement>(null);

    const handleExpandAll = () => {
        setIsAllExpanded(true);
        setMindMapKey(Date.now());
    };

    const handleCollapseAll = () => {
        setIsAllExpanded(false);
        setMindMapKey(Date.now());
    };
    
    const handleDownload = useCallback(() => {
        if (!exportMindMapRef.current) {
            toast({ variant: 'destructive', title: 'Download failed', description: 'Could not find the mind map element for export.' });
            return;
        }

        toast({ title: 'Generating image...', description: 'Please wait a moment.' });

        toPng(exportMindMapRef.current, { cacheBust: true, backgroundColor: 'white', pixelRatio: 2 })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `${topic.replace(/\s+/g, '_')}_mindmap.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error(err);
                toast({ variant: 'destructive', title: 'Download failed', description: 'Could not convert mind map to an image.' });
            });
    }, [topic, toast]);

    return (
        <Card>
            <CardHeader>
                 <div className="flex justify-between items-start">
                    <Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                     <div className="flex items-center gap-2">
                        <Button onClick={handleDownload} variant="ghost" size="icon"><Download className="h-4 w-4"/></Button>
                        <Button onClick={handleExpandAll} variant="ghost" size="icon"><Plus className="h-4 w-4"/></Button>
                        <Button onClick={handleCollapseAll} variant="ghost" size="icon"><Minus className="h-4 w-4"/></Button>
                    </div>
                </div>
                <CardTitle className="pt-4 flex items-center gap-2"> Mind Map for "{topic}"</CardTitle>
                <CardDescription>A visual breakdown of the key concepts.</CardDescription>
            </CardHeader>
            <CardContent>
                <InteractiveMindMap ref={mindMapRef} key={mindMapKey} data={mindMap} initialOpen={isAllExpanded} />
                <div className="absolute -left-[9999px] top-0 w-[1200px]" aria-hidden="true">
                    <InteractiveMindMap ref={exportMindMapRef} data={mindMap} initialOpen={true} />
                </div>
            </CardContent>
        </Card>
    );
}

export default function NoteGeneratorPageWrapper() {
    return (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin"/></div>}>
            <NoteGeneratorPage />
        </Suspense>
    )
}
