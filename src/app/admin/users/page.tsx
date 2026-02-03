"use client";

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
import { MoreHorizontal, Trash2, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Mock data
const users = [
    { id: "usr_1", name: "Ama Serwaa", email: "ama.s@example.com", role: "Student", joined: "2024-07-21" },
    { id: "usr_2", name: "Kofi Mensah", email: "k.mensah@example.com", role: "Student", joined: "2024-07-20" },
    { id: "usr_3", name: "Admin User", email: "admin@learnwithtemi.com", role: "Admin", joined: "2024-05-10" },
    { id: "usr_4", name: "Adwoa Agyapong", email: "adwoa.a@example.com", role: "Student", joined: "2024-07-19" },
    { id: "usr_5", name: "Yaw Boateng", email: "yaw.b@example.com", role: "Student", joined: "2024-07-18" },
];

export default function AdminUsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>View and manage all registered users.</CardDescription>
      </CardHeader>
      <CardContent>
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
                            <Badge variant={user.role === 'Admin' ? 'destructive' : 'secondary'}>
                                {user.role}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.joined}</TableCell>
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
      </CardContent>
    </Card>
  );
}