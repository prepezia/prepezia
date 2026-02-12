
'use client';

import { FooterMenu } from "@/components/layout/FooterMenu";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from 'firebase/firestore';
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, GraduationCap, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function OnboardingNotification() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  
  const userDocRef = useMemo(() => {
    if (user && firestore) {
      return doc(firestore, 'users', user.uid);
    }
    return null;
  }, [user, firestore]);
    
  const { data: firestoreUser, loading: profileLoading } = useDoc(userDocRef);

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (userLoading || profileLoading || !user) {
      return;
    }
    
    if (firestoreUser?.isAdmin) {
      return;
    }

    const dismissed = sessionStorage.getItem('onboardingNotificationDismissed');

    if (firestoreUser && !firestoreUser.educationalLevel && !dismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }

  }, [user, userLoading, firestoreUser, profileLoading]);

  const handleDismiss = () => {
    sessionStorage.setItem('onboardingNotificationDismissed', 'true');
    setIsVisible(false);
  }

  const handleOpenSettings = () => {
    const trigger = document.getElementById('account-sheet-trigger');
    if (trigger) {
      trigger.click();
    }
  }

  if (userLoading || profileLoading) {
      return null;
  }
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div className="bg-primary/10 border-b border-primary/20 text-foreground p-3 animate-in fade-in-50">
        <div className="container mx-auto flex items-center justify-center sm:justify-between gap-4">
            <p className="hidden sm:block text-sm text-center font-medium">
                <GraduationCap className="inline-block mr-2 h-4 w-4" />
                Please set your educational level to help us personalize your experience.
            </p>
            <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={handleOpenSettings}>Update Profile</Button>
                <Button size="icon" variant="ghost" onClick={handleDismiss} className="h-8 w-8 hover:bg-primary/20">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    </div>
  )
}

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useUser();
  
  return (
    <div className="flex min-h-screen bg-card text-foreground">
        <div className="flex-1 flex flex-col">
            <main className="flex-1 pb-24 flex flex-col">
                <OnboardingNotification />
                {loading ? (
                     <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : children}
            </main>
            <FooterMenu />
        </div>
    </div>
  );
}
