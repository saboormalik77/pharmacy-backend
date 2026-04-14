'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import StoreProvider from '@/components/providers/StoreProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const AUTH_PATHS = ['/login', '/setup-account'];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const isAuthPage = AUTH_PATHS.includes(pathname);

    const handleToggleSidebar = () => {
        if (window.innerWidth < 640) {
            setSidebarOpen(prev => !prev);
        } else {
            setSidebarCollapsed(prev => !prev);
        }
    };

    const handleCloseSidebar = () => setSidebarOpen(false);

    useEffect(() => {
        document.title = 'Main Admin';
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 640) setSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
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
                        {sidebarOpen && (
                            <div
                                className="fixed top-16 left-0 right-0 bottom-0 z-30 sm:hidden"
                                onClick={handleCloseSidebar}
                            />
                        )}
                    </>
                )}
                <main
                    className={
                        !isAuthPage
                            ? `pt-16 transition-all duration-300 min-h-screen ${sidebarCollapsed ? 'sm:ml-16' : 'sm:ml-64'}`
                            : ''
                    }
                >
                    {!isAuthPage
                        ? <div className="p-3 sm:p-4 md:p-6">{children}</div>
                        : children
                    }
                </main>
            </ProtectedRoute>
        </StoreProvider>
    );
}
