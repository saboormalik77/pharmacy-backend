import { useState, useEffect, useCallback } from 'react';
import { returnsService } from '@/lib/api/services';

interface LegacyReturnLockStatus {
  id: string;
  status: string;
  isLocked: boolean;
  canEdit: boolean;
  lockReason: string | null;
}

interface UseLegacyReturnLockStatusResult {
  lockStatus: LegacyReturnLockStatus | null;
  isLoading: boolean;
  error: string | null;
  checkLockStatus: () => Promise<void>;
  canEdit: boolean;
  isLocked: boolean;
  lockReason: string | null;
  checkActionAllowed: (actionName?: string) => boolean;
}

export const useLegacyReturnLockStatus = (returnId: string | null): UseLegacyReturnLockStatusResult => {
  const [lockStatus, setLockStatus] = useState<LegacyReturnLockStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkLockStatus = useCallback(async () => {
    if (!returnId) {
      setLockStatus(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await returnsService.checkLockStatus(returnId);
      setLockStatus(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check lock status';
      setError(errorMessage);
      console.error('Error checking legacy return lock status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [returnId]);

  // Check lock status when return ID changes
  useEffect(() => {
    checkLockStatus();
  }, [checkLockStatus]);

  // Helper method to check if an action is allowed
  const checkActionAllowed = useCallback((actionName: string = 'action'): boolean => {
    if (lockStatus?.isLocked) {
      console.warn(`Cannot perform ${actionName}. ${lockStatus.lockReason || 'Return is locked for editing.'}`);
      return false;
    }
    return true;
  }, [lockStatus]);

  return {
    lockStatus,
    isLoading,
    error,
    checkLockStatus,
    canEdit: lockStatus?.canEdit ?? true, // Default to true if not loaded yet
    isLocked: lockStatus?.isLocked ?? false,
    lockReason: lockStatus?.lockReason ?? null,
    checkActionAllowed,
  };
};

// Helper hook for components that need to disable UI elements
export const useLegacyReturnEditProtection = (returnId: string | null) => {
  const { canEdit, isLocked, isLoading, checkActionAllowed } = useLegacyReturnLockStatus(returnId);

  // Helper to get disabled state for form elements
  const getDisabledState = useCallback((baseDisabled: boolean = false): boolean => {
    return baseDisabled || !canEdit;
  }, [canEdit]);

  // Helper to get className for disabled elements
  const getDisabledClassName = useCallback((baseClassName: string = '', disabledClassName: string = 'opacity-50 cursor-not-allowed'): string => {
    return !canEdit ? `${baseClassName} ${disabledClassName}` : baseClassName;
  }, [canEdit]);

  return {
    canEdit,
    isLocked,
    isLoading,
    checkActionAllowed,
    getDisabledState,
    getDisabledClassName,
  };
};