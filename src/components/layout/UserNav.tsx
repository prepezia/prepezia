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
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent className="p-0 flex flex-col" side="right" style={{ width: '320px' }}>
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">User Settings</SheetTitle>
            <SheetDescription className="sr-only">Manage your profile, settings, and more.</SheetDescription>
            <div className="flex flex-col items-center text-center p-6 border-b">
                <Avatar className="h-24 w-24 mb-3 border-2 border-primary">
                <AvatarImage src="https://i.pravatar.cc/150?u=username" alt="@user" />
                <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-xl">Hello, Username!</h3>
            </div>
          </SheetHeader>
          <div className="flex-grow overflow-y-auto p-2">
            <Button variant="ghost" className="w-full justify-start text-base mb-1" onClick={() => setIsSettingsOpen(true)}><User className="mr-2 h-4 w-4" /> Edit Profile</Button>
            <Button variant="ghost" className="w-full justify-start text-base mb-1" onClick={() => setIsFeedbackOpen(true)}><MessageSquareWarning className="mr-2 h-4 w-4" /> Feedback and Report</Button>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="invite" className="border-none">
                <AccordionTrigger className="hover:no-underline p-2 hover:bg-accent rounded-md text-base font-normal justify-start"><Share2 className="mr-2 h-4 w-4" /> Invite Friends</AccordionTrigger>
                <AccordionContent className="pb-2 pl-4 pr-2 pt-1">
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

              <AccordionItem value="legal" className="border-none">
                <AccordionTrigger className="hover:no-underline p-2 hover:bg-accent rounded-md text-base font-normal justify-start"><Gavel className="mr-2 h-4 w-4" /> Legal</AccordionTrigger>
                <AccordionContent className="pb-0 pl-10 pr-2">
                  <ul className="space-y-1 py-1">
                    <li><Link href="/terms" className="block p-1.5 text-sm rounded-md hover:bg-accent/50">Terms of Use</Link></li>
                    <li><Link href="/privacy" className="block p-1.5 text-sm rounded-md hover:bg-accent/50">Privacy Policy</Link></li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="contact" className="border-none">
                 <AccordionTrigger className="hover:no-underline p-2 hover:bg-accent rounded-md text-base font-normal justify-start"><Phone className="mr-2 h-4 w-4" /> Contact Us</AccordionTrigger>
                 <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-2 pl-4 pr-2 pt-1">
                    <Button variant="outline" className="w-full justify-start" asChild>
                        <a href="mailto:support@learnwithTemi.com"><Mail className="mr-2"/> Email Us</a>
                    </Button>
                     <Button variant="outline" className="w-full justify-start" asChild>
                        <a href="tel:0277777155"><Phone className="mr-2"/> Call Us</a>
                    </Button>
                     <Button variant="outline" className="w-full justify-start" asChild>
                        <a href="https://www.learnwithtemi.com" target="_blank" rel="noopener noreferrer"><Globe className="mr-2"/> Visit Website</a>
                    </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <div className="p-2 border-t">
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
