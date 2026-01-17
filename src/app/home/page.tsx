import AdBanner from "@/components/ads/AdBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, BrainCircuit, FileQuestion } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Welcome back!</h1>
        <p className="text-muted-foreground">What would you like to do today?</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="Create a Study Space"
          description="Combine your notes, documents, and videos into one place and start a conversation with your AI tutor."
          href="/home/study-spaces"
          icon={<BookOpen className="w-8 h-8 text-primary" />}
        />
        <FeatureCard
          title="Generate Notes"
          description="Instantly create detailed study notes on any topic, at any academic level."
          href="/home/note-generator"
          icon={<BrainCircuit className="w-8 h-8 text-primary" />}
        />
        <FeatureCard
          title="Practice Past Questions"
          description="Test your knowledge with official past questions and get an AI-powered revision plan."
          href="/home/past-questions"
          icon={<FileQuestion className="w-8 h-8 text-primary" />}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-headline font-bold">Your Recent Activity</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">You don&apos;t have any recent activity. Start a new study session to see it here.</p>
          </CardContent>
        </Card>
      </div>

      <AdBanner />
    </div>
  );
}

function FeatureCard({ title, description, href, icon }: { title: string, description: string, href: string, icon: React.ReactNode }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        <div className="bg-primary/10 p-3 rounded-lg">{icon}</div>
        <div className="flex-1">
          <CardTitle className="font-headline text-xl">{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button asChild className="w-full">
          <Link href={href}>
            Start Now <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
