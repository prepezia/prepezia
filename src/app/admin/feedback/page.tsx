"use client";

import { useState, useMemo, useEffect } from "react";
import { useFirestore, useCollection } from "@/firebase";
import { 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  query, 
  type DocumentData, 
  type Timestamp 
} from "firebase/firestore";
import { format } from "date-fns";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Trash2, Eye, Loader2, Save, ExternalLink } from "lucide-react";

interface FeedbackItem extends DocumentData {
  id: string;
  title: string;
  description: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: "New" | "In Progress" | "Resolved";
  adminAction?: string;
  fileUrl?: string;
  createdAt: Timestamp;
}

export default function AdminFeedbackPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  // 1. Data Fetching
  const feedbackQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "feedback"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: feedbackItems, loading } = useCollection<FeedbackItem>(feedbackQuery as any);

  // 2. Dialog and Selection State
  // We keep 'isOpen' separate from 'selectedItem' to prevent Radix UI from freezing
  // when the item is cleared while the dialog is still animating.
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // 3. Form State
  const [editStatus, setEditStatus] = useState<FeedbackItem["status"]>("New");
  const [editAction, setEditAction] = useState("");

  // Sync form state when a new item is selected
  useEffect(() => {
    if (selectedFeedback) {
      setEditStatus(selectedFeedback.status || "New");
      setEditAction(selectedFeedback.adminAction || "");
    }
  }, [selectedFeedback]);

  // 4. Action Handlers
  const handleOpenDetails = (item: FeedbackItem) => {
    setSelectedFeedback(item);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = (open: boolean) => {
    setIsDetailsOpen(open);
    // CRITICAL: Delay clearing the data until the animation is likely finished
    if (!open) {
      setTimeout(() => {
        setSelectedFeedback(null);
        setEditAction("");
      }, 300);
    }
  };

  const handleUpdateFeedback = async () => {
    if (!firestore || !selectedFeedback) return;
    setIsUpdating(true);
    try {
      const feedbackDoc = doc(firestore, "feedback", selectedFeedback.id);
      await updateDoc(feedbackDoc, {
        status: editStatus,
        adminAction: editAction,
      });
      toast({ title: "Updated", description: "Feedback status and notes saved." });
      handleCloseDetails(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "feedback", id));
      toast({ title: "Deleted", description: "Feedback report removed." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Feedback</CardTitle>
          <CardDescription>
            Review and manage bug reports and suggestions submitted by users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : !feedbackItems || feedbackItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No feedback reports found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbackItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-xs truncate">{item.title}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span className="font-medium">{item.userName}</span>
                        <span className="text-muted-foreground">{item.userEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.createdAt ? format(new Date(item.createdAt.seconds * 1000), "MMM d, yyyy") : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        item.status === 'New' ? 'default' : 
                        item.status === 'Resolved' ? 'secondary' : 'outline'
                      }>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDetails(item)}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteFeedback(item.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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

      <Dialog open={isDetailsOpen} onOpenChange={handleCloseDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>
              Submitted by {selectedFeedback?.userName} ({selectedFeedback?.userEmail})
            </DialogDescription>
          </DialogHeader>
          
          {selectedFeedback && (
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <h4 className="font-bold text-lg">{selectedFeedback.title}</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/50 p-4 rounded-md border max-h-[200px] overflow-y-auto">
                  {selectedFeedback.description}
                </div>
                {selectedFeedback.fileUrl && (
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={selectedFeedback.fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" /> View Attachment
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="admin-action">Admin Action / Notes</Label>
                  <Textarea 
                    id="admin-action" 
                    placeholder="Enter steps taken or internal notes..." 
                    value={editAction}
                    onChange={(e) => setEditAction(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseDetails(false)}>Cancel</Button>
            <Button onClick={handleUpdateFeedback} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
