"use client";

import { UserNav } from "@/components/layout/UserNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import { CampusBadge } from "./CampusBadge";

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
                    <CampusBadge />
                </Suspense>
            </div>
            <div className="flex items-center gap-2">
                {right}
                {pathname === '/home' && (isMounted ? <UserNav /> : <Skeleton className="h-10 w-10 rounded-full" />)}
            </div>
        </header>
    )
}
