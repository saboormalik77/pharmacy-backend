import type { Metadata } from 'next';
import { Newsreader, Manrope } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/layout/ClientLayout';

const newsreader = Newsreader({
    variable: '--font-newsreader',
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

const manrope = Manrope({
    variable: '--font-manrope',
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Admin',
    description: 'Admin Portal - Buying Group Management',
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${newsreader.variable} ${manrope.variable} antialiased`} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}
