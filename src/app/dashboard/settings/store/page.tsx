"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import SettingsNav from "@/components/settings/SettingsNav";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import { usePagePermission } from "@/hooks/usePagePermission";
import toast from "react-hot-toast";
import { BuildingStorefrontIcon } from "@heroicons/react/24/outline";

interface StoreInfo {
  storeId: string;
  storeName: string | null;
  storeAddress1: string | null;
  storeAddress2: string | null;
  storeCity: string | null;
  storeState: string | null;
  storeZipCode: string | null;
  storePhoneNumber: string | null;
  storeFaxNumber: string | null;
  storeAccountNumber: string | null;
  storeRoutingNumber: string | null;
  isActive: boolean;
  createdOn: string | null;
  updatedOn: string | null;
  storeCode: string | null;
  companyCode: string | null;
}

function displayValue(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text || "—";
}

function formatWhen(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function StoreInfoPage() {
  const { selectedStoreCode, fetchWithStore } = useApiWithStore();
  const { hasPermission, loading: permissionLoading } = usePagePermission({
    requiredPermissions: ["settings.view"],
  });

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadStore = async () => {
      if (!selectedStoreCode) {
        setStore(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetchWithStore("/api/dashboard/settings/store", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load store info");
        }

        if (!active) return;
        setStore(payload?.store ?? null);
      } catch (error) {
        if (!active) return;
        setStore(null);
        toast.error(
          error instanceof Error ? error.message : "Failed to load store info",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadStore();

    return () => {
      active = false;
    };
  }, [selectedStoreCode]);

  if (permissionLoading || loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!hasPermission) {
    return null;
  }

  const address = [store?.storeCity, store?.storeState, store?.storeZipCode]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(", ");

  return (
    <DashboardLayout>
      <div className="max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Store Info
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Details for the currently selected store
            {selectedStoreCode ? ` (${selectedStoreCode})` : ""}.
          </p>
        </div>

        <SettingsNav />

        {!selectedStoreCode ? (
          <EmptyState message="Select a store to view its information." />
        ) : !store ? (
          <EmptyState
            message={`No store information is saved for ${selectedStoreCode}.`}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {displayValue(store.storeName)}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {displayValue(store.storeCode)}
                  {store.companyCode ? ` · ${store.companyCode}` : ""}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  store.isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                }`}
              >
                {store.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem label="Phone" value={displayValue(store.storePhoneNumber)} />
              <InfoItem label="Fax" value={displayValue(store.storeFaxNumber)} />
              <InfoItem label="Address Line 1" value={displayValue(store.storeAddress1)} />
              <InfoItem label="Address Line 2" value={displayValue(store.storeAddress2)} />
              <InfoItem label="City, State, Zip" value={address || "—"} />
              <InfoItem label="Company Code" value={displayValue(store.companyCode)} />
              <InfoItem label="Account Number" value={displayValue(store.storeAccountNumber)} />
              <InfoItem label="Routing Number" value={displayValue(store.storeRoutingNumber)} />
              <InfoItem label="Created On" value={formatWhen(store.createdOn)} />
              <InfoItem label="Updated On" value={formatWhen(store.updatedOn)} />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-900 dark:text-white break-words">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-10 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <BuildingStorefrontIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="text-gray-600 dark:text-gray-300">{message}</p>
    </div>
  );
}
