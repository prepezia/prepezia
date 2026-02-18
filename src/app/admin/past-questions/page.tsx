"use client";

import { useState, useMemo, useEffect } from "react";
import { useCollection, useFirestore, useStorage, useUser } from "@/firebase";
import { collection, addDoc, updateDoc, serverTimestamp, deleteDoc, doc, type DocumentData, type CollectionReference, query, orderBy } from "firebase/firestore";
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
import { MoreHorizontal, Plus, Trash2, Edit, Loader2, FileText, Search, Filter, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { universities as staticUnis } from "@/lib/ghana-universities";

interface PastQuestion extends DocumentData {
    id: string;
    level: string;
    subject: string;
    courseCode?: string;
    year: string;
    fileName: string;
    university?: string;
    schoolFaculty?: string;
    durationMinutes?: number;
    storagePath: string;
    fileUrl: string;
}

export default function AdminPastQuestionsPage() {
    const firestore = useFirestore();
    const storage = useStorage();
    const { user } = useUser();
    const { toast } = useToast();

    // Data fetching
    const questionsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'past_questions'), orderBy('uploadedAt', 'desc')) as CollectionReference<PastQuestion>;
    }, [firestore]);

    const { data: questions, loading } = useCollection<PastQuestion>(questionsQuery);

    const { data: customUnis } = useCollection<{id: string, name: string}>(
        useMemo(() => firestore ? collection(firestore, 'custom_universities') as any : null, [firestore])
    );

    // Dialog & UI state
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isUniManagementOpen, setIsUniManagementOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<PastQuestion | null>(null);
    const [editingQuestion, setEditingQuestion] = useState<PastQuestion | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Filtering state
    const [searchTerm, setSearchTerm] = useState("");
    const [filterLevel, setFilterLevel] = useState("All");
    const [filterUni, setFilterUniversity] = useState("All");
    const [filterYear, setFilterYear] = useState("All");

    // Form state
    const [level, setLevel] = useState("");
    const [university, setUniversity] = useState("");
    const [schoolFaculty, setSchoolFaculty] = useState("");
    const [courseCode, setCourseCode] = useState("");
    const [course, setCourse] = useState("");
    const [year, setYear] = useState("");
    const [duration, setDuration] = useState("20");
    const [file, setFile] = useState<File | null>(null);

    const [newUniName, setNewUniName] = useState("");

    // Merged university list
    const allUniversities = useMemo(() => {
        const customNames = customUnis?.map(u => u.name) || [];
        return Array.from(new Set([...staticUnis, ...customNames])).sort();
    }, [customUnis]);

    // Suggestions from existing data
    const suggestedFaculties = useMemo(() => Array.from(new Set(questions?.map(q => q.schoolFaculty).filter(Boolean))), [questions]);
    const suggestedCourseCodes = useMemo(() => Array.from(new Set(questions?.map(q => q.courseCode).filter(Boolean))), [questions]);
    const suggestedSubjects = useMemo(() => Array.from(new Set(questions?.map(q => q.subject).filter(Boolean))), [questions]);
    const suggestedYears = useMemo(() => Array.from(new Set(questions?.map(q => q.year).filter(Boolean))), [questions]);

    const uniOptions = useMemo(() => ["All", ...allUniversities], [allUniversities]);
    const yearOptions = useMemo(() => ["All", ...Array.from(new Set(questions?.map(q => q.year).filter(Boolean)))], [questions]);

    const filteredQuestions = useMemo(() => {
        if (!questions) return [];
        return questions.filter(q => {
            const matchesSearch = q.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                q.courseCode?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLevel = filterLevel === "All" || q.level === filterLevel;
            const matchesUni = filterUni === "All" || q.university === filterUni;
            const matchesYear = filterYear === "All" || q.year === filterYear;
            return matchesSearch && matchesLevel && matchesUni && matchesYear;
        });
    }, [questions, searchTerm, filterLevel, filterUni, filterYear]);

    const resetForm = () => {
        setLevel("");
        setUniversity("");
        setSchoolFaculty("");
        setCourseCode("");
        setCourse("");
        setYear("");
        setDuration("20");
        setFile(null);
        setEditingQuestion(null);
    }

    const handleEditQuestion = (q: PastQuestion) => {
        setEditingQuestion(q);
        setLevel(q.level);
        setUniversity(q.university || "");
        setSchoolFaculty(q.schoolFaculty || "");
        setCourseCode(q.courseCode || "");
        setCourse(q.subject);
        setYear(q.year);
        setDuration(q.durationMinutes?.toString() || "20");
        setIsUploadDialogOpen(true);
    };

    const handleAddUniversity = async () => {
        if (!newUniName.trim() || !firestore) return;
        try {
            await addDoc(collection(firestore, 'custom_universities'), {
                name: newUniName.trim(),
                addedAt: serverTimestamp()
            });
            setNewUniName("");
            toast({ title: "University Added" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Failed", description: e.message });
        }
    };

    const handleDeleteUniversity = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'custom_universities', id));
            toast({ title: "University Removed" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Failed", description: e.message });
        }
    };

    const handleSave = async () => {
        if (!editingQuestion && !file) {
            toast({ variant: 'destructive', title: "Missing File", description: "Please select a file to upload."});
            return;
        }
        if (!level || !course || !year) {
            toast({ variant: 'destructive', title: "Missing fields", description: "Please fill out all required fields."});
            return;
        }
        if (!firestore || !user) return;

        setIsSubmitting(true);
        try {
            let finalFileUrl = editingQuestion?.fileUrl || "";
            let finalStoragePath = editingQuestion?.storagePath || "";

            if (file && storage) {
                if (editingQuestion?.storagePath) {
                    try { await deleteObject(ref(storage, editingQuestion.storagePath)); } catch (e) {}
                }
                const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                finalStoragePath = `past_questions/${Date.now()}_${cleanName}`;
                const storageReference = ref(storage, finalStoragePath);
                const snapshot = await uploadBytes(storageReference, file);
                finalFileUrl = await getDownloadURL(snapshot.ref);
            }

            const data = {
                level,
                university: level === 'University' ? university : "",
                schoolFaculty: level === 'University' ? schoolFaculty : "",
                courseCode: courseCode || "",
                subject: course,
                year,
                durationMinutes: parseInt(duration) || 20,
                fileName: file ? file.name : editingQuestion!.fileName,
                fileUrl: finalFileUrl,
                storagePath: finalStoragePath,
                updatedAt: serverTimestamp(),
                ...(editingQuestion ? {} : { uploadedAt: serverTimestamp() })
            };

            if (editingQuestion) {
                await updateDoc(doc(firestore, "past_questions", editingQuestion.id), data);
                toast({ title: "Updated Successfully" });
            } else {
                await addDoc(collection(firestore, "past_questions"), data);
                toast({ title: "Upload Successful" });
            }

            handleUploadDialogChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Failed", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!questionToDelete || !storage || !firestore) return;
        try {
            try { await deleteObject(ref(storage, questionToDelete.storagePath)); } catch (e) {}
            await deleteDoc(doc(firestore, "past_questions", questionToDelete.id));
            toast({ title: "Deleted" });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Failed', description: error.message });
        } finally {
            setIsDeleteDialogOpen(false);
            setQuestionToDelete(null);
        }
    }

    const handleUploadDialogChange = (open: boolean) => {
        setIsUploadDialogOpen(open);
        if (!open) setTimeout(resetForm, 300);
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Past Questions</h1>
                    <p className="text-muted-foreground">Manage the repository of examination papers.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsUniManagementOpen(true)}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Universities
                    </Button>
                    <Button onClick={() => setIsUploadDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Upload Question
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search subject..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <Select value={filterLevel} onValueChange={setFilterLevel}>
                            <SelectTrigger><Filter className="mr-2 h-4 w-4 opacity-50" /><SelectValue placeholder="Level" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Levels</SelectItem>
                                <SelectItem value="BECE">BECE</SelectItem>
                                <SelectItem value="WASSCE">WASSCE</SelectItem>
                                <SelectItem value="University">University</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterUni} onValueChange={setFilterUniversity}>
                            <SelectTrigger><SelectValue placeholder="University" /></SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {uniOptions.map(uni => <SelectItem key={uni} value={uni}>{uni}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterYear} onValueChange={setFilterYear}>
                            <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                            <SelectContent>
                                {yearOptions.map(yr => <SelectItem key={yr} value={yr}>{yr}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
                    ) : filteredQuestions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No matching papers found.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Year</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>File</TableHead>
                                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredQuestions.map((q) => (
                                    <TableRow key={q.id}>
                                        <TableCell>
                                            <div className="font-medium">
                                                {q.courseCode && <span className="text-primary mr-2">[{q.courseCode}]</span>}
                                                {q.subject}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {q.level}{q.university && ` • ${q.university}`}{q.schoolFaculty && ` • ${q.schoolFaculty}`}
                                            </div>
                                        </TableCell>
                                        <TableCell>{q.year}</TableCell>
                                        <TableCell>{q.durationMinutes || 20}m</TableCell>
                                        <TableCell className="text-muted-foreground truncate max-w-[150px]">{q.fileName}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleEditQuestion(q)}><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { setQuestionToDelete(q); setIsDeleteDialogOpen(true); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
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

            {/* Upload/Edit Dialog */}
            <Dialog open={isUploadDialogOpen} onOpenChange={handleUploadDialogChange}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>{editingQuestion ? "Edit Paper" : "Upload Paper"}</DialogTitle>
                        <DialogDescription>Fill in the details for the examination paper.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Level *</Label>
                                <Select value={level} onValueChange={setLevel}>
                                    <SelectTrigger><SelectValue placeholder="Select level..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BECE">BECE</SelectItem>
                                        <SelectItem value="WASSCE">WASSCE</SelectItem>
                                        <SelectItem value="University">University</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Duration (mins) *</Label>
                                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
                            </div>
                        </div>

                        {level === 'University' && (
                             <div className="space-y-2">
                                <Label>University *</Label>
                                <Select value={university} onValueChange={setUniversity}>
                                    <SelectTrigger><SelectValue placeholder="Select institution..." /></SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {allUniversities.map(uni => <SelectItem key={uni} value={uni}>{uni}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Course Code</Label>
                                <Input value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="e.g., ECON 401" list="codes-list" />
                                <datalist id="codes-list">{suggestedCourseCodes.map(c => <option key={c as string} value={c as string} />)}</datalist>
                            </div>
                            <div className="space-y-2">
                                <Label>Year *</Label>
                                <Input value={year} onChange={e => setYear(e.target.value)} placeholder="e.g., 2023" list="years-list" />
                                <datalist id="years-list">{suggestedYears.map(y => <option key={y as string} value={y as string} />)}</datalist>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Subject Title *</Label>
                            <Input value={course} onChange={e => setCourse(e.target.value)} placeholder="e.g., Microeconomics" list="subjects-list" />
                            <datalist id="subjects-list">{suggestedSubjects.map(s => <option key={s as string} value={s as string} />)}</datalist>
                        </div>

                         <div className="space-y-2">
                            <Label>{editingQuestion ? "Replace File (optional)" : "File * (PDF, Word, Image)"}</Label>
                            <Input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} accept=".pdf,.doc,.docx,image/*" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => handleUploadDialogChange(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* University Management Dialog */}
            <Dialog open={isUniManagementOpen} onOpenChange={setIsUniManagementOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Institutions</DialogTitle>
                        <DialogDescription>Add custom universities to the system list.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                            <Input placeholder="Institution Name" value={newUniName} onChange={e => setNewUniName(e.target.value)} />
                            <Button onClick={handleAddUniversity} disabled={!newUniName.trim()}><Plus className="h-4 w-4"/></Button>
                        </div>
                        <div className="h-px bg-border w-full my-2" />
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                            {customUnis?.map(uni => (
                                <div key={uni.id} className="flex justify-between items-center p-2 rounded bg-secondary/50">
                                    <span className="text-sm font-medium">{uni.name}</span>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteUniversity(uni.id)} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            ))}
                            {(!customUnis || customUnis.length === 0) && <p className="text-center text-xs text-muted-foreground py-4">No custom universities added yet.</p>}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete Paper?</AlertDialogTitle><AlertDialogDescription>This will permanently remove the paper from the repository.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setQuestionToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
