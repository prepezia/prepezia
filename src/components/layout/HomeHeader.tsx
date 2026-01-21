"use client";

import { UserNav } from "@/components/layout/UserNav";

export function HomeHeader() {
    return (
        <header className="flex items-center justify-end p-4">
            <UserNav />
        </header>
    )
}
