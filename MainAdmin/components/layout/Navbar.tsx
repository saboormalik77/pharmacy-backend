'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, User, LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { logoutUser } from '@/lib/store/authSlice';

interface NavbarProps {
    onToggleSidebar: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const [showProfile, setShowProfile] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (showProfile && profileRef.current && !profileRef.current.contains(target)) {
                setShowProfile(false);
            }
        };

        if (showProfile) {
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 0);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfile]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        setShowProfile(false);
        await dispatch(logoutUser());
        window.location.href = '/login';
    };

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50 h-16 border-b"
            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
        >
            <div className="flex items-center justify-between h-full px-2 sm:px-4">
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={onToggleSidebar}
                        className="p-2 rounded-lg transition-colors hover:bg-primary-50/40 border"
                        style={{ borderColor: 'transparent' }}
                    >
                        <Menu className="w-5 h-5" style={{ color: 'var(--on-surface)' }} />
                    </button>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
                            <span className="text-white font-bold text-xs sm:text-sm">MA</span>
                        </div>
                        <span className="text-base sm:text-xl font-bold hidden xs:inline" style={{ color: 'var(--foreground)' }}>Admin</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative" ref={profileRef}>
                        <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-primary-50/40">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
                                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <span className="text-xs sm:text-sm font-medium hidden sm:inline" style={{ color: 'var(--on-surface)' }}>{user?.name || 'Admin'}</span>
                        </button>
                        {showProfile && (
                            <div className="absolute right-0 mt-2 w-48 sm:w-56 rounded-lg shadow-lg border overflow-hidden z-50" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
                                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>{user?.name || 'Admin'}</p>
                                    <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>{user?.email || ''}</p>
                                </div>
                                <div className="py-1">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-primary-50/40"
                                        style={{ color: 'var(--error)' }}
                                    >
                                        <LogOut className="w-4 h-4" />Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isLoggingOut && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: 'var(--surface-container-lowest)' }}>
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
                        <p className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>Logging out...</p>
                    </div>
                </div>
            )}
        </nav>
    );
}
