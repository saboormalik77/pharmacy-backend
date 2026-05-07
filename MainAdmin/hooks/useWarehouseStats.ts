import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/apiClient';

interface WarehouseStats {
  totalReturns: number;
  totalBatches: number;
  activeBatch: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useWarehouseStats() {
  const [stats, setStats] = useState<WarehouseStats>({
    totalReturns: 0,
    totalBatches: 0,
    activeBatch: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStats(prev => ({ ...prev, isLoading: true, error: null }));

        // Fetch warehouse stats concurrently
        const [returnsRes, batchesRes] = await Promise.all([
          // Get total returns count from warehouse/received endpoint
          apiClient.get<{ data: any[]; pagination: { total: number } }>('/admin/warehouse/received', true, { limit: 1 }),
          // Get batches to find current active batch
          apiClient.get<{ data: any[]; pagination: { total: number } }>('/admin/batches', true, { limit: 50 })
        ]);

        const totalReturns = returnsRes.pagination?.total || 0;
        const totalBatches = batchesRes.pagination?.total || 0;
        
        // Find current active batch (open batch)
        let activeBatch: string | null = null;
        if (batchesRes.data && batchesRes.data.length > 0) {
          const openBatch = batchesRes.data.find((batch: any) => batch.status === 'open');
          if (openBatch && openBatch.batchMonth) {
            try {
              // Handle different batch month formats
              let dateString = openBatch.batchMonth;
              
              // If format is "YYYY-MM", append "-01" to make it a valid date
              if (/^\d{4}-\d{2}$/.test(dateString)) {
                dateString += '-01';
              }
              // If format is already "YYYY-MM-DD", use as is
              else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                // If it's some other format, try to parse as is
                dateString = dateString + '-01';
              }
              
              const batchDate = new Date(dateString);
              
              // Check if date is valid
              if (!isNaN(batchDate.getTime())) {
                activeBatch = batchDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                });
              } else {
                // Fallback: just show the raw batch month
                activeBatch = openBatch.batchMonth;
              }
            } catch (e) {
              // Fallback: just show the raw batch month
              activeBatch = openBatch.batchMonth;
            }
          }
        }

        setStats({
          totalReturns,
          totalBatches,
          activeBatch,
          isLoading: false,
          error: null,
        });
      } catch (error: any) {
        setStats(prev => ({
          ...prev,
          isLoading: false,
          error: error?.message || 'Failed to fetch warehouse stats',
        }));
      }
    };

    fetchStats();
  }, []);

  return stats;
}