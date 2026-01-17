import { Logo } from "@/components/icons/Logo";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/50 p-4">
        <div className="w-full max-w-md">
            <div className="flex justify-center mb-6">
                <Link href="/" className="flex items-center gap-2">
                    <Logo className="w-10 h-10 text-primary" />
                    <span className="font-headline text-2xl font-semibold text-primary">Learn with Temi</span>
                </Link>
            </div>
            {children}
        </div>
    </div>
  );
}
