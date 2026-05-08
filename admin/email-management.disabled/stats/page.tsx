'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchEmailStats, clearErrors } from '@/lib/store/emailManagementSlice';
import { 
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue',
  percentage,
  trend 
}: {
  title: string;
  value: string | number;
  icon: any;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray';
  percentage?: string;
  trend?: 'up' | 'down' | 'neutral';
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  };

  const TrendIcon = trend ? trendIcons[trend] : null;

  return (
    <div className="bg-white overflow-hidden shadow rounded-[4px] border">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-[4px] border ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {percentage && (
                  <div className="ml-2 flex items-baseline text-sm">
                    {TrendIcon && (
                      <TrendIcon 
                        className={`self-center flex-shrink-0 h-4 w-4 ${
                          trend === 'up' ? 'text-green-500' : 
                          trend === 'down' ? 'text-red-500' : 'text-gray-400'
                        }`}
                      />
                    )}
                    <span className={`ml-1 ${
                      trend === 'up' ? 'text-green-600' : 
                      trend === 'down' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {percentage}
                    </span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function EmailStatsPage() {
  const dispatch = useAppDispatch();
  const { stats, statsLoading, statsError } = useAppSelector((state) => state.emailManagement);

  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    dispatch(fetchEmailStats({ 
      dateFrom: dateRange.from, 
      dateTo: dateRange.to 
    }));
  }, [dispatch, dateRange]);

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleRefresh = () => {
    dispatch(fetchEmailStats({ 
      dateFrom: dateRange.from, 
      dateTo: dateRange.to 
    }));
  };

  const handleQuickRange = (days: number) => {
    const to = format(new Date(), 'yyyy-MM-dd');
    const from = format(subDays(new Date(), days), 'yyyy-MM-dd');
    setDateRange({ from, to });
  };

  if (statsError) {
    return (
      <div className="rounded-[4px] bg-red-50 p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading email statistics</h3>
            <p className="mt-2 text-sm text-red-700">{statsError}</p>
            <button
              onClick={() => dispatch(clearErrors())}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Email Statistics</h2>
          <p className="mt-1 text-sm text-gray-500">
            Email delivery metrics and performance analytics
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          {/* Quick Range Buttons */}
          <div className="flex space-x-2">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => handleQuickRange(days)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-[4px] hover:bg-gray-50"
              >
                {days}d
              </button>
            ))}
          </div>
          
          {/* Date Range Inputs */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => handleDateRangeChange('from', e.target.value)}
              className="border border-gray-300 rounded-[4px] px-2 py-1 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => handleDateRangeChange('to', e.target.value)}
              className="border border-gray-300 rounded-[4px] px-2 py-1 text-sm"
            />
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={statsLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-[4px] text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {statsLoading && !stats && (
        <div className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-500">Loading statistics...</p>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Sent"
              value={stats.total_sent.toLocaleString()}
              icon={Mail}
              color="blue"
            />
            
            <StatCard
              title="Delivered"
              value={stats.delivered.toLocaleString()}
              icon={CheckCircle}
              color="green"
              percentage={`${stats.delivery_rate.toFixed(1)}%`}
              trend={stats.delivery_rate >= 95 ? 'up' : stats.delivery_rate >= 85 ? 'neutral' : 'down'}
            />
            
            <StatCard
              title="Bounced"
              value={stats.bounced.toLocaleString()}
              icon={XCircle}
              color="red"
              percentage={`${stats.bounce_rate.toFixed(1)}%`}
              trend={stats.bounce_rate <= 2 ? 'up' : stats.bounce_rate <= 5 ? 'neutral' : 'down'}
            />
            
            <StatCard
              title="Failed"
              value={stats.failed.toLocaleString()}
              icon={AlertTriangle}
              color="red"
            />
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery Performance */}
            <div className="bg-white shadow rounded-[4px] p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Performance</h3>
              
              <div className="space-y-4">
                {/* Delivery Rate Progress */}
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Delivery Rate</span>
                    <span>{stats.delivery_rate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        stats.delivery_rate >= 95 ? 'bg-green-500' : 
                        stats.delivery_rate >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(stats.delivery_rate, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.delivery_rate >= 95 ? 'Excellent' : 
                     stats.delivery_rate >= 85 ? 'Good' : 'Needs Attention'}
                  </p>
                </div>

                {/* Bounce Rate Progress */}
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Bounce Rate</span>
                    <span>{stats.bounce_rate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        stats.bounce_rate <= 2 ? 'bg-green-500' : 
                        stats.bounce_rate <= 5 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(stats.bounce_rate, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.bounce_rate <= 2 ? 'Excellent' : 
                     stats.bounce_rate <= 5 ? 'Acceptable' : 'High - Review Email List'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white shadow rounded-[4px] p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status Breakdown</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Delivered</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {stats.delivered.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({((stats.delivered / stats.total_sent) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="text-sm text-gray-600">Pending</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {stats.pending.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({((stats.pending / stats.total_sent) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-sm text-gray-600">Bounced</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {stats.bounced.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({stats.bounce_rate.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-sm text-gray-600">Failed</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {stats.failed.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({((stats.failed / stats.total_sent) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white shadow rounded-[4px] p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
            
            <div className="space-y-3">
              {stats.delivery_rate < 85 && (
                <div className="flex items-start p-3 bg-red-50 rounded-[4px]">
                  <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Low Delivery Rate</p>
                    <p className="text-sm text-red-700">
                      Your delivery rate is below 85%. Check for email authentication issues (SPF, DKIM, DMARC) 
                      and review your email content for spam triggers.
                    </p>
                  </div>
                </div>
              )}

              {stats.bounce_rate > 5 && (
                <div className="flex items-start p-3 bg-yellow-50 rounded-[4px]">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">High Bounce Rate</p>
                    <p className="text-sm text-yellow-700">
                      Your bounce rate is above 5%. Consider implementing email validation and 
                      cleaning up your email list to remove invalid addresses.
                    </p>
                  </div>
                </div>
              )}

              {stats.failed > 0 && (
                <div className="flex items-start p-3 bg-blue-50 rounded-[4px]">
                  <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Failed Emails Detected</p>
                    <p className="text-sm text-blue-700">
                      You have {stats.failed} failed emails. Review the error messages in the email logs 
                      and consider implementing retry logic for transient failures.
                    </p>
                  </div>
                </div>
              )}

              {stats.delivery_rate >= 95 && stats.bounce_rate <= 2 && stats.failed === 0 && (
                <div className="flex items-start p-3 bg-green-50 rounded-[4px]">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Excellent Email Performance</p>
                    <p className="text-sm text-green-700">
                      Your email delivery is performing excellently with high delivery rates and low bounce rates. 
                      Keep monitoring to maintain this performance.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}