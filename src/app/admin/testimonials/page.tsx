
"use client";

import { useState, useEffect, useMemo } from "react";
import { useCollection, useFirestore } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, type DocumentData } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Testimonial extends DocumentData {
  id: string;
  name: string;
  title: string;
  text: string;
}

const testimonialSchema = z.object({
    name: z.string().min(1, "Name is required."),
    title: z.string().min(1, "Title is required."),
    text: z.string().min(1, "Testimonial text is required."),
});

const seedTestimonials = [
    { name: "Ama Serwaa", title: "WASSCE Candidate", text: "Prepezia changed the game for my WASSCE prep. The AI chat helped me understand concepts I was stuck on for weeks." },
    { name: "Kofi Mensah", title: "University of Ghana Student", text: "The podcast generator is pure genius! I listen to my notes on the go. It's like having a personal study group in my pocket." },
    { name: "Adwoa Agyapong", title: "BECE Candidate", text: "The past questions hub was invaluable. The AI roadmap showed me exactly where to focus my revision." },
    { name: "Yaw Boakye", title: "Ashesi University Student", text: "Study Spaces let me combine my lecture notes with YouTube videos. Chatting with the AI to get summaries is incredibly powerful." },
    { name: "Fatima Ibrahim", title: "KNUST Graduate", text: "The CV Improver helped me land my first job out of uni. The AI suggestions were spot on and made my CV look so much more professional." },
];

export default function AdminTestimonialsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const testimonialsRef = useMemo(() => firestore ? collection(firestore, 'testimonials') : null, [firestore]);
    const { data: testimonials, loading } = useCollection<Testimonial>(testimonialsRef);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [currentTestimonial, setCurrentTestimonial] = useState<Testimonial | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<z.infer<typeof testimonialSchema>>({
        resolver: zodResolver(testimonialSchema),
        defaultValues: { name: "", title: "", text: "" },
    });

    const handleOpenDialog = (testimonial: Testimonial | null) => {
        setCurrentTestimonial(testimonial);
        if (testimonial) {
            form.reset({ name: testimonial.name, title: testimonial.title, text: testimonial.text });
        } else {
            form.reset({ name: "", title: "", text: "" });
        }
        setIsDialogOpen(true);
    };

    const handleOpenDeleteDialog = (testimonial: Testimonial) => {
        setCurrentTestimonial(testimonial);
        setIsDeleteDialogOpen(true);
    }

    const onSubmit = async (values: z.infer<typeof testimonialSchema>) => {
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            if (currentTestimonial) {
                // Update
                const testimonialDoc = doc(firestore, "testimonials", currentTestimonial.id);
                await updateDoc(testimonialDoc, values);
                toast({ title: "Success", description: "Testimonial updated." });
            } else {
                // Create
                await addDoc(collection(firestore, "testimonials"), { ...values, createdAt: serverTimestamp() });
                toast({ title: "Success", description: "New testimonial added." });
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || "Could not save testimonial." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!firestore || !currentTestimonial) return;
        try {
            await deleteDoc(doc(firestore, "testimonials", currentTestimonial.id));
            toast({ title: "Success", description: "Testimonial deleted." });
            setIsDeleteDialogOpen(false);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message || "Could not delete testimonial." });
        }
    }

  return (
    <>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Testimonials Management</CardTitle>
                    <CardDescription>Manage the testimonials displayed on the homepage.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog(null)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Testimonial
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Name</TableHead>
                                <TableHead>Text</TableHead>
                                <TableHead className="w-[50px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {testimonials?.map((testimonial) => (
                                <TableRow key={testimonial.id}>
                                    <TableCell>
                                        <div className="font-medium">{testimonial.name}</div>
                                        <div className="text-sm text-muted-foreground">{testimonial.title}</div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground max-w-lg truncate">{testimonial.text}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleOpenDialog(testimonial)}><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenDeleteDialog(testimonial)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{currentTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                     <div className="space-y-1">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" {...form.register("name")} />
                        {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="title">Title / Role</Label>
                        <Input id="title" {...form.register("title")} placeholder="e.g., WASSCE Candidate" />
                        {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="text">Testimonial Text</Label>
                        <Textarea id="text" {...form.register("text")} rows={5} />
                        {form.formState.errors.text && <p className="text-sm text-destructive">{form.formState.errors.text.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            {currentTestimonial ? 'Save Changes' : 'Add Testimonial'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this testimonial.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
