
"use client";

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, DocumentData, CollectionReference } from 'firebase/firestore';
import { format } from 'date-fns';
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
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, UserCog, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserProfile extends DocumentData {
  id: string;
  name: string;
  email: string;
  createdAt: { seconds: number; nanoseconds: number };
  isAdmin?: boolean;
}

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const usersRef = useMemo(() => firestore ? collection(firestore, 'users') as CollectionReference<UserProfile> : null, [firestore]);
  const { data: users, loading } = useCollection<UserProfile>(usersRef);

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>View and manage all registered users.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        ) : !users || users.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No users found.</p>
        ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-[50px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                                <Badge variant={user.isAdmin ? 'destructive' : 'secondary'}>
                                    {user.isAdmin ? 'Admin' : 'Student'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {user.createdAt ? format(new Date(user.createdAt.seconds * 1000), 'PPP') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem><UserCog className="mr-2 h-4 w-4"/> Edit role</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/> Delete user</DropdownMenuItem>
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
  );
}
