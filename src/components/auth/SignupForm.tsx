"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useState } from "react";
import { useAuth, useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendEmailVerification
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Progress } from "../ui/progress";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  keepMeSignedIn: z.boolean().default(true).optional(),
  terms: z.boolean().default(false).refine(val => val === true, {
    message: "You must accept the terms and conditions."
  }),
});

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.617,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);

export function SignupForm({ onSuccess }: { onSuccess: (user: User) => void }) {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      keepMeSignedIn: true,
      terms: false,
    },
  });

  const password = form.watch("password");

  const getStrengthProps = (password: string) => {
    let score = 0;
    if (!password) return { value: 0, text: '', className: '' };

    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const value = (score / 4) * 100;
    let text = 'Weak';
    let className = 'bg-red-500';

    if (score === 2) {
        text = 'Medium';
        className = 'bg-yellow-500';
    } else if (score === 3) {
        text = 'Good';
        className = 'bg-blue-500';
    } else if (score === 4) {
        text = 'Strong';
        className = 'bg-green-500';
    }
    
    return { value, text, className };
  };

  const strengthProps = getStrengthProps(password || "");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) return;
    setIsLoading(true);

    try {
        const persistence = values.keepMeSignedIn ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);

        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;
        const fullName = `${values.firstName} ${values.lastName}`.trim();
        
        await updateProfile(user, { displayName: fullName });

        const userRef = doc(firestore, "users", user.uid);
        await setDoc(userRef, {
            name: fullName,
            email: values.email,
            createdAt: serverTimestamp(),
            emailVerified: user.emailVerified,
        });
        
        try {
            await sendEmailVerification(user);
        } catch (verificationError: any) {
            console.error("Initial verification email failed:", verificationError);
        }

        onSuccess(user);

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: error.message,
        });
    } finally {
        setIsLoading(false);
    }
  }
  
  async function onGoogleSignIn() {
    if (!form.getValues("terms")) {
      form.trigger("terms");
      return;
    }

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

      onSuccess(user);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Google Sign-In Failed",
            description: error.message,
        });
    } finally {
        setIsGoogleLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Button variant="outline" className="w-full" type="button" onClick={onGoogleSignIn} disabled={isLoading || isGoogleLoading}>
          {isGoogleLoading ? <Loader2 className="mr-2 animate-spin"/> : <GoogleIcon className="mr-2" />}
          Continue with Google
        </Button>
        <div className="relative">
          <Separator />
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">OR</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <FormControl>
                    <Input type={showPassword ? "text" : "password"} placeholder="Enter a strong password" {...field} />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <FormMessage />
              {password && (
                <div className="space-y-2 pt-1">
                    <Progress value={strengthProps.value} className="h-1.5" indicatorClassName={strengthProps.className} />
                    <p className="text-xs text-muted-foreground">{strengthProps.text}</p>
                </div>
              )}
            </FormItem>
          )}
        />
        
        <FormField
            control={form.control}
            name="keepMeSignedIn"
            render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                />
                </FormControl>
                <div className="space-y-1 leading-none">
                <FormLabel>Keep me signed in</FormLabel>
                </div>
            </FormItem>
            )}
        />

        <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                />
                </FormControl>
                <div className="space-y-1 leading-none">
                <FormLabel>
                    I agree to the 
                    <Button variant="link" asChild className="p-0 h-auto ml-1"><Link href="/terms" target="_blank">Terms of Use</Link></Button> & 
                    <Button variant="link" asChild className="p-0 h-auto ml-1"><Link href="/privacy" target="_blank">Privacy Policy</Link></Button>
                </FormLabel>
                <FormMessage />
                </div>
            </FormItem>
            )}
        />

        <Button type="submit" className="w-full font-bold" disabled={isLoading || isGoogleLoading}>
          {isLoading && <Loader2 className="mr-2 animate-spin"/>}
          Create Account & Continue
        </Button>
      </form>
    </Form>
  );
}
