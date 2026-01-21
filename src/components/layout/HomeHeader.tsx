"use client";

import { UserNav } from "@/components/layout/UserNav";

export function HomeHeader() {
    return (
        <header className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
                <p className="font-semibold text-lg">Welcome back, Username!</p>
            </div>
            <UserNav />
        </header>
    )
}
