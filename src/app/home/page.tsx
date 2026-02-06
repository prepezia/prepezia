
"use client";

import * as React from "react"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Search, Briefcase } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useRouter } from 'next/navigation';


function HomePageSearchForm() {
    const router = useRouter();
    const [topic, setTopic] = React.useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (topic.trim()) {
            router.push(`/home/learn?topic=${encodeURIComponent(topic)}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                type="search"
                placeholder="What would you like to learn about today?"
                className="h-12 rounded-full border-0 bg-secondary/50 pl-12 pr-5 text-base focus-visible:ring-2 focus-visible:ring-primary"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
            />
        </form>
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
              <HomePageSearchForm />
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
