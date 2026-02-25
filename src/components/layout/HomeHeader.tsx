
"use client";

import { UserNav } from "@/components/layout/UserNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import { useCampus } from "@/hooks/use-campus";
import { Badge } from "@/components/ui/badge";
import { School } from "lucide-react";

function CampusEditionBadge() {
  const { campus } = useCampus();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!campus || !isMounted) return null;

  return (
    <Badge variant="outline" className="flex items-center gap-1.5 border-primary/30 text-primary bg-primary/5 py-1 px-3">
        <School className="h-3.5 w-3.5" />
        <span className="font-bold text-[14px] sm:text-[18px] uppercase tracking-wider">{campus.shortName} Edition</span>
    </Badge>
  );
}

export function HomeHeader({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    return (
        <header className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
                {left}
                <Suspense fallback={null}>
                    <CampusEditionBadge />
                </Suspense>
            </div>
            <div className="flex items-center gap-2">
                {right}
                {pathname === '/home' && (isMounted ? <UserNav /> : <Skeleton className="h-10 w-10 rounded-full" />)}
            </div>
        </header>
    )
}
