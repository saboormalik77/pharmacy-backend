'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useRef } from 'react';
import { Save, Shield, Globe, Loader2, Eye, EyeOff, Warehouse, Building2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchSettings, updateWarehouseAddress, updateBusinessSettings, uploadLogo, resetPassword } from '@/lib/store/settingsSlice';

export default function SettingsPage() {
    const dispatch = useAppDispatch();
    const { settings, isLoading, isUpdating, isResettingPassword, error } = useAppSelector((state) => state.settings);
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    const [businessForm, setBusinessForm] = useState({ businessName: '' });
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [warehouseForm, setWarehouseForm] = useState({
        warehouseName: '',
        warehouseStreet: '',
        warehouseCity: '',
        warehouseState: '',
        warehouseZip: '',
        warehouseCountry: 'US',
        warehousePhone: '',
        warehouseContactName: '',
    });

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

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchSettings());
        }
    }, [dispatch, isAuthenticated]);

    useEffect(() => {
        if (settings) {
            setBusinessForm({ businessName: settings.businessName || '' });
            setLogoPreview(settings.logoUrl || null);
            setWarehouseForm({
                warehouseName: settings.warehouseName || '',
                warehouseStreet: settings.warehouseStreet || '',
                warehouseCity: settings.warehouseCity || '',
                warehouseState: settings.warehouseState || '',
                warehouseZip: settings.warehouseZip || '',
                warehouseCountry: settings.warehouseCountry || 'US',
                warehousePhone: settings.warehousePhone || '',
                warehouseContactName: settings.warehouseContactName || '',
            });
        }
    }, [settings]);

    useEffect(() => {
        if (error) showToast(error, 'error');
    }, [error]);

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoPreview(URL.createObjectURL(file));
        setIsUploadingLogo(true);
        try {
            const result = await dispatch(uploadLogo(file));
            if (uploadLogo.fulfilled.match(result)) {
                showToast('Logo uploaded successfully!', 'success');
            } else {
                showToast(result.payload as string || 'Failed to upload logo', 'error');
                setLogoPreview(settings?.logoUrl || null);
            }
        } catch {
            showToast('An unexpected error occurred', 'error');
            setLogoPreview(settings?.logoUrl || null);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleSaveBusinessSettings = async () => {
        try {
            const result = await dispatch(updateBusinessSettings({ businessName: businessForm.businessName }));
            if (updateBusinessSettings.fulfilled.match(result)) {
                showToast('Business settings updated successfully!', 'success');
            } else {
                showToast(result.payload as string || 'Failed to update business settings', 'error');
            }
        } catch {
            showToast('An unexpected error occurred', 'error');
        }
    };

    const handleSaveWarehouseAddress = async () => {
        try {
            const result = await dispatch(updateWarehouseAddress(warehouseForm));
            if (updateWarehouseAddress.fulfilled.match(result)) {
                showToast('Warehouse address updated successfully!', 'success');
            } else {
                showToast(result.payload as string || 'Failed to update warehouse address', 'error');
            }
        } catch {
            showToast('An unexpected error occurred', 'error');
        }
    };

    const validatePasswordForm = (): boolean => {
        const errors = { currentPassword: '', newPassword: '', confirmPassword: '' };
        let isValid = true;
        if (!passwordForm.currentPassword) { errors.currentPassword = 'Current password is required'; isValid = false; }
        if (!passwordForm.newPassword) { errors.newPassword = 'New password is required'; isValid = false; }
        else if (passwordForm.newPassword.length < 8) { errors.newPassword = 'Password must be at least 8 characters'; isValid = false; }
        if (!passwordForm.confirmPassword) { errors.confirmPassword = 'Please confirm your password'; isValid = false; }
        else if (passwordForm.newPassword !== passwordForm.confirmPassword) { errors.confirmPassword = 'Passwords do not match'; isValid = false; }
        setPasswordErrors(errors);
        return isValid;
    };

    const handleResetPassword = async () => {
        setPasswordErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
        if (!validatePasswordForm()) return;
        try {
            const result = await dispatch(resetPassword(passwordForm));
            if (resetPassword.fulfilled.match(result)) {
                showToast('Password reset successfully!', 'success');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                showToast(result.payload as string || 'Failed to reset password', 'error');
            }
        } catch {
            showToast('An unexpected error occurred', 'error');
        }
    };

    return (
        <PermissionGate permission="settings">
        <div className="space-y-3">
            <div>
                <h1 className="text-lg font-bold text-gray-900">Settings</h1>
                <p className="text-xs text-gray-500">Manage system configuration and preferences</p>
            </div>

            {/* General Settings */}
            <div className="bg-white rounded-lg shadow px-4 py-3">
                <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-primary-500" />
                    <h2 className="text-sm font-semibold text-gray-900">General Settings</h2>
                </div>
                {isLoading && !settings ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-500 mr-2" />
                        <p className="text-xs text-gray-500">Loading settings...</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Site Name</label>
                            <input type="text" value={settings?.siteName || ''} readOnly className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Site Email</label>
                            <input type="email" value={settings?.siteEmail || ''} readOnly className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed" />
                        </div>
                    </div>
                )}
            </div>

            {/* Business Settings */}
            <div className="bg-white rounded-lg shadow px-4 py-3">
                <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-primary-500" />
                    <h2 className="text-sm font-semibold text-gray-900">Business Settings</h2>
                </div>

                {isLoading && !settings ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-500 mr-2" />
                        <p className="text-xs text-gray-500">Loading settings...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Logo Upload */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Company Logo</label>
                            <div className="flex items-start gap-5">
                                {/* Preview box */}
                                <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                                    {isUploadingLogo ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
                                            <span className="text-[10px] text-gray-400">Uploading...</span>
                                        </div>
                                    ) : logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-gray-300">
                                            <ImagePlus className="w-8 h-8" />
                                            <span className="text-[10px]">No logo</span>
                                        </div>
                                    )}
                                </div>

                                {/* Upload controls */}
                                <div className="flex flex-col gap-2 justify-center h-32">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        className="hidden"
                                        id="logo-upload"
                                    />
                                    <label htmlFor="logo-upload" className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors ${isUploadingLogo ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                                        <ImagePlus className="w-4 h-4" />
                                        {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                    </label>
                                    <p className="text-[11px] text-gray-400">PNG, JPG, SVG up to 5MB</p>
                                </div>
                            </div>
                        </div>

                        {/* Business Name */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Business Name</label>
                            <input
                                type="text"
                                value={businessForm.businessName}
                                onChange={(e) => setBusinessForm({ businessName: e.target.value })}
                                placeholder="Enter your business name"
                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                disabled={isUpdating}
                            />
                        </div>

                        <div className="flex justify-end pt-1">
                            <Button variant="primary" size="sm" onClick={handleSaveBusinessSettings} disabled={isUpdating || isUploadingLogo}>
                                {isUpdating ? (
                                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</>
                                ) : (
                                    <><Save className="w-3.5 h-3.5 mr-1.5" />Save Business Settings</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Warehouse / Shipping Address */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Warehouse className="w-5 h-5 text-primary-500" />
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Warehouse / Shipping Address</h2>
                        <p className="text-sm text-gray-500">All pharmacy returns are shipped to this address via FedEx</p>
                    </div>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name</label>
                                <input
                                    type="text"
                                    value={warehouseForm.warehouseName}
                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseName: e.target.value })}
                                    placeholder="e.g. FCR Returns Warehouse"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={isUpdating}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                                <input
                                    type="text"
                                    value={warehouseForm.warehouseContactName}
                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseContactName: e.target.value })}
                                    placeholder="Receiving Department"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={isUpdating}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                            <input
                                type="text"
                                value={warehouseForm.warehouseStreet}
                                onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseStreet: e.target.value })}
                                placeholder="123 Warehouse Blvd"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                disabled={isUpdating}
                            />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input
                                    type="text"
                                    value={warehouseForm.warehouseCity}
                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseCity: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={isUpdating}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                <input
                                    type="text"
                                    value={warehouseForm.warehouseState}
                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseState: e.target.value.toUpperCase().slice(0, 2) })}
                                    placeholder="TX"
                                    maxLength={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={isUpdating}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                                <input
                                    type="text"
                                    value={warehouseForm.warehouseZip}
                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseZip: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                                    placeholder="75001"
                                    maxLength={5}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={isUpdating}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                <input
                                    type="text"
                                    value={warehouseForm.warehouseCountry}
                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseCountry: e.target.value.toUpperCase().slice(0, 2) })}
                                    maxLength={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={isUpdating}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                value={warehouseForm.warehousePhone}
                                onChange={(e) => {
                                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setWarehouseForm({ ...warehouseForm, warehousePhone: cleaned });
                                }}
                                placeholder="4695557890"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 md:w-1/2"
                                disabled={isUpdating}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSaveWarehouseAddress}
                                disabled={isUpdating || (isLoading && !settings)}
                            >
                                {isUpdating ? (
                                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</>
                                ) : (
                                    <><Save className="w-3.5 h-3.5 mr-1.5" />Save Warehouse Address</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Security Settings - Reset Password */}
            <div className="bg-white rounded-lg shadow px-4 py-3">
                <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-primary-500" />
                    <h2 className="text-sm font-semibold text-gray-900">Security Settings</h2>
                </div>

                <div className="space-y-2.5 max-w-md">
                    {[
                        { key: 'currentPassword' as const, label: 'Current Password', hint: '' },
                        { key: 'newPassword' as const, label: 'New Password', hint: 'Minimum 8 characters' },
                        { key: 'confirmPassword' as const, label: 'Confirm New Password', hint: '' },
                    ].map(({ key, label, hint }) => (
                        <div key={key}>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">{label}</label>
                            <div className="relative">
                                <input
                                    type={showPasswords[key] ? 'text' : 'password'}
                                    value={passwordForm[key]}
                                    onChange={(e) => {
                                        setPasswordForm({ ...passwordForm, [key]: e.target.value });
                                        if (passwordErrors[key]) setPasswordErrors({ ...passwordErrors, [key]: '' });
                                        if (key === 'newPassword' && passwordErrors.confirmPassword && e.target.value === passwordForm.confirmPassword) {
                                            setPasswordErrors(prev => ({ ...prev, confirmPassword: '' }));
                                        }
                                    }}
                                    className={`w-full px-2.5 py-1.5 pr-8 text-xs border rounded focus:outline-none focus:ring-1 ${
                                        passwordErrors[key] ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
                                    }`}
                                    disabled={isResettingPassword}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, [key]: !showPasswords[key] })}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    disabled={isResettingPassword}
                                >
                                    {showPasswords[key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            {passwordErrors[key] && <p className="mt-0.5 text-[10px] text-red-600">{passwordErrors[key]}</p>}
                            {hint && !passwordErrors[key] && <p className="mt-0.5 text-[10px] text-gray-400">{hint}</p>}
                        </div>
                    ))}

                    <div className="flex justify-end pt-1">
                        <Button variant="primary" size="sm" onClick={handleResetPassword} disabled={isResettingPassword}>
                            {isResettingPassword ? (
                                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Resetting...</>
                            ) : (
                                <><Save className="w-3.5 h-3.5 mr-1.5" />Reset Password</>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
        </PermissionGate>
    );
}
