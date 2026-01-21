"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, BrainCircuit, FileQuestion, Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const features = [
    {
      title: "Create a Study Space",
      description: "Combine notes, docs & videos into a unified knowledge base.",
      href: "/home/study-spaces",
      icon: <BookOpen className="w-8 h-8 text-blue-500" />,
      color: "bg-blue-50 dark:bg-blue-900/50",
    },
    {
      title: "Generate Notes",
      description: "Instantly create detailed study notes on any topic and level.",
      href: "/home/note-generator",
      icon: <BrainCircuit className="w-8 h-8 text-green-500" />,
      color: "bg-green-50 dark:bg-green-900/50",
    },
    {
      title: "Practice Past Questions",
      description: "Test your knowledge and get an AI-powered revision plan.",
      href: "/home/past-questions",
      icon: <FileQuestion className="w-8 h-8 text-yellow-500" />,
      color: "bg-yellow-50 dark:bg-yellow-900/50",
    },
];


export default function DashboardPage() {
  return (
    <div className="space-y-12">
        <div className="text-center space-y-4 pt-10">
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

      <div className="space-y-6">
        <h2 className="text-2xl font-headline font-bold">Get Started</h2>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(feature => (
              <HomeFeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                href={feature.href}
                icon={feature.icon}
                color={feature.color}
              />
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeFeatureCard({ title, description, href, icon, color }: { title: string, description: string, href: string, icon: React.ReactNode, color: string }) {
  return (
    <Link href={href} className={cn("block rounded-2xl p-6 flex flex-col group transition-transform hover:scale-[1.02]", color)}>
        <div className="w-12 h-12 rounded-lg bg-card flex items-center justify-center mb-4">
            {icon}
        </div>
        <h3 className="font-headline text-xl font-bold text-foreground">{title}</h3>
        <p className="text-muted-foreground mt-1 mb-4 flex-grow">{description}</p>
        <div className="flex items-center text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform">
            Start Now <ArrowRight className="ml-2 w-4 h-4" />
        </div>
    </Link>
  );
}
