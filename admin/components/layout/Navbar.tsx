'use client';

import { useState, useEffect } from 'react';
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
    const { activities, isLoading: isLoadingActivity } = useAppSelector((state) => state.recentActivity);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    // Fetch recent activity when component mounts or when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchRecentActivity({
                limit: 20,
                offset: 0,
            }));
        }
    }, [dispatch, isAuthenticated]);

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

    const unreadCount = activities.filter((activity) => !activity.isRead).length;

    const handleMarkAsRead = async (activityId: string) => {
        // Only mark as read if it's not already read
        const activity = activities.find(a => a.id === activityId);
        if (activity && !activity.isRead) {
            await dispatch(markActivityAsRead(activityId));
        }
    };

    const handleLogout = async () => {
        await dispatch(logoutUser());
        router.push('/login');
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

                <div className="flex items-center gap-1 sm:gap-2">
                    <div className="relative">
                        <button onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <Bell className="w-5 h-5 text-gray-700" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount}</span>
                            )}
                        </button>
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {isLoadingActivity ? (
                                        <div className="px-4 py-8 text-center">
                                            <p className="text-sm text-gray-500">Loading notifications...</p>
                                        </div>
                                    ) : activities.length === 0 ? (
                                        <div className="px-4 py-8 text-center">
                                            <p className="text-sm text-gray-500">No notifications</p>
                                        </div>
                                    ) : (
                                        activities.map((activity) => {
                                            const isRead = activity.isRead || false;
                                            return (
                                                <div 
                                                    key={activity.id} 
                                                    onClick={() => handleMarkAsRead(activity.id)} 
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

                    <div className="relative">
                        <button onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }} className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">{user?.name || 'Admin User'}</span>
                        </button>
                        {showProfile && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
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
