
'use client';

import { FooterMenu } from "@/components/layout/FooterMenu";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from 'firebase/firestore';
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, GraduationCap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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

  if (!isVisible) {
    return null;
  }
  
  return (
    <div className="container mx-auto px-4 pt-4 sm:px-6 lg:px-8">
        <Alert className="bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
                <GraduationCap className="h-6 w-6 text-primary mt-1" />
                <div className="flex-1 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <div>
                        <AlertTitle className="font-bold">Unlock Personalized Content</AlertTitle>
                        <AlertDescription>
                            Set your educational level for relevant past questions and tailored AI notes.
                        </AlertDescription>
                    </div>
                    <div className="flex gap-2 mt-3 sm:mt-0 sm:ml-4 shrink-0">
                        <Button size="sm" onClick={handleOpenSettings} className="w-full sm:w-auto">Update Profile</Button>
                        <Button size="icon" variant="ghost" onClick={handleDismiss} className="h-9 w-9 hover:bg-primary/10">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </Alert>
    </div>
  );
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
