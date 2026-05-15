"use client";

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  CreditCard, 
  Bell, 
  Shield, 
  Key, 
  Save,
  Edit,
  CheckCircle,
  AlertCircle,
  Info,
  Settings as SettingsIcon,
  DollarSign,
  Eye,
  EyeOff,
  Store,
  Calendar,
  Truck,
  AlertTriangle,
  Lock,
  Upload
} from 'lucide-react';
import { settingsService, fcrStoreSettingsService } from '@/lib/api/services';
import type { FcrStoreSettings, UpdateFcrStoreSettings } from '@/lib/api/services';
import { getUserData, setUserData } from '@/lib/utils/cookies';
import { US_STATES } from '@/lib/constants/usStates';
import {
  validateEmail,
  validateUSPhone,
  validateZipCode,
  validateNPI,
  validateDEAOptional,
  validatePassword as libValidatePassword,
  validatePasswordMatch,
  formatPhoneNumber,
} from '@/lib/validation';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'billing' | 'security' | 'store'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    pharmacyName: '',
    npiNumber: '',
    deaNumber: '',
    stateLicenseNumber: '',
    licenseExpiryDate: '',
    corporateName: '',
    mailingAddress: '',
    storeHours: '',
    deaFileUrl: '',
    licenseFileUrl: '',
    physicalAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
    },
  });

  const [originalProfile, setOriginalProfile] = useState(profile);

  // Document upload state
  const [uploadingDea, setUploadingDea] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const deaFileRef = useRef<HTMLInputElement>(null);
  const licenseFileRef = useRef<HTMLInputElement>(null);

  // Password change form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [notifications, setNotifications] = useState({
    email: {
      creditReceived: true,
      shipmentUpdates: true,
      orderStatus: true,
      systemAlerts: true,
      expirationWarnings: true,
    },
    inApp: {
      creditReceived: true,
      shipmentUpdates: true,
      orderStatus: true,
      systemAlerts: true,
      expirationWarnings: true,
    },
    sms: {
      creditReceived: false,
      shipmentUpdates: false,
      orderStatus: false,
      systemAlerts: true,
      expirationWarnings: true,
    },
  });

  const [billing, setBilling] = useState({
    paymentMethod: 'Credit Card',
    cardNumber: '**** **** **** 4242',
    expiryDate: '12/25',
    billingAddress: {
      street: '123 Main Street',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
  });

  // FCR Store Settings state
  const [storeSettings, setStoreSettings] = useState<FcrStoreSettings | null>(null);
  const [originalStoreSettings, setOriginalStoreSettings] = useState<FcrStoreSettings | null>(null);
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [loadingStoreSettings, setLoadingStoreSettings] = useState(false);
  const [savingStoreSettings, setSavingStoreSettings] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeSaved, setStoreSaved] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoadingSettings(true);
        const settings = await settingsService.getSettings();
        
        const transformedProfile = {
          name: settings.name || '',
          email: settings.email || '',
          phone: settings.phone || '',
          pharmacyName: settings.pharmacyName || '',
          npiNumber: settings.npiNumber || '',
          deaNumber: settings.deaNumber || '',
          stateLicenseNumber: settings.stateLicenseNumber || '',
          licenseExpiryDate: settings.licenseExpiryDate || '',
          corporateName: settings.corporateName || '',
          mailingAddress: settings.mailingAddress || '',
          storeHours: settings.storeHours || '',
          deaFileUrl: settings.deaFileUrl || '',
          licenseFileUrl: settings.licenseFileUrl || '',
          physicalAddress: {
            street: settings.physicalAddress?.street || '',
            city: settings.physicalAddress?.city || '',
            state: settings.physicalAddress?.state || '',
            zip: settings.physicalAddress?.zip || '',
          },
        };
        
        setProfile(transformedProfile);
        setOriginalProfile(transformedProfile);
      } catch (err: any) {
        setError(err.message || 'Failed to load settings');
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
  }, []);

  // Also fetch store settings on mount for profile tab display
  useEffect(() => {
    if (storeSettings) return;

    const fetchStoreSettings = async () => {
      try {
        setLoadingStoreSettings(true);
        setStoreError(null);
        const settings = await fcrStoreSettingsService.getStoreSettings();
        setStoreSettings(settings);
        setOriginalStoreSettings(settings);
      } catch (err: any) {
        setStoreError(err.message || 'Failed to load store settings');
      } finally {
        setLoadingStoreSettings(false);
      }
    };

    fetchStoreSettings();
  }, [storeSettings]);

  const getChangedFields = () => {
    const changes: any = {};
    
    if (profile.name !== originalProfile.name) changes.name = profile.name;
    if (profile.email !== originalProfile.email) changes.email = profile.email;
    if (profile.phone !== originalProfile.phone) changes.phone = profile.phone;
    if (profile.pharmacyName !== originalProfile.pharmacyName) changes.pharmacyName = profile.pharmacyName;
    if (profile.npiNumber !== originalProfile.npiNumber) changes.npiNumber = profile.npiNumber;
    if (profile.deaNumber !== originalProfile.deaNumber) changes.deaNumber = profile.deaNumber;
    if (profile.stateLicenseNumber !== originalProfile.stateLicenseNumber) changes.stateLicenseNumber = profile.stateLicenseNumber;
    if (profile.licenseExpiryDate !== originalProfile.licenseExpiryDate) changes.licenseExpiryDate = profile.licenseExpiryDate;
    if (profile.corporateName !== originalProfile.corporateName) changes.corporateName = profile.corporateName;
    if (profile.mailingAddress !== originalProfile.mailingAddress) changes.mailingAddress = profile.mailingAddress;
    if (profile.storeHours !== originalProfile.storeHours) changes.storeHours = profile.storeHours;
    
    const physicalAddressChanges: any = {};
    if (profile.physicalAddress.street !== originalProfile.physicalAddress.street) physicalAddressChanges.street = profile.physicalAddress.street;
    if (profile.physicalAddress.city !== originalProfile.physicalAddress.city) physicalAddressChanges.city = profile.physicalAddress.city;
    if (profile.physicalAddress.state !== originalProfile.physicalAddress.state) physicalAddressChanges.state = profile.physicalAddress.state;
    if (profile.physicalAddress.zip !== originalProfile.physicalAddress.zip) physicalAddressChanges.zip = profile.physicalAddress.zip;
    
    if (Object.keys(physicalAddressChanges).length > 0) {
      changes.physicalAddress = physicalAddressChanges;
    }
    
    return changes;
  };

  const validateProfile = (): boolean => {
    const newErrors: Record<string, string> = {};

    const emailResult = validateEmail(profile.email);
    if (!emailResult.valid) newErrors.email = emailResult.error!;

    const phoneResult = validateUSPhone(profile.phone);
    if (!phoneResult.valid) newErrors.phone = phoneResult.error!;

    const zipResult = validateZipCode(profile.physicalAddress.zip);
    if (!zipResult.valid) newErrors.zip = zipResult.error!;

    if (profile.npiNumber) {
      const npiResult = validateNPI(profile.npiNumber);
      if (!npiResult.valid) newErrors.npiNumber = npiResult.error!;
    }

    if (profile.deaNumber) {
      const deaResult = validateDEAOptional(profile.deaNumber);
      if (!deaResult.valid) newErrors.deaNumber = deaResult.error!;
    }

    setProfileErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateProfile()) return;

    try {
      setLoading(true);
      setError(null);

      const changedFields = getChangedFields();
      
      if (Object.keys(changedFields).length === 0) {
        setIsEditing(false);
        return;
      }
      
      const updatedSettings = await settingsService.updateProfile(changedFields);
      
      const transformedProfile = {
        name: updatedSettings.name || profile.name,
        email: updatedSettings.email || profile.email,
        phone: updatedSettings.phone || profile.phone,
        pharmacyName: updatedSettings.pharmacyName || profile.pharmacyName,
        npiNumber: updatedSettings.npiNumber || profile.npiNumber,
        deaNumber: updatedSettings.deaNumber || profile.deaNumber,
        stateLicenseNumber: updatedSettings.stateLicenseNumber || profile.stateLicenseNumber,
        licenseExpiryDate: updatedSettings.licenseExpiryDate || profile.licenseExpiryDate,
        corporateName: updatedSettings.corporateName || profile.corporateName,
        mailingAddress: updatedSettings.mailingAddress || profile.mailingAddress,
        storeHours: updatedSettings.storeHours || profile.storeHours,
        deaFileUrl: updatedSettings.deaFileUrl || profile.deaFileUrl,
        licenseFileUrl: updatedSettings.licenseFileUrl || profile.licenseFileUrl,
        physicalAddress: {
          street: updatedSettings.physicalAddress?.street || profile.physicalAddress.street,
          city: updatedSettings.physicalAddress?.city || profile.physicalAddress.city,
          state: updatedSettings.physicalAddress?.state || profile.physicalAddress.state,
          zip: updatedSettings.physicalAddress?.zip || profile.physicalAddress.zip,
        },
      };
      
      setProfile(transformedProfile);
      setOriginalProfile(transformedProfile);
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      const currentUserData = getUserData();
      if (currentUserData?.user) {
        const updatedUserData = {
          ...currentUserData,
          user: {
            ...currentUserData.user,
            name: updatedSettings.name || currentUserData.user.name,
            pharmacy_name: updatedSettings.pharmacyName || currentUserData.user.pharmacy_name,
            phone: updatedSettings.phone || currentUserData.user.phone,
          },
        };
        setUserData(updatedUserData);
        window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: updatedUserData }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setProfile(originalProfile);
    setIsEditing(false);
    setError(null);
    setProfileErrors({});
  };

  // Document upload handlers
  const handleDocumentUpload = async (type: 'dea' | 'license', file: File) => {
    const setUploading = type === 'dea' ? setUploadingDea : setUploadingLicense;
    try {
      setUploading(true);
      setError(null);
      const result = await settingsService.uploadDocument(type, file);
      setProfile(prev => ({
        ...prev,
        [type === 'dea' ? 'deaFileUrl' : 'licenseFileUrl']: result.url,
      }));
      setOriginalProfile(prev => ({
        ...prev,
        [type === 'dea' ? 'deaFileUrl' : 'licenseFileUrl']: result.url,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || `Failed to upload ${type === 'dea' ? 'DEA' : 'license'} document`);
    } finally {
      setUploading(false);
    }
  };

  const validatePassword = (password: string): string | null => {
    const result = libValidatePassword(password);
    return result.valid ? null : result.error;
  };

  const handleChangePassword = async () => {
    try {
      setError(null);
      setPasswordError(null);

      if (!passwordData.currentPassword) {
        setError('Please enter your current password');
        return;
      }

      if (!passwordData.newPassword) {
        setError('Please enter a new password');
        return;
      }

      const newPassResult = libValidatePassword(passwordData.newPassword);
      if (!newPassResult.valid) {
        setPasswordError(newPassResult.error);
        setError(newPassResult.error);
        return;
      }

      const matchResult = validatePasswordMatch(passwordData.newPassword, passwordData.confirmPassword);
      if (!matchResult.valid) {
        setError(matchResult.error);
        setPasswordError(matchResult.error);
        return;
      }

      setLoading(true);
      setError(null);
      setPasswordError(null);
      
      await settingsService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to change password';
      setError(errorMessage);
      setPasswordError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (field: 'newPassword' | 'confirmPassword', value: string) => {
    const updatedData = { ...passwordData, [field]: value };
    setPasswordData(updatedData);
    
    if (error && !passwordError) {
      setError(null);
    }

    if (field === 'newPassword') {
      if (value) {
        const validationError = validatePassword(value);
        if (validationError) {
          setPasswordError(validationError);
        } else if (updatedData.confirmPassword && value !== updatedData.confirmPassword) {
          setPasswordError('New passwords do not match');
        } else {
          setPasswordError(null);
        }
      } else {
        setPasswordError(null);
      }
    }

    if (field === 'confirmPassword') {
      if (value && updatedData.newPassword) {
        if (value !== updatedData.newPassword) {
          setPasswordError('New passwords do not match');
        } else {
          const validationError = validatePassword(updatedData.newPassword);
          setPasswordError(validationError);
        }
      } else if (!value) {
        if (updatedData.newPassword) {
          const validationError = validatePassword(updatedData.newPassword);
          setPasswordError(validationError);
        } else {
          setPasswordError(null);
        }
      }
    }
  };

  const handleStoreSettingsSave = async () => {
    if (!storeSettings || !originalStoreSettings) return;

    const updates: UpdateFcrStoreSettings = {};
    if (storeSettings.storeNumber !== originalStoreSettings.storeNumber)
      updates.storeNumber = storeSettings.storeNumber || '';
    if (storeSettings.primaryWholesaler !== originalStoreSettings.primaryWholesaler)
      updates.primaryWholesaler = storeSettings.primaryWholesaler || '';
    if (storeSettings.wholesalerAccountNumber !== originalStoreSettings.wholesalerAccountNumber)
      updates.wholesalerAccountNumber = storeSettings.wholesalerAccountNumber || '';
    if (storeSettings.secondaryWholesaler !== originalStoreSettings.secondaryWholesaler)
      updates.secondaryWholesaler = storeSettings.secondaryWholesaler || '';
    if (storeSettings.serviceType !== originalStoreSettings.serviceType)
      updates.serviceType = storeSettings.serviceType;
    if (storeSettings.deaExpirationDate !== originalStoreSettings.deaExpirationDate)
      updates.deaExpirationDate = storeSettings.deaExpirationDate || '';
    if (storeSettings.faxNumber !== originalStoreSettings.faxNumber)
      updates.faxNumber = storeSettings.faxNumber || '';
    if (storeSettings.daysBetweenVisits !== originalStoreSettings.daysBetweenVisits)
      updates.daysBetweenVisits = storeSettings.daysBetweenVisits;

    if (Object.keys(updates).length === 0) {
      setIsEditingStore(false);
      return;
    }

    try {
      setSavingStoreSettings(true);
      setStoreError(null);
      const updated = await fcrStoreSettingsService.updateStoreSettings(updates);
      setStoreSettings(updated);
      setOriginalStoreSettings(updated);
      setIsEditingStore(false);
      setStoreSaved(true);
      setTimeout(() => setStoreSaved(false), 3000);
    } catch (err: any) {
      setStoreError(err.message || 'Failed to update store settings');
    } finally {
      setSavingStoreSettings(false);
    }
  };

  const handleStoreSettingsCancel = () => {
    if (originalStoreSettings) {
      setStoreSettings({ ...originalStoreSettings });
    }
    setIsEditingStore(false);
    setStoreError(null);
  };

  const updateStoreField = (field: keyof FcrStoreSettings, value: any) => {
    if (!storeSettings) return;
    setStoreSettings({ ...storeSettings, [field]: value });
  };

  const getDeaWarningStyle = (warning: string | null) => {
    if (!warning) return null;
    if (warning.includes('expired')) {
      return { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800', icon: 'text-red-600' };
    }
    if (warning.includes('expires in')) {
      return { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', icon: 'text-yellow-600' };
    }
    return { bg: 'bg-[#f5f2f1]', border: 'border-[#e2e2e2]', text: 'text-[#505454]', icon: 'text-[#6b7280]' };
  };

  const SERVICE_TYPES = [
    { value: 'full_service', label: 'Full Service (Rep processes onsite)' },
    { value: 'self_service', label: 'Self-Service (Web)' },
    // { value: 'express', label: 'Express (Box-and-Ship)' },
  ];

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, color: 'bg-[#516057] text-white border-[#516057]' },
    { id: 'store', label: 'Store Settings', icon: Store, color: 'bg-[#516057] text-white border-[#516057]' },
    { id: 'security', label: 'Security', icon: Shield, color: 'bg-[#516057] text-white border-[#516057]' },
  ];

  return (
    <DashboardLayout>
      <PermissionGuard permission="settings:view">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between p-4 rounded-[4px] bg-gradient-to-r from-slate-50 via-gray-50 to-zinc-50 border-2 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[4px] bg-slate-100">
              <SettingsIcon className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#000000]">My Profile</h1>
              <p className="text-xs text-[#505454] mt-0.5">Please verify the information below and fill in any missing fields. The RA and shipping label will be sent to the email entered here, so please ensure it is entered correctly.</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b-2 border-[#e2e2e2] bg-white rounded-t-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setError(null);
                  setPasswordError(null);
                  setSaved(false);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-[4px] border-2 transition-all ${
                  isActive
                    ? `${tab.color} shadow-md scale-105`
                    : 'bg-white text-[#505454] border-[#e2e2e2] hover:bg-[#f5f2f1]'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {/* Edit / Save controls */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#000000]">Account Information - Verify Profile Information</h2>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="bg-[#516057] hover:bg-[#505454] text-white border-[#516057] rounded-[4px]">
                  <Edit className="mr-1 h-3 w-3" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading} className="rounded-[4px]">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={loading} className="bg-[#516057] hover:bg-[#505454] text-white border-0 rounded-[4px]">
                    <Save className="mr-1 h-3 w-3" />
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <div className="p-2 bg-red-50 border-2 border-red-200 rounded-[4px] flex items-center gap-2 text-red-800 text-xs">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {saved && (
              <div className="p-2 bg-green-50 border-2 border-green-200 rounded-[4px] flex items-center gap-2 text-green-800 text-xs">
                <CheckCircle className="h-4 w-4" />
                <span>Settings saved successfully!</span>
              </div>
            )}

            {loadingSettings ? (
              <div className="p-4 text-center text-sm text-[#505454]">Loading settings...</div>
            ) : (
            <>
            {/* LICENSE INFO */}
            <Card className="border-2 border-slate-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-base text-[#000000] mb-3">LICENSE INFO</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">DEA Number</label>
                    <div className="relative">
                      {!isEditing && <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" />}
                      <Input
                        value={profile.deaNumber}
                        onChange={(e) => {
                          setProfile({ ...profile, deaNumber: e.target.value });
                          setProfileErrors(prev => ({ ...prev, deaNumber: '' }));
                        }}
                        disabled={!isEditing}
                        className={`text-xs h-8 ${!isEditing ? 'pl-7 bg-[#f5f2f1]' : ''} ${profileErrors.deaNumber ? 'border-red-400' : ''}`}
                      />
                    </div>
                    {profileErrors.deaNumber && <p className="text-xs text-red-500 mt-1">{profileErrors.deaNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">DEA Expiration</label>
                    <Input
                      value={storeSettings?.deaExpirationDate || ''}
                      disabled
                      className="text-xs h-8 bg-[#f5f2f1]"
                    />
                    <p className="text-xs text-[#6b7280] mt-0.5">Edit in Store Settings tab</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">State Pharmacy License Number</label>
                    <div className="relative">
                      {!isEditing && <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" />}
                      <Input
                        value={profile.stateLicenseNumber}
                        onChange={(e) => setProfile({ ...profile, stateLicenseNumber: e.target.value })}
                        disabled={!isEditing}
                        className={`text-xs h-8 ${!isEditing ? 'pl-7 bg-[#f5f2f1]' : ''}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">State Pharmacy License Expiration</label>
                    <Input
                      type={isEditing ? 'date' : 'text'}
                      value={profile.licenseExpiryDate}
                      onChange={(e) => setProfile({ ...profile, licenseExpiryDate: e.target.value })}
                      disabled={!isEditing}
                      className={`text-xs h-8 ${!isEditing ? 'bg-[#f5f2f1]' : ''}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PHARMACY / FACILITY INFORMATION */}
            <Card className="border-2 border-slate-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-base text-[#000000] mb-3">PHARMACY / FACILITY INFORMATION</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">Pharmacy / Facility Name</label>
                    <Input
                      value={profile.pharmacyName}
                      onChange={(e) => setProfile({ ...profile, pharmacyName: e.target.value })}
                      disabled={!isEditing}
                      className="text-xs h-8"
                      placeholder="Enter your Pharmacy / Facility Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">Pharmacy Physical Address</label>
                    <Input
                      value={profile.physicalAddress.street}
                      onChange={(e) => setProfile({
                        ...profile,
                        physicalAddress: { ...profile.physicalAddress, street: e.target.value }
                      })}
                      disabled={!isEditing}
                      className="text-xs h-8"
                      placeholder="Enter your Pharmacy Physical Address"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">City</label>
                    <Input
                      value={profile.physicalAddress.city}
                      onChange={(e) => setProfile({
                        ...profile,
                        physicalAddress: { ...profile.physicalAddress, city: e.target.value }
                      })}
                      disabled={!isEditing}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">State</label>
                    <select
                      value={profile.physicalAddress.state}
                      onChange={(e) => setProfile({
                        ...profile,
                        physicalAddress: { ...profile.physicalAddress, state: e.target.value }
                      })}
                      disabled={!isEditing}
                      className="w-full h-8 px-2 py-1 text-xs border border-input bg-background rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select a state</option>
                      {US_STATES.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label} ({state.value})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">Zip</label>
                    <Input
                      value={profile.physicalAddress.zip}
                      onChange={(e) => {
                        setProfile({
                          ...profile,
                          physicalAddress: { ...profile.physicalAddress, zip: e.target.value }
                        });
                        setProfileErrors(prev => ({ ...prev, zip: '' }));
                      }}
                      disabled={!isEditing}
                      className={`text-xs h-8 ${profileErrors.zip ? 'border-red-400' : ''}`}
                    />
                    {profileErrors.zip && <p className="text-xs text-red-500 mt-1">{profileErrors.zip}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[#000000] mb-1">Corporate Name (If different than Pharmacy / Facility Name)</label>
                    <Input
                      value={profile.corporateName}
                      onChange={(e) => setProfile({ ...profile, corporateName: e.target.value })}
                      disabled={!isEditing}
                      className="text-xs h-8"
                      placeholder="Enter Corporate Name (If different than Pharmacy / Facility Name)"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[#000000] mb-1">Mailing Address (If different than Pharmacy Address)</label>
                    <Input
                      value={profile.mailingAddress}
                      onChange={(e) => setProfile({ ...profile, mailingAddress: e.target.value })}
                      disabled={!isEditing}
                      className="text-xs h-8"
                      placeholder="Enter Mailing Address (If different than Pharmacy Address)"
                    />
                  </div>
                  {/* <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">Buying Group</label>
                    <Input
                      value={storeSettings?.gpoAffiliation || ''}
                      disabled
                      className="text-xs h-8 bg-[#f5f2f1]"
                    />
                    <p className="text-xs text-[#6b7280] mt-0.5">Edit in Store Settings tab</p>
                  </div> */}
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">Store Hours</label>
                    <Input
                      value={profile.storeHours}
                      onChange={(e) => setProfile({ ...profile, storeHours: e.target.value })}
                      disabled={!isEditing}
                      className="text-xs h-8"
                      placeholder="e.g. M-F 9-7 Sat 10-3"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CONTACT INFORMATION */}
            <Card className="border-2 border-slate-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-base text-[#000000] mb-3">CONTACT INFORMATION</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">Full Name</label>
                    <Input
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      disabled={!isEditing}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">Email</label>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => {
                        setProfile({ ...profile, email: e.target.value });
                        setProfileErrors(prev => ({ ...prev, email: '' }));
                      }}
                      disabled={!isEditing}
                      className={`text-xs h-8 ${profileErrors.email ? 'border-red-400' : ''}`}
                    />
                    {profileErrors.email && <p className="text-xs text-red-500 mt-1">{profileErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">Phone Number</label>
                    <Input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => {
                        setProfile({ ...profile, phone: formatPhoneNumber(e.target.value) });
                        setProfileErrors(prev => ({ ...prev, phone: '' }));
                      }}
                      disabled={!isEditing}
                      className={`text-xs h-8 ${profileErrors.phone ? 'border-red-400' : ''}`}
                    />
                    {profileErrors.phone && <p className="text-xs text-red-500 mt-1">{profileErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">Fax</label>
                    <Input
                      value={storeSettings?.faxNumber || ''}
                      disabled
                      className="text-xs h-8 bg-[#f5f2f1]"
                    />
                    <p className="text-xs text-[#6b7280] mt-0.5">Edit in Store Settings tab</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* MY DOCUMENTS */}
            <Card className="border-2 border-slate-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-base text-[#000000] mb-3">MY DOCUMENTS</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-2">Upload DEA</label>
                    <div
                      className="border-2 border-dashed border-[#e2e2e2] rounded-[4px] p-6 text-center cursor-pointer hover:border-[#e2e2e2] transition-colors"
                      onClick={() => deaFileRef.current?.click()}
                    >
                      <input
                        ref={deaFileRef}
                        type="file"
                        accept=".pdf,.html,.txt,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocumentUpload('dea', file);
                          e.target.value = '';
                        }}
                      />
                      <Upload className="h-8 w-8 mx-auto text-[#516057] mb-2" />
                      <p className="text-xs text-[#505454]">
                        {uploadingDea ? 'Uploading...' : profile.deaFileUrl ? 'File uploaded - Click to replace' : 'Choose DEA File'}
                      </p>
                      {profile.deaFileUrl && (
                        <a
                          href={profile.deaFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#516057] underline mt-1 inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View current file
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-2">State Pharmacy License</label>
                    <div
                      className="border-2 border-dashed border-[#e2e2e2] rounded-[4px] p-6 text-center cursor-pointer hover:border-[#e2e2e2] transition-colors"
                      onClick={() => licenseFileRef.current?.click()}
                    >
                      <input
                        ref={licenseFileRef}
                        type="file"
                        accept=".pdf,.html,.txt,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocumentUpload('license', file);
                          e.target.value = '';
                        }}
                      />
                      <Upload className="h-8 w-8 mx-auto text-[#516057] mb-2" />
                      <p className="text-xs text-[#505454]">
                        {uploadingLicense ? 'Uploading...' : profile.licenseFileUrl ? 'File uploaded - Click to replace' : 'Choose License File'}
                      </p>
                      {profile.licenseFileUrl && (
                        <a
                          href={profile.licenseFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#516057] underline mt-1 inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View current file
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </>
            )}
          </div>
        )}

        {/* Store Settings Tab (FCR) */}
        {activeTab === 'store' && (
          <div className="space-y-3">
            {storeSettings?.deaExpirationWarning && (() => {
              const style = getDeaWarningStyle(storeSettings.deaExpirationWarning);
              if (!style) return null;
              return (
                <div className={`p-3 ${style.bg} border-2 ${style.border} rounded-[4px] flex items-center gap-3`}>
                  <AlertTriangle className={`h-5 w-5 ${style.icon} flex-shrink-0`} />
                  <div>
                    <p className={`font-bold text-sm ${style.text}`}>DEA License Warning</p>
                    <p className={`text-xs ${style.text} mt-0.5`}>{storeSettings.deaExpirationWarning}</p>
                  </div>
                </div>
              );
            })()}

            <Card className="border-2 border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-[4px] bg-indigo-100">
                      <Store className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-base text-[#000000]">FCR Store Settings</h3>
                  </div>
                  {!isEditingStore ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingStore(true)} className="bg-[#516057] hover:bg-[#505454] text-white border-[#516057] rounded-[4px]" disabled={loadingStoreSettings}>
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleStoreSettingsCancel} disabled={savingStoreSettings} className="rounded-[4px]">
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleStoreSettingsSave} disabled={savingStoreSettings} className="bg-[#516057] hover:bg-[#505454] text-white border-0 rounded-[4px]">
                        <Save className="mr-1 h-3 w-3" />
                        {savingStoreSettings ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  )}
                </div>

                {storeError && (
                  <div className="p-2 mb-3 bg-red-50 border-2 border-red-200 rounded-[4px] flex items-center gap-2 text-red-800 text-xs">
                    <AlertCircle className="h-4 w-4" />
                    <span>{storeError}</span>
                  </div>
                )}

                {storeSaved && (
                  <div className="p-2 mb-3 bg-green-50 border-2 border-green-200 rounded-[4px] flex items-center gap-2 text-green-800 text-xs">
                    <CheckCircle className="h-4 w-4" />
                    <span>Store settings saved successfully!</span>
                  </div>
                )}

                {loadingStoreSettings ? (
                  <div className="p-4 text-center text-sm text-[#505454]">Loading store settings...</div>
                ) : !storeSettings ? (
                  <div className="p-4 text-center text-sm text-[#6b7280]">Unable to load store settings. Please try again.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-[#000000] mb-1">Store Number</label>
                        <Input
                          value={storeSettings.storeNumber || ''}
                          onChange={(e) => updateStoreField('storeNumber', e.target.value)}
                          disabled={!isEditingStore}
                          className="text-xs h-7"
                          placeholder="e.g. 5544"
                          maxLength={10}
                        />
                        <p className="text-xs text-[#6b7280] mt-0.5">Unique 4-digit store identifier</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#000000] mb-1">Service Type</label>
                        <select
                          value={storeSettings.serviceType || 'full_service'}
                          onChange={(e) => updateStoreField('serviceType', e.target.value)}
                          disabled={!isEditingStore}
                          className="w-full h-7 px-2 py-1 text-xs border border-input bg-background rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {SERVICE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-3 border-t-2 border-indigo-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Truck className="h-4 w-4 text-indigo-600" />
                        <h4 className="font-bold text-sm text-[#000000]">Wholesaler Information</h4>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-[#000000] mb-1">Primary Wholesaler</label>
                          <Input
                            value={storeSettings.primaryWholesaler || ''}
                            onChange={(e) => updateStoreField('primaryWholesaler', e.target.value)}
                            disabled={!isEditingStore}
                            className="text-xs h-7"
                            placeholder="e.g. Cardinal Health"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#000000] mb-1">
                            Wholesaler Account Number
                            <span className="text-red-500 ml-0.5">*</span>
                          </label>
                          <Input
                            value={storeSettings.wholesalerAccountNumber || ''}
                            onChange={(e) => updateStoreField('wholesalerAccountNumber', e.target.value)}
                            disabled={!isEditingStore}
                            className="text-xs h-7"
                            placeholder="e.g. CH-987654"
                          />
                          <p className="text-xs text-[#6b7280] mt-0.5">Required for return processing</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-[#000000] mb-1">Secondary Wholesaler</label>
                          <Input
                            value={storeSettings.secondaryWholesaler || ''}
                            onChange={(e) => updateStoreField('secondaryWholesaler', e.target.value)}
                            disabled={!isEditingStore}
                            className="text-xs h-7"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t-2 border-indigo-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        <h4 className="font-bold text-sm text-[#000000]">Visit Schedule & Contact</h4>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-[#000000] mb-1">Days Between Visits</label>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            value={storeSettings.daysBetweenVisits ?? 120}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1 && val <= 365) {
                                updateStoreField('daysBetweenVisits', val);
                              }
                            }}
                            disabled={!isEditingStore}
                            className="text-xs h-7"
                          />
                          <p className="text-xs text-[#6b7280] mt-0.5">Default: 120 days</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#000000] mb-1">Fax Number</label>
                          <Input
                            value={storeSettings.faxNumber || ''}
                            onChange={(e) => updateStoreField('faxNumber', e.target.value)}
                            disabled={!isEditingStore}
                            className="text-xs h-7"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#000000] mb-1">Last Visit Date</label>
                          <Input
                            type="date"
                            value={storeSettings.lastVisitDate || ''}
                            disabled
                            className="text-xs h-7 bg-[#f5f2f1]"
                          />
                          <p className="text-xs text-[#6b7280] mt-0.5">Set by processor</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#000000] mb-1">Next Visit Date</label>
                          <Input
                            type="date"
                            value={storeSettings.nextVisitDate || ''}
                            disabled
                            className="text-xs h-7 bg-[#f5f2f1]"
                          />
                          <p className="text-xs text-[#6b7280] mt-0.5">Auto-calculated</p>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-3">
            <Card className="border-2 border-red-200 bg-gradient-to-br from-white to-red-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-[4px] bg-red-100">
                    <Key className="h-4 w-4 text-red-600" />
                  </div>
                  <h3 className="font-bold text-base text-[#000000]">Change Password</h3>
                </div>
                {error && (
                  <div className="p-2 mb-3 bg-red-50 border-2 border-red-200 rounded-[4px] flex items-center gap-2 text-red-800 text-xs">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                {saved && (
                  <div className="p-2 mb-3 bg-green-50 border-2 border-green-200 rounded-[4px] flex items-center gap-2 text-green-800 text-xs">
                    <CheckCircle className="h-4 w-4" />
                    <span>Password changed successfully!</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">Current Password</label>
                    <div className="relative">
                      <Input 
                        type={showCurrentPassword ? 'text' : 'password'} 
                        placeholder="Enter current password" 
                        className="text-xs h-7 pr-8"
                        value={passwordData.currentPassword}
                        onChange={(e) => {
                          setPasswordData({ ...passwordData, currentPassword: e.target.value });
                          if (error) setError(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#505454] focus:outline-none"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">New Password</label>
                    <div className="relative">
                      <Input 
                        type={showNewPassword ? 'text' : 'password'} 
                        placeholder="Enter new password" 
                        className={`text-xs h-7 pr-8 ${passwordError && passwordData.newPassword ? 'border-red-300' : ''}`}
                        value={passwordData.newPassword}
                        onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#505454] focus:outline-none"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    {passwordError && passwordData.newPassword && (
                      <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {passwordError}
                      </p>
                    )}
                    {!passwordError && passwordData.newPassword && (
                      <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Password meets requirements
                      </p>
                    )}
                    {!passwordData.newPassword && (
                      <p className="text-xs text-[#6b7280] mt-0.5">
                        Must be at least 8 characters with uppercase, lowercase, and numbers
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#000000] mb-1">Confirm New Password</label>
                    <div className="relative">
                      <Input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        placeholder="Confirm new password" 
                        className={`text-xs h-7 pr-8 ${passwordError && passwordData.confirmPassword ? 'border-red-300' : ''}`}
                        value={passwordData.confirmPassword}
                        onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#505454] focus:outline-none"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    {passwordError && passwordData.confirmPassword && passwordData.newPassword && passwordData.confirmPassword !== passwordData.newPassword && (
                      <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Passwords do not match
                      </p>
                    )}
                    {passwordData.confirmPassword && passwordData.newPassword && passwordData.confirmPassword === passwordData.newPassword && !validatePassword(passwordData.newPassword) && (
                      <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Passwords match
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || !!passwordError}
                    size="sm" 
                    className="bg-[#516057] hover:bg-[#505454] text-white border-0 rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Key className="mr-1 h-3 w-3" />
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </PermissionGuard>
    </DashboardLayout>
  );
}
