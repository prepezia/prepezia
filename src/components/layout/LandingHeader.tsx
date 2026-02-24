
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '../icons/Logo';
import { useCampus } from '@/hooks/use-campus';
import { Badge } from '@/components/ui/badge';
import { School } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function LandingHeader() {
  const { campus } = useCampus();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Logo className="h-9 w-28" />
          </Link>
          {campus && isMounted && (
            <Badge variant="outline" className="flex items-center gap-1.5 border-primary/30 text-primary bg-primary/5 py-1 px-3 shrink-0">
              <School className="h-3.5 w-3.5" />
              <span className="font-bold text-[12px] sm:text-[15px] uppercase tracking-wider">{campus.shortName} Edition</span>
            </Badge>
          )}
        </div>
        
        <nav className="hidden md:flex gap-6 items-center text-sm font-medium">
          <Link href="/#features" className="text-muted-foreground hover:text-foreground">Features</Link>
          <Link href="/auth/login" className="text-muted-foreground hover:text-foreground">Login</Link>
          <Button asChild>
            <Link href="/auth/signup">Launch App</Link>
          </Button>
        </nav>
        <div className="md:hidden">
            <Button asChild>
                <Link href="/auth/signup">Launch App</Link>
            </Button>
        </div>
      </div>
    </header>
  );
}
