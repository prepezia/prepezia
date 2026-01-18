"use client"

import * as React from "react"
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight, BookOpen, Mic, BrainCircuit, FileQuestion } from 'lucide-react';
import LandingHeader from '@/components/layout/LandingHeader';
import LandingFooter from '@/components/layout/LandingFooter';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Logo } from "@/components/icons/Logo";

export default function Home() {
  const carouselImage1 = PlaceHolderImages.find(p => p.id === 'carousel1')!;
  const carouselImage2 = PlaceHolderImages.find(p => p.id === 'carousel2')!;
  const carouselImage3 = PlaceHolderImages.find(p => p.id === 'carousel3')!;
  
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

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
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-grow">
        {/* Carousel Section */}
        <section className="w-full py-12 md:py-20 bg-card">
            <div className="container mx-auto px-4 md:px-6">
                <Carousel setApi={setApi} className="relative" opts={{ loop: true }}>
                    <CarouselContent>
                        <CarouselItem>
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div className="relative h-80 md:h-96 w-full">
                                    <Image
                                        src={carouselImage1.imageUrl}
                                        alt={carouselImage1.description}
                                        fill
                                        className="object-contain"
                                        data-ai-hint={carouselImage1.imageHint}
                                        priority
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Logo className="w-6 h-6 text-primary" />
                                        <span className="font-semibold text-primary">Learn with Temi</span>
                                    </div>
                                    <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                                        AI-Powered StudySpaces
                                    </h1>
                                    <p className="max-w-lg text-muted-foreground md:text-lg">
                                        Upload your notes, PDFs, and even YouTube links to create a unified knowledge base.
                                    </p>
                                    <Button asChild size="lg" className="mt-4 font-bold">
                                        <Link href="/auth/signup">Create a StudySpace <ArrowRight className="ml-2" /></Link>
                                    </Button>
                                </div>
                            </div>
                        </CarouselItem>
                         <CarouselItem>
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div className="relative h-80 md:h-96 w-full">
                                    <Image
                                        src={carouselImage2.imageUrl}
                                        alt={carouselImage2.description}
                                        fill
                                        className="object-contain"
                                        data-ai-hint={carouselImage2.imageHint}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Logo className="w-6 h-6 text-primary" />
                                        <span className="font-semibold text-primary">Learn with Temi</span>
                                    </div>
                                    <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                                        Ghana Past Questions Hub
                                    </h1>
                                    <p className="max-w-lg text-muted-foreground md:text-lg">
                                        Practice with BECE, WASSCE, and university past questions. Get AI-driven feedback.
                                    </p>
                                    <Button asChild size="lg" className="mt-4 font-bold">
                                        <Link href="/home/past-questions">Start Practicing <ArrowRight className="ml-2" /></Link>
                                    </Button>
                                </div>
                            </div>
                        </CarouselItem>
                        <CarouselItem>
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div className="relative h-80 md:h-96 w-full">
                                     <Image
                                        src={carouselImage3.imageUrl}
                                        alt={carouselImage3.description}
                                        fill
                                        className="object-contain"
                                        data-ai-hint={carouselImage3.imageHint}
                                    />
                                </div>
                                <div className="space-y-4">
                                     <div className="flex items-center gap-2">
                                        <Logo className="w-6 h-6 text-primary" />
                                        <span className="font-semibold text-primary">Learn with Temi</span>
                                    </div>
                                    <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                                        Generate Notes & Podcasts
                                    </h1>
                                    <p className="max-w-lg text-muted-foreground md:text-lg">
                                        Instantly create study notes and audio summaries from your materials.
                                    </p>
                                    <Button asChild size="lg" className="mt-4 font-bold">
                                        <Link href="/home/note-generator">Generate Now <ArrowRight className="ml-2" /></Link>
                                    </Button>
                                </div>
                            </div>
                        </CarouselItem>
                    </CarouselContent>
                    <CarouselPrevious className="absolute left-[-50px] top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
                    <CarouselNext className="absolute right-[-50px] top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
                </Carousel>
                <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: count }).map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => api?.scrollTo(i)}
                            className={`h-2 rounded-full transition-all ${current === i ? 'w-4 bg-primary' : 'w-2 bg-primary/20'}`}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>


        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">Amazing Services & Features For You</h2>
              <p className="mt-2 text-muted-foreground text-lg">Harness the power of AI to learn faster and test smarter.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<BookOpen className="w-10 h-10 text-primary" />}
                title="AI-Powered StudySpaces"
                description="Upload PDFs, audio, web links, and YouTube videos to create a unified knowledge base you can chat with."
              />
              <FeatureCard
                icon={<Mic className="w-10 h-10 text-primary" />}
                title="Podcast Overviews"
                description="Turn your study materials into an engaging podcast-style conversation between our AI hosts, Temi & Jay."
              />
              <FeatureCard
                icon={<BrainCircuit className="w-10 h-10 text-primary" />}
                title="Dynamic Note Generation"
                description="Instantly generate comprehensive study notes on any topic, tailored to your academic level."
              />
              <FeatureCard
                icon={<FileQuestion className="w-10 h-10 text-primary" />}
                title="Ghana Past Questions Hub"
                description="Access a vast library of past questions from BECE to University and take timed mock exams."
              />
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 md:py-24 bg-secondary">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">Trusted by Students Across Ghana</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <TestimonialCard
                quote="Learn with Temi changed the game for my WASSCE prep. The AI chat helped me understand concepts I was stuck on for weeks."
                name="Ama Serwaa"
                title="WASSCE Candidate"
              />
              <TestimonialCard
                quote="The podcast generator is pure genius! I listen to my notes on the go. It's like having a personal study group in my pocket."
                name="Kofi Mensah"
                title="University of Ghana Student"
              />
              <TestimonialCard
                quote="As a BECE student, the past questions hub was invaluable. The AI roadmap showed me exactly where to focus my revision."
                name="Adwoa Agyapong"
                title="BECE Candidate"
              />
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
          {icon}
        </div>
        <CardTitle className="font-headline mt-4 text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function TestimonialCard({ quote, name, title }: { quote: string, name: string, title: string }) {
  return (
    <Card className="flex flex-col justify-between shadow-lg">
      <CardContent className="pt-6">
        <p className="text-muted-foreground italic">"{quote}"</p>
      </CardContent>
      <CardHeader className="flex-row items-center gap-4">
        <Avatar>
          <AvatarImage src={`https://i.pravatar.cc/150?u=${name}`} />
          <AvatarFallback>{name.substring(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardHeader>
    </Card>
  );
}
