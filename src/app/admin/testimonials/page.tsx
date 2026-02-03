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
import { MoreHorizontal, Plus, Trash2, Edit } from "lucide-react";

// Mock data
const testimonials = [
    { id: 1, name: "Kwabena Asante", text: "The Drive Intelligence feature is a game-changer for my long-distance trips to Kumasi. I used to rely on guesswork for traffic, but now I get a full report on the best routes to take." },
    { id: 2, name: "Kwame Osafo", text: "I run a small fleet of delivery vans, and being able to manage emergency requests for all my drivers through one platform has been incredibly efficient." },
    { id: 3, name: "Dorcas Afolabi", text: "As a parent, the panic button gives me incredible peace of mind. Knowing my children can send an instant alert with their location if they're ever in trouble is priceless." },
    { id: 4, name: "Ama Serwaa", text: "I was stranded on the Accra-Tema motorway with a flat tire at night. I used the app to request a mechanic, and someone arrived in under 20 minutes." },
];


export default function AdminTestimonialsPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Testimonials Management</CardTitle>
            <CardDescription>
            Manage the testimonials displayed on the homepage.
            </CardDescription>
        </div>
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Testimonial
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead>Text</TableHead>
                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {testimonials.map((testimonial) => (
                    <TableRow key={testimonial.id}>
                        <TableCell className="font-medium">{testimonial.name}</TableCell>
                        <TableCell className="text-muted-foreground truncate max-w-lg">{testimonial.text}</TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
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
  );
}