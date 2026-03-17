'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchEmailHealth, clearErrors } from '@/lib/store/emailManagementSlice';
import { 
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Mail,
  Clock,
  Lightbulb,
} from 'lucide-react';
import { format } from 'date-fns';

const HealthIndicator = ({ 
  status, 
  label 
}: { 
  status: 'excellent' | 'good' | 'warning' | 'critical';
  label: string;
}) => {
  const config = {
    excellent: { icon: CheckCircle, color: 'text-green-500 bg-green-100', text: 'text-green-800' },
    good: { icon: CheckCircle, color: 'text-blue-500 bg-blue-100', text: 'text-blue-800' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-100', text: 'text-yellow-800' },
    critical: { icon: XCircle, color: 'text-red-500 bg-red-100', text: 'text-red-800' },
  };

  const { icon: Icon, color, text } = config[status];

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} ${text}`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </div>
  );
};

const getHealthStatus = (deliveryRate: number, bounceRate: number) => {
  if (deliveryRate >= 95 && bounceRate <= 2) return 'excellent';
  if (deliveryRate >= 90 && bounceRate <= 5) return 'good';
  if (deliveryRate >= 80 && bounceRate <= 10) return 'warning';
  return 'critical';
};

export default function EmailHealthPage() {
  const dispatch = useAppDispatch();
  const { health, healthLoading, healthError } = useAppSelector((state) => state.emailManagement);

  useEffect(() => {
    dispatch(fetchEmailHealth());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchEmailHealth());
  };

  if (healthError) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading email health report</h3>
            <p className="mt-2 text-sm text-red-700">{healthError}</p>
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

  if (healthLoading && !health) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
        <p className="mt-2 text-gray-500">Loading health report...</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="p-8 text-center">
        <Activity className="w-12 h-12 mx-auto text-gray-400" />
        <p className="mt-2 text-gray-500">No health data available</p>
        <button
          onClick={handleRefresh}
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Load Health Report
        </button>
      </div>
    );
  }

  const overallStatus = getHealthStatus(health.overall.delivery_rate, health.overall.bounce_rate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Email System Health</h2>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive health analysis and recommendations
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={healthLoading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${healthLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall Health Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Overall System Health</h3>
          <HealthIndicator 
            status={overallStatus} 
            label={overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)} 
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{health.overall.total_sent}</div>
            <div className="text-sm text-gray-500">Total Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{health.overall.delivery_rate.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">Delivery Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{health.overall.bounce_rate.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">Bounce Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{health.overall.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </div>
      </div>

      {/* Performance by Email Type */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance by Email Type</h3>
        
        <div className="space-y-4">
          {Object.entries(health.byType).map(([type, stats]) => {
            const typeStatus = getHealthStatus(stats.delivery_rate, stats.bounce_rate);
            
            return (
              <div key={type} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {type === 'ra-request' ? 'RA Request' : 
                       type === 'ra-reminder' ? 'RA Reminder' : 
                       type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  </div>
                  <HealthIndicator 
                    status={typeStatus} 
                    label={typeStatus.charAt(0).toUpperCase() + typeStatus.slice(1)} 
                  />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-900">{stats.total_sent}</div>
                    <div className="text-gray-500">Sent</div>
                  </div>
                  <div>
                    <div className="font-medium text-green-600">{stats.delivered}</div>
                    <div className="text-gray-500">Delivered</div>
                  </div>
                  <div>
                    <div className="font-medium text-red-600">{stats.bounced}</div>
                    <div className="text-gray-500">Bounced</div>
                  </div>
                  <div>
                    <div className="font-medium text-red-600">{stats.failed}</div>
                    <div className="text-gray-500">Failed</div>
                  </div>
                  <div>
                    <div className="font-medium text-yellow-600">{stats.pending}</div>
                    <div className="text-gray-500">Pending</div>
                  </div>
                </div>
                
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Delivery Rate</span>
                      <span>{stats.delivery_rate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          stats.delivery_rate >= 95 ? 'bg-green-500' : 
                          stats.delivery_rate >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(stats.delivery_rate, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Bounce Rate</span>
                      <span>{stats.bounce_rate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          stats.bounce_rate <= 2 ? 'bg-green-500' : 
                          stats.bounce_rate <= 5 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(stats.bounce_rate * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Issues */}
      {health.recentIssues && health.recentIssues.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Issues</h3>
          
          <div className="space-y-3">
            {health.recentIssues.map((issue) => (
              <div key={issue.id} className="flex items-start p-3 bg-red-50 border border-red-200 rounded-md">
                <XCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-red-800">
                      {issue.emailType === 'ra-request' ? 'RA Request' : 
                       issue.emailType === 'ra-reminder' ? 'RA Reminder' : 
                       issue.emailType} - {issue.status}
                    </p>
                    <span className="text-xs text-red-600">
                      {format(new Date(issue.sentAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-red-700">
                    To: {issue.recipientEmail}
                    {issue.pharmacyName && ` (${issue.pharmacyName})`}
                  </p>
                  {issue.errorMessage && (
                    <p className="text-xs text-red-600 mt-1 font-mono bg-red-100 p-1 rounded">
                      {issue.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Recommendations</h3>
        </div>
        
        <div className="space-y-3">
          {health.recommendations && health.recommendations.length > 0 ? (
            health.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Lightbulb className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-blue-800">{recommendation}</p>
              </div>
            ))
          ) : (
            <>
              {/* Generate recommendations based on stats */}
              {health.overall.delivery_rate < 85 && (
                <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Critical: Low Delivery Rate</p>
                    <p className="text-sm text-red-700">
                      Your delivery rate is {health.overall.delivery_rate.toFixed(1)}%. 
                      Check email authentication (SPF, DKIM, DMARC) and review content for spam triggers.
                    </p>
                  </div>
                </div>
              )}

              {health.overall.bounce_rate > 5 && (
                <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Warning: High Bounce Rate</p>
                    <p className="text-sm text-yellow-700">
                      Your bounce rate is {health.overall.bounce_rate.toFixed(1)}%. 
                      Implement email validation and clean up your email list.
                    </p>
                  </div>
                </div>
              )}

              {health.overall.failed > 0 && (
                <div className="flex items-start p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Action Required: Failed Emails</p>
                    <p className="text-sm text-orange-700">
                      You have {health.overall.failed} failed emails. 
                      Review error messages and implement retry logic for transient failures.
                    </p>
                  </div>
                </div>
              )}

              {health.overall.pending > 10 && (
                <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <Clock className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Info: High Pending Count</p>
                    <p className="text-sm text-blue-700">
                      You have {health.overall.pending} pending emails. 
                      Monitor delivery times and check for processing delays.
                    </p>
                  </div>
                </div>
              )}

              {health.overall.delivery_rate >= 95 && health.overall.bounce_rate <= 2 && health.overall.failed === 0 && (
                <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded-md">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Excellent: System Performing Well</p>
                    <p className="text-sm text-green-700">
                      Your email system is performing excellently. Continue monitoring to maintain this performance.
                    </p>
                  </div>
                </div>
              )}

              {/* General recommendations */}
              <div className="flex items-start p-3 bg-gray-50 border border-gray-200 rounded-md">
                <Lightbulb className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Best Practices</p>
                  <ul className="text-sm text-gray-700 mt-1 space-y-1">
                    <li>• Monitor email metrics daily</li>
                    <li>• Maintain clean email lists with validation</li>
                    <li>• Set up proper email authentication (SPF, DKIM, DMARC)</li>
                    <li>• Review and test email templates regularly</li>
                    <li>• Implement retry logic for transient failures</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}