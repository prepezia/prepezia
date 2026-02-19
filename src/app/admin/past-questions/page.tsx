
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useCollection, useFirestore, useStorage } from "@/firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  Timestamp, 
  type DocumentData, 
  type CollectionReference 
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, FileText, Search, GraduationCap, X, Sparkles } from "lucide-react";
import { universities as staticUnis } from "@/lib/ghana-universities";
import { extractTextFromFile } from "@/ai/flows/extract-text-from-file";

interface PastQuestion extends DocumentData {
  id: string;
  level: 'BECE' | 'WASSCE' | 'University';
  subject: string;
  courseCode?: string;
  year: string;
  university?: string;
  schoolFaculty?: string;
  durationMinutes?: number;
  totalQuestions?: number;
  fileName: string;
  fileUrl: string;
  storagePath: string;
  extractedText?: string;
  uploadedAt: Timestamp;
}

interface CustomUniversity extends DocumentData {
  id: string;
  name: string;
}

export default function AdminPastQuestionsPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  // --- DATA FETCHING ---
  const questionsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "past_questions"), orderBy("uploadedAt", "desc")) as CollectionReference<PastQuestion>;
  }, [firestore]);

  const unisQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, "custom_universities") as CollectionReference<CustomUniversity>;
  }, [firestore]);

  const { data: questions, loading } = useCollection<PastQuestion>(questionsQuery);
  const { data: customUnis } = useCollection<CustomUniversity>(unisQuery);

  // --- UI STATES ---
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isManageUnisOpen, setIsManageUnisOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [uniFilter, setUniFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  // --- SELECTION STATES ---
  const [questionToDelete, setQuestionToDelete] = useState<PastQuestion | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<PastQuestion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- FORM STATES ---
  const [formData, setFormData] = useState({
    level: 'WASSCE' as const,
    subject: '',
    courseCode: '',
    year: '',
    university: '',
    schoolFaculty: '',
    durationMinutes: 20,
    totalQuestions: 20,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newUniName, setNewUniName] = useState("");

  // --- DERIVED DATA ---
  const institutions = useMemo(() => {
    const customNames = customUnis?.map(u => u.name) || [];
    return Array.from(new Set([...staticUnis, ...customNames])).sort();
  }, [customUnis]);

  const years = useMemo(() => {
    if (!questions) return [];
    return Array.from(new Set(questions.map(q => q.year))).sort((a, b) => b.localeCompare(a));
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => {
      const matchesSearch = q.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           q.courseCode?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = levelFilter === 'all' || q.level === levelFilter;
      const matchesUni = uniFilter === 'all' || q.university === uniFilter;
      const matchesYear = yearFilter === 'all' || q.year === yearFilter;
      return matchesSearch && matchesLevel && matchesUni && matchesYear;
    });
  }, [questions, searchQuery, levelFilter, uniFilter, yearFilter]);

  // --- HANDLERS ---

  const handleUploadDialogChange = (open: boolean) => {
    setIsUploadOpen(open);
    if (!open) {
      setTimeout(() => {
        setEditingQuestion(null);
        setSelectedFile(null);
        setFormData({
          level: 'WASSCE',
          subject: '',
          courseCode: '',
          year: '',
          university: '',
          schoolFaculty: '',
          durationMinutes: 20,
          totalQuestions: 20,
        });
      }, 300);
    }
  };

  const handleEdit = (q: PastQuestion) => {
    setEditingQuestion(q);
    setFormData({
      level: q.level,
      subject: q.subject,
      courseCode: q.courseCode || '',
      year: q.year,
      university: q.university || '',
      schoolFaculty: q.schoolFaculty || '',
      durationMinutes: q.durationMinutes || 20,
      totalQuestions: q.totalQuestions || 20,
    });
    setIsUploadOpen(true);
  };

  const handleSave = async () => {
    if (!firestore || !storage) return;
    if (!formData.subject || !formData.year || !formData.level) {
      toast({ variant: 'destructive', title: "Missing fields", description: "Subject, Year, and Level are required." });
      return;
    }
    if (!editingQuestion && !selectedFile) {
      toast({ variant: 'destructive', title: "File required", description: "Please select a file to upload." });
      return;
    }

    setIsSubmitting(true);
    try {
      let fileUrl = editingQuestion?.fileUrl || "";
      let storagePath = editingQuestion?.storagePath || "";
      let extractedText = editingQuestion?.extractedText || "";

      if (selectedFile) {
        // Upload new file
        const path = `past_questions/${Date.now()}_${selectedFile.name}`;
        const fileRef = ref(storage, path);
        const snapshot = await uploadBytes(fileRef, selectedFile);
        fileUrl = await getDownloadURL(snapshot.ref);
        storagePath = path;

        // Attempt AI Extraction
        toast({ title: "AI Extraction", description: "Reading document content for study hub..." });
        try {
          const dataUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
          });
          const ocr = await extractTextFromFile({ fileDataUri: dataUri, fileContentType: selectedFile.type });
          extractedText = ocr.extractedText;
        } catch (ocrErr) {
          console.warn("OCR Failed, continuing without text:", ocrErr);
        }
      }

      const questionData = {
        ...formData,
        fileUrl,
        storagePath,
        extractedText,
        fileName: selectedFile?.name || editingQuestion?.fileName || "",
        uploadedAt: editingQuestion?.uploadedAt || Timestamp.now(),
      };

      if (editingQuestion) {
        await updateDoc(doc(firestore, "past_questions", editingQuestion.id), questionData);
        toast({ title: "Updated Successfully" });
      } else {
        await addDoc(collection(firestore, "past_questions"), questionData);
        toast({ title: "Uploaded Successfully" });
      }

      handleUploadDialogChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Save Failed", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setTimeout(() => {
        if (!isDeleting) {
          setQuestionToDelete(null);
        }
      }, 300);
    }
  };

  const handleDelete = async () => {
    if (!questionToDelete || !storage || !firestore) return;
    
    const docId = questionToDelete.id;
    const storagePath = questionToDelete.storagePath;

    setIsDeleting(true);

    try {
      if (storagePath) {
        await deleteObject(ref(storage, storagePath)).catch(() => {});
      }
      await deleteDoc(doc(firestore, "past_questions", docId));
      
      setIsDeleteDialogOpen(false);
      setQuestionToDelete(null);
      toast({ title: "Deleted Successfully" });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
      setIsDeleteDialogOpen(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddUni = async () => {
    if (!firestore || !newUniName.trim()) return;
    try {
      await addDoc(collection(firestore, "custom_universities"), { name: newUniName.trim() });
      setNewUniName("");
      toast({ title: "Institution Added" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to add", description: error.message });
    }
  };

  const handleDeleteUni = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "custom_universities", id));
      toast({ title: "Institution Removed" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to remove", description: error.message });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Past Questions</h1>
          <p className="text-muted-foreground">Upload and manage exam papers for students.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={() => setIsManageUnisOpen(true)}>
            <GraduationCap className="mr-2 h-4 w-4" /> Manage Institutions
          </Button>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Upload New
          </Button>
        </div>
      </div>

      {/* --- STATISTICS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Papers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{questions?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">BECE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{questions?.filter(q => q.level === 'BECE').length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">WASSCE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{questions?.filter(q => q.level === 'WASSCE').length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">University</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{questions?.filter(q => q.level === 'University').length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* --- FILTERS --- */}
      <Card>
        <CardContent className="p-4 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by subject or code..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="BECE">BECE</SelectItem>
                <SelectItem value="WASSCE">WASSCE</SelectItem>
                <SelectItem value="University">University</SelectItem>
              </SelectContent>
            </Select>
            <Select value={uniFilter} onValueChange={setUniFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Institution" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Institutions</SelectItem>
                {institutions.map(uni => <SelectItem key={uni} value={uni}>{uni}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
            {(searchQuery || levelFilter !== 'all' || uniFilter !== 'all' || yearFilter !== 'all') && (
              <Button variant="ghost" size="icon" onClick={() => { setSearchQuery(""); setLevelFilter("all"); setUniFilter("all"); setYearFilter("all"); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* --- TABLE --- */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No questions found matching your criteria.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Subject / Code</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Specs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Badge variant={q.level === 'University' ? 'outline' : 'secondary'}>{q.level}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{q.subject}</div>
                      {q.courseCode && <div className="text-xs text-muted-foreground">{q.courseCode}</div>}
                    </TableCell>
                    <TableCell className="font-semibold">{q.year}</TableCell>
                    <TableCell className="text-sm truncate max-w-[150px]" title={q.university || "N/A"}>
                      {q.university || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 text-[10px] text-muted-foreground">
                        <span className="bg-secondary px-1 rounded">{q.totalQuestions || 0} Qs</span>
                        <span className="bg-secondary px-1 rounded">{q.durationMinutes || 0} min</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(q)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setQuestionToDelete(q); setIsDeleteDialogOpen(true); }} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* --- UPLOAD / EDIT DIALOG --- */}
      <Dialog open={isUploadOpen} onOpenChange={handleUploadDialogChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Past Question" : "Upload New Question"}</DialogTitle>
            <DialogDescription>Enter the details of the exam paper. Students can practice with this paper in the hub.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Exam Level</Label>
                <Select value={formData.level} onValueChange={(v: any) => setFormData({...formData, level: v})}>
                  <SelectTrigger id="level"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BECE">BECE</SelectItem>
                    <SelectItem value="WASSCE">WASSCE</SelectItem>
                    <SelectItem value="University">University</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Exam Year</Label>
                <Input id="year" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} placeholder="e.g. 2023" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject Title</Label>
              <Input id="subject" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="e.g. Microeconomics" />
            </div>

            {formData.level === 'University' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="university">Institution</Label>
                    <Select value={formData.university} onValueChange={v => setFormData({...formData, university: v})}>
                      <SelectTrigger id="university"><SelectValue placeholder="Select institution" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {institutions.map(uni => <SelectItem key={uni} value={uni}>{uni}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="courseCode">Course Code</Label>
                    <Input id="courseCode" value={formData.courseCode} onChange={e => setFormData({...formData, courseCode: e.target.value})} placeholder="e.g. ECON 401" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolFaculty">School / Faculty</Label>
                  <Input id="schoolFaculty" value={formData.schoolFaculty} onChange={e => setFormData({...formData, schoolFaculty: e.target.value})} placeholder="e.g. School of Business" />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Minutes)</Label>
                <Input id="duration" type="number" value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalQs">Total Questions</Label>
                <Input id="totalQs" type="number" value={formData.totalQuestions} onChange={e => setFormData({...formData, totalQuestions: parseInt(e.target.value) || 0})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Question File (PDF or Image)</Label>
              <div className="flex items-center gap-2">
                <Input id="file" type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="flex-1" accept="application/pdf,image/*" />
                {editingQuestion && <Badge variant="outline" className="h-10">Current File Kept</Badge>}
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI will automatically extract text for Trial Mode hints.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleUploadDialogChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingQuestion ? "Update Paper" : "Upload Paper"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DELETE ALERT --- */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{questionToDelete?.subject} ({questionToDelete?.year})" and remove the file from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- MANAGE UNIS DIALOG --- */}
      <Dialog open={isManageUnisOpen} onOpenChange={setIsManageUnisOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Institutions</DialogTitle>
            <DialogDescription>Add or remove custom universities from the system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input placeholder="Institution Name" value={newUniName} onChange={e => setNewUniName(e.target.value)} />
              <Button onClick={handleAddUni} size="icon"><Plus className="h-4 w-4"/></Button>
            </div>
            <Separator />
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground px-1">Custom Additions</h4>
              {!customUnis || customUnis.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-4 italic">No custom institutions added.</p>
              ) : (
                customUnis.map(uni => (
                  <div key={uni.id} className="flex items-center justify-between p-2 rounded bg-secondary/50 text-sm">
                    {uni.name}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteUni(uni.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
