
"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { generateStudyNotes, GenerateStudyNotesOutput, GenerateStudyNotesInput } from "@/ai/flows/generate-study-notes";
import { interactiveChatWithSources } from "@/ai/flows/interactive-chat-with-sources";
import { generateFlashcards, GenerateFlashcardsOutput } from "@/ai/flows/generate-flashcards";
import { generateQuiz, GenerateQuizOutput } from "@/ai/flows/generate-quiz";
import { generateSlideDeck, GenerateSlideDeckOutput } from "@/ai/flows/generate-slide-deck";
import { Loader2, Sparkles, BookOpen, Plus, ArrowLeft, ArrowRight, MessageCircle, Send, Bot, HelpCircle, Presentation, SquareStack, FlipHorizontal, Lightbulb, CheckCircle, XCircle, Printer, View, Grid, Save, MoreVertical, Trash2 } from "lucide-react";
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


type GeneratedContent = {
  flashcards?: GenerateFlashcardsOutput['flashcards'];
  quiz?: GenerateQuizOutput['quiz'];
  deck?: GenerateSlideDeckOutput;
};

type RecentNote = {
  id: number;
  topic: string;
  level: string;
  date: string;
  content: string;
  nextStepsPrompt?: string;
  generatedContent?: GeneratedContent;
};

const dummyRecentNotes: RecentNote[] = [
  { id: 1, topic: 'Photosynthesis', level: 'Undergraduate', date: 'July 21, 2024', content: "## Introduction to Photosynthesis\nPhotosynthesis is the process used by plants, algae, and certain bacteria to harness energy from sunlight and turn it into chemical energy." },
  { id: 2, topic: 'The Scramble for Africa', level: 'Secondary', date: 'July 21, 2024', content: "## The Scramble for Africa\nThe Scramble for Africa was the invasion, occupation, division, and colonization of most of Africa by seven Western European powers during a short period known to historians as the New Imperialism (between 1881 and 1914)." },
  { id: 3, topic: 'Newtonian Physics', level: 'Intermediate', date: 'July 20, 2024', content: "### Newton's Three Laws of Motion\n\n| Law | Description |\n|---|---|\n| First | An object will not change its motion unless a force acts on it. |\n| Second | The force on an object is equal to its mass times its acceleration. |\n| Third | For every action, there is an equal and opposite reaction. |" },
  { id: 4, topic: 'Introduction to Python', level: 'Beginner', date: 'July 20, 2024', content: "### Your First Python Program\n\nTo get started, let's write a simple \"Hello, World!\" program.\n\n\`\`\`python\nprint(\"Hello, World!\")\n\`\`\`" },
  { id: 5, topic: 'Ghanaian Independence', level: 'Secondary', date: 'July 19, 2024', content: "## Ghana's Independence\nGhana, formerly known as the Gold Coast, was the first country in sub-Saharan Africa to gain independence from European colonial rule. Independence was declared on **March 6, 1957**." },
  { id: 6, 'topic': 'Machine Learning Algorithms', level: 'Masters', date: 'July 18, 2024', content: "### Common Algorithms\n- Linear Regression\n- Logistic Regression\n- Decision Trees\n- Support Vector Machines (SVM)\n- K-Nearest Neighbors (KNN)" },
  { id: 7, topic: 'The Cell Structure', level: 'Secondary', date: 'July 17, 2024', content: "#### Key Organelles\n*   **Nucleus:** Contains the cell's genetic material.\n*   **Mitochondria:** The powerhouse of the cell.\n*   **Ribosomes:** Synthesize proteins." },
];

function NoteListPage({ onSelectNote, onCreateNew }: { onSelectNote: (note: RecentNote) => void, onCreateNew: () => void }) {
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [visibleCount, setVisibleCount] = useState(7);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('learnwithtemi_recent_notes');
      if (savedNotes) {
        setRecentNotes(JSON.parse(savedNotes));
      } else {
        setRecentNotes(dummyRecentNotes); // Load dummy data if nothing is in storage
      }
    } catch (error) {
      console.error("Failed to parse recent notes from localStorage", error);
      setRecentNotes(dummyRecentNotes);
    }
  }, []);

  const handleDeleteNote = (noteId: number) => {
    setRecentNotes(prev => {
        const updatedNotes = prev.filter(note => note.id !== noteId);
        try {
          localStorage.setItem('learnwithtemi_recent_notes', JSON.stringify(updatedNotes));
        } catch (error) {
          console.error("Failed to save updated notes to localStorage", error);
        }
        return updatedNotes;
    });
    toast({ title: 'Note Deleted', description: 'The note has been removed.' });
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
            {recentNotes.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 border-dashed">
                    <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold text-muted-foreground">No recent notes.</h3>
                    <p className="text-muted-foreground mb-4">Click the button above to generate your first one!</p>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recentNotes.slice(0, visibleCount).map(note => (
                            <Card key={note.id} className="cursor-pointer hover:shadow-lg transition-shadow relative" onClick={() => onSelectNote(note)}>
                                <CardHeader>
                                    <CardTitle>{note.topic}</CardTitle>
                                    <CardDescription>{note.level}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Generated on {note.date}</p>
                                </CardContent>
                                <div className="absolute top-1 right-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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


type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function ChatWithNoteDialog({ open, onOpenChange, noteContent, topic }: { open: boolean, onOpenChange: (open: boolean) => void, noteContent: string, topic: string }) {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatting, setIsChatting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            setChatHistory([]);
            setChatInput("");
            setIsChatting(false);
        }
    }, [open]);

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isChatting) return;

        const userMessage: ChatMessage = { role: 'user', content: chatInput };
        setChatHistory(prev => [...prev, userMessage]);
        setIsChatting(true);
        const currentInput = chatInput;
        setChatInput("");

        try {
            const response = await interactiveChatWithSources({
                sources: [{ type: 'text', dataUri: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(noteContent)))}`, contentType: 'text/plain' }],
                question: currentInput
            });
            const assistantMessage: ChatMessage = { role: 'assistant', content: response.answer };
            setChatHistory(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Chat Error", description: error.message || "The AI failed to respond." });
            setChatHistory(prev => [...prev, { role: 'assistant', content: "Sorry, an error occurred." }]);
        } finally {
            setIsChatting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Chat about "{topic}"</DialogTitle>
                    <DialogDescription>Ask the AI for more details or explanations about the notes.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6 space-y-4">
                    {chatHistory.length === 0 && (
                        <div className="text-center text-muted-foreground pt-10 px-6 h-full flex flex-col justify-center items-center">
                            <Bot className="w-12 h-12 mx-auto text-primary/80 mb-4" />
                            <h3 className="font-semibold text-foreground text-lg">AI Assistant</h3>
                            <p className="mt-2 text-sm">Ask me anything about these notes!</p>
                        </div>
                    )}
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                            {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Bot className="w-5 h-5" /></div>}
                            <div className={cn("p-3 rounded-lg max-w-[85%]", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                                <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none" remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {isChatting && <div className="flex justify-start"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                </div>
                <div className="p-4 border-t bg-background">
                    <form onSubmit={handleChatSubmit} className="relative">
                        <Textarea
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask a question..."
                            className="pr-12"
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e as any); } }}
                            disabled={isChatting}
                        />
                        <Button size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" type="submit" disabled={isChatting}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}

type AcademicLevel = "Beginner" | "Intermediate" | "Expert" | "Secondary" | "Undergraduate" | "Masters" | "PhD";

function NoteViewPage({ onBack, initialTopic, initialNote }: { onBack: () => void; initialTopic?: string | null; initialNote?: RecentNote | null }) {
  const { toast } = useToast();
  const [topic, setTopic] = useState(initialNote?.topic || initialTopic || "");
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>(initialNote?.level as AcademicLevel || "Undergraduate");
  const [generatedNotes, setGeneratedNotes] = useState<GenerateStudyNotesOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const generationStarted = useRef(false);

  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>(initialNote?.generatedContent || {});
  const [isGenerating, setIsGenerating] = useState<'flashcards' | 'quiz' | 'deck' | null>(null);
  const [activeView, setActiveView] = useState<'notes' | 'flashcards' | 'quiz' | 'deck'>('notes');

  const updateAndSaveNote = useCallback((noteId: number, newContent: Partial<RecentNote>) => {
    try {
        const savedNotesRaw = localStorage.getItem('learnwithtemi_recent_notes');
        const savedNotes = savedNotesRaw ? JSON.parse(savedNotesRaw) : [];
        const noteIndex = savedNotes.findIndex((n: RecentNote) => n.id === noteId);
        
        if (noteIndex > -1) {
            const updatedNote = { ...savedNotes[noteIndex], ...newContent };
            savedNotes[noteIndex] = updatedNote;
            localStorage.setItem('learnwithtemi_recent_notes', JSON.stringify(savedNotes));
        }
    } catch (e) {
        console.error("Failed to update note in local storage:", e);
    }
  }, []);

  const onNoteGenerated = useCallback((topic: string, level: string, content: string, nextSteps: string) => {
    const newNote: RecentNote = {
      id: Date.now(),
      topic,
      level,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      content,
      nextStepsPrompt: nextSteps,
      generatedContent: {},
    };
    try {
      const savedNotesRaw = localStorage.getItem('learnwithtemi_recent_notes');
      const savedNotes = savedNotesRaw ? JSON.parse(savedNotesRaw).filter((n: RecentNote) => n.id !== 0) : dummyRecentNotes;
      const updatedNotes = [newNote, ...savedNotes.filter((n: RecentNote) => n.topic !== topic || n.level !== level)];
      localStorage.setItem('learnwithtemi_recent_notes', JSON.stringify(updatedNotes));
      // Replace URL to reflect the new note ID for saving subsequent generated content
      router.replace(`/home/note-generator?noteId=${newNote.id}`);
    } catch (e) {
      console.error("Failed to save notes to local storage:", e);
    }
  }, [router]);

  const generate = useCallback(async (currentTopic: string, currentLevel: string) => {
    if (!currentTopic.trim()) {
        toast({
            variant: "destructive",
            title: "Topic is required",
            description: "Please enter a topic to generate notes.",
        });
        return;
    }

    if (generationStarted.current) return;
    generationStarted.current = true;

    setIsLoading(true);
    setGeneratedNotes(null);
    setPages([]);
    setActiveView('notes');
    setGeneratedContent({});
    try {
      const result = await generateStudyNotes({ topic: currentTopic, academicLevel: currentLevel as AcademicLevel });
      setGeneratedNotes(result);
      onNoteGenerated(currentTopic, currentLevel, result.notes, result.nextStepsPrompt);
    } catch (error: any) {
      console.error("Error generating notes:", error);
      toast({
            variant: "destructive",
            title: "Generation Failed",
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
      setIsLoading(false);
      generationStarted.current = false;
    }
  }, [onNoteGenerated, toast]);
  
  useEffect(() => {
    if (initialTopic && !initialNote) {
        generate(initialTopic, academicLevel);
    }
  }, [initialTopic, initialNote, generate, academicLevel]);

  useEffect(() => {
    if (generatedNotes?.notes) {
      const noteContent = generatedNotes.notes;
      const notePages = noteContent.split(/\n---\n/);
      setPages(notePages);
      setCurrentPage(0);
    }
  }, [generatedNotes]);
  
  useEffect(() => {
    if (initialNote) {
        const noteContent = initialNote.content || "";
        const notePages = noteContent.split(/\n---\n/);
        setPages(notePages);
        setGeneratedNotes({ notes: noteContent, nextStepsPrompt: initialNote.nextStepsPrompt || ""});
        setTopic(initialNote.topic);
        setAcademicLevel(initialNote.level as AcademicLevel);
        setGeneratedContent(initialNote.generatedContent || {});
        setCurrentPage(0);
    }
  }, [initialNote]);


  const handleGenerateClick = () => {
      generate(topic, academicLevel);
  };

  const handleGenerateAnother = () => {
    setGeneratedNotes(null);
    setPages([]);
    setCurrentPage(0);
    setTopic("");
    setActiveView('notes');
    setGeneratedContent({});
    router.push('/home/note-generator?new=true');
    generationStarted.current = false;
  }
  
  const handleGenerateFlashcards = async () => {
    if (!generatedNotes) return;
    setIsGenerating('flashcards');
    try {
        const result = await generateFlashcards({
            context: 'note-generator',
            topic: topic,
            academicLevel: academicLevel,
            content: generatedNotes.notes,
        });
        setGeneratedContent(prev => {
            const newContent = { ...prev, flashcards: result.flashcards };
            if (initialNote) {
                const { quiz, ...contentToSave } = newContent;
                updateAndSaveNote(initialNote.id, { generatedContent: contentToSave });
            }
            return newContent;
        });
        setActiveView('flashcards');
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Failed to generate flashcards', description: e.message });
    } finally {
        setIsGenerating(null);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!generatedNotes) return;
    setIsGenerating('quiz');
    try {
        const result = await generateQuiz({
            context: 'note-generator',
            topic: topic,
            academicLevel: academicLevel,
            content: generatedNotes.notes,
        });
        // Just update state for viewing, don't save the quiz
        setGeneratedContent(prev => ({...prev, quiz: result.quiz}));
        setActiveView('quiz');
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Failed to generate quiz', description: e.message });
    } finally {
        setIsGenerating(null);
    }
  };

  const handleGenerateSlideDeck = async () => {
    if (!generatedNotes) return;
    setIsGenerating('deck');
    try {
        const result = await generateSlideDeck({
            context: 'note-generator',
            topic: topic,
            academicLevel: academicLevel,
            content: generatedNotes.notes,
        });
        setGeneratedContent(prev => {
            const newContent = { ...prev, deck: result };
            if (initialNote) {
                const { quiz, ...contentToSave } = newContent;
                updateAndSaveNote(initialNote.id, { generatedContent: contentToSave });
            }
            return newContent;
        });
        setActiveView('deck');
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Failed to generate slide deck', description: e.message });
    } finally {
        setIsGenerating(null);
    }
  };

  const nextStepActions = [
      { label: "Flashcards", icon: SquareStack, action: handleGenerateFlashcards, loading: isGenerating === 'flashcards'},
      { label: "Quiz", icon: HelpCircle, action: handleGenerateQuiz, loading: isGenerating === 'quiz'},
      { label: "Slide Deck", icon: Presentation, action: handleGenerateSlideDeck, loading: isGenerating === 'deck'},
  ]

  const renderContent = () => {
    if (activeView === 'flashcards' && generatedContent.flashcards) {
        return <FlashcardView flashcards={generatedContent.flashcards} onBack={() => setActiveView('notes')} topic={topic} />;
    }
    if (activeView === 'quiz' && generatedContent.quiz) {
        return <QuizView quiz={generatedContent.quiz} onBack={() => setActiveView('notes')} topic={topic} />;
    }
    if (activeView === 'deck' && generatedContent.deck) {
        return <SlideDeckView deck={generatedContent.deck} onBack={() => setActiveView('notes')} />;
    }

    // Default to notes view
    return (
        <>
            <Card className="flex-1 flex flex-col min-w-0">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">{topic}</CardTitle>
                    <CardDescription>Academic Level: {academicLevel}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="prose dark:prose-invert max-w-none h-full overflow-auto rounded-md border p-4 md:p-6 bg-secondary/30">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: (paragraph) => {
                                    const { node } = paragraph;
                                    if (node && node.children.length === 1) {
                                        const child = node.children[0];
                                        if ('tagName' in child && child.tagName === 'a' && child.properties?.href) {
                                            const url = String(child.properties.href);
                                            const youtubeMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                                            if (youtubeMatch && youtubeMatch[1]) {
                                                const videoId = youtubeMatch[1];
                                                return (
                                                    <div className="my-4 aspect-video">
                                                        <iframe src={`https://www.youtube.com/embed/${videoId}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Embedded YouTube video" className="w-full h-full rounded-md"></iframe>
                                                    </div>
                                                );
                                            }
                                        }
                                    }
                                    return <p>{paragraph.children}</p>;
                                },
                            }}
                        >
                            {pages[currentPage]}
                        </ReactMarkdown>
                    </div>
                </CardContent>
            </Card>
            
            {pages.length > 1 && (
                <div className="mt-4 flex justify-between items-center">
                    <Button variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}><ArrowLeft className="mr-2"/> Previous</Button>
                    <span className="text-sm text-muted-foreground">Page {currentPage + 1} of {pages.length}</span>
                    <Button variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === pages.length - 1}>Next <ArrowRight className="ml-2"/></Button>
                </div>
            )}

            <Card className="mt-8">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl"><Sparkles className="text-primary"/> Next Steps</CardTitle>
                  <CardDescription>{generatedNotes?.nextStepsPrompt || "What would you like to do next with these notes?"}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                  {nextStepActions.map(item => (
                      <Button key={item.label} variant="outline" onClick={item.action} disabled={item.loading}>
                          {item.loading ? <Loader2 className="mr-2 animate-spin"/> : <item.icon className="mr-2"/>}
                          {item.label}
                      </Button>
                  ))}
              </CardContent>
            </Card>

            {((generatedContent.flashcards && generatedContent.flashcards.length > 0) || generatedContent.deck) && (
              <Card className="mt-8">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl"><Save className="text-primary"/> Saved Content</CardTitle>
                      <CardDescription>
                          Your generated flashcards and slide decks are saved here. Quizzes are not saved.
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-4">
                      {generatedContent.flashcards && generatedContent.flashcards.length > 0 && (
                          <Button variant="secondary" onClick={() => setActiveView('flashcards')}>
                              <SquareStack className="mr-2"/> View Flashcards
                          </Button>
                      )}
                      {generatedContent.deck && (
                          <Button variant="secondary" onClick={() => setActiveView('deck')}>
                              <Presentation className="mr-2"/> View Slide Deck
                          </Button>
                      )}
                  </CardContent>
              </Card>
            )}
            
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={handleGenerateAnother}><Plus className="mr-2 h-4 w-4"/> Generate Another</Button>
                <Button onClick={() => setIsChatOpen(true)}><MessageCircle className="mr-2 h-4 w-4"/> AI Deep Dive</Button>
            </div>
        </>
    );
  }

  return (
    <>
      <HomeHeader left={<Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes</Button>} />
      <div className="flex-1 overflow-y-auto space-y-8 relative">
          {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                  <p className="text-muted-foreground text-lg">Generating notes for "{topic}"...</p>
                  <p className="text-sm text-muted-foreground">This may take a moment.</p>
              </div>
          ) : generatedNotes ? (
              <div className="max-w-4xl mx-auto pb-20 px-4 sm:px-6 lg:px-8">
                {renderContent()}
              </div>
          ) : (
            <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-headline font-bold">Generate New Study Notes</CardTitle>
                        <CardDescription>Enter any topic and select the academic level to get started.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Input 
                          placeholder="e.g., Photosynthesis, Ghanaian Independence" 
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="h-12 text-base"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateClick(); }}
                      />
                      <Select value={academicLevel} onValueChange={(value) => setAcademicLevel(value as AcademicLevel)}>
                          <SelectTrigger className="h-12 text-base">
                          <SelectValue placeholder="Select a level" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectGroup>
                                  <SelectLabel>Proficiency</SelectLabel>
                                  <SelectItem value="Beginner">Beginner</SelectItem>
                                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                                  <SelectItem value="Expert">Expert</SelectItem>
                              </SelectGroup>
                              <SelectGroup>
                                  <SelectLabel>Degree Level</SelectLabel>
                                  <SelectItem value="Secondary">Secondary</SelectItem>
                                  <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                                  <SelectItem value="Masters">Masters</SelectItem>
                                  <SelectItem value="PhD">PhD</SelectItem>
                              </SelectGroup>
                          </SelectContent>
                      </Select>
                      <Button onClick={handleGenerateClick} disabled={!topic.trim()} className="w-full h-12" size="lg">
                          <Sparkles className="mr-2 h-5 w-5" />
                          Generate Notes
                      </Button>
                    </CardContent>
                </Card>
            </div>
          )}
      </div>

      {generatedNotes && (
          <>
            <div className="fixed bottom-[100px] right-6 z-50 md:bottom-24">
                <Button size="icon" className="rounded-full h-14 w-14 shadow-lg" onClick={() => setIsChatOpen(true)}>
                    <MessageCircle className="h-7 w-7"/>
                    <span className="sr-only">AI Deep Dive</span>
                </Button>
            </div>
            <ChatWithNoteDialog 
                open={isChatOpen} 
                onOpenChange={setIsChatOpen}
                noteContent={generatedNotes.notes}
                topic={topic}
            />
          </>
      )}
    </>
  );
}

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
        if (!printWindow) {
            toast({ variant: 'destructive', title: 'Could not open print window' });
            return;
        }

        const styles = Array.from(document.getElementsByTagName('link')).filter(link => link.rel === 'stylesheet').map(link => link.outerHTML).join('');
        const styleBlocks = Array.from(document.getElementsByTagName('style')).map(style => style.outerHTML).join('');

        printWindow.document.write(`
            <html>
                <head><title>Print Flashcards</title>${styles}${styleBlocks}
                <style>
                    @media print {
                        @page { size: A4; margin: 20mm; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .flashcard-print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                        .flashcard-print-item { border: 1px solid #ccc; padding: 10px; page-break-inside: avoid; }
                        .flashcard-print-item h4 { font-weight: bold; }
                    }
                </style>
                </head><body>${printContent}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 1000);
    };

    const currentCard = flashcards[currentCardIndex];

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back to Notes</Button>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setViewMode('grid')} variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon"><Grid className="h-4 w-4"/></Button>
                        <Button onClick={() => setViewMode('single')} variant={viewMode === 'single' ? 'secondary' : 'ghost'} size="icon"><View className="h-4 w-4"/></Button>
                        <Button onClick={handlePrint} variant="ghost" size="icon"><Printer className="h-4 w-4"/></Button>
                    </div>
                </div>
                <CardTitle className="pt-4 flex items-center gap-2"><SquareStack className="text-primary"/> Flashcards for "{topic}"</CardTitle>
                <CardDescription>Click on a card to flip it and see the answer.</CardDescription>
            </CardHeader>
            <CardContent>
                {viewMode === 'grid' ? (
                    <div id="flashcard-print-area">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flashcard-print-grid">
                            {flashcards.map((card, index) => (
                                <div key={index} className="perspective-1000 flashcard-print-item" onClick={() => handleFlip(index)}>
                                    <div className={cn("relative w-full h-64 transform-style-3d transition-transform duration-500 cursor-pointer", flippedStates[index] && "rotate-y-180")}>
                                        <div className="absolute w-full h-full backface-hidden rounded-lg border bg-card flex items-center justify-center p-6 text-center">
                                            <div>
                                                <h4 className="print-only">Front:</h4>
                                                <p className="font-semibold text-lg">{card.front}</p>
                                            </div>
                                        </div>
                                        <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-lg border bg-secondary flex items-center justify-center p-6 text-center">
                                            <div>
                                                <h4 className="print-only">Back:</h4>
                                                <p className="text-sm">{card.back}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                     <div>
                        <div className="perspective-1000 mx-auto max-w-lg" onClick={() => handleFlip(currentCardIndex)}>
                            <div className={cn("relative w-full h-80 transform-style-3d transition-transform duration-500 cursor-pointer", flippedStates[currentCardIndex] && "rotate-y-180")}>
                                <div className="absolute w-full h-full backface-hidden rounded-lg border bg-card flex items-center justify-center p-6 text-center">
                                    <p className="font-semibold text-xl">{currentCard.front}</p>
                                </div>
                                <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-lg border bg-secondary flex items-center justify-center p-6 text-center">
                                    <p>{currentCard.back}</p>
                                </div>
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
    const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
    const [quizState, setQuizState] = useState<'in-progress' | 'results'>('in-progress');
    const [score, setScore] = useState(0);
    const { toast } = useToast();

    const currentQuestion = quiz[currentQuestionIndex];
    const isAnswered = selectedAnswers[currentQuestionIndex] !== undefined;

    const handleAnswerSelect = (answer: string) => {
        if (isAnswered) return;
        setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: answer }));
        setShowExplanation(prev => ({ ...prev, [currentQuestionIndex]: true }));
    };
    
    const handleSeeResults = () => {
        let finalScore = 0;
        quiz.forEach((q, index) => {
            if(selectedAnswers[index] === q.correctAnswer) {
                finalScore++;
            }
        });
        setScore(finalScore);
        setQuizState('results');
    };

    const handleRestart = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setShowExplanation({});
        setScore(0);
        setQuizState('in-progress');
    };
    
    const handlePrint = () => {
        const printContent = document.getElementById('quiz-results-print-area')?.innerHTML;
        if (!printContent) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: 'destructive', title: 'Could not open print window' });
            return;
        }
        const styles = Array.from(document.getElementsByTagName('link')).filter(link => link.rel === 'stylesheet').map(link => link.outerHTML).join('');
        const styleBlocks = Array.from(document.getElementsByTagName('style')).map(style => style.outerHTML).join('');
        printWindow.document.write(`<html><head><title>Print Quiz Results</title>${styles}${styleBlocks}</head><body>${printContent}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 1000);
    };

    if (quizState === 'results') {
        return (
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back to Notes</Button>
                        <Button onClick={handlePrint} variant="ghost" size="icon"><Printer className="h-4 w-4"/></Button>
                    </div>
                    <CardTitle className="pt-4">Quiz Results for "{topic}"</CardTitle>
                    <CardDescription>You scored {score} out of {quiz.length}</CardDescription>
                </CardHeader>
                <CardContent id="quiz-results-print-area">
                     <Progress value={(score / quiz.length) * 100} className="w-full mb-4" />
                     <div className="space-y-4">
                     {quiz.map((q, index) => (
                        <Card key={index} className={cn(selectedAnswers[index] === q.correctAnswer ? "border-green-500" : "border-destructive")}>
                            <CardHeader>
                                <p className="font-semibold">{index + 1}. {q.questionText}</p>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">Your answer: <span className={cn("font-bold", selectedAnswers[index] === q.correctAnswer ? "text-green-500" : "text-destructive")}>{selectedAnswers[index] || "Not answered"}</span></p>
                                <p className="text-sm">Correct answer: <span className="font-bold text-green-500">{q.correctAnswer}</span></p>
                                <details className="mt-2 text-xs text-muted-foreground">
                                    <summary className="cursor-pointer">Show Explanation</summary>
                                    <p className="pt-1">{q.explanation}</p>
                                </details>
                            </CardContent>
                        </Card>
                     ))}
                     </div>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleRestart}>Take Again</Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back to Notes</Button>
                <CardTitle className="pt-4 flex items-center gap-2"><HelpCircle className="text-primary"/> Quiz for "{topic}"</CardTitle>
                <CardDescription>Question {currentQuestionIndex + 1} of {quiz.length}</CardDescription>
                <Progress value={((currentQuestionIndex + 1) / quiz.length) * 100} className="w-full" />
            </CardHeader>
            <CardContent>
                <p className="font-semibold text-lg mb-4">{currentQuestion.questionText}</p>
                <RadioGroup onValueChange={handleAnswerSelect} value={selectedAnswers[currentQuestionIndex]} disabled={isAnswered}>
                    {currentQuestion.options.map((option, i) => {
                        const isCorrect = option === currentQuestion.correctAnswer;
                        const isSelected = selectedAnswers[currentQuestionIndex] === option;
                        return (
                            <div key={i} className={cn("flex items-center space-x-3 space-y-0 p-3 rounded-md border cursor-pointer",
                                isAnswered && isCorrect && "bg-green-100 dark:bg-green-900/50 border-green-500",
                                isAnswered && isSelected && !isCorrect && "bg-red-100 dark:bg-red-900/50 border-destructive"
                             )} onClick={() => handleAnswerSelect(option)}>
                                <RadioGroupItem value={option} />
                                <Label className="font-normal flex-1 cursor-pointer">{option}</Label>
                                {isAnswered && isCorrect && <CheckCircle className="text-green-500" />}
                                {isAnswered && isSelected && !isCorrect && <XCircle className="text-destructive" />}
                            </div>
                        )
                    })}
                </RadioGroup>
                
                {isAnswered && showExplanation[currentQuestionIndex] && (
                    <Card className="mt-4 bg-secondary/50">
                        <CardHeader className="flex-row items-center gap-2 pb-2">
                           <Lightbulb className="w-5 h-5 text-yellow-500" />
                           <CardTitle className="text-md">Explanation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                        </CardContent>
                    </Card>
                )}
                 {!isAnswered && currentQuestion.hint && (
                    <details className="mt-4 text-sm text-muted-foreground">
                        <summary className="cursor-pointer">Need a hint?</summary>
                        <p className="pt-1">{currentQuestion.hint}</p>
                    </details>
                )}

            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => setCurrentQuestionIndex(p => p - 1)} disabled={currentQuestionIndex === 0}>Previous</Button>
                {currentQuestionIndex < quiz.length - 1 ? (
                     <Button onClick={() => setCurrentQuestionIndex(p => p + 1)} disabled={!isAnswered}>Next</Button>
                ) : (
                    <Button onClick={handleSeeResults} disabled={!isAnswered}>See Results</Button>
                )}
            </CardFooter>
        </Card>
    );
}

function SlideDeckView({ deck, onBack }: { deck: GenerateSlideDeckOutput, onBack: () => void }) {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const currentSlide = deck.slides[currentSlideIndex];
    const { toast } = useToast();

    const handlePrint = () => {
        const printContent = document.getElementById('deck-print-area')?.innerHTML;
        if (!printContent) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: 'destructive', title: 'Could not open print window' });
            return;
        }
        const styles = Array.from(document.getElementsByTagName('link')).filter(link => link.rel === 'stylesheet').map(link => link.outerHTML).join('');
        const styleBlocks = Array.from(document.getElementsByTagName('style')).map(style => style.outerHTML).join('');
        printWindow.document.write(`<html><head><title>Print Deck</title>${styles}${styleBlocks}<style>@page { size: landscape; }</style></head><body>${printContent}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 1000);
    };

    return (
        <Card className="flex flex-col">
            <CardHeader>
                 <div className="flex justify-between items-start">
                    <Button onClick={onBack} variant="outline" className="w-fit"><ArrowLeft className="mr-2"/> Back to Notes</Button>
                    <Button onClick={handlePrint} variant="ghost" size="icon"><Printer className="h-4 w-4"/></Button>
                </div>
                <CardTitle className="pt-4 flex items-center gap-2"><Presentation className="text-primary"/> {deck.title}</CardTitle>
                <CardDescription>Slide {currentSlideIndex + 1} of {deck.slides.length}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1" id="deck-print-area">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 rounded-lg border p-6 bg-secondary/30 min-h-[40vh] flex flex-col justify-center">
                        <h3 className="text-2xl font-bold mb-4">{currentSlide.title}</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentSlide.content}</ReactMarkdown>
                        </div>
                    </div>
                    <div className="md:col-span-1 rounded-lg border p-4 bg-background">
                        <h4 className="font-semibold mb-2">Speaker Notes</h4>
                        <p className="text-sm text-muted-foreground">{currentSlide.speakerNotes}</p>
                    </div>
                </div>
            </CardContent>
             <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => setCurrentSlideIndex(p => p - 1)} disabled={currentSlideIndex === 0}>Previous</Button>
                <Button onClick={() => setCurrentSlideIndex(p => p + 1)} disabled={currentSlideIndex === deck.slides.length - 1}>Next</Button>
            </CardFooter>
        </Card>
    );
}


function NoteGeneratorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [view, setView] = useState<'list' | 'note'>('list');
    
    const [initialTopic, setInitialTopic] = useState<string | null>(null);
    const [initialNote, setInitialNote] = useState<RecentNote | null>(null);

    useEffect(() => {
        const topic = searchParams.get('topic');
        const noteId = searchParams.get('noteId');
        const isNew = searchParams.get('new');

        if (topic || noteId || isNew) {
            setView('note');
            if (noteId) {
                try {
                    const savedNotesRaw = localStorage.getItem('learnwithtemi_recent_notes');
                    const savedNotes = savedNotesRaw ? JSON.parse(savedNotesRaw) : [];
                    const foundNote = savedNotes.find((n: RecentNote) => n.id.toString() === noteId);
                    setInitialNote(foundNote || null);
                    setInitialTopic(null);
                } catch(e) { console.error("Error loading note from storage", e); }
            } else {
                setInitialTopic(topic);
                setInitialNote(null);
            }
        } else {
            setView('list');
        }

    }, [searchParams]);

    const handleSelectNote = (note: RecentNote) => {
        router.push(`/home/note-generator?noteId=${note.id}`);
    }

    const handleCreateNew = () => {
        router.push('/home/note-generator?new=true');
    }

    const handleBackToList = () => {
        router.push('/home/note-generator');
    }

    if (view === 'note') {
        return <NoteViewPage onBack={handleBackToList} initialTopic={initialTopic} initialNote={initialNote} />
    }
    
    return <NoteListPage onSelectNote={handleSelectNote} onCreateNew={handleCreateNew} />;
}


export default function NoteGeneratorPageWrapper() {
    return (
        <Suspense fallback={
            <div className="flex flex-col min-h-screen">
                <HomeHeader />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
        }>
            <NoteGeneratorPage />
        </Suspense>
    )
}

    