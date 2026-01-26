"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { generateStudyNotes, GenerateStudyNotesOutput } from "@/ai/flows/generate-study-notes";
import { Loader2, Sparkles, HelpCircle, SquareStack, Presentation, Mic } from "lucide-react";
import { HomeHeader } from "@/components/layout/HomeHeader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "@/hooks/use-toast";

function NoteGenerator() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [topic, setTopic] = useState(searchParams.get('topic') || '');
  const [academicLevel, setAcademicLevel] = useState(searchParams.get('level') || "Undergraduate");
  const [generatedNotes, setGeneratedNotes] = useState<GenerateStudyNotesOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    // If topic is in URL, auto-generate notes
    if (searchParams.get('topic')) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <>
      <HomeHeader />
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-headline font-bold">AI Note Generator</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Enter any topic, select an academic level, and let our AI create comprehensive, well-structured study notes for you.
          </p>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Input 
                placeholder="e.g., Photosynthesis, Ghanaian Independence" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-12 text-base flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') generate(); }}
              />
              <Select value={academicLevel} onValueChange={setAcademicLevel}>
                <SelectTrigger className="w-full sm:w-[200px] h-12 text-base">
                  <SelectValue placeholder="Select a level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Expert">Expert</SelectItem>
                  <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                  <SelectItem value="Masters">Masters</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={generate} disabled={isLoading || !topic.trim()} className="w-full sm:w-auto h-12">
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary"/>
              <p className="text-muted-foreground">Generating your notes, please wait...</p>
          </div>
        )}

        {generatedNotes && (
          <>
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Generated Notes for &quot;{topic}&quot;</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedNotes.notes}</ReactMarkdown>
                </div>
                </CardContent>
            </Card>

            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>Generate More</CardTitle>
                    <CardDescription>Would you like to generate more content based on this topic?</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Button variant="outline" className="h-20 flex-col gap-2"><HelpCircle />Quiz</Button>
                        <Button variant="outline" className="h-20 flex-col gap-2"><SquareStack />Flashcards</Button>
                        <Button variant="outline" className="h-20 flex-col gap-2"><Presentation />Slide Deck</Button>
                        <Button variant="outline" className="h-20 flex-col gap-2"><Mic />Podcast</Button>
                    </div>
                </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

export default function NoteGeneratorPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col min-h-screen">
                <HomeHeader />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
        }>
            <NoteGenerator />
        </Suspense>
    )
}
