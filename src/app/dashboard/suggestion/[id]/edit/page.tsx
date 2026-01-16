"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import StatusToggle from "@/components/forms/StatusToggle";
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
}

interface PrepZone {
  prepZoneId: string;
  prepZoneCode: string;
  prepZoneName: string | null;
  isActive: number;
}

export default function EditSuggestionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();
  
  // Check permission to update suggestions
  const { hasPermission, loading: permissionLoading } = usePagePermission({
    requiredPermissions: ["suggestion.update"],
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [prepZones, setPrepZones] = useState<PrepZone[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [formData, setFormData] = useState({
    suggestionText: "",
    category: "",
    prepZoneCode: "",
    suggestionDesc: "",
    isActive: true,
  });

  useEffect(() => {
    if (selectedStoreCode && id && hasPermission) {
      fetchData();
    }
  }, [selectedStoreCode, id, hasPermission]);

  const fetchData = async () => {
    try {
      setFetching(true);
      const [suggestionRes, prepZonesRes] = await Promise.all([
        fetch(buildApiUrl(`/api/dashboard/suggestion/${id}`), {
          cache: "no-store",
        }),
        fetch(buildApiUrl("/api/dashboard/menu/prep-zone"), {
          cache: "no-store",
        }),
      ]);

      if (suggestionRes.ok) {
        const suggestionData = await suggestionRes.json();
        setSuggestion(suggestionData);
        setFormData({
          suggestionText: suggestionData.suggestionText || "",
          category: suggestionData.category || "",
          prepZoneCode: suggestionData.prepZoneCode || "",
          suggestionDesc: suggestionData.suggestionDesc || "",
          isActive: suggestionData.isActive === 1,
        });
      } else {
        toast.error("Failed to load suggestion");
        router.push("/dashboard/suggestion");
      }

      if (prepZonesRes.ok) {
        const prepZonesData = await prepZonesRes.json();
        setPrepZones(Array.isArray(prepZonesData) ? prepZonesData : []);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
      router.push("/dashboard/suggestion");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        buildApiUrl(`/api/dashboard/suggestion/${id}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        toast.success("Suggestion updated successfully!");
        router.push("/dashboard/suggestion");
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to update suggestion";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to update suggestion");
        }
      }
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Error updating suggestion";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (permissionLoading || fetching) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!hasPermission) {
    return null; // usePagePermission will redirect to access-denied
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Suggestion
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Update suggestion information
            </p>
            {suggestion?.suggestionCode && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Code: {suggestion.suggestionCode}
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Suggestion Text *
                </label>
                <input
                  type="text"
                  required
                  value={formData.suggestionText}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      suggestionText: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter suggestion text"
                  maxLength={255}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category (optional)</option>
                  <option value="Void Reason">Void Reason</option>
                  <option value="Attach Request">Attach Request</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prep Zone
                </label>
                <select
                  value={formData.prepZoneCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      prepZoneCode: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No prep zone assigned</option>
                  {prepZones.map((prepZone) => (
                    <option key={prepZone.prepZoneId} value={prepZone.prepZoneCode}>
                      {prepZone.prepZoneName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.suggestionDesc}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      suggestionDesc: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter detailed description (optional)"
                  maxLength={1000}
                />
              </div>

              <StatusToggle
                label="Suggestion Status"
                description="Toggle to control whether this suggestion is active."
                value={formData.isActive}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    isActive: val,
                  })
                }
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Suggestion"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
