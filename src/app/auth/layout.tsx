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
                    <Logo className="h-12 w-36" />
                </Link>
            </div>
            {children}
        </div>
    </div>
  );
}
