"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, type DocumentData, type CollectionReference } from "firebase/firestore";
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

export default function AdminTestimonialsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const testimonialsRef = useMemo(() => firestore ? collection(firestore, 'testimonials') as CollectionReference<Testimonial> : null, [firestore]);
    const { data: testimonials, loading } = useCollection<Testimonial>(testimonialsRef);

    // Dialog state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [activeItem, setActiveItem] = useState<Testimonial | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<z.infer<typeof testimonialSchema>>({
        resolver: zodResolver(testimonialSchema),
        defaultValues: { name: "", title: "", text: "" },
    });

    const handleOpenForm = (item: Testimonial | null) => {
        setActiveItem(item);
        if (item) {
            form.reset({ name: item.name, title: item.title, text: item.text });
        } else {
            form.reset({ name: "", title: "", text: "" });
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = (open: boolean) => {
        setIsFormOpen(open);
        if (!open) {
            // Delay clearing active item to prevent UI freeze
            setTimeout(() => {
                setActiveItem(null);
                form.reset({ name: "", title: "", text: "" });
            }, 300);
        }
    }

    const handleOpenDelete = (item: Testimonial) => {
        setActiveItem(item);
        setIsDeleteOpen(true);
    }

    const handleCloseDelete = (open: boolean) => {
        setIsDeleteOpen(open);
        if (!open) {
            setTimeout(() => {
                setActiveItem(null);
            }, 300);
        }
    }

    const onSubmit = async (values: z.infer<typeof testimonialSchema>) => {
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            if (activeItem) {
                const docRef = doc(firestore, "testimonials", activeItem.id);
                await updateDoc(docRef, values);
                toast({ title: "Success", description: "Testimonial updated." });
            } else {
                await addDoc(collection(firestore, "testimonials"), { ...values, createdAt: serverTimestamp() });
                toast({ title: "Success", description: "New testimonial added." });
            }
            handleCloseForm(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || "Could not save testimonial." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!firestore || !activeItem) return;
        try {
            await deleteDoc(doc(firestore, "testimonials", activeItem.id));
            toast({ title: "Success", description: "Testimonial deleted." });
            handleCloseDelete(false);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message || "Could not delete testimonial." });
        }
    }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Testimonials Management</CardTitle>
                    <CardDescription>Manage the testimonials displayed on the homepage.</CardDescription>
                </div>
                <Button onClick={() => handleOpenForm(null)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Testimonial
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : !testimonials || testimonials.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">No testimonials found.</p>
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
                            {testimonials.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell>
                                        <div className="font-medium">{t.name}</div>
                                        <div className="text-xs text-muted-foreground">{t.title}</div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-lg truncate">{t.text}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenForm(t)}><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenDelete(t)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
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

        <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{activeItem ? 'Edit Testimonial' : 'Add New Testimonial'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                     <div className="space-y-1">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" {...form.register("name")} />
                        {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="title">Title / Role</Label>
                        <Input id="title" {...form.register("title")} placeholder="e.g., WASSCE Candidate" />
                        {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="text">Testimonial Text</Label>
                        <Textarea id="text" {...form.register("text")} rows={5} />
                        {form.formState.errors.text && <p className="text-xs text-destructive">{form.formState.errors.text.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleCloseForm(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            {activeItem ? 'Save Changes' : 'Add Testimonial'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={isDeleteOpen} onOpenChange={handleCloseDelete}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this testimonial from the database.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
