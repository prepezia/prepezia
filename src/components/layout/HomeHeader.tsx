"use client";

import { UserNav } from "@/components/layout/UserNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function HomeHeader({ left }: { left?: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    return (
        <header className="flex items-center justify-between p-4">
            <div>{left}</div>
            {pathname === '/home' && (isMounted ? <UserNav /> : <Skeleton className="h-10 w-10 rounded-full" />)}
        </header>
    )
}
