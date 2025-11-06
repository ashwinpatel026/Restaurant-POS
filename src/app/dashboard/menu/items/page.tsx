"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowLeftIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import { PageSkeleton, CardSkeleton } from "@/components/ui/SkeletonLoader";

interface MenuItem {
  menuItemId?: string;
  menuItemCode?: string;
  menuCategoryCode?: string;
  tblMenuItemId?: number;
  tblMenuCategoryId?: number;
  name: string;
  kitchenName?: string;
  labelName: string;
  colorCode?: string;
  calories?: string;
  description?: string;
  descrip?: string;
  itemSize?: string;
  skuPlu?: number | string;
  itemContainAlcohol?: number;
  isAlcohol?: number;
  menuImg?: string;
  priceStrategy?: number;
  basePrice?: number;
  price?: number;
  isPrice?: number;
  isActive: number;
  stockinhand?: number;
  taxCode?: string;
  modifiers: any[];
  assignedModifiers?: any[];
}

interface MenuCategory {
  tblMenuCategoryId?: number;
  menuCategoryCode?: string;
  name: string;
  menuMaster?: { name: string };
}

export default function MenuItemsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastRefreshRef = useRef<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [skuPluSearch, setSkuPluSearch] = useState("");
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);

  // View mode state
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Refetch when refresh parameter is present (only once per refresh token)
  useEffect(() => {
    const refreshToken = searchParams.get("refresh");
    if (
      pathname === "/dashboard/menu/items" &&
      refreshToken &&
      refreshToken !== lastRefreshRef.current &&
      !fetchingRef.current
    ) {
      lastRefreshRef.current = refreshToken;
      fetchData();
      // Clean up the refresh parameter after a delay to avoid re-triggering
      setTimeout(() => {
        router.replace("/dashboard/menu/items", { scroll: false });
      }, 100);
    }
  }, [pathname, searchParams, router]);

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

    // Filter by category (supports code or legacy id)
    if (selectedCategory) {
      filtered = filtered.filter((item) =>
        item.menuCategoryCode
          ? item.menuCategoryCode === selectedCategory
          : item.tblMenuCategoryId === parseInt(selectedCategory)
      );
    }

    // Filter by price range (basePrice preferred)
    if (priceRange.min) {
      filtered = filtered.filter(
        (item) =>
          (item.basePrice ?? item.price ?? 0) >= parseFloat(priceRange.min)
      );
    }
    if (priceRange.max) {
      filtered = filtered.filter(
        (item) =>
          (item.basePrice ?? item.price ?? 0) <= parseFloat(priceRange.max)
      );
    }

    // Filter by SKU/PLU
    if (skuPluSearch) {
      filtered = filtered.filter((item) =>
        (item.skuPlu != null ? String(item.skuPlu) : "").includes(skuPluSearch)
      );
    }

    setFilteredItems(filtered);
  };

  const fetchData = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const [itemsRes, categoriesRes] = await Promise.all([
        fetch("/api/menu/items"),
        fetch("/api/menu/categories"),
      ]);

      let itemsData = [];
      if (itemsRes.ok) {
        itemsData = await itemsRes.json();
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      // Set menu items without fetching modifiers initially for better performance
      setMenuItems(
        (itemsData as any[]).map((item: any) => ({
          ...item,
          assignedModifiers: [],
        }))
      );
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price);
  };

  // Navigation handlers
  const handleAdd = () => {
    router.push("/dashboard/menu/items/add");
  };

  const handleEdit = (item: MenuItem) => {
    const id = item.menuItemId || item.tblMenuItemId?.toString();
    if (id) router.push(`/dashboard/menu/items/${id}/edit`);
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
                    key={
                      category.menuCategoryCode || category.tblMenuCategoryId
                    }
                    value={
                      (category.menuCategoryCode ||
                        category.tblMenuCategoryId?.toString()) as string
                    }
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
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Menu Items List ({filteredItems.length})
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
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 p-6">
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
            ) : viewMode === "table" ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Label
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      SKU/PLU
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
                  {filteredItems.map((item) => (
                    <tr
                      key={item.menuItemId || item.tblMenuItemId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      style={
                        item.colorCode
                          ? {
                              borderLeft: `4px solid ${item.colorCode}`,
                            }
                          : undefined
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.menuImg ? (
                          <img
                            src={item.menuImg}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-8 h-8 text-gray-400 dark:text-gray-500"
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
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.labelName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {categories.find((c) =>
                            item.menuCategoryCode
                              ? c.menuCategoryCode === item.menuCategoryCode
                              : c.tblMenuCategoryId === item.tblMenuCategoryId
                          )?.name || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatPrice(
                            (item.basePrice ?? item.price) as number
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.skuPlu || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            item.isActive === 1
                              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                              : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                          }`}
                        >
                          {item.isActive === 1 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                            title="Edit menu item"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(
                                item.tblMenuItemId ??
                                  parseInt(item.menuItemId || "0")
                              )
                            }
                            className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
                            title="Delete menu item"
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
                {filteredItems.map((item) => (
                  <div
                    key={item.menuItemId || item.tblMenuItemId}
                    className="border-2 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-700"
                    style={{
                      borderColor: item.colorCode || "#E5E7EB",
                    }}
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
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.name}
                      </h3>
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
                        {categories.find((c) =>
                          item.menuCategoryCode
                            ? c.menuCategoryCode === item.menuCategoryCode
                            : c.tblMenuCategoryId === item.tblMenuCategoryId
                        )?.name || "N/A"}
                      </p>
                      <p>
                        <strong>Price:</strong>{" "}
                        {formatPrice((item.basePrice ?? item.price) as number)}
                      </p>
                      {(item.description || item.descrip) && (
                        <p>
                          <strong>Description:</strong>{" "}
                          {item.description || item.descrip}
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
                      {(item.itemContainAlcohol === 1 ||
                        item.isAlcohol === 1) && (
                        <p className="text-red-600 dark:text-red-400">
                          <strong>🍺 Contains Alcohol</strong>
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2">
                      {/* <button
                        className="p-1 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        title="View menu item details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button> */}
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1 text-blue-500 hover:text-blue-700 transition-colors duration-200"
                        title="Edit menu item"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(
                            item.tblMenuItemId ??
                              parseInt(item.menuItemId || "0")
                          )
                        }
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
