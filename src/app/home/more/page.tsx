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

        <div className="grid grid-cols-2 gap-4 md:block md:space-y-8">
            <Card className="p-4 md:p-12 bg-secondary rounded-2xl border-2 border-dashed h-full">
                 <div className="grid md:grid-cols-2 gap-4 md:gap-8 items-center text-center md:text-left">
                    <div className="relative h-[75px] w-[75px] md:h-48 md:w-48 md:order-2 md:ml-auto mx-auto md:mx-0">
                       <Image
                            src="https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fcareer-path_12343398.png?alt=media&token=3d6bcbf8-ed24-40df-be03-0cec15031963"
                            alt="Career Path Icon"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <div className="md:order-1">
                        <h3 className="text-base md:text-2xl font-headline font-bold text-foreground">Unlock Your Career Potential</h3>
                        <p className="mt-2 text-xs md:text-base text-muted-foreground">
                            Get personalized CV feedback, find relevant jobs, and take industry-focused AI aptitude tests.
                        </p>
                        <Button asChild size="sm" className="mt-4 md:mt-8 font-bold md:h-11 md:px-8">
                            <Link href="/home/career?start=form">
                                Career Hub <ArrowRight className="hidden md:block ml-2 w-5 h-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="p-4 md:p-12 bg-blue-50 dark:bg-blue-900/50 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 h-full">
                 <div className="grid md:grid-cols-2 gap-4 md:gap-8 items-center text-center md:text-left">
                    <div className="relative h-[75px] w-[75px] md:h-48 md:w-48 md:order-2 md:ml-auto mx-auto md:mx-0">
                       <Image
                            src="https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fadmissions.png?alt=media&token=ee0a0794-32d2-4915-832a-da35ad25375a"
                            alt="Admissions Hub Icon"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <div className="md:order-1">
                        <h3 className="text-base md:text-2xl font-headline font-bold text-foreground">Admissions & Scholarships Hub</h3>
                        <p className="mt-2 text-xs md:text-base text-muted-foreground">
                            Find and apply for universities and scholarships that match your profile and ambitions.
                        </p>
                        <Button asChild size="sm" className="mt-4 md:mt-8 font-bold md:h-11 md:px-8">
                            <Link href="/home/admissions">
                                Admissions Hub <ArrowRight className="hidden md:block ml-2 w-5 h-5" />
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
