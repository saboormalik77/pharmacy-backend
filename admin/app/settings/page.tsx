'use client';

import { useState, useEffect } from 'react';
import { Save, Bell, Shield, Globe, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchSettings, updateNotificationSettings, resetPassword } from '@/lib/store/settingsSlice';

export default function SettingsPage() {
    const dispatch = useAppDispatch();
    const { settings, isLoading, isUpdating, isResettingPassword, error } = useAppSelector((state) => state.settings);
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    
    // Local state for notification settings
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: false,
        documentApprovalNotif: false,
        paymentNotif: false,
        shipmentNotif: false,
    });

    // Local state for password reset
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [passwordErrors, setPasswordErrors] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [showPasswords, setShowPasswords] = useState({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
    });

    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    // Fetch settings on mount
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchSettings());
        }
    }, [dispatch, isAuthenticated]);

    // Update local notification settings when Redux settings are loaded
    useEffect(() => {
        if (settings) {
            setNotificationSettings({
                emailNotifications: settings.emailNotifications,
                documentApprovalNotif: settings.documentApprovalNotif,
                paymentNotif: settings.paymentNotif,
                shipmentNotif: settings.shipmentNotif,
            });
        }
    }, [settings]);

    // Show error toast if there's an error
    useEffect(() => {
        if (error) {
            showToast(error, 'error');
        }
    }, [error]);

    const handleSaveNotifications = async () => {
        try {
            const result = await dispatch(updateNotificationSettings(notificationSettings));
            if (updateNotificationSettings.fulfilled.match(result)) {
                showToast('Notification settings updated successfully!', 'success');
            } else {
                showToast(result.payload as string || 'Failed to update notification settings', 'error');
            }
        } catch (err) {
            showToast('An unexpected error occurred', 'error');
        }
    };

    const validatePasswordForm = (): boolean => {
        const errors = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        };
        let isValid = true;

        if (!passwordForm.currentPassword) {
            errors.currentPassword = 'Current password is required';
            isValid = false;
        }

        if (!passwordForm.newPassword) {
            errors.newPassword = 'New password is required';
            isValid = false;
        } else if (passwordForm.newPassword.length < 8) {
            errors.newPassword = 'Password must be at least 8 characters';
            isValid = false;
        }

        if (!passwordForm.confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
            isValid = false;
        } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        setPasswordErrors(errors);
        return isValid;
    };

    const handleResetPassword = async () => {
        // Clear previous errors
        setPasswordErrors({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        });

        // Validate form
        if (!validatePasswordForm()) {
            return;
        }

        try {
            const result = await dispatch(resetPassword(passwordForm));
            if (resetPassword.fulfilled.match(result)) {
                showToast('Password reset successfully!', 'success');
                // Clear form
                setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                });
            } else {
                showToast(result.payload as string || 'Failed to reset password', 'error');
            }
        } catch (err) {
            showToast('An unexpected error occurred', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-1">Manage system configuration and preferences</p>
            </div>

            {/* General Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Globe className="w-5 h-5 text-primary-500" />
                    <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
                </div>

                {isLoading && !settings ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                            <p className="text-sm text-gray-600">Loading settings...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                            <input
                                type="text"
                                value={settings?.siteName || ''}
                                readOnly
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Site Email</label>
                            <input
                                type="email"
                                value={settings?.siteEmail || ''}
                                readOnly
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Notification Settings */}
            {/* <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Bell className="w-5 h-5 text-primary-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
                </div>

                {isLoading && !settings ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="h-5 bg-gray-200 rounded animate-pulse mb-2 w-32"></div>
                                <div className="h-4 bg-gray-100 rounded animate-pulse w-48"></div>
                            </div>
                            <div className="w-11 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="h-5 bg-gray-200 rounded animate-pulse mb-2 w-32"></div>
                                <div className="h-4 bg-gray-100 rounded animate-pulse w-48"></div>
                            </div>
                            <div className="w-11 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="h-5 bg-gray-200 rounded animate-pulse mb-2 w-32"></div>
                                <div className="h-4 bg-gray-100 rounded animate-pulse w-48"></div>
                            </div>
                            <div className="w-11 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="h-5 bg-gray-200 rounded animate-pulse mb-2 w-32"></div>
                                <div className="h-4 bg-gray-100 rounded animate-pulse w-48"></div>
                            </div>
                            <div className="w-11 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Email Notifications</p>
                                <p className="text-sm text-gray-600">Receive email notifications for important events</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notificationSettings.emailNotifications}
                                    onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                                    className="sr-only peer"
                                    disabled={isUpdating}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Document Approvals</p>
                                <p className="text-sm text-gray-600">Notify when documents need review</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notificationSettings.documentApprovalNotif}
                                    onChange={(e) => setNotificationSettings({ ...notificationSettings, documentApprovalNotif: e.target.checked })}
                                    className="sr-only peer"
                                    disabled={isUpdating}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Payment Updates</p>
                                <p className="text-sm text-gray-600">Notify about payment status changes</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notificationSettings.paymentNotif}
                                    onChange={(e) => setNotificationSettings({ ...notificationSettings, paymentNotif: e.target.checked })}
                                    className="sr-only peer"
                                    disabled={isUpdating}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Shipment Tracking</p>
                                <p className="text-sm text-gray-600">Notify about shipment status updates</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notificationSettings.shipmentNotif}
                                    onChange={(e) => setNotificationSettings({ ...notificationSettings, shipmentNotif: e.target.checked })}
                                    className="sr-only peer"
                                    disabled={isUpdating}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                            </label>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <Button 
                        variant="primary" 
                        size="lg" 
                        onClick={handleSaveNotifications}
                        disabled={isUpdating || (isLoading && !settings)}
                    >
                        {isUpdating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Notification Settings
                            </>
                        )}
                    </Button>
                </div>
            </div> */}

            {/* Security Settings - Reset Password */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-5 h-5 text-primary-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.currentPassword ? "text" : "password"}
                                value={passwordForm.currentPassword}
                                onChange={(e) => {
                                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                                    if (passwordErrors.currentPassword) {
                                        setPasswordErrors({ ...passwordErrors, currentPassword: '' });
                                    }
                                }}
                                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 ${
                                    passwordErrors.currentPassword
                                        ? 'border-red-300 focus:ring-red-500'
                                        : 'border-gray-300 focus:ring-primary-500'
                                }`}
                                disabled={isResettingPassword}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, currentPassword: !showPasswords.currentPassword })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                disabled={isResettingPassword}
                            >
                                {showPasswords.currentPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        {passwordErrors.currentPassword && (
                            <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.newPassword ? "text" : "password"}
                                value={passwordForm.newPassword}
                                onChange={(e) => {
                                    setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                                    if (passwordErrors.newPassword) {
                                        setPasswordErrors({ ...passwordErrors, newPassword: '' });
                                    }
                                    // Clear confirm password error if passwords now match
                                    if (passwordErrors.confirmPassword && e.target.value === passwordForm.confirmPassword) {
                                        setPasswordErrors({ ...passwordErrors, confirmPassword: '' });
                                    }
                                }}
                                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 ${
                                    passwordErrors.newPassword
                                        ? 'border-red-300 focus:ring-red-500'
                                        : 'border-gray-300 focus:ring-primary-500'
                                }`}
                                disabled={isResettingPassword}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, newPassword: !showPasswords.newPassword })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                disabled={isResettingPassword}
                            >
                                {showPasswords.newPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        {passwordErrors.newPassword && (
                            <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
                        )}
                        <p className="mt-1 text-sm text-gray-500">Minimum 8 characters</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.confirmPassword ? "text" : "password"}
                                value={passwordForm.confirmPassword}
                                onChange={(e) => {
                                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                                    if (passwordErrors.confirmPassword) {
                                        setPasswordErrors({ ...passwordErrors, confirmPassword: '' });
                                    }
                                }}
                                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 ${
                                    passwordErrors.confirmPassword
                                        ? 'border-red-300 focus:ring-red-500'
                                        : 'border-gray-300 focus:ring-primary-500'
                                }`}
                                disabled={isResettingPassword}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, confirmPassword: !showPasswords.confirmPassword })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                disabled={isResettingPassword}
                            >
                                {showPasswords.confirmPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        {passwordErrors.confirmPassword && (
                            <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button 
                            variant="primary" 
                            size="lg" 
                            onClick={handleResetPassword}
                            disabled={isResettingPassword}
                        >
                            {isResettingPassword ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Resetting Password...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Reset Password
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
