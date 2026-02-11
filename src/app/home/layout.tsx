
'use client';

import { FooterMenu } from "@/components/layout/FooterMenu";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Loader2 } from "lucide-react";

function OnboardingGuard({ children }: { children: React.ReactNode }) {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const pathname = usePathname();

    const userDocRef = useMemo(() => {
        if (user && firestore) {
            return doc(firestore, 'users', user.uid);
        }
        return null;
    }, [user, firestore]);
    
    const { data: firestoreUser, loading: profileLoading } = useDoc(userDocRef);
    
    useEffect(() => {
        // Don't run check if we are still loading user data, or if user is not logged in.
        if (userLoading || profileLoading || !user) {
            return;
        }

        // Don't run check on the welcome page itself to avoid a redirect loop.
        if (pathname === '/home/welcome') {
            return;
        }

        // Don't run for admins
        if (firestoreUser?.isAdmin) {
            return;
        }
        
        // If user profile is loaded and they haven't set their educational level, redirect.
        if (firestoreUser && !firestoreUser.educationalLevel) {
            router.replace('/home/welcome');
        }

    }, [user, userLoading, firestoreUser, profileLoading, pathname, router]);

    const isLoading = userLoading || profileLoading;

    // While checking, show a loading screen.
    if (isLoading && pathname !== '/home/welcome') {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    // If the check is complete (and they don't need redirecting), or they are on the welcome page, show the content.
    return <>{children}</>;
}


export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-card text-foreground">
        <div className="flex-1 flex flex-col">
            <main className="flex-1 pb-24 flex flex-col">
                <OnboardingGuard>
                    {children}
                </OnboardingGuard>
            </main>
            <FooterMenu />
        </div>
    </div>
  );
}
