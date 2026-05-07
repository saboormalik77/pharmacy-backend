"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  ArrowLeft,
  FileText, 
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Building2,
  Package,
  DollarSign,
  Calendar,
  Upload,
  Mail,
  Globe,
  Info,
} from 'lucide-react';
import { mockDocuments } from '@/data/mockDocuments';
import { mockPricingData } from '@/data/mockPricing';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';
import type { UploadedDocument, PricingData, DocumentStatus } from '@/types';
import Link from 'next/link';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [extractedItems, setExtractedItems] = useState<PricingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch document details
    const foundDoc = mockDocuments.find(doc => doc.id === documentId);
    if (foundDoc) {
      setDocument(foundDoc);
      // Get extracted items for this document
      const items = mockPricingData.filter(item => item.documentId === documentId);
      setExtractedItems(items);
    }
    setLoading(false);
  }, [documentId]);

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

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'manual_upload': return Upload;
      case 'email_forward': return Mail;
      case 'portal_fetch': return Globe;
      default: return FileText;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!document) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2">Document Not Found</h2>
          <p className="text-gray-600 mb-4">The document you're looking for doesn't exist.</p>
          <Link href="/documents">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Documents
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const StatusIcon = getStatusIcon(document.status);
  const SourceIcon = getSourceIcon(document.source);
  const isProcessing = document.status === 'processing' || document.status === 'uploading';

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div className="flex items-center gap-3">
            <Link href="/documents">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Document Details</h1>
              <p className="text-xs text-gray-600 mt-0.5">View complete document information</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {document.status === 'completed' && (
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white border-0">
                <Download className="mr-1 h-3 w-3" />
                Download
              </Button>
            )}
            {(document.status === 'failed' || document.status === 'needs_review') && (
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-1 h-3 w-3" />
                Retry Processing
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-3">
            {/* Document Information */}
            <Card className="border-2 border-teal-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      document.status === 'completed' ? 'bg-emerald-100' :
                      document.status === 'processing' || document.status === 'uploading' ? 'bg-cyan-100' :
                      document.status === 'failed' ? 'bg-red-100' :
                      'bg-amber-100'
                    }`}>
                      <StatusIcon className={`h-6 w-6 ${
                        document.status === 'completed' ? 'text-emerald-600' :
                        document.status === 'processing' || document.status === 'uploading' ? 'text-cyan-600 animate-spin' :
                        document.status === 'failed' ? 'text-red-600' :
                        'text-amber-600'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{document.fileName}</CardTitle>
                      <Badge variant={getStatusVariant(document.status)} className="text-xs border-2 mt-1">
                        {getStatusLabel(document.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Processing Progress */}
                {isProcessing && document.processingProgress !== undefined && (
                  <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-cyan-900">Processing Document</span>
                      <span className="text-sm font-bold text-cyan-700">{document.processingProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-cyan-600 h-3 rounded-full transition-all"
                        style={{ width: `${document.processingProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-cyan-700 mt-2">Extracting data from document...</p>
                  </div>
                )}

                {/* Error Message */}
                {document.errorMessage && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900 mb-1">Processing Error</p>
                        <p className="text-sm text-red-700">{document.errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Document Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">File Name</p>
                    <p className="text-sm font-semibold text-gray-900">{document.fileName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">File Size</p>
                    <p className="text-sm text-gray-900">{formatFileSize(document.fileSize)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">File Type</p>
                    <p className="text-sm text-gray-900">{document.fileType}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Upload Source</p>
                    <div className="flex items-center gap-2">
                      <SourceIcon className="h-4 w-4 text-gray-600" />
                      <p className="text-sm text-gray-900 capitalize">{document.source.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Uploaded At</p>
                    <p className="text-sm text-gray-900">{formatDateTime(document.uploadedAt)}</p>
                  </div>
                  {document.processedAt && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Processed At</p>
                      <p className="text-sm text-gray-900">{formatDateTime(document.processedAt)}</p>
                    </div>
                  )}
                </div>

                {/* Reverse Distributor Information */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-5 w-5 text-teal-600" />
                    <CardTitle className="text-base">Reverse Distributor</CardTitle>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900">{document.reverseDistributorName}</p>
                    <p className="text-xs text-gray-600 mt-1">ID: {document.reverseDistributorId}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Extracted Items */}
            {extractedItems.length > 0 && (
              <Card className="border-2 border-emerald-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-emerald-600" />
                      <CardTitle className="text-base">Extracted Items ({extractedItems.length})</CardTitle>
                    </div>
                    {document.totalCreditAmount && (
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Total Credit</p>
                        <p className="text-lg font-bold text-emerald-700">
                          {formatCurrency(document.totalCreditAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-emerald-100 to-teal-100 border-b-2 border-emerald-200">
                          <th className="text-left p-2 font-bold text-emerald-900">NDC</th>
                          <th className="text-left p-2 font-bold text-emerald-900">Product Name</th>
                          <th className="text-left p-2 font-bold text-emerald-900">Manufacturer</th>
                          <th className="text-left p-2 font-bold text-emerald-900">Lot Number</th>
                          <th className="text-left p-2 font-bold text-emerald-900">Quantity</th>
                          <th className="text-left p-2 font-bold text-emerald-900">Price/Unit</th>
                          <th className="text-left p-2 font-bold text-emerald-900">Credit Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedItems.map((item, idx) => (
                          <tr
                            key={item.id}
                            className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-emerald-50 transition-colors`}
                          >
                            <td className="p-2 font-mono text-xs">{item.ndc}</td>
                            <td className="p-2 font-medium">{item.productName}</td>
                            <td className="p-2 text-gray-700">{item.manufacturer}</td>
                            <td className="p-2 text-gray-600">{item.lotNumber}</td>
                            <td className="p-2">{item.quantity}</td>
                            <td className="p-2 font-semibold text-emerald-700">
                              {formatCurrency(item.pricePerUnit)}
                            </td>
                            <td className="p-2 font-bold text-emerald-700">
                              {formatCurrency(item.creditAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {document.totalCreditAmount && (
                        <tfoot>
                          <tr className="bg-emerald-100 border-t-2 border-emerald-200">
                            <td colSpan={6} className="p-2 text-right font-bold text-emerald-900">
                              Total:
                            </td>
                            <td className="p-2 font-bold text-lg text-emerald-900">
                              {formatCurrency(document.totalCreditAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Items Message */}
            {extractedItems.length === 0 && document.status === 'completed' && (
              <Card className="border-2 border-amber-200">
                <CardContent className="p-8 text-center">
                  <Info className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                  <p className="text-gray-600 text-sm">No items were extracted from this document.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            {/* Summary Card */}
            <Card className="border-2 border-teal-200">
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Items Extracted</span>
                  </div>
                  <span className="font-bold text-gray-900">{document.extractedItems}</span>
                </div>
                {document.totalCreditAmount && (
                  <div className="flex items-center justify-between p-2 bg-emerald-50 rounded">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm text-emerald-700 font-medium">Total Credit</span>
                    </div>
                    <span className="font-bold text-lg text-emerald-700">
                      {formatCurrency(document.totalCreditAmount)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Upload Date</span>
                  </div>
                  <span className="text-xs text-gray-900">{formatDate(document.uploadedAt)}</span>
                </div>
                {document.processedAt && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-600">Processed Date</span>
                    </div>
                    <span className="text-xs text-gray-900">{formatDate(document.processedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Processing Time */}
            {document.processedAt && (
              <Card className="border-2 border-cyan-200">
                <CardHeader>
                  <CardTitle className="text-base">Processing Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan-700">
                      {Math.round(
                        (new Date(document.processedAt).getTime() - new Date(document.uploadedAt).getTime()) / 1000
                      )}s
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Time to process document</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {document.status === 'completed' && (
                  <Button variant="outline" className="w-full" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download Data
                  </Button>
                )}
                {(document.status === 'failed' || document.status === 'needs_review') && (
                  <Button variant="outline" className="w-full" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Processing
                  </Button>
                )}
                <Link href="/documents">
                  <Button variant="outline" className="w-full" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Documents
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

