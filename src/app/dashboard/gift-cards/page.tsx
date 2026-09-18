"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import { usePagePermission } from "@/hooks/usePagePermission";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import { formatDecimal } from "@/utils/formatDecimal";

type TabKey = "add" | "manual" | "view";
type StatusFilter = "all" | "active" | "inactive";

interface GiftCardRow {
  giftCardId: number | string;
  giftCardNo: string | null;
  cardAmount: string | number | null;
  receivedAmount: string | number | null;
  isActive: boolean;
  createdOn: string;
}

function buildSeriesPreview(prefix: string, startFrom: number, count: number) {
  if (
    !prefix.trim() ||
    !Number.isFinite(startFrom) ||
    !Number.isFinite(count)
  ) {
    return [];
  }
  if (count <= 0) return [];
  const safeCount = Math.min(count, 25);
  return Array.from(
    { length: safeCount },
    (_, i) => `${prefix}${startFrom + i}`,
  );
}

export default function GiftCardManagementPage() {
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();
  const { hasPermission, loading: permissionLoading } = usePagePermission({
    requiredPermissions: ["giftcards.view"],
  });

  const [tab, setTab] = useState<TabKey>("add");

  // Bulk defaults per screenshot
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [bulkStartFrom, setBulkStartFrom] = useState("");
  const [bulkCount, setBulkCount] = useState("");
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Manual
  const [manualInput, setManualInput] = useState("");
  const [manualList, setManualList] = useState<string[]>([]);
  const [manualSelected, setManualSelected] = useState<Set<string>>(new Set());
  const [submittingManual, setSubmittingManual] = useState(false);

  // View
  const [viewLoading, setViewLoading] = useState(false);
  const [viewSearch, setViewSearch] = useState("");
  const [viewStatus, setViewStatus] = useState<StatusFilter>("all");
  const [giftCards, setGiftCards] = useState<GiftCardRow[]>([]);

  // Success modal
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const preview = useMemo(() => {
    const start = Number(bulkStartFrom);
    const count = Number(bulkCount);
    if (
      !bulkPrefix.trim() ||
      !Number.isFinite(start) ||
      !Number.isFinite(count)
    ) {
      return [];
    }
    return buildSeriesPreview(bulkPrefix.trim(), start, count);
  }, [bulkPrefix, bulkStartFrom, bulkCount]);

  const showSuccess = (count: number) => {
    setSuccessMessage(`${count} gift card(s) saved successfully.`);
    setSuccessOpen(true);
  };

  const fetchGiftCards = async () => {
    try {
      setViewLoading(true);
      const params = new URLSearchParams();
      if (viewSearch.trim()) params.set("search", viewSearch.trim());
      if (viewStatus !== "all") params.set("status", viewStatus);
      const url = buildApiUrl(`/api/dashboard/gift-cards?${params.toString()}`);
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setGiftCards(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to load gift cards");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load gift cards");
    } finally {
      setViewLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "view") return;
    if (!selectedStoreCode) return;
    fetchGiftCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedStoreCode]);

  const onBulkClear = () => {
    setBulkPrefix("");
    setBulkStartFrom("");
    setBulkCount("");
  };

  const onBulkSubmit = async () => {
    const prefix = bulkPrefix.trim();
    const startFrom = Number(bulkStartFrom);
    const count = Number(bulkCount);

    if (!prefix) return toast.error("Prefix is required");
    if (!Number.isFinite(startFrom))
      return toast.error("Start From is required");
    if (!Number.isFinite(count) || count <= 0)
      return toast.error("No Of Cards is required");

    try {
      setSubmittingBulk(true);
      const url = buildApiUrl("/api/dashboard/gift-cards");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "bulk", prefix, startFrom, count }),
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(Number(data?.createdCount || count));
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create gift cards");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to create gift cards");
    } finally {
      setSubmittingBulk(false);
    }
  };

  const onManualAdd = () => {
    const value = manualInput.trim();
    if (!value) return;
    const exists = manualList.some(
      (x) => x.toLowerCase() === value.toLowerCase(),
    );
    if (exists) {
      toast.error("Gift Card No already added");
      return;
    }
    setManualList((prev) => [value, ...prev]);
    setManualInput("");
  };

  const toggleManualSelected = (value: string) => {
    setManualSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const onManualRemoveSelected = () => {
    if (manualSelected.size === 0) return;
    setManualList((prev) => prev.filter((x) => !manualSelected.has(x)));
    setManualSelected(new Set());
  };

  const onManualSave = async () => {
    if (manualList.length === 0) {
      toast.error("Please add at least one Gift Card No");
      return;
    }
    try {
      setSubmittingManual(true);
      const url = buildApiUrl("/api/dashboard/gift-cards");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "manual", giftCardNos: manualList }),
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(Number(data?.createdCount || manualList.length));
        setManualList([]);
        setManualSelected(new Set());
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save gift cards");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save gift cards");
    } finally {
      setSubmittingManual(false);
    }
  };

  const tabButtonClass = (key: TabKey) =>
    `px-6 py-3 rounded-t-lg border transition-colors ${
      tab === key
        ? "border-yellow-500 bg-yellow-50 text-gray-900 dark:border-yellow-300 dark:bg-gray-800 dark:text-white"
        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
    }`;

  const cardClass =
    "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm";

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent";

  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

  const outlineButtonClass =
    "rounded-xl border-2 border-yellow-500 text-gray-900 dark:text-white hover:bg-yellow-500/10 disabled:opacity-50";

  if (permissionLoading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!hasPermission) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gift Card Management
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
          <div className="flex gap-3 flex-wrap">
            <button
              className={tabButtonClass("add")}
              onClick={() => setTab("add")}
            >
              Add Gift Cards
            </button>
            <button
              className={tabButtonClass("manual")}
              onClick={() => setTab("manual")}
            >
              Manual Entry
            </button>
            <button
              className={tabButtonClass("view")}
              onClick={() => setTab("view")}
            >
              View Gift Cards
            </button>
          </div>

          <div className="mt-4">
            {tab === "add" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={cardClass}>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Bulk Generation
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Create a continuous series using prefix + incremented
                    number.
                  </p>

                  <div className="mt-6 space-y-5">
                    <div>
                      <label className={labelClass}>
                        Prefix <span className="text-yellow-600 dark:text-yellow-500">*</span>
                      </label>
                      <input
                        value={bulkPrefix}
                        onChange={(e) => setBulkPrefix(e.target.value)}
                        className={inputClass}
                        placeholder="Enter Prefix"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Start From <span className="text-yellow-600 dark:text-yellow-500">*</span>
                      </label>
                      <input
                        value={bulkStartFrom}
                        onChange={(e) => setBulkStartFrom(e.target.value)}
                        inputMode="numeric"
                        className={inputClass}
                        placeholder="Enter Start From"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        No Of Cards <span className="text-yellow-600 dark:text-yellow-500">*</span>
                      </label>
                      <input
                        value={bulkCount}
                        onChange={(e) => setBulkCount(e.target.value)}
                        inputMode="numeric"
                        className={inputClass}
                        placeholder="Enter No Of Cards"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={onBulkSubmit}
                      disabled={submittingBulk}
                      className={`w-40 py-3 ${outlineButtonClass}`}
                    >
                      Submit
                    </button>
                    <button
                      onClick={onBulkClear}
                      className={`w-40 py-3 ${outlineButtonClass}`}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className={cardClass}>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Series Preview
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Preview the first few values before Submit Giftcard.
                  </p>

                  <div className="mt-6 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                    <div className="text-gray-800 dark:text-gray-200 font-mono">
                      <div className="mb-3">Start of series:</div>
                      {preview.length === 0 ? (
                        <div className="text-gray-400 dark:text-gray-500">—</div>
                      ) : (
                        <div className="space-y-2">
                          {preview.map((v) => (
                            <div key={v}>{v}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "manual" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div
                  className={`lg:col-span-2 ${cardClass} p-0 overflow-hidden`}
                >
                  <div className="bg-gray-50 dark:bg-gray-700/70 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Gift Card No
                    </h2>
                  </div>
                  <div className="p-6 min-h-[420px]">
                    {manualList.length === 0 ? (
                      <div className="text-gray-500 dark:text-gray-400">
                        No gift cards added.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {manualList.map((no) => {
                          const selected = manualSelected.has(no);
                          return (
                            <button
                              key={no}
                              onClick={() => toggleManualSelected(no)}
                              className={`w-full text-left px-4 py-3 rounded-xl border ${
                                selected
                                  ? "border-yellow-500 bg-yellow-50 text-gray-900 dark:bg-yellow-500/10 dark:text-white"
                                  : "border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200 dark:hover:bg-gray-800/40"
                              }`}
                            >
                              {no}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className={cardClass}>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Gift Card No
                  </h2>
                  <input
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter Gift Card No"
                    className={`mt-4 ${inputClass}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onManualAdd();
                    }}
                  />

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={onManualAdd}
                      className="w-full py-3 rounded-xl bg-yellow-500 text-black font-semibold hover:bg-yellow-400"
                    >
                      Add
                    </button>
                    <button
                      onClick={onManualRemoveSelected}
                      className={`w-full py-3 ${outlineButtonClass}`}
                    >
                      Remove Selected
                    </button>
                    <button
                      onClick={onManualSave}
                      disabled={submittingManual}
                      className={`w-full py-3 ${outlineButtonClass}`}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "view" && (
              <div className="space-y-6">
                <div className={cardClass}>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                    <div className="lg:col-span-5">
                      <label className={labelClass}>
                        Search by Gift Card No
                      </label>
                      <input
                        value={viewSearch}
                        onChange={(e) => setViewSearch(e.target.value)}
                        placeholder="Search gift card"
                        className={inputClass}
                      />
                    </div>
                    <div className="lg:col-span-4">
                      <label className={labelClass}>
                        Filter
                      </label>
                      <select
                        value={viewStatus}
                        onChange={(e) =>
                          setViewStatus(e.target.value as StatusFilter)
                        }
                        className={inputClass}
                      >
                        <option value="all">All</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                      </select>
                    </div>
                    <div className="lg:col-span-3 flex lg:justify-end">
                      <button
                        onClick={fetchGiftCards}
                        className={`w-full lg:w-44 py-3 ${outlineButtonClass}`}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-700/70 grid grid-cols-12 gap-2 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-100">
                      <div className="col-span-3">Gift Card No</div>
                      <div className="col-span-2 text-right">Card Amount</div>
                      <div className="col-span-2 text-right">
                        Received Amount
                      </div>
                      <div className="col-span-2 text-center">Active</div>
                      <div className="col-span-3">Created Date</div>
                    </div>

                    <div className="max-h-[520px] overflow-y-auto">
                      {viewLoading ? (
                        <div className="p-6 text-gray-500 dark:text-gray-400">
                          Loading…
                        </div>
                      ) : giftCards.length === 0 ? (
                        <div className="p-6 text-gray-500 dark:text-gray-400">
                          No gift cards found.
                        </div>
                      ) : (
                        giftCards.map((row) => (
                          <div
                            key={String(row.giftCardId)}
                            className="grid grid-cols-12 gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                          >
                            <div className="col-span-3">
                              {row.giftCardNo || ""}
                            </div>
                            <div className="col-span-2 text-right">
                              {formatDecimal(row.cardAmount ?? 0)}
                            </div>
                            <div className="col-span-2 text-right">
                              {formatDecimal(row.receivedAmount ?? 0)}
                            </div>
                            <div className="col-span-2 flex justify-center">
                              <input
                                type="checkbox"
                                checked={!!row.isActive}
                                readOnly
                                className="h-5 w-5 accent-yellow-500"
                              />
                            </div>
                            <div className="col-span-3">
                              {row.createdOn
                                ? new Date(row.createdOn).toLocaleString()
                                : ""}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CRUDModal
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Success"
        size="md"
      >
        <div className="space-y-6">
          <div className="text-center text-gray-900 dark:text-white text-lg">
            {successMessage}
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => setSuccessOpen(false)}
              className="w-40 py-3 rounded-xl bg-yellow-500 text-black font-semibold hover:bg-yellow-400"
            >
              OK
            </button>
          </div>
        </div>
      </CRUDModal>
    </DashboardLayout>
  );
}
