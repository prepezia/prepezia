

'use client';

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { guidedLearningChat, GuidedLearningChatOutput } from '@/ai/flows/guided-learning-chat';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { generateChatTitle } from '@/ai/flows/generate-chat-title';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Loader2, Mic, Pause, Plus, Send, Trash2, User, Volume2, FileText, Menu, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Progress } from '@/components/ui/progress';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { doc, addDoc, updateDoc, deleteDoc, collection, query, where, orderBy, serverTimestamp, Timestamp, DocumentData, CollectionReference, DocumentReference } from "firebase/firestore";

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

interface SavedChat extends DocumentData {
  id: string;
  userId: string;
  topic: string;
  history: ChatMessage[];
  createdAt: Timestamp;
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
  const { user } = useUser();
  const firestore = useFirestore();

  // State
  const [activeChat, setActiveChat] = useState<SavedChat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  const chatsQuery = useMemo(() => {
    if (user && firestore) {
        return query(
            collection(firestore, 'users', user.uid, 'guided_chats'),
            orderBy('createdAt', 'desc')
        ) as CollectionReference<SavedChat>;
    }
    return null;
  }, [user, firestore]);

  const { data: savedChats, loading: chatsLoading } = useCollection<SavedChat>(chatsQuery);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeChat?.history]);

  const updateActiveChatInFirestore = useCallback((chatId: string, updates: Partial<Omit<SavedChat, 'id'>>) => {
      if (!user || !firestore) return;
      const chatDocRef = doc(firestore, 'users', user.uid, 'guided_chats', chatId);
      updateDoc(chatDocRef, updates).catch(err => {
          console.error("Failed to update chat in Firestore:", err);
          toast({ variant: 'destructive', title: "Save failed", description: "Could not save your changes to the server." });
      });
  }, [user, firestore, toast]);

  const downloadChatHistory = (chat: SavedChat) => {
    let content = `Topic: ${chat.topic}\n`;
    content += `Date: ${new Date(chat.createdAt.seconds * 1000).toLocaleString()}\n\n`;
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
    if ((!content.trim() && !options?.media) || isLoading || !user || !firestore) return;

    const userMessageContent: ChatMessageContent = options?.media
        ? { text: content, media: options.media }
        : content;

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: userMessageContent };
    
    const updatedHistoryForRequest = [...(chatContext.history || []), userMessage];
    
    // Optimistically update the UI.
    setActiveChat(prev => prev ? { ...prev, history: updatedHistoryForRequest } : null);
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
        
        // Optimistically update with AI response
        setActiveChat(prev => prev ? { ...prev, history: finalHistory } : null);

        const progress = Math.min((finalHistory.length / 10) * 100, 100);
        const currentStatus = chatContext.status === 'Not Started' ? 'In Progress' : (progress >= 100 ? 'Completed' : 'In Progress');

        updateActiveChatInFirestore(chatContext.id, { history: finalHistory, progress, status: currentStatus });
        
        const isFirstAssistantMessage = finalHistory.filter(m => m.role === 'assistant' && !m.isError).length === 1;

        if (isFirstAssistantMessage) {
            (async () => {
                try {
                    const titleResult = await generateChatTitle({
                        history: finalHistory.slice(0, 2).map(m => ({
                            role: m.role,
                            content: typeof m.content === 'string' ? m.content : m.content.text,
                        }))
                    });
                    if (titleResult.title) {
                        updateActiveChatInFirestore(chatContext.id, { topic: titleResult.title });
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
        updateActiveChatInFirestore(chatContext.id, { history: [...updatedHistoryForRequest, errorMessage] });
        toast({ variant: "destructive", title: "AI Error", description: e.message });
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, toast, updateActiveChatInFirestore, handlePlayAudio, user, firestore]);
  
  const startNewChat = useCallback(async (prompt?: PendingPrompt) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'User not signed in.' });
      return;
    }
    
    const newChatData = {
        userId: user.uid,
        topic: prompt?.question || 'New Chat',
        history: [],
        createdAt: serverTimestamp(),
        progress: 0,
        status: 'Not Started',
    };
    
    try {
        const docRef = await addDoc(collection(firestore, 'users', user.uid, 'guided_chats'), newChatData);

        if(prompt) {
            // Need to create a temporary SavedChat object to pass to submitMessage
            const tempChat: SavedChat = {
                ...newChatData,
                id: docRef.id,
                createdAt: Timestamp.now()
            };
            submitMessage(prompt.question, tempChat, { media: prompt.media });
        }
        
        router.replace('/home/learn', { scroll: false });
    } catch(e) {
        console.error("Failed to create new chat:", e);
        toast({ variant: 'destructive', title: 'Failed to start chat.' });
    }

  }, [user, firestore, router, submitMessage, toast]);

    const handleMicClick = useCallback(() => {
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
    }, [isListening, speakingMessageId, toast]);

    useEffect(() => {
        if (chatsLoading || !user) return;

        if (savedChats) {
            if (activeChat) {
                const updatedActiveChat = savedChats.find(c => c.id === activeChat.id);
                if (updatedActiveChat) {
                    if (updatedActiveChat.history.length !== activeChat.history.length) {
                        setActiveChat(updatedActiveChat);
                    }
                } else {
                    setActiveChat(savedChats[0] || null);
                }
            } else if (savedChats.length > 0) {
                setActiveChat(savedChats[0]);
            } else {
                setActiveChat(null);
            }
        }

        const startWithVoice = searchParams.get('voice') === 'true';

        if (!voiceInitRef.current) {
            const pendingPromptJSON = sessionStorage.getItem('pending_guided_learning_prompt');
            if (pendingPromptJSON) {
                sessionStorage.removeItem('pending_guided_learning_prompt');
                try {
                    const pendingPrompt: PendingPrompt = JSON.parse(pendingPromptJSON);
                    startNewChat(pendingPrompt);
                } catch(e) {
                    console.error("Failed to parse pending prompt.", e);
                }
                return;
            }

            if (startWithVoice) {
                voiceInitRef.current = true;
                if (savedChats && savedChats.length > 0) {
                     setActiveChat(savedChats[0]);
                } else {
                    startNewChat();
                }
                setTimeout(() => handleMicClick(), 200); 
                router.replace('/home/learn', { scroll: false });
                return;
            }
        }
        
        if (!chatsLoading && (!savedChats || savedChats.length === 0)) {
            startNewChat();
        }
    }, [savedChats, chatsLoading, user, startNewChat, router, handleMicClick, searchParams, activeChat]);

  const handleSelectChat = (chatId: string) => {
    const chat = savedChats?.find(c => c.id === chatId);
    if (chat) {
      setActiveChat(chat);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!user || !firestore) return;
    try {
        await deleteDoc(doc(firestore, 'users', user.uid, 'guided_chats', chatId));
        toast({ title: 'Chat Deleted' });
        // The active chat will update automatically via the useCollection hook
    } catch (e) {
        console.error("Failed to delete chat:", e);
        toast({ variant: 'destructive', title: 'Deletion Failed' });
    }
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
                {chatsLoading ? (
                    <div className="p-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto"/></div>
                ) : savedChats?.map(chat => (
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
            {chatsLoading && !activeChat ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : activeChat ? (
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
                     <p className="text-muted-foreground">Select a chat or start a new one.</p>
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

    

    