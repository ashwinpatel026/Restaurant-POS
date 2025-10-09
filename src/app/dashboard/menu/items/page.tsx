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

interface MenuItem {
  tblMenuItemId: number;
  name: string;
  labelName: string;
  price: number;
  isActive: number;
  colorCode?: string;
  calories?: string;
  descrip?: string;
  skuPlu?: number;
  isAlcohol: number;
  menuImg?: string;
  priceStrategy: number;
  tblMenuCategoryId: number;
  // menuCategory removed since includes were removed; we will map name from categories list
  modifiers: any[];
  assignedModifiers?: any[]; // Added for displaying assigned modifiers
}

interface MenuCategory {
  tblMenuCategoryId: number;
  name: string;
  menuMaster?: {
    name: string;
  };
}

export default function MenuItemsPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    modifiers: 0,
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [skuPluSearch, setSkuPluSearch] = useState("");
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Filter effect
  useEffect(() => {
    applyFilters();
  }, [menuItems, searchTerm, selectedCategory, priceRange, skuPluSearch]);

  const applyFilters = () => {
    let filtered = [...menuItems];

    // Search by name
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(
        (item) => item.tblMenuCategoryId === parseInt(selectedCategory)
      );
    }

    // Filter by price range
    if (priceRange.min) {
      filtered = filtered.filter(
        (item) => item.price >= parseFloat(priceRange.min)
      );
    }
    if (priceRange.max) {
      filtered = filtered.filter(
        (item) => item.price <= parseFloat(priceRange.max)
      );
    }

    // Filter by SKU/PLU
    if (skuPluSearch) {
      filtered = filtered.filter((item) =>
        item.skuPlu?.toString().includes(skuPluSearch)
      );
    }

    setFilteredItems(filtered);
  };

  const fetchData = async () => {
    try {
      const [itemsRes, categoriesRes, modifiersRes] = await Promise.all([
        fetch("/api/menu/items"),
        fetch("/api/menu/categories"),
        fetch("/api/menu/modifiers"),
      ]);

      let itemsData = [];
      if (itemsRes.ok) {
        itemsData = await itemsRes.json();
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (modifiersRes.ok) {
        const modifiersData = await modifiersRes.json();
        setStats((prev) => ({ ...prev, modifiers: modifiersData.length }));
      }

      // Fetch modifiers for each menu item
      const itemsWithModifiers = await Promise.all(
        itemsData.map(async (item: MenuItem) => {
          try {
            const modifiersRes = await fetch(
              `/api/menu/menu-item-modifiers?menuItemId=${item.tblMenuItemId}`
            );
            if (modifiersRes.ok) {
              const assignments = await modifiersRes.json();
              // Get modifier details for each assignment
              const modifierDetails = await Promise.all(
                assignments.map(async (assignment: any) => {
                  const modifierRes = await fetch(
                    `/api/menu/modifiers/${assignment.tblModifierId}`
                  );
                  if (modifierRes.ok) {
                    return await modifierRes.json();
                  }
                  return null;
                })
              );
              return {
                ...item,
                assignedModifiers: modifierDetails.filter(Boolean),
              };
            }
          } catch (error) {
            console.error(
              `Error fetching modifiers for item ${item.tblMenuItemId}:`,
              error
            );
          }
          return { ...item, assignedModifiers: [] };
        })
      );

      setMenuItems(itemsWithModifiers);
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Modal handlers
  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const url = editingItem
        ? `/api/menu/items/${editingItem.tblMenuItemId}`
        : "/api/menu/items";

      const method = editingItem ? "PUT" : "POST";

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
          editingItem
            ? "Menu item updated successfully!"
            : "Menu item created successfully!"
        );
        setShowModal(false);
        setEditingItem(null);
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save menu item");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error saving menu item"
      );
      console.error("Error:", error);
    }
  };

  const handleDelete = (itemId: number) => {
    setDeletingId(itemId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/menu/items/${deletingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMenuItems(
          menuItems.filter((item) => item.tblMenuItemId !== deletingId)
        );
        toast.success("Menu item deleted successfully");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete menu item");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error deleting menu item"
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
              Menu Items
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your restaurant menu items, pricing, and details
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Menu Item
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    I
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Items
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {menuItems.length}
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
                  {menuItems.filter((i) => i.isActive === 1).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                    M
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  With Modifiers
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.modifiers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    🍺
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Alcohol Items
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {menuItems.filter((i) => i.isAlcohol === 1).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search by Name
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter menu item name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option
                    key={category.tblMenuCategoryId}
                    value={category.tblMenuCategoryId}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceRange.min}
                onChange={(e) =>
                  setPriceRange({ ...priceRange, min: e.target.value })
                }
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceRange.max}
                onChange={(e) =>
                  setPriceRange({ ...priceRange, max: e.target.value })
                }
                placeholder="999.99"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SKU/PLU
              </label>
              <input
                type="text"
                value={skuPluSearch}
                onChange={(e) => setSkuPluSearch(e.target.value)}
                placeholder="Enter SKU/PLU..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("");
                setPriceRange({ min: "", max: "" });
                setSkuPluSearch("");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Menu Items List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Menu Items List ({filteredItems.length})
            </h3>
          </div>
          <div className="p-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 dark:text-gray-500 text-2xl">
                    🍽️
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {menuItems.length === 0
                    ? "No menu items found"
                    : "No menu items match your filters"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {menuItems.length === 0
                    ? "Get started by creating your first menu item."
                    : "Try adjusting your search criteria or clear the filters."}
                </p>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Menu Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <div
                    key={item.tblMenuItemId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-700"
                  >
                    {/* Image Display */}
                    <div className="mb-4">
                      {item.menuImg ? (
                        <img
                          src={item.menuImg}
                          alt={item.name}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                          <div className="text-center text-gray-400 dark:text-gray-500">
                            <svg
                              className="w-12 h-12 mx-auto mb-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <p className="text-sm">No Image</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{
                            backgroundColor: item.colorCode || "#3B82F6",
                          }}
                        ></div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {item.name}
                        </h3>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.isActive === 1
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                        }`}
                      >
                        {item.isActive === 1 ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <p>
                        <strong>Label:</strong> {item.labelName}
                      </p>
                      <p>
                        <strong>Category:</strong>{" "}
                        {categories.find(
                          (c) => c.tblMenuCategoryId === item.tblMenuCategoryId
                        )?.name || "N/A"}
                      </p>
                      <p>
                        <strong>Price:</strong> {formatPrice(item.price)}
                      </p>
                      {item.descrip && (
                        <p>
                          <strong>Description:</strong> {item.descrip}
                        </p>
                      )}
                      {item.calories && (
                        <p>
                          <strong>Calories:</strong> {item.calories}
                        </p>
                      )}
                      {item.skuPlu && (
                        <p>
                          <strong>SKU/PLU:</strong> {item.skuPlu}
                        </p>
                      )}
                      {item.isAlcohol === 1 && (
                        <p className="text-red-600 dark:text-red-400">
                          <strong>🍺 Contains Alcohol</strong>
                        </p>
                      )}
                      {item.assignedModifiers &&
                        item.assignedModifiers.length > 0 && (
                          <div>
                            <strong>Modifiers:</strong>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.assignedModifiers.map((modifier: any) => (
                                <span
                                  key={modifier.tblModifierId}
                                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                >
                                  {modifier.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        className="p-1 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        title="View menu item details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1 text-blue-500 hover:text-blue-700 transition-colors duration-200"
                        title="Edit menu item"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.tblMenuItemId)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200"
                        title="Delete menu item"
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
          setEditingItem(null);
        }}
        title={editingItem ? "Edit Menu Item" : "Add New Menu Item"}
        size="xl"
      >
        <MenuItemForm
          menuItem={editingItem}
          categories={categories}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingItem(null);
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
              Delete Menu Item
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete this menu item? This action
                cannot be undone and will affect any related modifiers or
                orders.
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
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </CRUDModal>
    </DashboardLayout>
  );
}

// Menu Item Form Component
function MenuItemForm({
  menuItem,
  categories,
  onSave,
  onCancel,
}: {
  menuItem?: MenuItem | null;
  categories: MenuCategory[];
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    labelName: "",
    colorCode: "#3B82F6",
    calories: "",
    descrip: "",
    skuPlu: "",
    isAlcohol: 0,
    menuImg: "",
    priceStrategy: 1,
    price: 0,
    tblMenuCategoryId: "",
    isActive: 1,
  });

  const [modifiers, setModifiers] = useState<any[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    fetchModifiers();
  }, []);

  useEffect(() => {
    if (menuItem) {
      setFormData({
        name: menuItem.name || "",
        labelName: menuItem.labelName || "",
        colorCode: menuItem.colorCode || "#3B82F6",
        calories: menuItem.calories || "",
        descrip: menuItem.descrip || "",
        skuPlu: menuItem.skuPlu?.toString() || "",
        isAlcohol: menuItem.isAlcohol || 0,
        menuImg: menuItem.menuImg || "",
        priceStrategy: menuItem.priceStrategy || 1,
        price: menuItem.price || 0,
        tblMenuCategoryId: menuItem.tblMenuCategoryId?.toString() || "",
        isActive: menuItem.isActive || 1,
      });

      // Fetch existing modifier assignments for this menu item
      if (menuItem.tblMenuItemId) {
        fetchMenuItemModifiers(menuItem.tblMenuItemId);
      }
    }
  }, [menuItem]);

  const fetchModifiers = async () => {
    try {
      const response = await fetch("/api/menu/modifiers");
      if (response.ok) {
        const modifiersData = await response.json();
        setModifiers(modifiersData);
      }
    } catch (error) {
      console.error("Error fetching modifiers:", error);
    }
  };

  const fetchMenuItemModifiers = async (menuItemId: number) => {
    try {
      const response = await fetch(
        `/api/menu/menu-item-modifiers?menuItemId=${menuItemId}`
      );
      if (response.ok) {
        const assignments = await response.json();
        const modifierIds = assignments.map(
          (assignment: any) => assignment.tblModifierId
        );
        setSelectedModifiers(modifierIds);
      }
    } catch (error) {
      console.error("Error fetching menu item modifiers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        skuPlu: formData.skuPlu ? parseInt(formData.skuPlu) : null,
        price: parseFloat(formData.price.toString()),
        tblMenuCategoryId: parseInt(formData.tblMenuCategoryId),
        priceStrategy: parseInt(formData.priceStrategy.toString()),
        selectedModifiers: selectedModifiers, // Include selected modifiers
      };

      await onSave(submitData);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleModifierToggle = (modifierId: number) => {
    setSelectedModifiers((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            placeholder="Enter item name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Label Name *
          </label>
          <input
            type="text"
            required
            value={formData.labelName}
            onChange={(e) =>
              setFormData({ ...formData, labelName: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter display label"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category *
          </label>
          <select
            required
            value={formData.tblMenuCategoryId}
            onChange={(e) =>
              setFormData({ ...formData, tblMenuCategoryId: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Category</option>
            {categories.map((category) => (
              <option
                key={category.tblMenuCategoryId}
                value={category.tblMenuCategoryId}
              >
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Price *
          </label>
          <input
            type="number"
            required
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) =>
              setFormData({
                ...formData,
                price: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Price Strategy
          </label>
          <select
            value={formData.priceStrategy}
            onChange={(e) =>
              setFormData({
                ...formData,
                priceStrategy: parseInt(e.target.value),
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={1}>Base Price</option>
            <option value={2}>Size Price</option>
            <option value={3}>Open Price</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.descrip}
            onChange={(e) =>
              setFormData({ ...formData, descrip: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Enter item description"
          />

          {/* Color Code moved here after Description */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Color Code
            </label>
            <input
              type="color"
              value={formData.colorCode}
              onChange={(e) =>
                setFormData({ ...formData, colorCode: e.target.value })
              }
              className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Checkboxes in horizontal row after Color Code */}
          <div className="flex items-center space-x-6 mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isAlcohol === 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isAlcohol: e.target.checked ? 1 : 0,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Contains Alcohol
              </span>
            </label>

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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Active
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Additional Info
          </label>
          <div className="space-y-2">
            <input
              type="text"
              value={formData.calories}
              onChange={(e) =>
                setFormData({ ...formData, calories: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Calories"
            />
            <input
              type="text"
              value={formData.skuPlu}
              onChange={(e) =>
                setFormData({ ...formData, skuPlu: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="SKU/PLU"
            />
            {/* Image upload + preview */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setImageLoading(true);

                  // Check file size (max 1MB)
                  const maxSize = 1 * 1024 * 1024; // 1MB in bytes
                  if (file.size > maxSize) {
                    toast.error("Image size must be less than 1MB");
                    e.target.value = ""; // Clear the input
                    setImageLoading(false);
                    return;
                  }

                  // Check file type
                  if (!file.type.startsWith("image/")) {
                    toast.error("Please select a valid image file");
                    e.target.value = ""; // Clear the input
                    setImageLoading(false);
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result as string;
                    // Check if base64 string is too large (roughly 1.3MB for 1MB file)
                    if (result.length > 1400000) {
                      toast.error(
                        "Image is too large. Please use a smaller image."
                      );
                      e.target.value = ""; // Clear the input
                      setImageLoading(false);
                      return;
                    }

                    setFormData({
                      ...formData,
                      menuImg: result,
                    });
                    setImageLoading(false);
                    toast.success("Image uploaded successfully!");
                  };

                  reader.onerror = () => {
                    toast.error("Error reading image file");
                    e.target.value = ""; // Clear the input
                    setImageLoading(false);
                  };

                  reader.readAsDataURL(file);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/20 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supported formats: JPG, PNG, GIF (Max size: 1MB)
              </p>
              {imageLoading && (
                <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  <span>Processing image...</span>
                </div>
              )}
              {formData.menuImg && !imageLoading && (
                <div className="mt-2">
                  <img
                    src={formData.menuImg}
                    alt="Preview"
                    className="h-24 w-24 object-cover rounded border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, menuImg: "" });
                      // Clear the file input
                      const fileInput = document.querySelector(
                        'input[type="file"]'
                      ) as HTMLInputElement;
                      if (fileInput) fileInput.value = "";
                    }}
                    className="mt-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modifiers Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Modifiers
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select modifiers that customers can choose for this menu item
          </p>
        </div>

        {modifiers.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">
              No modifiers available
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Create modifiers first in the Modifiers section
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modifiers.map((modifier) => (
              <div
                key={modifier.tblModifierId}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedModifiers.includes(modifier.tblModifierId)
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700"
                }`}
                onClick={() => handleModifierToggle(modifier.tblModifierId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-3"
                      style={{
                        backgroundColor: modifier.colorCode || "#3B82F6",
                      }}
                    ></div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {modifier.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {modifier.labelName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedModifiers.includes(
                        modifier.tblModifierId
                      )}
                      onChange={() =>
                        handleModifierToggle(modifier.tblModifierId)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {modifier.required === 1 && (
                    <span className="inline-block bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 px-2 py-1 rounded mr-2">
                      Required
                    </span>
                  )}
                  {modifier.isMultiselect === 1 ? (
                    <span className="inline-block bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 px-2 py-1 rounded">
                      Multi-select
                    </span>
                  ) : (
                    <span className="inline-block bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 px-2 py-1 rounded">
                      Single-select
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
          {loading ? "Saving..." : menuItem ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
