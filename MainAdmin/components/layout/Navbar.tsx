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
        <>
            <nav
                className="h-14 border-b flex items-center px-4 gap-2"
                style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            >
                <button
                    type="button"
                    onClick={onToggleSidebar}
                    className="sm:hidden p-1.5 rounded-[4px] transition-colors hover:bg-[var(--surface-container-low)]"
                    style={{ color: 'var(--on-surface)' }}
                    aria-label="Open menu"
                    title="Menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div className="relative ml-auto" ref={profileRef}>
                    <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-2 p-1.5 rounded-[4px] transition-colors hover:bg-[var(--surface-container-low)]">
                        <div className="w-8 h-8 rounded-[4px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
                            <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>{user?.name || 'Admin'}</span>
                    </button>
                    {showProfile && (
                        <div className="absolute right-0 mt-2 w-56 rounded-[4px] shadow-lg border overflow-hidden z-50" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
                                <p className="font-medium" style={{ color: 'var(--on-surface)' }}>{user?.name || 'Admin'}</p>
                                <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>{user?.email || ''}</p>
                            </div>
                            <div className="py-1">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[var(--surface-container-low)]"
                                    style={{ color: 'var(--error)' }}
                                >
                                    <LogOut className="w-4 h-4" />Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {isLoggingOut && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="flex flex-col items-center gap-3 p-6 rounded-[4px]" style={{ backgroundColor: 'var(--surface-container-lowest)' }}>
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--secondary)' }} />
                        <p className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>Logging out...</p>
                    </div>
                </div>
            )}
        </>
    );
}
