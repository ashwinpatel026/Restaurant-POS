"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";

interface ModifierItem {
  id?: string;
  tblModifierItemId?: number; // legacy support
  modifierItemCode?: string;
  modifierGroupCode?: string;
  name: string;
  labelName: string;
  colorCode?: string;
  price: number;
  isDefault?: number;
  displayOrder?: number | null;
  isActive?: number;
}

interface ModifierGroup {
  id: string;
  modifierGroupCode?: string | null;
  groupName?: string | null;
}

export default function ModifierItemsPage() {
  const router = useRouter();
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();

  const [modifierItems, setModifierItems] = useState<ModifierItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ModifierItem[]>([]);
  const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModifier, setSelectedModifier] = useState("");

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedStoreCode]);

  // Apply filters effect
  useEffect(() => {
    applyFilters();
  }, [modifierItems, searchTerm, selectedModifier]);

  const applyFilters = () => {
    let filtered = [...modifierItems];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.labelName.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Filter by modifier group
    if (selectedModifier) {
      filtered = filtered.filter(
        (item) => item.modifierGroupCode === selectedModifier,
      );
    }

    setFilteredItems(filtered);
  };

  const fetchData = async (options?: { force?: boolean; silent?: boolean }) => {
    // Prevent duplicate calls unless forced (e.g. after delete)
    if (fetchingRef.current && !options?.force) {
      return;
    }
    fetchingRef.current = true;

    try {
      if (!options?.silent) {
        setLoading(true);
      }
      const [itemsRes, modifiersRes] = await Promise.all([
        fetch(buildApiUrl("/api/dashboard/modifier-items"), { cache: "no-store" }),
        fetch(buildApiUrl("/api/dashboard/modifier-groups"), { cache: "no-store" }),
      ]);

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setModifierItems(itemsData);
      } else {
        console.error(
          "Failed to fetch modifier items:",
          itemsRes.status,
          itemsRes.statusText,
        );
      }

      if (modifiersRes.ok) {
        const modifiersData = await modifiersRes.json();
        setModifiers(modifiersData);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Navigation handlers
  const handleAdd = () => {
    router.push("/dashboard/modifiers/items/add");
  };

  const handleEdit = (item: ModifierItem) => {
    router.push(
      `/dashboard/modifiers/items/${item.id || item.tblModifierItemId}/edit`,
    );
  };

  const handleDelete = (itemId: number | string | undefined) => {
    if (itemId) {
      setDeletingId(String(itemId));
      setShowConfirmModal(true);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const url = buildApiUrl(`/api/dashboard/modifier-items/${deletingId}`);
      const response = await fetch(url, {
        method: "DELETE",
        cache: "no-store",
      });

      if (response.ok) {
        setModifierItems((prev) =>
          prev.filter(
            (item) =>
              String(item.id || item.tblModifierItemId) !== deletingId,
          ),
        );
        toast.success("Modifier item deleted successfully");
        await fetchData({ force: true, silent: true });
      } else {
        try {
          const errorData = await response.json();
          const errorMessage =
            errorData.error || "Failed to delete modifier item";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to delete modifier item");
        }
      }
    } catch (error: any) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error deleting modifier item";
        toast.error(errorMessage);
      }
    } finally {
      setShowConfirmModal(false);
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/modifiers")}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            <span className="text-lg font-medium">Back to Modifiers</span>
          </button>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Modifier Items
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage specific modifier options and pricing
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Modifier Item
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search by Name
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter name or label..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modifier
              </label>
              <select
                value={selectedModifier}
                onChange={(e) => setSelectedModifier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Modifier Groups</option>
                {modifiers.map((group) => (
                  <option key={group.id} value={group.modifierGroupCode || ""}>
                    {group.groupName || group.modifierGroupCode}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedModifier("");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Modifier Items List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Modifier Items List ({filteredItems.length})
            </h3>
          </div>
          <div className="p-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 dark:text-gray-500 text-2xl">
                    🏷️
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No modifier items found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Get started by creating your first modifier item.
                </p>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Modifier Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => {
                  const groupName =
                    modifiers.find(
                      (g) => g.modifierGroupCode === item.modifierGroupCode,
                    )?.groupName ||
                    item.modifierGroupCode ||
                    "N/A";

                  const itemColor = item.colorCode || "#3B82F6";

                  return (
                    <div
                      key={item.id || item.tblModifierItemId}
                      className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                      style={
                        item.colorCode
                          ? {
                              borderColor: item.colorCode,
                            }
                          : undefined
                      }
                    >
                      {/* Top Accent */}
                      <div
                        className="h-1 w-full"
                        style={{ backgroundColor: itemColor }}
                      />

                      {/* Header */}
                      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-gray-100 dark:ring-gray-700"
                            style={{ backgroundColor: itemColor }}
                          />

                          <div className="min-w-0">
                            <h3 className="truncate text-base font-bold leading-5 text-gray-950 dark:text-white">
                              {item.name || "Unnamed Item"}
                            </h3>

                            <p className="mt-1 truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                              {item.labelName || "No label assigned"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="px-4 py-3">
                        <div className="rounded-lg bg-gray-50 px-3.5 py-3 dark:bg-gray-700/60">
                          <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 truncate text-sm text-gray-600 dark:text-gray-300">
                              <span className="font-bold text-gray-900 dark:text-white">
                                Label :
                              </span>{" "}
                              <span className="font-semibold">
                                {item.labelName || "N/A"}
                              </span>
                            </p>

                            <div className="h-4 w-px shrink-0 bg-gray-300 dark:bg-gray-600" />

                            <p className="shrink-0 text-sm text-gray-600 dark:text-gray-300">
                              <span className="font-bold text-gray-900 dark:text-white">
                                Price :
                              </span>{" "}
                              <span className="font-extrabold text-gray-950 dark:text-white">
                                {formatPrice(item.price || 0)}
                              </span>
                            </p>
                          </div>

                          <div className="my-2.5 border-t border-gray-200 dark:border-gray-600" />

                          <p className="truncate text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-bold text-gray-900 dark:text-white">
                              Group :
                            </span>{" "}
                            <span className="font-semibold text-gray-950 dark:text-white">
                              {groupName}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/35">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700 transition-all hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            title="View modifier item details"
                          >
                            <EyeIcon className="mr-1.5 h-3.5 w-3.5" />
                            View
                          </button>

                          <button
                            onClick={() => handleEdit(item)}
                            className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                            title="Edit modifier item"
                          >
                            <PencilIcon className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(item.id || item.tblModifierItemId)
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-bold text-red-700 transition-all hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
                            title="Delete modifier item"
                          >
                            <TrashIcon className="mr-1.5 h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <CRUDModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setDeletingId(null);
        }}
        title="Confirm Delete"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
              <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Delete Modifier Item
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete this modifier item? This action
                cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowConfirmModal(false);
                setDeletingId(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </CRUDModal>
    </DashboardLayout>
  );
}
