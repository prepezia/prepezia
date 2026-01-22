"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { generateStudyNotes, GenerateStudyNotesOutput } from "@/ai/flows/generate-study-notes";
import { Loader2 } from "lucide-react";
import { HomeHeader } from "@/components/layout/HomeHeader";

const formSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters." }),
  academicLevel: z.enum(["Beginner", "Intermediate", "Expert", "Undergraduate", "Masters", "PhD"]),
});

export default function NoteGeneratorPage() {
  const [generatedNotes, setGeneratedNotes] = useState<GenerateStudyNotesOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      academicLevel: "Intermediate",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedNotes(null);
    try {
      const result = await generateStudyNotes(values);
      setGeneratedNotes(result);
    } catch (error) {
      console.error("Error generating notes:", error);
      // TODO: Show toast notification
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <HomeHeader />
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-headline font-bold">Note Generator</h1>
          <p className="text-muted-foreground">
            Enter a topic and select an academic level to generate detailed study notes.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topic</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Photosynthesis, Ghanaian Independence" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="academicLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Expert">Expert</SelectItem>
                          <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                          <SelectItem value="Masters">Masters</SelectItem>
                          <SelectItem value="PhD">PhD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Notes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {isLoading && (
          <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary"/>
              <p className="ml-4 text-muted-foreground">Generating your notes, please wait...</p>
          </div>
        )}

        {generatedNotes && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-headline font-bold mb-4">Generated Notes</h2>
              <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: generatedNotes.notes.replace(/\n/g, '<br />') }} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
