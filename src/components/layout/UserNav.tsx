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
  Menu,
  Mail,
  Globe,
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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "../ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "../ui/separator";


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

export function UserNav() {
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const { toast } = useToast();

  const feedbackSchema = z.object({
    title: z.string().min(1, "Title is required."),
    description: z.string().min(1, "Description is required."),
    file: z.instanceof(File).optional(),
  });

  const feedbackForm = useForm<z.infer<typeof feedbackSchema>>({
      resolver: zodResolver(feedbackSchema),
      defaultValues: {
          title: "",
          description: "",
          file: undefined,
      },
  });

  function onFeedbackSubmit(values: z.infer<typeof feedbackSchema>) {
      console.log("Feedback submitted:", values);
      // In a real app, this would send the data to a backend.
      feedbackForm.reset();
      setIsFeedbackOpen(false);
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      })
  }


  const handleLogout = () => {
    // TODO: Implement Firebase logout
    router.push("/");
  };

  const handleSaveSettings = () => {
    // In a real app, save this to localStorage, not state.
    localStorage.setItem("user_gemini_api_key", apiKey);
    setIsSettingsOpen(false);
  };

  const handleDeleteAccount = () => {
    // TODO: implement account deletion
    setIsDeleteOpen(false);
    handleLogout();
  }

  async function handleShare() {
    const shareData = {
        title: 'Learn with Temi',
        text: 'Supercharge your studies with Learn with Temi, an AI-powered learning app for Ghanaian students!',
        url: "https://www.learnwithtemi.com",
    };
    if (navigator.share && navigator.canShare(shareData)) {
        try {
            await navigator.share(shareData);
        } catch (error) {
            console.error('Error sharing:', error);
        }
    } else {
        navigator.clipboard.writeText(shareData.url).then(() => {
            toast({
                title: "Link Copied!",
                description: "The link to our website has been copied to your clipboard.",
            });
        }, (err) => {
          console.error("Failed to copy link:", err);
          toast({
            variant: "destructive",
            title: "Copy Failed",
            description: "Could not copy link to clipboard.",
          })
        });
    }
  }


  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" id="account-sheet-trigger">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent className="p-0 flex flex-col w-[80%]" side="right">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">User Settings</SheetTitle>
            <SheetDescription className="sr-only">Manage your profile, settings, and more.</SheetDescription>
            <div className="flex flex-col items-center text-center p-6 border-b">
                <Avatar className="h-24 w-24 mb-3 border-2 border-primary">
                <AvatarImage src="https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fsimple-avatar.png?alt=media&token=d3bc9b90-d925-42ed-9349-eee7132fd028" alt="User avatar" />
                <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-xl">Hello, Username!</h3>
            </div>
          </SheetHeader>
          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            <Button variant="outline" className="w-full justify-start text-base p-4 rounded-lg bg-background shadow-sm border h-auto" onClick={() => setIsSettingsOpen(true)}>
                <User className="mr-3 h-5 w-5" /> Edit Profile
            </Button>
            <Button variant="outline" className="w-full justify-start text-base p-4 rounded-lg bg-background shadow-sm border h-auto" onClick={() => setIsFeedbackOpen(true)}>
                <MessageSquareWarning className="mr-3 h-5 w-5" /> Feedback and Report
            </Button>
            
            <Accordion type="multiple" className="w-full space-y-3">
              <AccordionItem value="invite" className="border-b-0 bg-background border rounded-lg shadow-sm">
                <AccordionTrigger className="hover:no-underline p-4 text-base font-medium flex-1 justify-start">
                    <Share2 className="mr-3 h-5 w-5" /> Invite Friends
                </AccordionTrigger>
                <AccordionContent className="pb-4 px-4 pt-0">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Share the joy of learning. Invite your friends and family to join Learn with Temi.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" asChild><a href="https://wa.me/?text=Check%20out%20Learn%20with%20Temi%2C%20an%20AI-powered%20learning%20app%20for%20Ghanaian%20students!%20https%3A%2F%2Fwww.learnwithtemi.com" target="_blank" rel="noopener noreferrer">WhatsApp</a></Button>
                      <Button variant="outline" asChild><a href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.learnwithtemi.com" target="_blank" rel="noopener noreferrer">Facebook</a></Button>
                      <Button variant="outline" asChild><a href="https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.learnwithtemi.com&text=Check%20out%20Learn%20with%20Temi%2C%20an%20AI-powered%20learning%20app!" target="_blank" rel="noopener noreferrer">X</a></Button>
                      <Button variant="outline" asChild><a href="mailto:?subject=Invitation%20to%20Learn%20with%20Temi&body=Check%20out%20Learn%20with%20Temi%2C%20an%20AI-powered%20learning%20app%20for%20Ghanaian%20students!%20https%3A%2F%2Fwww.learnwithtemi.com">Email</a></Button>
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
                    <p className="text-sm text-muted-foreground mb-4">Have questions? We are here to help.</p>
                    <div className="flex justify-around mb-4 text-center">
                        <a href="tel:0277777155" className="flex flex-col items-center gap-1 text-primary hover:underline">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center"><Phone className="w-5 h-5"/></div>
                            <span className="text-xs">Call Us</span>
                        </a>
                        <a href="mailto:support@learnwithTemi.com" className="flex flex-col items-center gap-1 text-primary hover:underline">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center"><Mail className="w-5 h-5"/></div>
                            <span className="text-xs">Email Us</span>
                        </a>
                        <a href="https://www.learnwithtemi.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-primary hover:underline">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center"><Globe className="w-5 h-5"/></div>
                            <span className="text-xs">Website</span>
                        </a>
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
                <p>v1.00</p>
                <p>&copy; {new Date().getFullYear()} Next Innovation Africa Ltd</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile & Settings</DialogTitle>
            <DialogDescriptionComponent>
              Manage your account and API settings.
            </DialogDescriptionComponent>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="api-key" className="text-right col-span-4 text-left">
                Gemini API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Google Student AI key"
                className="col-span-4"
              />
              <p className="col-span-4 text-sm text-muted-foreground">
                If you have a Google Student account, you can use your own free Gemini API key here.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSettings}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
                <DialogTitle className="flex items-center gap-2">
                    <MessageSquareWarning className="h-5 w-5" />
                    Feedback and Report
                </DialogTitle>
                <DialogDescriptionComponent>
                  Spotted a bug or have a suggestion? We'd love to hear from you.
                </DialogDescriptionComponent>
            </DialogHeader>
            <Form {...feedbackForm}>
                <form onSubmit={feedbackForm.handleSubmit(onFeedbackSubmit)} className="space-y-4 pt-4">
                    <FormField
                        control={feedbackForm.control}
                        name="title"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., 'Bug in Note Generator'" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={feedbackForm.control}
                        name="description"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                            <Textarea
                                placeholder="Please describe the issue or your feedback in detail."
                                rows={4}
                                {...field}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={feedbackForm.control}
                        name="file"
                        render={({ field: { onChange, onBlur, name, ref } }) => (
                            <FormItem>
                                <FormLabel>Attach File (optional)</FormLabel>
                                <FormControl>
                                <Input 
                                    type="file" 
                                    onChange={(e) => onChange(e.target.files ? e.target.files[0] : undefined)} 
                                    onBlur={onBlur}
                                    name={name}
                                    ref={ref}
                                    accept="image/*,.pdf"
                                />
                                </FormControl>
                                <FormDescription className="text-xs">
                                    Supported: Images, PDF (Max 5MB)
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="submit">Submit Feedback</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}
