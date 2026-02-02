import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function AdminSettingsPage() {
    return (
         <Card>
            <CardHeader>
                <CardTitle>App Settings</CardTitle>
                <CardDescription>Update social media links and app store URLs.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-12">
                    [App Settings Form Placeholder]
                </p>
            </CardContent>
        </Card>
    )
}
