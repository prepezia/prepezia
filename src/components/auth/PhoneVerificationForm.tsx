
"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  User,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { countryCodes, Country } from "@/lib/country-codes";

const phoneSchema = z.object({
  countryCode: z.string().min(1, "Country code is required."),
  phone: z.string().min(5, "Phone number is required."),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits."),
});

export function PhoneVerificationForm({ user, onBack }: { user: User, onBack: () => void }) {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

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

      const localPhoneNumber = values.phone.startsWith('0') ? values.phone.substring(1) : values.phone;
      const phoneNumber = `${country.dial_code}${localPhoneNumber}`;
      setFullPhoneNumber(phoneNumber);
      
      // Clear previous verifier instance
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }

      const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
      recaptchaVerifierRef.current = appVerifier;
      
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      
      setVerificationId(confirmationResult.verificationId);
      setStep("otp");
      setResendCooldown(30);
      toast({
        title: "OTP Sent",
        description: `A verification code has been sent to ${phoneNumber}.`,
      });
    } catch (error: any) {
      console.error("OTP Send Error:", error);
      let errorMessage = "Failed to send OTP. Please try again. Ensure your phone number is correct and the reCAPTCHA can load.";
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = "Invalid phone number format. Please check the number and try again.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please try again later.";
      }
      toast({
        variant: "destructive",
        title: "OTP Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  async function onVerifyOtp(values: z.infer<typeof otpSchema>) {
    if (!verificationId) {
        toast({ variant: "destructive", title: "Verification session expired", description: "Please request a new code." });
        return;
    }
    setIsLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, values.otp);
      await linkWithCredential(user, credential);
      
      if (firestore) {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, { phoneNumber: fullPhoneNumber });
      }

      toast({ title: "Success!", description: "Your phone number is verified." });
      router.push("/home");

    } catch (error: any) {
       let errorMessage = "Failed to verify OTP. Please try again.";
        if (error.code === 'auth/invalid-verification-code') {
            errorMessage = "Invalid verification code.";
        } else if (error.code === 'auth/code-expired') {
            errorMessage = "Verification code has expired. Please request a new one.";
        } else if (error.code === 'auth/credential-already-in-use') {
            errorMessage = "This phone number is already in use by another account.";
        }
        toast({
            variant: "destructive",
            title: "Verification Failed",
            description: errorMessage,
        });
    } finally {
      setIsLoading(false);
    }
  }

  if (step === "otp") {
    return (
      <Form {...otpForm}>
        <div id="recaptcha-container"></div>
        <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-6">
          <FormField
            control={otpForm.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification Code</FormLabel>
                <FormControl>
                  <Input placeholder="123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 animate-spin" />}
              Verify & Finish
            </Button>
            <div className="mt-2 text-center">
                <p className="text-sm text-muted-foreground">
                    Didn't receive the code?{" "}
                    <button
                        type="button"
                        onClick={() => phoneForm.handleSubmit(handleSendOtp)()}
                        disabled={resendCooldown > 0 || isLoading}
                        className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Resend {resendCooldown > 0 && `(${resendCooldown}s)`}
                    </button>
                </p>
            </div>
            <Button type="button" variant="link" onClick={() => setStep('phone')}>
                Change phone number
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  return (
    <Form {...phoneForm}>
      <div id="recaptcha-container"></div>
      <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-6">
        <div className="flex gap-2">
          <FormField
            control={phoneForm.control}
            name="countryCode"
            render={({ field }) => (
              <FormItem className="w-1/3">
                <FormLabel>Code</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Code" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[20rem]">
                    {countryCodes.map((country: Country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.code} ({country.dial_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={phoneForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 244123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 animate-spin" />}
                Send Verification Code
            </Button>
            <Button type="button" variant="outline" onClick={onBack}>
                Back
            </Button>
        </div>
      </form>
    </Form>
  );
}
