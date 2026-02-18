
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useStorage, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, deleteDoc, doc, DocumentData } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { universities } from "@/lib/ghana-universities";

interface PastQuestion extends DocumentData {
    id: string;
    level: string;
    subject: string;
    year: string;
    fileName: string;
    university?: string;
    schoolFaculty?: string;
    storagePath: string;
}

export default function AdminPastQuestionsPage() {
    const firestore = useFirestore();
    const storage = useStorage();
    const { user } = useUser();
    const { toast } = useToast();

    const questionsRef = useMemo(() => firestore ? collection(firestore, 'past_questions') : null, [firestore]);
    const { data: questions, loading } = useCollection<PastQuestion>(questionsRef);

    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<PastQuestion | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [level, setLevel] = useState("");
    const [university, setUniversity] = useState("");
    const [schoolFaculty, setSchoolFaculty] = useState("");
    const [course, setCourse] = useState("");
    const [year, setYear] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const resetForm = () => {
        setLevel("");
        setUniversity("");
        setSchoolFaculty("");
        setCourse("");
        setYear("");
        setFile(null);
    }

    const handleUpload = async () => {
        if (!file || !level || !course || !year) {
            toast({ variant: 'destructive', title: "Missing fields", description: "Please fill out all required fields and select a file."});
            return;
        }
        if (level === 'University' && !university) {
            toast({ variant: 'destructive', title: "Missing University", description: "Please select a university."});
            return;
        }
        if (!storage || !firestore || !user) {
            toast({ variant: 'destructive', title: "Initialization Error", description: "Could not connect to Firebase services." });
            return;
        }

        setIsSubmitting(true);
        try {
            const storagePath = `past_questions/${file.name}_${Date.now()}`;
            const storageRef = ref(storage, storagePath);

            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            await addDoc(collection(firestore, "past_questions"), {
                level,
                university: level === 'University' ? university : "",
                schoolFaculty: level === 'University' ? schoolFaculty : "",
                subject: course,
                year,
                fileName: file.name,
                fileUrl: downloadUrl,
                storagePath: storagePath,
                uploadedAt: serverTimestamp()
            });

            toast({ title: "Upload Successful", description: `${file.name} has been added.`});
            resetForm();
            setIsUploadDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Upload Failed", description: error.message || "An error occurred during file upload." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openDeleteDialog = (question: PastQuestion) => {
        setQuestionToDelete(question);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!questionToDelete || !storage || !firestore) {
            toast({ variant: 'destructive', title: "Error", description: "Could not perform deletion." });
            return;
        }

        try {
            // Delete file from storage
            const fileRef = ref(storage, questionToDelete.storagePath);
            await deleteObject(fileRef);

            // Delete document from Firestore
            await deleteDoc(doc(firestore, "past_questions", questionToDelete.id));
            
            toast({ title: "Deleted", description: `${questionToDelete.fileName} has been deleted.` });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message || "Could not delete the question." });
        } finally {
            handleDeleteConfirmChange(false);
        }
    }

    const handleUploadDialogChange = (open: boolean) => {
        setIsUploadDialogOpen(open);
        if (!open) {
            resetForm();
        }
    };

    const handleDeleteConfirmChange = (open: boolean) => {
        setIsDeleteDialogOpen(open);
        if (!open) {
            setQuestionToDelete(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Past Questions</CardTitle>
                        <CardDescription>Upload and manage past questions for all exam bodies.</CardDescription>
                    </div>
                    <Button onClick={() => setIsUploadDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Upload Question
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Year</TableHead>
                                    <TableHead>File Name</TableHead>
                                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {questions?.map((q) => (
                                    <TableRow key={q.id}>
                                        <TableCell>
                                            <div className="font-medium">{q.subject}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {q.level}
                                                {q.university && ` • ${q.university}`}
                                                {q.schoolFaculty && ` • ${q.schoolFaculty}`}
                                            </div>
                                        </TableCell>
                                        <TableCell>{q.year}</TableCell>
                                        <TableCell className="text-muted-foreground">{q.fileName}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem disabled><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openDeleteDialog(q)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
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

            <Dialog open={isUploadDialogOpen} onOpenChange={handleUploadDialogChange}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Upload New Past Question</DialogTitle>
                        <DialogDescription>Fill in the details for the exam paper you are uploading.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="level">Level *</Label>
                            <Select value={level} onValueChange={(value) => { setLevel(value); setUniversity(""); }}>
                                <SelectTrigger id="level"><SelectValue placeholder="Select an exam level..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BECE">BECE</SelectItem>
                                    <SelectItem value="WASSCE">WASSCE</SelectItem>
                                    <SelectItem value="University">University</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {level === 'University' && (
                             <div className="space-y-2">
                                <Label htmlFor="university">University *</Label>
                                <Select value={university} onValueChange={setUniversity}>
                                    <SelectTrigger id="university"><SelectValue placeholder="Select a university..." /></SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {universities.map(uni => <SelectItem key={uni} value={uni}>{uni}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {level === 'University' && (
                            <div className="space-y-2">
                                <Label htmlFor="schoolFaculty">School / Faculty (optional)</Label>
                                <Input id="schoolFaculty" value={schoolFaculty} onChange={(e) => setSchoolFaculty(e.target.value)} placeholder="e.g., Business School, Medical School" />
                                <p className="text-xs text-muted-foreground">If the school/faculty doesn't exist, it will be created.</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="course">Course / Subject *</Label>
                            <Input id="course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g., Core Mathematics" />
                             <p className="text-xs text-muted-foreground">If the course doesn't exist, it will be created.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year">Year *</Label>
                            <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g., 2023 or 2024 Mid-Sem" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="file">Exam File *</Label>
                            <Input id="file" type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} accept=".pdf,.doc,.docx,image/*" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => handleUploadDialogChange(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Upload
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteConfirmChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{questionToDelete?.fileName}" from the database and storage.
                        </AlertDialogDescription>
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
