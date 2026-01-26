"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from 'next/navigation';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { generateStudyNotes, GenerateStudyNotesOutput } from "@/ai/flows/generate-study-notes";
import { Loader2, Sparkles, BookOpen, Plus } from "lucide-react";
import { HomeHeader } from "@/components/layout/HomeHeader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "@/hooks/use-toast";

type RecentNote = {
  id: number;
  topic: string;
  level: string;
  date: string;
};

const dummyRecentNotes: RecentNote[] = [
  { id: 1, topic: 'Photosynthesis', level: 'Undergraduate', date: 'July 21, 2024' },
  { id: 2, topic: 'The Scramble for Africa', level: 'Secondary', date: 'July 21, 2024' },
  { id: 3, topic: 'Newtonian Physics', level: 'Intermediate', date: 'July 20, 2024' },
  { id: 4, topic: 'Introduction to Python', level: 'Beginner', date: 'July 20, 2024' },
  { id: 5, topic: 'Ghanaian Independence', level: 'Secondary', date: 'July 19, 2024' },
  { id: 6, 'topic': 'Machine Learning Algorithms', level: 'Masters', date: 'July 18, 2024' },
  { id: 7, topic: 'The Cell Structure', level: 'Secondary', date: 'July 17, 2024' },
  { id: 8, topic: 'Quantum Mechanics', level: 'PhD', date: 'July 16, 2024' },
  { id: 9, topic: 'Macroeconomic Policies', level: 'Undergraduate', date: 'July 15, 2024' },
  { id: 10, topic: 'The Transatlantic Slave Trade', level: 'Secondary', date: 'July 14, 2024' },
];

function NoteGeneratorPage() {
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>(dummyRecentNotes);
  const [visibleCount, setVisibleCount] = useState(7);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const searchParams = useSearchParams();
  const topicFromUrl = searchParams.get('topic');

  useEffect(() => {
    if (topicFromUrl && !isDialogOpen) {
      setIsDialogOpen(true);
    }
  }, [topicFromUrl, isDialogOpen]);

  const handleNoteGenerated = (topic: string, level: string) => {
    const newNote: RecentNote = {
      id: Date.now(),
      topic,
      level,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    };
    setRecentNotes(prev => [newNote, ...prev]);
  };
  
  return (
    <>
      <HomeHeader />
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-headline font-bold">Notes</h1>
              <p className="text-muted-foreground mt-1">Your personal AI-powered note-taking assistant.</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="shrink-0">
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
                            <Card key={note.id} className="cursor-pointer hover:shadow-lg transition-shadow">
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
      <NoteGeneratorDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onNoteGenerated={handleNoteGenerated}
          initialTopic={topicFromUrl || ''}
      />
    </>
  );
}

function NoteGeneratorDialog({ isOpen, onOpenChange, onNoteGenerated, initialTopic }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onNoteGenerated: (topic: string, level: string) => void, initialTopic?: string }) {
    const { toast } = useToast();
    const [topic, setTopic] = useState("");
    const [academicLevel, setAcademicLevel] = useState("Undergraduate");
    const [generatedNotes, setGeneratedNotes] = useState<GenerateStudyNotesOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (initialTopic) {
            setTopic(initialTopic);
        }
    }, [initialTopic]);
    
    // Reset state when dialog is closed
    useEffect(() => {
        if (!isOpen) {
            setTopic(initialTopic || "");
            setGeneratedNotes(null);
            setIsLoading(false);
            setAcademicLevel("Undergraduate");
        }
    }, [isOpen, initialTopic]);

    const generate = async () => {
        if (!topic.trim()) {
            toast({
                variant: "destructive",
                title: "Topic is required",
                description: "Please enter a topic to generate notes.",
            });
            return;
        }

        setIsLoading(true);
        setGeneratedNotes(null);
        try {
          const result = await generateStudyNotes({ topic, academicLevel });
          setGeneratedNotes(result);
          onNoteGenerated(topic, academicLevel);
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
    }

    const handleGenerateAnother = () => {
        setGeneratedNotes(null);
        setTopic("");
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Generate New Study Notes</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto -mx-6 px-6 border-y py-4">
                    {isLoading ? (
                         <div className="flex flex-col items-center justify-center h-full gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                            <p className="text-muted-foreground">Generating notes for "{topic}"...</p>
                        </div>
                    ) : generatedNotes ? (
                        <div>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Generated Notes for &quot;{topic}&quot;</CardTitle>
                                    <CardDescription>Level: {academicLevel}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                <div className="prose dark:prose-invert max-w-none">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            p: (paragraph) => {
                                                const { node } = paragraph;
                                                // Check if the paragraph contains a single link
                                                if (node.children.length === 1 && node.children[0].tagName === 'a') {
                                                    const link = node.children[0] as any;
                                                    if (link && link.properties) {
                                                        const url = link.properties.href || '';
                                                        const youtubeMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                                        
                                                        // Check if it's a standalone YouTube link
                                                        if (youtubeMatch && youtubeMatch[1]) {
                                                            const videoId = youtubeMatch[1];
                                                            if (link.children.length === 1 && link.children[0].type === 'text' && link.children[0].value === url) {
                                                                return (
                                                                    <div className="my-4 aspect-video">
                                                                        <iframe
                                                                            src={`https://www.youtube.com/embed/${videoId}`}
                                                                            frameBorder="0"
                                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                            allowFullScreen
                                                                            title="Embedded YouTube video"
                                                                            className="w-full h-full rounded-md"
                                                                        ></iframe>
                                                                    </div>
                                                                );
                                                            }
                                                        }
                                                    }
                                                }
                                                // Otherwise, render a normal paragraph
                                                return <p>{paragraph.children}</p>;
                                            },
                                            a: ({node, ...props}) => {
                                                // Render all other links as normal links opening in a new tab
                                                return <a {...props} target="_blank" rel="noopener noreferrer" />;
                                            }
                                        }}
                                    >
                                        {generatedNotes.notes}
                                    </ReactMarkdown>
                                </div>
                                </CardContent>
                            </Card>
                            <div className="mt-4 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                                <Button onClick={handleGenerateAnother}>
                                    <Plus className="mr-2 h-4 w-4"/> Generate Another
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Input 
                                placeholder="e.g., Photosynthesis, Ghanaian Independence" 
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="h-12 text-base"
                                onKeyDown={(e) => { if (e.key === 'Enter') generate(); }}
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
                            <Button onClick={generate} disabled={!topic.trim()} className="w-full h-12">
                                <Sparkles className="mr-2 h-5 w-5" />
                                Generate Notes
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
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
