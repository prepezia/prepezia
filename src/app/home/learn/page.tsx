

'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { UserNav } from "@/components/layout/UserNav";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { guidedLearningChat, GuidedLearningChatOutput } from '@/ai/flows/guided-learning-chat';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { generateChatTitle } from '@/ai/flows/generate-chat-title';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Loader2, Mic, Pause, Plus, Send, Trash2, User, Volume2, FileText, Menu, X, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Logo } from '@/components/icons/Logo';
import { Progress } from '@/components/ui/progress';

// Types
type ChatMessageContent = string | {
    text: string;
    media: { name: string; dataUri: string; contentType: string; };
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: ChatMessageContent;
  isError?: boolean;
};

type SavedChat = {
  id: string;
  topic: string;
  history: ChatMessage[];
  createdAt: string;
  progress?: number;
  status?: 'Not Started' | 'In Progress' | 'Completed';
};

type PendingPrompt = {
    question: string;
    media?: { name: string; dataUri: string; contentType: string; };
};

function GuidedLearningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // State
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [activeChat, setActiveChat] = useState<SavedChat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Refs
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const voiceInitRef = useRef(false);

  // Voice & Audio state
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    try {
        if (isMounted) {
            localStorage.setItem('learnwithtemi_guided_chats', JSON.stringify(savedChats));
        }
    } catch (e) {
        console.error("Failed to save chats", e);
    }
  }, [savedChats, isMounted]);
  
  // Scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeChat?.history]);

  const updateActiveChat = useCallback((updates: Partial<SavedChat>) => {
      setActiveChat(prevActiveChat => {
          if (!prevActiveChat) return null;
          const newActiveChat = { ...prevActiveChat, ...updates };

          setSavedChats(prevSavedChats => 
              prevSavedChats.map(c => c.id === newActiveChat.id ? newActiveChat : c)
          );
          
          return newActiveChat;
      });
  }, []);

  const downloadChatHistory = (chat: SavedChat) => {
    let content = `Topic: ${chat.topic}\n`;
    content += `Date: ${new Date(chat.createdAt).toLocaleString()}\n\n`;
    content += '------------------------------------\n\n';

    chat.history.forEach(msg => {
        const role = msg.role === 'user' ? 'You' : 'Zia';
        let messageContent = '';
        if (typeof msg.content === 'string') {
            messageContent = msg.content;
        } else {
            messageContent = `[Attachment: ${msg.content.media.name}] ${msg.content.text}`;
        }
        content += `${role}:\n${messageContent}\n\n------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.topic.replace(/[\W_]+/g,"_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Chat history downloaded.' });
  };

  const handleDownloadAudio = async (text: string, messageId: string) => {
        toast({ title: "Preparing audio for download..." });
        try {
            const ttsResponse = await textToSpeech({ text });
            const link = document.createElement('a');
            link.href = ttsResponse.audio;
            link.download = `zia_response_${messageId}.wav`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Audio Download Failed', description: 'Could not generate or download AI speech.'});
        }
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

  const submitMessage = useCallback(async (
    content: string, 
    chatContext: SavedChat, 
    options?: { media?: PendingPrompt['media'], isVoiceInput?: boolean }
  ) => {
    if ((!content.trim() && !options?.media) || isLoading) return;

    const userMessageContent: ChatMessageContent = options?.media
        ? { text: content, media: options.media }
        : content;

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: userMessageContent };
    
    const updatedHistoryForRequest = [...(chatContext.history || []), userMessage];
    
    updateActiveChat({ history: updatedHistoryForRequest });
    setIsLoading(true);

    try {
        const response: GuidedLearningChatOutput = await guidedLearningChat({
            question: content,
            history: updatedHistoryForRequest.map(h => ({
                role: h.role,
                content: typeof h.content === 'string' ? h.content : h.content.text,
            })),
            mediaDataUri: options?.media?.dataUri,
            mediaContentType: options?.media?.contentType
        });

        const fullResponseContent = `${response.answer}\n\n**${response.followUpQuestion}**`;
        const assistantMessage: ChatMessage = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: fullResponseContent,
        };
        
        const finalHistory = [...updatedHistoryForRequest, assistantMessage];
        
        const progress = Math.min((finalHistory.length / 10) * 100, 100); // 10 messages = 100%
        const currentStatus = chatContext.status === 'Not Started' ? 'In Progress' : (progress >= 100 ? 'Completed' : 'In Progress');

        updateActiveChat({ history: finalHistory, progress, status: currentStatus });
        
        const isFirstAssistantMessage = finalHistory.filter(m => m.role === 'assistant' && !m.isError).length === 1;

        if (isFirstAssistantMessage) {
            (async () => {
                try {
                    const titleResult = await generateChatTitle({
                        history: finalHistory.slice(0, 2).map(m => ({ // Send first user & assistant message
                            role: m.role,
                            content: typeof m.content === 'string' ? m.content : m.content.text,
                        }))
                    });
                    if (titleResult.title) {
                        updateActiveChat({ topic: titleResult.title });
                    }
                } catch(e) {
                    console.error("Failed to generate chat title:", e);
                }
            })();
        }

        if (options?.isVoiceInput) {
            await handlePlayAudio(assistantMessage.id, fullResponseContent);
        }

    } catch (e: any) {
        console.error("Guided learning chat error", e);
        const errorMessage: ChatMessage = { id: `err-${Date.now()}`, role: 'assistant', content: "Sorry, I encountered an error. Please try again.", isError: true };
        updateActiveChat({ history: [...updatedHistoryForRequest, errorMessage] });
        toast({ variant: "destructive", title: "AI Error", description: e.message });
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, toast, updateActiveChat, handlePlayAudio]);
  
  const startNewChat = useCallback((prompt?: PendingPrompt) => {
    const newChat: SavedChat = {
        id: `chat-${Date.now()}`,
        topic: prompt?.question || 'New Chat',
        history: [],
        createdAt: new Date().toISOString(),
        progress: 0,
        status: 'Not Started',
    };
    
    setSavedChats(prev => [newChat, ...prev]);
    setActiveChat(newChat);
    
    if(prompt) {
        submitMessage(prompt.question, newChat, { media: prompt.media });
    }
    
    router.replace('/home/learn', { scroll: false });
  }, [router, submitMessage]);

  // Load chats on mount and handle initial actions
  useEffect(() => {
    let initialChats: SavedChat[] = [];
    try {
        const storedChats = localStorage.getItem('learnwithtemi_guided_chats');
        if (storedChats) {
            initialChats = JSON.parse(storedChats);
        }
    } catch (e) {
        console.error("Failed to load chats from localStorage", e);
    }

    setSavedChats(initialChats);
    const startWithVoice = searchParams.get('voice') === 'true';

    // Router.replace will remove the search param, so we need to check if the action has already run
    if (!voiceInitRef.current) {
        const pendingPromptJSON = sessionStorage.getItem('pending_guided_learning_prompt');
        if (pendingPromptJSON) {
            sessionStorage.removeItem('pending_guided_learning_prompt');
            try {
                const pendingPrompt: PendingPrompt = JSON.parse(pendingPromptJSON);
                startNewChat(pendingPrompt);
            } catch(e) {
                console.error("Failed to parse pending prompt, loading normally.", e);
                if (initialChats.length > 0) setActiveChat(initialChats[0]);
            }
            return;
        }

        if (startWithVoice) {
            voiceInitRef.current = true;
            if (initialChats.length > 0) {
                 setActiveChat(initialChats[0]);
            } else {
                startNewChat();
            }
            setTimeout(() => handleMicClick(), 200); 
            router.replace('/home/learn', { scroll: false });
            return;
        }
    }
    
    if (initialChats.length > 0) {
        if (!activeChat) setActiveChat(initialChats[0]);
    } else {
        startNewChat();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChat = (chatId: string) => {
    const chat = savedChats.find(c => c.id === chatId);
    if (chat) {
      setActiveChat(chat);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    setSavedChats(prev => {
        const updatedChats = prev.filter(c => c.id !== chatId);
        if (activeChat?.id === chatId) {
            if (updatedChats.length > 0) {
                setActiveChat(updatedChats[0]);
            } else {
                startNewChat();
            }
        }
        return updatedChats;
    });
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (activeChat && chatInputRef.current) {
          const content = chatInputRef.current.value;
          submitMessage(content, activeChat);
          chatInputRef.current.value = '';
      }
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
        if (activeChat) {
            submitMessage(transcript, activeChat, { isVoiceInput: true });
        }
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
  }, [activeChat, submitMessage, toast]);


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

  const ChatSidebarContent = ({ isMobile = false }) => (
    <>
        <div className="p-4 text-center border-b">
            <Button className="w-full" onClick={() => {
                startNewChat();
                if (isMobile) setIsSidebarOpen(false);
            }}>
                <Plus className="mr-2 h-4 w-4" /> New Chat
            </Button>
       </div>
       <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
                {savedChats.map(chat => (
                    <div
                        key={chat.id}
                        onClick={() => {
                            handleSelectChat(chat.id);
                            if (isMobile) setIsSidebarOpen(false);
                        }}
                        className={cn(
                            "group flex items-start justify-between p-2 rounded-md cursor-pointer hover:bg-secondary",
                            activeChat?.id === chat.id && "bg-secondary font-semibold"
                        )}
                    >
                        <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{chat.topic}</p>
                            {chat.status !== 'Not Started' && typeof chat.progress === 'number' && (
                                <div className="mt-1.5">
                                    <Progress value={chat.progress} className="h-1" />
                                </div>
                            )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0 ml-2" onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id);}}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>
       </ScrollArea>
    </>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar */}
        <aside className="w-72 flex-col border-r bg-secondary/50 hidden md:flex">
           <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">My Chats</h2>
           </div>
           <ChatSidebarContent />
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col bg-card">
            {activeChat ? (
                <>
                    <div className="p-4 border-b flex items-center gap-2">
                        <div className="md:hidden">
                            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Menu className="h-6 w-6" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 flex flex-col w-[80%]">
                                        <SheetHeader className="p-4 border-b text-left">
                                            <SheetTitle>My Chats</SheetTitle>
                                            <SheetDescription className="sr-only">
                                                A list of your past conversations.
                                            </SheetDescription>
                                        </SheetHeader>
                                    <ChatSidebarContent isMobile />
                                </SheetContent>
                            </Sheet>
                        </div>
                        <h3 className="font-semibold text-lg truncate flex-1 text-center md:text-left" title={activeChat.topic}>
                            {activeChat.topic}
                        </h3>
                        <Button variant="outline" size="icon" onClick={() => downloadChatHistory(activeChat)} title="Download chat history">
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto" ref={chatContainerRef}>
                        {(!activeChat.history || activeChat.history.length === 0) && !isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4 space-y-4">
                               <h1 className="text-4xl md:text-5xl font-headline font-normal tracking-tight">What are we learning today?</h1>
                               <p className="text-muted-foreground">Start by typing a topic or question below.</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-6">
                                {(activeChat.history || []).map((msg) => (
                                    <div key={msg.id} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                        {msg.role === 'assistant' ? <Bot className="w-8 h-8 rounded-full bg-primary text-primary-foreground p-1.5 shrink-0"/> : <User className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground p-1.5 shrink-0" />}
                                        <div className={cn("p-3 rounded-lg max-w-[80%]", msg.role === 'user' ? 'bg-primary text-primary-foreground' : (msg.isError ? 'bg-destructive/10' : 'bg-secondary'))}>
                                             {typeof msg.content === 'string' ? (
                                                <div className={cn("prose prose-sm dark:prose-invert max-w-none break-words", msg.isError && "text-destructive")}>
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                                </div>
                                             ) : (
                                                <div className="space-y-2">
                                                    {msg.content.media.contentType.startsWith('image/') ? (
                                                         <Image src={msg.content.media.dataUri} alt={msg.content.media.name} width={200} height={200} className="rounded-md object-cover"/>
                                                    ) : (
                                                        <div className="flex items-center gap-2 p-2 rounded-md bg-background/50">
                                                            <FileText className="h-5 w-5 shrink-0"/>
                                                            <span className="truncate">{msg.content.media.name}</span>
                                                        </div>
                                                    )}
                                                    {msg.content.text && <p>{msg.content.text}</p>}
                                                </div>
                                             )}
                                             {msg.role === 'assistant' && typeof msg.content === 'string' && !msg.isError && (
                                                <div className="text-right mt-2 flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 bg-secondary-foreground/10 hover:bg-secondary-foreground/20"
                                                        onClick={() => { if(typeof msg.content === 'string') handlePlayAudio(msg.id, msg.content); }}
                                                        disabled={isLoading}
                                                        title="Play audio"
                                                    >
                                                        {generatingAudioId === msg.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : speakingMessageId === msg.id ? (
                                                            <Pause className="h-4 w-4" />
                                                        ) : (
                                                            <Volume2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 bg-secondary-foreground/10 hover:bg-secondary-foreground/20"
                                                        onClick={() => { if (typeof msg.content === 'string') handleDownloadAudio(msg.content, msg.id); }}
                                                        disabled={isLoading}
                                                        title="Download audio"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && <div className="flex justify-start items-center gap-3"><Bot className="w-8 h-8 rounded-full bg-primary text-primary-foreground p-1.5 shrink-0"/><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t bg-card">
                        <form onSubmit={handleFormSubmit} className="relative">
                            <Textarea
                                ref={chatInputRef}
                                placeholder="Ask a follow-up question..."
                                className="pr-20"
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { handleFormSubmit(e); }}}
                                disabled={isLoading}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <Button size="icon" variant="ghost" className={cn("h-8 w-8", isListening && "text-destructive")} onClick={handleMicClick} type="button" disabled={isLoading}>
                                    {speakingMessageId ? <Pause className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                </Button>
                                <Button size="icon" className="h-8 w-8" type="submit" disabled={isLoading || isListening}><Send className="h-4 w-4" /></Button>
                            </div>
                        </form>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}
        </main>
      </div>
       <audio ref={audioRef} onEnded={() => setSpeakingMessageId(null)} className="hidden"/>
    </div>
  );
}

// Wrapper component to use Suspense
export default function GuidedLearningPageWrapper() {
    return (
        <Suspense fallback={
            <div className="flex flex-col min-h-screen">
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
        }>
            <GuidedLearningPage />
        </Suspense>
    );
}




    
