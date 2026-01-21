"use client";

import LandingFooter from "@/components/layout/LandingFooter";
import LandingHeader from "@/components/layout/LandingHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(new Date().toLocaleDateString());
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
        <div className="mb-8">
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="space-y-2">
                    <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">Privacy Policy for Learn with Temi</h1>
                    <p className="text-sm text-muted-foreground"><strong>Last Updated:</strong> {date}</p>
                </div>
              
                <div className="space-y-4">
                    <h2 className="font-headline text-2xl font-bold border-b pb-2">1. Introduction</h2>
                    <p className="text-muted-foreground">
                        Welcome to Learn with Temi ("we," "our," or "us"). We are committed to protecting your privacy and handling your personal data in an open and transparent manner. This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our application.
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="font-headline text-2xl font-bold border-b pb-2">2. Information We Collect</h2>
                    <p className="text-muted-foreground">We may collect information about you in a variety of ways. The information we may collect on the Service includes:</p>
                    <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                        <li>
                        <strong>Personal Data:</strong> Personally identifiable information, such as your name, and email address, that you voluntarily give to us when you register with the application.
                        </li>
                        <li>
                        <strong>Derivative Data:</strong> Information our servers automatically collect when you access the application, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the application.
                        </li>
                        <li>
                        <strong>Data from Social Networks:</strong> User information from social networking sites, such as Google, including your name, your social network username, location, gender, birth date, email address, profile picture, and public data for contacts, if you connect your account to such social networks.
                        </li>
                        <li>
                        <strong>User-Provided Content:</strong> We collect the files (PDFs, text, audio) and links (web URLs, YouTube links) you upload or provide to create your StudySpaces. We also collect the exam results you input for AI Assessment.
                        </li>
                        <li>
                        <strong>API Keys:</strong> If you choose to provide your own Gemini API Key via the 'Connect Google Student Account' feature, we store this key locally on your device's storage and it is never transmitted to our servers.
                        </li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <h2 className="font-headline text-2xl font-bold border-b pb-2">3. Use of Your Information</h2>
                    <p className="text-muted-foreground">Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the application to:</p>
                    <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                        <li>Create and manage your account.</li>
                        <li>Process your requests and generate AI-powered content (notes, podcasts, roadmaps).</li>
                        <li>Email you regarding your account.</li>
                        <li>Enable user-to-user communications.</li>
                        <li>Monitor and analyze usage and trends to improve your experience with the application.</li>
                        <li>Display third-party advertisements through Google AdSense.</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <h2 className="font-headline text-2xl font-bold border-b pb-2">4. Disclosure of Your Information</h2>
                    <p className="text-muted-foreground">We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
                    <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                        <li>
                        <strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.
                        </li>
                        <li>
                        <strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including data analysis, email delivery, hosting services (Firebase), and customer service.
                        </li>
                        <li>
                        <strong>Third-Party Advertisers:</strong> We may use third-party advertising companies like Google AdSense to serve ads when you visit the application.
                        </li>
                    </ul>
                </div>
                
                <div className="space-y-4">
                    <h2 className="font-headline text-2xl font-bold border-b pb-2">5. Security of Your Information</h2>
                    <p className="text-muted-foreground">
                        We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="font-headline text-2xl font-bold border-b pb-2">6. Your Rights</h2>
                    <p className="text-muted-foreground">
                        You have the right to access, correct, or delete your personal data. You can manage your account information from your user dashboard or by contacting us directly.
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="font-headline text-2xl font-bold border-b pb-2">7. Contact Us</h2>
                    <p className="text-muted-foreground">
                        If you have questions or comments about this Privacy Policy, please contact us:
                    </p>
                    <address className="not-italic space-y-1 text-muted-foreground">
                        <strong>Next Innovation Africa Ltd</strong><br />
                        <span>K209, Nii Amasa Nikoi, CL, New Adenta, GD - 091 – 8790</span><br />
                        <a href="tel:0277777155" className="text-primary hover:underline">Phone: 0277777155</a><br />
                        <a href="mailto:support@learnwithTemi.com" className="text-primary hover:underline">Email: support@learnwithTemi.com</a><br />
                        <a href="https://www.learnwithTemi.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Website: www.learnwithTemi.com</a>
                    </address>
                </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
