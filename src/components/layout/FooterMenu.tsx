"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, WandSparkles, History, User, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/home/study', label: 'Study', icon: WandSparkles },
  { href: '/home/more', label: 'More', icon: LayoutGrid },
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
    <div className="fixed bottom-0 left-0 right-0 z-50 md:bottom-4">
      <div className="flex justify-around items-center h-16 bg-card border-t border-border md:max-w-md md:mx-auto md:rounded-full md:border md:shadow-lg">
        {menuItems.map((item) => {
          let isActive;
          if (item.label === 'Study') {
            // Study is active for study, study-spaces, and note-generator pages
            isActive = ['/home/study', '/home/study-spaces', '/home/note-generator'].includes(pathname);
          } else if (item.label === 'More') {
            // More is active for more, career, and admissions pages
            isActive = ['/home/more', '/home/career', '/home/admissions'].some(p => pathname.startsWith(p));
          }
          else {
            // Other items are active only on their exact path
            isActive = pathname === item.href;
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center text-muted-foreground w-full h-full md:w-auto md:px-6',
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
          className="flex flex-col items-center justify-center text-muted-foreground w-full h-full md:w-auto md:px-6"
        >
          <User className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Account</span>
        </button>
      </div>
    </div>
  );
}
