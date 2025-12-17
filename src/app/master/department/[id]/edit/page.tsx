"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import StatusToggle from "@/components/forms/StatusToggle";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface Department {
  deptId: string;
  deptCode: string;
  deptName: string | null;
  deptTaxCode: string | null;
  deptTypeCode: string | null;
  isActive: number;
}

interface DepartmentType {
  deptTypeId: string;
  deptTypeCode: string;
  name: string | null;
  isActive: number;
}

interface Tax {
  tblTaxId: string;
  taxCode: string;
  taxname: string;
  taxrate?: number | string;
}

export default function EditDepartmentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [departmentTypes, setDepartmentTypes] = useState<DepartmentType[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [formData, setFormData] = useState({
    deptName: "",
    deptTaxCode: "",
    deptTypeCode: "",
    isActive: 1,
  });

  useEffect(() => {
    fetchDepartment();
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const [deptTypesRes, taxesRes] = await Promise.all([
        fetch("/api/master/department-type", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }),
        fetch("/api/master/tax", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }),
      ]);

      if (deptTypesRes.ok) {
        const deptTypesData = await deptTypesRes.json();
        setDepartmentTypes(
          deptTypesData.filter((dt: DepartmentType) => dt.isActive === 1)
        );
      }

      if (taxesRes.ok) {
        const taxesData = await taxesRes.json();
        setTaxes(Array.isArray(taxesData) ? taxesData : []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const fetchDepartment = async () => {
    try {
      setFetching(true);
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(`/api/master/department/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const data: Department = await response.json();
        setFormData({
          deptName: data.deptName || "",
          deptTaxCode: data.deptTaxCode || "",
          deptTypeCode: data.deptTypeCode || "",
          isActive: data.isActive,
        });
      } else {
        toast.error("Error loading department");
        router.push("/master/department");
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
      router.push("/master/department");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(`/api/master/department/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deptName: formData.deptName,
          deptTaxCode: formData.deptTaxCode || null,
          deptTypeCode: formData.deptTypeCode || null,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        toast.success("Department updated successfully!");
        router.push("/master/department");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update department");
      }
    } catch (error: any) {
      toast.error(error.message || "Error updating department");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <MasterDashboardLayout>
        <PageSkeleton />
      </MasterDashboardLayout>
    );
  }

  return (
    <MasterDashboardLayout>
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
              Edit Department
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Update department information
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
                      Department Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.deptName}
                      onChange={(e) =>
                        setFormData({ ...formData, deptName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter department name"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Enter a descriptive name for this department
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department Type
                    </label>
                    <select
                      value={formData.deptTypeCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deptTypeCode: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Department Type</option>
                      {departmentTypes.map((dt) => (
                        <option key={dt.deptTypeId} value={dt.deptTypeCode}>
                          {dt.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Select the type of department (optional)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tax Code
                    </label>
                    <select
                      value={formData.deptTaxCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deptTaxCode: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Tax Code</option>
                      {taxes.map((tax) => (
                        <option key={tax.tblTaxId} value={tax.taxCode}>
                          {tax.taxname} ({tax.taxCode})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Select the tax code for this department (optional)
                    </p>
                  </div>
                </div>
              </div>

              <StatusToggle
                label="Department Status"
                description="Toggle to control whether this department is active."
                value={formData.isActive === 1}
                onChange={(val) =>
                  setFormData({ ...formData, isActive: val ? 1 : 0 })
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
                {loading ? "Updating..." : "Update Department"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MasterDashboardLayout>
  );
}
