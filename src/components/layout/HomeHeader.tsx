"use client";

import { UserNav } from "@/components/layout/UserNav";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";

export function HomeHeader() {
    return (
        <header className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden">
                    <Menu />
                </SidebarTrigger>
                <p className="font-semibold text-lg">Welcome back, Username!</p>
            </div>
            <UserNav />
        </header>
    )
}
