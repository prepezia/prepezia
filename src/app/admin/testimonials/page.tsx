import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function AdminTestimonialsPage() {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Testimonials</CardTitle>
                <CardDescription>Manage user testimonials displayed on the landing page.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-12">
                    [Testimonials Management Placeholder]
                </p>
            </CardContent>
        </Card>
    )
}
