
"use client";

import { useState, useEffect } from 'react';
import { User, getRedirectResult } from 'firebase/auth';
import { SignupForm } from '@/components/auth/SignupForm';
import { PhoneVerificationForm } from '@/components/auth/PhoneVerificationForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [step, setStep] = useState<'credentials' | 'phone'>('credentials');
  const [user, setUser] = useState<User | null>(null);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      setIsProcessingRedirect(false);
      return;
    };

    const processRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          // User has successfully signed in with Google.
          const user = result.user;
          const userRef = doc(firestore, "users", user.uid);
          await setDoc(userRef, {
              name: user.displayName,
              email: user.email,
              emailVerified: user.emailVerified,
              createdAt: serverTimestamp()
          }, { merge: true });

          // Now move to the phone verification step
          handleSignupSuccess(user);
        }
      } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Google Sign-In Failed",
            description: error.message,
        });
      } finally {
        setIsProcessingRedirect(false);
      }
    };

    processRedirect();
  }, [auth, firestore, toast]);

  const handleSignupSuccess = (newUser: User) => {
    setUser(newUser);
    setStep('phone');
  };

  const handleBackToCredentials = () => {
    // Optionally, you might want to delete the created user if they go back
    setStep('credentials');
    setUser(null);
  };

  if (isProcessingRedirect) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Processing Sign-In...</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      {step === 'credentials' && (
        <>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Create your account</CardTitle>
            <CardDescription>
              Step 1/2: Start your smarter learning journey today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignupForm onSuccess={handleSignupSuccess} />
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?
              <Button asChild variant="link" className="px-1">
                <Link href="/auth/login">Login</Link>
              </Button>
            </p>
          </CardFooter>
        </>
      )}
      {step === 'phone' && user && (
        <>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Verify Your Phone</CardTitle>
            <CardDescription>
              Step 2/2: For security, please verify your phone number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PhoneVerificationForm user={user} onBack={handleBackToCredentials} />
          </CardContent>
        </>
      )}
    </Card>
  );
}
