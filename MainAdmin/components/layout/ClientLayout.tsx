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
        document.title = 'Admin';
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
                        <Sidebar
                            isCollapsed={sidebarCollapsed}
                            isOpen={sidebarOpen}
                            onClose={handleCloseSidebar}
                            onToggle={handleToggleSidebar}
                        />
                        {sidebarOpen && (
                            <div
                                className="fixed top-0 left-0 right-0 bottom-0 z-30 sm:hidden"
                                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                                onClick={handleCloseSidebar}
                            />
                        )}
                    </>
                )}
                <main
                    className={
                        !isAuthPage
                            ? `flex flex-col min-h-screen ${sidebarCollapsed ? 'sm:ml-16' : 'sm:ml-64'}`
                            : ''
                    }
                >
                    {!isAuthPage && (
                        <Navbar onToggleSidebar={handleToggleSidebar} />
                    )}
                    <div className={!isAuthPage ? 'flex-1 p-4 sm:p-6 lg:p-8' : ''}>
                        {children}
                    </div>
                </main>
            </ProtectedRoute>
        </StoreProvider>
    );
}
