
"use client";

import { useState, useEffect } from "react";
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
import { doc, updateDoc } from "firebase/firestore";
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
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  const addDebugMessage = (message: string) => {
    console.log(message);
    setDebugMessages(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

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
      addDebugMessage("Auth service not available.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Authentication service not available.",
      });
      return;
    }

    setDebugMessages([]);
    addDebugMessage("Starting OTP process...");
    setIsLoading(true);

    try {
      addDebugMessage("Formatting phone number...");
      const country = countryCodes.find(c => c.code === values.countryCode);
      if (!country) throw new Error("Invalid country selected.");
      
      const localPhoneNumber = values.phone.startsWith('0') ? values.phone.substring(1) : values.phone;
      const phoneNumber = `${country.dial_code}${localPhoneNumber}`;
      setFullPhoneNumber(phoneNumber);
      addDebugMessage(`Full phone number: ${phoneNumber}`);
      
      const confirmationResult = await sendPhoneOtp(auth, phoneNumber, addDebugMessage);
      
      addDebugMessage("OTP process completed in utility.");
      setVerificationId(confirmationResult.verificationId);
      setStep("otp");
      setResendCooldown(30);
      toast({
        title: "OTP Sent",
        description: `A verification code has been sent to ${phoneNumber}.`,
      });

    } catch (error: any) {
      addDebugMessage(`Error caught in component: ${error.message}`);
      toast({
        variant: "destructive",
        title: "OTP Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
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
      const credential = PhoneAuthProvider.credential(verificationId, values.otp);
      await linkWithCredential(user, credential);
      
      if (firestore) {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, { 
          phoneNumber: fullPhoneNumber,
          phoneVerified: true 
        });
      }

      toast({ 
        title: "Success!", 
        description: "Your phone number has been verified." 
      });
      
      router.push("/home");

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

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    try {
      await phoneForm.handleSubmit(handleSendOtp)();
    } catch (error) {
      console.error("Resend OTP error:", error);
    }
  };

  return (
    <>
      {step === "otp" ? (
        <Form {...otpForm}>
          <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-6">
            <FormField
              control={otpForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="123456" 
                      {...field} 
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
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
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                    className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Resend {resendCooldown > 0 && `(${resendCooldown}s)`}
                  </button>
                </p>
              </div>
              <Button 
                type="button" 
                variant="link" 
                onClick={() => {
                  setStep('phone');
                  setVerificationId(null);
                }}
                disabled={isLoading}
              >
                Change phone number
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <Form {...phoneForm}>
          <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-6">
            <div className="flex gap-2">
              <FormField
                control={phoneForm.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem className="w-1/3">
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                        inputMode="tel"
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
                Send Verification Code
              </Button>
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
            </div>
          </form>
        </Form>
      )}
      
      {debugMessages.length > 0 && (
        <div className="mt-4 p-2 border bg-secondary/50 rounded-md">
          <h4 className="text-sm font-bold mb-1">Debug Log:</h4>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
            {debugMessages.join('\n')}
          </pre>
        </div>
      )}
    </>
  );
}
