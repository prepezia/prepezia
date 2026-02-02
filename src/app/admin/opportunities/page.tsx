import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function AdminOpportunitiesPage() {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Opportunities</CardTitle>
                <CardDescription>Upload and manage scholarships and other opportunities.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-12">
                    [Opportunities Upload and Management Placeholder]
                </p>
            </CardContent>
        </Card>
    )
}
