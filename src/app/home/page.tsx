

"use client";

import * as React from "react"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Search, Camera, FileText, Mic, X, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { useRouter } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Logo } from "@/components/icons/Logo";
import Autoplay from "embla-carousel-autoplay";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";


type AttachedFile = {
    name: string;
    dataUri: string;
    contentType: string;
};

function HomePageSearchForm() {
    const router = useRouter();
    const [topic, setTopic] = React.useState('');
    const [attachedFile, setAttachedFile] = React.useState<AttachedFile | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUri = e.target?.result as string;
            setAttachedFile({
                name: file.name,
                dataUri,
                contentType: file.type,
            });
        };
        reader.readAsDataURL(file);
    };

    const handleIconClick = (type: 'camera' | 'attachment' | 'mic') => {
        if (type === 'mic') {
            router.push('/home/learn?voice=true');
            return;
        }

        if (fileInputRef.current) {
            if (type === 'camera') {
                fileInputRef.current.accept = 'image/*';
                fileInputRef.current.setAttribute('capture', 'environment');
            } else { // attachment
                fileInputRef.current.accept = '.pdf,.doc,.docx,.txt,image/*';
                fileInputRef.current.removeAttribute('capture');
            }
            fileInputRef.current.click();
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() && !attachedFile) return;

        const promptData = {
            question: topic,
            media: attachedFile ? {
                dataUri: attachedFile.dataUri,
                contentType: attachedFile.contentType,
                name: attachedFile.name,
            } : undefined,
        };
        
        sessionStorage.setItem('pending_guided_learning_prompt', JSON.stringify(promptData));
        router.push('/home/learn');
    };

    return (
        <div className="relative max-w-xl mx-auto">
            {attachedFile && (
                <div className="absolute bottom-full left-0 right-0 mb-2 flex justify-center">
                    <div className="bg-secondary p-2 rounded-lg shadow-md flex items-center gap-2 text-sm">
                        {attachedFile.contentType.startsWith('image/') ? (
                            <Image src={attachedFile.dataUri} alt="preview" width={24} height={24} className="rounded-sm object-cover" />
                        ) : (
                            <FileText className="w-5 h-5 text-muted-foreground"/>
                        )}
                        <span className="text-muted-foreground truncate max-w-xs">{attachedFile.name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachedFile(null)}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
            )}
             <form onSubmit={handleSubmit} className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input 
                    type="search"
                    placeholder="Ask or search anything..."
                    className="h-14 rounded-full border-0 bg-secondary/50 pl-14 pr-20 text-base focus-visible:ring-2 focus-visible:ring-primary"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button type="button" size="icon" variant="secondary" className="rounded-full h-10 w-10">
                                <Plus className="h-5 w-5" />
                                <span className="sr-only">More search options</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto rounded-full p-1 bg-secondary">
                            <div className="flex items-center gap-1">
                                <Button type="button" size="icon" variant="ghost" className="rounded-full h-10 w-10 bg-background hover:bg-background/80" onClick={() => handleIconClick('camera')}>
                                    <Camera className="h-5 w-5" />
                                    <span className="sr-only">Search with image</span>
                                </Button>
                                <Button type="button" size="icon" variant="ghost" className="rounded-full h-10 w-10 bg-background hover:bg-background/80" onClick={() => handleIconClick('attachment')}>
                                    <FileText className="h-5 w-5" />
                                    <span className="sr-only">Search with attachment</span>
                                </Button>
                                <Button type="button" size="icon" variant="ghost" className="rounded-full h-10 w-10 bg-background hover:bg-background/80" onClick={() => handleIconClick('mic')}>
                                    <Mic className="h-5 w-5" />
                                    <span className="sr-only">Search with voice</span>
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </form>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
}

const features = [
    {
      title: "Study Spaces",
      description: "Combine notes, docs & videos into a unified knowledge base.",
      href: "/home/study-spaces",
      iconUrl: "https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fstudyspaces.png?alt=media&token=7c1e4d5a-8b00-4533-90fa-e54bd5c0da9b",
      color: "bg-blue-50 dark:bg-blue-900/50",
    },
    {
      title: "Note Generator",
      description: "Instantly create detailed study notes on any topic and level.",
      href: "/home/note-generator",
      iconUrl: "https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fnotes.png?alt=media&token=83bbb690-ee8d-4637-a134-1aed8fbc0a59",
      color: "bg-green-50 dark:bg-green-900/50",
    },
    {
      title: "Past Questions",
      description: "Test your knowledge and get an AI-powered revision plan.",
      href: "/home/past-questions",
      iconUrl: "https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fexams.png?alt=media&token=e7ba95af-f39f-49e8-becf-2d7fafed25db",
      color: "bg-yellow-50 dark:bg-yellow-900/50",
    },
    {
        title: "Guided Learning",
        description: "Engage in a conversation with an AI tutor to learn any topic step-by-step.",
        href: "/home/learn",
        iconUrl: "https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2FTemi%20guided%20learning.png?alt=media&token=dc9b84f1-56ef-4a1d-80ae-973d068fdf00",
        color: "bg-purple-50 dark:bg-purple-900/50",
    },
    {
        title: "Career Hub",
        description: "Get CV feedback, find jobs, and receive expert career advice.",
        href: "/home/career",
        iconUrl: "https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fcareer-path_12343398.png?alt=media&token=3d6bcbf8-ed24-40df-be03-0cec15031963",
        color: "bg-orange-50 dark:bg-orange-900/50",
    },
    {
        title: "Admissions Hub",
        description: "Find universities and scholarships that match your profile.",
        href: "/home/admissions",
        iconUrl: "https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fadmissions.png?alt=media&token=ee0a0794-32d2-4915-832a-da35ad25375a",
        color: "bg-indigo-50 dark:bg-indigo-900/50",
    }
];


export default function DashboardPage() {
  const carouselImage1 = PlaceHolderImages.find(p => p.id === 'carousel1')!;
  const carouselImage2 = PlaceHolderImages.find(p => p.id === 'carousel2')!;
  const carouselImage3 = PlaceHolderImages.find(p => p.id === 'carousel3')!;
  const carouselImage4 = PlaceHolderImages.find(p => p.id === 'carousel4')!;
  const carouselImage5 = PlaceHolderImages.find(p => p.id === 'carousel5')!;
  
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

  const mainCarouselPlugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  React.useEffect(() => {
    if (!api) {
      return
    }

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  return (
    <>
      <HomeHeader />
      <div className="p-4 sm:p-6 lg:p-8 space-y-12">
          <div className="text-center space-y-4 pt-10">
              <p className="text-xl text-muted-foreground">Hi, Firstname!</p>
              <h1 className="text-4xl md:text-5xl font-headline font-normal tracking-tight">What are we <br className="md:hidden" />learning today?</h1>
              <HomePageSearchForm />
          </div>

        <div className="space-y-8">
            <h2 className="text-2xl font-headline font-bold text-left">Get Started</h2>
            <div className="pt-8">
              <div className="grid gap-x-6 gap-y-16 grid-cols-2 lg:grid-cols-3">
                {features.map((feature, index) => (
                    <React.Fragment key={feature.title}>
                        {index === 4 && (
                            <div className="col-span-2 lg:col-span-3 -my-4">
                                <Separator />
                            </div>
                        )}
                        <HomeFeatureCard {...feature} />
                    </React.Fragment>
                ))}
              </div>
            </div>
        </div>
      </div>
    </>
  );
}

function HomeFeatureCard({ title, description, href, color, iconUrl }: { title: string, description: string, href: string, color: string, iconUrl: string }) {
  return (
    <Link href={href} className={cn("relative rounded-2xl p-6 flex flex-col pt-12 text-center group", color)}>
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white rounded-full p-3 shadow-md border-4 border-background">
        <Image src={iconUrl} alt={`${title} icon`} width={40} height={40} className="w-10 h-10 object-contain" />
      </div>

      <h3 className="font-headline text-xl font-bold text-foreground mb-2">{title}</h3>
      
      <p className="text-sm text-muted-foreground mt-2 mb-4">{description}</p>

      <div className="mt-auto pt-4">
        <div className="text-primary font-bold inline-flex items-center justify-center">
            Start Now
            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
