import type { Metadata } from "next";
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppSidebar } from '@/components/app-sidebar';
import { Providers } from './providers';
import './globals.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Thesis Lab — investment research notebook',
  description: 'A calm workspace for tracking company theses and research notes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full"><Providers><div className="app-frame"><Suspense fallback={null}><AppSidebar /></Suspense><div className="app-content">{children}</div></div></Providers></body>
    </html>
  );
}
