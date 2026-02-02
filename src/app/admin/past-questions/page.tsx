import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function AdminPastQuestionsPage() {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Past Questions</CardTitle>
                <CardDescription>Upload and manage past questions for all exam bodies.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-12">
                    [Past Questions Upload and Management Placeholder]
                </p>
            </CardContent>
        </Card>
    )
}
