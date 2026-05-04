"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader2 } from 'lucide-react';

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
    <Card className={`border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header section matching reference portal */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">RSI Check History</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-teal-700">OCS :</span>
                <span className="text-gray-600">One-Check-Select</span>
                <div className="relative group">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 top-6 w-80 p-3 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="text-xs text-gray-700 leading-relaxed">
                      You select the time-frame in which you want your credit due from RSI to be issued in a single check. We offer time-frames of 10, 30, 60, and 90 days. Typically 80-90% of your credit will be included in this check with the remainder being issued directly from certain manufacturers. RSI fees are deducted from the check.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium text-teal-700">POR :</span>
                <span className="text-gray-600">Pay-On-Receipt</span>
                <div className="relative group">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 top-6 w-80 p-3 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="text-xs text-gray-700 leading-relaxed">
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
              <label htmlFor="date_range" className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                id="date_range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm"
                    max={endDate || undefined}
                  />
                </div>
                
                <div className="flex-1 min-w-36">
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm"
                    min={startDate || undefined}
                  />
                </div>
              </>
            )}

            <div>
              <Button 
                onClick={handleSubmit}
                disabled={loading || !isCustomValid}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 text-sm"
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

// Import Card components needed for this component
import { Card, CardContent } from '@/components/ui/Card';
import { Info } from 'lucide-react';