"use client"

import * as React from "react"
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight, Loader2, School } from 'lucide-react';
import LandingHeader from '@/components/layout/LandingHeader';
import LandingFooter from '@/components/layout/LandingFooter';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Logo } from "@/components/icons/Logo";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore } from "@/firebase";
import { collection, DocumentData, CollectionReference, query, orderBy } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampus } from "@/hooks/use-campus";

interface Testimonial extends DocumentData {
  id: string;
  name: string;
  title: string;
  text: string;
}

export default function Home() {
  const firestore = useFirestore();
  const { campus } = useCampus();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const testimonialsRef = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'testimonials'), orderBy('createdAt', 'desc')) as CollectionReference<Testimonial>;
  }, [firestore]);
  
  const { data: testimonials, loading: testimonialsLoading } = useCollection<Testimonial>(testimonialsRef);

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

  const testimonialsPlugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  const features = [
    {
      category: 'For Students',
      title: 'AI-Powered StudySpaces',
      imageUrl: carouselImage1.imageUrl,
      imageHint: carouselImage1.imageHint,
      tags: ['PDFs', 'Audio', 'Web Links', 'YouTube'],
      color: 'bg-yellow-50 dark:bg-yellow-900/50',
      tagColor: 'bg-yellow-200 dark:bg-yellow-800/60',
    },
    {
      category: 'For Everyone',
      title: 'Dynamic Note Generation',
      imageUrl: carouselImage2.imageUrl,
      imageHint: carouselImage2.imageHint,
      tags: ['Any Topic', 'Any Level', 'Comprehensive', 'Instant'],
      color: 'bg-green-50 dark:bg-green-900/50',
      tagColor: 'bg-green-200 dark:bg-green-800/60',
    },
    {
      category: 'For Exam Prep',
      title: 'Ghana Past Questions Hub',
      imageUrl: carouselImage3.imageUrl,
      imageHint: carouselImage3.imageHint,
      tags: ['BECE', 'WASSCE', 'University', 'Mock Exams'],
      color: 'bg-sky-50 dark:bg-sky-900/50',
      tagColor: 'bg-sky-200 dark:bg-sky-800/60',
    },
    {
      category: 'For Audio Learners',
      title: 'Podcast Generation',
      imageUrl: carouselImage4.imageUrl,
      imageHint: carouselImage4.imageHint,
      tags: ['Audio Overview', 'On The Go', 'Zia & Jay', 'Conversational'],
      color: 'bg-purple-50 dark:bg-purple-900/50',
      tagColor: 'bg-purple-200 dark:bg-purple-800/60',
    },
    {
      category: 'For Researchers',
      title: 'AI Deep Dive Research',
      imageUrl: carouselImage5.imageUrl,
      imageHint: carouselImage5.imageHint,
      tags: ['In-depth Analysis', 'Complex Topics', 'Research Assistant', 'Go Beyond'],
      color: 'bg-red-50 dark:bg-red-900/50',
      tagColor: 'bg-red-200 dark:bg-red-800/60',
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-grow">
        {/* Carousel Section */}
        <section className="w-full py-12 md:py-20 bg-card">
            <div className="container mx-auto px-5 md:px-6">
                <Carousel 
                    setApi={setApi} 
                    className="relative" 
                    opts={{ loop: true }}
                    plugins={[mainCarouselPlugin.current]}
                    onMouseEnter={mainCarouselPlugin.current.stop}
                    onMouseLeave={mainCarouselPlugin.current.reset}
                >
                    <CarouselContent>
                        <CarouselItem>
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div className="space-y-4 pt-5 text-center md:text-left">
                                    <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                                        Prep easier {campus && isMounted ? `at ${campus.shortName}` : ''}, with Prepezia.
                                    </h1>
                                    <p className="max-w-lg text-muted-foreground md:text-lg mx-auto md:mx-0">
                                        Your AI-powered learning partner for research, exam prep, and career growth. {campus && isMounted ? `Tailored specifically for ${campus.shortName} students.` : 'Learn faster and test smarter with Zia.'}
                                    </p>
                                    <div className="flex flex-col items-center sm:flex-row gap-4 mt-6 justify-center md:justify-start">
                                        <Button asChild size="lg" className="font-bold sm:w-auto">
                                            <Link href="/auth/signup">Get Started <ArrowRight className="ml-2" /></Link>
                                        </Button>
                                        <Button asChild size="lg" variant="outline" className="font-bold sm:w-auto">
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
                                <div className="space-y-4 pt-5 text-center md:text-left">
                                    <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                                        Dynamic Note Generation
                                    </h1>
                                    <p className="max-w-lg text-muted-foreground md:text-lg mx-auto md:mx-0">
                                        Instantly create detailed study notes on any topic, at any academic level with Zia.
                                    </p>
                                    <div className="flex flex-col items-center sm:flex-row gap-4 mt-6 justify-center md:justify-start">
                                        <Button asChild size="lg" className="font-bold sm:w-auto">
                                            <Link href="/auth/signup">Get Started <ArrowRight className="ml-2" /></Link>
                                        </Button>
                                        <Button asChild size="lg" variant="outline" className="font-bold sm:w-auto">
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
                                <div className="space-y-4 pt-5 text-center md:text-left">
                                    <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                                        {campus && isMounted ? `${campus.shortName}` : 'Ghana'} Past Questions Hub
                                    </h1>
                                    <p className="max-w-lg text-muted-foreground md:text-lg mx-auto md:mx-0">
                                        Practice with BECE, WASSCE, and university past questions. Get AI-driven feedback from Zia.
                                    </p>
                                    <div className="flex flex-col items-center sm:flex-row gap-4 mt-6 justify-center md:justify-start">
                                        <Button asChild size="lg" className="font-bold sm:w-auto">
                                            <Link href="/auth/signup">Get Started <ArrowRight className="ml-2" /></Link>
                                        </Button>
                                        <Button asChild size="lg" variant="outline" className="font-bold sm:w-auto">
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
                                <div className="space-y-4 pt-5 text-center md:text-left">
                                    <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                                        Generate Notes & Podcasts
                                    </h1>
                                    <p className="max-w-lg text-muted-foreground md:text-lg mx-auto md:mx-0">
                                        Instantly create study notes and audio summaries from your materials with Zia.
                                    </p>
                                    <div className="flex flex-col items-center sm:flex-row gap-4 mt-6 justify-center md:justify-start">
                                        <Button asChild size="lg" className="font-bold sm:w-auto">
                                            <Link href="/auth/signup">Get Started <ArrowRight className="ml-2" /></Link>
                                        </Button>
                                        <Button asChild size="lg" variant="outline" className="font-bold sm:w-auto">
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
                                <div className="space-y-4 pt-5 text-center md:text-left">
                                    <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                                        AI Deep Dive Research
                                    </h1>
                                    <p className="max-w-lg text-muted-foreground md:text-lg mx-auto md:mx-0">
                                        Go beyond surface-level answers. Let Zia conduct in-depth research on any topic.
                                    </p>
                                    <div className="flex flex-col items-center sm:flex-row gap-4 mt-6 justify-center md:justify-start">
                                        <Button asChild size="lg" className="font-bold sm:w-auto">
                                            <Link href="/auth/signup">Get Started <ArrowRight className="ml-2" /></Link>
                                        </Button>
                                        <Button asChild size="lg" variant="outline" className="font-bold sm:w-auto">
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
          <div className="container mx-auto px-5 md:px-6">
            <div className="text-center mb-12">
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">Prepezia: Prep Easier</h2>
              <p className="mt-2 text-muted-foreground text-lg">Harness the power of AI to learn faster, test smarter, and build your career with Zia.</p>
            </div>
            <div className="mx-auto grid max-w-sm grid-cols-1 gap-8 md:mx-0 md:max-w-none md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 md:py-24 bg-card">
          <div className="container mx-auto px-5 md:px-6">
            <div className="text-center mb-12">
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground">Trusted by Students Across Ghana</h2>
            </div>
            <Carousel
              plugins={[testimonialsPlugin.current]}
              className="w-full max-w-2xl mx-auto"
              onMouseEnter={testimonialsPlugin.current.stop}
              onMouseLeave={testimonialsPlugin.current.reset}
              opts={{
                loop: true,
              }}
            >
              <CarouselContent>
                {testimonialsLoading && (
                    <CarouselItem>
                        <div className="p-1"><Skeleton className="h-48 w-full" /></div>
                    </CarouselItem>
                )}
                {testimonials && testimonials.map((testimonial) => (
                  <CarouselItem key={testimonial.id}>
                    <div className="p-1">
                      <TestimonialCard
                        quote={testimonial.text}
                        name={testimonial.name}
                        title={testimonial.title}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </section>

        {/* Download App Section */}
        <section id="download-app" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-5 md:px-6">
            <div className="relative z-10 bg-primary text-primary-foreground rounded-2xl shadow-2xl p-8 md:p-12 lg:p-16 mb-[-138px]">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-4 text-center md:text-left">
                  <h2 className="font-headline text-3xl md:text-4xl font-bold">Learn On The Go</h2>
                  <p className="text-lg max-w-md mx-auto md:mx-0 opacity-90">
                    Download the Prepezia app to access all your study materials, Zia chats, and notes anytime, anywhere.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center md:justify-start space-x-0 sm:space-x-4 space-y-4 sm:space-y-0 mt-6">
                    <Link href="#" className="inline-flex items-center justify-center rounded-lg bg-primary-foreground text-primary px-4 py-3 text-sm font-medium transition-colors hover:bg-primary-foreground/90">
                      <Image
                          src="https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fapple_546072.png?alt=media&token=aa36ac4c-401b-4d98-acd1-5c24889205fe"
                          alt="Download on the App Store"
                          width={24}
                          height={24}
                          className="mr-2"
                      />
                      <span>
                        <span className="block text-xs">Download on the</span>
                        <span className="block font-semibold">App Store</span>
                      </span>
                    </Link>
                    <Link href="#" className="inline-flex items-center justify-center rounded-lg bg-primary-foreground text-primary px-4 py-3 text-sm font-medium transition-colors hover:bg-primary-foreground/90">
                      <Image
                          src="https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fandroid-character-symbol_25374.png?alt=media&token=1584821d-8f37-44e3-a387-b96b454a6a87"
                          alt="Get it on Google Play"
                          width={24}
                          height={24}
                          className="mr-2"
                      />
                      <span>
                        <span className="block text-xs">GET IT ON</span>
                        <span className="block font-semibold">Google Play</span>
                      </span>
                    </Link>
                  </div>
                </div>
                <div className="relative h-80 md:h-96 w-full hidden md:block">
                  <Image
                      src="https://picsum.photos/seed/app-mockup/800/800"
                      alt="Prepezia mobile app mockup"
                      fill
                      className="object-contain"
                      data-ai-hint="app mockup"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function FeatureCard({ category, title, imageUrl, imageHint, tags, color, tagColor }: { category: string, title: string, imageUrl: string, imageHint: string, tags: string[], color: string, tagColor: string }) {
  return (
    <div className={cn("rounded-3xl p-6 md:p-8 flex flex-col shadow-md hover:shadow-lg transition-shadow", color)}>
      <div className="text-center">
        <p className="font-semibold text-zinc-700 dark:text-zinc-400">{category}</p>
        <h3 className={cn("font-headline text-zinc-900 dark:text-zinc-100 text-2xl md:text-3xl font-bold mt-2")}>{title}</h3>
      </div>
      <div className="relative w-full h-48 my-6">
        <Image src={imageUrl} alt={title} fill className="object-contain" data-ai-hint={imageHint} />
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-auto">
        {tags.map((tag) => (
          <span key={tag} className={cn("text-sm font-medium text-zinc-800 dark:text-zinc-200 px-4 py-2 rounded-lg", tagColor)}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

function TestimonialCard({ quote, name, title }: { quote: string, name: string, title: string }) {
  return (
    <Card className="shadow-lg text-center">
      <CardContent className="pt-6">
        <p className="text-muted-foreground italic">"{quote}"</p>
      </CardContent>
      <CardHeader className="items-center pt-0">
        <Avatar>
          <AvatarImage src={`https://i.pravatar.cc/150?u=${name}`} />
          <AvatarFallback>{name.substring(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold text-foreground mt-2">{name}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardHeader>
    </Card>
  );
}
