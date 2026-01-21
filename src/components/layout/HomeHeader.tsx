"use client";

import { UserNav } from "@/components/layout/UserNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

export function HomeHeader() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    return (
        <header className="flex items-center justify-end p-4">
            {isMounted ? <UserNav /> : <Skeleton className="h-10 w-10" />}
        </header>
    )
}
