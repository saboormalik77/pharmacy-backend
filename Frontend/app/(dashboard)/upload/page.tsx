"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Mail,
  Globe,
  CloudUpload,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { mockDistributors } from '@/data/mockDistributors';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import type { UploadedDocument, DocumentSource, DocumentStatus } from '@/types';
import Link from 'next/link';
import { documentsService } from '@/lib/api/services';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const [selectedDistributor, setSelectedDistributor] = useState<string>('');
  const [uploadSource, setUploadSource] = useState<DocumentSource>('manual_upload');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Documents list state
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Check if any document is currently uploading or processing
  const hasUploadingDocuments = documents.some(
    doc => doc.status === 'uploading' || doc.status === 'processing'
  );
  
  // Combined check: uploading state or has uploading documents
  const isUploadInProgress = uploading || hasUploadingDocuments;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploadInProgress) {
    setIsDragging(true);
    }
  }, [isUploadInProgress]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Prevent dropping files when upload is in progress
    if (isUploadInProgress) {
      return;
    }
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf' || file.name.endsWith('.pdf')
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  }, [isUploadInProgress]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent selecting files when upload is in progress
    if (isUploadInProgress) {
      return;
    }
    
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type === 'application/pdf' || file.name.endsWith('.pdf')
      );
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    // Prevent removing files when upload is in progress
    if (isUploadInProgress) {
      return;
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Upload files one by one
      for (const file of files) {
        await documentsService.uploadDocument(file, selectedDistributor || undefined);
      }
      
      setSuccess(`Successfully uploaded ${files.length} file(s)! Processing will begin shortly.`);
      setFiles([]);
      setSelectedDistributor('');
      setIsUploadModalOpen(false);
      
      // Reload documents list after upload
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Load documents
  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  const loadDocuments = async () => {
    try {
      setDocumentsLoading(true);
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
      setDocumentsLoading(false);
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

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

  // Handle viewing the file
  const handleViewFile = async (doc: UploadedDocument) => {
    try {
      setError(null);
      setViewingDocId(doc.id);
      const blob = await documentsService.viewDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
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
      const blob = await documentsService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
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
      <div className="space-y-2 p-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:py-2 sm:px-3 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div>
            <h1 className="text-lg sm:text-md font-bold text-gray-900">Upload Documents</h1>
            {/* <p className="text-xs text-gray-600 mt-0.5">Upload credit reports from reverse distributors</p> */}
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            disabled={isUploadInProgress}
            className="mt-3 sm:mt-0 px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
            title={isUploadInProgress ? 'Please wait for current upload to complete' : 'Upload Documents'}
          >
            <Upload className="h-3 w-3" />
            <span>Upload Documents</span>
          </button>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="p-2 rounded-lg bg-red-50 border-2 border-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 rounded"
            >
              <X className="h-3 w-3 text-red-600" />
            </button>
          </div>
        )}
        {success && (
          <div className="p-2 rounded-lg bg-green-50 border-2 border-green-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-800">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto p-1 hover:bg-green-100 rounded"
            >
              <X className="h-3 w-3 text-green-600" />
            </button>
          </div>
        )}
        {isUploadInProgress && !uploading && (
          <div className="p-2 rounded-lg bg-blue-50 border-2 border-blue-200 flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-600 flex-shrink-0 animate-spin" />
            <p className="text-xs text-blue-800">
              Document upload/processing in progress. Please wait before uploading new documents.
            </p>
          </div>
        )}

        {/* Documents List - First Section */}
        <Card className="border-2 border-teal-200">
          <CardHeader className="p-2">
            <CardTitle className="text-sm sm:text-base">All Documents</CardTitle>
            <CardDescription className="text-xs">View and manage uploaded credit reports</CardDescription>
          </CardHeader>
          <CardContent className="p-2 space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      loadDocuments();
                    }
                  }}
                  className="pl-8 text-xs"
                />
              </div>
              <button onClick={loadDocuments} className="w-full sm:w-auto px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs">
                <Search className="h-3 w-3" />
                <span>Search</span>
              </button>
            </div>

            {/* Documents Table */}
            {documentsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 mx-auto mb-2 text-teal-600 animate-spin" />
                <p className="text-gray-500 text-xs">Loading documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500 text-xs">No documents found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">File Name</th>
                        <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Distributor</th>
                        <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Uploaded</th>
                        {/* <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Status</th> */}
                        {/* <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Credit</th> */}
                        <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDocuments.map((doc) => {
                        const StatusIcon = getStatusIcon(doc.status);
                        const isProcessing = doc.status === 'processing' || doc.status === 'uploading';
                        
                        return (
                          <tr
                            key={doc.id}
                            className="border-b border-gray-100 hover:bg-teal-50/50 transition-colors"
                          >
                            <td className="py-3 px-2 sm:px-4">
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3 text-teal-600 flex-shrink-0" />
                                <span className="text-xs font-medium text-gray-900 truncate max-w-[200px]">{doc.fileName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 sm:px-4">
                              <span className="text-xs text-gray-600 truncate max-w-[150px] block">{doc.reverseDistributorName || '-'}</span>
                            </td>
                            <td className="py-3 px-2 sm:px-4">
                              <span className="text-xs text-gray-600 whitespace-nowrap">{formatDate(doc.uploadedAt)}</span>
                            </td>
                            {/* <td className="py-3 px-4">
                              <Badge variant={getStatusVariant(doc.status)} className="text-xs border-2">
                                <StatusIcon className={`h-3 w-3 mr-1 inline ${
                                  isProcessing ? 'animate-spin' : ''
                                }`} />
                                {getStatusLabel(doc.status)}
                              </Badge>
                            </td> */}
                            {/* <td className="py-3 px-4">
                              {doc.totalCreditAmount ? (
                                <span className="text-sm font-bold text-emerald-700">
                                  {formatCurrency(doc.totalCreditAmount)}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td> */}
                            <td className="py-3 px-2 sm:px-4">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <button 
                                  className="px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                                  onClick={() => handleViewFile(doc)}
                                  disabled={viewingDocId === doc.id || downloadingDocId === doc.id}
                                >
                                  {viewingDocId === doc.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Eye className="h-3 w-3" /> 
                                  )}
                                  <span>View</span>
                                </button>
                                {doc.status === 'completed' && (
                                  <button 
                                    className="px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                                    onClick={() => handleDownloadFile(doc)}
                                    disabled={viewingDocId === doc.id || downloadingDocId === doc.id}
                                  >
                                    {downloadingDocId === doc.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Download className="h-3 w-3" />
                                    )}
                                    <span>Download</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-600">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredDocuments.length)} of {filteredDocuments.length} documents
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        <span className="hidden sm:inline">Previous</span>
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`min-w-[32px] px-2 py-1 rounded-lg text-xs ${
                                  currentPage === page
                                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span key={page} className="px-2 text-gray-400 text-xs">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Upload Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsUploadModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <Card className="border-0 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-2">
                  <div>
                    <CardTitle className="text-sm sm:text-base">Upload New Documents</CardTitle>
                    <CardDescription className="text-xs">Upload PDF credit reports</CardDescription>
                  </div>
                  <button
                    onClick={() => !isUploadInProgress && setIsUploadModalOpen(false)}
                    disabled={isUploadInProgress}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isUploadInProgress ? 'Cannot close while uploading' : 'Close'}
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </CardHeader>
                <CardContent className="p-2 space-y-3">
                  {/* Drag and Drop Area */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                      isUploadInProgress
                        ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
                        : isDragging
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-300 hover:border-teal-400 hover:bg-teal-50/50'
                    }`}
                  >
                    <Upload className={`h-6 w-6 mx-auto mb-2 ${isUploadInProgress ? 'text-gray-400' : 'text-teal-500'}`} />
                    <p className={`text-xs font-medium mb-1 ${isUploadInProgress ? 'text-gray-500' : ''}`}>
                      {isUploadInProgress ? 'Upload in progress... Please wait' : 'Drag and drop PDF files here, or click to select'}
                    </p>
                    <p className="text-[10px] text-gray-500 mb-3">
                      Supports PDF files from all major reverse distributors
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      onChange={handleFileSelect}
                      disabled={isUploadInProgress}
                      className="hidden"
                      id="file-upload"
                    />
                    <button 
                      type="button"
                      onClick={() => !isUploadInProgress && fileInputRef.current?.click()}
                      disabled={isUploadInProgress}
                      className="mx-auto px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                    >
                      Choose Files
                    </button>
                  </div>

                  {/* File List */}
                  {files.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Selected Files ({files.length})</p>
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="h-4 w-4 text-teal-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              disabled={isUploadInProgress}
                              className="p-1 hover:bg-red-100 rounded text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={isUploadInProgress ? 'Cannot remove files while uploading' : 'Remove file'}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  <button
                    onClick={handleUpload}
                    disabled={files.length === 0 || uploading}
                    className="w-full px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3" />
                        <span>Upload {files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : 'Files'}</span>
                      </>
                    )}
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

