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
        <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 h-16">
            <div className="flex items-center justify-between h-full px-2 sm:px-4">
                <div className="flex items-center gap-2 sm:gap-4">
                    <button onClick={onToggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <Menu className="w-5 h-5 text-gray-700" />
                    </button>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xs sm:text-sm">MA</span>
                        </div>
                        <span className="text-base sm:text-xl font-bold text-gray-900 hidden xs:inline">Admin</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative" ref={profileRef}>
                        <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">{user?.name || 'Admin'}</span>
                        </button>
                        {showProfile && (
                            <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <p className="font-medium text-gray-900">{user?.name || 'Admin'}</p>
                                    <p className="text-sm text-gray-500">{user?.email || ''}</p>
                                </div>
                                <div className="py-1">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                        <LogOut className="w-4 h-4" />Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isLoggingOut && (
                <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
                        <p className="text-sm text-gray-600 font-medium">Logging out...</p>
                    </div>
                </div>
            )}
        </nav>
    );
}
