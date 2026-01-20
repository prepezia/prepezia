"use client";

import { UserNav } from "@/components/layout/UserNav";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";

export function HomeHeader() {
    return (
        <header className="flex items-center justify-between p-4">
            <UserNav />
            <SidebarTrigger className="md:hidden">
                <Menu />
            </SidebarTrigger>
        </header>
    )
}