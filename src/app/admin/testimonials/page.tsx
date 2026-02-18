"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore } from "@/firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  type DocumentData 
} from "firebase/firestore";
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
  DialogDescription,
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Plus, Trash2, Edit, Loader2, Save } from "lucide-react";

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

  // 1. Data Fetching
  const testimonialsRef = useMemo(() => 
    firestore ? collection(firestore, 'testimonials') : null, 
  [firestore]);
  
  const { data: testimonials, loading } = useCollection<Testimonial>(testimonialsRef as any);

  // 2. Component State
  const [activeTestimonial, setActiveTestimonial] = useState<Testimonial | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof testimonialSchema>>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: { name: "", title: "", text: "" },
  });

  // 3. Dialog Handlers
  const handleOpenAdd = () => {
    setActiveTestimonial(null);
    form.reset({ name: "", title: "", text: "" });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Testimonial) => {
    setActiveTestimonial(item);
    form.reset({ name: item.name, title: item.title, text: item.text });
    setIsFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setTimeout(() => {
        setActiveTestimonial(null);
        form.reset();
      }, 300);
    }
  };

  const handleOpenDelete = (item: Testimonial) => {
    setActiveTestimonial(item);
    setIsDeleteAlertOpen(true);
  };

  const handleCloseDelete = (open: boolean) => {
    setIsDeleteAlertOpen(open);
    if (!open) {
      setTimeout(() => {
        setActiveTestimonial(null);
      }, 300);
    }
  };

  // 4. Data Mutations
  const onFormSubmit = async (values: z.infer<typeof testimonialSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      if (activeTestimonial) {
        await updateDoc(doc(firestore, "testimonials", activeTestimonial.id), values);
        toast({ title: "Updated", description: "Testimonial changed successfully." });
      } else {
        await addDoc(collection(firestore, "testimonials"), {
          ...values,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Added", description: "New testimonial added." });
      }
      handleCloseForm(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!firestore || !activeTestimonial) return;
    try {
      await deleteDoc(doc(firestore, "testimonials", activeTestimonial.id));
      toast({ title: "Deleted", description: "Testimonial removed from database." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message });
    } finally {
      handleCloseDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Testimonials</CardTitle>
            <CardDescription>Manage user stories shown on the landing page.</CardDescription>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : !testimonials || testimonials.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No testimonials yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Testimonial Text</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testimonials.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="w-[200px]">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.title}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                      {item.text}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDelete(item)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{activeTestimonial ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription>
              Enter the user's details and their experience with Prepezia.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...form.register("name")} placeholder="e.g., Ama Serwaa" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Role / Subtitle</Label>
              <Input id="title" {...form.register("title")} placeholder="e.g., WASSCE Candidate" />
              {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="text">Message</Label>
              <Textarea id="text" {...form.register("text")} rows={5} placeholder="What did they say?" />
              {form.formState.errors.text && <p className="text-xs text-destructive">{form.formState.errors.text.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleCloseForm(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={handleCloseDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the testimonial from {activeTestimonial?.name}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
