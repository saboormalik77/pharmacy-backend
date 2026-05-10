"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Search,
  ClipboardCheck,
  ArrowRight,
  Package,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { apiClient } from "@/lib/api/client";
import { toast } from "react-toastify";
import Link from "next/link";

interface ReceivedReturn {
  id: string;
  licensePlate: string;
  pharmacyName: string;
  status: string;
  verificationStatus: string | null;
  totalItems: number;
  receivedAt: string;
  createdAt: string;
}

export default function WarehouseVerificationPage() {
  const [returns, setReturns] = useState<ReceivedReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (search) params.search = search;
      if (verificationStatus) params.verificationStatus = verificationStatus;

      const res = await apiClient.getApiWithoutPharmacyId<any>(
        "/admin/warehouse/received",
        params
      );
      setReturns(res.data?.data || res.data || []);
      setTotal(res.total ?? res.data?.total ?? 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to load received returns");
    } finally {
      setLoading(false);
    }
  }, [page, search, verificationStatus]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  useEffect(() => {
    setPage(1);
  }, [search, verificationStatus]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getVerificationBadge = (status: string | null) => {
    switch (status) {
      case "in_progress":
        return (
          <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700 border border-green-300">
            Completed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[#f5f2f1] text-[#505454] border border-[#e2e2e2]">
            Not Started
          </Badge>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 rounded-[4px] bg-[#f5f2f1] border-2 border-[#e2e2e2]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[4px] bg-[#f5f2f1]">
              <ClipboardCheck className="h-5 w-5 text-[#516057]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#000000]">
                Warehouse Verification
              </h1>
              <p className="text-xs text-[#505454] mt-0.5">
                Verify received returns — check items, report discrepancies
              </p>
            </div>
          </div>
        </div>

        <Card className="border-2 border-[#e2e2e2] bg-[#f5f2f1]">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#6b7280]" />
                <Input
                  placeholder="Search by license plate or pharmacy name..."
                  className="pl-7 h-7 text-xs border-[#e2e2e2] focus:border-[#e2e2e2]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-[#e2e2e2] hover:bg-[#f5f2f1]"
                onClick={() => {
                  setSearch("");
                  setVerificationStatus(null);
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 border-b-2 border-[#e2e2e2] bg-white rounded-t-lg p-1">
          {[
            { label: "All", value: null },
            { label: "Not Started", value: "not_started" },
            { label: "In Progress", value: "in_progress" },
            { label: "Completed", value: "completed" },
          ].map((tab) => {
            const isActive = verificationStatus === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => setVerificationStatus(tab.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-[4px] border-2 transition-all ${
                  isActive
                    ? "bg-[#f5f2f1] text-[#516057] border-[#e2e2e2] shadow-md scale-105"
                    : "bg-white text-[#505454] border-[#e2e2e2] hover:bg-[#f5f2f1]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <Card className="border-2 border-[#e2e2e2] bg-[#f5f2f1]">
          <CardContent className="p-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#516057]" />
                <span className="ml-2 text-sm text-[#6b7280]">Loading...</span>
              </div>
            ) : returns.length === 0 ? (
              <div className="text-center py-12 text-[#6b7280] text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                No received returns found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#f5f2f1] border-b-2 border-[#e2e2e2]">
                      <th className="text-left p-2 font-bold text-[#000000]">
                        License Plate
                      </th>
                      <th className="text-left p-2 font-bold text-[#000000]">
                        Pharmacy
                      </th>
                      <th className="text-left p-2 font-bold text-[#000000]">
                        Items
                      </th>
                      <th className="text-left p-2 font-bold text-[#000000]">
                        Received
                      </th>
                      <th className="text-left p-2 font-bold text-[#000000]">
                        Verification
                      </th>
                      <th className="text-left p-2 font-bold text-[#000000]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((r, idx) => (
                      <tr
                        key={r.id}
                        className={`border-b ${
                          idx % 2 === 0 ? "bg-white" : "bg-[#f5f2f1]/50"
                        } hover:bg-[#f5f2f1] transition-colors`}
                      >
                        <td className="p-2 font-semibold text-[#516057]">
                          {r.licensePlate}
                        </td>
                        <td className="p-2 text-[#505454]">{r.pharmacyName}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                            {r.totalItems}
                          </span>
                        </td>
                        <td className="p-2 text-[#505454]">
                          {formatDate(r.receivedAt || r.createdAt)}
                        </td>
                        <td className="p-2">
                          {getVerificationBadge(r.verificationStatus)}
                        </td>
                        <td className="p-2">
                          <Link href={`/warehouse/verification/${r.id}`}>
                            <Button
                              size="sm"
                              className="h-6 px-2 text-xs bg-[#516057] hover:bg-[#505454]"
                            >
                              {r.verificationStatus === "in_progress"
                                ? "Continue"
                                : r.verificationStatus === "completed"
                                ? "View"
                                : "Start"}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-xs text-[#6b7280]">
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
