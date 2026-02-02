
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
      <SidebarContent className="px-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                tooltip={{ children: item.label }}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="w-5 h-5" />
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
                <ArrowLeft className="w-5 h-5" />
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
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4 md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-lg font-semibold">Admin Panel</h1>
      </div>
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
      <div className="min-h-screen bg-background">
        <div className="hidden md:block fixed top-0 left-0 h-full p-2" style={{ width: 'calc(var(--sidebar-width-icon) + 1rem)' }}>
          <div className="flex flex-col h-full bg-card rounded-lg shadow p-2 gap-4">
            <div className="p-2"><Skeleton className="h-7 w-7 rounded-full" /></div>
            <div className="flex flex-col gap-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-10 rounded-lg" />
              ))}
            </div>
            <div className="mt-auto">
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="md:ml-[calc(var(--sidebar-width-icon)_+1rem)]">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-card px-4">
            <Skeleton className="h-8 w-8 rounded-lg md:hidden" />
            <Skeleton className="h-6 w-32" />
          </header>
          <main className="p-4 md:p-6">
            <div className="max-w-full mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className="transition-all duration-300 ease-in-out peer-data-[state=collapsed]:md:ml-[calc(var(--sidebar-width-icon)_+1rem)] peer-data-[state=expanded]:md:ml-[calc(var(--sidebar-width)_+1rem)]">
          <AdminHeader />
          <main className="p-4 sm:p-6 md:p-8">
            <div className="max-w-full mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
