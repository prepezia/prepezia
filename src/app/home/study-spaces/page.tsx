
"use client";

import { useState, useRef } from "react";
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
import { Upload, Link as LinkIcon, Youtube, Send, Loader2, Mic, Play, ArrowLeft, BookOpen, FileText, Image as ImageIcon, Globe, ClipboardPaste, ArrowRight } from "lucide-react";
import { interactiveChatWithSources } from "@/ai/flows/interactive-chat-with-sources";
import { generatePodcastFromSources } from "@/ai/flows/generate-podcast-from-sources";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const sourceSchema = z.object({
  file: z.any().optional(),
  url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
});

const createSpaceSchema = z.object({
    name: z.string().min(1, { message: "Space name is required." }),
    description: z.string().optional(),
});

type Source = {
    type: 'pdf' | 'text' | 'audio' | 'website' | 'youtube' | 'image' | 'clipboard';
    name: string;
    url?: string;
    data?: string; // For file content or copied text
};

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};

type StudySpace = {
    id: number;
    name:string;
    description: string;
    sourceCount: number;
};

type ViewState = 'list' | 'create' | 'edit';

const mockStudySpaces: StudySpace[] = [
    { id: 1, name: "WASSCE Core Maths Prep", description: "All topics for the WASSCE core mathematics exam.", sourceCount: 12 },
    { id: 2, name: "Ghanaian History 1800-1957", description: "From the Ashanti Empire to Independence.", sourceCount: 7 },
    { id: 3, name: "Final Year Project - AI Tutors", description: "Research and resources for my final project on AI in education.", sourceCount: 23 },
    { id: 4, name: "Quantum Physics Basics", description: "Introductory concepts in quantum mechanics.", sourceCount: 5 },
    { id: 5, name: "BECE Social Studies", description: "Revision notes for all BECE social studies topics.", sourceCount: 15 },
    { id: 6, name: "Intro to Python Programming", description: "Basics of Python for beginners.", sourceCount: 10 },
];

export default function StudySpacesPage() {
  const [viewState, setViewState] = useState<ViewState>('list');
  const [sources, setSources] = useState<Source[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isPodcastLoading, setIsPodcastLoading] = useState(false);
  const [podcast, setPodcast] = useState<{ script: string; audio: string } | null>(null);
  
  const [selectedStudySpace, setSelectedStudySpace] = useState<StudySpace | null>(null);
  const [studySpaces, setStudySpaces] = useState<StudySpace[]>(mockStudySpaces);
  const [visibleCount, setVisibleCount] = useState(5);

  const form = useForm<z.infer<typeof sourceSchema>>({
    resolver: zodResolver(sourceSchema),
    defaultValues: { url: "" },
  });

  const handleShowCreateView = () => {
    setSources([]);
    setViewState('create');
  };
  
  const handleSelectStudySpace = (space: StudySpace) => {
    setSelectedStudySpace(space);
    // In a real app, you would fetch the sources for this space
    setSources([]);
    setChatHistory([]);
    setPodcast(null);
    setViewState('edit');
  };

  const handleBackToList = () => {
    setSelectedStudySpace(null);
    setViewState('list');
  };
  
  const handleCreateStudySpace = (name: string, description: string, createdSources: Source[]) => {
    const newSpace: StudySpace = {
        id: Date.now(),
        name,
        description,
        sourceCount: createdSources.length
    };
    setStudySpaces(prev => [newSpace, ...prev]);
    setSelectedStudySpace(newSpace);
    setSources(createdSources);
    setChatHistory([]);
    setPodcast(null);
    setViewState('edit');
  };


  function addSource(values: z.infer<typeof sourceSchema>>) {
    if (values.file && values.file[0]) {
        const file = values.file[0];
        const typeMap: {[key: string]: Source['type']} = { 
            'application/pdf': 'pdf', 
            'text/plain': 'text', 
            'audio/mpeg': 'audio',
            'image/jpeg': 'image',
            'image/png': 'image',
            'image/gif': 'image',
        };
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
            type: s.type as 'pdf' | 'text' | 'audio' | 'website' | 'youtube' | 'image',
            url: s.url,
            // In a real app, dataUri would be populated for file uploads
        }));

        const response = await interactiveChatWithSources({
            sources: sourceInputs.filter(s => s.type !== 'clipboard'),
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
  
  if (viewState === 'create') {
    return <CreateStudySpaceView onCreate={handleCreateStudySpace} onBack={handleBackToList} />
  }

  if (viewState === 'edit' && selectedStudySpace) {
    return (
        <div className="space-y-8">
            <Button variant="outline" onClick={handleBackToList}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Spaces
            </Button>
            <div>
                <h1 className="text-3xl font-headline font-bold">{selectedStudySpace.name}</h1>
                <p className="text-muted-foreground">{selectedStudySpace.description}</p>
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
                                                <Input type="file" onChange={(e) => field.onChange(e.target.files)} accept=".pdf,.txt,.mp3,.jpg,.png"/>
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
                        <CardHeader><CardTitle>Your Sources ({sources.length})</CardTitle></CardHeader>
                        <CardContent>
                            {sources.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No sources added yet.</p>
                            ) : (
                                <ul className="space-y-2">
                                {sources.map((s, i) => (
                                    <li key={i} className="flex items-center text-sm gap-2 p-2 bg-secondary rounded-md">
                                        {s.type === 'pdf' && <FileText className="w-4 h-4"/>}
                                        {s.type === 'text' && <FileText className="w-4 h-4"/>}
                                        {s.type === 'audio' && <Mic className="w-4 h-4"/>}
                                        {s.type === 'image' && <ImageIcon className="w-4 h-4"/>}
                                        {s.type === 'website' && <LinkIcon className="w-4 h-4"/>}
                                        {s.type === 'youtube' && <Youtube className="w-4 h-4"/>}
                                        {s.type === 'clipboard' && <ClipboardPaste className="w-4 h-4"/>}
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
                                    {chatHistory.length === 0 && <div className="text-center text-muted-foreground pt-10">Ask a question to get started.</div>}
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
                                            disabled={sources.length === 0 || isChatLoading}
                                        />
                                        <Button size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={handleChatSubmit} disabled={sources.length === 0 || isChatLoading}>
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
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-right">
            <Button className="group" onClick={handleShowCreateView}>
                + Create New
            </Button>
        </div>
        <h1 className="text-3xl font-headline font-bold mt-4">Study Spaces</h1>
        <p className="text-muted-foreground mt-4 bg-secondary p-4 rounded-lg">Create your personal knowledge hub. Upload PDFs, text files, and audio, or add links from websites and YouTube. Then, chat with your AI assistant, TEMI, to get answers and insights based solely on your materials.</p>
      </div>
      
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
                        <Card key={space.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleSelectStudySpace(space)}>
                            <CardHeader>
                                <CardTitle>{space.name}</CardTitle>
                                <CardDescription>{space.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-bold text-primary">{space.sourceCount} sources</p>
                            </CardContent>
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
  );
}


function CreateStudySpaceView({ onCreate, onBack }: { onCreate: (name: string, description: string, sources: Source[]) => void; onBack: () => void; }) {
    const [stage, setStage] = useState<'details' | 'sources'>('details');
    const [spaceDetails, setSpaceDetails] = useState({ name: "", description: "" });

    const detailsForm = useForm<z.infer<typeof createSpaceSchema>>({
        resolver: zodResolver(createSpaceSchema),
        defaultValues: { name: "", description: "" },
    });

    const [sources, setSources] = useState<Source[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileAccept, setFileAccept] = useState("");
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [copiedText, setCopiedText] = useState("");
    const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
    const [urlModalConfig, setUrlModalConfig] = useState<{type: 'youtube' | 'website', name: string, icon: React.ElementType} | null>(null);
    const [currentUrl, setCurrentUrl] = useState("");


    const handleFileButtonClick = (accept: string) => {
        setFileAccept(accept);
        fileInputRef.current?.click();
    };

    const handleOpenUrlModal = (type: 'youtube' | 'website', name: string, icon: React.ElementType) => {
        setUrlModalConfig({ type, name, icon });
        setCurrentUrl("");
        setIsUrlModalOpen(true);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        let fileType: Source['type'] = 'text';

        if (file.type.startsWith('image/')) {
            fileType = 'image';
        } else if (file.type.startsWith('audio/')) {
            fileType = 'audio';
        } else if (file.type === 'application/pdf') {
            fileType = 'pdf';
        }

        // TODO: Read file and store as data URI in source.data
        const newSource: Source = { type: fileType, name: file.name };
        setSources(prev => [...prev, newSource]);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const handleAddCopiedText = () => {
        if (!copiedText.trim()) return;
        const newSource: Source = { type: 'clipboard', name: `Pasted Text (${copiedText.substring(0, 15)}...)`, data: copiedText };
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

    const sourceButtons = [
        { name: "PDF", icon: FileText, action: () => handleFileButtonClick("application/pdf") },
        { name: "Audio", icon: Mic, action: () => handleFileButtonClick("audio/*") },
        { name: "Image", icon: ImageIcon, action: () => handleFileButtonClick("image/png, image/jpeg, image/gif, image/webp") },
        { name: "Website", icon: Globe, action: () => handleOpenUrlModal('website', 'Website', Globe) },
        { name: "YouTube", icon: Youtube, action: () => handleOpenUrlModal('youtube', 'YouTube', Youtube) },
        { name: "Copied text", icon: ClipboardPaste, action: () => setIsTextModalOpen(true) },
    ];

    const handleNext = (values: z.infer<typeof createSpaceSchema>) => {
        setSpaceDetails({ name: values.name, description: values.description || "No description." });
        setStage('sources');
    };

    const handleCreate = () => {
        onCreate(spaceDetails.name, spaceDetails.description, sources);
    };

    return (
        <div className="space-y-8">
            <Button variant="outline" onClick={stage === 'details' ? onBack : () => setStage('details')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {stage === 'details' ? "Back to All Spaces" : "Back"}
            </Button>
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
                                        <FormControl><Input placeholder="e.g., Photosynthesis" {...field} /></FormControl>
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
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-center">Add Sources</h3>
                                
                                <div className="relative text-center my-4">
                                    <span className="bg-card px-2 text-sm text-muted-foreground">Add links or upload your files</span>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {sourceButtons.map(btn => (
                                        <Button key={btn.name} variant="outline" className="h-20 text-base flex-col" onClick={btn.action}><btn.icon className="mr-2 mb-2 h-6 w-6"/>{btn.name}</Button>
                                    ))}
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept={fileAccept} className="hidden" />
                            </div>

                            {sources.length > 0 && (
                                <div className="space-y-2">
                                <h4 className="font-semibold">Added Sources ({sources.length})</h4>
                                <ul className="space-y-2 max-h-40 overflow-y-auto rounded-md border p-2">
                                        {sources.map((s, i) => (
                                            <li key={i} className="flex items-center text-sm gap-2 p-2 bg-secondary rounded-md">
                                                {s.type === 'pdf' && <FileText className="w-4 h-4"/>}
                                                {s.type === 'text' && <FileText className="w-4 h-4"/>}
                                                {s.type === 'audio' && <Mic className="w-4 h-4"/>}
                                                {s.type === 'image' && <ImageIcon className="w-4 h-4"/>}
                                                {s.type === 'website' && <LinkIcon className="w-4 h-4"/>}
                                                {s.type === 'youtube' && <Youtube className="w-4 h-4"/>}
                                                {s.type === 'clipboard' && <ClipboardPaste className="w-4 h-4"/>}
                                                <span className="truncate flex-1">{s.name}</span>
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
                    <DialogHeader>
                        <DialogTitle>Add Copied Text</DialogTitle>
                    </DialogHeader>
                    <Textarea value={copiedText} onChange={e => setCopiedText(e.target.value)} placeholder="Paste your text here..." rows={10}/>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTextModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddCopiedText}>Add Text</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isUrlModalOpen} onOpenChange={setIsUrlModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {urlModalConfig && <urlModalConfig.icon className="w-5 h-5" />}
                             Add {urlModalConfig?.name} Link
                        </DialogTitle>
                    </DialogHeader>
                    <Input 
                        value={currentUrl} 
                        onChange={e => setCurrentUrl(e.target.value)} 
                        placeholder={urlModalConfig?.type === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com'}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUrlModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddUrl}>Add Link</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    