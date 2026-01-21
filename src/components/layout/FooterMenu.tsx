"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, History, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/home/features', label: 'Features', icon: Sparkles },
  { href: '/home/past-questions', label: 'Activities', icon: History },
];

export function FooterMenu() {
  const pathname = usePathname();

  const handleAccountClick = () => {
    const trigger = document.getElementById('account-sheet-trigger');
    if (trigger) {
      trigger.click();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="flex justify-around items-center h-16">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/home/features' && pathname.startsWith('/home/')) && pathname !== '/home' && pathname !== '/home/past-questions';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center text-muted-foreground w-full h-full',
                isActive && 'text-primary'
              )}
            >
              <item.icon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleAccountClick}
          className="flex flex-col items-center justify-center text-muted-foreground w-full h-full"
        >
          <User className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Account</span>
        </button>
      </div>
    </div>
  );
}
