

"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link as LinkIcon, Youtube, Send, Loader2, Mic, Play, ArrowLeft, BookOpen, FileText, Image as ImageIcon, Globe, ClipboardPaste, ArrowRight, Search, Trash2, Camera, Sparkles, Bold, Italic, Strikethrough, List, Plus, GitFork, Presentation, Table, SquareStack, Music, Video, AreaChart, HelpCircle, MoreVertical, Eye, Download, Printer, Grid, View, FlipHorizontal, Lightbulb, CheckCircle, XCircle, Save, Pause, Volume2 } from "lucide-react";
import { interactiveChatWithSources, InteractiveChatWithSourcesInput, InteractiveChatWithSourcesOutput } from "@/ai/flows/interactive-chat-with-sources";
import { generatePodcastFromSources, GeneratePodcastFromSourcesOutput, GeneratePodcastFromSourcesInput } from "@/ai/flows/generate-podcast-from-sources";
import { searchWebForSources } from "@/ai/flows/search-web-for-sources";
import { generateFlashcards, GenerateFlashcardsOutput, GenerateFlashcardsInput } from "@/ai/flows/generate-flashcards";
import { generateQuiz, GenerateQuizOutput, GenerateQuizInput } from "@/ai/flows/generate-quiz";
import { generateSlideDeck, GenerateSlideDeckOutput, GenerateSlideDeckInput } from "@/ai/flows/generate-slide-deck";
import { generateSummaryFromSources } from "@/ai/flows/generate-summary-from-sources";
import { generateInfographic, GenerateInfographicOutput } from "@/ai/flows/generate-infographic";
import { generateMindMap, GenerateMindMapOutput } from "@/ai/flows/generate-mind-map";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { HomeHeader } from "@/components/layout/HomeHeader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InteractiveMindMap } from "@/components/mind-map/InteractiveMindMap";
import { useSearchParams, useRouter } from "next/navigation";


const createSpaceSchema = z.object({
    name: z.string().min(1, { message: "Space name is required." }),
    description: z.string().optional(),
});
type CreateSpaceFormSchema = z.infer<typeof createSpaceSchema>;

type Source = {
    type: 'pdf' | 'text' | 'audio' | 'website' | 'youtube' | 'image' | 'clipboard';
    name: string;
    url?: string;
    data?: string; // For file content or copied text
    contentType?: string;
};

type UserChatMessage = {
    id: string;
    role: 'user';
    content: string;
};
type AssistantChatMessage = {
    id: string;
    role: 'assistant';
    content: string;
    citations?: InteractiveChatWithSourcesOutput['citations'];
    isError?: boolean;
};
type ChatMessage = UserChatMessage | AssistantChatMessage;


type GeneratedContent = {
  flashcards?: GenerateFlashcardsOutput['flashcards'];
  quiz?: GenerateQuizOutput['quiz'];
  deck?: GenerateSlideDeckOutput;
  podcast?: GeneratePodcastFromSourcesOutput;
  summary?: string;
  infographic?: GenerateInfographicOutput;
  mindmap?: GenerateMindMapOutput;
};

type StudySpace = {
    id: number;
    name:string;
    description: string;
    sources: Source[];
    chatHistory?: ChatMessage[];
    generatedContent?: GeneratedContent;
};

type ViewState = 'list' | 'create' | 'edit';

type MockStudySpace = {
  id: number;
  name: string;
  description: string;
  sourceCount: number;
};

const mockStudySpaces: MockStudySpace[] = [
    { id: 1, name: "WASSCE Core Maths Prep", description: "All topics for the WASSCE core mathematics exam.", sourceCount: 12 },
    { id: 2, name: "Ghanaian History 1800-1957", description: "From the Ashanti Empire to Independence.", sourceCount: 7 },
    { id: 3, name: "Final Year Project - AI Tutors", description: "Research and resources for my final project on AI in education.", sourceCount: 23 },
    { id: 4, name: "Quantum Physics Basics", description: "Introductory concepts in quantum mechanics.", sourceCount: 5 },
    { id: 5, name: "BECE Social Studies", description: "Revision notes for all BECE social studies topics.", sourceCount: 15 },
    { id: 6, name: "Intro to Python Programming", description: "Basics of Python for beginners.", sourceCount: 10 },
];


function StudySpacesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [viewState, setViewState] = useState<ViewState>('list');
  
  const [selectedStudySpace, setSelectedStudySpace] = useState<StudySpace | null>(null);
  const [studySpaces, setStudySpaces] = useState<StudySpace[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);

  const [isAddSourcesOpen, setIsAddSourcesOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();

  const [notes, setNotes] = useState("");
  const [isNotesDirty, setIsNotesDirty] = useState(false);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [isGenerating, setIsGenerating] = useState<keyof GeneratedContent | null>(null);
  const [activeGeneratedView, setActiveGeneratedView] = useState<keyof GeneratedContent | null>(null);

  // Voice Chat State
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    try {
        const savedSpaces = localStorage.getItem('learnwithtemi_study_spaces');
        if (savedSpaces) {
            setStudySpaces(JSON.parse(savedSpaces));
        } else {
            // First time load: use mock data.
             const initialSpaces = mockStudySpaces.map(({ sourceCount, ...s }) => ({...s, sources: [], chatHistory: [], generatedContent: {} }));
            setStudySpaces(initialSpaces);
        }
    } catch (error) {
        console.error("Failed to parse study spaces from localStorage", error);
        const initialSpaces = mockStudySpaces.map(({ sourceCount, ...s }) => ({...s, sources: [], chatHistory: [], generatedContent: {} }));
        setStudySpaces(initialSpaces);
    }
  }, []);

  // Effect to handle deep linking via URL
  useEffect(() => {
    const spaceId = searchParams.get('spaceId');
    if (spaceId && studySpaces.length > 0) {
        const space = studySpaces.find(s => s.id.toString() === spaceId);
        if (space) {
            handleSelectStudySpace(space);
            // Clean the URL to avoid re-triggering
            router.replace('/home/study-spaces');
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studySpaces, searchParams]);

  const getSavableContent = (content?: GeneratedContent): GeneratedContent | undefined => {
    if (!content) return undefined;
    const savable = JSON.parse(JSON.stringify(content));
    delete savable.quiz;
    if (savable.podcast) savable.podcast.podcastAudio = "";
    if (savable.infographic) savable.infographic.imageUrl = "";
    return savable;
  };

  useEffect(() => {
    try {
        if (studySpaces && studySpaces.length > 0) {
            const spacesToSave = studySpaces.map(space => ({
                ...space,
                generatedContent: getSavableContent(space.generatedContent),
            }));
            localStorage.setItem('learnwithtemi_study_spaces', JSON.stringify(spacesToSave));
        }
    } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
             toast({
                variant: "destructive",
                title: "Storage Full",
                description: "Browser local storage is full. Could not save all Study Spaces.",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Could not save study spaces",
                description: "There was an error saving your data locally."
            });
        }
        console.error("Failed to save study spaces to localStorage", error);
    }
  }, [studySpaces, toast]);


  useEffect(() => {
    const generateSummary = async () => {
        if (selectedStudySpace && selectedStudySpace.sources.length > 0 && !selectedStudySpace.generatedContent?.summary && !isGenerating) {
            setIsGenerating('summary');
            try {
                const result = await generateSummaryFromSources({
                    sources: selectedStudySpace.sources.map(s => ({...s, type: s.type === 'clipboard' ? 'text' : s.type as any }))
                });
                updateSelectedStudySpace(current => {
                    const newGeneratedContent = { ...(current.generatedContent || {}), summary: result.summary };
                    return { generatedContent: newGeneratedContent };
                });
            } catch (e: any) {
                console.error("Summary generation error", e);
                toast({
                    variant: 'destructive',
                    title: 'Could not generate AI summary',
                    description: e.message || 'An unexpected error occurred.',
                });
            } finally {
                setIsGenerating(null);
            }
        }
    }
    generateSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudySpace]);

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
    if (!currentInput?.trim() || !selectedStudySpace) return;
    
    const userMessage: UserChatMessage = { id: `user-${Date.now()}`, role: 'user', content: currentInput };
    
    updateSelectedStudySpace(current => ({
        chatHistory: [...(current.chatHistory || []), userMessage]
    }));

    setIsChatLoading(true);

    try {
        const sourceInputs: InteractiveChatWithSourcesInput['sources'] = selectedStudySpace.sources.map(s => ({
            name: s.name,
            type: s.type === 'clipboard' ? 'text' : s.type,
            url: s.url,
            dataUri: s.data,
            contentType: s.contentType,
        }));

        const response = await interactiveChatWithSources({
            sources: sourceInputs,
            question: currentInput
        });
        
        const assistantMessage: AssistantChatMessage = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: response.answer,
            citations: response.citations
        };

        updateSelectedStudySpace(current => ({
            chatHistory: [...(current.chatHistory || []), assistantMessage]
        }));
        
        if (isVoiceInput) {
            await handlePlayAudio(assistantMessage.id, response.answer);
        }

    } catch (e: any) {
        console.error("Chat error", e);
        const errorMessage: AssistantChatMessage = {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: e.message || "Sorry, I couldn't process that request.",
            isError: true
        };
        updateSelectedStudySpace(current => ({
            chatHistory: [...(current.chatHistory || []), errorMessage]
        }));
    } finally {
        setIsChatLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudySpace, toast, handlePlayAudio]);
  
  // Voice Chat Effect
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


  const handleSaveNotes = () => {
    // In a real app, this would save to a backend.
    console.log("Saving notes:", notes);
    setIsNotesDirty(false);
    toast({
      title: "Notes Saved",
      description: "Your personal notes have been saved.",
    });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNotes(e.target.value);
      setIsNotesDirty(true);
  }

  const applyMarkdownFormatting = (type: 'bold' | 'italic' | 'strikethrough' | 'bullet') => {
      const textarea = notesTextareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start === end && type !== 'bullet') return;

      const selectedText = notes.substring(start, end);
      let newText = '';
      let newSelectionStart = start;
      let newSelectionEnd = end;

      if (type === 'bullet') {
          const lines = selectedText.split('\n');
          const bulletedLines = lines.map(line => `- ${line}`);
          const replacement = bulletedLines.join('\n');

          newText = `${notes.substring(0, start)}${replacement}${notes.substring(end)}`;
          newSelectionStart = start;
          newSelectionEnd = start + replacement.length;
      } else {
          let marker = '';
          switch (type) {
              case 'bold': marker = '**'; break;
              case 'italic': marker = '*'; break;
              case 'strikethrough': marker = '~~'; break;
          }

          newText = `${notes.substring(0, start)}${marker}${selectedText}${marker}${notes.substring(end)}`;
          newSelectionStart = start + marker.length;
          newSelectionEnd = end + marker.length;
      }
      
      setNotes(newText);
      setIsNotesDirty(true);

      setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
      }, 0);
  };

  const handleShowCreateView = () => {
    setViewState('create');
  };
  
  const handleSelectStudySpace = (space: StudySpace) => {
    setSelectedStudySpace(space);
    setActiveGeneratedView(null);
    setViewState('edit');
    setIsDirty(false);
  };

  const handleBackToList = () => {
    setSelectedStudySpace(null);
    setViewState('list');
    router.replace('/home/study-spaces');
  };
  
  const handleCreateStudySpace = (name: string, description: string, sources: Source[]) => {
    const newSpace: StudySpace = {
        id: Date.now(),
        name,
        description,
        sources,
        chatHistory: [],
        generatedContent: {},
    };
    setStudySpaces(prev => [newSpace, ...prev]);
    setSelectedStudySpace(newSpace);
    setActiveGeneratedView(null);
    setViewState('edit');
  };

  const updateSelectedStudySpace = (update: Partial<StudySpace> | ((current: StudySpace) => Partial<StudySpace>)) => {
    setSelectedStudySpace(prev => {
        if (!prev) return null;
        const changes = typeof update === 'function' ? update(prev) : update;
        const newSpace = { ...prev, ...changes };

        setStudySpaces(currentSpaces => currentSpaces.map(s => s.id === newSpace.id ? newSpace : s));
        
        return newSpace;
    });
  };

  const handleDeleteSource = (indexToDelete: number) => {
    if (!selectedStudySpace) return;
    const newSources = selectedStudySpace.sources.filter((_, index) => index !== indexToDelete);
    updateSelectedStudySpace({ sources: newSources });
    setIsDirty(true);
  };

  const handleAddMoreSources = (newSources: Source[]) => {
    if (newSources.length > 0) {
      updateSelectedStudySpace(current => ({ sources: [...current.sources, ...newSources] }));
      setIsDirty(true);
    }
  };

  const handleUpdateStudySpace = () => {
    setIsDirty(false);
    toast({
        title: "Study Space Updated",
        description: `${selectedStudySpace?.name} has been updated.`,
    });
  };

  const parseAnswerWithCitations = (answer: string, citations: InteractiveChatWithSourcesOutput['citations'], sources: Source[]) => {
    if (!citations) return answer;

    // First, aggressively remove any leftover multi-number citations like [6, 7] or [0, 5, 6, 7].
    const cleanedAnswer = answer.replace(/\[\d+[, ]\d+.*?\]/g, '');

    const parts = cleanedAnswer.split(/(\[\d+\])/g);
    
    return parts.map((part, index) => {
        const match = part.match(/\[(\d+)\]/);
        if (match) {
            const citationIndex = parseInt(match[1], 10);
            
            if (citationIndex >= 0 && citationIndex < citations.length) {
                const citation = citations[citationIndex];
                const source = sources[citation.sourceIndex];
                if (!source) return null; // Safety check if sourceIndex is out of bounds

                return (
                    <Popover key={index}>
                        <PopoverTrigger asChild>
                            <span className="inline-block align-super text-xs font-bold bg-primary/20 text-primary rounded-full h-5 w-5 text-center leading-5 cursor-pointer mx-0.5">{citation.sourceIndex + 1}</span>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Source</h4>
                                <p className="text-xs text-muted-foreground truncate">{source.name}</p>
                                <Separator />
                                <h4 className="font-semibold text-sm">Reference</h4>
                                <blockquote className="text-xs border-l-2 pl-2 italic">
                                    &quot;{citation.text}&quot;
                                </blockquote>
                            </div>
                        </PopoverContent>
                    </Popover>
                );
            }
            return null;
        }
        if (typeof part === 'string') {
            return <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} components={{ p: 'span' }}>{part}</ReactMarkdown>
        }
        return part;
    }).filter(Boolean);
};

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    const currentInput = chatInputRef.current?.value;
    submitChat(currentInput || '', false);
    if(chatInputRef.current) chatInputRef.current.value = ""; // Clear input immediately
  }

  const handleGenerateContent = async (type: keyof GeneratedContent) => {
    if (!selectedStudySpace || selectedStudySpace.sources.length === 0) {
      toast({ variant: 'destructive', title: 'No sources', description: 'Add sources to your study space before generating content.' });
      return;
    }
    setIsGenerating(type);
    setActiveGeneratedView(null);

    try {
      let result;
      const input = {
          context: 'study-space',
          sources: selectedStudySpace.sources.map(s => ({...s, type: s.type === 'clipboard' ? 'text' : s.type as any }))
      } as GeneratePodcastFromSourcesInput | GenerateFlashcardsInput | GenerateQuizInput | GenerateSlideDeckInput;
      
      if (type === 'podcast') {
        result = await generatePodcastFromSources(input as GeneratePodcastFromSourcesInput);
      } else {
        const generationMap: {
            [K in 'flashcards' | 'quiz' | 'deck' | 'infographic' | 'mindmap']: (input: any) => Promise<any>
        } = {
            'flashcards': generateFlashcards,
            'quiz': generateQuiz,
            'deck': generateSlideDeck,
            'infographic': generateInfographic,
            'mindmap': generateMindMap,
        };
        const generator = generationMap[type as 'flashcards' | 'quiz' | 'deck' | 'infographic' | 'mindmap'];
        const rawResult = await generator(input);
        
        if (type === 'flashcards') {
            result = (rawResult as GenerateFlashcardsOutput).flashcards;
        } else if (type === 'quiz') {
            result = (rawResult as GenerateQuizOutput).quiz;
        } else {
            result = rawResult;
        }
      }
      
      updateSelectedStudySpace(current => {
          const newGeneratedContent = { ...(current.generatedContent || {}), [type]: result };
          return { generatedContent: newGeneratedContent };
      });
      
      setActiveGeneratedView(type);
    } catch (e: any) {
      toast({ variant: 'destructive', title: `Failed to generate ${type}`, description: e.message });
    } finally {
      setIsGenerating(null);
    }
  };
  
  const handleDeleteGeneratedContent = (type: keyof GeneratedContent) => {
    if (!selectedStudySpace) return;
    
    updateSelectedStudySpace(current => {
        const newGeneratedContent = { ...current.generatedContent };
        delete newGeneratedContent[type];
        return { generatedContent: newGeneratedContent };
    });

    toast({ title: 'Content Deleted', description: 'The generated content has been removed.' });
  };

  const handleDeleteStudySpace = (spaceId: number) => {
    setStudySpaces(prev => prev.filter(space => space.id !== spaceId));
    toast({
      title: "Study Space Deleted",
      description: "The study space has been removed.",
    });
  };

  
  if (viewState === 'create') {
    return <CreateStudySpaceView onCreate={handleCreateStudySpace} onBack={handleBackToList} />
  }

  if (viewState === 'edit' && selectedStudySpace) {
    const header = (
        <HomeHeader left={
            <Button variant="outline" onClick={handleBackToList}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Spaces
            </Button>
        }/>
    );

    const generatedContent = selectedStudySpace.generatedContent || {};

    const generationOptions: { name: string; icon: React.ElementType; type: keyof GeneratedContent }[] = [
        { name: "Podcast", icon: Mic, type: "podcast" },
        { name: "Quiz", icon: HelpCircle, type: "quiz" },
        { name: "Slide Deck", icon: Presentation, type: "deck" },
        { name: "Flashcards", icon: SquareStack, type: "flashcards" },
        { name: "Infographic", icon: AreaChart, type: "infographic" },
        { name: "Mind Map", icon: GitFork, type: "mindmap" },
    ];
    
    const renderGeneratedContent = () => {
        if (!activeGeneratedView) return null;
        if (activeGeneratedView === 'flashcards' && generatedContent.flashcards) {
            return <FlashcardView flashcards={generatedContent.flashcards} onBack={() => setActiveGeneratedView(null)} topic={selectedStudySpace.name} />;
        }
        if (activeGeneratedView === 'quiz' && generatedContent.quiz) {
            return <QuizView quiz={generatedContent.quiz} onBack={() => setActiveGeneratedView(null)} topic={selectedStudySpace.name} />;
        }
        if (activeGeneratedView === 'deck' && generatedContent.deck) {
            return <SlideDeckView deck={generatedContent.deck} onBack={() => setActiveGeneratedView(null)} />;
        }
        if (activeGeneratedView === 'podcast' && generatedContent.podcast) {
            return <PodcastView podcast={generatedContent.podcast} onBack={() => setActiveGeneratedView(null)} topic={selectedStudySpace.name}/>
        }
        if (activeGeneratedView === 'infographic' && generatedContent.infographic) {
            return <InfographicView infographic={generatedContent.infographic} onBack={() => setActiveGeneratedView(null)} topic={selectedStudySpace.name} />;
        }
        if (activeGeneratedView === 'mindmap' && generatedContent.mindmap) {
             return <InteractiveMindMapWrapper data={generatedContent.mindmap} onBack={() => setActiveGeneratedView(null)} topic={selectedStudySpace.name} />;
        }
        return null;
    }

    const renderChatMessages = (messages: ChatMessage[], sources: Source[]) => {
      return messages.map((msg) => (
        <div key={msg.id} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
          {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5"/></div>}
          <div className={cn("p-3 rounded-lg max-w-[85%] break-words", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {msg.role === 'user' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              ) : msg.isError ? (
                <p className="text-destructive">{msg.content}</p>
              ) : msg.citations && msg.citations.length > 0 ? (
                <>{parseAnswerWithCitations(msg.content, msg.citations, sources)}</>
              ) : (
                typeof msg.content === 'string' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground">[Unsupported Content]</p>
                )
              )}
            </div>
             {msg.role === 'assistant' && typeof msg.content === 'string' && (
                <div className="text-right mt-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-secondary-foreground/10 hover:bg-secondary-foreground/20"
                        onClick={() => {if(typeof msg.content === 'string') handlePlayAudio(msg.id, msg.content)}}
                        disabled={isChatLoading}
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
      ));
    };

    return (
        <div className="flex flex-col">
            {header}
            <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
                <Tabs defaultValue="intro" className="w-full flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-4 bg-secondary">
                        <TabsTrigger value="intro">Intro</TabsTrigger>
                        <TabsTrigger value="sources">Sources ({selectedStudySpace.sources.length})</TabsTrigger>
                        <TabsTrigger value="chat">Chat</TabsTrigger>
                        <TabsTrigger value="generate">Generate</TabsTrigger>
                    </TabsList>

                    <TabsContent value="intro" className="mt-4 flex-1">
                        <Tabs defaultValue="ai-summary" className="w-full h-full flex flex-col">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="ai-summary">AI Summary</TabsTrigger>
                                <TabsTrigger value="personal-notes">Personal Notes</TabsTrigger>
                            </TabsList>
                            <TabsContent value="ai-summary" className="mt-4 flex-1">
                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle className="text-3xl font-headline font-bold">{selectedStudySpace.name}</CardTitle>
                                        <CardDescription className="text-muted-foreground pt-1">{selectedStudySpace.description}</CardDescription>
                                        <Separator className="my-4" />
                                        <h3 className="text-xl font-headline font-bold flex items-center gap-2 pt-2">
                                            <Sparkles className="w-5 h-5 text-primary" />
                                            AI Summary
                                        </h3>
                                    </CardHeader>
                                    <CardContent>
                                        {isGenerating === 'summary' ? (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Generating summary...
                                            </div>
                                        ) : selectedStudySpace.generatedContent?.summary ? (
                                            <p className="text-sm text-muted-foreground">
                                                {selectedStudySpace.generatedContent.summary}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                Add sources to your study space and an AI summary will be automatically generated here.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="personal-notes" className="mt-4 flex-1 flex flex-col">
                                <Card className="flex-1 flex flex-col">
                                    <CardHeader className="flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>Personal Notes</CardTitle>
                                            <CardDescription>Jot down your thoughts and ideas here. Use markdown for formatting.</CardDescription>
                                        </div>
                                        <Button onClick={handleSaveNotes} disabled={!isNotesDirty}>
                                            Save Notes
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col p-0">
                                        <Tabs defaultValue="write" className="w-full h-full flex flex-col">
                                            <TabsList className="mx-6">
                                                <TabsTrigger value="write">Write</TabsTrigger>
                                                <TabsTrigger value="preview">Preview</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="write" className="flex-1 flex flex-col p-6 pt-2">
                                                <div className="border border-b-0 rounded-t-md p-1 flex items-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => applyMarkdownFormatting('bold')}><Bold className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="sm" onClick={() => applyMarkdownFormatting('italic')}><Italic className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="sm" onClick={() => applyMarkdownFormatting('strikethrough')}><Strikethrough className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="sm" onClick={() => applyMarkdownFormatting('bullet')}><List className="h-4 w-4" /></Button>
                                                </div>
                                                <Textarea 
                                                    ref={notesTextareaRef}
                                                    placeholder="Start typing your notes..." 
                                                    className="flex-1 w-full min-h-[400px] resize-y border rounded-b-md rounded-t-none focus-visible:ring-1 focus-visible:ring-offset-0"
                                                    value={notes}
                                                    onChange={handleNotesChange}
                                                />
                                            </TabsContent>
                                            <TabsContent value="preview" className="flex-1 p-6">
                                                <div className="prose dark:prose-invert max-w-none h-full overflow-y-auto rounded-md border p-4">
                                                    {notes ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown> : <p className="text-muted-foreground">Nothing to preview yet.</p>}
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </TabsContent>

                    <TabsContent value="sources" className="mt-4 w-full max-w-0 min-w-full">
                        <Card>
                            <CardHeader className="flex-row items-center justify-between">
                                <CardTitle>Your Sources ({selectedStudySpace.sources.length})</CardTitle>
                                <Button onClick={() => setIsAddSourcesOpen(true)}>Add More Sources</Button>
                            </CardHeader>
                            <CardContent>
                                {selectedStudySpace.sources.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No sources added yet. Click &quot;Add More Sources&quot; to begin.</p>
                                ) : (
                                    <ul className="space-y-2">
                                    {selectedStudySpace.sources.map((s, i) => (
                                        <li key={i} className="flex items-start text-sm gap-2 p-2 bg-secondary rounded-md">
                                            {s.type === 'pdf' && <FileText className="w-4 h-4 mt-0.5"/>}
                                            {s.type === 'text' && <FileText className="w-4 h-4 mt-0.5"/>}
                                            {s.type === 'audio' && <Mic className="w-4 h-4 mt-0.5"/>}
                                            {s.type === 'image' && <ImageIcon className="w-4 h-4 mt-0.5"/>}
                                            {s.type === 'website' && <Globe className="w-4 h-4 mt-0.5"/>}
                                            {s.type === 'youtube' && <Youtube className="w-4 h-4 mt-0.5"/>}
                                            {s.type === 'clipboard' && <ClipboardPaste className="w-4 h-4 mt-0.5"/>}
                                            <span className="flex-1 min-w-0 break-words">{s.name}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0" onClick={() => handleDeleteSource(i)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </li>
                                    ))}
                                    </ul>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button disabled={!isDirty} onClick={handleUpdateStudySpace}>Update Study Space</Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="chat" className="mt-4 flex-1 flex flex-col">
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {(selectedStudySpace.chatHistory || []).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                                <BookOpen className="w-12 h-12 mx-auto text-primary/80 mb-4" />
                                <h3 className="font-semibold text-foreground text-lg">Chat with Your Sources</h3>
                                <p className="mt-2 text-sm">
                                    Ask me a question and I will answer based solely on the materials you've provided.
                                </p>
                            </div>
                        ) : renderChatMessages(selectedStudySpace.chatHistory || [], selectedStudySpace.sources)}
                        {isChatLoading && <div className="flex justify-start"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                      </div>
                      <div className="p-4 border-t bg-background">
                        <form onSubmit={handleChatSubmit}>
                            <div className="relative">
                                <Textarea
                                    ref={chatInputRef}
                                    placeholder="Ask a question about your sources..."
                                    className="pr-20"
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e as any); }}}
                                    disabled={selectedStudySpace.sources.length === 0 || isChatLoading || isListening}
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <Button size="icon" variant="ghost" className={cn("h-8 w-8", isListening && "text-destructive")} onClick={handleMicClick} type="button" disabled={isChatLoading}>
                                        {speakingMessageId ? <Pause className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                    </Button>
                                    <Button size="icon" className="h-8 w-8" type="submit" disabled={selectedStudySpace.sources.length === 0 || isChatLoading || isListening}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </form>
                         <audio ref={audioRef} onEnded={() => setSpeakingMessageId(null)} className="hidden"/>
                      </div>
                    </TabsContent>

                    <TabsContent value="generate" className="mt-4">
                        {activeGeneratedView ? renderGeneratedContent() : (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Generate from Sources</CardTitle>
                                    <CardDescription>Create study materials from the sources you've added.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <h3 className="font-semibold mb-4">Generate New</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                            {generationOptions.map((option) => (
                                                <Button key={option.name} variant="outline" className="h-24 flex-col gap-2" onClick={() => handleGenerateContent(option.type)} disabled={isGenerating !== null}>
                                                    {isGenerating === option.type ? <Loader2 className="w-6 h-6 animate-spin" /> : <option.icon className="w-6 h-6 text-primary" />}
                                                    <span>{option.name}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {(() => {
                                        const savedContent = { ...(generatedContent || {}) };
                                        delete savedContent.quiz; // Don't show quiz in saved content
                                        
                                        const savedItems = Object.entries(savedContent).filter(([_, value]) => !!value);
                                        
                                        return savedItems.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold mb-4">Previously Generated</h3>
                                            <div className="space-y-2">
                                                {savedItems.map(([type]) => {
                                                    const option = generationOptions.find(o => o.type === type);
                                                    if (!option) return null;
                                                    
                                                    return (
                                                        <div key={type} className="flex items-center justify-between p-2 rounded-md bg-secondary/50 hover:bg-secondary">
                                                            <Button variant="ghost" className="flex-1 justify-start gap-2" onClick={() => setActiveGeneratedView(type as keyof GeneratedContent)}>
                                                                <option.icon className="h-5 w-5 text-muted-foreground" />
                                                                View Generated {option.name}
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent>
                                                                    <DropdownMenuItem onClick={() => handleDeleteGeneratedContent(type as keyof GeneratedContent)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                        <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
                <AddSourcesDialog open={isAddSourcesOpen} onOpenChange={setIsAddSourcesOpen} onAddSources={handleAddMoreSources} />
            </div>
        </div>
    )
  }

  return (
    <>
      <HomeHeader />
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex justify-between items-center gap-4">
          <div>
              <h1 className="text-3xl font-headline font-bold">Study Spaces</h1>
              <p className="text-muted-foreground mt-1 text-balance">Create your personal knowledge hub.</p>
          </div>
          <Button onClick={handleShowCreateView} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" /> Create New
          </Button>
        </div>
        <p className="text-muted-foreground bg-secondary p-4 rounded-lg">Upload PDFs, text files, and audio, or add links from websites and YouTube. Then, chat with your AI assistant, TEMI, to get answers and insights based solely on your materials.</p>
        
        <div className="pt-8">
          <h2 className="text-2xl font-headline font-bold mb-4">Your Spaces</h2>
           {studySpaces.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-12 border-dashed">
                  <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground">No study spaces yet.</h3>
                  <p className="text-muted-foreground mb-4">Click the button above to create your first one!</p>
              </Card>
           ) : (
              <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {studySpaces.slice(0, visibleCount).map(space => (
                          <Card key={space.id} className="cursor-pointer hover:shadow-lg transition-shadow relative" onClick={() => handleSelectStudySpace(space)}>
                              <CardHeader>
                                  <CardTitle>{space.name}</CardTitle>
                                  <CardDescription>{space.description}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                  <p className="text-sm font-bold text-primary">{space.sources.length} sources</p>
                              </CardContent>
                               <div className="absolute top-1 right-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteStudySpace(space.id); }} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                          </Card>
                      ))}
                  </div>
                  {visibleCount < studySpaces.length && (
                      <div className="text-center mt-8">
                          <Button variant="outline" onClick={() => setVisibleCount(prev => prev + 5)}>Load More</Button>
                      </div>
                  )}
              </>
           )}
        </div>
      </div>
    </>
  );
}

function CreateStudySpaceView({ onCreate, onBack }: { onCreate: (name: string, description: string, sources: Source[]) => void; onBack: () => void; }) {
    const [stage, setStage] = useState<'details' | 'sources'>('details');
    const [spaceDetails, setSpaceDetails] = useState({ name: "", description: "" });
    const { toast } = useToast();

    const detailsForm = useForm<CreateSpaceFormSchema>({
        resolver: zodResolver(createSpaceSchema),
        defaultValues: { name: "", description: "" },
    });

    const [sources, setSources] = useState<Source[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [copiedText, setCopiedText] = useState("");
    const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
    const [urlModalConfig, setUrlModalConfig] = useState<{type: 'youtube' | 'website', name: string, icon: React.ElementType} | null>(null);
    const [currentUrl, setCurrentUrl] = useState("");
    
    // Web search state
    const [searchQuery, setSearchQuery] = useState("");
    type SourceSearchResult = { title: string; url: string; snippet: string; };
    const [searchResults, setSearchResults] = useState<SourceSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [selectedWebSources, setSelectedWebSources] = useState<SourceSearchResult[]>([]);

    const handleDeleteSource = (indexToDelete: number) => {
        setSources(prev => prev.filter((_, index) => index !== indexToDelete));
    };

    const handleFileButtonClick = (accept: string) => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = accept;
            fileInputRef.current.removeAttribute('capture');
            fileInputRef.current.value = ""; // Reset to allow same file selection
            fileInputRef.current.click();
        }
    };

    const handleOpenUrlModal = (type: 'youtube' | 'website', name: string, icon: React.ElementType) => {
        setUrlModalConfig({ type, name, icon });
        setCurrentUrl("");
        setIsUrlModalOpen(true);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUri = e.target?.result as string;

            let fileType: Source['type'] = 'text';

            if (file.type.startsWith('image/')) {
                fileType = 'image';
            } else if (file.type.startsWith('audio/')) {
                fileType = 'audio';
            } else if (file.type === 'application/pdf') {
                fileType = 'pdf';
            }

            const newSource: Source = { type: fileType, name: file.name, data: dataUri, contentType: file.type };
            setSources(prev => [...prev, newSource]);
        };
        reader.readAsDataURL(file);
    };
    
    const handleAddCopiedText = () => {
        if (!copiedText.trim()) return;
        const newSource: Source = { type: 'clipboard', name: `Pasted Text (${copiedText.substring(0, 15)}...)`, data: copiedText, contentType: 'text/plain' };
        setSources(prev => [...prev, newSource]);
        setCopiedText("");
        setIsTextModalOpen(false);
    };

    const handleAddUrl = () => {
        if (!currentUrl.trim() || !urlModalConfig) return;
        const newSource: Source = { type: urlModalConfig.type, name: currentUrl, url: currentUrl };
        setSources(prev => [...prev, newSource]);
        setCurrentUrl("");
        setIsUrlModalOpen(false);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchResults([]);
        setSelectedWebSources([]);
        setIsSearchModalOpen(true);
        try {
            const response = await searchWebForSources({ query: searchQuery });
            setSearchResults(response.results);
        } catch (e: any) {
            console.error("Web search failed", e);
            toast({
                variant: 'destructive',
                title: 'Search Failed',
                description: e.message || 'Could not fetch web results. Please try again.',
            });
        } finally {
            setIsSearching(false);
        }
    }
    
    const handleAddSelectedSources = () => {
        const newSources: Source[] = selectedWebSources.map(result => {
            const isYoutube = result.url.includes('youtube.com') || result.url.includes('youtu.be');
            return {
                type: isYoutube ? 'youtube' : 'website',
                name: result.title,
                url: result.url
            };
        });

        if (newSources.length > 0) {
            const sourcesToAdd = newSources.filter(ns => 
                !sources.some(s => s.url === ns.url)
            );
            setSources(prev => [...prev, ...sourcesToAdd]);
        }
        setIsSearchModalOpen(false);
    };

    const sourceButtons = [
        { name: "PDF", icon: FileText, action: () => handleFileButtonClick("application/pdf") },
        { name: "Audio", icon: Mic, action: () => handleFileButtonClick("audio/*") },
        { name: "Image", icon: ImageIcon, action: () => handleFileButtonClick("image/*") },
        { name: "Website", icon: Globe, action: () => handleOpenUrlModal('website', 'Website', Globe) },
        { name: "YouTube", icon: Youtube, action: () => handleOpenUrlModal('youtube', 'YouTube', Youtube) },
        { name: "Text", icon: ClipboardPaste, action: () => setIsTextModalOpen(true) },
    ];

    const handleNext = (values: CreateSpaceFormSchema) => {
        setSpaceDetails({ name: values.name, description: values.description || "No description." });
        setStage('sources');
    };

    const handleCreate = () => {
        onCreate(spaceDetails.name, spaceDetails.description, sources);
    };
    
    const header = (
        <HomeHeader left={
             <Button variant="outline" onClick={stage === 'details' ? onBack : () => setStage('details')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {stage === 'details' ? "Back to All Spaces" : "Back"}
            </Button>
        } />
    );

    return (
        <div className="flex flex-col min-h-screen">
            {header}
            <div className="p-4 sm:p-6 lg:p-8 space-y-8 flex-1">
                 <Card className="max-w-3xl mx-auto">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-headline">Create a New Study Space</CardTitle>
                        <CardDescription>
                            {stage === 'details' 
                                ? "Step 1 of 2: Give your new space a name and a short description."
                                : "Step 2 of 2: Now, add sources to your study space."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {stage === 'details' && (
                             <Form {...detailsForm}>
                                <form onSubmit={detailsForm.handleSubmit(handleNext)} className="space-y-6">
                                    <FormField control={detailsForm.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Study Space Name</FormLabel>
                                            <FormControl><Input placeholder="e.g., The Process of Photosynthesis" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={detailsForm.control} name="description" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description (optional)</FormLabel>
                                            <FormControl><Textarea placeholder="A short description of what this space is about." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <div className="flex justify-end">
                                        <Button type="submit" variant="ghost" className="group">
                                            Next
                                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        )}

                        {stage === 'sources' && (
                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <h3 className="font-semibold text-lg text-center">Add Sources</h3>
                                    
                                    <div className="flex w-full items-center space-x-2">
                                        <Input
                                            placeholder="Search the web for articles, videos..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                                        />
                                        <Button onClick={handleSearch} disabled={isSearching} size="icon">
                                            <Search className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="relative py-2">
                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                            <div className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="bg-card px-2 text-sm text-muted-foreground">
                                                Or Add Manually
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {sourceButtons.map(btn => (
                                            <Button key={btn.name} variant="outline" className="h-20 text-base flex-col" onClick={btn.action}><btn.icon className="mb-1 h-6 w-6"/>{btn.name}</Button>
                                        ))}
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                </div>

                                {sources.length > 0 && (
                                    <div className="space-y-2">
                                    <h4 className="font-semibold">Added Sources ({sources.length})</h4>
                                    <ul className="space-y-2 max-h-60 overflow-y-auto rounded-md border p-2">
                                            {sources.map((s, i) => (
                                                <li key={i} className="flex items-start text-sm gap-2 p-2 bg-secondary rounded-md">
                                                    {s.type === 'pdf' && <FileText className="w-4 h-4 mt-0.5"/>}
                                                    {s.type === 'text' && <FileText className="w-4 h-4 mt-0.5"/>}
                                                    {s.type === 'audio' && <Mic className="w-4 h-4 mt-0.5"/>}
                                                    {s.type === 'image' && <ImageIcon className="w-4 h-4 mt-0.5"/>}
                                                    {s.type === 'website' && <Globe className="w-4 h-4 mt-0.5"/>}
                                                    {s.type === 'youtube' && <Youtube className="w-4 h-4 mt-0.5"/>}
                                                    {s.type === 'clipboard' && <ClipboardPaste className="w-4 h-4 mt-0.5"/>}
                                                    <span className="flex-1 min-w-0 break-words">{s.name}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0" onClick={() => handleDeleteSource(i)}>
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </li>
                                            ))}
                                    </ul>
                                    </div>
                                )}
                                
                                <Button onClick={handleCreate} size="lg" className="w-full">Create Study Space</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
                
                <Dialog open={isTextModalOpen} onOpenChange={setIsTextModalOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add Copied Text</DialogTitle></DialogHeader>
                        <Textarea value={copiedText} onChange={e => setCopiedText(e.target.value)} placeholder="Paste your text here..." rows={10}/>
                        <DialogFooter><Button variant="outline" onClick={() => setIsTextModalOpen(false)}>Cancel</Button><Button onClick={handleAddCopiedText}>Add Text</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isUrlModalOpen} onOpenChange={setIsUrlModalOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle className="flex items-center gap-2">{urlModalConfig && <urlModalConfig.icon className="w-5 h-5" />} Add {urlModalConfig?.name} Link</DialogTitle></DialogHeader>
                        <Input value={currentUrl} onChange={e => setCurrentUrl(e.target.value)} placeholder={urlModalConfig?.type === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com'}/>
                        <DialogFooter><Button variant="outline" onClick={() => setIsUrlModalOpen(false)}>Cancel</Button><Button onClick={handleAddUrl}>Add Link</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Web Search Results</DialogTitle>
                            <DialogDescription>Select the resources you want to add to your study space.</DialogDescription>
                        </DialogHeader>
                        {isSearching ? (
                            <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /><p className="text-sm text-muted-foreground mt-4">Searching...</p></div>
                        ) : searchResults.length > 0 ? (
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto -mx-6 px-6 border-y">
                                <div className="py-4 space-y-2">
                                {searchResults.map((result, index) => (
                                    <div key={index} className="flex items-start space-x-3 p-3 border rounded-md bg-secondary/50">
                                        <Checkbox 
                                            id={`search-result-${index}`}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedWebSources(prev => [...prev, result]);
                                                } else {
                                                    setSelectedWebSources(prev => prev.filter(r => r.url !== result.url));
                                                }
                                            }}
                                            checked={selectedWebSources.some(s => s.url === result.url)}
                                        />
                                        <div className="grid gap-1.5 leading-none flex-1 min-w-0">
                                            <label htmlFor={`search-result-${index}`} className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-sm">
                                                {result.title}
                                            </label>
                                            <p className="text-xs text-muted-foreground">{result.snippet}</p>
                                            <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">{result.url}</a>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">No results found. Try a different search term.</div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsSearchModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddSelectedSources}>Add Selected</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

function PodcastView({ podcast, onBack, topic }: { podcast: { podcastScript: string; podcastAudio: string }, onBack: () => void, topic: string }) {
    return (
        <Card>
            <CardHeader>
                <Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <CardTitle className="pt-4 flex items-center gap-2"><Mic className="text-primary"/> Podcast for "{topic}"</CardTitle>
                <CardDescription>Listen to the AI-generated podcast based on your sources.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {podcast.podcastAudio ? (
                    <audio controls src={podcast.podcastAudio} className="w-full"></audio>
                ) : (
                    <Alert variant="destructive">
                        <AlertTitle>Audio Not Available</AlertTitle>
                        <AlertDescription>
                            Podcast audio is not saved between sessions to save space. Please regenerate it if you'd like to listen again.
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

// These view components are copied from note-generator/page.tsx and adapted slightly
function FlashcardView({ flashcards, onBack, topic }: { flashcards: GenerateFlashcardsOutput['flashcards'], onBack: () => void, topic: string }) {
    const [flippedStates, setFlippedStates] = useState<boolean[]>(Array(flashcards.length).fill(false));
    const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const { toast } = useToast();

    const handleFlip = (index: number) => {
        setFlippedStates(prev => {
            const newStates = [...prev];
            newStates[index] = !newStates[index];
            return newStates;
        });
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
                    <Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back</Button>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setViewMode('grid')} variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon"><Grid className="h-4 w-4"/></Button>
                        <Button onClick={() => setViewMode('single')} variant={viewMode === 'single' ? 'secondary' : 'ghost'} size="icon"><View className="h-4 w-4"/></Button>
                        <Button onClick={handlePrint} variant="ghost" size="icon"><Printer className="h-4 w-4"/></Button>
                    </div>
                </div>
                <CardTitle className="pt-4 flex items-center gap-2"><SquareStack className="text-primary"/> Flashcards for "{topic}"</CardTitle>
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

function QuizView({ quiz, onBack, topic }: { quiz: GenerateQuizOutput['quiz'], onBack: () => void, topic: string }) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [quizState, setQuizState] = useState<'in-progress' | 'results'>('in-progress');
    const [score, setScore] = useState(0);
    const { toast } = useToast();

    const handleAnswerSelect = (answer: string) => {
        if (selectedAnswers[currentQuestionIndex] !== undefined) return;
        setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: answer }));
    };
    const handleSeeResults = () => {
        let finalScore = 0;
        quiz.forEach((q, index) => { if(selectedAnswers[index] === q.correctAnswer) finalScore++; });
        setScore(finalScore);
        setQuizState('results');
    };
    const handleRestart = () => {
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
                <CardHeader><div className="flex justify-between items-start"><Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back</Button><Button onClick={handlePrint} variant="ghost" size="icon"><Printer className="h-4 w-4"/></Button></div><CardTitle className="pt-4">Quiz Results for "{topic}"</CardTitle><CardDescription>You scored {score} out of {quiz.length}</CardDescription></CardHeader>
                <CardContent id="quiz-results-print-area"><Progress value={(score / quiz.length) * 100} className="w-full mb-4" /><div className="space-y-4">{quiz.map((q, index) => (<Card key={index} className={cn(selectedAnswers[index] === q.correctAnswer ? "border-green-500" : "border-destructive")}><CardHeader><p className="font-semibold">{index + 1}. {q.questionText}</p></CardHeader><CardContent><p className="text-sm">Your answer: <span className={cn("font-bold", selectedAnswers[index] === q.correctAnswer ? "text-green-500" : "text-destructive")}>{selectedAnswers[index] || "Not answered"}</span></p><p className="text-sm">Correct answer: <span className="font-bold text-green-500">{q.correctAnswer}</span></p><details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Show Explanation</summary><p className="pt-1">{q.explanation}</p></details></CardContent></Card>))}</div></CardContent>
                <CardFooter><Button onClick={handleRestart}>Take Again</Button></CardFooter>
            </Card>
        );
    }
    
    const currentQuestion = quiz[currentQuestionIndex];
    const isAnswered = selectedAnswers[currentQuestionIndex] !== undefined;
    return (
        <Card>
            <CardHeader><Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back</Button><CardTitle className="pt-4 flex items-center gap-2"><HelpCircle className="text-primary"/> Quiz for "{topic}"</CardTitle><CardDescription>Question {currentQuestionIndex + 1} of {quiz.length}</CardDescription><Progress value={((currentQuestionIndex + 1) / quiz.length) * 100} className="w-full" /></CardHeader>
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
                {currentQuestionIndex < quiz.length - 1 ? <Button onClick={() => setCurrentQuestionIndex(p => p + 1)} disabled={!isAnswered}>Next</Button> : <Button onClick={handleSeeResults} disabled={!isAnswered}>See Results</Button>}
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
            <CardHeader><div className="flex justify-between items-start"><Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back</Button><Button onClick={handlePrint} variant="ghost" size="icon"><Printer className="h-4 w-4"/></Button></div><CardTitle className="pt-4 flex items-center gap-2"><Presentation className="text-primary"/> {deck.title}</CardTitle><CardDescription>Slide {currentSlideIndex + 1} of {deck.slides.length}</CardDescription></CardHeader>
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

function InfographicView({ infographic, onBack, topic }: { infographic: GenerateInfographicOutput, onBack: () => void, topic: string }) {
    const { toast } = useToast();
    const handleDownload = () => {
        if (!infographic.imageUrl) {
            toast({ variant: 'destructive', title: 'Image Not Available', description: 'Please regenerate the infographic to download it.' });
            return;
        }
        const link = document.createElement('a');
        link.href = infographic.imageUrl;
        link.download = `infographic_${topic.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back</Button>
                    <Button onClick={handleDownload} variant="ghost" size="icon" disabled={!infographic.imageUrl}><Download className="h-4 w-4"/></Button>
                </div>
                <CardTitle className="pt-4 flex items-center gap-2"><AreaChart className="text-primary"/> Infographic for "{topic}"</CardTitle>
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
                            The infographic image is not saved between sessions to save space. Please regenerate it if you'd like to see it again.
                        </AlertDescription>
                    </Alert>
                )}
                <details className="w-full max-w-2xl text-xs text-muted-foreground">
                    <summary className="cursor-pointer">View generation prompt</summary>
                    <p className="pt-2">{infographic.prompt}</p>
                </details>
            </CardContent>
        </Card>
    );
}

function InteractiveMindMapWrapper({ data, onBack, topic }: { data: GenerateMindMapOutput, onBack: () => void, topic: string }) {
    return (
        <div className="space-y-4">
             <Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back</Button>
            <InteractiveMindMap data={data} topic={topic} />
        </div>
    );
}

function AddSourcesDialog({ open, onOpenChange, onAddSources }: { open: boolean; onOpenChange: (open: boolean) => void; onAddSources: (sources: Source[]) => void; }) {
    const [sources, setSources] = useState<Source[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [copiedText, setCopiedText] = useState("");
    const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
    const [urlModalConfig, setUrlModalConfig] = useState<{type: 'youtube' | 'website', name: string, icon: React.ElementType} | null>(null);
    const [currentUrl, setCurrentUrl] = useState("");
    const { toast } = useToast();
    
    const [searchQuery, setSearchQuery] = useState("");
    type SourceSearchResult = { title: string; url: string; snippet: string; };
    const [searchResults, setSearchResults] = useState<SourceSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [selectedWebSources, setSelectedWebSources] = useState<SourceSearchResult[]>([]);

    const handleDeleteSource = (indexToDelete: number) => { setSources(prev => prev.filter((_, index) => index !== indexToDelete)); };
    const handleFileButtonClick = (accept: string) => { if (fileInputRef.current) { fileInputRef.current.accept = accept; fileInputRef.current.removeAttribute('capture'); fileInputRef.current.value = ""; fileInputRef.current.click(); } };
    const handleOpenUrlModal = (type: 'youtube' | 'website', name: string, icon: React.ElementType) => { setUrlModalConfig({ type, name, icon }); setCurrentUrl(""); setIsUrlModalOpen(true); };
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUri = e.target?.result as string;
            let fileType: Source['type'] = 'text';
            if (file.type.startsWith('image/')) fileType = 'image';
            else if (file.type.startsWith('audio/')) fileType = 'audio';
            else if (file.type === 'application/pdf') fileType = 'pdf';
            setSources(prev => [...prev, { type: fileType, name: file.name, data: dataUri, contentType: file.type }]);
        };
        reader.readAsDataURL(file);
    };
    const handleAddCopiedText = () => { if (!copiedText.trim()) return; setSources(prev => [...prev, { type: 'clipboard', name: `Pasted Text (${copiedText.substring(0, 15)}...)`, data: copiedText, contentType: 'text/plain' }]); setCopiedText(""); setIsTextModalOpen(false); };
    const handleAddUrl = () => { if (!currentUrl.trim() || !urlModalConfig) return; setSources(prev => [...prev, { type: urlModalConfig.type, name: currentUrl, url: currentUrl }]); setCurrentUrl(""); setIsUrlModalOpen(false); };
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchResults([]);
        setSelectedWebSources([]);
        setIsSearchModalOpen(true);
        try {
            const response = await searchWebForSources({ query: searchQuery });
            setSearchResults(response.results);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Search Failed', description: e.message || 'Could not fetch web results.' });
        } finally {
            setIsSearching(false);
        }
    };
    const handleAddSelectedSources = () => {
        const newSources: Source[] = selectedWebSources.map(result => ({ type: (result.url.includes('youtube.com') || result.url.includes('youtu.be')) ? 'youtube' : 'website', name: result.title, url: result.url }));
        if (newSources.length > 0) setSources(prev => [...prev, ...newSources.filter(ns => !prev.some(s => s.url === ns.url))]);
        setIsSearchModalOpen(false);
    };
    const sourceButtons = [{ name: "PDF", icon: FileText, action: () => handleFileButtonClick("application/pdf") }, { name: "Audio", icon: Mic, action: () => handleFileButtonClick("audio/*") }, { name: "Image", icon: ImageIcon, action: () => handleFileButtonClick("image/png, image/jpeg, image/gif, image/webp") }, { name: "Website", icon: Globe, action: () => handleOpenUrlModal('website', 'Website', Globe) }, { name: "YouTube", icon: Youtube, action: () => handleOpenUrlModal('youtube', 'YouTube', Youtube) }, { name: "Text", icon: ClipboardPaste, action: () => setIsTextModalOpen(true) }];
    const handleDone = () => { onAddSources(sources); setSources([]); onOpenChange(false); };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
                <DialogHeader><DialogTitle>Add More Sources</DialogTitle><DialogDescription>Search the web or add files and links. Click &quot;Add to Space&quot; when you&apos;re done.</DialogDescription></DialogHeader>
                <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-8 border-y py-6">
                    <div className="space-y-6"><div className="flex w-full items-center space-x-2"><Input placeholder="Search the web for articles, videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}/><Button onClick={handleSearch} disabled={isSearching} size="icon"><Search className="h-4 w-4" /></Button></div><div className="relative py-2"><div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t" /></div><div className="relative flex justify-center"><span className="bg-background px-2 text-sm text-muted-foreground">Or Add Manually</span></div></div><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{sourceButtons.map(btn => (<Button key={btn.name} variant="outline" className="h-20 text-base flex-col" onClick={btn.action}><btn.icon className="mb-1 h-6 w-6"/>{btn.name}</Button>))}</div><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" /></div>
                    {sources.length > 0 && (<div className="space-y-2"><h4 className="font-semibold">Sources to Add ({sources.length})</h4><ul className="space-y-2 max-h-60 overflow-y-auto rounded-md border p-2">{sources.map((s, i) => (<li key={i} className="flex items-start text-sm gap-2 p-2 bg-secondary rounded-md">{(s.type === 'pdf' || s.type === 'text') && <FileText className="w-4 h-4 mt-0.5"/>}{s.type === 'audio' && <Mic className="w-4 h-4 mt-0.5"/>}{s.type === 'image' && <ImageIcon className="w-4 h-4 mt-0.5"/>}{s.type === 'website' && <Globe className="w-4 h-4 mt-0.5"/>}{s.type === 'youtube' && <Youtube className="w-4 h-4 mt-0.5"/>}{s.type === 'clipboard' && <ClipboardPaste className="w-4 h-4 mt-0.5"/>}<span className="flex-1 min-w-0 break-words">{s.name}</span><Button variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0" onClick={() => handleDeleteSource(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button></li>))}</ul></div>)}
                </div>
                <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleDone}>Add to Space</Button></DialogFooter>
                <Dialog open={isTextModalOpen} onOpenChange={setIsTextModalOpen}><DialogContent><DialogHeader><DialogTitle>Add Copied Text</DialogTitle></DialogHeader><Textarea value={copiedText} onChange={e => setCopiedText(e.target.value)} placeholder="Paste your text here..." rows={10}/><DialogFooter><Button variant="outline" onClick={() => setIsTextModalOpen(false)}>Cancel</Button><Button onClick={handleAddCopiedText}>Add Text</Button></DialogFooter></DialogContent></Dialog>
                <Dialog open={isUrlModalOpen} onOpenChange={setIsUrlModalOpen}><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2">{urlModalConfig && <urlModalConfig.icon className="w-5 h-5" />} Add {urlModalConfig?.name} Link</DialogTitle></DialogHeader><Input value={currentUrl} onChange={e => setCurrentUrl(e.target.value)} placeholder={urlModalConfig?.type === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com'}/><DialogFooter><Button variant="outline" onClick={() => setIsUrlModalOpen(false)}>Cancel</Button><Button onClick={handleAddUrl}>Add Link</Button></DialogFooter></DialogContent></Dialog>
                <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader><DialogTitle>Web Search Results</DialogTitle><DialogDescription>Select the resources you want to add.</DialogDescription></DialogHeader>
                        {isSearching ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /><p className="text-sm text-muted-foreground mt-4">Searching...</p></div> : searchResults.length > 0 ? <div className="space-y-2 max-h-[60vh] overflow-y-auto -mx-6 px-6 border-y"><div className="py-4 space-y-2">{searchResults.map((result, index) => (<div key={index} className="flex items-start space-x-3 p-3 border rounded-md bg-secondary/50"><Checkbox id={`add-search-result-${index}`} onCheckedChange={(checked) => { if (checked) setSelectedWebSources(p => [...p, result]); else setSelectedWebSources(p => p.filter(r => r.url !== result.url)); }} checked={selectedWebSources.some(s => s.url === result.url)}/><div className="grid gap-1.5 leading-none flex-1 min-w-0"><label htmlFor={`add-search-result-${index}`} className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-sm">{result.title}</label><p className="text-xs text-muted-foreground">{result.snippet}</p><a href={result.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">{result.url}</a></div></div>))}</div></div> : <div className="text-center py-10 text-muted-foreground">No results found. Try a different search term.</div>}
                        <DialogFooter><Button variant="outline" onClick={() => setIsSearchModalOpen(false)}>Cancel</Button><Button onClick={handleAddSelectedSources}>Add Selected</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    )
}

export default function StudySpacesPageWrapper() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin"/></div>}>
      <StudySpacesPage />
    </Suspense>
  )
}
