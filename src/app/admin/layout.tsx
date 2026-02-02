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
import { Skeleton } from '@/components/ui/skeleton';

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

  return (
    <Sidebar variant="floating" collapsible="icon">
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
        <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4 md:hidden">
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
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="bg-muted/40">
        {/* Static skeleton for server render and initial client render */}
        <div className="hidden md:block fixed top-0 left-0 h-full p-2" style={{ width: 'calc(var(--sidebar-width-icon) + 2rem)' }}>
          <div className="flex flex-col h-full bg-card rounded-lg shadow p-2 gap-4">
              <div className="p-2"><Skeleton className="h-7 w-7" /></div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
              <div className="mt-auto flex flex-col gap-2">
                <Skeleton className="h-8 w-8" />
              </div>
          </div>
        </div>
        <div className="h-screen flex flex-col overflow-hidden md:pl-[calc(var(--sidebar-width-icon)_+2rem)]">
          <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4 md:hidden">
            <Skeleton className="h-7 w-7" />
            <Skeleton className="h-5 w-24" />
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
        <div className="bg-muted/40 min-h-screen">
            <AdminSidebar />
            <div className="flex h-screen flex-col overflow-hidden md:pl-[calc(var(--sidebar-width-icon)_+2rem)] peer-data-[state=expanded]:md:pl-[calc(var(--sidebar-width)+1rem)] transition-all duration-300 ease-in-out">
                <AdminHeader />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
            </div>
        </div>
    </SidebarProvider>
  );
}
