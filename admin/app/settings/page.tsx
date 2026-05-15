'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useRef } from 'react';
import { Save, Shield, Globe, Loader2, Eye, EyeOff, Warehouse, Building2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchSettings, updateWarehouseAddress, updateBusinessSettings, uploadLogo, resetPassword } from '@/lib/store/settingsSlice';
import { validateUSPhoneOptional, validateZipCodeOptional, validatePassword, validatePasswordMatch, formatPhoneNumber } from '@/lib/validation';

export default function SettingsPage() {
    const dispatch = useAppDispatch();
    const { settings, isLoading, isUpdating, isResettingPassword, error } = useAppSelector((state) => state.settings);
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);
    
    // Check if user is MainAdmin (buying_group_id is null) or buying group admin
    const isMainAdmin = user?.buying_group_id === null;
    const isBuyingGroupAdmin = user?.buying_group_id !== null;
    const isProcessor = user?.role === 'processor';

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

    const [warehouseErrors, setWarehouseErrors] = useState<Record<string, string>>({});

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
        if (isAuthenticated && !isProcessor) {
            dispatch(fetchSettings());
        }
    }, [dispatch, isAuthenticated, isProcessor]);

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
        const newErrors: Record<string, string> = {};
        const phoneResult = validateUSPhoneOptional(warehouseForm.warehousePhone);
        if (!phoneResult.valid) newErrors.warehousePhone = phoneResult.error!;
        const zipResult = validateZipCodeOptional(warehouseForm.warehouseZip);
        if (!zipResult.valid) newErrors.warehouseZip = zipResult.error!;
        setWarehouseErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
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
        if (!passwordForm.currentPassword) { errors.currentPassword = 'Current password is required.'; isValid = false; }
        const pwResult = validatePassword(passwordForm.newPassword);
        if (!pwResult.valid) { errors.newPassword = pwResult.error!; isValid = false; }
        const matchResult = validatePasswordMatch(passwordForm.newPassword, passwordForm.confirmPassword);
        if (!matchResult.valid) { errors.confirmPassword = matchResult.error!; isValid = false; }
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

    // Processors get a simplified settings page without permission gate
    if (isProcessor) {
        return (
            <div className="space-y-6 p-8">
                <div>
                    <h1 className="text-xl font-medium text-gray-900" style={{ fontFamily: 'var(--font-newsreader), serif' }}>Settings</h1>
                    <p className="text-xs text-gray-500 mt-1">Manage your account settings</p>
                </div>

                {/* Profile Info for Processor */}
                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] px-6 py-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Building2 className="w-5 h-5 text-[#516057]" />
                        <h2 className="text-base font-semibold text-gray-900">Profile Information</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                            <input type="text" value={user?.name || ''} readOnly className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] bg-gray-50 text-gray-600 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" value={user?.email || ''} readOnly className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] bg-gray-50 text-gray-600 cursor-not-allowed" />
                        </div>
                    </div>
                </div>

                {/* Security Settings - Reset Password */}
                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] px-6 py-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-[#516057]" />
                        <h2 className="text-base font-semibold text-gray-900">Security Settings</h2>
                    </div>

                    <div className="space-y-4 max-w-md">
                        {[
                            { key: 'currentPassword' as const, label: 'Current Password', hint: '' },
                            { key: 'newPassword' as const, label: 'New Password', hint: 'Minimum 8 characters' },
                            { key: 'confirmPassword' as const, label: 'Confirm New Password', hint: '' },
                        ].map(({ key, label, hint }) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
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
                                        className={`w-full px-4 py-3 pr-10 text-base border rounded-[4px] focus:outline-none focus:ring-2 ${
                                            passwordErrors[key] ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-[#516057]'
                                        }`}
                                        disabled={isResettingPassword}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, [key]: !showPasswords[key] })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        disabled={isResettingPassword}
                                    >
                                        {showPasswords[key] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {passwordErrors[key] && <p className="mt-1 text-sm text-red-600">{passwordErrors[key]}</p>}
                                {hint && !passwordErrors[key] && <p className="mt-1 text-sm text-gray-400">{hint}</p>}
                            </div>
                        ))}

                        <div className="flex justify-end pt-2">
                            <Button variant="primary" size="md" onClick={handleResetPassword} disabled={isResettingPassword}>
                                {isResettingPassword ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</>
                                ) : (
                                    <><Save className="w-4 h-4 mr-2" />Reset Password</>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                <ToastContainer toasts={toasts} onClose={removeToast} />
            </div>
        );
    }

    return (
        <PermissionGate permission="settings">
        <div className="space-y-6 p-8">
            <div>
                <h1 className="text-xl font-medium text-gray-900" style={{ fontFamily: 'var(--font-newsreader), serif' }}>Settings</h1>
                <p className="text-xs text-gray-500 mt-1">
                    {isMainAdmin 
                        ? "Manage system configuration and preferences" 
                        : "Manage your business profile and security settings"
                    }
                </p>
            </div>

            {/* Info message for buying group admins - removed heading per requirements */}
            {isBuyingGroupAdmin && !isProcessor && (
                <div className="bg-[#f5f2f1] border border-[#e2e2e2] rounded-[4px] p-5">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center mt-0.5">
                            <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-blue-700">
                                You can manage your business profile (company name and logo) and security settings. 
                                System-wide settings are managed by the platform administrator.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* General Settings - Only visible to MainAdmin */}
            {isMainAdmin && (
                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] px-6 py-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Globe className="w-5 h-5 text-[#516057]" />
                        <h2 className="text-base font-semibold text-gray-900">General Settings</h2>
                    </div>
                    {isLoading && !settings ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-[#516057] mr-3" />
                            <p className="text-base text-gray-500">Loading settings...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                                <input type="text" value={settings?.siteName || ''} readOnly className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] bg-gray-50 text-gray-600 cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Site Email</label>
                                <input type="email" value={settings?.siteEmail || ''} readOnly className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] bg-gray-50 text-gray-600 cursor-not-allowed" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Business Settings */}
            <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-[#516057]" />
                    <h2 className="text-base font-semibold text-gray-900">Business Settings</h2>
                </div>

                {isLoading && !settings ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-[#516057] mr-3" />
                        <p className="text-base text-gray-500">Loading settings...</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Logo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Company Logo</label>
                            <div className="flex items-start gap-6">
                                {/* Preview box */}
                                <div className="relative w-40 h-40 border-2 border-dashed border-gray-300 rounded-[4px]-xl flex flex-col items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                                    {isUploadingLogo ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-8 h-8 animate-spin text-[#516057]" />
                                            <span className="text-xs text-gray-400">Uploading...</span>
                                        </div>
                                    ) : logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-3" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-gray-300">
                                            <ImagePlus className="w-10 h-10" />
                                            <span className="text-xs">No logo</span>
                                        </div>
                                    )}
                                </div>

                                {/* Upload controls */}
                                <div className="flex flex-col gap-3 justify-center h-40">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        className="hidden"
                                        id="logo-upload"
                                    />
                                    <label htmlFor="logo-upload" className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-base font-medium rounded-[4px] border border-gray-300 text-gray-700 cursor-pointer hover:bg-gray-50 transition-all ${isUploadingLogo ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                                        <ImagePlus className="w-5 h-5" />
                                        {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                    </label>
                                    <p className="text-sm text-gray-400">PNG, JPG, SVG up to 5MB</p>
                                </div>
                            </div>
                        </div>

                        {/* Business Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                            <input
                                type="text"
                                value={businessForm.businessName}
                                onChange={(e) => setBusinessForm({ businessName: e.target.value })}
                                placeholder="Enter your business name"
                                className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                                disabled={isUpdating}
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button variant="primary" size="md" onClick={handleSaveBusinessSettings} disabled={isUpdating || isUploadingLogo}>
                                {isUpdating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                                ) : (
                                    <><Save className="w-4 h-4 mr-2" />Save Business Settings</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Warehouse / Shipping Address - Only visible to MainAdmin */}
            {isMainAdmin && (
                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] px-6 py-5">
                    <div className="flex items-center gap-3 mb-5">
                        <Warehouse className="w-5 h-5 text-[#516057]" />
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Warehouse / Shipping Address</h2>
                            <p className="text-sm text-gray-500">All pharmacy returns are shipped to this address via FedEx</p>
                        </div>
                    </div>

                    {isLoading && !settings ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-[#516057]" />
                                <p className="text-base text-gray-600">Loading settings...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse Name</label>
                                    <input
                                        type="text"
                                        value={warehouseForm.warehouseName}
                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseName: e.target.value })}
                                        placeholder="e.g. FCR Returns Warehouse"
                                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                                        disabled={isUpdating}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                                    <input
                                        type="text"
                                        value={warehouseForm.warehouseContactName}
                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseContactName: e.target.value })}
                                        placeholder="Receiving Department"
                                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                                        disabled={isUpdating}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                                <input
                                    type="text"
                                    value={warehouseForm.warehouseStreet}
                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseStreet: e.target.value })}
                                    placeholder="123 Warehouse Blvd"
                                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                                    disabled={isUpdating}
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                    <input
                                        type="text"
                                        value={warehouseForm.warehouseCity}
                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseCity: e.target.value })}
                                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                                        disabled={isUpdating}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                                    <input
                                        type="text"
                                        value={warehouseForm.warehouseState}
                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseState: e.target.value.toUpperCase().slice(0, 2) })}
                                        placeholder="TX"
                                        maxLength={2}
                                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                                        disabled={isUpdating}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                                    <input
                                        type="text"
                                        value={warehouseForm.warehouseZip}
                                        onChange={(e) => { setWarehouseForm({ ...warehouseForm, warehouseZip: e.target.value.replace(/\D/g, '').slice(0, 5) }); setWarehouseErrors(prev => ({ ...prev, warehouseZip: '' })); }}
                                        placeholder="75001"
                                        maxLength={5}
                                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                                        disabled={isUpdating}
                                    />
                                    {warehouseErrors.warehouseZip && <p className="text-xs text-red-500 mt-1">{warehouseErrors.warehouseZip}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                                    <input
                                        type="text"
                                        value={warehouseForm.warehouseCountry}
                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouseCountry: e.target.value.toUpperCase().slice(0, 2) })}
                                        maxLength={2}
                                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                                        disabled={isUpdating}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={warehouseForm.warehousePhone}
                                    onChange={(e) => {
                                        setWarehouseForm({ ...warehouseForm, warehousePhone: formatPhoneNumber(e.target.value) });
                                        setWarehouseErrors(prev => ({ ...prev, warehousePhone: '' }));
                                    }}
                                    placeholder="(469) 555-7890"
                                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent md:w-1/2"
                                    disabled={isUpdating}
                                />
                                {warehouseErrors.warehousePhone && <p className="text-xs text-red-500 mt-1">{warehouseErrors.warehousePhone}</p>}
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button
                                    variant="primary"
                                    size="md"
                                    onClick={handleSaveWarehouseAddress}
                                    disabled={isUpdating || (isLoading && !settings)}
                                >
                                    {isUpdating ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                                    ) : (
                                        <><Save className="w-4 h-4 mr-2" />Save Warehouse Address</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Security Settings - Reset Password */}
            <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-[#516057]" />
                    <h2 className="text-base font-semibold text-gray-900">Security Settings</h2>
                </div>

                <div className="space-y-4 max-w-md">
                    {[
                        { key: 'currentPassword' as const, label: 'Current Password', hint: '' },
                        { key: 'newPassword' as const, label: 'New Password', hint: 'Minimum 8 characters' },
                        { key: 'confirmPassword' as const, label: 'Confirm New Password', hint: '' },
                    ].map(({ key, label, hint }) => (
                        <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
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
                                    className={`w-full px-4 py-3 pr-10 text-base border rounded-[4px] focus:outline-none focus:ring-2 ${
                                        passwordErrors[key] ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-[#516057]'
                                    }`}
                                    disabled={isResettingPassword}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, [key]: !showPasswords[key] })}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    disabled={isResettingPassword}
                                >
                                    {showPasswords[key] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {passwordErrors[key] && <p className="mt-1 text-sm text-red-600">{passwordErrors[key]}</p>}
                            {hint && !passwordErrors[key] && <p className="mt-1 text-sm text-gray-400">{hint}</p>}
                        </div>
                    ))}

                    <div className="flex justify-end pt-2">
                        <Button variant="primary" size="md" onClick={handleResetPassword} disabled={isResettingPassword}>
                            {isResettingPassword ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" />Reset Password</>
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
