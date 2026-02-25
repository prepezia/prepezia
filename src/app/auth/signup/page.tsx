"use client";

import { useState } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from 'firebase/auth';
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignupSuccess = (newUser: User) => {
    setUser(newUser);
    setStep('phone');
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setUser(null);
  };

  const handleGoogleSignUp = async () => {
    if (!auth || !firestore) return;
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(firestore, "users", user.uid);
      await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          emailVerified: user.emailVerified,
          createdAt: serverTimestamp()
      }, { merge: true });

      handleSignupSuccess(user);
    } catch (error: any) {
      toast({
          variant: "destructive",
          title: "Google Sign-In Failed",
          description: error.message,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

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
          <CardContent className="space-y-4">
            <SignupForm onSuccess={handleSignupSuccess} />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
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
