"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, Briefcase } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/card";


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
        title: "AI Deep Dive",
        description: "Go beyond surface-level answers. Let our AI conduct in-depth research on any topic.",
        href: "/home/note-generator",
        iconUrl: "https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2FAI%20(1).png?alt=media&token=d1ab08e5-e3ee-4a81-ab42-736b24cc004b",
        color: "bg-red-50 dark:bg-red-900/50",
    },
    {
        title: "Podcast Generation",
        description: "Turn your sources into an engaging podcast-style conversation.",
        href: "/home/study-spaces",
        iconUrl: "https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fpodcast.png?alt=media&token=a2db65d9-beea-46e7-a138-efa9ced62e32",
        color: "bg-purple-50 dark:bg-purple-900/50",
    }
];


export default function DashboardPage() {
  return (
    <>
      <HomeHeader />
      <div className="p-4 sm:p-6 lg:p-8 space-y-12">
          <div className="text-center space-y-4 pt-10">
              <p className="text-xl text-muted-foreground">Hi, Firstname!</p>
              <h1 className="text-4xl md:text-5xl font-headline font-normal tracking-tight">What are we <br className="md:hidden" />learning today?</h1>
              <div className="relative max-w-xl mx-auto">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                      type="search"
                      placeholder="Search any topic"
                      className="h-12 rounded-full border-0 bg-secondary/50 pl-12 pr-5 text-base focus-visible:ring-2 focus-visible:ring-primary"
                  />
              </div>
          </div>

        <div className="space-y-8">
            <h2 className="text-2xl font-headline font-bold text-left">Get Started</h2>
            <div className="pt-8">
              <div className="grid gap-x-6 gap-y-16 grid-cols-2 lg:grid-cols-3">
                {features.map(feature => (
                    <HomeFeatureCard
                      key={feature.title}
                      {...feature}
                    />
                ))}
              </div>
            </div>
        </div>

        <div className="space-y-8 pt-16">
            <Card className="p-8 md:p-12 bg-secondary rounded-2xl border-2 border-dashed max-w-4xl mx-auto">
                 <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="relative h-32 w-32 md:h-48 md:w-48 md:order-2 md:ml-auto">
                       <Image
                            src="https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fcareer-path_12343398.png?alt=media&token=3d6bcbf8-ed24-40df-be03-0cec15031963"
                            alt="Career Path Icon"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <div className="md:order-1">
                        <h3 className="text-2xl font-headline font-bold text-foreground">Unlock Your Career Potential</h3>
                        <p className="mt-4 text-muted-foreground">
                            Get personalized CV feedback, find relevant jobs, and receive expert career advice—all powered by AI.
                        </p>
                        <Button asChild size="lg" className="mt-8 font-bold">
                            <Link href="/home/career?start=form">
                                Go to Career Hub <ArrowRight className="ml-2 w-5 h-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </Card>
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
