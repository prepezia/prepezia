
"use client";

import LandingFooter from "@/components/layout/LandingFooter";
import LandingHeader from "@/components/layout/LandingHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { useDoc } from "@/firebase/firestore/use-doc";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function TermsOfUsePage() {
  const firestore = useFirestore();
  const termsRef = useMemo(() => firestore ? doc(firestore, 'legal_content', 'terms_of_use') : null, [firestore]);
  const { data: termsData, loading: termsLoading } = useDoc(termsRef);
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    if (termsData?.lastUpdated) {
      const date = new Date(termsData.lastUpdated.seconds * 1000);
      setLastUpdated(date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    } else if (!termsLoading) {
      setLastUpdated(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    }
  }, [termsData, termsLoading]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
        <div className="mb-8">
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 md:p-8">
              {termsLoading ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : termsData?.content ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="not-prose space-y-2 mb-8">
                      <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">Terms of Use for Learn with Temi</h1>
                      <p className="text-sm text-muted-foreground"><strong>Last Updated:</strong> {lastUpdated}</p>
                  </div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}>{termsData.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-center text-muted-foreground p-12">
                  The terms of use could not be loaded at this time.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
