"use client";

import { useState, useEffect } from 'react';
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
  FileText,
  AlertTriangle
} from 'lucide-react';
import { settingsService, fcrStoreSettingsService } from '@/lib/api/services';
import type { FcrStoreSettings, UpdateFcrStoreSettings } from '@/lib/api/services';
import { getUserData, setUserData } from '@/lib/utils/cookies';
import { US_STATES } from '@/lib/constants/usStates';

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
    title: '',
    pharmacyName: '',
    npiNumber: '',
    deaNumber: '',
    physicalAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
    },
  });

  const [originalProfile, setOriginalProfile] = useState(profile);

  // Password change form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Password visibility states
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
        
        // Transform API response to match our profile structure
        const transformedProfile = {
          name: settings.name || '',
          email: settings.email || '',
          phone: settings.phone || '',
          title: settings.title || '',
          pharmacyName: settings.pharmacyName || '',
          npiNumber: settings.npiNumber || '',
          deaNumber: settings.deaNumber || '',
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

  // Get only changed fields
  const getChangedFields = () => {
    const changes: any = {};
    
    if (profile.name !== originalProfile.name) changes.name = profile.name;
    if (profile.email !== originalProfile.email) changes.email = profile.email;
    if (profile.phone !== originalProfile.phone) changes.phone = profile.phone;
    if (profile.title !== originalProfile.title) changes.title = profile.title;
    if (profile.pharmacyName !== originalProfile.pharmacyName) changes.pharmacyName = profile.pharmacyName;
    if (profile.npiNumber !== originalProfile.npiNumber) changes.npiNumber = profile.npiNumber;
    if (profile.deaNumber !== originalProfile.deaNumber) changes.deaNumber = profile.deaNumber;
    
    // Check physical address changes
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

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const changedFields = getChangedFields();
      
      if (Object.keys(changedFields).length === 0) {
        setIsEditing(false);
        return;
      }
      
      const updatedSettings = await settingsService.updateProfile(changedFields);
      
      // Update profile with response
      const transformedProfile = {
        name: updatedSettings.name || profile.name,
        email: updatedSettings.email || profile.email,
        phone: updatedSettings.phone || profile.phone,
        title: updatedSettings.title || profile.title,
        pharmacyName: updatedSettings.pharmacyName || profile.pharmacyName,
        npiNumber: updatedSettings.npiNumber || profile.npiNumber,
        deaNumber: updatedSettings.deaNumber || profile.deaNumber,
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

      // Update cookies if name or pharmacyName changed
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
        
        // Dispatch custom event to notify UserDropdown
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
  };

  // Validate password requirements
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    return null;
  };

  const handleChangePassword = async () => {
    try {
      // Clear previous errors
      setError(null);
      setPasswordError(null);

      // Validate current password
      if (!passwordData.currentPassword) {
        setError('Please enter your current password');
        return;
      }

      // Validate new password
      if (!passwordData.newPassword) {
        setError('Please enter a new password');
        return;
      }

      const passwordValidationError = validatePassword(passwordData.newPassword);
      if (passwordValidationError) {
        setPasswordError(passwordValidationError);
        setError(passwordValidationError);
        return;
      }

      // Validate password confirmation
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('New passwords do not match');
        setPasswordError('New passwords do not match');
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
      
      // Reset password form
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

  // Handle password input change with real-time validation
  const handlePasswordChange = (field: 'newPassword' | 'confirmPassword', value: string) => {
    const updatedData = { ...passwordData, [field]: value };
    setPasswordData(updatedData);
    
    // Clear general error when user starts typing
    if (error && !passwordError) {
      setError(null);
    }

    // Real-time validation for new password
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

    // Check password match when confirming
    if (field === 'confirmPassword') {
      if (value && updatedData.newPassword) {
        if (value !== updatedData.newPassword) {
          setPasswordError('New passwords do not match');
        } else {
          const validationError = validatePassword(updatedData.newPassword);
          setPasswordError(validationError);
        }
      } else if (!value) {
        // If confirm password is cleared, check if new password is valid
        if (updatedData.newPassword) {
          const validationError = validatePassword(updatedData.newPassword);
          setPasswordError(validationError);
        } else {
          setPasswordError(null);
        }
      }
    }
  };

  // Fetch FCR store settings when the store tab is active
  useEffect(() => {
    if (activeTab !== 'store') return;
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
  }, [activeTab, storeSettings]);

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
    if (storeSettings.gpoAffiliation !== originalStoreSettings.gpoAffiliation)
      updates.gpoAffiliation = storeSettings.gpoAffiliation || '';
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
    return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', icon: 'text-gray-500' };
  };

  const SERVICE_TYPES = [
    { value: 'full_service', label: 'Full Service (Rep processes onsite)' },
    { value: 'self_service', label: 'Self-Service (Web)' },
    { value: 'express', label: 'Express (Box-and-Ship)' },
  ];

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, color: 'bg-teal-600 text-white border-teal-600' },
    { id: 'store', label: 'Store Settings', icon: Store, color: 'bg-teal-600 text-white border-teal-600' },
    // { id: 'notifications', label: 'Notifications', icon: Bell, color: 'bg-purple-100 text-purple-700 border-purple-300' },
    // { id: 'billing', label: 'Billing', icon: CreditCard, color: 'bg-green-100 text-green-700 border-green-300' },
    { id: 'security', label: 'Security', icon: Shield, color: 'bg-teal-600 text-white border-teal-600' },
  ];

  return (
    <DashboardLayout>
      <PermissionGuard permission="settings:view">
      <div className="space-y-3">
        {/* Colorful Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-slate-50 via-gray-50 to-zinc-50 border-2 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <SettingsIcon className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Settings</h1>
              <p className="text-xs text-gray-600 mt-0.5">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>

        {/* Colorful Tabs */}
        <div className="flex gap-2 border-b-2 border-gray-200 bg-white rounded-t-lg p-1">
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
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
                  isActive
                    ? `${tab.color} shadow-md scale-105`
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
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
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">Profile Information</h3>
                </div>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="bg-teal-600 hover:bg-teal-700 text-white border-teal-600 rounded-lg">
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading} className="rounded-lg">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white border-0 rounded-lg">
                      <Save className="mr-1 h-3 w-3" />
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-2 mb-3 bg-red-50 border-2 border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-xs">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {saved && (
                <div className="p-2 mb-3 bg-green-50 border-2 border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-xs">
                  <CheckCircle className="h-4 w-4" />
                  <span>Settings saved successfully!</span>
                </div>
              )}

              {loadingSettings ? (
                <div className="p-4 text-center text-sm text-gray-600">Loading settings...</div>
              ) : (

              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Full Name</label>
                    <Input
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      disabled={!isEditing}
                      className="text-xs h-7"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Email</label>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      disabled={!isEditing}
                      className="text-xs h-7"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Phone</label>
                    <Input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      disabled={!isEditing}
                      className="text-xs h-7"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Title</label>
                    <Input
                      value={profile.title}
                      onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                      disabled={!isEditing}
                      className="text-xs h-7"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Building className="h-4 w-4 text-blue-600" />
                    <h4 className="font-bold text-sm text-gray-900">Pharmacy Information</h4>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-1">Pharmacy Name</label>
                      <Input
                        value={profile.pharmacyName}
                        onChange={(e) => setProfile({ ...profile, pharmacyName: e.target.value })}
                        disabled={!isEditing}
                        className="text-xs h-7"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-1">NPI Number</label>
                      <Input
                        value={profile.npiNumber}
                        onChange={(e) => setProfile({ ...profile, npiNumber: e.target.value })}
                        disabled={!isEditing}
                        className="text-xs h-7"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-1">DEA Number</label>
                      <Input
                        value={profile.deaNumber}
                        onChange={(e) => setProfile({ ...profile, deaNumber: e.target.value })}
                        disabled={!isEditing}
                        className="text-xs h-7"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <h4 className="font-bold text-sm text-gray-900">Physical Address</h4>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-900 mb-1">Street Address</label>
                      <Input
                        value={profile.physicalAddress.street}
                        onChange={(e) => setProfile({
                          ...profile,
                          physicalAddress: { ...profile.physicalAddress, street: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="text-xs h-7"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-1">City</label>
                      <Input
                        value={profile.physicalAddress.city}
                        onChange={(e) => setProfile({
                          ...profile,
                          physicalAddress: { ...profile.physicalAddress, city: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="text-xs h-7"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-1">State</label>
                      <select
                        value={profile.physicalAddress.state}
                        onChange={(e) => setProfile({
                          ...profile,
                          physicalAddress: { ...profile.physicalAddress, state: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="w-full h-7 px-2 py-1 text-xs border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <label className="block text-xs font-bold text-gray-900 mb-1">ZIP Code</label>
                      <Input
                        value={profile.physicalAddress.zip}
                        onChange={(e) => setProfile({
                          ...profile,
                          physicalAddress: { ...profile.physicalAddress, zip: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="text-xs h-7"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-purple-100">
                    <Mail className="h-4 w-4 text-purple-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">Email Notifications</h3>
                </div>
                <div className="space-y-2">
                  {Object.entries(notifications.email).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-purple-200">
                      <div>
                        <p className="font-medium text-xs text-gray-900">
                          {key.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase())}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNotifications({
                            ...notifications,
                            email: { ...notifications.email, [key]: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  ))}
                  <Button onClick={handleSave} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white border-0 rounded-lg mt-2">
                    <Save className="mr-1 h-3 w-3" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-indigo-100">
                    <Bell className="h-4 w-4 text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">In-App Notifications</h3>
                </div>
                <div className="space-y-2">
                  {Object.entries(notifications.inApp).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-indigo-200">
                      <div>
                        <p className="font-medium text-xs text-gray-900">
                          {key.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase())}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNotifications({
                            ...notifications,
                            inApp: { ...notifications.inApp, [key]: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  ))}
                  <Button onClick={handleSave} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white border-0 rounded-lg mt-2">
                    <Save className="mr-1 h-3 w-3" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-blue-100">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">SMS Notifications</h3>
                </div>
                <div className="space-y-2">
                  {Object.entries(notifications.sms).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-blue-200">
                      <div>
                        <p className="font-medium text-xs text-gray-900">
                          {key.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase())}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNotifications({
                            ...notifications,
                            sms: { ...notifications.sms, [key]: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                  <div className="p-2 bg-blue-50 border-2 border-blue-200 rounded-lg mt-2">
                    <p className="text-xs text-blue-800">
                      <AlertCircle className="inline h-3 w-3 mr-1" />
                      SMS notifications may incur charges from your carrier.
                    </p>
                  </div>
                  <Button onClick={handleSave} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white border-0 rounded-lg mt-2">
                    <Save className="mr-1 h-3 w-3" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-3">
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-green-100">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="font-bold text-base text-green-900">Platform Commission Structure</h3>
                </div>
                <div className="p-3 bg-white rounded-lg border-2 border-green-200 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-sm text-green-900">Commission Rate</p>
                      <p className="text-2xl font-bold text-green-600">5%</p>
                    </div>
                    <Info className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-700 mt-2">
                    We charge a 5% commission on each payment you receive from suppliers. 
                    This commission is automatically calculated and deducted from the gross payment amount.
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 p-2 rounded bg-white/50">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900">No Subscription Fees</p>
                      <p className="text-gray-600">The platform is completely free to use. No monthly or annual fees.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-white/50">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900">Pay Only When You Get Paid</p>
                      <p className="text-gray-600">Commission is only charged when you receive payments from suppliers.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-white/50">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900">Full Transparency</p>
                      <p className="text-gray-600">Every payment shows the gross amount, commission, and net amount you receive.</p>
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-yellow-50 border-2 border-yellow-200 rounded-lg mt-3">
                  <p className="text-xs text-yellow-800">
                    <strong>Example:</strong> If you receive a payment of $1,000 from a supplier, 
                    the platform commission is $50 (5%), and you receive $950 net.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-gradient-to-br from-white to-green-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-green-100">
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">Payment Receipt Information</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Bank Account (for ACH transfers)</label>
                    <Input placeholder="Enter bank account details" disabled className="text-xs h-7" />
                    <p className="text-xs text-gray-500 mt-0.5">
                      Contact support to update your payment information
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Payment Method Preference</label>
                    <select className="w-full px-2 py-1.5 border rounded text-xs h-7" disabled>
                      <option>Wire Transfer</option>
                      <option>ACH</option>
                      <option>Check</option>
                    </select>
                  </div>
                  <Button variant="outline" size="sm" disabled className="border-gray-300 rounded-lg">
                    <Edit className="mr-1 h-3 w-3" />
                    Update Payment Information
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Store Settings Tab (FCR) */}
        {activeTab === 'store' && (
          <div className="space-y-3">
            {/* DEA Expiration Warning Banner (Task 1.7) */}
            {storeSettings?.deaExpirationWarning && (() => {
              const style = getDeaWarningStyle(storeSettings.deaExpirationWarning);
              if (!style) return null;
              return (
                <div className={`p-3 ${style.bg} border-2 ${style.border} rounded-lg flex items-center gap-3`}>
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
                    <div className="p-1.5 rounded-lg bg-indigo-100">
                      <Store className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-base text-gray-900">FCR Store Settings</h3>
                  </div>
                  {!isEditingStore ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingStore(true)} className="bg-teal-600 hover:bg-teal-700 text-white border-teal-600 rounded-lg" disabled={loadingStoreSettings}>
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleStoreSettingsCancel} disabled={savingStoreSettings} className="rounded-lg">
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleStoreSettingsSave} disabled={savingStoreSettings} className="bg-teal-600 hover:bg-teal-700 text-white border-0 rounded-lg">
                        <Save className="mr-1 h-3 w-3" />
                        {savingStoreSettings ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  )}
                </div>

                {storeError && (
                  <div className="p-2 mb-3 bg-red-50 border-2 border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-xs">
                    <AlertCircle className="h-4 w-4" />
                    <span>{storeError}</span>
                  </div>
                )}

                {storeSaved && (
                  <div className="p-2 mb-3 bg-green-50 border-2 border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-xs">
                    <CheckCircle className="h-4 w-4" />
                    <span>Store settings saved successfully!</span>
                  </div>
                )}

                {loadingStoreSettings ? (
                  <div className="p-4 text-center text-sm text-gray-600">Loading store settings...</div>
                ) : !storeSettings ? (
                  <div className="p-4 text-center text-sm text-gray-500">Unable to load store settings. Please try again.</div>
                ) : (
                  <div className="space-y-4">
                    {/* Store Identification */}
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-900 mb-1">Store Number</label>
                        <Input
                          value={storeSettings.storeNumber || ''}
                          onChange={(e) => updateStoreField('storeNumber', e.target.value)}
                          disabled={!isEditingStore}
                          className="text-xs h-7"
                          placeholder="e.g. 5544"
                          maxLength={10}
                        />
                        <p className="text-xs text-gray-500 mt-0.5">Unique 4-digit store identifier</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-900 mb-1">Service Type</label>
                        <select
                          value={storeSettings.serviceType || 'full_service'}
                          onChange={(e) => updateStoreField('serviceType', e.target.value)}
                          disabled={!isEditingStore}
                          className="w-full h-7 px-2 py-1 text-xs border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {SERVICE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Wholesaler Information */}
                    <div className="pt-3 border-t-2 border-indigo-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Truck className="h-4 w-4 text-indigo-600" />
                        <h4 className="font-bold text-sm text-gray-900">Wholesaler Information</h4>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Primary Wholesaler</label>
                          <Input
                            value={storeSettings.primaryWholesaler || ''}
                            onChange={(e) => updateStoreField('primaryWholesaler', e.target.value)}
                            disabled={!isEditingStore}
                            className="text-xs h-7"
                            placeholder="e.g. Cardinal Health"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">
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
                          <p className="text-xs text-gray-500 mt-0.5">Required for return processing</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-900 mb-1">Secondary Wholesaler</label>
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

                    {/* GPO & Compliance */}
                    <div className="pt-3 border-t-2 border-indigo-200">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        <h4 className="font-bold text-sm text-gray-900">GPO & Compliance</h4>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">GPO Affiliation</label>
                          <Input
                            value={storeSettings.gpoAffiliation || ''}
                            onChange={(e) => updateStoreField('gpoAffiliation', e.target.value)}
                            disabled={!isEditingStore}
                            className="text-xs h-7"
                            placeholder="e.g. BuyLine"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">DEA Expiration Date</label>
                          <Input
                            type="date"
                            value={storeSettings.deaExpirationDate || ''}
                            onChange={(e) => updateStoreField('deaExpirationDate', e.target.value)}
                            disabled={!isEditingStore}
                            className="text-xs h-7"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Visit Schedule & Contact */}
                    <div className="pt-3 border-t-2 border-indigo-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        <h4 className="font-bold text-sm text-gray-900">Visit Schedule & Contact</h4>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Days Between Visits</label>
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
                          <p className="text-xs text-gray-500 mt-0.5">Default: 120 days</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Fax Number</label>
                          <Input
                            value={storeSettings.faxNumber || ''}
                            onChange={(e) => updateStoreField('faxNumber', e.target.value)}
                            disabled={!isEditingStore}
                            className="text-xs h-7"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Last Visit Date</label>
                          <Input
                            type="date"
                            value={storeSettings.lastVisitDate || ''}
                            disabled
                            className="text-xs h-7 bg-gray-50"
                          />
                          <p className="text-xs text-gray-500 mt-0.5">Set by processor</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Next Visit Date</label>
                          <Input
                            type="date"
                            value={storeSettings.nextVisitDate || ''}
                            disabled
                            className="text-xs h-7 bg-gray-50"
                          />
                          <p className="text-xs text-gray-500 mt-0.5">Auto-calculated</p>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Staff (Read-Only) */}
                    {(storeSettings.assignedProcessorName || storeSettings.assignedProcessorId || storeSettings.assignedSalesPersonId) && (
                      <div className="pt-3 border-t-2 border-indigo-200">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4 text-indigo-600" />
                          <h4 className="font-bold text-sm text-gray-900">Assigned Staff</h4>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="block text-xs font-bold text-gray-900 mb-1">Assigned Processor</label>
                            <Input
                              value={storeSettings.assignedProcessorName || 'Not assigned'}
                              disabled
                              className="text-xs h-7 bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-900 mb-1">Assigned Sales Person</label>
                            <Input
                              value={storeSettings.assignedSalesPersonId ? storeSettings.assignedSalesPersonId : 'Not assigned'}
                              disabled
                              className="text-xs h-7 bg-gray-50"
                            />
                          </div>
                        </div>
                      </div>
                    )}
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
                  <div className="p-1.5 rounded-lg bg-red-100">
                    <Key className="h-4 w-4 text-red-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">Change Password</h3>
                </div>
                {error && (
                  <div className="p-2 mb-3 bg-red-50 border-2 border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-xs">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                {saved && (
                  <div className="p-2 mb-3 bg-green-50 border-2 border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-xs">
                    <CheckCircle className="h-4 w-4" />
                    <span>Password changed successfully!</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Current Password</label>
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
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
                    <label className="block text-xs font-bold text-gray-900 mb-1">New Password</label>
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
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
                      <p className="text-xs text-gray-500 mt-0.5">
                        Must be at least 8 characters with uppercase, lowercase, and numbers
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Confirm New Password</label>
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
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
                    className="bg-teal-600 hover:bg-teal-700 text-white border-0 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Key className="mr-1 h-3 w-3" />
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* <Card className="border-2 border-orange-200 bg-gradient-to-br from-white to-orange-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-orange-100">
                    <Shield className="h-4 w-4 text-orange-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">Two-Factor Authentication</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-orange-200">
                    <div>
                      <p className="font-medium text-xs text-gray-900">SMS Authentication</p>
                      <p className="text-xs text-gray-600">Receive verification codes via SMS</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-orange-200">
                    <div>
                      <p className="font-medium text-xs text-gray-900">Authenticator App</p>
                      <p className="text-xs text-gray-600">Use an authenticator app like Google Authenticator</p>
                    </div>
                    <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-50">
                      Setup
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-gray-100">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">Active Sessions</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-gray-200">
                    <div>
                      <p className="font-medium text-xs text-gray-900">Chrome on Windows</p>
                      <p className="text-xs text-gray-600">Last active: 2 hours ago • IP: 192.168.1.100</p>
                    </div>
                    <Badge variant="success" className="text-xs">Current Session</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-gray-200">
                    <div>
                      <p className="font-medium text-xs text-gray-900">Safari on macOS</p>
                      <p className="text-xs text-gray-600">Last active: 5 days ago • IP: 192.168.1.101</p>
                    </div>
                    <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50">
                      Revoke
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card> */}
          </div>
        )}
      </div>
      </PermissionGuard>
    </DashboardLayout>
  );
}
