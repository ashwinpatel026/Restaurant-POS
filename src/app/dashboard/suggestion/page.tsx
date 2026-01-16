"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import DataTable from "@/components/tables/DataTable";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import { usePagePermission } from "@/hooks/usePagePermission";

interface Suggestion {
  suggestionId: string;
  suggestionCode: string;
  suggestionText: string;
  category?: string | null;
  isActive: number;
  prepZoneCode?: string | null;
  suggestionDesc?: string | null;
  isDelete?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface PrepZone {
  prepZoneId: string;
  prepZoneCode: string;
  prepZoneName: string | null;
  isActive: number;
}

export default function SuggestionPage() {
  const router = useRouter();
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();

  // Check permission to view suggestions
  const { hasPermission, loading: permissionLoading, userPermissions } =
    usePagePermission({
      requiredPermissions: ["suggestion.view"],
    });

  // Check individual permissions for actions
  const canCreate = userPermissions.includes("suggestion.create");
  const canEdit = userPermissions.includes("suggestion.update");
  const canDelete = userPermissions.includes("suggestion.delete");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [prepZones, setPrepZones] = useState<PrepZone[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] =
    useState<Suggestion | null>(null);

  useEffect(() => {
    if (selectedStoreCode && hasPermission) {
      fetchData();
    }
  }, [selectedStoreCode, hasPermission]);

  const fetchData = async () => {
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const [suggestionsRes, prepZonesRes] = await Promise.all([
        fetch(buildApiUrl("/api/dashboard/suggestion"), {
          cache: "no-store",
        }),
        fetch(buildApiUrl("/api/dashboard/menu/prep-zone"), {
          cache: "no-store",
        }),
      ]);

      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } else {
        const error = await suggestionsRes.json();
        toast.error(error.error || "Error loading suggestions");
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
    router.push("/dashboard/suggestion/add");
  };

  const handleEdit = (suggestion: Suggestion) => {
    router.push(`/dashboard/suggestion/${suggestion.suggestionId}/edit`);
  };

  const handleDeleteClick = (suggestion: Suggestion) => {
    setSuggestionToDelete(suggestion);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!suggestionToDelete) return;

    try {
      const url = buildApiUrl(
        `/api/dashboard/suggestion/${suggestionToDelete.suggestionId}`
      );
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuggestions(
          suggestions.filter(
            (suggestion) =>
              suggestion.suggestionId !== suggestionToDelete.suggestionId
          )
        );
        toast.success("Suggestion deleted successfully");
        setShowDeleteModal(false);
        setSuggestionToDelete(null);
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to delete suggestion";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to delete suggestion");
        }
      }
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Error deleting suggestion";
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSuggestionToDelete(null);
  };

  if (permissionLoading || loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!hasPermission) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have permission to view suggestions.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Reason/Request
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage suggestions, reasons, and requests
            </p>
          </div>
          {canCreate && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Suggestion
            </button>
          )}
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
                {canCreate
                  ? "Get started by creating your first suggestion."
                  : "No suggestions available."}
              </p>
              {canCreate && (
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Suggestion
                </button>
              )}
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "Suggestion",
                  accessor: "suggestionText",
                  cell: (suggestion: Suggestion) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <DocumentTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {suggestion.suggestionText}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Category",
                  accessor: "category",
                  cell: (suggestion: Suggestion) => (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {suggestion.category || "-"}
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
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {prepZone?.prepZoneName || "-"}
                      </div>
                    );
                  },
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (suggestion: Suggestion) => (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        suggestion.isActive === 1
                          ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                      }`}
                    >
                      {suggestion.isActive === 1 ? "Active" : "Inactive"}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "suggestionId",
                  sortable: false,
                  cell: (suggestion: Suggestion) => {
                    const hasAnyAction = canEdit || canDelete;
                    if (!hasAnyAction) {
                      return (
                        <div className="text-sm text-gray-400 dark:text-gray-500">
                          No actions available
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center space-x-2">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(suggestion)}
                            className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                            title="Edit suggestion"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteClick(suggestion)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                            title="Delete suggestion"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              data={suggestions}
              keyExtractor={(suggestion: Suggestion) =>
                suggestion.suggestionId.toString()
              }
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
        description={`Are you sure you want to delete the suggestion "${suggestionToDelete?.suggestionText}"? This action cannot be undone.`}
      />
    </DashboardLayout>
  );
}
