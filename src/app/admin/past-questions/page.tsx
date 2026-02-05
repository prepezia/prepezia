"use client";

import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { universities } from "@/lib/ghana-universities";

// Mock data for existing questions
const mockQuestions = [
    { id: 1, level: "WASSCE", subject: "Core Mathematics", year: "2023", fileName: "wassce_math_2023.pdf" },
    { id: 2, level: "BECE", subject: "Integrated Science", year: "2022", fileName: "bece_science_2022.pdf" },
    { id: 3, level: "University", school: "University of Ghana", subject: "ECON 101", year: "2023 Mid-Sem", fileName: "ug_econ101_midsem.pdf"},
    { id: 4, level: "WASSCE", subject: "Social Studies", year: "2023", fileName: "wassce_social_studies_2023.pdf" },
];

export default function AdminPastQuestionsPage() {
    const [questions, setQuestions] = useState(mockQuestions);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    
    // Form state
    const [level, setLevel] = useState("");
    const [university, setUniversity] = useState("");
    const [course, setCourse] = useState("");
    const [year, setYear] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const { toast } = useToast();

    const resetForm = () => {
        setLevel("");
        setUniversity("");
        setCourse("");
        setYear("");
        setFile(null);
    }

    const handleUpload = () => {
        // Form validation
        if (!level || !course || !year || !file) {
            toast({ variant: 'destructive', title: "Missing fields", description: "Please fill out all required fields and select a file."});
            return;
        }
        if (level === 'University' && !university) {
            toast({ variant: 'destructive', title: "Missing University", description: "Please select a university."});
            return;
        }

        // Create new question object
        const newQuestion = {
            id: Date.now(),
            level,
            school: university,
            subject: course,
            year,
            fileName: file.name
        };

        // In a real app, you would upload the file to storage here.
        // For now, we just add it to our mock data state.
        setQuestions(prev => [newQuestion, ...prev]);

        toast({ title: "Upload Successful", description: `${file.name} has been uploaded.`});
        resetForm();
        setIsUploadDialogOpen(false);
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Level</TableHead>
                                <TableHead>Subject / Course</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>File Name</TableHead>
                                <TableHead className="w-[50px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {questions.map((q) => (
                                <TableRow key={q.id}>
                                    <TableCell className="font-medium">{q.level}{q.school && ` (${q.school})`}</TableCell>
                                    <TableCell>{q.subject}</TableCell>
                                    <TableCell>{q.year}</TableCell>
                                    <TableCell className="text-muted-foreground">{q.fileName}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isUploadDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) resetForm();
                setIsUploadDialogOpen(isOpen);
            }}>
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
                        <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpload}>Upload</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}