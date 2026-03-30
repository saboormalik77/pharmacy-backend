'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Search, Bell, User, LogOut, Settings } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { logoutUser } from '@/lib/store/authSlice';
import { fetchRecentActivity, markActivityAsRead, Activity } from '@/lib/store/recentActivitySlice';

interface NavbarProps {
    onToggleSidebar: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const { notifications, isLoadingNotifications } = useAppSelector((state) => state.recentActivity);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    // Fetch recent activity when component mounts or when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchRecentActivity({
                limit: 20,
                offset: 0,
                filter: 'notifications',
            }));
        }
    }, [dispatch, isAuthenticated]);

    // Close notifications and profile dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            
            // Close notifications if click is outside
            if (showNotifications && notificationsRef.current && !notificationsRef.current.contains(target)) {
                setShowNotifications(false);
            }
            
            // Close profile if click is outside
            if (showProfile && profileRef.current && !profileRef.current.contains(target)) {
                setShowProfile(false);
            }
        };

        if (showNotifications || showProfile) {
            // Use setTimeout to avoid immediate closure when clicking the button
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 0);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotifications, showProfile]);

    // Format activity message based on activity type
    const formatActivityMessage = (activity: Activity): string => {
        const pharmacyName = activity.pharmacy?.pharmacyName || activity.pharmacy?.name || 'Unknown Pharmacy';
        const entityName = activity.entityName || '';
        
        // Convert activity type to readable format
        const activityTypeMap: Record<string, string> = {
            'pharmacy_registered': 'registered a new pharmacy',
            'document_uploaded': 'uploaded document',
            'product_added': 'added product',
            'payment_processed': 'processed payment',
            'shipment_created': 'created shipment',
            'deal_posted': 'posted deal',
            'document_approved': 'approved document',
            'document_rejected': 'rejected document',
            'pharmacy_updated': 'updated pharmacy',
            'product_updated': 'updated product',
        };

        // Get the readable activity type or convert snake_case to readable text
        let activityText = activityTypeMap[activity.activityType];
        if (!activityText) {
            // Convert snake_case to readable text (e.g., "document_uploaded" -> "uploaded document")
            activityText = activity.activityType
                .split('_')
                .reverse()
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
                .toLowerCase();
        }

        // Build the message based on activity type
        if (activity.activityType === 'pharmacy_registered') {
            return `${pharmacyName} ${activityText}`;
        } else if (activity.activityType === 'document_uploaded') {
            return `${pharmacyName} ${activityText}${entityName ? `: ${entityName}` : ''}`;
        } else if (activity.activityType === 'product_added') {
            return `${pharmacyName} ${activityText}${entityName ? `: ${entityName}` : ''}`;
        } else {
            // Generic format for other activity types
            return `${pharmacyName} ${activityText}${entityName ? `: ${entityName}` : ''}`;
        }
    };

    // Get activity title based on activity type
    const getActivityTitle = (activityType: string): string => {
        const titleMap: Record<string, string> = {
            'pharmacy_registered': 'New Pharmacy Registration',
            'document_uploaded': 'Document Uploaded',
            'product_added': 'Product Added',
            'payment_processed': 'Payment Processed',
            'shipment_created': 'Shipment Created',
            'deal_posted': 'New Marketplace Deal',
            'document_approved': 'Document Approved',
            'document_rejected': 'Document Rejected',
            'pharmacy_updated': 'Pharmacy Updated',
            'product_updated': 'Product Updated',
        };

        return titleMap[activityType] || activityType.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const unreadCount = notifications.filter((activity) => !activity.isRead).length;

    const handleMarkAsRead = async (activityId: string) => {
        // Only mark as read if it's not already read
        const activity = notifications.find(a => a.id === activityId);
        if (activity && !activity.isRead) {
            await dispatch(markActivityAsRead(activityId));
        }
    };

    const handleNotificationClick = (activity: Activity) => {
        // Mark as read if not already read
        if (!activity.isRead) {
            handleMarkAsRead(activity.id);
        }

        // Navigate to pharmacies page and open detail modal for pharmacy_registered activities
        if (activity.activityType === 'pharmacy_registered' && activity.pharmacy?.id) {
            setShowNotifications(false);
            router.push(`/pharmacies?pharmacyId=${activity.pharmacy.id}`);
        }
    };

    const handleLogout = async () => {
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
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xs sm:text-sm">PA</span>
                        </div>
                        <span className="text-base sm:text-xl font-bold text-gray-900 hidden xs:inline">PharmAdmin</span>
                    </div>
                </div>

                {/* <div className="hidden md:flex flex-1 max-w-2xl mx-4 lg:mx-8">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Search pharmacies, payments, documents..." className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                    </div>
                </div> */}

                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative" ref={notificationsRef}>
                        <button onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }} className="relative p-2 sm:p-2.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center">
                            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
                            {unreadCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center font-semibold">{unreadCount > 99 ? '99+' : unreadCount}</span>
                            )}
                        </button>
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-[280px] sm:w-72 md:w-80 max-w-[calc(100vw-1rem)] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {isLoadingNotifications ? (
                                        <div className="px-4 py-8 text-center">
                                            <p className="text-sm text-gray-500">Loading notifications...</p>
                                        </div>
                                    ) : notifications.length === 0 ? (
                                        <div className="px-4 py-8 text-center">
                                            <p className="text-sm text-gray-500">No notifications</p>
                                        </div>
                                    ) : (
                                        notifications.map((activity) => {
                                            const isRead = activity.isRead || false;
                                            return (
                                                <div 
                                                    key={activity.id} 
                                                    onClick={() => handleNotificationClick(activity)} 
                                                    className={cn(
                                                        'px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors', 
                                                        !isRead && 'bg-blue-50'
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm text-gray-900">
                                                                {getActivityTitle(activity.activityType)}
                                                            </p>
                                                            <p className="text-sm text-gray-600 mt-1 break-words">
                                                                {formatActivityMessage(activity)}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {formatRelativeTime(activity.createdAt)}
                                                            </p>
                                                        </div>
                                                        {!isRead && (
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0 ml-2"></div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={profileRef}>
                        <button onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }} className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">{user?.name || 'Admin User'}</span>
                        </button>
                        {showProfile && (
                            <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <p className="font-medium text-gray-900">{user?.name || 'Admin User'}</p>
                                    <p className="text-sm text-gray-500">{user?.email || 'admin@pharmadmin.com'}</p>
                                </div>
                                <div className="py-1">
                                    <button onClick={() => {
                                        router.push('/settings')
                                        setShowProfile(false)
                                        }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                                        <Settings className="w-4 h-4" />Settings
                                    </button>
                                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                        <LogOut className="w-4 h-4" />Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
