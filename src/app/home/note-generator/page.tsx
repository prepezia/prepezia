
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
import { generateStudyNotes, GenerateStudyNotesOutput } from "@/ai/flows/generate-study-notes";
import { interactiveChatWithSources } from "@/ai/flows/interactive-chat-with-sources";
import { Loader2, Sparkles, BookOpen, Plus, ArrowLeft, ArrowRight, MessageCircle, Send, Bot, HelpCircle, Presentation, SquareStack } from "lucide-react";
import { HomeHeader } from "@/components/layout/HomeHeader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type RecentNote = {
  id: number;
  topic: string;
  level: string;
  date: string;
  content: string;
  nextStepsPrompt?: string;
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
                            <Card key={note.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onSelectNote(note)}>
                                <CardHeader>
                                    <CardTitle>{note.topic}</CardTitle>
                                    <CardDescription>{note.level}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Generated on {note.date}</p>
                                </CardContent>
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

function NoteViewPage({ onBack, initialTopic, initialNote }: { onBack: () => void; initialTopic?: string | null; initialNote?: RecentNote | null }) {
  const { toast } = useToast();
  const [topic, setTopic] = useState(initialTopic || initialNote?.topic || "");
  const [academicLevel, setAcademicLevel] = useState(initialNote?.level || "Undergraduate");
  const [generatedNotes, setGeneratedNotes] = useState<GenerateStudyNotesOutput | null>(initialNote ? { notes: initialNote.content, nextStepsPrompt: initialNote.nextStepsPrompt || "" } : null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Pagination
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  // Chat
  const [isChatOpen, setIsChatOpen] = useState(false);

  const onNoteGenerated = useCallback((topic: string, level: string, content: string, nextSteps: string) => {
    const newNote: RecentNote = {
      id: Date.now(),
      topic,
      level,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      content,
      nextStepsPrompt: nextSteps,
    };

    try {
      const savedNotesRaw = localStorage.getItem('learnwithtemi_recent_notes');
      const savedNotes = savedNotesRaw ? JSON.parse(savedNotesRaw) : dummyRecentNotes;
      const updatedNotes = [newNote, ...savedNotes.filter((n: RecentNote) => n.topic !== topic || n.level !== level)];
      localStorage.setItem('learnwithtemi_recent_notes', JSON.stringify(updatedNotes));
    } catch (e) {
      console.error("Failed to save notes to local storage:", e);
    }
  }, []);

  const generate = useCallback(async (currentTopic: string, currentLevel: string) => {
    if (!currentTopic.trim()) {
        toast({
            variant: "destructive",
            title: "Topic is required",
            description: "Please enter a topic to generate notes.",
        });
        return;
    }

    setIsLoading(true);
    setGeneratedNotes(null);
    setPages([]);
    try {
      const result = await generateStudyNotes({ topic: currentTopic, academicLevel: currentLevel });
      const noteContent = result.notes || "";
      const notePages = noteContent.split(/\n---\n/);
      setPages(notePages);
      setGeneratedNotes(result);
      setCurrentPage(0);
      onNoteGenerated(currentTopic, currentLevel, noteContent, result.nextStepsPrompt);
    } catch (error: any) {
      console.error("Error generating notes:", error);
      toast({
            variant: "destructive",
            title: "Generation Failed",
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
      setIsLoading(false);
    }
  }, [onNoteGenerated, toast]);
  
  useEffect(() => {
    if (initialNote) {
        const noteContent = initialNote.content || "";
        const notePages = noteContent.split(/\n---\n/);
        setPages(notePages);
        setGeneratedNotes({ notes: noteContent, nextStepsPrompt: initialNote.nextStepsPrompt || ""});
        setTopic(initialNote.topic);
        setAcademicLevel(initialNote.level);
        setCurrentPage(0);
    } else if (initialTopic && !generatedNotes && !isLoading) {
        generate(initialTopic, academicLevel);
    }
  }, [initialNote, initialTopic, generate, academicLevel, isLoading, generatedNotes]);


  const handleGenerateClick = () => {
      router.push(`/home/note-generator?topic=${encodeURIComponent(topic)}&level=${academicLevel}`);
      generate(topic, academicLevel);
  };

  const handleGenerateAnother = () => {
    setGeneratedNotes(null);
    setPages([]);
    setCurrentPage(0);
    setTopic("");
    router.push('/home/note-generator?new=true');
  }

  const nextStepActions = [
      { label: "Flashcards", icon: SquareStack, action: () => toast({title: "Coming Soon!", description: "Flashcard generation will be available soon."})},
      { label: "Quiz", icon: HelpCircle, action: () => toast({title: "Coming Soon!", description: "Quiz generation will be available soon."})},
      { label: "Slide Deck", icon: Presentation, action: () => toast({title: "Coming Soon!", description: "Slide deck generation will be available soon."})},
  ]

  return (
    <>
      <HomeHeader left={<Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes</Button>} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 relative">
          {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                  <p className="text-muted-foreground text-lg">Generating notes for "{topic}"...</p>
                  <p className="text-sm text-muted-foreground">This may take a moment.</p>
              </div>
          ) : generatedNotes ? (
              <div className="max-w-4xl mx-auto">
                  <Card className="flex-1 flex flex-col">
                      <CardHeader>
                          <CardTitle className="text-3xl font-headline">{topic}</CardTitle>
                          <CardDescription>Academic Level: {academicLevel}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                          <div className="prose dark:prose-invert max-w-none h-full overflow-y-auto rounded-md border p-4 bg-secondary/30 min-h-[50vh]">
                              <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                      table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="min-w-full" {...props} /></div>,
                                      p: (paragraph) => {
                                          const { node } = paragraph;
                                          if (node.children.length === 1 && node.children[0].tagName === 'a') {
                                              const link = node.children[0] as any;
                                              if (link && link.properties) {
                                                  const url = link.properties.href || '';
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
                        <CardDescription>{generatedNotes.nextStepsPrompt || "What would you like to do next with these notes?"}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4">
                        {nextStepActions.map(item => (
                            <Button key={item.label} variant="outline" onClick={item.action}>
                                <item.icon className="mr-2"/>
                                {item.label}
                            </Button>
                        ))}
                    </CardContent>
                  </Card>

                  <div className="mt-8 flex flex-col sm:flex-row justify-end gap-2">
                      <Button variant="ghost" onClick={handleGenerateAnother}><Plus className="mr-2 h-4 w-4"/> Generate Another</Button>
                      <Button onClick={() => setIsChatOpen(true)}><MessageCircle className="mr-2 h-4 w-4"/> AI Deep Dive</Button>
                  </div>

                  <div className="fixed bottom-6 right-6 z-50">
                      <Button size="icon" className="rounded-full h-14 w-14 shadow-lg" onClick={() => setIsChatOpen(true)}>
                          <MessageCircle className="h-7 w-7"/>
                          <span className="sr-only">AI Deep Dive</span>
                      </Button>
                  </div>
              </div>
          ) : (
              <div className="max-w-2xl mx-auto space-y-4 text-center py-10">
                  <h1 className="text-3xl font-headline font-bold">Generate New Study Notes</h1>
                  <p className="text-muted-foreground">Enter any topic and select the academic level to get started.</p>
                  <div className="space-y-4 pt-4">
                      <Input 
                          placeholder="e.g., Photosynthesis, Ghanaian Independence" 
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="h-12 text-base"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateClick(); }}
                      />
                      <Select value={academicLevel} onValueChange={setAcademicLevel}>
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
                  </div>
              </div>
          )}
      </div>

      {generatedNotes && (
          <ChatWithNoteDialog 
              open={isChatOpen} 
              onOpenChange={setIsChatOpen}
              noteContent={generatedNotes.notes}
              topic={topic}
          />
      )}
    </>
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
