"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  ArrowLeft,
  Loader2,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Plus,
  ClipboardCheck,
  BarChart3,
  ShieldAlert,
  BoxIcon,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { apiClient } from "@/lib/api/client";
import { toast } from "react-toastify";
import Link from "next/link";
import {
  shouldShowWarehouseBoxCountStep,
  isWarehouseVerificationAlreadyCompleted,
} from "@/lib/utils/warehouseVerificationUi";

interface VerificationItem {
  id: string;
  ndc: string;
  proprietaryName: string;
  genericName: string;
  manufacturer: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  actualQuantity: number | null;
  verified: boolean;
  verificationStatus: string | null;
  conditionNotes: string | null;
  returnStatus: string;
  estimatedValue: number;
}

interface SurplusItem {
  id: string;
  ndc: string;
  productName: string;
  manufacturer: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  warehouseLocation: string;
  condition: string;
  notes: string;
  createdAt: string;
}

interface Discrepancy {
  id: string;
  type: string;
  productName: string;
  ndc: string;
  expectedQuantity: number;
  actualQuantity: number;
  status: string;
  resolution: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

interface Counts {
  totalItems: number;
  correct: number;
  damaged: number;
  missing: number;
  wrongItem: number;
  unverified: number;
  surplus: number;
}

interface VerificationSummary {
  transaction: any;
  items: VerificationItem[];
  counts: Counts;
  surplus: SurplusItem[];
  discrepancies: Discrepancy[];
  discrepancyCounts: { total: number; open: number };
}

type ActiveTab = "items" | "surplus" | "discrepancies";

export default function VerificationSessionPage() {
  const params = useParams();
  const router = useRouter();
  const returnId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("items");

  // Box count (step 2)
  const [needsBoxCount, setNeedsBoxCount] = useState(false);
  const [boxCount, setBoxCount] = useState("");
  const [startingVerification, setStartingVerification] = useState(false);
  const [boxResult, setBoxResult] = useState<{
    expectedBoxes: number;
    receivedBoxes: number;
    boxCountMatch: boolean;
  } | null>(null);

  // Item verify inline state
  const [verifyingItemId, setVerifyingItemId] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string>("");
  const [verifyActualQty, setVerifyActualQty] = useState<string>("");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Surplus form
  const [showSurplusForm, setShowSurplusForm] = useState(false);
  const [surplusForm, setSurplusForm] = useState({
    ndc: "",
    productName: "",
    manufacturer: "",
    lotNumber: "",
    expirationDate: "",
    quantity: "",
    warehouseLocation: "",
    condition: "good",
    notes: "",
  });
  const [submittingSurplus, setSubmittingSurplus] = useState(false);

  // Complete verification
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [completeNotes, setCompleteNotes] = useState("");
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [completeSummary, setCompleteSummary] = useState<any>(null);

  // Discrepancy resolve
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [submittingResolve, setSubmittingResolve] = useState(false);

  const verificationAlreadyCompleted = isWarehouseVerificationAlreadyCompleted(
    summary?.transaction
  );

  const fetchSummary = useCallback(async () => {
    try {
      const res = await apiClient.getApiWithoutPharmacyId<any>(
        `/admin/warehouse/${returnId}/verification-summary`
      );
      const data = res.data?.data || res.data;
      setSummary(data);
      setNeedsBoxCount(shouldShowWarehouseBoxCountStep(data?.transaction));
    } catch (err: any) {
      toast.error(err.message || "Failed to load verification data");
      setNeedsBoxCount(false);
    } finally {
      setLoading(false);
    }
  }, [returnId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (verificationAlreadyCompleted) setShowCompleteConfirm(false);
  }, [verificationAlreadyCompleted]);

  const handleStartVerification = async () => {
    if (!boxCount || Number(boxCount) < 0) {
      toast.error("Enter a valid box count");
      return;
    }
    setStartingVerification(true);
    try {
      const res = await apiClient.post<any>(
        `/admin/warehouse/${returnId}/start-verification`,
        { boxCount: Number(boxCount) }
      );
      const data = res.data?.data || res.data;
      setBoxResult({
        expectedBoxes: data.expectedBoxes,
        receivedBoxes: data.receivedBoxes,
        boxCountMatch: data.boxCountMatch,
      });
      if (!data.boxCountMatch) {
        toast.warning(
          `Box mismatch: expected ${data.expectedBoxes}, received ${data.receivedBoxes}. A discrepancy has been recorded.`,
          { autoClose: 5000 }
        );
      }
      setNeedsBoxCount(false);
      await fetchSummary();
    } catch (err: any) {
      toast.error(err.message || "Failed to start verification");
    } finally {
      setStartingVerification(false);
    }
  };

  const openVerifyItem = (item: VerificationItem) => {
    setVerifyingItemId(item.id);
    setVerifyStatus("");
    setVerifyActualQty(String(item.quantity));
    setVerifyNotes("");
  };

  const handleVerifyItem = async () => {
    if (!verifyStatus || !verifyingItemId) return;
    setSubmittingVerify(true);
    try {
      const body: any = { verificationStatus: verifyStatus };
      if (verifyStatus === "missing") {
        body.actualQuantity = 0;
      } else if (verifyActualQty !== "") {
        body.actualQuantity = Number(verifyActualQty);
      }
      if (verifyNotes.trim()) body.conditionNotes = verifyNotes.trim();

      await apiClient.patch<any>(
        `/admin/warehouse/${returnId}/items/${verifyingItemId}/verify-v2`,
        body
      );
      toast.success("Item verified");
      setVerifyingItemId(null);
      await fetchSummary();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify item");
    } finally {
      setSubmittingVerify(false);
    }
  };

  const handleAddSurplus = async () => {
    if (!surplusForm.warehouseLocation.trim()) {
      toast.error("Warehouse location is required");
      return;
    }
    setSubmittingSurplus(true);
    try {
      const body: any = {
        ...surplusForm,
        quantity: surplusForm.quantity ? Number(surplusForm.quantity) : undefined,
      };
      Object.keys(body).forEach(
        (k) => (body[k] === "" || body[k] === undefined) && delete body[k]
      );
      body.warehouseLocation = surplusForm.warehouseLocation;
      body.condition = surplusForm.condition;

      await apiClient.post<any>(
        `/admin/warehouse/${returnId}/surplus`,
        body
      );
      toast.success("Surplus item added");
      setShowSurplusForm(false);
      setSurplusForm({
        ndc: "",
        productName: "",
        manufacturer: "",
        lotNumber: "",
        expirationDate: "",
        quantity: "",
        warehouseLocation: "",
        condition: "good",
        notes: "",
      });
      await fetchSummary();
    } catch (err: any) {
      toast.error(err.message || "Failed to add surplus item");
    } finally {
      setSubmittingSurplus(false);
    }
  };

  const handleCompleteVerification = async () => {
    setSubmittingComplete(true);
    try {
      const body: any = {};
      if (completeNotes.trim()) body.notes = completeNotes.trim();

      const res = await apiClient.post<any>(
        `/admin/warehouse/${returnId}/complete-verification`,
        body
      );
      const data = res.data || res;
      setCompleteSummary(data.summary || data);
      toast.success("Verification completed");
      setShowCompleteConfirm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to complete verification");
    } finally {
      setSubmittingComplete(false);
    }
  };

  const handleResolveDiscrepancy = async (
    discrepancyId: string,
    resolution: "resolved" | "dismissed"
  ) => {
    setSubmittingResolve(true);
    try {
      await apiClient.patch<any>(
        `/admin/warehouse/discrepancies/${discrepancyId}/resolve`,
        { resolution, resolutionNotes: resolveNotes.trim() || undefined }
      );
      toast.success(
        resolution === "resolved"
          ? "Discrepancy resolved"
          : "Discrepancy dismissed"
      );
      setResolvingId(null);
      setResolveNotes("");
      await fetchSummary();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve discrepancy");
    } finally {
      setSubmittingResolve(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#516057]" />
        </div>
      </DashboardLayout>
    );
  }

  // Step 2: Box count screen (only on this detail route; list page has no box step)
  if (needsBoxCount && summary) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-lg mx-auto mt-8">
          <Link
            href="/warehouse/verification"
            className="inline-flex items-center gap-1 text-sm text-[#516057] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to list
          </Link>
          <Card className="border-2 border-[#e2e2e2]">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[4px] bg-[#f5f2f1]">
                  <BoxIcon className="h-5 w-5 text-[#516057]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#000000]">
                    Start Verification
                  </h2>
                  <p className="text-xs text-[#6b7280]">
                    How many boxes did you physically receive?
                  </p>
                  {summary.transaction?.boxCount != null &&
                    Number(summary.transaction.boxCount) > 0 && (
                      <p className="text-xs text-[#505454] mt-1">
                        Expected on return manifest:{" "}
                        <span className="font-semibold">
                          {summary.transaction.boxCount}
                        </span>{" "}
                        boxes
                      </p>
                    )}
                </div>
              </div>
              <Input
                type="number"
                min="0"
                placeholder="Enter box count..."
                value={boxCount}
                onChange={(e) => setBoxCount(e.target.value)}
                className="border-[#e2e2e2]"
              />
              {boxResult && !boxResult.boxCountMatch && (
                <div className="p-3 rounded-[4px] bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Expected {boxResult.expectedBoxes} boxes, you received{" "}
                  {boxResult.receivedBoxes} — a discrepancy has been
                  automatically recorded.
                </div>
              )}
              <Button
                className="w-full bg-[#516057] hover:bg-[#505454]"
                disabled={startingVerification || !boxCount}
                onClick={handleStartVerification}
              >
                {startingVerification && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Start Verification
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Completed summary screen
  if (completeSummary) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-2xl mx-auto mt-8">
          <Card className="border-2 border-green-200">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[4px] bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#000000]">
                    Verification Complete
                  </h2>
                  <p className="text-xs text-[#6b7280]">
                    Summary of verification results
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {
                    label: "Total Items",
                    value: completeSummary.totalItems,
                    color: "text-[#000000]",
                  },
                  {
                    label: "Correct",
                    value: completeSummary.correctItems,
                    color: "text-green-700",
                  },
                  {
                    label: "Damaged",
                    value: completeSummary.damagedItems,
                    color: "text-red-700",
                  },
                  {
                    label: "Missing",
                    value: completeSummary.missingItems,
                    color: "text-[#6b7280]",
                  },
                  {
                    label: "Wrong Items",
                    value: completeSummary.wrongItems,
                    color: "text-orange-700",
                  },
                  {
                    label: "Surplus",
                    value: completeSummary.surplusItems,
                    color: "text-blue-700",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="p-3 rounded-[4px] border bg-[#f5f2f1]"
                  >
                    <p className="text-xs text-[#6b7280]">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value ?? 0}</p>
                  </div>
                ))}
              </div>
              {completeSummary.correctItemsValue != null && (
                <div className="p-3 rounded-[4px] bg-green-50 border border-green-200 text-center">
                  <p className="text-xs text-green-700">Correct Items Value</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(completeSummary.correctItemsValue)}
                  </p>
                </div>
              )}
              {(completeSummary.excludedFromBatch ?? 0) > 0 && (
                <div className="p-3 rounded-[4px] bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-start gap-2">
                  <Package className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{completeSummary.excludedFromBatch} non-correct item(s) have been excluded from batching and will not appear in debit memos.</span>
                </div>
              )}
              {completeSummary.openDiscrepancies > 0 && (
                <div className="p-3 rounded-[4px] bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  {completeSummary.openDiscrepancies} open discrepancies remain.
                </div>
              )}
              <Link href="/warehouse/verification">
                <Button className="w-full bg-[#516057] hover:bg-[#505454] mt-2">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Received List
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!summary) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-[#6b7280]">
          <p>Could not load verification data.</p>
          <Link href="/warehouse/verification">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const { items, counts, surplus, discrepancies, discrepancyCounts } = summary;
  const verified =
    counts.correct + counts.damaged + counts.missing + counts.wrongItem;
  const progressPct =
    counts.totalItems > 0
      ? Math.round((verified / counts.totalItems) * 100)
      : 0;

  const statusColor = (s: string | null) => {
    switch (s) {
      case "correct":
        return "bg-green-100 text-green-700 border-green-300";
      case "damaged":
        return "bg-red-100 text-red-700 border-red-300";
      case "missing":
        return "bg-[#e2e2e2] text-[#505454] border-gray-400";
      case "wrong_item":
        return "bg-orange-100 text-orange-700 border-orange-300";
      default:
        return "bg-white text-[#9ca3af] border-[#e2e2e2]";
    }
  };

  const discrepancyColor = (type: string) => {
    switch (type) {
      case "missing":
        return "bg-red-100 text-red-700";
      case "damaged":
        return "bg-amber-100 text-amber-700";
      case "surplus":
      case "extra":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-[#f5f2f1] text-[#505454]";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between p-4 rounded-[4px] bg-[#f5f2f1] border-2 border-[#e2e2e2]">
          <div className="flex items-center gap-3">
            <Link
              href="/warehouse/verification"
              className="p-1.5 rounded-[4px] hover:bg-[#f5f2f1] transition"
            >
              <ArrowLeft className="h-5 w-5 text-[#516057]" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-[#000000]">
                Verification Session
              </h1>
              <p className="text-xs text-[#505454]">
                {summary.transaction?.licensePlate || returnId}
                {summary.transaction?.pharmacyName &&
                  ` — ${summary.transaction.pharmacyName}`}
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <Card className="border-2 border-[#e2e2e2]">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-4 w-4 text-[#516057]" />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#505454]">
                    {verified} / {counts.totalItems} items verified
                  </span>
                  <span className="font-bold text-[#516057]">{progressPct}%</span>
                </div>
                <div className="w-full bg-[#e2e2e2] rounded-full h-2">
                  <div
                    className="bg-[#516057] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-green-700 font-medium">
                {counts.correct} correct
              </span>
              <span className="text-red-700 font-medium">
                {counts.damaged} damaged
              </span>
              <span className="text-[#6b7280] font-medium">
                {counts.missing} missing
              </span>
              <span className="text-orange-700 font-medium">
                {counts.wrongItem} wrong
              </span>
              <span className="text-blue-700 font-medium">
                {counts.surplus} surplus
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 border-b-2 border-[#e2e2e2] bg-white rounded-t-lg p-1">
          {(
            [
              { key: "items" as ActiveTab, label: "Items", count: counts.totalItems },
              {
                key: "surplus" as ActiveTab,
                label: "Surplus",
                count: surplus.length,
              },
              {
                key: "discrepancies" as ActiveTab,
                label: "Discrepancies",
                count: discrepancyCounts.total,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-[4px] border-2 transition-all ${
                activeTab === tab.key
                  ? "bg-[#f5f2f1] text-[#516057] border-[#e2e2e2] shadow-md"
                  : "bg-white text-[#505454] border-[#e2e2e2] hover:bg-[#f5f2f1]"
              }`}
            >
              {tab.label}{" "}
              <span className="font-bold">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* ITEMS TAB */}
        {activeTab === "items" && (
          <Card className="border-2 border-[#e2e2e2]">
            <CardContent className="p-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#f5f2f1] border-b-2 border-[#e2e2e2]">
                      <th className="text-left p-2 font-bold text-[#000000]">
                        Product
                      </th>
                      <th className="text-left p-2 font-bold text-[#000000]">
                        NDC
                      </th>
                      <th className="text-left p-2 font-bold text-[#000000]">
                        Lot
                      </th>
                      <th className="text-left p-2 font-bold text-[#000000]">
                        Exp
                      </th>
                      <th className="text-left p-2 font-bold text-[#000000]">
                        Qty
                      </th>
                      <th className="text-left p-2 font-bold text-[#000000]">
                        Status
                      </th>
                      <th className="text-left p-2 font-bold text-[#000000]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`border-b ${
                          idx % 2 === 0 ? "bg-white" : "bg-[#f5f2f1]/50"
                        } hover:bg-[#f5f2f1] transition-colors`}
                      >
                        <td className="p-2">
                          <div className="font-medium text-[#000000]">
                            {item.proprietaryName || item.genericName}
                          </div>
                          {item.manufacturer && (
                            <div className="text-[#9ca3af]">
                              {item.manufacturer}
                            </div>
                          )}
                        </td>
                        <td className="p-2 font-mono text-[#505454]">
                          {item.ndc}
                        </td>
                        <td className="p-2 text-[#505454]">{item.lotNumber}</td>
                        <td className="p-2 text-[#505454]">
                          {item.expirationDate
                            ? formatDate(item.expirationDate)
                            : "—"}
                        </td>
                        <td className="p-2 font-medium">{item.quantity}</td>
                        <td className="p-2">
                          <Badge
                            className={`text-xs border ${statusColor(
                              item.verificationStatus
                            )}`}
                          >
                            {item.verificationStatus
                              ? item.verificationStatus.replace("_", " ")
                              : "unverified"}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {!item.verificationStatus ? (
                            <Button
                              size="sm"
                              className="h-6 px-2 text-xs bg-[#516057] hover:bg-[#505454]"
                              onClick={() => openVerifyItem(item)}
                            >
                              Verify
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs border-[#e2e2e2]"
                              onClick={() => openVerifyItem(item)}
                            >
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* VERIFY ITEM MODAL */}
        {verifyingItemId && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-2 border-[#e2e2e2]">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-base text-[#000000]">
                  Verify Item
                </h3>
                <p className="text-xs text-[#6b7280]">
                  {items.find((i) => i.id === verifyingItemId)?.proprietaryName ||
                    items.find((i) => i.id === verifyingItemId)?.genericName}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        value: "correct",
                        label: "Correct",
                        icon: CheckCircle,
                        color: "border-green-400 bg-green-50 text-green-700 hover:bg-green-100",
                        activeColor: "border-green-500 bg-green-200 text-green-900 ring-2 ring-green-300",
                      },
                      {
                        value: "damaged",
                        label: "Damaged",
                        icon: XCircle,
                        color: "border-red-400 bg-red-50 text-red-700 hover:bg-red-100",
                        activeColor: "border-red-500 bg-red-200 text-red-900 ring-2 ring-red-300",
                      },
                      {
                        value: "missing",
                        label: "Missing",
                        icon: HelpCircle,
                        color: "border-gray-400 bg-[#f5f2f1] text-[#505454] hover:bg-[#f5f2f1]",
                        activeColor: "border-gray-500 bg-gray-300 text-[#000000] ring-2 ring-gray-400",
                      },
                      {
                        value: "wrong_item",
                        label: "Wrong Item",
                        icon: AlertTriangle,
                        color: "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100",
                        activeColor: "border-orange-500 bg-orange-200 text-orange-900 ring-2 ring-orange-300",
                      },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setVerifyStatus(opt.value);
                          if (opt.value === "missing") setVerifyActualQty("0");
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-[4px] border-2 text-sm font-medium transition-all ${
                          verifyStatus === opt.value
                            ? opt.activeColor
                            : opt.color
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {verifyStatus && verifyStatus !== "missing" && (
                  <div>
                    <label className="text-xs font-medium text-[#505454]">
                      Actual Quantity (if different)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={verifyActualQty}
                      onChange={(e) => setVerifyActualQty(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}
                {(verifyStatus === "damaged" ||
                  verifyStatus === "wrong_item") && (
                  <div>
                    <label className="text-xs font-medium text-[#505454]">
                      Condition Notes
                    </label>
                    <textarea
                      className="mt-1 w-full rounded-[4px] border border-[#e2e2e2] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e2e2e2]"
                      rows={2}
                      placeholder="Describe the issue..."
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVerifyingItemId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#516057] hover:bg-[#505454]"
                    disabled={!verifyStatus || submittingVerify}
                    onClick={handleVerifyItem}
                  >
                    {submittingVerify && (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SURPLUS TAB */}
        {activeTab === "surplus" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-xs"
                onClick={() => setShowSurplusForm(!showSurplusForm)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Surplus Item
              </Button>
            </div>

            {showSurplusForm && (
              <Card className="border-2 border-blue-200">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold text-sm text-[#000000]">
                    Add Surplus Item
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[#505454]">
                        NDC
                      </label>
                      <Input
                        value={surplusForm.ndc}
                        onChange={(e) =>
                          setSurplusForm((f) => ({ ...f, ndc: e.target.value }))
                        }
                        className="mt-1"
                        placeholder="e.g. 12345678901"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#505454]">
                        Product Name
                      </label>
                      <Input
                        value={surplusForm.productName}
                        onChange={(e) =>
                          setSurplusForm((f) => ({
                            ...f,
                            productName: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#505454]">
                        Manufacturer
                      </label>
                      <Input
                        value={surplusForm.manufacturer}
                        onChange={(e) =>
                          setSurplusForm((f) => ({
                            ...f,
                            manufacturer: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#505454]">
                        Lot Number
                      </label>
                      <Input
                        value={surplusForm.lotNumber}
                        onChange={(e) =>
                          setSurplusForm((f) => ({
                            ...f,
                            lotNumber: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#505454]">
                        Expiration Date
                      </label>
                      <Input
                        type="date"
                        value={surplusForm.expirationDate}
                        onChange={(e) =>
                          setSurplusForm((f) => ({
                            ...f,
                            expirationDate: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#505454]">
                        Quantity
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={surplusForm.quantity}
                        onChange={(e) =>
                          setSurplusForm((f) => ({
                            ...f,
                            quantity: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#505454]">
                        Warehouse Location *
                      </label>
                      <Input
                        value={surplusForm.warehouseLocation}
                        onChange={(e) =>
                          setSurplusForm((f) => ({
                            ...f,
                            warehouseLocation: e.target.value,
                          }))
                        }
                        className="mt-1"
                        placeholder="e.g. Shelf B3, Row 2"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#505454]">
                        Condition
                      </label>
                      <select
                        value={surplusForm.condition}
                        onChange={(e) =>
                          setSurplusForm((f) => ({
                            ...f,
                            condition: e.target.value,
                          }))
                        }
                        className="mt-1 w-full h-10 rounded-[4px] border border-[#e2e2e2] px-3 text-sm"
                      >
                        <option value="good">Good</option>
                        <option value="damaged">Damaged</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#505454]">
                      Notes
                    </label>
                    <textarea
                      className="mt-1 w-full rounded-[4px] border border-[#e2e2e2] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      rows={2}
                      value={surplusForm.notes}
                      onChange={(e) =>
                        setSurplusForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      placeholder="Any additional notes..."
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSurplusForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={submittingSurplus}
                      onClick={handleAddSurplus}
                    >
                      {submittingSurplus && (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      )}
                      Add Surplus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-2 border-blue-200">
              <CardContent className="p-3">
                {surplus.length === 0 ? (
                  <div className="text-center py-8 text-[#6b7280] text-sm">
                    No surplus items recorded yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[#f5f2f1] border-b-2 border-blue-200">
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
                        </tr>
                      </thead>
                      <tbody>
                        {surplus.map((s, idx) => (
                          <tr
                            key={s.id}
                            className={`border-b ${
                              idx % 2 === 0 ? "bg-white" : "bg-[#f5f2f1]/50"
                            }`}
                          >
                            <td className="p-2 font-medium text-[#000000]">
                              {s.productName || "—"}
                            </td>
                            <td className="p-2 font-mono text-[#505454]">
                              {s.ndc || "—"}
                            </td>
                            <td className="p-2 text-[#505454]">
                              {s.lotNumber || "—"}
                            </td>
                            <td className="p-2 font-medium">{s.quantity}</td>
                            <td className="p-2 text-[#505454]">
                              {s.warehouseLocation}
                            </td>
                            <td className="p-2">
                              <Badge
                                className={`text-xs ${
                                  s.condition === "good"
                                    ? "bg-green-100 text-green-700"
                                    : s.condition === "damaged"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-[#f5f2f1] text-[#505454]"
                                }`}
                              >
                                {s.condition}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* DISCREPANCIES TAB */}
        {activeTab === "discrepancies" && (
          <Card className="border-2 border-amber-200">
            <CardContent className="p-3">
              {discrepancies.length === 0 ? (
                <div className="text-center py-8 text-[#6b7280] text-sm">
                  No discrepancies recorded
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-amber-100 to-orange-100 border-b-2 border-amber-200">
                        <th className="text-left p-2 font-bold text-amber-900">
                          Type
                        </th>
                        <th className="text-left p-2 font-bold text-amber-900">
                          Product
                        </th>
                        <th className="text-left p-2 font-bold text-amber-900">
                          Expected
                        </th>
                        <th className="text-left p-2 font-bold text-amber-900">
                          Actual
                        </th>
                        <th className="text-left p-2 font-bold text-amber-900">
                          Status
                        </th>
                        <th className="text-left p-2 font-bold text-amber-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {discrepancies.map((d, idx) => (
                        <tr
                          key={d.id}
                          className={`border-b ${
                            idx % 2 === 0 ? "bg-white" : "bg-[#f5f2f1]/50"
                          }`}
                        >
                          <td className="p-2">
                            <Badge
                              className={`text-xs ${discrepancyColor(d.type)}`}
                            >
                              {d.type}
                            </Badge>
                          </td>
                          <td className="p-2 text-[#000000]">
                            {d.productName || d.ndc || "—"}
                          </td>
                          <td className="p-2 font-medium">
                            {d.expectedQuantity}
                          </td>
                          <td className="p-2 font-medium">
                            {d.actualQuantity}
                          </td>
                          <td className="p-2">
                            <Badge
                              className={`text-xs ${
                                d.status === "open"
                                  ? "bg-amber-100 text-amber-700 border border-amber-300"
                                  : "bg-green-100 text-green-700 border border-green-300"
                              }`}
                            >
                              {d.status}
                            </Badge>
                          </td>
                          <td className="p-2">
                            {d.status === "open" ? (
                              resolvingId === d.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    className="w-full rounded border border-[#e2e2e2] px-2 py-1 text-xs"
                                    rows={2}
                                    placeholder="Resolution notes..."
                                    value={resolveNotes}
                                    onChange={(e) =>
                                      setResolveNotes(e.target.value)
                                    }
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      className="h-5 px-2 text-[10px] bg-green-600 hover:bg-green-700"
                                      disabled={submittingResolve}
                                      onClick={() =>
                                        handleResolveDiscrepancy(
                                          d.id,
                                          "resolved"
                                        )
                                      }
                                    >
                                      Resolve
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-5 px-2 text-[10px] bg-[#f5f2f1]0 hover:bg-gray-600"
                                      disabled={submittingResolve}
                                      onClick={() =>
                                        handleResolveDiscrepancy(
                                          d.id,
                                          "dismissed"
                                        )
                                      }
                                    >
                                      Dismiss
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-5 px-2 text-[10px]"
                                      onClick={() => {
                                        setResolvingId(null);
                                        setResolveNotes("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                  onClick={() => setResolvingId(d.id)}
                                >
                                  <ShieldAlert className="h-3 w-3 mr-1" />
                                  Resolve
                                </Button>
                              )
                            ) : (
                              <span className="text-xs text-[#9ca3af]">
                                {d.resolution}
                                {d.resolutionNotes && ` — ${d.resolutionNotes}`}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* COMPLETE VERIFICATION — hidden when return already finalized */}
        {verificationAlreadyCompleted ? (
          <Card className="border-2 border-green-200">
            <CardContent className="p-4">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                Verification for this return is already completed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-[#e2e2e2]">
            <CardContent className="p-4">
              {showCompleteConfirm ? (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-[#000000]">
                    Confirm Complete Verification
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-green-50 rounded border border-green-200">
                      <span className="text-green-700">Correct:</span>{" "}
                      <strong>{counts.correct}</strong>
                    </div>
                    <div className="p-2 bg-red-50 rounded border border-red-200">
                      <span className="text-red-700">Damaged:</span>{" "}
                      <strong>{counts.damaged}</strong>
                    </div>
                    <div className="p-2 bg-[#f5f2f1] rounded border border-[#e2e2e2]">
                      <span className="text-[#505454]">Missing:</span>{" "}
                      <strong>{counts.missing}</strong>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#505454]">
                      Completion Notes (optional)
                    </label>
                    <textarea
                      className="mt-1 w-full rounded-[4px] border border-[#e2e2e2] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e2e2e2]"
                      rows={2}
                      value={completeNotes}
                      onChange={(e) => setCompleteNotes(e.target.value)}
                      placeholder="Summary notes..."
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCompleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={submittingComplete}
                      onClick={handleCompleteVerification}
                    >
                      {submittingComplete && (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      )}
                      Complete Verification
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[#6b7280]">
                    {counts.unverified > 0
                      ? `${counts.unverified} items still unverified`
                      : "All items verified — ready to complete"}
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    disabled={counts.unverified > 0}
                    onClick={() => setShowCompleteConfirm(true)}
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Complete Verification
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
