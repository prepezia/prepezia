
"use client";

import { Logo } from "@/components/icons/Logo";
import Link from "next/link";
import { useCampus } from "@/hooks/use-campus";
import { Badge } from "@/components/ui/badge";
import { School } from "lucide-react";
import { useState, useEffect } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { campus } = useCampus();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/50 p-4">
        <div className="w-full max-w-md">
            <div className="flex flex-col items-center mb-6">
                {campus && isMounted && (
                    <Badge variant="outline" className="mb-4 flex items-center gap-1.5 border-primary/30 text-primary bg-primary/5 py-1 px-3">
                        <School className="h-3.5 w-3.5" />
                        <span className="font-bold text-[12px] sm:text-[15px] uppercase tracking-wider">{campus.shortName} Edition</span>
                    </Badge>
                )}
                <Link href="/" className="flex items-center gap-2">
                    <Logo className="h-12 w-36" />
                </Link>
            </div>
            {children}
        </div>
    </div>
  );
}
