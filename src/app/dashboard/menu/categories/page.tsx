"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";

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
}

interface MenuMaster {
  tblMenuMasterId: number;
  name: string;
}

export default function MenuCategoriesPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuMasters, setMenuMasters] = useState<MenuMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    items: 0,
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMenuMaster, setSelectedMenuMaster] = useState("");
  const [filteredCategories, setFilteredCategories] = useState<MenuCategory[]>(
    []
  );

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
    const master = menuMasters.find((m) => m.tblMenuMasterId === menuMasterId);
    return master?.name || "Unknown";
  };

  const fetchData = async () => {
    try {
      const [categoriesRes, mastersRes, itemsRes] = await Promise.all([
        fetch("/api/menu/categories"),
        fetch("/api/menu/masters"),
        fetch("/api/menu/items"),
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (mastersRes.ok) {
        const mastersData = await mastersRes.json();
        setMenuMasters(mastersData);
      }

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setStats((prev) => ({ ...prev, items: itemsData.length }));
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Modal handlers
  const handleAdd = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const handleEdit = (category: MenuCategory) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const url = editingCategory
        ? `/api/menu/categories/${editingCategory.tblMenuCategoryId}`
        : "/api/menu/categories";

      const method = editingCategory ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          editingCategory
            ? "Category updated successfully!"
            : "Category created successfully!"
        );
        setShowModal(false);
        setEditingCategory(null);
        fetchData(); // Refresh data
      } else {
        throw new Error("Failed to save category");
      }
    } catch (error) {
      toast.error("Error saving category");
      console.error("Error:", error);
    }
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                  <option
                    key={master.tblMenuMasterId}
                    value={master.tblMenuMasterId}
                  >
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    C
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Categories
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {filteredCategories.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    A
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {categories.filter((c) => c.isActive === 1).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    I
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Items
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.items}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Categories List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Categories List ({filteredCategories.length})
            </h3>
          </div>
          <div className="p-6">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-8">
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCategories.map((category) => (
                  <div
                    key={category.tblMenuCategoryId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-700"
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
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                        title="View category details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(category)}
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

      {/* Modal */}
      <CRUDModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? "Edit Category" : "Add New Category"}
        size="md"
      >
        <CategoryForm
          category={editingCategory}
          menuMasters={menuMasters}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingCategory(null);
          }}
        />
      </CRUDModal>

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

// Category Form Component
function CategoryForm({
  category,
  menuMasters,
  onSave,
  onCancel,
}: {
  category?: MenuCategory | null;
  menuMasters: MenuMaster[];
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    colorCode: "#3B82F6",
    tblMenuMasterId: "",
    isActive: 1,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        colorCode: category.colorCode || "#3B82F6",
        tblMenuMasterId: category.tblMenuMasterId?.toString() || "",
        isActive: category.isActive || 1,
      });
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        tblMenuMasterId: parseInt(formData.tblMenuMasterId),
      };

      await onSave(submitData);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter category name"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Menu Master *
          </label>
          <select
            required
            value={formData.tblMenuMasterId}
            onChange={(e) =>
              setFormData({ ...formData, tblMenuMasterId: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Menu Master</option>
            {menuMasters.map((master) => (
              <option
                key={master.tblMenuMasterId}
                value={master.tblMenuMasterId}
              >
                {master.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Color Code
          </label>
          <input
            type="color"
            value={formData.colorCode}
            onChange={(e) =>
              setFormData({ ...formData, colorCode: e.target.value })
            }
            className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isActive === 1}
            onChange={(e) =>
              setFormData({ ...formData, isActive: e.target.checked ? 1 : 0 })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Active
          </span>
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "Saving..." : category ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
