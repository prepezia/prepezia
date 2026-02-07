

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
import { Bot, Loader2, Mic, Pause, Plus, Send, Trash2, User, Volume2, FileText, Menu, X } from 'lucide-react';
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

  const submitMessage = useCallback(async (
    content: string, 
    chatContext: SavedChat, 
    options?: { media?: PendingPrompt['media'] }
  ) => {
    if ((!content.trim() && !options?.media) || isLoading) return;

    const userMessageContent: ChatMessageContent = options?.media
        ? { text: content, media: options.media }
        : content;

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: userMessageContent };
    
    const updatedHistoryForRequest = [...(chatContext.history || []), userMessage];
    const updatedChatForUI = { ...chatContext, history: updatedHistoryForRequest };

    setActiveChat(updatedChatForUI);
    // Temporarily update savedChats to include the user message immediately for better UI feedback
    setSavedChats(allChats => {
        const chatExists = allChats.some(c => c.id === updatedChatForUI.id);
        return chatExists ? allChats.map(c => c.id === updatedChatForUI.id ? updatedChatForUI : c) : [updatedChatForUI, ...allChats];
    });
    
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
        const finalChatState: SavedChat = { ...updatedChatForUI, history: finalHistory };
        
        setActiveChat(finalChatState);
        setSavedChats(allChats => allChats.map(c => c.id === finalChatState.id ? finalChatState : c));
        
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
                        const newTopic = titleResult.title;
                        setActiveChat(prev => prev ? { ...prev, topic: newTopic } : null);
                        setSavedChats(allChats => allChats.map(c => 
                            c.id === finalChatState.id ? { ...c, topic: newTopic } : c
                        ));
                    }
                } catch(e) {
                    console.error("Failed to generate chat title:", e);
                }
            })();
        }

    } catch (e: any) {
        console.error("Guided learning chat error", e);
        const errorMessage: ChatMessage = { id: `err-${Date.now()}`, role: 'assistant', content: "Sorry, I encountered an error. Please try again.", isError: true };
        
        setActiveChat(prev => {
            if(!prev) return null;
            const historyWithError = [...prev.history, errorMessage];
            const finalChatState = { ...prev, history: historyWithError };

            setSavedChats(allChats => allChats.map(c => c.id === finalChatState.id ? finalChatState : c));
            
            return finalChatState;
        });
        toast({ variant: "destructive", title: "AI Error", description: e.message });
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, toast]);
  
  const startNewChat = useCallback((prompt?: PendingPrompt) => {
    const newChat: SavedChat = {
        id: `chat-${Date.now()}`,
        topic: prompt?.question || 'New Chat',
        history: [],
        createdAt: new Date().toISOString(),
    };
    
    setSavedChats(prev => [newChat, ...prev]);

    if(prompt) {
        submitMessage(prompt.question, newChat, { media: prompt.media });
    } else {
        setActiveChat(newChat);
    }
    router.replace('/home/learn', { scroll: false });
  }, [router, submitMessage]);


  // Single useEffect to handle all initialization logic on mount
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
    
    const pendingPromptJSON = sessionStorage.getItem('pending_guided_learning_prompt');
    
    // CASE 1: There is a pending prompt from the homepage.
    if (pendingPromptJSON) {
        sessionStorage.removeItem('pending_guided_learning_prompt');
        try {
            const pendingPrompt: PendingPrompt = JSON.parse(pendingPromptJSON);
            const newChatId = `chat-${Date.now()}`;
            
            const newChat: SavedChat = {
                id: newChatId,
                topic: pendingPrompt.question || 'New Chat',
                history: [],
                createdAt: new Date().toISOString(),
            };

            // Add the new (empty) chat to state first
            setSavedChats(prev => [newChat, ...prev]);
            setActiveChat(newChat);
            
            // Now, submit the message to this newly created chat instance
            submitMessage(pendingPrompt.question, newChat, { media: pendingPrompt.media });
            
            router.replace('/home/learn', { scroll: false });
            return;
        } catch (e) {
             console.error("Failed to parse pending prompt", e);
        }
    }
    
    // CASE 2: No pending prompt, standard page load.
    const startWithVoice = searchParams.get('voice') === 'true';
    if (startWithVoice && !voiceInitRef.current) {
        voiceInitRef.current = true;
        startNewChat();
        setTimeout(() => handleMicClick(), 200); 
        router.replace('/home/learn', { scroll: false });
        return;
    }
    
    if (initialChats.length > 0 && !activeChat) {
        setActiveChat(initialChats[0]);
    } else if (initialChats.length === 0 && !activeChat) {
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
  
  const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (activeChat && chatInputRef.current) {
          const content = chatInputRef.current.value;
          submitMessage(content, activeChat);
          chatInputRef.current.value = '';
      }
  };
  
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (activeChat) {
            submitMessage(transcript, activeChat);
        }
      };
      recognition.onerror = (event) => {
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
        <div className="p-4 border-b text-center">
            <Button onClick={() => {
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
                            "group flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-secondary",
                            activeChat?.id === chat.id && "bg-secondary font-semibold"
                        )}
                    >
                        <p className="text-sm truncate flex-1">{chat.topic}</p>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id);}}>
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
      <div className="absolute top-4 left-4 z-50 md:hidden">
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                      <Menu className="h-6 w-6" />
                  </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 flex flex-col w-[80%]">
                    <SheetHeader className="p-4 border-b flex-row items-center justify-between">
                        <SheetTitle>My Chats</SheetTitle>
                        <SheetClose>
                            <X className="h-5 w-5" />
                            <span className="sr-only">Close</span>
                        </SheetClose>
                    </SheetHeader>
                  <ChatSidebarContent isMobile />
              </SheetContent>
          </Sheet>
      </div>

      <div className="absolute top-4 right-4 z-50">
        {isMounted ? <UserNav /> : <Skeleton className="h-10 w-10 rounded-full" />}
      </div>
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
                                                <div className="text-right mt-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 bg-secondary-foreground/10 hover:bg-secondary-foreground/20"
                                                        onClick={() => handlePlayAudio(msg.id, msg.content)}
                                                        disabled={isLoading}
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
