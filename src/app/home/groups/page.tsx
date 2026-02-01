
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { Folder, Plus, ArrowLeft, BookOpen, Library, Search, Trash2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge";

// Type definitions
type GroupItem = {
    type: 'note' | 'studyspace';
    id: number;
    name: string;
};

type Group = {
    id: number;
    name: string;
    description: string;
    items: GroupItem[];
};

// Mock types for items to be added
type RecentNote = { id: number; topic: string; level: string };
type StudySpace = { id: number; name: string; description: string; };

function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    useEffect(() => {
        try {
            const savedGroups = localStorage.getItem('learnwithtemi_groups');
            if (savedGroups) {
                setGroups(JSON.parse(savedGroups));
            }
        } catch (error) {
            console.error("Failed to load groups from localStorage", error);
        }
    }, []);

    const saveGroups = (updatedGroups: Group[]) => {
        setGroups(updatedGroups);
        try {
            localStorage.setItem('learnwithtemi_groups', JSON.stringify(updatedGroups));
        } catch (error) {
            console.error("Failed to save groups to localStorage", error);
        }
    };
    
    const handleCreateGroup = (newGroupData: Omit<Group, 'id'>) => {
        const groupWithId = { ...newGroupData, id: Date.now() };
        const updatedGroups = [groupWithId, ...groups];
        saveGroups(updatedGroups);
    };

    const handleUpdateGroup = (updatedGroupData: Group) => {
        const updatedGroups = groups.map(g => g.id === updatedGroupData.id ? updatedGroupData : g);
        saveGroups(updatedGroups);
        if (selectedGroup?.id === updatedGroupData.id) {
            setSelectedGroup(updatedGroupData);
        }
        setEditingGroup(null);
    };

    const handleDeleteGroup = (groupId: number) => {
        const updatedGroups = groups.filter(g => g.id !== groupId);
        saveGroups(updatedGroups);
        if (selectedGroup?.id === groupId) {
            setSelectedGroup(null);
        }
    };
    
    const handleOpenEditor = (group?: Group) => {
        if (group) {
            setEditingGroup(group);
        } else {
            setEditingGroup(null);
        }
        setIsCreateModalOpen(true);
    }
    
    const viewContent = () => {
        if (selectedGroup) {
            return <GroupDetailView group={selectedGroup} onBack={() => setSelectedGroup(null)} onEdit={() => handleOpenEditor(selectedGroup)} onDelete={handleDeleteGroup} />;
        }
        return <GroupListView groups={groups} onSelectGroup={setSelectedGroup} onCreate={() => handleOpenEditor()} onDelete={handleDeleteGroup} />;
    };

    return (
        <>
            <HomeHeader />
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                {viewContent()}
            </div>
            <GroupEditorDialog 
                key={editingGroup ? editingGroup.id : 'create'}
                isOpen={isCreateModalOpen}
                onClose={() => { setIsCreateModalOpen(false); setEditingGroup(null); }}
                onCreate={handleCreateGroup}
                onUpdate={handleUpdateGroup}
                existingGroup={editingGroup}
            />
        </>
    );
}


function GroupListView({ groups, onSelectGroup, onCreate, onDelete }: { groups: Group[], onSelectGroup: (group: Group) => void, onCreate: () => void, onDelete: (groupId: number) => void }) {
    return (
        <div>
            <div className="flex justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Groups</h1>
                    <p className="text-muted-foreground mt-1">Organize your notes and study spaces into logical groups.</p>
                </div>
                <Button onClick={onCreate} className="shrink-0">
                    <Plus className="mr-2 h-4 w-4" /> Create Group
                </Button>
            </div>

            <div className="mt-8">
                {groups.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-12 border-dashed">
                        <Folder className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold text-muted-foreground">No groups yet.</h3>
                        <p className="text-muted-foreground mb-4">Click the button above to create your first one!</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groups.map(group => (
                            <Card key={group.id} className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col" onClick={() => onSelectGroup(group)}>
                                <CardHeader>
                                    <CardTitle className="truncate">{group.name}</CardTitle>
                                    <CardDescription className="line-clamp-2">{group.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm font-bold text-primary">{group.items.length} item{group.items.length !== 1 && 's'}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function GroupDetailView({ group, onBack, onEdit, onDelete }: { group: Group, onBack: () => void, onEdit: () => void, onDelete: (groupId: number) => void }) {
    const router = useRouter();

    const navigateToItem = (item: GroupItem) => {
        if (item.type === 'note') {
            router.push(`/home/note-generator?noteId=${item.id}`);
        } else if (item.type === 'studyspace') {
            router.push(`/home/study-spaces?spaceId=${item.id}`);
        }
    };
    
    return (
        <div>
            <Button variant="outline" onClick={onBack} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Groups
            </Button>
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-headline font-bold">{group.name}</CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <h3 className="font-semibold mb-4">Items in this Group ({group.items.length})</h3>
                    {group.items.length > 0 ? (
                        <ul className="space-y-2">
                            {group.items.map(item => (
                                <li key={`${item.type}-${item.id}`} className="flex items-center text-sm gap-3 p-3 bg-secondary rounded-md cursor-pointer hover:bg-secondary/80" onClick={() => navigateToItem(item)}>
                                    {item.type === 'note' ? <BookOpen className="w-5 h-5 text-primary shrink-0"/> : <Library className="w-5 h-5 text-primary shrink-0"/>}
                                    <span className="flex-1 min-w-0 break-words font-medium">{item.name}</span>
                                    <Badge variant={item.type === 'note' ? 'outline' : 'secondary'} className="shrink-0">
                                        {item.type === 'note' ? 'Note' : 'Study Space'}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No items have been added to this group yet.</p>
                    )}
                </CardContent>
                 <CardFooter className="justify-between">
                    <Button variant="outline" onClick={onEdit}><Edit className="mr-2 h-4 w-4"/>Edit Group</Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Group</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the "{group.name}" group. The notes and study spaces within it will not be deleted.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(group.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    );
}

function GroupEditorDialog({ isOpen, onClose, onCreate, onUpdate, existingGroup }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onCreate: (group: Omit<Group, 'id'>) => void;
    onUpdate: (group: Group) => void;
    existingGroup: Group | null;
}) {
    const isEditMode = !!existingGroup;
    const [step, setStep] = useState(1);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [notes, setNotes] = useState<RecentNote[]>([]);
    const [studySpaces, setStudySpaces] = useState<StudySpace[]>([]);
    const [selectedItems, setSelectedItems] = useState<GroupItem[]>([]);
    const [search, setSearch] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            // Pre-populate for edit mode
            if (existingGroup) {
                setName(existingGroup.name);
                setDescription(existingGroup.description);
                setSelectedItems(existingGroup.items);
            }

            try {
                const savedNotes = localStorage.getItem('learnwithtemi_recent_notes');
                const savedSpaces = localStorage.getItem('learnwithtemi_study_spaces');
                if (savedNotes) setNotes(JSON.parse(savedNotes));
                if (savedSpaces) setStudySpaces(JSON.parse(savedSpaces));
            } catch (e) {
                console.error("Error loading items for group creation", e);
            }
        } else {
            // Reset state on close
            setStep(1);
            setName("");
            setDescription("");
            setSelectedItems([]);
            setSearch("");
        }
    }, [isOpen, existingGroup]);

    const handleNext = () => {
        if (name.trim() === "") {
            toast({ variant: 'destructive', title: 'Group name is required' });
            return;
        }
        setStep(2);
    };

    const handleItemToggle = (item: GroupItem, checked: boolean) => {
        setSelectedItems(prev => {
            if (checked) {
                return [...prev, item];
            } else {
                return prev.filter(i => !(i.id === item.id && i.type === item.type));
            }
        });
    };

    const handleSubmit = () => {
        if (isEditMode && existingGroup) {
            onUpdate({ ...existingGroup, name, description, items: selectedItems });
        } else {
            onCreate({ name, description, items: selectedItems });
        }
        onClose();
    };

    const filteredNotes = useMemo(() => notes.filter(n => n.topic.toLowerCase().includes(search.toLowerCase())), [notes, search]);
    const filteredSpaces = useMemo(() => studySpaces.filter(s => s.name.toLowerCase().includes(search.toLowerCase())), [studySpaces, search]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Group' : 'Create New Group'}</DialogTitle>
                    <DialogDescription>Step {step} of 2: {step === 1 ? "Group Details" : "Add Items"}</DialogDescription>
                </DialogHeader>
                
                {step === 1 && (
                    <div className="py-4 space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="group-name">Group Name</Label>
                            <Input id="group-name" placeholder="e.g., Microeconomics" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="group-desc">Description (optional)</Label>
                            <Textarea id="group-desc" placeholder="A short description of what this group is about." value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex-1 flex flex-col min-h-0">
                         <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search notes and spaces..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
                        </div>
                        <ScrollArea className="flex-1 -mx-6 px-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Study Spaces ({filteredSpaces.length})</h3>
                                    {filteredSpaces.length > 0 ? (
                                        <div className="space-y-2">
                                            {filteredSpaces.map(space => (
                                                <div key={`space-${space.id}`} className="flex items-center space-x-3 p-2.5 border rounded-md bg-card has-[:checked]:bg-secondary">
                                                    <Checkbox 
                                                        id={`space-${space.id}`} 
                                                        onCheckedChange={(checked) => handleItemToggle({ type: 'studyspace', id: space.id, name: space.name }, !!checked)}
                                                        checked={selectedItems.some(i => i.type === 'studyspace' && i.id === space.id)}
                                                    />
                                                    <label htmlFor={`space-${space.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">{space.name}</label>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-sm text-muted-foreground p-4 text-center">No matching study spaces found.</p>}
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Notes ({filteredNotes.length})</h3>
                                    {filteredNotes.length > 0 ? (
                                        <div className="space-y-2">
                                            {filteredNotes.map(note => (
                                                <div key={`note-${note.id}`} className="flex items-center space-x-3 p-2.5 border rounded-md bg-card has-[:checked]:bg-secondary">
                                                    <Checkbox 
                                                        id={`note-${note.id}`} 
                                                        onCheckedChange={(checked) => handleItemToggle({ type: 'note', id: note.id, name: note.topic }, !!checked)}
                                                        checked={selectedItems.some(i => i.type === 'note' && i.id === note.id)}
                                                    />
                                                    <label htmlFor={`note-${note.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">{note.topic}</label>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-sm text-muted-foreground p-4 text-center">No matching notes found.</p>}
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                )}

                <DialogFooter>
                    {step === 1 && <Button onClick={handleNext}>Next</Button>}
                    {step === 2 && (
                        <div className="flex justify-between w-full">
                            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={handleSubmit}>{isEditMode ? 'Update Group' : 'Create Group'}</Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Wrapper to satisfy Next.js suspense requirement
export default function GroupsPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
        <GroupsPage />
    </Suspense>
  )
}
