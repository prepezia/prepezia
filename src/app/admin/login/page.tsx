"use client"

import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { Logo } from "@/components/icons/Logo"
import Link from "next/link"
import { ConfirmationResult, signInWithEmailAndPassword, User } from "firebase/auth"
import { sendPhoneOtp } from "@/lib/auth-utils"

const credentialsSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, "Password is required."),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits."),
});

const ADMIN_EMAIL = 'nextinnovationafrica@gmail.com';

export default function AdminLoginPage() {
  const router = useRouter()
  const auth = useAuth()
  const { toast } = useToast()
  
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [userCache, setUserCache] = useState<User | null>(null);

  const credentialsForm = useForm<z.infer<typeof credentialsSchema>>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleCredentialSubmit = async (values: z.infer<typeof credentialsSchema>) => {
    if (!auth) return;
    setIsLoading(true);

    try {
      // Step 1: Authenticate with email and password
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Step 2: Check if the user is the designated admin
      if (user.email !== ADMIN_EMAIL) {
        await auth.signOut();
        throw new Error("Access Denied. This account does not have admin privileges.");
      }

      // Step 3: Check if the admin has a verified phone number
      if (!user.phoneNumber) {
        await auth.signOut();
        throw new Error("Admin account is not configured for OTP. Please contact support.");
      }

      // Step 4: Send OTP to the admin's phone number
      const otpConfirmation = await sendPhoneOtp(auth, user.phoneNumber);
      
      setUserCache(user); // Cache user object for the next step
      setConfirmationResult(otpConfirmation);
      setStep("otp");
      toast({
          title: "OTP Sent",
          description: `A verification code has been sent to the registered phone number.`,
      });

    } catch (error: any) {
        toast({ variant: "destructive", title: "Login Failed", description: error.message });
    } finally {
        setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (values: z.infer<typeof otpSchema>) => {
    if (!confirmationResult || !userCache) {
        toast({ variant: "destructive", title: "Verification session expired." });
        return;
    }
    setIsLoading(true);
    try {
        // Confirm the OTP. This re-authenticates and completes the sign-in.
        await confirmationResult.confirm(values.otp);
        
        // The user is now fully authenticated.
        router.push("/admin");

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Verification Failed",
            description: "The code you entered is invalid. Please try again.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/50 p-4">
      <div id="recaptcha-container" />
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-10 w-10 text-primary" />
            <span className="font-headline text-2xl font-semibold text-primary">
              Learn with Temi
            </span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">
              Admin Panel Login
            </CardTitle>
            <CardDescription>
                {step === 'credentials' 
                    ? "Enter your admin credentials." 
                    : `Enter the code sent to the registered phone number for ${userCache?.email}.`
                }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'credentials' ? (
                <Form {...credentialsForm}>
                    <form onSubmit={credentialsForm.handleSubmit(handleCredentialSubmit)} className="space-y-6">
                        <FormField control={credentialsForm.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="admin@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={credentialsForm.control} name="password" render={({ field }) => (
                           <FormItem><FormLabel>Password</FormLabel>
                                <div className="relative">
                                    <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} /></FormControl>
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <FormMessage />
                           </FormItem>
                        )}/>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>
                    </form>
                </Form>
            ) : (
                 <Form {...otpForm}>
                    <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-6">
                         <FormField control={otpForm.control} name="otp" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Verification Code</FormLabel>
                                <FormControl><Input placeholder="Enter 6-digit code" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} inputMode="numeric" autoComplete="one-time-code"/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <div className="flex flex-col gap-2">
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verify & Login
                            </Button>
                            <Button type="button" variant="link" onClick={() => { setStep('credentials'); setUserCache(null); }} disabled={isLoading}>Use different credentials</Button>
                        </div>
                    </form>
                </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
