import type { Metadata } from 'next';
import { Newsreader, Manrope } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/layout/ClientLayout';

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  style: ['normal'],
  weight: ['400', '500', '600', '700'],
});

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
    description: 'Medical Portal',
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${newsreader.variable} ${manrope.variable} antialiased bg-[var(--surface)]`}>
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}
