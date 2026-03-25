"use client";

import { Button } from '@/components/ui/Button';
import { Edit, Printer, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { useLegacyReturnEditProtection } from '@/hooks/useLegacyReturnLockStatus';

interface ReturnActionButtonsProps {
  returnId?: string;
  returnStatus?: string;
}

export function ReturnActionButtons({ returnId, returnStatus }: ReturnActionButtonsProps) {
  const { canEdit, isLocked, checkActionAllowed } = useLegacyReturnEditProtection(returnId || null);

  const handleEdit = () => {
    if (!checkActionAllowed('edit return')) {
      return;
    }
    // In production, this would navigate to edit page
    alert('Edit functionality would navigate to edit page');
  };

  const handlePrint = () => {
    // Printing is always allowed
    window.print();
  };

  const handleCancel = () => {
    // Allow cancellation even for locked returns (emergency cancellation)
    if (confirm('Are you sure you want to cancel this return?')) {
      // In production, this would cancel the return
      alert('Return cancellation would be processed here');
    }
  };

  return (
    <div className="flex gap-2">
      {/* Show lock warning for locked returns */}
      {isLocked && (
        <div className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded border border-yellow-300">
          <Lock className="w-3 h-3" />
          <span>Locked</span>
        </div>
      )}
      
      {/* Edit button - disabled when locked */}
      {canEdit ? (
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleEdit}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      ) : (
        <Button 
          variant="outline" 
          size="sm"
          disabled
          title="Return is locked after shipment"
        >
          <Lock className="mr-2 h-4 w-4" />
          Locked
        </Button>
      )}
      
      {/* Print button - always available */}
      <Button 
        variant="outline" 
        size="sm"
        onClick={handlePrint}
      >
        <Printer className="mr-2 h-4 w-4" />
        Print Label
      </Button>
      
      {/* Cancel button - always available for emergency cancellation */}
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleCancel}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Cancel
      </Button>
    </div>
  );
}

