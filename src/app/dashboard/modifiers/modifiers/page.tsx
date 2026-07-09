"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  Squares2X2Icon,
  TableCellsIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";

interface ModifierGroup {
  id: string;
  modifierGroupCode?: string | null;
  groupName?: string | null;
  labelName?: string | null;
  isRequired: number;
  isMultiselect: number;
  minSelection?: number | null;
  maxSelection?: number | null;
  showDefaultTop: number;
  inheritFromMenuGroup: number;
  menuCategoryCode?: string | null;
  isActive: number;
  createdOn: string;
}

export default function ModifiersPage() {
  const router = useRouter();
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();

  const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // View mode state
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  useEffect(() => {
    fetchData();
  }, [selectedStoreCode]);

  const fetchData = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }
      const url = buildApiUrl("/api/dashboard/modifier-groups");
      const modifiersRes = await fetch(url, {
        cache: "no-store",
      });

      if (modifiersRes.ok) {
        const modifiersData = await modifiersRes.json();
        setModifiers(modifiersData);
      } else {
        try {
          const errorData = await modifiersRes.json();
          const errorMessage = errorData.error || "Failed to fetch modifiers";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to fetch modifiers");
        }
      }
    } catch (error: any) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Error loading data";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const handleAdd = () => {
    router.push("/dashboard/modifiers/modifiers/add");
  };

  const handleEdit = (modifier: ModifierGroup) => {
    router.push(`/dashboard/modifiers/modifiers/${modifier.id}/edit`);
  };

  const handleClone = (modifier: ModifierGroup) => {
    const url = `/dashboard/modifiers/modifiers/add?cloneId=${modifier.id}${selectedStoreCode ? `&storeCode=${selectedStoreCode}` : ""}`;
    router.push(url);
  };

  const handleDelete = (modifierId: string | number) => {
    setDeletingId(String(modifierId));
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const url = buildApiUrl(`/api/dashboard/modifier-groups/${deletingId}`);
      const response = await fetch(url, {
        method: "DELETE",
        cache: "no-store",
      });

      if (response.ok) {
        setModifiers((prev) =>
          prev.filter((mod) => String(mod.id) !== deletingId),
        );
        toast.success("Modifier deleted successfully");
        await fetchData({ silent: true });
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to delete modifier";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to delete modifier");
        }
      }
    } catch (error: any) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Error deleting modifier";
        toast.error(errorMessage);
      }
    } finally {
      setShowConfirmModal(false);
      setDeletingId(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price);
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
              Modifiers
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage item customization options and pricing strategies
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Modifier
          </button>
        </div>

        {/* Modifiers List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Modifiers ({modifiers.length})
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title="Grid View"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title="Table View"
              >
                <TableCellsIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className={viewMode === "table" ? "overflow-x-auto" : "p-2"}>
            {modifiers.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 dark:text-gray-500 text-2xl">
                    ⚙️
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No modifiers found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Get started by creating your first modifier.
                </p>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Modifier
                </button>
              </div>
            ) : viewMode === "table" ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Modifier Group
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Label
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Required
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Selection Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Min/Max
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {modifiers.map((modifier) => (
                    <tr
                      key={modifier.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {modifier.groupName || "Unnamed Group"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {modifier.labelName || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            modifier.isRequired === 1
                              ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                              : "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                          }`}
                        >
                          {modifier.isRequired === 1 ? "Required" : "Optional"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            modifier.isMultiselect === 1
                              ? "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400"
                              : "bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {modifier.isMultiselect === 1 ? "Multi" : "Single"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {typeof modifier.minSelection === "number" ||
                        typeof modifier.maxSelection === "number" ? (
                          <span>
                            {modifier.minSelection ?? "-"} /{" "}
                            {modifier.maxSelection ?? "-"}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            modifier.isActive === 1
                              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                              : "bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {modifier.isActive === 1 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(modifier)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit modifier"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleClone(modifier)}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                            title="Clone modifier"
                          >
                            <DocumentDuplicateIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(modifier.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete modifier"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {modifiers.map((modifier) => (
                    <div
                      key={modifier.id}
                      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                    >
                      {/* Card Header */}
                      <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {modifier.groupName || "Unnamed Group"}
                            </h3>

                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {modifier.labelName || "No label assigned"}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                modifier.isRequired === 1
                                  ? "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800"
                                  : "bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-800"
                              }`}
                            >
                              {modifier.isRequired === 1
                                ? "Required"
                                : "Optional"}
                            </span>

                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                modifier.isMultiselect === 1
                                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800"
                                  : "bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600"
                              }`}
                            >
                              {modifier.isMultiselect === 1
                                ? "Multi Select"
                                : "Single Select"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="px-2 py-2">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/60">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Min Selection
                            </p>
                            <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                              {typeof modifier.minSelection === "number"
                                ? modifier.minSelection
                                : "N/A"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/60">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Max Selection
                            </p>
                            <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                              {typeof modifier.maxSelection === "number"
                                ? modifier.maxSelection
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-900/40">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleEdit(modifier)}
                            className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100 hover:shadow-sm dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                            title="Edit modifier"
                          >
                            <PencilIcon className="mr-1.5 h-4 w-4" />
                            Edit
                          </button>

                          <button
                            onClick={() => handleClone(modifier)}
                            className="inline-flex items-center justify-center rounded-xl border border-purple-200 bg-purple-50 px-3 py-2.5 text-sm font-semibold text-purple-700 transition-all hover:bg-purple-100 hover:shadow-sm dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40"
                            title="Clone modifier"
                          >
                            <DocumentDuplicateIcon className="mr-1.5 h-4 w-4" />
                            Clone
                          </button>

                          <button
                            onClick={() => handleDelete(modifier.id)}
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 transition-all hover:bg-red-100 hover:shadow-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
                            title="Delete modifier"
                          >
                            <TrashIcon className="mr-1.5 h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">
              Delete Modifier
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this modifier? This action
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
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
