

"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  User,
  LogOut,
  MessageSquareWarning,
  Share2,
  Gavel,
  Phone,
  Trash2,
  Mail,
  Globe,
  Settings,
  Edit,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "../ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "../ui/separator";
import { useUser, useAuth, useDoc } from "@/firebase";
import {
  signOut,
  sendEmailVerification,
  updateProfile,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useFirestore } from "@/firebase";
import { doc, updateDoc, serverTimestamp, deleteField } from "firebase/firestore";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { educationalLevels } from "@/lib/education-levels";


const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.11,7.38 3,4.79C2.63,5.42 2.42,6.16 2.42,6.94C2.42,8.43 3.17,9.75 4.33,10.5C3.62,10.48 2.96,10.28 2.38,10V10.03C2.38,12.11 3.86,13.85 5.82,14.24C5.46,14.34 5.08,14.39 4.69,14.39C4.42,14.39 4.15,14.36 3.89,14.31C4.43,16.03 6.02,17.25 7.89,17.29C6.43,18.45 4.58,19.13 2.56,19.13C2.22,19.13 1.88,19.11 1.54,19.07C3.44,20.29 5.7,21 8.12,21C16,21 20.33,14.46 20.33,8.79C20.33,8.6 20.33,8.42 20.32,8.23C21.16,7.63 21.88,6.87 22.46,6Z" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
);

const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
);

const YouTubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 11.75a29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" {...props}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
);

const feedbackSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  file: z.instanceof(File).optional(),
});

const editProfileSchema = z.object({
  name: z.string().min(1, "Name cannot be empty."),
  email: z.string().email("Please enter a valid email."),
  educationalLevel: z.string().optional(),
  interests: z.string().optional(),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
}).refine(data => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password.",
    path: ["newPassword"],
});


export function UserNav() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isVerificationLoading, setIsVerificationLoading] = useState(false);

  const isEmailPasswordProvider = user ? user.providerData.some(p => p.providerId === 'password') : false;

  const userDocRef = useMemo(() => {
    if (user && firestore) {
      return doc(firestore, 'users', user.uid);
    }
    return null;
  }, [user, firestore]);

  const { data: firestoreUser } = useDoc(userDocRef);

  useEffect(() => {
    if (user?.emailVerified && firestoreUser && firestoreUser.emailVerified !== true && userDocRef) {
      updateDoc(userDocRef, {
        emailVerified: true,
        emailVerifiedAt: serverTimestamp(),
      }).catch(err => {
        console.error("Failed to update email verification status in Firestore:", err);
      });
    }
  }, [user, firestoreUser, userDocRef]);


  const feedbackForm = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { title: "", description: "", file: undefined },
  });

  function onFeedbackSubmit(values: z.infer<typeof feedbackSchema>) {
    console.log("Feedback submitted:", values);
    feedbackForm.reset();
    setIsFeedbackOpen(false);
    toast({ title: "Feedback Submitted", description: "Thank you!" });
  }

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/");
  };

  const handleSaveSettings = () => {
    localStorage.setItem("user_gemini_api_key", apiKey);
    setIsSettingsOpen(false);
    toast({ title: "Settings Saved", description: "Your Gemini API key has been updated." });
  };

  const handleDeleteAccount = () => {
    setIsDeleteOpen(false);
    handleLogout();
  };

  const handleSendVerification = async () => {
    if (!user) return;
    setIsVerificationLoading(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: "Verification Email Sent",
        description: `Please check the inbox (and spam folder) for ${user.email}.`,
      });
    } catch (error: any) {
      console.error("Verification resend error:", error);
      toast({
        variant: "destructive",
        title: "Error Sending Verification",
        description: error.message,
      });
    } finally {
        setIsVerificationLoading(false);
    }
  };

  async function handleShare() {
    const shareData = {
      title: 'Prepezia',
      text: 'Supercharge your studies with Prepezia, an AI-powered learning app for Ghanaian students!',
      url: "https://www.prepezia.com",
    };
    if (navigator.share && navigator.canShare(shareData)) {
      await navigator.share(shareData).catch(error => console.error('Error sharing:', error));
    } else {
      navigator.clipboard.writeText(shareData.url).then(() => {
        toast({ title: "Link Copied!", description: "Link copied to your clipboard." });
      }, (err) => {
        toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy link." });
      });
    }
  }

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" id="account-sheet-trigger" className="rounded-full h-8 w-8 p-0">
            <Avatar className="h-7 w-7">
              <AvatarImage src={user?.photoURL || "https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fsimple-avatar.png?alt=media&token=d3bc9b90-d925-42ed-9349-eee7132fd028"} alt={user?.displayName || "User"} />
              <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        </SheetTrigger>
        <SheetContent className="p-0 flex flex-col w-full" side="right">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">User Settings</SheetTitle>
            <SheetDescription className="sr-only">Manage your profile, settings, and more.</SheetDescription>
            <div className="flex flex-col items-center text-center p-6 border-b">
                <Avatar className="h-20 w-20 mb-3 border-2 border-primary">
                    <AvatarImage src={user?.photoURL || "https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fsimple-avatar.png?alt=media&token=d3bc9b90-d925-42ed-9349-eee7132fd028"} alt={user?.displayName || "User"} />
                    <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-xl">{user?.displayName || "User"}</h3>
            </div>
          </SheetHeader>

          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            <Accordion type="single" collapsible defaultValue="profile" className="w-full space-y-3">
                <AccordionItem value="profile" className="border-b-0 bg-background border rounded-lg shadow-sm">
                    <AccordionTrigger className="hover:no-underline p-4 text-base font-medium flex-1 justify-start">
                        <User className="mr-3 h-5 w-5" /> Edit Profile & Login
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 px-4 pt-0">
                        <div className="space-y-3 text-sm">
                            <Separator />
                            <div className="pt-2">
                                <span className="font-semibold">Name:</span>
                                <span className="text-muted-foreground ml-2">{firestoreUser?.name || user?.displayName || "N/A"}</span>
                            </div>
                            <div>
                                <span className="font-semibold">Email:</span>
                                <div className="text-muted-foreground flex items-center gap-2">
                                    <span>{firestoreUser?.email || user?.email || "N/A"}</span>
                                    {isEmailPasswordProvider ? (
                                        firestoreUser?.emailVerified ? (
                                            <span className="text-xs text-green-600 font-medium">(Verified)</span>
                                        ) : (
                                            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleSendVerification} disabled={isVerificationLoading}>
                                                {isVerificationLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1"/> : null}
                                                Verify
                                            </Button>
                                        )
                                    ) : (
                                        user?.emailVerified && <span className="text-xs text-green-600 font-medium">(Verified)</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="font-semibold">Phone:</span>
                                <span className="text-muted-foreground ml-2">{user?.phoneNumber || "N/A"}</span>
                            </div>
                             <div>
                                <span className="font-semibold">Educational Level:</span>
                                <span className="text-muted-foreground ml-2">{firestoreUser?.educationalLevel || "N/A"}</span>
                            </div>
                            <div>
                                <span className="font-semibold">Interests:</span>
                                <span className="text-muted-foreground ml-2">{firestoreUser?.interests?.join(', ') || "N/A"}</span>
                            </div>
                            <Separator />
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Button size="sm" variant="outline" onClick={() => setIsEditProfileOpen(true)}><Edit className="mr-2 h-4 w-4"/> Edit</Button>
                                {isEmailPasswordProvider && <Button size="sm" variant="outline" onClick={() => setIsChangePasswordOpen(true)}><KeyRound className="mr-2 h-4 w-4"/>Change Password</Button>}
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="settings" className="border-b-0 bg-background border rounded-lg shadow-sm">
                    <AccordionTrigger className="hover:no-underline p-4 text-base font-medium flex-1 justify-start">
                        <Settings className="mr-3 h-5 w-5" /> App Settings
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 px-4 pt-0">
                       <div className="space-y-2 pt-2">
                            <Label htmlFor="api-key" className="text-sm font-medium">Gemini API Key</Label>
                            <Input id="api-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter your Google Student AI key" />
                            <p className="text-xs text-muted-foreground">If you have a Google Student account, you can use your own free Gemini API key here.</p>
                            <Button size="sm" onClick={handleSaveSettings}>Save Settings</Button>
                       </div>
                    </AccordionContent>
                </AccordionItem>

              <AccordionItem value="invite" className="border-b-0 bg-background border rounded-lg shadow-sm">
                <AccordionTrigger className="hover:no-underline p-4 text-base font-medium flex-1 justify-start">
                    <Share2 className="mr-3 h-5 w-5" /> Invite Friends
                </AccordionTrigger>
                <AccordionContent className="pb-4 px-4 pt-0">
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">Share the joy of learning. Invite your friends to join Prepezia.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" asChild><a href="https://wa.me/?text=Check%20out%20Prepezia%2C%20an%20AI-powered%20learning%20app%20for%20Ghanaian%20students!%20https%3A%2F%2Fwww.prepezia.com" target="_blank" rel="noopener noreferrer">WhatsApp</a></Button>
                      <Button variant="outline" asChild><a href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.prepezia.com" target="_blank" rel="noopener noreferrer">Facebook</a></Button>
                    </div>
                    <Button className="w-full" onClick={handleShare}>More ways to share...</Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="legal" className="border-b-0 bg-background border rounded-lg shadow-sm">
                <AccordionTrigger className="hover:no-underline p-4 text-base font-medium flex-1 justify-start">
                  <Gavel className="mr-3 h-5 w-5" /> Legal
                </AccordionTrigger>
                <AccordionContent className="pb-0 pl-10 pr-2 pt-0">
                  <ul className="space-y-1 py-1">
                    <li><Link href="/terms" className="block p-1.5 text-sm rounded-md hover:bg-accent/50">Terms of Use</Link></li>
                    <li><Link href="/privacy" className="block p-1.5 text-sm rounded-md hover:bg-accent/50">Privacy Policy</Link></li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="contact" className="border-b-0 bg-background border rounded-lg shadow-sm">
                 <AccordionTrigger className="hover:no-underline p-4 text-base font-medium flex-1 justify-start">
                    <Phone className="mr-3 h-5 w-5" /> Contact Us
                 </AccordionTrigger>
                 <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-4 px-4 pt-0">
                    <p className="text-sm text-muted-foreground mb-4 pt-2">Have questions? We are here to help.</p>
                    <div className="flex justify-around mb-4 text-center">
                        <a href="tel:0277777155" className="flex flex-col items-center gap-1 text-primary hover:underline"><div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center"><Phone className="w-5 h-5"/></div><span className="text-xs">Call Us</span></a>
                        <a href="mailto:support@prepezia.com" className="flex flex-col items-center gap-1 text-primary hover:underline"><div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center"><Mail className="w-5 h-5"/></div><span className="text-xs">Email Us</span></a>
                        <a href="https://www.prepezia.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-primary hover:underline"><div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center"><Globe className="w-5 h-5"/></div><span className="text-xs">Website</span></a>
                    </div>
                    <Separator className="my-4 bg-border/50" />
                    <h4 className="font-semibold mb-4 text-center text-sm pt-2">Follow Us</h4>
                    <div className="flex justify-center gap-4">
                        <a href="#" className="text-muted-foreground hover:text-primary"><FacebookIcon className="w-6 h-6" /></a>
                        <a href="#" className="text-muted-foreground hover:text-primary"><LinkedInIcon className="w-6 h-6" /></a>
                        <a href="#" className="text-muted-foreground hover:text-primary"><TwitterIcon className="w-6 h-6" /></a>
                        <a href="#" className="text-muted-foreground hover:text-primary"><YouTubeIcon className="w-6 h-6" /></a>
                        <a href="#" className="text-muted-foreground hover:text-primary"><InstagramIcon className="w-6 h-6" /></a>
                    </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <div className="p-4 border-t mt-auto">
             <Button variant="ghost" className="w-full justify-start text-base" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4"/>
                <span>Logout</span>
            </Button>
            <Button variant="destructive" className="w-full justify-start text-base mt-1" onClick={() => setIsDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4"/>
                <span>Delete Account</span>
            </Button>
            <div className="text-center text-xs text-muted-foreground pt-4">
                <p>v1.0.0</p>
                <p>&copy; {new Date().getFullYear()} Next Innovation Africa Ltd</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Profile Dialog */}
      {user && (
          <EditProfileDialog
            open={isEditProfileOpen}
            onOpenChange={setIsEditProfileOpen}
            user={user}
            isEmailPasswordProvider={isEmailPasswordProvider}
            firestore={firestore}
            userDocRef={userDocRef}
            firestoreUser={firestoreUser}
          />
      )}

      {/* Change Password Dialog */}
      {user && isEmailPasswordProvider && (
          <ChangePasswordDialog
            open={isChangePasswordOpen}
            onOpenChange={setIsChangePasswordOpen}
            user={user}
            auth={auth}
          />
      )}
      
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescriptionComponent>
              This action cannot be undone. This will permanently delete your account and remove your data from our servers.
            </DialogDescriptionComponent>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><MessageSquareWarning className="h-5 w-5" />Feedback and Report</DialogTitle>
                <DialogDescriptionComponent>Spotted a bug or have a suggestion? We'd love to hear from you.</DialogDescriptionComponent>
            </DialogHeader>
            <Form {...feedbackForm}>
                <form onSubmit={feedbackForm.handleSubmit(onFeedbackSubmit)} className="space-y-4 pt-4">
                    <FormField control={feedbackForm.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Title *</FormLabel><FormControl><Input placeholder="e.g., 'Bug in Note Generator'" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={feedbackForm.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description *</FormLabel><FormControl><Textarea placeholder="Please describe the issue or your feedback in detail." rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={feedbackForm.control} name="file" render={({ field: { onChange, onBlur, name, ref } }) => (
                        <FormItem><FormLabel>Attach File (optional)</FormLabel><FormControl><Input type="file" onChange={(e) => onChange(e.target.files ? e.target.files[0] : undefined)} onBlur={onBlur} name={name} ref={ref} accept="image/*,.pdf" /></FormControl><FormDescription className="text-xs">Supported: Images, PDF (Max 5MB)</FormDescription><FormMessage /></FormItem>
                    )}/>
                    <DialogFooter><Button type="submit">Submit Feedback</Button></DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Edit Profile Dialog Component
function EditProfileDialog({ open, onOpenChange, user, isEmailPasswordProvider, firestore, userDocRef, firestoreUser }: any) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof editProfileSchema>>({
        resolver: zodResolver(editProfileSchema),
        defaultValues: {
            name: user?.displayName || "",
            email: user?.email || "",
            educationalLevel: "",
            interests: "",
        },
    });

    useEffect(() => {
        if(user) {
            form.reset({
                name: user.displayName || "",
                email: user.email || "",
                educationalLevel: firestoreUser?.educationalLevel || "",
                interests: firestoreUser?.interests?.join(', ') || "",
            });
        }
    }, [user, firestoreUser, form]);

    async function onSubmit(values: z.infer<typeof editProfileSchema>) {
        if (!user || !firestore || !userDocRef) return;
        setIsLoading(true);
        
        let hasChanges = false;
        try {
            const firestoreUpdates: { name?: string, educationalLevel?: string, interests?: string[] } = {};

            // Check for name change
            if (values.name !== user.displayName) {
                await updateProfile(user, { displayName: values.name });
                firestoreUpdates.name = values.name;
                hasChanges = true;
            }

            // Check for educational level change
            if (values.educationalLevel && values.educationalLevel !== firestoreUser?.educationalLevel) {
                firestoreUpdates.educationalLevel = values.educationalLevel;
                hasChanges = true;
            }
            
            // Check for interests change
            const interestsArray = values.interests
                ? values.interests.split(',').map(item => item.trim()).filter(Boolean).slice(0, 5)
                : [];
            
            if (JSON.stringify(interestsArray) !== JSON.stringify(firestoreUser?.interests || [])) {
                firestoreUpdates.interests = interestsArray;
                hasChanges = true;
            }
            
            if (Object.keys(firestoreUpdates).length > 0) {
                await updateDoc(userDocRef, firestoreUpdates);
            }

            // Update email if it has changed (and is allowed)
            if (isEmailPasswordProvider && values.email !== user.email) {
                await verifyBeforeUpdateEmail(user, values.email);
                 // Optimistically update Firestore
                await updateDoc(userDocRef, { 
                    email: values.email,
                    emailVerified: false,
                    emailVerifiedAt: deleteField()
                });
                toast({
                    title: "Verification Required",
                    description: `A verification link has been sent to ${values.email} to complete the change.`,
                    duration: 10000,
                });
                hasChanges = true;
            }

            if (hasChanges) {
                 toast({ title: "Success", description: "Your profile has been updated." });
            } else {
                 toast({ title: "No Changes", description: "You did not make any changes." });
            }

            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent><DialogHeader><DialogTitle>Edit Your Information</DialogTitle></DialogHeader>
                <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input {...field} disabled={!isEmailPasswordProvider} /></FormControl><FormDescription>{!isEmailPasswordProvider && "You cannot change your email when signed in with Google."}</FormDescription><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="educationalLevel" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Educational Level</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your level..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {educationalLevels.map((levelName) => (
                                    <SelectItem key={levelName} value={levelName}>
                                        {levelName}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="interests" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Interests</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., Football, Music, Movies" /></FormControl>
                            <FormDescription>List up to 5 interests, separated by commas. The AI will use these to personalize explanations.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <DialogFooter><Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Changes</Button></DialogFooter>
                </form></Form>
            </DialogContent>
        </Dialog>
    )
}

// Change Password Dialog Component
function ChangePasswordDialog({ open, onOpenChange, user, auth }: any) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const form = useForm<z.infer<typeof changePasswordSchema>>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { currentPassword: "", newPassword: "" },
    });
    
    const newPassword = form.watch("newPassword");
    
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

        if (score === 2) { text = 'Medium'; className = 'bg-yellow-500'; } 
        else if (score === 3) { text = 'Good'; className = 'bg-blue-500'; } 
        else if (score === 4) { text = 'Strong'; className = 'bg-green-500'; }
        
        return { value, text, className };
    };

    const strengthProps = getStrengthProps(newPassword || "");

    async function onSubmit(values: z.infer<typeof changePasswordSchema>) {
        if (!user?.email || !auth) return;
        setIsLoading(true);

        try {
            const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, values.newPassword);
            toast({ title: "Success", description: "Your password has been changed." });
            onOpenChange(false);
            form.reset();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to Change Password", description: error.code === 'auth/wrong-password' ? 'Incorrect current password.' : error.message });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent><DialogHeader><DialogTitle>Change Your Password</DialogTitle></DialogHeader>
                <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="currentPassword" render={({ field }) => (
                        <FormItem><FormLabel>Current Password</FormLabel>
                            <div className="relative">
                                <FormControl><Input type={showCurrentPassword ? "text" : "password"} {...field} /></FormControl>
                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="newPassword" render={({ field }) => (
                        <FormItem><FormLabel>New Password</FormLabel>
                            <div className="relative">
                                <FormControl><Input type={showNewPassword ? "text" : "password"} {...field} /></FormControl>
                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)}>
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <FormMessage />
                             {newPassword && (
                                <div className="space-y-2 pt-1">
                                    <Progress value={strengthProps.value} className="h-1.5" indicatorClassName={strengthProps.className} />
                                    <p className="text-xs text-muted-foreground">{strengthProps.text}</p>
                                </div>
                            )}
                        </FormItem>
                    )}/>
                    <DialogFooter><Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Change Password</Button></DialogFooter>
                </form></Form>
            </DialogContent>
        </Dialog>
    )
}

    
