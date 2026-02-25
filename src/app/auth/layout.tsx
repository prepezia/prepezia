
"use client";

import { Logo } from "@/components/icons/Logo";
import Link from "next/link";
import { useCampus } from "@/hooks/use-campus";
import { Badge } from "@/components/ui/badge";
import { School } from "lucide-react";
import { useState, useEffect, Suspense } from "react";

function CampusEditionBadge() {
  const { campus } = useCampus();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!campus || !isMounted) return null;

  return (
    <Badge variant="outline" className="flex items-center gap-1.5 border-primary/30 text-primary bg-primary/5 py-1 px-3 shrink-0">
        <School className="h-3.5 w-3.5" />
        <span className="font-bold text-[14px] sm:text-[18px] uppercase tracking-wider">{campus.shortName} Edition</span>
    </Badge>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/50 p-4">
        <div className="w-full max-w-md">
            <div className="flex items-center justify-center gap-3 mb-6">
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <Logo className="h-12 w-36" />
                </Link>
                <Suspense fallback={null}>
                    <CampusEditionBadge />
                </Suspense>
            </div>
            {children}
        </div>
    </div>
  );
}
