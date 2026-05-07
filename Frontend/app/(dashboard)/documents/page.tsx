"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { 
  FileText, 
  Search, 
  Filter,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { documentsService } from '@/lib/api/services';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { DocumentStatus, UploadedDocument } from '@/types';
import Link from 'next/link';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (searchQuery) {
        filters.search = searchQuery;
      }
      const result = await documentsService.getDocuments(filters);
      setDocuments(result.documents);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' || (
      (doc.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.reverseDistributorName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: DocumentStatus) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'info';
      case 'failed': return 'error';
      case 'needs_review': return 'warning';
      case 'uploading': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'processing': return Loader2;
      case 'failed': return AlertCircle;
      case 'needs_review': return AlertCircle;
      case 'uploading': return Clock;
      default: return FileText;
    }
  };

  const getStatusLabel = (status: DocumentStatus) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const statusCounts = {
    all: documents.length,
    completed: documents.filter(d => d.status === 'completed').length,
    processing: documents.filter(d => d.status === 'processing').length,
    failed: documents.filter(d => d.status === 'failed').length,
    needs_review: documents.filter(d => d.status === 'needs_review').length,
    uploading: documents.filter(d => d.status === 'uploading').length,
  };

  // Handle viewing the file
  const handleViewFile = async (doc: UploadedDocument) => {
    try {
      setError(null);
      setViewingDocId(doc.id);
      // Fetch the document blob from API
      const blob = await documentsService.viewDocument(doc.id);
      
      // Create a blob URL and open in new tab
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Cleanup after a delay (give time for the tab to load)
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to view document');
    } finally {
      setViewingDocId(null);
    }
  };

  // Handle downloading the file
  const handleDownloadFile = async (doc: UploadedDocument) => {
    try {
      setError(null);
      setDownloadingDocId(doc.id);
      // Fetch the document blob from API
      const blob = await documentsService.downloadDocument(doc.id);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download file');
    } finally {
      setDownloadingDocId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Documents</h1>
            <p className="text-xs text-gray-600 mt-0.5">View and manage uploaded credit reports</p>
          </div>
          <Link href="/upload">
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white border-0">
              Upload Documents
            </Button>
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2 rounded text-sm bg-red-50 text-red-800 border border-red-200">
            {error}
          </div>
        )}

        {/* Filters */}
        <Card className="border-2 border-teal-200">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      loadDocuments();
                    }
                  }}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="sm" onClick={loadDocuments}>
                <Filter className="mr-1 h-3 w-3" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Tabs */}
        {/* <div className="flex gap-2 border-b-2 border-gray-200 bg-white rounded-t-lg p-1 overflow-x-auto">
          {[
            { value: 'all', label: 'All', count: statusCounts.all },
            { value: 'completed', label: 'Completed', count: statusCounts.completed },
            { value: 'processing', label: 'Processing', count: statusCounts.processing },
            { value: 'needs_review', label: 'Needs Review', count: statusCounts.needs_review },
            { value: 'failed', label: 'Failed', count: statusCounts.failed },
          ].map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value as any)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-100 text-teal-700 border-teal-300 shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.label} <span className={`font-bold ${isActive ? '' : 'text-gray-400'}`}>({tab.count})</span>
              </button>
            );
          })}
        </div> */}

        {/* Documents List */}
        <Card className="border-2 border-teal-200">
          <CardContent className="p-3">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-teal-600 animate-spin" />
                <p className="text-gray-500 text-sm">Loading documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 text-sm">No documents found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocuments.map((doc) => {
                  const StatusIcon = getStatusIcon(doc.status);
                  const isProcessing = doc.status === 'processing' || doc.status === 'uploading';
                  
                  return (
                    <div
                      key={doc.id}
                      className="p-3 rounded-lg border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg ${
                            doc.status === 'completed' ? 'bg-emerald-100' :
                            doc.status === 'processing' || doc.status === 'uploading' ? 'bg-cyan-100' :
                            doc.status === 'failed' ? 'bg-red-100' :
                            'bg-amber-100'
                          }`}>
                            <StatusIcon className={`h-5 w-5 ${
                              doc.status === 'completed' ? 'text-emerald-600' :
                              doc.status === 'processing' || doc.status === 'uploading' ? 'text-cyan-600 animate-spin' :
                              doc.status === 'failed' ? 'text-red-600' :
                              'text-amber-600'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{doc.fileName}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                              <span>{doc.reverseDistributorName}</span>
                              <span>•</span>
                              <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                              <span>•</span>
                              <span>{formatDate(doc.uploadedAt)}</span>
                            </div>
                            {doc.errorMessage && (
                              <p className="text-xs text-red-600 mt-1">{doc.errorMessage}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={getStatusVariant(doc.status)} className="text-xs border-2 ml-2">
                          {getStatusLabel(doc.status)}
                        </Badge>
                      </div>

                      {/* Progress Bar for Processing */}
                      {isProcessing && doc.processingProgress !== undefined && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Processing...</span>
                            <span>{doc.processingProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-cyan-600 h-2 rounded-full transition-all"
                              style={{ width: `${doc.processingProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Document Details */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>
                            <span className="font-medium">Items:</span> {doc.extractedItems}
                          </span>
                          {doc.totalCreditAmount && (
                            <span>
                              <span className="font-medium">Credit:</span>{' '}
                              <span className="font-bold text-emerald-700">
                                {formatCurrency(doc.totalCreditAmount)}
                              </span>
                            </span>
                          )}
                          <span>
                            <span className="font-medium">Source:</span> {doc.source.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={() => handleViewFile(doc)}
                            disabled={viewingDocId === doc.id || downloadingDocId === doc.id}
                          >
                            {viewingDocId === doc.id ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Viewing...
                              </>
                            ) : (
                              <>
                                <Eye className="mr-1 h-3 w-3" />
                                View
                              </>
                            )}
                          </Button>
                          {doc.status === 'completed' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={() => handleDownloadFile(doc)}
                              disabled={viewingDocId === doc.id || downloadingDocId === doc.id}
                            >
                              {downloadingDocId === doc.id ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <Download className="mr-1 h-3 w-3" />
                                  Download
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

