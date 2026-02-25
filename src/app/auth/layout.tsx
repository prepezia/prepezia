"use client";

import { Logo } from "@/components/icons/Logo";
import Link from "next/link";
import { CampusBadge } from "@/components/layout/CampusBadge";
import { Suspense } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/50 p-4">
        <div className="w-full max-w-md">
            <div className="flex items-center justify-center gap-3 mb-6">
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <Logo className="h-12 w-36" />
                </Link>
                <Suspense fallback={null}>
                    <CampusBadge />
                </Suspense>
            </div>
            {children}
        </div>
    </div>
  );
}
