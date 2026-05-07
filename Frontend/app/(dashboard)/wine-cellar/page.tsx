"use client";

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Archive,
  Search,
  Loader2,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import {
  wineCellarService,
  WineCellarItem,
  WineCellarStats,
  WineCellarListResponse,
} from '@/lib/api/services/wineCellarService';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'shelved', label: 'Shelved' },
  { value: 'ready_to_return', label: 'Ready to Return' },
  { value: 'returned', label: 'Returned' },
  { value: 'destroyed', label: 'Destroyed' },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'shelved':
      return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1 inline" />Shelved</Badge>;
    case 'ready_to_return':
      return <Badge variant="default" className="bg-green-100 text-green-800 text-xs"><CheckCircle2 className="w-3 h-3 mr-1 inline" />Ready</Badge>;
    case 'returned':
      return <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs"><Package className="w-3 h-3 mr-1 inline" />Returned</Badge>;
    case 'destroyed':
      return <Badge variant="destructive" className="text-xs"><Trash2 className="w-3 h-3 mr-1 inline" />Destroyed</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }
}

export default function WineCellarPage() {
  const [items, setItems] = useState<WineCellarItem[]>([]);
  const [stats, setStats] = useState<WineCellarStats | null>(null);
  const [summary, setSummary] = useState<WineCellarListResponse['summary'] | null>(null);
  const [pagination, setPagination] = useState<WineCellarListResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await wineCellarService.list({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit: 25,
      });
      setItems(data.items);
      setSummary(data.summary);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load wine cellar items');
    }
    setLoading(false);
  }, [statusFilter, search, page]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await wineCellarService.stats();
      setStats(data);
    } catch {
      // non-blocking
    }
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  return (
    <DashboardLayout>
      <PermissionGuard permission="wine_cellar:view">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Archive className="w-6 h-6 text-purple-600" /> Wine Cellar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Products shelved for future return when the manufacturer return window opens.
          </p>
        </div>

        {/* Stats Cards */}
        {stats && !statsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <p className="text-xs text-muted-foreground">Shelved</p>
                <p className="text-xl font-bold text-purple-700">{stats.shelved}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <p className="text-xs text-muted-foreground">Ready to Return</p>
                <p className="text-xl font-bold text-green-700">{stats.readyToReturn}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <p className="text-xs text-muted-foreground">Returned</p>
                <p className="text-xl font-bold text-blue-700">{stats.returned}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by NDC, product name, manufacturer..."
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <Button type="submit" variant="primary">Search</Button>
            </form>
          </CardContent>
        </Card>

        {/* Summary */}
        {summary && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Total: <strong className="text-foreground">{summary.totalItems}</strong></span>
            <span>Shelved: <strong className="text-purple-700">{summary.totalShelved}</strong></span>
            <span>Ready: <strong className="text-green-700">{summary.totalReady}</strong></span>
            <span>Value: <strong className="text-foreground">{formatCurrency(summary.totalValue)}</strong></span>
          </div>
        )}

        {/* Items Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No wine cellar items found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Products that are too early to return will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">NDC</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Manufacturer</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">QTY</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Est. Price</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expires</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Returnable</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Shelved</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate" title={item.productName || ''}>
                          {item.productName || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.ndc || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate" title={item.manufacturer || ''}>
                          {item.manufacturer || '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-foreground">
                          {item.quantity}
                          {item.isPartial && <span className="text-amber-600 ml-0.5 text-xs">P</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          {item.estimatedStorePrice != null ? formatCurrency(item.estimatedStorePrice) : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {item.expirationDate ? formatDate(item.expirationDate) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {item.expectedReturnableDate ? (
                            <span className="flex items-center gap-1 text-purple-700">
                              <Calendar className="w-3 h-3" />
                              {formatDate(item.expectedReturnableDate)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatDate(item.dateShelved)}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
      </PermissionGuard>
    </DashboardLayout>
  );
}
