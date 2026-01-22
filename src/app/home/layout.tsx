import { FooterMenu } from "@/components/layout/FooterMenu";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-card text-foreground">
        <div className="flex-1 flex flex-col">
            <main className="flex-1 pb-24 md:pb-6 flex flex-col">
                {children}
            </main>
            <FooterMenu />
        </div>
    </div>
  );
}
