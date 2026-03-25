import { useState, useEffect, useCallback } from 'react';

interface ReturnLockStatus {
  id: string;
  status: string;
  isLocked: boolean;
  canEdit: boolean;
  canEditClassification: boolean;
  canEditNotes: boolean;
  canEditCoreData: boolean;
  canAddDeleteItems: boolean;
  lockReason: string | null;
}

interface UseReturnLockStatusResult {
  lockStatus: ReturnLockStatus | null;
  isLoading: boolean;
  error: string | null;
  checkLockStatus: () => Promise<void>;
  isLocked: boolean;
  canEdit: boolean;
  canEditClassification: boolean;
  canEditNotes: boolean;
  canEditCoreData: boolean;
  canAddDeleteItems: boolean;
  lockReason: string | null;
  checkActionAllowed: (actionName?: string) => boolean;
}

export const useReturnLockStatus = (transactionId: string | null): UseReturnLockStatusResult => {
  const [lockStatus, setLockStatus] = useState<ReturnLockStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkLockStatus = useCallback(async () => {
    if (!transactionId) {
      setLockStatus(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/return-transactions/${transactionId}/lock-status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to check lock status');
      }

      setLockStatus(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check lock status';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    checkLockStatus();
  }, [checkLockStatus]);

  const checkActionAllowed = useCallback((actionName: string = 'action'): boolean => {
    if (lockStatus?.isLocked) {
      return false;
    }
    return true;
  }, [lockStatus]);

  return {
    lockStatus,
    isLoading,
    error,
    checkLockStatus,
    isLocked: lockStatus?.isLocked ?? false,
    canEdit: lockStatus?.canEdit ?? true,
    canEditClassification: lockStatus?.canEditClassification ?? true,
    canEditNotes: lockStatus?.canEditNotes ?? true,
    canEditCoreData: lockStatus?.canEditCoreData ?? true,
    canAddDeleteItems: lockStatus?.canAddDeleteItems ?? true,
    lockReason: lockStatus?.lockReason ?? null,
    checkActionAllowed,
  };
};

export const useReturnEditProtection = (transactionId: string | null) => {
  const result = useReturnLockStatus(transactionId);

  const getDisabledState = useCallback((baseDisabled: boolean = false): boolean => {
    return baseDisabled || !result.canEditCoreData;
  }, [result.canEditCoreData]);

  const getDisabledClassName = useCallback((baseClassName: string = '', disabledClassName: string = 'opacity-50 cursor-not-allowed'): string => {
    return !result.canEditCoreData ? `${baseClassName} ${disabledClassName}` : baseClassName;
  }, [result.canEditCoreData]);

  return {
    ...result,
    getDisabledState,
    getDisabledClassName,
  };
};