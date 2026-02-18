
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useStorage, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, deleteDoc, doc, type DocumentData, type CollectionReference, query, orderBy } from "firebase/firestore";
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
import { MoreHorizontal, Plus, Trash2, Edit, Loader2, FileText, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { universities } from "@/lib/ghana-universities";

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
}

export default function AdminPastQuestionsPage() {
    const firestore = useFirestore();
    const storage = useStorage();
    const { user } = useUser();
    const { toast } = useToast();

    const questionsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'past_questions'), orderBy('uploadedAt', 'desc')) as CollectionReference<PastQuestion>;
    }, [firestore]);

    const { data: questions, loading } = useCollection<PastQuestion>(questionsQuery);

    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<PastQuestion | null>(null);
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

    // Deriving Smart Suggestions from existing data
    const suggestedFaculties = useMemo(() => Array.from(new Set(questions?.map(q => q.schoolFaculty).filter(Boolean))), [questions]);
    const suggestedCourseCodes = useMemo(() => Array.from(new Set(questions?.map(q => q.courseCode).filter(Boolean))), [questions]);
    const suggestedSubjects = useMemo(() => Array.from(new Set(questions?.map(q => q.subject).filter(Boolean))), [questions]);
    const suggestedYears = useMemo(() => Array.from(new Set(questions?.map(q => q.year).filter(Boolean))), [questions]);

    // Unique options for filter selects
    const uniOptions = useMemo(() => ["All", ...Array.from(new Set(questions?.map(q => q.university).filter(Boolean)))], [questions]);
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
            const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `past_questions/${Date.now()}_${cleanName}`;
            const storageReference = ref(storage, storagePath);

            const snapshot = await uploadBytes(storageReference, file);
            const downloadUrl = await getDownloadURL(snapshot.ref);

            await addDoc(collection(firestore, "past_questions"), {
                level,
                university: level === 'University' ? university : "",
                schoolFaculty: level === 'University' ? schoolFaculty : "",
                courseCode: courseCode || "",
                subject: course,
                year,
                durationMinutes: parseInt(duration) || 20,
                fileName: file.name,
                fileUrl: downloadUrl,
                storagePath: storagePath,
                uploadedAt: serverTimestamp()
            });

            toast({ title: "Upload Successful", description: `${file.name} has been added.`});
            handleUploadDialogChange(false);
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: "Upload Failed", 
                description: `Error: ${error.message}.` 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openDeleteDialog = (question: PastQuestion) => {
        setQuestionToDelete(question);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!questionToDelete || !storage || !firestore) return;

        try {
            const fileRef = ref(storage, questionToDelete.storagePath);
            await deleteObject(fileRef);
            await deleteDoc(doc(firestore, "past_questions", questionToDelete.id));
            toast({ title: "Deleted", description: `${questionToDelete.fileName} has been deleted.` });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
        } finally {
            handleDeleteConfirmChange(false);
        }
    }

    const handleUploadDialogChange = (open: boolean) => {
        setIsUploadDialogOpen(open);
        if (!open) setTimeout(resetForm, 150);
    };

    const handleDeleteConfirmChange = (open: boolean) => {
        setIsDeleteDialogOpen(open);
        if (!open) setQuestionToDelete(null);
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Past Questions</h1>
                    <p className="text-muted-foreground">Manage the repository of examination papers.</p>
                </div>
                <Button onClick={() => setIsUploadDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Question
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search subject..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={filterLevel} onValueChange={setFilterLevel}>
                            <SelectTrigger>
                                <Filter className="mr-2 h-4 w-4 opacity-50" />
                                <SelectValue placeholder="Level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Levels</SelectItem>
                                <SelectItem value="BECE">BECE</SelectItem>
                                <SelectItem value="WASSCE">WASSCE</SelectItem>
                                <SelectItem value="University">University</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterUni} onValueChange={setFilterUniversity}>
                            <SelectTrigger>
                                <SelectValue placeholder="University" />
                            </SelectTrigger>
                            <SelectContent>
                                {uniOptions.map(uni => <SelectItem key={uni as string} value={uni as string}>{uni as string}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterYear} onValueChange={setFilterYear}>
                            <SelectTrigger>
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map(yr => <SelectItem key={yr as string} value={yr as string}>{yr as string}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
                    ) : filteredQuestions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No questions found matching your filters.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Year</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>File Name</TableHead>
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
                                            <div className="text-sm text-muted-foreground">
                                                {q.level}
                                                {q.university && ` • ${q.university}`}
                                                {q.schoolFaculty && ` • ${q.schoolFaculty}`}
                                            </div>
                                        </TableCell>
                                        <TableCell>{q.year}</TableCell>
                                        <TableCell>{q.durationMinutes || 20} mins</TableCell>
                                        <TableCell className="text-muted-foreground truncate max-w-[200px]">{q.fileName}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem disabled><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openDeleteDialog(q)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isUploadDialogOpen} onOpenChange={handleUploadDialogChange}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>Upload New Past Question</DialogTitle>
                        <DialogDescription>Fill in the details. Smart suggestions will appear as you type.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="level">Level *</Label>
                                <Select value={level} onValueChange={(value) => { setLevel(value); setUniversity(""); }}>
                                    <SelectTrigger id="level"><SelectValue placeholder="Select level..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BECE">BECE</SelectItem>
                                        <SelectItem value="WASSCE">WASSCE</SelectItem>
                                        <SelectItem value="University">University</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration">Exam Duration (mins) *</Label>
                                <Input id="duration" type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g., 60" />
                            </div>
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
                                <Input 
                                    id="schoolFaculty" 
                                    value={schoolFaculty} 
                                    onChange={(e) => setSchoolFaculty(e.target.value)} 
                                    placeholder="e.g., Business School" 
                                    list="faculties-list"
                                />
                                <datalist id="faculties-list">
                                    {suggestedFaculties.map(f => <option key={f as string} value={f as string} />)}
                                </datalist>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="courseCode">Course Code (e.g. ECON 401)</Label>
                                <Input 
                                    id="courseCode" 
                                    value={courseCode} 
                                    onChange={(e) => setCourseCode(e.target.value)} 
                                    placeholder="e.g., ECON 401" 
                                    list="codes-list"
                                />
                                <datalist id="codes-list">
                                    {suggestedCourseCodes.map(c => <option key={c as string} value={c as string} />)}
                                </datalist>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="year">Year *</Label>
                                <Input 
                                    id="year" 
                                    value={year} 
                                    onChange={(e) => setYear(e.target.value)} 
                                    placeholder="e.g., 2023" 
                                    list="years-list"
                                />
                                <datalist id="years-list">
                                    {suggestedYears.map(y => <option key={y as string} value={y as string} />)}
                                </datalist>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="course">Course / Subject Title *</Label>
                            <Input 
                                id="course" 
                                value={course} 
                                onChange={(e) => setCourse(e.target.value)} 
                                placeholder="e.g., Microeconomics" 
                                list="subjects-list"
                            />
                            <datalist id="subjects-list">
                                {suggestedSubjects.map(s => <option key={s as string} value={s as string} />)}
                            </datalist>
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="file">Exam File * (Word, PDF, Images)</Label>
                            <div className="flex items-center gap-2">
                                <Input id="file" type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} accept=".pdf,.doc,.docx,image/*" className="cursor-pointer" />
                                {file && <FileText className="h-5 w-5 text-primary shrink-0" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground">Supported: PDF, Word, Images.</p>
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
        </div>
    );
}
