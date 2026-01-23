"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { HomeHeader } from "@/components/layout/HomeHeader";

export default function MorePage() {
  return (
    <>
      <HomeHeader />
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-bold">More Tools</h1>
          <p className="text-muted-foreground">
            Explore more tools to help you on your journey.
          </p>
        </div>

        <div className="space-y-8">
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

            <Card className="p-8 md:p-12 bg-blue-50 dark:bg-blue-900/50 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 max-w-4xl mx-auto">
                 <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="relative h-32 w-32 md:h-48 md:w-48">
                       <Image
                            src="https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fgraduation-cap_11933580.png?alt=media&token=e937d9d9-2c7c-40b5-9005-728b7468160e"
                            alt="Admissions Hub Icon"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <div>
                        <h3 className="text-2xl font-headline font-bold text-foreground">Admissions & Scholarships Hub</h3>
                        <p className="mt-4 text-muted-foreground">
                            Find and apply for universities and scholarships that match your profile and ambitions.
                        </p>
                        <Button asChild size="lg" className="mt-8 font-bold">
                            <Link href="/home/admissions">
                                Go to Admissions Hub <ArrowRight className="ml-2 w-5 h-5" />
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
