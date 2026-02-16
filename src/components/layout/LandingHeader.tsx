import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '../icons/Logo';

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <span className="font-headline text-xl font-semibold text-primary">Prepezia</span>
        </Link>
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
