'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import StoreProvider from "@/components/providers/StoreProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const pathname = usePathname();
  // Auth pages that don't show sidebar/navbar
  const isAuthPage = pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password';

  const handleToggleSidebar = () => {
    // On mobile: toggle sidebar open/close
    // On desktop: toggle collapsed/expanded
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) {
        // Mobile: toggle open/close
        setSidebarOpen(!sidebarOpen);
      } else {
        // Desktop: toggle collapsed/expanded
        setSidebarCollapsed(!sidebarCollapsed);
      }
    }
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  // Set document title
  useEffect(() => {
    document.title = 'Pharma Admin';
  }, []);

  // Close sidebar when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <html lang="en" className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100`}
      >
        <StoreProvider>
          <ProtectedRoute>
            {!isAuthPage && (
              <>
                <Navbar onToggleSidebar={handleToggleSidebar} />
                <Sidebar 
                  isCollapsed={sidebarCollapsed} 
                  isOpen={sidebarOpen}
                  onClose={handleCloseSidebar}
                />
                {/* Backdrop for mobile sidebar - allows closing by clicking outside */}
                {sidebarOpen && (
                  <div 
                    className="fixed top-16 left-0 right-0 bottom-0 z-30 sm:hidden"
                    onClick={handleCloseSidebar}
                  />
                )}
              </>
            )}
            <main
              className={!isAuthPage ? `pt-16 transition-all duration-300 min-h-screen ${sidebarCollapsed ? 'sm:ml-16' : 'sm:ml-64'}` : ''}
            >
              {!isAuthPage && <div className="p-3 sm:p-4 md:p-6">{children}</div>}
              {isAuthPage && children}
            </main>
          </ProtectedRoute>
        </StoreProvider>
      </body>
    </html>
  );
}
