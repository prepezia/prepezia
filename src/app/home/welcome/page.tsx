
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, GraduationCap } from 'lucide-react';
import { educationalLevels } from '@/lib/education-levels';
import { Logo } from '@/components/icons/Logo';

export default function WelcomePage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [level, setLevel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!level) {
      toast({
        variant: 'destructive',
        title: 'Please select a level',
        description: 'Tell us your educational level to continue.',
      });
      return;
    }
    if (!user || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'Could not find user information. Please try again.',
        });
        return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, { educationalLevel: level });
      toast({
        title: 'Profile Updated!',
        description: 'Your experience is now personalized.',
      });
      router.push('/home');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not save your educational level.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
      router.push('/home');
  }

  if (userLoading) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
             <Logo className="h-12 w-12" />
        </div>
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto mb-4">
                <GraduationCap className="w-8 h-8" />
            </div>
            <CardTitle className="font-headline text-2xl">One Last Step!</CardTitle>
            <CardDescription>
              Help us personalize your experience by telling us your current educational level. You can change this later in your account settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select onValueChange={setLevel} value={level}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select your level..." />
              </SelectTrigger>
              <SelectContent>
                {educationalLevels.map((levelName) => (
                  <SelectItem key={levelName} value={levelName}>
                    {levelName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button className="w-full" onClick={handleContinue} disabled={isSubmitting || !level}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
            <Button variant="link" onClick={handleSkip} className="w-full">
              Skip for now
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
