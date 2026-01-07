"use client";

import { useSession } from "next-auth/react";
import {
  ChevronDownIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import { useStore } from "@/contexts/StoreContext";

export default function StoreSelector() {
  const { data: session } = useSession();
  const { selectedStoreCode, stores, setSelectedStoreCode, loading } =
    useStore();

  const handleStoreChange = (storeCode: string) => {
    setSelectedStoreCode(storeCode);
  };

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const selectedStore =
    stores.find((store) => store.storeCode === selectedStoreCode) || stores[0];

  if (loading || !selectedStoreCode) {
    return (
      <div className="w-48 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"></div>
    );
  }

  // If user has only one store, show a read-only pill instead of a dropdown
  if (stores.length === 1 && selectedStore) {
    return (
      <div className="relative">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {isSuperAdmin ? "Location" : "Store"}
        </label>
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 min-w-[200px] flex items-center gap-2">
          <BuildingStorefrontIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span>
            {selectedStore.companyName ? `${selectedStore.companyName} - ` : ""}
            {selectedStore.locationName || selectedStore.storeCode} (
            {selectedStore.storeCode})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {isSuperAdmin ? "Select Location" : "Store"}
      </label>
      <select
        value={selectedStoreCode}
        onChange={(e) => handleStoreChange(e.target.value)}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 pr-8 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
      >
        {stores.map((store) => (
          <option key={store.storeCode} value={store.storeCode}>
            {store.companyName ? `${store.companyName} - ` : ""}
            {store.locationName} ({store.storeCode})
          </option>
        ))}
      </select>
      <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
    </div>
  );
}
