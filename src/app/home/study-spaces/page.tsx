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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link as LinkIcon, Youtube, Send, Loader2, Mic, Play } from "lucide-react";
import { interactiveChatWithSources } from "@/ai/flows/interactive-chat-with-sources";
import { generatePodcastFromSources } from "@/ai/flows/generate-podcast-from-sources";

const sourceSchema = z.object({
  file: z.any().optional(),
  url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
});

type Source = {
    type: 'pdf' | 'text' | 'audio' | 'website' | 'youtube';
    name: string;
    url?: string;
};

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};

export default function StudySpacesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isPodcastLoading, setIsPodcastLoading] = useState(false);
  const [podcast, setPodcast] = useState<{ script: string; audio: string } | null>(null);

  const form = useForm<z.infer<typeof sourceSchema>>({
    resolver: zodResolver(sourceSchema),
    defaultValues: { url: "" },
  });

  function addSource(values: z.infer<typeof sourceSchema>) {
    if (values.file && values.file[0]) {
        const file = values.file[0];
        const typeMap: {[key: string]: Source['type']} = { 'application/pdf': 'pdf', 'text/plain': 'text', 'audio/mpeg': 'audio' };
        const fileType = typeMap[file.type] || 'text';
        setSources(prev => [...prev, { type: fileType, name: file.name }]);
        // TODO: Upload file to Firebase Storage and get URL
    } else if (values.url) {
        const isYoutube = values.url.includes('youtube.com') || values.url.includes('youtu.be');
        setSources(prev => [...prev, { type: isYoutube ? 'youtube' : 'website', name: values.url, url: values.url }]);
    }
    form.reset();
  }

  async function handleChatSubmit() {
    if (!chatInput.trim()) return;
    
    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatHistory(prev => [...prev, userMessage]);
    setIsChatLoading(true);
    setChatInput("");

    try {
        const sourceInputs = sources.map(s => ({
            type: s.type,
            url: s.url,
            // In a real app, dataUri would be populated for file uploads
        }));

        const response = await interactiveChatWithSources({
            sources: sourceInputs,
            question: chatInput
        });

        const assistantMessage: ChatMessage = { role: 'assistant', content: response.answer };
        setChatHistory(prev => [...prev, assistantMessage]);
    } catch (e) {
        console.error("Chat error", e);
        const errorMessage: ChatMessage = { role: 'assistant', content: "Sorry, I couldn't process that request." };
        setChatHistory(prev => [...prev, errorMessage]);
    } finally {
        setIsChatLoading(false);
    }
  }

  async function handleGeneratePodcast() {
    setIsPodcastLoading(true);
    setPodcast(null);
    try {
        const sourceUrls = sources.map(s => s.url).filter((url): url is string => !!url);
        const response = await generatePodcastFromSources({ sources: sourceUrls });
        setPodcast({ script: response.podcastScript, audio: response.podcastAudio });
    } catch(e) {
        console.error("Podcast generation error", e);
    } finally {
        setIsPodcastLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Study Spaces</h1>
        <p className="text-muted-foreground mt-4 bg-secondary p-4 rounded-lg">Create your personal knowledge hub. Upload PDFs, text files, and audio, or add links from websites and YouTube. Then, chat with your AI assistant, TEMI, to get answers and insights based solely on your materials.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Add Sources</CardTitle>
                    <CardDescription>Upload files or add links to build your knowledge base.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(addSource)} className="space-y-4">
                            <FormField control={form.control} name="file" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Upload File</FormLabel>
                                    <FormControl>
                                        <Input type="file" onChange={(e) => field.onChange(e.target.files)} accept=".pdf,.txt,.mp3"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="url" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Website or YouTube URL</FormLabel>
                                    <FormControl><Input placeholder="https://example.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <Button type="submit" className="w-full">Add Source</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Your Sources</CardTitle></CardHeader>
                <CardContent>
                    {sources.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No sources added yet.</p>
                    ) : (
                        <ul className="space-y-2">
                           {sources.map((s, i) => (
                               <li key={i} className="flex items-center text-sm gap-2 p-2 bg-secondary rounded-md">
                                   {s.type === 'pdf' && <Upload className="w-4 h-4"/>}
                                   {s.type === 'text' && <Upload className="w-4 h-4"/>}
                                   {s.type === 'audio' && <Upload className="w-4 h-4"/>}
                                   {s.type === 'website' && <LinkIcon className="w-4 h-4"/>}
                                   {s.type === 'youtube' && <Youtube className="w-4 h-4"/>}
                                   <span className="truncate flex-1">{s.name}</span>
                               </li>
                           ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
            <Tabs defaultValue="chat">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chat">Interactive Chat (TEMI)</TabsTrigger>
                    <TabsTrigger value="podcast">Podcast Generator</TabsTrigger>
                </TabsList>
                <TabsContent value="chat">
                    <Card className="h-[600px] flex flex-col">
                        <CardHeader><CardTitle>Chat with TEMI</CardTitle></CardHeader>
                        <CardContent className="flex-grow overflow-y-auto space-y-4">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                                        <p className="text-sm" dangerouslySetInnerHTML={{__html: msg.content.replace(/\n/g, '<br />')}}/>
                                    </div>
                                </div>
                            ))}
                             {isChatLoading && <div className="flex justify-start"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                        </CardContent>
                        <div className="p-4 border-t">
                            <div className="relative">
                                <Textarea
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Ask a question about your sources..."
                                    className="pr-12"
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); }}}
                                />
                                <Button size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={handleChatSubmit} disabled={isChatLoading}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
                <TabsContent value="podcast">
                    <Card className="h-[600px] flex flex-col items-center justify-center text-center">
                        <CardContent>
                            {isPodcastLoading ? (
                                <>
                                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                                    <p className="mt-4 text-muted-foreground">Generating your audio overview...</p>
                                </>
                            ) : podcast ? (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-headline">Podcast Ready!</h3>
                                    <audio controls src={podcast.audio} className="w-full"></audio>
                                    <Card className="text-left max-h-80 overflow-y-auto">
                                        <CardHeader><CardTitle>Script</CardTitle></CardHeader>
                                        <CardContent>
                                            <pre className="text-sm whitespace-pre-wrap font-body">{JSON.stringify(JSON.parse(podcast.script), null, 2)}</pre>
                                        </CardContent>
                                    </Card>
                                    <Button onClick={() => setPodcast(null)}>Generate New Podcast</Button>
                                </div>
                            ) : (
                                <>
                                    <Mic className="h-12 w-12 text-primary mx-auto" />
                                    <h3 className="text-xl font-headline mt-4">Generate Audio Overview</h3>
                                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Turn your sources into an engaging podcast-style conversation between our AI hosts, Temi & Jay.</p>
                                    <Button size="lg" className="mt-6" onClick={handleGeneratePodcast} disabled={sources.length === 0}>
                                        <Play className="mr-2 h-4 w-4" />
                                        Generate Podcast
                                    </Button>
                                    {sources.length === 0 && <p className="text-xs text-destructive mt-2">Please add at least one source with a URL to generate a podcast.</p>}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
}
