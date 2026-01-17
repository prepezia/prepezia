import Link from 'next/link';
import { Logo } from '../icons/Logo';

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.11,7.38 3,4.79C2.63,5.42 2.42,6.16 2.42,6.94C2.42,8.43 3.17,9.75 4.33,10.5C3.62,10.48 2.96,10.28 2.38,10V10.03C2.38,12.11 3.86,13.85 5.82,14.24C5.46,14.34 5.08,14.39 4.69,14.39C4.42,14.39 4.15,14.36 3.89,14.31C4.43,16.03 6.02,17.25 7.89,17.29C6.43,18.45 4.58,19.13 2.56,19.13C2.22,19.13 1.88,19.11 1.54,19.07C3.44,20.29 5.7,21 8.12,21C16,21 20.33,14.46 20.33,8.79C20.33,8.6 20.33,8.42 20.32,8.23C21.16,7.63 21.88,6.87 22.46,6Z" />
  </svg>
);


export default function LandingFooter() {
  return (
    <footer className="bg-background border-t">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Logo className="w-8 h-8 text-primary" />
            <span className="font-headline text-xl font-semibold">Learn with Temi</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 md:gap-6 text-muted-foreground mb-4 md:mb-0">
            <Link href="/#features" className="hover:text-primary">Features</Link>
            <Link href="/terms" className="hover:text-primary">Terms of Use</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
            <Link href="/auth/login" className="hover:text-primary">Login</Link>
          </nav>
          <div className="flex gap-4">
            <a href="#" className="text-muted-foreground hover:text-primary">
              <TwitterIcon className="w-6 h-6" />
            </a>
          </div>
        </div>
        <div className="text-center text-muted-foreground text-sm mt-8 border-t pt-8">
          © {new Date().getFullYear()} Learn with Temi. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
