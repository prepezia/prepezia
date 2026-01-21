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

export function UserNav() {
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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
            <Button variant="ghost" className="w-full justify-start text-base mb-1"><MessageSquareWarning className="mr-2 h-4 w-4" /> Feedback and Report</Button>
            <Button variant="ghost" className="w-full justify-start text-base mb-1"><Share2 className="mr-2 h-4 w-4" /> Invite Friends</Button>
            
            <Accordion type="single" collapsible className="w-full">
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
                <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-2 pl-10 pr-2 pt-1">
                    <p><strong>Email:</strong><br/> support@learnwithTemi.com</p>
                    <p><strong>Phone:</strong><br/> 0277777155</p>
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
    </>
  );
}
