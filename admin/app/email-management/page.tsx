'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
  fetchEmailLogs,
  retryEmail,
  resolveEmail,
  setFilters,
  clearFilters,
  clearErrors,
  type EmailLog,
} from '@/lib/store/emailManagementSlice';
import { 
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Mail,
  ExternalLink,
  MoreHorizontal,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  sent: { icon: Clock, color: 'text-yellow-600 bg-yellow-100', label: 'Sent' },
  delivered: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Delivered' },
  bounced: { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'Bounced' },
  failed: { icon: AlertTriangle, color: 'text-red-600 bg-red-100', label: 'Failed' },
  complained: { icon: XCircle, color: 'text-orange-600 bg-orange-100', label: 'Complained' },
};

const emailTypeConfig = {
  'ra-request': { label: 'RA Request', color: 'bg-blue-100 text-blue-800' },
  'ra-reminder': { label: 'RA Reminder', color: 'bg-purple-100 text-purple-800' },
  'system': { label: 'System', color: 'bg-gray-100 text-gray-800' },
};

export default function EmailLogsPage() {
  const dispatch = useAppDispatch();
  const {
    logs,
    logsLoading,
    logsError,
    logsPagination,
    filters,
    isActionLoading,
    actionError,
  } = useAppSelector((state) => state.emailManagement);

  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');

  useEffect(() => {
    dispatch(fetchEmailLogs({ page: 1, filters }));
  }, [dispatch, filters]);

  const handleFilterChange = (key: string, value: string) => {
    dispatch(setFilters({ [key]: value }));
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
  };

  const handleRefresh = () => {
    dispatch(fetchEmailLogs({ page: logsPagination.page, filters }));
  };

  const handlePageChange = (page: number) => {
    dispatch(fetchEmailLogs({ page, filters }));
  };

  const handleRetry = async (emailId: string) => {
    try {
      await dispatch(retryEmail(emailId)).unwrap();
      dispatch(fetchEmailLogs({ page: logsPagination.page, filters }));
    } catch (error) {
      console.error('Failed to retry email:', error);
    }
  };

  const handleResolve = async (emailId: string) => {
    try {
      await dispatch(resolveEmail({ emailLogId: emailId, notes: resolveNotes })).unwrap();
      dispatch(fetchEmailLogs({ page: logsPagination.page, filters }));
      setSelectedLog(null);
      setResolveNotes('');
    } catch (error) {
      console.error('Failed to resolve email:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.failed;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getEmailTypeBadge = (type: string) => {
    const config = emailTypeConfig[type as keyof typeof emailTypeConfig] || emailTypeConfig.system;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (logsError) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading email logs</h3>
            <p className="mt-2 text-sm text-red-700">{logsError}</p>
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
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search emails..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>

          {/* Clear Filters */}
          {(filters.status || filters.emailType || filters.dateFrom || filters.dateTo || filters.search) && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          disabled={logsLoading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-md space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="bounced">Bounced</option>
                <option value="failed">Failed</option>
                <option value="complained">Complained</option>
              </select>
            </div>

            {/* Email Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.emailType}
                onChange={(e) => handleFilterChange('emailType', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All types</option>
                <option value="ra-request">RA Request</option>
                <option value="ra-reminder">RA Reminder</option>
                <option value="system">System</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Email Logs Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {logsLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading email logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">No email logs found</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-200">
              {logs.map((log) => (
                <li key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        {getEmailTypeBadge(log.emailType)}
                        {getStatusBadge(log.status)}
                        {log.memoNumber && (
                          <span className="text-xs text-gray-500">
                            Memo: {log.memoNumber}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-900">
                          {log.subject || 'No subject'}
                        </p>
                        <p className="text-sm text-gray-500">
                          To: {log.recipientEmail}
                          {log.pharmacyName && ` • ${log.pharmacyName}`}
                        </p>
                      </div>
                      
                      <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                        <span>Sent: {format(new Date(log.sentAt), 'MMM d, yyyy h:mm a')}</span>
                        {log.deliveredAt && (
                          <span>Delivered: {format(new Date(log.deliveredAt), 'MMM d, yyyy h:mm a')}</span>
                        )}
                        {log.bouncedAt && (
                          <span>Bounced: {format(new Date(log.bouncedAt), 'MMM d, yyyy h:mm a')}</span>
                        )}
                      </div>
                      
                      {log.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                          {log.errorMessage}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* View Details */}
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {/* Retry (for failed/bounced emails) */}
                      {(log.status === 'failed' || log.status === 'bounced') && (
                        <button
                          onClick={() => handleRetry(log.id)}
                          disabled={isActionLoading}
                          className="p-1 text-blue-400 hover:text-blue-600 disabled:opacity-50"
                          title="Retry email"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* External Link (if resend email ID exists) */}
                      {log.resendEmailId && (
                        <a
                          href={`https://resend.com/emails/${log.resendEmailId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="View in Resend"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            
            {/* Pagination */}
            {logsPagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(logsPagination.page - 1)}
                    disabled={logsPagination.page <= 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(logsPagination.page + 1)}
                    disabled={logsPagination.page >= logsPagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {(logsPagination.page - 1) * logsPagination.limit + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(logsPagination.page * logsPagination.limit, logsPagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{logsPagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(logsPagination.page - 1)}
                        disabled={logsPagination.page <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, logsPagination.totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pageNum === logsPagination.page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(logsPagination.page + 1)}
                        disabled={logsPagination.page >= logsPagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Email Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Email Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <div className="mt-1">{getEmailTypeBadge(selectedLog.emailType)}</div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.subject || 'No subject'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recipient</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.recipientEmail}</p>
                </div>
                
                {selectedLog.pharmacyName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pharmacy</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.pharmacyName}</p>
                  </div>
                )}
                
                {selectedLog.memoNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Memo Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.memoNumber}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sent At</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(new Date(selectedLog.sentAt), 'MMM d, yyyy h:mm:ss a')}
                    </p>
                  </div>
                  {selectedLog.deliveredAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Delivered At</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {format(new Date(selectedLog.deliveredAt), 'MMM d, yyyy h:mm:ss a')}
                      </p>
                    </div>
                  )}
                </div>
                
                {selectedLog.errorMessage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Error Message</label>
                    <div className="mt-1 p-3 bg-red-50 rounded text-sm text-red-700">
                      {selectedLog.errorMessage}
                    </div>
                  </div>
                )}
                
                {selectedLog.resendEmailId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resend Email ID</label>
                    <div className="mt-1 flex items-center space-x-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">{selectedLog.resendEmailId}</code>
                      <a
                        href={`https://resend.com/emails/${selectedLog.resendEmailId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                {(selectedLog.status === 'failed' || selectedLog.status === 'bounced') && (
                  <>
                    <button
                      onClick={() => handleRetry(selectedLog.id)}
                      disabled={isActionLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retry Email
                    </button>
                    
                    <div className="flex-1">
                      <textarea
                        placeholder="Resolution notes (optional)"
                        value={resolveNotes}
                        onChange={(e) => setResolveNotes(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        rows={2}
                      />
                      <button
                        onClick={() => handleResolve(selectedLog.id)}
                        disabled={isActionLoading}
                        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Resolved
                      </button>
                    </div>
                  </>
                )}
                
                <button
                  onClick={() => setSelectedLog(null)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Error */}
      {actionError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-md p-4 max-w-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{actionError}</p>
              <button
                onClick={() => dispatch(clearErrors())}
                className="mt-1 text-sm text-red-800 underline hover:text-red-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}