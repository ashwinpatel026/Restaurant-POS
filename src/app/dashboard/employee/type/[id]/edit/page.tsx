"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import StatusToggle from "@/components/forms/StatusToggle";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";

interface EmployeeType {
  employeeTypeId: string;
  typeCode: string;
  typeName: string | null;
  description: string | null;
  isActive: boolean;
}

export default function EditEmployeeTypePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { buildApiUrl } = useApiWithStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    typeName: "",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    fetchEmployeeType();
  }, [id]);

  const fetchEmployeeType = async () => {
    try {
      setFetching(true);
      const url = buildApiUrl(`/api/dashboard/employee-type/${id}`);
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (response.ok) {
        const data: EmployeeType = await response.json();
        setFormData({
          typeName: data.typeName || "",
          description: data.description || "",
          isActive: data.isActive,
        });
      } else {
        toast.error("Error loading employee type");
        router.push("/dashboard/employee/type");
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
      router.push("/dashboard/employee/type");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = buildApiUrl(`/api/dashboard/employee-type/${id}`);
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Employee type updated successfully!");
        router.push("/dashboard/employee/type");
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to update employee type";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to update employee type");
        }
      }
    } catch (error: any) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Error updating employee type";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
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
              Edit Employee Type
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Update employee type information
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Basic Information
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employee Type Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.typeName}
                      onChange={(e) =>
                        setFormData({ ...formData, typeName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter employee type name"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Enter a descriptive name for this employee type
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter description (optional)"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Provide additional details about this employee type (optional)
                    </p>
                  </div>
                </div>
              </div>

              <StatusToggle
                label="Employee Type Status"
                description="Toggle to control whether this employee type is active."
                value={formData.isActive}
                onChange={(val) =>
                  setFormData({ ...formData, isActive: val })
                }
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 rounded-b-lg flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update Employee Type"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

