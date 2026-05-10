"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader2, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

interface DateRangeFilterProps {
  onFilter: (filters: {
    dateRange?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  loading?: boolean;
  className?: string;
}

export function DateRangeFilter({ onFilter, loading = false, className = '' }: DateRangeFilterProps) {
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);

  const dateRangeOptions = [
    { value: 'all', label: 'All Dates' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'last_quarter', label: 'Last Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_12_months', label: 'Last 12 Months' },
    { value: 'custom', label: 'Custom' }
  ];

  useEffect(() => {
    setShowCustomDates(dateRange === 'custom');
    if (dateRange !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  }, [dateRange]);

  const handleSubmit = () => {
    const filters: any = {};
    
    if (dateRange && dateRange !== 'all') {
      filters.dateRange = dateRange;
      
      if (dateRange === 'custom') {
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
      }
    }

    onFilter(filters);
  };

  const isCustomValid = dateRange !== 'custom' || (startDate && endDate && startDate <= endDate);

  return (
    <Card className={`border border-[#e2e2e2] bg-white rounded-[4px] ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header section */}
          <div>
            <h4 className="font-semibold text-[#000000] mb-2 font-serif">RSI Check History</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#516057]">OCS :</span>
                <span className="text-[#505454]">One-Check-Select</span>
                <div className="relative group">
                  <Info className="h-4 w-4 text-[#9ca3af] cursor-help" />
                  <div className="absolute left-0 top-6 w-80 p-3 bg-white border border-[#e2e2e2] rounded-[4px] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="text-xs text-[#505454] leading-relaxed">
                      You select the time-frame in which you want your credit due from RSI to be issued in a single check. We offer time-frames of 10, 30, 60, and 90 days. Typically 80-90% of your credit will be included in this check with the remainder being issued directly from certain manufacturers. RSI fees are deducted from the check.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#516057]">POR :</span>
                <span className="text-[#505454]">Pay-On-Receipt</span>
                <div className="relative group">
                  <Info className="h-4 w-4 text-[#9ca3af] cursor-help" />
                  <div className="absolute left-0 top-6 w-80 p-3 bg-white border border-[#e2e2e2] rounded-[4px] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="text-xs text-[#505454] leading-relaxed">
                      Certain characteristics of a return may cause drug manufacturers to require proof of where and for what price a product was purchased. If no invoices are provided product may be processed under our Pay-On-Receipt program whereby our customer is paid upon us receiving credit from the manufacturer. These checks are issued in addition to OCS checks, and fees for these credits are deducted from POR checks. An additional processing fee of 2-20% <strong><u>may</u></strong> apply.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Date range filter section */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <label htmlFor="date_range" className="block text-sm font-medium text-[#505454] mb-1">
                Date Range
              </label>
              <select
                id="date_range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e2e2] rounded-[4px] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-[#516057]"
              >
                {dateRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {showCustomDates && (
              <>
                <div className="flex-1 min-w-36">
                  <label htmlFor="start_date" className="block text-sm font-medium text-[#505454] mb-1">
                    Start Date
                  </label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm rounded-[4px]"
                    max={endDate || undefined}
                  />
                </div>
                
                <div className="flex-1 min-w-36">
                  <label htmlFor="end_date" className="block text-sm font-medium text-[#505454] mb-1">
                    End Date
                  </label>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm rounded-[4px]"
                    min={startDate || undefined}
                  />
                </div>
              </>
            )}

            <div>
              <Button 
                onClick={handleSubmit}
                disabled={loading || !isCustomValid}
                className="bg-[#516057] hover:opacity-90 text-white px-6 py-2 text-sm rounded-[4px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </div>

          {/* Custom date validation error */}
          {dateRange === 'custom' && startDate && endDate && startDate > endDate && (
            <div className="text-sm text-red-600">
              Start date must be before or equal to end date
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
