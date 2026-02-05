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
  useSidebar,
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
  MessageSquareWarning,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/Logo';

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings', label: 'App Settings', icon: Settings },
  { href: '/admin/content', label: 'Legal Content', icon: FileText },
  { href: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareWarning },
  { href: '/admin/past-questions', label: 'Past Questions', icon: FileQuestion },
  { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/admin/opportunities', label: 'Opportunities', icon: GraduationCap },
];

function AdminSidebar() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  return (
    <Sidebar
      side="left"
      collapsible={isMobile ? 'offcanvas' : 'icon'}
    >
      <SidebarHeader className="p-4">
        <Link href="/admin" className="flex items-center gap-2">
          <Logo className="w-7 h-7 text-primary" />
          <span className="font-headline text-lg font-semibold text-foreground group-data-[collapsible=icon]:hidden">
            Temi Admin
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
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
            <SidebarMenuButton tooltip={{ children: 'Back to App' }} asChild>
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
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/60 md:px-6">
      <div className={`flex items-center gap-3`}>
        <SidebarTrigger className="md:hidden" />
         <Button onClick={toggleSidebar} variant="ghost" size="icon" className="hidden md:flex">
            <PanelLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Admin Panel</h1>
      </div>
    </header>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
