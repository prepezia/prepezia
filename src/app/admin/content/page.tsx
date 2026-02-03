"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const termsPlaceholder = `1. Agreement to Terms
By using our application, Learn with Temi, you agree to be bound by these Terms of Use...`;

const privacyPlaceholder = `1. Introduction
Welcome to Learn with Temi ("we," "our," or "us"). We are committed to protecting your privacy...`;

export default function AdminContentPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Legal Content Management</CardTitle>
        <CardDescription>
          Edit the Terms of Use and Privacy Policy for the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="terms">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="terms">Terms of Use</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
          </TabsList>
          <TabsContent value="terms" className="mt-4">
            <Textarea defaultValue={termsPlaceholder} rows={20} />
          </TabsContent>
          <TabsContent value="privacy" className="mt-4">
            <Textarea defaultValue={privacyPlaceholder} rows={20} />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}