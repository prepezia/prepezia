import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { initializeFirebase } from '@/firebase';
import './globals.css';

export const metadata: Metadata = {
  title: 'Learn with Temi',
  description: 'A high-end educational research and exam prep tool for students in Ghana.',
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
        <FirebaseClientProvider {...initializeFirebase()}>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
