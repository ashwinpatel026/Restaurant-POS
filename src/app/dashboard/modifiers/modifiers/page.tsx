"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

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
  const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const modifiersRes = await fetch("/api/modifier-groups", {
        next: { revalidate: 60 }, // Cache for 60 seconds
      });

      if (modifiersRes.ok) {
        const modifiersData = await modifiersRes.json();
        setModifiers(modifiersData);
      } else {
        throw new Error("Failed to fetch modifiers");
      }
    } catch (error: any) {
      toast.error("Error loading data");
      console.error("Error:", error);
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

  const handleDelete = (modifierId: string | number) => {
    setDeletingId(
      typeof modifierId === "string" ? parseInt(modifierId) : modifierId
    );
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/modifier-groups/${deletingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setModifiers(modifiers.filter((mod) => mod.id !== String(deletingId)));
        toast.success("Modifier deleted successfully");
      } else {
        throw new Error("Failed to delete modifier");
      }
    } catch (error) {
      toast.error("Error deleting modifier");
      console.error("Error:", error);
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
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Modifiers
            </h3>
          </div>
          <div className="p-6">
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modifiers.map((modifier) => (
                  <div
                    key={modifier.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-700"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {modifier.groupName || "Unnamed Group"}
                      </h3>
                      <div className="flex flex-col space-y-1">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            modifier.isRequired === 1
                              ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                              : "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                          }`}
                        >
                          {modifier.isRequired === 1 ? "Required" : "Optional"}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            modifier.isMultiselect === 1
                              ? "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400"
                              : "bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {modifier.isMultiselect === 1 ? "Multi" : "Single"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <p>
                        <strong>Label:</strong> {modifier.labelName || "N/A"}
                      </p>
                      {typeof modifier.minSelection === "number" && (
                        <p>
                          <strong>Min Selection:</strong>{" "}
                          {modifier.minSelection}
                        </p>
                      )}
                      {typeof modifier.maxSelection === "number" && (
                        <p>
                          <strong>Max Selection:</strong>{" "}
                          {modifier.maxSelection}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(modifier)}
                        className="p-1 text-blue-500 hover:text-blue-700 transition-colors duration-200"
                        title="Edit modifier"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(modifier.id)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200"
                        title="Delete modifier"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
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
