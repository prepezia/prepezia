"use client";

import { UserNav } from "@/components/layout/UserNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

export function HomeHeader({ left }: { left?: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    return (
        <header className="flex items-center justify-between p-4">
            <div>{left}</div>
            {isMounted ? <UserNav /> : <Skeleton className="h-10 w-10 rounded-full" />}
        </header>
    )
}
