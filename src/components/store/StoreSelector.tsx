"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronDownIcon,
  BuildingStorefrontIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { useStore } from "@/contexts/StoreContext";

export default function StoreSelector() {
  const { data: session } = useSession();
  const { selectedStoreCode, stores, setSelectedStoreCode, loading } =
    useStore();

  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const storeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storeMenuOpen) return;
    const handlePointerDown = (event: Event) => {
      if (
        storeMenuRef.current &&
        !storeMenuRef.current.contains(event.target as Node)
      ) {
        setStoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [storeMenuOpen]);

  const handleStoreChange = (storeCode: string) => {
    setSelectedStoreCode(storeCode);
  };

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const selectedStore =
    stores.find((store) => store.storeCode === selectedStoreCode) || stores[0];

  const selectedLabel =
    selectedStore &&
    `${selectedStore.companyName ? `${selectedStore.companyName} - ` : ""}${
      selectedStore.locationName || selectedStore.storeCode
    } (${selectedStore.storeCode})`;

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
    <div className="relative flex-shrink-0" ref={storeMenuRef}>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {isSuperAdmin ? "Select Location" : "Store"}
      </label>
      <button
        type="button"
        onClick={() => setStoreMenuOpen((open) => !open)}
        className="flex w-full min-w-[200px] max-w-[min(100vw-8rem,24rem)] items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-left text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/80"
        aria-expanded={storeMenuOpen}
        aria-haspopup="listbox"
        aria-label={isSuperAdmin ? "Select location" : "Select store"}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <BuildingStorefrontIcon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
          <span className="truncate">{selectedLabel}</span>
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
            storeMenuOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      <div
        className={`absolute left-0 z-50 mt-2 max-h-[min(60vh,20rem)] w-[min(100vw-2rem,22rem)] origin-top-left overflow-y-auto rounded-[12px] border border-gray-200 bg-white shadow-lg transition-[opacity,transform,visibility] duration-200 ease-out dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/40 ${
          storeMenuOpen
            ? "visible translate-y-0 scale-100 opacity-100"
            : "pointer-events-none invisible -translate-y-1 scale-95 opacity-0"
        }`}
        role="listbox"
        aria-label={isSuperAdmin ? "Locations" : "Stores"}
        aria-hidden={!storeMenuOpen}
      >
        <ul className="p-2">
          {stores.map((store) => {
            const isSelected = store.storeCode === selectedStoreCode;
            const rowLabel =
              `${store.companyName ? `${store.companyName} - ` : ""}${store.locationName} (${store.storeCode})`;

            return (
              <li key={store.storeCode} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    handleStoreChange(store.storeCode);
                    setStoreMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/80"
                  }`}
                >
                  <BuildingStorefrontIcon
                    className={`h-4 w-4 shrink-0 ${
                      isSelected
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 leading-snug">{rowLabel}</span>
                  {isSelected && (
                    <CheckIcon
                      className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400"
                      aria-hidden
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
