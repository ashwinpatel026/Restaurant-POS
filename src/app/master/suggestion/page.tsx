"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import DataTable from "@/components/tables/DataTable";
import {
  TableSkeleton,
  StatsSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/SkeletonLoader";

interface Suggestion {
  suggestionId: string;
  suggestionCode: string;
  suggestionText: string;
  category?: string | null;
  isActive: number;
  prepZoneCode?: string | null;
  suggestionDesc?: string | null;
  createdBy?: string | null;
  createdOn?: string;
  updatedBy?: string | null;
  updatedOn?: string | null;
}

interface PrepZone {
  prepZoneId: string;
  prepZoneCode: string;
  prepZoneName: string | null;
  isActive: number;
}

export default function SuggestionPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [prepZones, setPrepZones] = useState<PrepZone[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState<Suggestion | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const token = localStorage.getItem("master_admin_token");
      const [suggestionsRes, prepZonesRes] = await Promise.all([
        fetch("/api/master/suggestion", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/master/prep-zone", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
        setSuggestions(Array.isArray(data) ? data : []);
      }

      if (prepZonesRes.ok) {
        const data = await prepZonesRes.json();
        setPrepZones(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Navigation handlers
  const handleAdd = () => {
    router.push("/master/suggestion/add");
  };

  const handleEdit = (suggestion: Suggestion) => {
    router.push(`/master/suggestion/${suggestion.suggestionId}/edit`);
  };

  const handleDeleteClick = (suggestion: Suggestion) => {
    setSuggestionToDelete(suggestion);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!suggestionToDelete) return;

    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(
        `/api/master/suggestion/${suggestionToDelete.suggestionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setSuggestions(
          suggestions.filter(
            (suggestion) => suggestion.suggestionId !== suggestionToDelete.suggestionId
          )
        );
        toast.success("Suggestion deleted successfully");
        setShowDeleteModal(false);
        setSuggestionToDelete(null);
      } else {
        throw new Error("Failed to delete suggestion");
      }
    } catch (error) {
      toast.error("Error deleting suggestion");
      console.error("Error:", error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSuggestionToDelete(null);
  };

  if (loading) {
    return (
      <MasterDashboardLayout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <PageHeaderSkeleton />

          {/* Stats Skeleton */}
          <StatsSkeleton count={3} />

          {/* Table Skeleton */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="mb-4">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <TableSkeleton rows={8} columns={8} />
          </div>
        </div>
      </MasterDashboardLayout>
    );
  }

  const activeSuggestions = suggestions.filter((s) => s.isActive === 1).length;
  const inactiveSuggestions = suggestions.filter((s) => s.isActive === 0).length;

  return (
    <MasterDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Reason/Request Master
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage suggestions, reasons, and requests
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Suggestion
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Suggestions
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {suggestions.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {activeSuggestions}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Inactive
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {inactiveSuggestions}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Suggestions List
            </h3>
          </div>
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <DocumentTextIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No suggestions found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by adding your first suggestion.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Suggestion
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "#",
                  accessor: "suggestionId",
                  sortable: false,
                  cell: (suggestion: Suggestion, index?: number) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {(index ?? 0) + 1}
                        </span>
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Suggestion Text",
                  accessor: "suggestionText",
                  cell: (suggestion: Suggestion) => (
                    <div className="text-sm text-gray-900 dark:text-white">
                      {suggestion.suggestionText}
                    </div>
                  ),
                },
                {
                  header: "Category",
                  accessor: "category",
                  cell: (suggestion: Suggestion) => (
                    <div className="text-sm text-gray-900 dark:text-white">
                      {suggestion.category || (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  ),
                },
                {
                  header: "Prep Zone",
                  accessor: "prepZoneCode",
                  cell: (suggestion: Suggestion) => {
                    const prepZone = prepZones.find(
                      (pz) => pz.prepZoneCode === suggestion.prepZoneCode
                    );
                    return (
                      <div className="text-sm text-gray-900 dark:text-white">
                        {prepZone?.prepZoneName || (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    );
                  },
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (suggestion: Suggestion) => (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        suggestion.isActive === 1
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {suggestion.isActive === 1 ? (
                        <>
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "suggestionId",
                  sortable: false,
                  cell: (suggestion: Suggestion) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(suggestion)}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                        title="Edit suggestion"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(suggestion)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete suggestion"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={suggestions}
              keyExtractor={(suggestion: Suggestion) => suggestion.suggestionId.toString()}
              searchPlaceholder="Search suggestions..."
              emptyMessage="No suggestions found"
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Suggestion"
        itemName={suggestionToDelete?.suggestionText || ""}
      />
    </MasterDashboardLayout>
  );
}
