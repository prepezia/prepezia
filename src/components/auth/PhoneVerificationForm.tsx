
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
  PhoneAuthProvider,
  linkWithCredential,
  User,
  type ConfirmationResult
} from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { countryCodes, Country } from "@/lib/country-codes";
import { sendPhoneOtp } from "@/lib/auth-utils";

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
  
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
        delete window.recaptchaVerifier;
      }
    };
  }, []);

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
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Authentication service not available.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const country = countryCodes.find(c => c.code === values.countryCode);
      if (!country) throw new Error("Invalid country selected.");
      
      const cleanedPhone = values.phone.replace(/\D/g, '');
      const localPhoneNumber = cleanedPhone.replace(/^0+/, '');
      
      if (!localPhoneNumber) {
        throw new Error("Please enter a valid phone number.");
      }
      
      const phoneNumber = `${country.dial_code}${localPhoneNumber}`;
      setFullPhoneNumber(phoneNumber);
      
      const confirmationResult = await sendPhoneOtp(auth, phoneNumber);
      
      setVerificationId(confirmationResult.verificationId);
      setStep("otp");
      setResendCooldown(30);
      
      toast({
        title: "OTP Sent Successfully!",
        description: `A 6-digit verification code has been sent to ${phoneNumber}.`,
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Send OTP",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
      
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
        delete window.recaptchaVerifier;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    
    setIsResending(true);
    
    try {
      await phoneForm.handleSubmit(handleSendOtp)();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Resend Failed",
        description: error.message || "Failed to resend OTP. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  async function onVerifyOtp(values: z.infer<typeof otpSchema>) {
    if (!verificationId || !user) {
      toast({ 
        variant: "destructive", 
        title: "Verification session expired", 
        description: "Please request a new code." 
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const cleanOtp = values.otp.replace(/\D/g, '');
      
      const credential = PhoneAuthProvider.credential(verificationId, cleanOtp);
      await linkWithCredential(user, credential);
      
      if (firestore) {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, { 
          phoneNumber: fullPhoneNumber,
          phoneVerified: true,
          phoneVerifiedAt: serverTimestamp()
        });
      }

      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
        delete window.recaptchaVerifier;
      }
      
      toast({ 
        title: "Success!", 
        description: "Your phone number has been verified successfully." 
      });
      
      setTimeout(() => {
        router.push("/home");
      }, 1000);

    } catch (error: any) {
      let errorMessage = "Failed to verify OTP. Please try again.";
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = "Invalid verification code. Please check and try again.";
      } else if (error.code === 'auth/code-expired') {
        errorMessage = "Verification code has expired. Please request a new one.";
      } else if (error.code === 'auth/credential-already-in-use') {
        errorMessage = "This phone number is already in use by another account.";
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid verification. Please request a new code.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many verification attempts. Please try again later.";
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

  return (
    <>
      <div id="recaptcha-container" ref={recaptchaContainerRef} />
      
      {step === "otp" ? (
        <Form {...otpForm}>
          <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to {fullPhoneNumber}
              </p>
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter 6-digit code" 
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          field.onChange(value);
                        }}
                        maxLength={6}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading || isResending}
                    className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? "Resending..." : `Resend ${resendCooldown > 0 ? `(${resendCooldown}s)` : ''}`}
                  </button>
                </p>
              </div>
              <Button 
                type="button" 
                variant="link" 
                onClick={() => {
                  setStep('phone');
                  setVerificationId(null);
                  setResendCooldown(0);
                }}
                disabled={isLoading || isResending}
                className="mt-2"
              >
                Change phone number
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <Form {...phoneForm}>
          <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <FormField
                  control={phoneForm.control}
                  name="countryCode"
                  render={({ field }) => (
                    <FormItem className="w-1/3">
                      <FormLabel>Country</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Country" />
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
                        <Input 
                          placeholder="e.g., 244123456" 
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            field.onChange(value);
                          }}
                          disabled={isLoading}
                          inputMode="tel"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter your phone number without the country code
                      </p>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 animate-spin" />}
                Send Verification Code
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onBack}
                disabled={isLoading}
              >
                Back
              </Button>
            </div>
          </form>
        </Form>
      )}
    </>
  );
}
