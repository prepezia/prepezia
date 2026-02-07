
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
  RecaptchaVerifier,
  ConfirmationResult,
  linkWithPhoneNumber,
  User,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { countryCodes, Country } from "@/lib/country-codes";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

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

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { countryCode: "GH", phone: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    if (!auth || window.recaptchaVerifier) return;
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => {},
        }
      );
    } catch (error) {
      console.error("Recaptcha verifier error", error);
    }
    return () => {
      window.recaptchaVerifier?.clear();
    };
  }, [auth]);

  async function onSendOtp(values: z.infer<typeof phoneSchema>) {
    if (!auth || !window.recaptchaVerifier) return;
    setIsLoading(true);

    const country = countryCodes.find(c => c.code === values.countryCode);
    if (!country) {
        toast({ variant: 'destructive', title: 'Invalid country code' });
        setIsLoading(false);
        return;
    }
    const phoneNumber = `${country.dial_code}${values.phone}`;
    setFullPhoneNumber(phoneNumber);
    
    try {
      window.confirmationResult = await linkWithPhoneNumber(
        user,
        phoneNumber,
        window.recaptchaVerifier
      );
      setStep("otp");
      toast({
        title: "OTP Sent",
        description: `A verification code has been sent to ${phoneNumber}.`,
      });
    } catch (error: any) {
      console.error("OTP send error:", error);
      toast({
        variant: "destructive",
        title: "Failed to Send OTP",
        description: error.message,
      });
      window.recaptchaVerifier.render().then((widgetId) => {
        if(auth && window.grecaptcha){
          window.grecaptcha.reset(widgetId);
        }
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onVerifyOtp(values: z.infer<typeof otpSchema>) {
    if (!window.confirmationResult) return;
    setIsLoading(true);
    try {
      await window.confirmationResult.confirm(values.otp);
      
      if (firestore) {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, { phoneNumber: fullPhoneNumber });
      }

      toast({ title: "Success!", description: "Your phone number is verified." });
      router.push("/home");

    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "The code you entered is incorrect. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (step === "otp") {
    return (
      <Form {...otpForm}>
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
            <Button type="button" variant="outline" onClick={() => setStep('phone')}>
                Back
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  return (
    <Form {...phoneForm}>
      <div id="recaptcha-container"></div>
      <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-6">
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
