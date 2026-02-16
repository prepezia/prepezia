import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prepezia',
  description: 'Prepezia: Prepare easier. Your AI-powered learning partner for research and exam prep.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
