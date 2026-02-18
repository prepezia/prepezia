
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, query, orderBy, Timestamp, type DocumentData, type CollectionReference } from "firebase/firestore";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, Trash2, FileText, ExternalLink } from "lucide-react";

interface FeedbackItem extends DocumentData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  description: string;
  status: 'New' | 'In Progress' | 'Done';
  adminAction?: string;
  createdAt: Timestamp;
  fileUrl?: string;
}

export default function AdminFeedbackPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const feedbackQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "feedback"), orderBy("createdAt", "desc")) as CollectionReference<FeedbackItem>;
  }, [firestore]);

  const { data: feedbackItems, loading } = useCollection<FeedbackItem>(feedbackQuery);

  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form state for details dialog
  const [status, setStatus] = useState<string>("");
  const [actionPlan, setActionPlan] = useState<string>("");

  const handleOpenDetails = (item: FeedbackItem) => {
    setSelectedFeedback(item);
    setStatus(item.status || "New");
    setActionPlan(item.adminAction || "");
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    // Safe-close pattern: clear data only after animation
    setTimeout(() => {
      setSelectedFeedback(null);
    }, 300);
  };

  const handleUpdateFeedback = async () => {
    if (!firestore || !selectedFeedback) return;

    setIsUpdating(true);
    try {
      const docRef = doc(firestore, "feedback", selectedFeedback.id);
      await updateDoc(docRef, {
        status: status,
        adminAction: actionPlan,
      });
      toast({ title: "Feedback Updated", description: "Status and action plan have been saved." });
      handleCloseDetails();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "feedback", id));
      toast({ title: "Feedback Deleted" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: err.message });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "New": return <Badge variant="secondary">New</Badge>;
      case "In Progress": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Progress</Badge>;
      case "Done": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Done</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Feedback</CardTitle>
          <CardDescription>Manage bug reports and suggestions from your users.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !feedbackItems || feedbackItems.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No feedback received yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbackItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.userName}</div>
                      <div className="text-xs text-muted-foreground">{item.userEmail}</div>
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.createdAt ? format(item.createdAt.toDate(), "MMM d, yyyy") : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDetails(item)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteFeedback(item.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={(open) => !open && handleCloseDetails()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>Review user feedback and assign an action plan.</DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">{selectedFeedback.userName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedFeedback.userEmail}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Subject</p>
                <p className="font-semibold text-base">{selectedFeedback.title}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <div className="mt-1 p-3 bg-secondary rounded-md text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedFeedback.description}
                </div>
              </div>

              {selectedFeedback.fileUrl && (
                <div>
                  <p className="text-sm text-muted-foreground">Attachment</p>
                  <Button variant="outline" size="sm" className="mt-1" asChild>
                    <a href={selectedFeedback.fileUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-2 h-4 w-4" />
                      View Attachment
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Action Plan</label>
                  <Textarea 
                    placeholder="Describe the steps taken or to be taken..." 
                    value={actionPlan} 
                    onChange={(e) => setActionPlan(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDetails}>Close</Button>
            <Button onClick={handleUpdateFeedback} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
