
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp, type DocumentData, type CollectionReference, query, orderBy } from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";

interface Testimonial extends DocumentData {
  id: string;
  name: string;
  title: string;
  text: string;
  createdAt: Timestamp;
}

export default function AdminTestimonialsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const testimonialsRef = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "testimonials"), orderBy("createdAt", "desc")) as any;
  }, [firestore]);

  const { data: testimonials, loading, error } = useCollection<Testimonial>(testimonialsRef);

  const [isDialogOpen, setIsDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Testimonial | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  const handleOpenDialog = (item?: Testimonial) => {
    if (item) {
      setSelectedItem(item);
      setName(item.name);
      setTitle(item.title);
      setText(item.text);
    } else {
      setSelectedItem(null);
      setName("");
      setTitle("");
      setText("");
    }
    setIsDetailsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDetailsOpen(false);
    // Safe-close pattern to prevent UI freeze
    setTimeout(() => {
      setSelectedItem(null);
      setName("");
      setTitle("");
      setText("");
    }, 300);
  };

  const handleSave = async () => {
    if (!firestore) return;
    if (!name || !title || !text) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in all fields." });
      return;
    }

    setIsSaving(true);
    try {
      if (selectedItem) {
        await updateDoc(doc(firestore, "testimonials", selectedItem.id), {
          name, title, text
        });
        toast({ title: "Testimonial Updated" });
      } else {
        await addDoc(collection(firestore, "testimonials"), {
          name, title, text, createdAt: new Date()
        });
        toast({ title: "Testimonial Added" });
      }
      handleCloseDialog();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save Failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "testimonials", id));
      toast({ title: "Testimonial Deleted" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Testimonials</CardTitle>
            <CardDescription>Manage user reviews displayed on the landing page.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}><Plus className="mr-2 h-4 w-4" /> Add New</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !testimonials || testimonials.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No testimonials found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Text</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testimonials.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.title}</TableCell>
                    <TableCell className="max-w-md truncate">{t.text}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(t)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription>Fill in the details for the user testimonial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title/Role</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. WASSCE Candidate" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Testimonial Text</label>
              <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write the testimonial here..." rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedItem ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
