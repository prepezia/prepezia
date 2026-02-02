import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function AdminContentPage() {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Content Management</CardTitle>
                <CardDescription>Edit the Terms of Use and Privacy Policy.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-12">
                    [Content Editor Placeholder]
                </p>
            </CardContent>
        </Card>
    )
}
