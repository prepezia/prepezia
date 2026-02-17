'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Menu,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/Logo';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/firebase';

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

  return (
    <>
        <div className="flex h-16 items-center border-b px-4 shrink-0 justify-center">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
                <Logo className="h-9 w-28" />
            </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
            <nav className="grid items-start p-4 text-sm font-medium">
                {menuItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    pathname === item.href && 'bg-secondary text-primary'
                    )}
                >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                </Link>
                ))}
            </nav>
        </div>
        <div className="mt-auto p-4 border-t">
            <Link
                href="/home"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to App
            </Link>
        </div>
    </>
  );
}

function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';
    
    if (isLoginPage) {
      return null;
    }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      <h1 className="text-lg font-semibold flex-1">Admin Panel</h1>
    </header>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const isMobile = useIsMobile();
    const { user, loading, isAdmin } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';


    React.useEffect(() => {
        if (loading || isLoginPage) return;

        if (!user) {
            router.replace('/admin/login');
        } else if (!isAdmin) {
            router.replace('/home');
        }
    }, [user, loading, isAdmin, router, isLoginPage]);
    
    // This is the primary loading state. It handles waiting for `useUser` to resolve.
    if (loading && !isLoginPage) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // If on the login page, just render children without the layout shell.
    if (isLoginPage) {
        return <>{children}</>;
    }
    
    // After loading, if the user is still not an admin, they should not see the admin content.
    // The useEffect will have already initiated a redirect, so we can show a loader
    // to prevent a flash of content they shouldn't see.
    if (!isAdmin) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      );
    }


  return (
    <div className="flex h-screen bg-background text-foreground">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-72 border-r bg-card h-full">
            <AdminSidebar />
        </aside>

        {/* Mobile Sidebar */}
        {isMobile && (
             <div 
                className={cn(
                    "fixed inset-0 bg-black/60 z-40 transition-opacity md:hidden", 
                    isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )} 
                onClick={() => setIsSidebarOpen(false)}
            >
              <div 
                className={cn(
                    "fixed inset-y-0 left-0 h-full w-full max-w-sm flex-col bg-card z-50 flex transition-transform transform", 
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )} 
                onClick={(e) => e.stopPropagation()}
              >
                  <AdminSidebar />
              </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
            <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
                {children}
            </main>
        </div>
    </div>
  );
}
