
"use client";

import { useState } from 'react';
import { User } from 'firebase/auth';
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
import { useAuth } from '@/firebase';

export default function SignupPage() {
  const auth = useAuth();
  const [step, setStep] = useState<'credentials' | 'phone'>('credentials');
  const [user, setUser] = useState<User | null>(null);

  const handleSignupSuccess = (newUser: User) => {
    setUser(newUser);
    setStep('phone');
  };

  const handleBackToCredentials = () => {
    // Optionally, you might want to delete the created user if they go back
    setStep('credentials');
    setUser(null);
  };

  return (
    <Card>
      {step === 'credentials' && (
        <>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
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
