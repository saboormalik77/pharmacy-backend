"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Search,
  Package,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Warehouse,
} from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { apiClient } from "@/lib/api/client";
import { toast } from "react-toastify";

interface GlobalSurplusItem {
  id: string;
  ndc: string;
  productName: string;
  manufacturer: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  warehouseLocation: string;
  condition: string;
  status: string;
  notes: string;
  licensePlate: string;
  pharmacyName: string;
  createdAt: string;
}

export default function WarehouseSurplusPage() {
  const [items, setItems] = useState<GlobalSurplusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchSurplus = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.getApiWithoutPharmacyId<any>(
        "/admin/warehouse/surplus",
        params
      );
      setItems(res.data?.data || res.data || []);
      setTotal(res.total ?? res.data?.total ?? 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to load surplus inventory");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchSurplus();
  }, [fetchSurplus]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const conditionBadge = (condition: string) => {
    switch (condition) {
      case "good":
        return "bg-green-100 text-green-700";
      case "damaged":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "stored":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "assigned_to_return":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "disposed":
        return "bg-gray-200 text-gray-600 border-gray-400";
      default:
        return "bg-gray-100 text-gray-600 border-gray-300";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Warehouse className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Surplus Inventory
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                All surplus items across all verified returns
              </p>
            </div>
          </div>
        </div>

        <Card className="border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-blue-500" />
                <Input
                  placeholder="Search by NDC, product name, or location..."
                  className="pl-7 h-7 text-xs border-blue-200 focus:border-blue-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-gray-300 hover:bg-gray-100"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(null);
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 border-b-2 border-gray-200 bg-white rounded-t-lg p-1">
          {[
            { label: "All", value: null },
            { label: "Stored", value: "stored" },
            { label: "Assigned to Return", value: "assigned_to_return" },
            { label: "Disposed", value: "disposed" },
          ].map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
                  isActive
                    ? "bg-blue-100 text-blue-700 border-blue-300 shadow-md scale-105"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <Card className="border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
          <CardContent className="p-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-500">Loading...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                No surplus items found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b-2 border-blue-200">
                      <th className="text-left p-2 font-bold text-blue-900">
                        Product
                      </th>
                      <th className="text-left p-2 font-bold text-blue-900">
                        NDC
                      </th>
                      <th className="text-left p-2 font-bold text-blue-900">
                        Lot
                      </th>
                      <th className="text-left p-2 font-bold text-blue-900">
                        Qty
                      </th>
                      <th className="text-left p-2 font-bold text-blue-900">
                        Location
                      </th>
                      <th className="text-left p-2 font-bold text-blue-900">
                        Condition
                      </th>
                      <th className="text-left p-2 font-bold text-blue-900">
                        Status
                      </th>
                      <th className="text-left p-2 font-bold text-blue-900">
                        From Return
                      </th>
                      <th className="text-left p-2 font-bold text-blue-900">
                        Added
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`border-b ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        } hover:bg-blue-50 transition-colors`}
                      >
                        <td className="p-2 font-medium text-gray-900">
                          {item.productName || "—"}
                        </td>
                        <td className="p-2 font-mono text-gray-600">
                          {item.ndc || "—"}
                        </td>
                        <td className="p-2 text-gray-600">
                          {item.lotNumber || "—"}
                        </td>
                        <td className="p-2 font-medium">{item.quantity}</td>
                        <td className="p-2 text-gray-600">
                          {item.warehouseLocation}
                        </td>
                        <td className="p-2">
                          <Badge
                            className={`text-xs ${conditionBadge(
                              item.condition
                            )}`}
                          >
                            {item.condition}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge
                            className={`text-xs border ${statusBadge(
                              item.status
                            )}`}
                          >
                            {item.status?.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="text-gray-700">
                            {item.licensePlate || "—"}
                          </div>
                          {item.pharmacyName && (
                            <div className="text-gray-400">
                              {item.pharmacyName}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-gray-600">
                          {item.createdAt ? formatDate(item.createdAt) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-xs text-gray-500">
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
