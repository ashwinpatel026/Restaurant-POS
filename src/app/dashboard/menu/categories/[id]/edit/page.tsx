"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface MenuMaster {
  menuMasterId: string;
  name: string;
}

interface MenuCategory {
  tblMenuCategoryId: number;
  name: string;
  colorCode?: string;
  isActive: number;
  tblMenuMasterId: number;
}

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [menuMasters, setMenuMasters] = useState<MenuMaster[]>([]);
  const [category, setCategory] = useState<MenuCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    colorCode: "#3B82F6",
    menuMasterId: "",
    isActive: 1,
  });

  useEffect(() => {
    fetchData();
  }, [categoryId]);

  const fetchData = async () => {
    try {
      const [categoryRes, mastersRes] = await Promise.all([
        fetch(`/api/menu/categories/${categoryId}`),
        fetch("/api/menu/masters"),
      ]);

      if (categoryRes.ok) {
        const categoryData = await categoryRes.json();
        setCategory(categoryData);
        setFormData({
          name: categoryData.name || "",
          colorCode: categoryData.colorCode || "#3B82F6",
          menuMasterId:
            categoryData.menuMaster?.menuMasterId?.toString() ||
            categoryData.tblMenuMasterId?.toString() ||
            "",
          isActive: categoryData.isActive || 1,
        });
      }

      if (mastersRes.ok) {
        const mastersData = await mastersRes.json();
        setMenuMasters(mastersData);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/menu/categories/${categoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          colorCode: formData.colorCode,
          menuMasterId: formData.menuMasterId,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        toast.success("Category updated successfully!");
        router.push("/dashboard/menu/categories");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update category");
      }
    } catch (error: any) {
      toast.error(error.message || "Error updating category");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
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
              Edit Menu Category
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Update menu category information
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter category name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Menu Master *
                    </label>
                    <select
                      required
                      value={formData.menuMasterId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          menuMasterId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Menu Master</option>
                      {menuMasters.map((master) => (
                        <option
                          key={master.menuMasterId}
                          value={master.menuMasterId}
                        >
                          {master.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Color Code
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.colorCode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            colorCode: e.target.value,
                          })
                        }
                        className="h-10 w-20 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.colorCode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            colorCode: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Status
                </h3>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive === 1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isActive: e.target.checked ? 1 : 0,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Active
                    </span>
                  </label>
                </div>
              </div>
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
                {loading ? "Updating..." : "Update Category"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
