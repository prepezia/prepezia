
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
import { Loader2 } from "lucide-react"
import { Logo } from "@/components/icons/Logo"
import Link from "next/link"
import { ConfirmationResult } from "firebase/auth"
import { sendPhoneOtp } from "@/lib/auth-utils"
import { countryCodes, Country } from "@/lib/country-codes"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";

const phoneSchema = z.object({
    countryCode: z.string().min(1, "Country code is required."),
    phone: z.string().min(5, "Phone number is required."),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits."),
});

const ADMIN_EMAIL = 'nextinnovationafrica@gmail.com';

export default function AdminLoginPage() {
  const router = useRouter()
  const auth = useAuth()
  const { toast } = useToast()
  
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  
  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { countryCode: "GH", phone: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const handleSendOtp = async (values: z.infer<typeof phoneSchema>) => {
    if (!auth) return;
    setIsLoading(true);

    try {
        const country = countryCodes.find(c => c.code === values.countryCode);
        if (!country) throw new Error("Invalid country selected.");
        
        const cleanedPhone = values.phone.replace(/\D/g, '');
        const localPhoneNumber = cleanedPhone.replace(/^0+/, '');
        const phoneNumber = `${country.dial_code}${localPhoneNumber}`;
        setFullPhoneNumber(phoneNumber);
        
        const result = await sendPhoneOtp(auth, phoneNumber);
        
        setConfirmationResult(result);
        setStep("otp");
        toast({
            title: "Code Sent",
            description: `A 6-digit verification code has been sent to ${phoneNumber}.`,
        });

    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to Send Code", description: error.message });
    } finally {
        setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (values: z.infer<typeof otpSchema>) => {
    if (!confirmationResult) {
        toast({ variant: "destructive", title: "Verification session expired." });
        return;
    }
    setIsLoading(true);
    try {
        const result = await confirmationResult.confirm(values.otp);
        const user = result.user;

        if (user.email === ADMIN_EMAIL) {
            router.push("/admin");
        } else {
            await auth?.signOut();
            toast({
                variant: "destructive",
                title: "Access Denied",
                description: "This phone number is not associated with an admin account.",
            });
            setStep("phone");
        }
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
                {step === 'phone' 
                    ? "Enter the phone number associated with your admin account." 
                    : `Enter the code sent to ${fullPhoneNumber}.`
                }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'phone' ? (
                <Form {...phoneForm}>
                    <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-6">
                        <div className="flex gap-2">
                            <FormField control={phoneForm.control} name="countryCode" render={({ field }) => (
                                <FormItem className="w-1/3"><FormLabel>Country</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger></FormControl>
                                    <SelectContent className="max-h-[20rem]">{countryCodes.map((c: Country) => (<SelectItem key={c.code} value={c.code}>{c.code} ({c.dial_code})</SelectItem>))}</SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={phoneForm.control} name="phone" render={({ field }) => (
                                <FormItem className="flex-1"><FormLabel>Phone Number</FormLabel>
                                <FormControl><Input placeholder="e.g., 244123456" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))} disabled={isLoading} inputMode="tel"/></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Verification Code
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
                            <Button type="button" variant="link" onClick={() => setStep('phone')} disabled={isLoading}>Change phone number</Button>
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
