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
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface MenuCategory {
  tblMenuCategoryId: number;
  name: string;
  colorCode?: string;
  isActive: number;
  tblMenuMasterId: number;
  menuMaster?: {
    name: string;
  };
  menuItems: any[];
  modifierGroups?: string[];
}

interface MenuMaster {
  menuMasterId: string;
  name: string;
}

export default function MenuCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuMasters, setMenuMasters] = useState<MenuMaster[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMenuMaster, setSelectedMenuMaster] = useState("");
  const [filteredCategories, setFilteredCategories] = useState<MenuCategory[]>(
    []
  );

  // View mode state
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  useEffect(() => {
    fetchData();
  }, []);

  // Filter effect
  useEffect(() => {
    applyFilters();
  }, [categories, searchTerm, selectedMenuMaster]);

  const applyFilters = () => {
    let filtered = [...categories];

    // Search by name
    if (searchTerm) {
      filtered = filtered.filter((category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by menu master
    if (selectedMenuMaster) {
      filtered = filtered.filter(
        (category) => category.tblMenuMasterId === parseInt(selectedMenuMaster)
      );
    }

    setFilteredCategories(filtered);
  };

  // Helper function to get menu master name by ID
  const getMenuMasterName = (menuMasterId: number) => {
    const master = menuMasters.find(
      (m) => m.menuMasterId === menuMasterId.toString()
    );
    return master?.name || "Unknown";
  };

  const fetchData = async () => {
    try {
      const [categoriesRes, mastersRes] = await Promise.all([
        fetch("/api/menu/categories"),
        fetch("/api/menu/masters"),
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (mastersRes.ok) {
        const mastersData = await mastersRes.json();
        setMenuMasters(mastersData);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const handleAdd = () => {
    router.push("/dashboard/menu/categories/add");
  };

  const handleEdit = (categoryId: number) => {
    router.push(`/dashboard/menu/categories/${categoryId}/edit`);
  };

  const handleDelete = (categoryId: number) => {
    setDeletingId(categoryId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/menu/categories/${deletingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCategories(
          categories.filter((cat) => cat.tblMenuCategoryId !== deletingId)
        );
        toast.success("Category deleted successfully");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete category");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error deleting category"
      );
      console.error("Error:", error);
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
            onClick={() => router.push("/dashboard/menu")}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            <span className="text-lg font-medium">Back to Menu Management</span>
          </button>
        </div>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Menu Categories
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your restaurant menu categories and organization
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Category
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search by Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search by Category Name
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter category name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Menu Master Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Menu Master
              </label>
              <select
                value={selectedMenuMaster}
                onChange={(e) => setSelectedMenuMaster(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Menu Masters</option>
                {menuMasters.map((master) => (
                  <option key={master.menuMasterId} value={master.menuMasterId}>
                    {master.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedMenuMaster("");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Categories List ({filteredCategories.length})
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
          <div className={viewMode === "table" ? "overflow-x-auto" : "p-6"}>
            {filteredCategories.length === 0 ? (
              <div className="text-center py-8 p-6">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 dark:text-gray-500 text-2xl">
                    📂
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {categories.length === 0
                    ? "No categories found"
                    : "No categories match your filters"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {categories.length === 0
                    ? "Get started by creating your first menu category."
                    : "Try adjusting your search criteria or clear the filters."}
                </p>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Category
                </button>
              </div>
            ) : viewMode === "table" ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Menu Master
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Modifier Groups
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
                  {filteredCategories.map((category) => (
                    <tr
                      key={category.tblMenuCategoryId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      style={
                        category.colorCode
                          ? {
                              borderLeft: `4px solid ${category.colorCode}`,
                            }
                          : undefined
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                            style={{
                              backgroundColor: category.colorCode || "#3B82F6",
                            }}
                          ></div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {getMenuMasterName(category.tblMenuMasterId)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {category.modifierGroups &&
                          category.modifierGroups.length > 0 ? (
                            <>
                              {category.modifierGroups
                                .slice(0, 2)
                                .map((modifierCode, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                  >
                                    {modifierCode}
                                  </span>
                                ))}
                              {category.modifierGroups.length > 2 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                  +{category.modifierGroups.length - 2}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">
                              None
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            category.isActive === 1
                              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                              : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                          }`}
                        >
                          {category.isActive === 1 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() =>
                              handleEdit(category.tblMenuCategoryId)
                            }
                            className="p-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                            title="Edit category"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(category.tblMenuCategoryId)
                            }
                            className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
                            title="Delete category"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCategories.map((category) => (
                  <div
                    key={category.tblMenuCategoryId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-700"
                    style={
                      category.colorCode
                        ? { borderColor: category.colorCode }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{
                            backgroundColor: category.colorCode || "#3B82F6",
                          }}
                        ></div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {category.name}
                        </h3>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          category.isActive === 1
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                        }`}
                      >
                        {category.isActive === 1 ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <p>
                        <strong>Menu Master:</strong>{" "}
                        {getMenuMasterName(category.tblMenuMasterId)}
                      </p>
                      {category.modifierGroups &&
                        category.modifierGroups.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Assigned Modifiers:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {category.modifierGroups
                                .slice(0, 6)
                                .map((modifierCode, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-2 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                  >
                                    {modifierCode}
                                  </span>
                                ))}
                              {category.modifierGroups.length > 6 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                  +{category.modifierGroups.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(category.tblMenuCategoryId)}
                        className="p-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                        title="Edit category"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.tblMenuCategoryId)}
                        className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
                        title="Delete category"
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
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
              <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Delete Category
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete this category? This action
                cannot be undone and will affect all related menu items.
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
