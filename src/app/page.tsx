"use client"

import * as React from "react"
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight, BookOpen, Mic, BrainCircuit, FileQuestion, Layers, Search } from 'lucide-react';
import LandingHeader from '@/components/layout/LandingHeader';
import LandingFooter from '@/components/layout/LandingFooter';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Logo } from "@/components/icons/Logo";

const AppStoreIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        fill="currentColor"
        viewBox="0 0 24 24"
        {...props}
    >
        <path d="M16.5,8.1A3.7,3.7,0,0,0,12,10a3.7,3.7,0,0,0,4.4,2.9,3.8,3.8,0,0,0,3.3-3.6A3.7,3.7,0,0,0,16.5,8.1ZM18,1.2a6,6,0,0,0-4.8,2.4A5.9,5.9,0,0,0,10.6,8a6.3,6.3,0,0,0,.8,3.2,6,6,0,0,0,4.8,2.7,6,6,0,0,0,4.8-2.4,6.2,6.2,0,0,0,1-4A6,6,0,0,0,18,1.2Z" />
        <path d="M21.2,12.8A.5.5,0,0,0,21,12.5a.5.5,0,0,0-.3.1l-2.4,2.2-1-3.2a.5.5,0,0,0-.5-.4.5.5,0,0,0-.5.4l-1,3.2-2.4-2.2a.5.5,0,0,0-.6,0,.5.5,0,0,0-.2.4.5.5,0,0,0,.2.4l2.4,2.2-1.3,4a.5.5,0,0,0,.2.6.5.5,0,0,0,.4.1.5.5,0,0,0,.4-.2l1.3-4,1.3,4a.5.5,0,0,0,.4.2.5.5,0,0,0,.4-.1.5.5,0,0,0,.2-.6l-1.3-4,2.4-2.2A.5.5,0,0,0,21.2,12.8Z" />
        <path d="M7.8,12.8A.5.5,0,0,0,7.5,12.5a.5.5,0,0,0-.3.1L4.8,14.8l-1-3.2a.5.5,0,0,0-1,0l-1,3.2L.4,12.6a.5.5,0,0,0-.8,0,.5.5,0,0,0,0,.7l2.4,2.2-1.3,4a.5.5,0,0,0,.2.6.5.5,0,0,0,.4.1.5.5,0,0,0,.4-.2l1.3-4,1.3,4a.5.5,0,0,0,.8,0,.5.5,0,0,0,.2-.6L5.4,15.5l2.4-2.2A.5.5,0,0,0,7.8,12.8Z" />
    </svg>
);

const PlayStoreIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        fill="currentColor"
        viewBox="0 0 24 24"
        {...props}
    >
        <path d="m2.6 2.4c-.4.2-.6.6-.7.9l-1.7 8.5.1.2 11.2 6.5 2.8-2.8-11.7-6.8z" />
        <path d="m21.8 12.1-2.9-1.6-2.7-2.7-11.2-6.5c-.2-.1-.5-.2-.7-.2l17.4 10.1c.1.1.2.2.3.3l.8 4.7-1-1.1z" />
        <path d="m.2 21.8 11.2 6.5 2.8-2.8-11.1-6.5-.2-.1-.1.2-.6 2.7z" />
        <path d="m14.5 21.5 11.1-6.4c.1-.1.2-.2.3-.3l-3-2.9-8.4 4.9z" />
    </svg>
);


export default function Home() {
  const carouselImage1 = PlaceHolderImages.find(p => p.id === 'carousel1')!;
  const carouselImage2 = PlaceHolderImages.find(p => p.id === 'carousel2')!;
  const carouselImage3 = PlaceHolderImages.find(p => p.id === 'carousel3')!;
  const carouselImage4 = PlaceHolderImages.find(p => p.id === 'carousel4')!;
  const carouselImage5 = PlaceHolderImages.find(p => p.id === 'carousel5')!;
  
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
                                    <div className="flex flex-col sm:flex-row gap-4 mt-6">
                                        <Button asChild size="lg" className="font-bold">
                                            <Link href="/auth/signup">Get Started <ArrowRight className="ml-2" /></Link>
                                        </Button>
                                        <Button asChild size="lg" variant="outline" className="font-bold">
                                            <Link href="/#download-app">Download App</Link>
                                        </Button>
                                    </div>
                                </div>
                                 <div className="relative h-80 md:h-96 w-full">
                                    <Image
                                        src={carouselImage1.imageUrl}
                                        alt={carouselImage1.description}
                                        fill
                                        className="object-contain rounded-lg"
                                        data-ai-hint={carouselImage1.imageHint}
                                        priority
                                    />
                                </div>
                            </div>
                        </CarouselItem>
                         <CarouselItem>
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Logo className="w-6 h-6 text-primary" />
                                        <span className="font-semibold text-primary">Learn with Temi</span>
                                    </div>
                                    <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                                        Dynamic Note Generation
                                    </h1>
                                    <p className="max-w-lg text-muted-foreground md:text-lg">
                                        Instantly create detailed study notes on any topic, at any academic level.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 mt-6">
                                        <Button asChild size="lg" className="font-bold">
                                            <Link href="/auth/signup">Get Started <ArrowRight className="ml-2" /></Link>
                                        </Button>
                                        <Button asChild size="lg" variant="outline" className="font-bold">
                                            <Link href="/#download-app">Download App</Link>
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative h-80 md:h-96 w-full">
                                    <Image
                                        src={carouselImage2.imageUrl}
                                        alt={carouselImage2.description}
                                        fill
                                        className="object-contain rounded-lg"
                                        data-ai-hint={carouselImage2.imageHint}
                                    />
                                </div>
                            </div>
                        </CarouselItem>
                        <CarouselItem>
                            <div className="grid md:grid-cols-2 gap-12 items-center">
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
                                    <div className="flex flex-col sm:flex-row gap-4 mt-6">
                                        <Button asChild size="lg" className="font-bold">
                                            <Link href="/auth/signup">Get Started <ArrowRight className="ml-2" /></Link>
                                        </Button>
                                        <Button asChild size="lg" variant="outline" className="font-bold">
                                            <Link href="/#download-app">Download App</Link>
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative h-80 md:h-96 w-full">
                                     <Image
                                        src={carouselImage3.imageUrl}
                                        alt={carouselImage3.description}
                                        fill
                                        className="object-contain rounded-lg"
                                        data-ai-hint={carouselImage3.imageHint}
                                    />
                                </div>
                            </div>
                        </CarouselItem>
                        <CarouselItem>
                            <div className="grid md:grid-cols-2 gap-12 items-center">
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
                                    <div className="flex flex-col sm:flex-row gap-4 mt-6">
                                        <Button asChild size="lg" className="font-bold">
                                            <Link href="/auth/signup">Get Started <ArrowRight className="ml-2" /></Link>
                                        </Button>
                                        <Button asChild size="lg" variant="outline" className="font-bold">
                                            <Link href="/#download-app">Download App</Link>
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative h-80 md:h-96 w-full">
                                     <Image
                                        src={carouselImage4.imageUrl}
                                        alt={carouselImage4.description}
                                        fill
                                        className="object-contain rounded-lg"
                                        data-ai-hint={carouselImage4.imageHint}
                                    />
                                </div>
                            </div>
                        </CarouselItem>
                        <CarouselItem>
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div className="space-y-4">
                                     <div className="flex items-center gap-2">
                                        <Logo className="w-6 h-6 text-primary" />
                                        <span className="font-semibold text-primary">Learn with Temi</span>
                                    </div>
                                    <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                                        AI Deep Dive Research
                                    </h1>
                                    <p className="max-w-lg text-muted-foreground md:text-lg">
                                        Go beyond surface-level answers. Let our AI conduct in-depth research on any topic.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 mt-6">
                                        <Button asChild size="lg" className="font-bold">
                                            <Link href="/auth/signup">Get Started <ArrowRight className="ml-2" /></Link>
                                        </Button>
                                        <Button asChild size="lg" variant="outline" className="font-bold">
                                            <Link href="/#download-app">Download App</Link>
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative h-80 md:h-96 w-full">
                                     <Image
                                        src={carouselImage5.imageUrl}
                                        alt={carouselImage5.description}
                                        fill
                                        className="object-contain rounded-lg"
                                        data-ai-hint={carouselImage5.imageHint}
                                    />
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
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              <FeatureCard
                icon={<Search className="w-10 h-10 text-primary" />}
                title="AI Deep Dive Research"
                description="Go beyond simple answers. Our AI performs in-depth research on any topic for comprehensive understanding."
              />
            </div>
          </div>
        </section>

        {/* Download App Section */}
        <section id="download-app" className="py-16 md:py-24 bg-secondary">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-4 text-center md:text-left">
                <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">Learn On The Go</h2>
                <p className="text-muted-foreground text-lg max-w-md mx-auto md:mx-0">
                  Download the Learn with Temi app to access all your study materials, chats, and notes anytime, anywhere.
                </p>
                <div className="flex justify-center md:justify-start space-x-4 mt-6">
                  <Link href="#" className="inline-flex items-center justify-center rounded-lg bg-foreground text-background px-4 py-3 text-sm font-medium transition-colors hover:bg-foreground/90">
                    <AppStoreIcon className="w-6 h-6 mr-2 fill-current" />
                    <span>
                      <span className="block text-xs">Download on the</span>
                      <span className="block font-semibold">App Store</span>
                    </span>
                  </Link>
                  <Link href="#" className="inline-flex items-center justify-center rounded-lg bg-foreground text-background px-4 py-3 text-sm font-medium transition-colors hover:bg-foreground/90">
                    <PlayStoreIcon className="w-6 h-6 mr-2 fill-current" />
                    <span>
                      <span className="block text-xs">GET IT ON</span>
                      <span className="block font-semibold">Google Play</span>
                    </span>
                  </Link>
                </div>
              </div>
              <div className="relative h-80 md:h-96 w-full">
                <Image
                    src="https://picsum.photos/seed/app-mockup/800/800"
                    alt="Learn with Temi mobile app mockup"
                    fill
                    className="object-contain"
                    data-ai-hint="app mockup"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 md:py-24 bg-card">
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
