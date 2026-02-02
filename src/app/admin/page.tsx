import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, BookOpen, FileQuestion, Briefcase } from "lucide-react";

export default function AdminDashboardPage() {
    // Placeholder data
    const stats = [
        { title: "Total Users", value: "1,250", icon: Users },
        { title: "Study Spaces", value: "450", icon: BookOpen },
        { title: "Past Questions", value: "89", icon: FileQuestion },
        { title: "Job Postings", value: "32", icon: Briefcase },
    ];

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    An overview of your application's data.
                </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">
                                +20.1% from last month
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>A log of recent user activities.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-muted-foreground py-8">
                            [Activity Feed Placeholder]
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Users Growth</CardTitle>
                        <CardDescription>User sign-ups over the last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <p className="text-center text-muted-foreground py-8">
                            [Chart Placeholder]
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
