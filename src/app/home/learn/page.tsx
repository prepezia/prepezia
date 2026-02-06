
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HomeHeader } from '@/components/layout/HomeHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { guidedLearningChat, GuidedLearningChatOutput } from '@/ai/flows/guided-learning-chat';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Loader2, Mic, Pause, Plus, Send, Trash2, User, Volume2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types
type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type SavedChat = {
  id: string;
  topic: string;
  history: ChatMessage[];
  createdAt: string;
};

function GuidedLearningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // State
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [activeChat, setActiveChat] = useState<SavedChat | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Voice & Audio state
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);


  // Load saved chats from localStorage on mount
  useEffect(() => {
    try {
      const storedChats = localStorage.getItem('learnwithtemi_guided_chats');
      if (storedChats) {
        setSavedChats(JSON.parse(storedChats));
      }
    } catch (e) {
      console.error("Failed to load chats from localStorage", e);
    }
  }, []);

  // Effect to handle starting a new chat from a URL topic
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && !activeChat) {
      // Check if a chat with this topic already exists
      const existingChat = savedChats.find(c => c.topic.toLowerCase() === topic.toLowerCase());
      if (existingChat) {
        setActiveChat(existingChat);
      } else {
        handleNewChat(topic);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, savedChats]); // Add savedChats to dependency array

  // Save chats to localStorage whenever they change
  useEffect(() => {
    // Only save if there's something to save, prevents overwriting with empty array on initial load
    if (savedChats && savedChats.length > 0) {
        try {
            localStorage.setItem('learnwithtemi_guided_chats', JSON.stringify(savedChats));
        } catch (e) {
            console.error("Failed to save chats", e);
        }
    }
  }, [savedChats]);
  
  // Scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeChat?.history]);


  const handleNewChat = (topic?: string) => {
    const newChat: SavedChat = {
      id: `chat-${Date.now()}`,
      topic: topic || 'New Chat',
      history: [],
      createdAt: new Date().toISOString(),
    };
    setActiveChat(newChat);
    setSavedChats(prev => [newChat, ...prev]);

    if (topic) {
        submitMessage(topic, newChat, true);
    }
    
    router.replace('/home/learn', { scroll: false });
  };

  const handleSelectChat = (chatId: string) => {
    const chat = savedChats.find(c => c.id === chatId);
    if (chat) {
      setActiveChat(chat);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    setSavedChats(prev => {
        const newChats = prev.filter(c => c.id !== chatId);
        if (newChats.length === 0) {
            localStorage.removeItem('learnwithtemi_guided_chats');
        } else {
            localStorage.setItem('learnwithtemi_guided_chats', JSON.stringify(newChats));
        }
        return newChats;
    });
    if (activeChat?.id === chatId) {
      setActiveChat(null);
    }
  };
  
  const updateActiveChatHistory = (newHistory: ChatMessage[]) => {
      if (!activeChat) return;

      const updatedChat = { ...activeChat, history: newHistory };
      setActiveChat(updatedChat);

      setSavedChats(prev => 
          prev.map(c => c.id === activeChat.id ? updatedChat : c)
      );
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

  const submitMessage = useCallback(async (content: string, chatContext: SavedChat, isFirstMessage = false) => {
      if (!content.trim()) return;
      
      const currentHistory = chatContext.history || [];
      
      const userMessage: ChatMessage | null = isFirstMessage ? null : { role: 'user', content };
      const newHistoryWithUser = userMessage ? [...currentHistory, userMessage] : currentHistory;
      
      if(!isFirstMessage) {
        updateActiveChatHistory(newHistoryWithUser);
      }
      
      setIsLoading(true);

      try {
          const response: GuidedLearningChatOutput = await guidedLearningChat({
              topic: chatContext.topic,
              history: newHistoryWithUser,
          });

          const fullResponseContent = `${response.answer}\n\n**${response.followUpQuestion}**`;

          const assistantMessage: ChatMessage = {
              role: 'assistant',
              content: fullResponseContent,
          };
          
          updateActiveChatHistory([...newHistoryWithUser, assistantMessage]);

      } catch (e: any) {
          console.error("Guided learning chat error", e);
          const errorMessage: ChatMessage = {
              role: 'assistant',
              content: "Sorry, I encountered an error. Please try again.",
          };
          updateActiveChatHistory([...newHistoryWithUser, errorMessage]);
          toast({ variant: "destructive", title: "AI Error", description: e.message });
      } finally {
          setIsLoading(false);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
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

  return (
    <div className="flex flex-col h-screen">
      <HomeHeader />
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <aside className="w-72 flex-col border-r bg-card hidden md:flex">
           <div className="p-4 border-b">
                <Button className="w-full" onClick={() => handleNewChat()}>
                    <Plus className="mr-2 h-4 w-4" /> New Chat
                </Button>
           </div>
           <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {savedChats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => handleSelectChat(chat.id)}
                            className={cn(
                                "group flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-secondary",
                                activeChat?.id === chat.id && "bg-secondary"
                            )}
                        >
                            <p className="text-sm font-medium truncate flex-1">{chat.topic}</p>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id);}}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
           </ScrollArea>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
            {activeChat ? (
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b">
                        <h2 className="text-lg font-semibold">{activeChat.topic}</h2>
                    </div>
                    <ScrollArea className="flex-1 p-4" ref={chatContainerRef}>
                        <div className="space-y-6">
                            {(activeChat.history || []).map((msg, index) => (
                                <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                    {msg.role === 'assistant' ? <Bot className="w-8 h-8 rounded-full bg-primary text-primary-foreground p-1.5 shrink-0"/> : <User className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground p-1.5 shrink-0" />}
                                    <div className={cn("p-3 rounded-lg max-w-[80%]", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                                        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                        </div>
                                         {msg.role === 'assistant' && (
                                            <div className="text-right mt-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 bg-secondary-foreground/10 hover:bg-secondary-foreground/20"
                                                    onClick={() => handlePlayAudio(`${activeChat.id}-${index}`, msg.content)}
                                                    disabled={isLoading}
                                                >
                                                    {generatingAudioId === `${activeChat.id}-${index}` ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : speakingMessageId === `${activeChat.id}-${index}` ? (
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
                    </ScrollArea>
                    <div className="p-4 border-t bg-background">
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
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold">Guided Learning Chat</h2>
                    <p className="text-muted-foreground max-w-md mt-2">
                        Select a chat from the sidebar or start a new one to begin your learning journey.
                    </p>
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
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <GuidedLearningPage />
        </Suspense>
    );
}
