'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  MessageSquareQuote,
  FileQuestion,
  Briefcase,
  GraduationCap,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/Logo';
import { useRouter } from 'next/navigation';

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings', label: 'App Settings', icon: Settings },
  { href: '/admin/content', label: 'Legal Content', icon: FileText },
  { href: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  { href: '/admin/past-questions', label: 'Past Questions', icon: FileQuestion },
  { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/admin/opportunities', label: 'Opportunities', icon: GraduationCap },
];

function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/admin" className="flex items-center gap-2">
            <Logo className="w-7 h-7 text-primary" />
            <span className="font-headline text-lg font-semibold text-foreground group-data-[collapsible=icon]:hidden">
                Temi Admin
            </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                tooltip={{ children: item.label }}
                asChild
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip={{ children: "Back to App" }} asChild>
                     <Link href="/home">
                        <ArrowLeft />
                        <span>Back to App</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminHeader() {
    return (
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:hidden">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Admin Panel</h1>
        </header>
    )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
        <div className="bg-muted/40 min-h-screen">
            <AdminSidebar />
            <SidebarInset>
                <AdminHeader />
                <main className="flex-1 p-4 sm:p-6">{children}</main>
            </SidebarInset>
        </div>
    </SidebarProvider>
  );
}
