import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { CampusThemeProvider } from '@/components/layout/CampusThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://prepezia.com'),
  title: 'Prepezia | Prep easier.',
  description: 'Prepezia: Prep easier. Your AI-powered learning partner for research and exam prep.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: 'https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Ffavicon.png?alt=media&token=2eba5a56-46dc-44db-9d8c-a91cff1f4f2c', sizes: '32x32', type: 'image/png' },
      { url: 'https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Ffavicon.png?alt=media&token=2eba5a56-46dc-44db-9d8c-a91cff1f4f2c', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: 'https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Ffavicon.png?alt=media&token=2eba5a56-46dc-44db-9d8c-a91cff1f4f2c',
    apple: [
      { url: 'https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Ffavicon.png?alt=media&token=2eba5a56-46dc-44db-9d8c-a91cff1f4f2c', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Prepezia | Prep easier.',
    description: 'Your AI-powered learning partner for research and exam prep.',
    url: 'https://prepezia.com',
    siteName: 'Prepezia',
    locale: 'en_GH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prepezia | Prep easier.',
    description: 'Your AI-powered learning partner for research and exam prep.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
          <meta name="application-name" content="Prepezia" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Prepezia" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="theme-color" content="#5f43b6" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <CampusThemeProvider>
            {children}
          </CampusThemeProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
