'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Bell, User, LogOut, Settings, Loader2 } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { logoutUser } from '@/lib/store/authSlice';
import { fetchRecentActivity, markActivityAsRead, Activity } from '@/lib/store/recentActivitySlice';
import {
    fetchProcessorNotifications,
    markProcessorNotificationRead,
    ProcessorNotification,
} from '@/lib/store/processorNotificationsSlice';
import { fetchSettings } from '@/lib/store/settingsSlice';
import { usePermissions } from '@/hooks/usePermissions';

interface NavbarProps {
    onToggleSidebar: () => void;
    sidebarCollapsed?: boolean;
}

export function Navbar({ onToggleSidebar, sidebarCollapsed }: NavbarProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const { hasPermission } = usePermissions();
    const { notifications, isLoadingNotifications } = useAppSelector((state) => state.recentActivity);
    const {
        notifications: processorNotifications,
        unreadCount: processorUnreadCount,
        isLoading: isLoadingProcessorNotifications,
    } = useAppSelector((state) => state.processorNotifications);
    const { settings } = useAppSelector((state) => state.settings);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    // Processors get their own personal notifications feed. Admins/super_admins
    // use the buying-group-wide admin_recent_activity feed.
    const isProcessor = user?.role === 'processor';

    // Fetch settings and the appropriate notification feed when authenticated
    useEffect(() => {
        if (!isAuthenticated) return;

        if (!settings && !isProcessor) {
            dispatch(fetchSettings());
        }

        if (isProcessor) {
            dispatch(fetchProcessorNotifications({ limit: 20, offset: 0 }));
        } else {
            dispatch(fetchRecentActivity({
                limit: 20,
                offset: 0,
                filter: 'notifications',
            }));
        }
    }, [dispatch, isAuthenticated, isProcessor]);

    // Poll every 60s so a processor sees new requests appear without refreshing
    useEffect(() => {
        if (!isAuthenticated || !isProcessor) return;
        const id = setInterval(() => {
            dispatch(fetchProcessorNotifications({ limit: 20, offset: 0 }));
        }, 60_000);
        return () => clearInterval(id);
    }, [dispatch, isAuthenticated, isProcessor]);

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

    const adminUnreadCount = notifications.filter((activity) => !activity.isRead).length;
    const unreadCount = isProcessor ? processorUnreadCount : adminUnreadCount;
    const isLoadingActiveFeed = isProcessor
        ? isLoadingProcessorNotifications
        : isLoadingNotifications;

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

    // --- processor notification helpers ---------------------------------
    const getProcessorNotificationTitle = (n: ProcessorNotification): string => {
        if (n.title) return n.title;
        switch (n.type) {
            case 'service_request_new': return 'New on-site service request';
            case 'service_request_cancelled': return 'Service request cancelled';
            case 'service_request_reassigned': return 'Service request reassigned';
            default: return 'Notification';
        }
    };

    const handleProcessorNotificationClick = (n: ProcessorNotification) => {
        if (!n.is_read) {
            dispatch(markProcessorNotificationRead(n.id));
        }
        if (n.entity_type === 'service_request' && n.entity_id) {
            setShowNotifications(false);
            router.push(`/service-requests?requestId=${n.entity_id}`);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        setShowProfile(false);
        // Keep branding on the login screen after full reload (ClientLayout used to reset document.title)
        if (typeof window !== 'undefined' && settings) {
            try {
                localStorage.setItem(
                    'adminBranding',
                    JSON.stringify({
                        logoUrl: settings.logoUrl ?? null,
                        businessName: settings.businessName ?? null,
                    })
                );
            } catch {
                // ignore
            }
        }
        await dispatch(logoutUser());
        window.location.href = '/login';
    };

    return (
        <nav className={`bg-white border-b border-[#e2e2e2] fixed top-0 z-40 h-14 transition-all duration-300 ${sidebarCollapsed ? 'left-16' : 'left-64'} right-0`}>
            <div className="flex items-center justify-between h-full px-3 sm:px-4">
                {/* Left side - mobile menu only */}
                <div className="flex items-center sm:hidden">
                    <button onClick={onToggleSidebar} className="p-1.5 rounded-[4px] hover:bg-gray-100 transition-colors">
                        <Menu className="w-5 h-5 text-gray-700" />
                    </button>
                </div>

                {/* Right side - Notifications & Profile */}
                <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                    <div className="relative" ref={notificationsRef}>
                        <button onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }} className="relative p-2 sm:p-2.5 rounded-[4px] hover:bg-gray-100 transition-colors flex items-center justify-center">
                            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
                            {unreadCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center font-semibold">{unreadCount > 99 ? '99+' : unreadCount}</span>
                            )}
                        </button>
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-[280px] sm:w-72 md:w-80 max-w-[calc(100vw-1rem)] bg-white rounded-[4px] shadow-lg border border-[#e2e2e2] overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-[#e2e2e2]">
                                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {isLoadingActiveFeed ? (
                                        <div className="px-4 py-8 text-center">
                                            <p className="text-sm text-gray-500">Loading notifications...</p>
                                        </div>
                                    ) : isProcessor ? (
                                        processorNotifications.length === 0 ? (
                                            <div className="px-4 py-8 text-center">
                                                <p className="text-sm text-gray-500">No notifications</p>
                                            </div>
                                        ) : (
                                            processorNotifications.map((n) => {
                                                const isRead = n.is_read;
                                                return (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => handleProcessorNotificationClick(n)}
                                                        className={cn(
                                                            'px-4 py-3 border-b border-gray-100 hover:bg-white cursor-pointer transition-colors',
                                                            !isRead && 'bg-blue-50'
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm text-gray-900">
                                                                    {getProcessorNotificationTitle(n)}
                                                                </p>
                                                                <p className="text-sm text-gray-600 mt-1 break-words">
                                                                    {n.message}
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {formatRelativeTime(n.created_at)}
                                                                </p>
                                                            </div>
                                                            {!isRead && (
                                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0 ml-2"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )
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
                                                        'px-4 py-3 border-b border-gray-100 hover:bg-white cursor-pointer transition-colors',
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
                        <button onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }} className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-[4px] hover:bg-gray-100 transition-colors">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">{user?.name || 'Admin User'}</span>
                        </button>
                        {showProfile && (
                            <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-[4px] shadow-lg border border-[#e2e2e2] overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-[#e2e2e2]">
                                    <p className="font-medium text-gray-900">{user?.name || 'Admin User'}</p>
                                    <p className="text-sm text-gray-500">{user?.email || 'admin@pharmadmin.com'}</p>
                                </div>
                                <div className="py-1">
                                    {hasPermission('settings') && (
                                    <button onClick={() => {
                                        router.push('/settings')
                                        setShowProfile(false)
                                    }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                                        <Settings className="w-4 h-4" />Settings
                                    </button>
                                    )}
                                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                        <LogOut className="w-4 h-4" />Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Logout Loading Overlay */}
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
