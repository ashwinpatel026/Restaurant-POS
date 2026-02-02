"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowLeftIcon,
  Squares2X2Icon,
  TableCellsIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import { PageSkeleton, CardSkeleton } from "@/components/ui/SkeletonLoader";

interface MenuItem {
  menuItemId?: string;
  menuItemCode?: string;
  menuCategoryCode?: string | string[]; // Can be string or array (JSON)
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
  priceStrategy?: number; // 1=Base Price, 3=Open Price
  basePrice?: number;
  price?: number;
  cardPrice?: number;
  cashPrice?: number;
  isPrice?: number;
  isActive: number;
  stockinhand?: number;
  taxCode?: string;
  modifiers: any[];
  assignedModifiers?: any[];
}

interface MenuCategory {
  menuCategoryId?: string;
  menuCategoryCode?: string;
  name: string;
  menuMasterCode?: string;
  menuMaster?: { name: string; menuMasterCode?: string };
}

export default function MasterMenuItemsPage() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

    // Filter by category (supports code or legacy id, handles both string and array)
    if (selectedCategory) {
      filtered = filtered.filter((item) => {
        if (item.menuCategoryCode) {
          // Handle array (JSON) or string
          const categoryCodes = Array.isArray(item.menuCategoryCode)
            ? item.menuCategoryCode
            : [item.menuCategoryCode];
          return categoryCodes.includes(selectedCategory);
        }
        return item.tblMenuCategoryId === parseInt(selectedCategory);
      });
    }

    // Filter by price range (use cardPrice or cashPrice, fallback to basePrice/price)
    if (priceRange.min) {
      filtered = filtered.filter((item) => {
        const price =
          item.cardPrice ?? item.cashPrice ?? item.basePrice ?? item.price ?? 0;
        return price >= parseFloat(priceRange.min);
      });
    }
    if (priceRange.max) {
      filtered = filtered.filter((item) => {
        const price =
          item.cardPrice ?? item.cashPrice ?? item.basePrice ?? item.price ?? 0;
        return price <= parseFloat(priceRange.max);
      });
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
      const token = localStorage.getItem("master_admin_token");
      const [itemsRes, categoriesRes] = await Promise.all([
        fetch("/api/master/menu-items", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/master/menu-categories", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
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

  // Helper function to get category and menu master info for an item
  const getItemCategoryInfo = (item: MenuItem) => {
    // Create a map for quick category lookup
    const categoryMap = new Map<string, MenuCategory>();
    categories.forEach((cat) => {
      if (cat.menuCategoryCode) {
        categoryMap.set(cat.menuCategoryCode, cat);
      }
    });

    type MasterCategoryPair = {
      menuMasterCode: string;
      menuMasterName: string;
      categoryCode: string;
      categoryName: string;
    };

    const pairs: MasterCategoryPair[] = [];

    // Handle structured format: [{menuMasterCode: "MM1", menuCategoryCode: "MC1"}, ...]
    if (item.menuCategoryCode) {
      if (Array.isArray(item.menuCategoryCode)) {
        // Check if it's structured format
        const firstItem = item.menuCategoryCode[0];
        if (firstItem && typeof firstItem === 'object' && 'menuMasterCode' in firstItem && 'menuCategoryCode' in firstItem) {
          // Structured format
          const mappings = item.menuCategoryCode as unknown as Array<{ menuMasterCode: string; menuCategoryCode: string }>;
          mappings.forEach((mapping) => {
            const category = categoryMap.get(mapping.menuCategoryCode);
            if (category) {
              pairs.push({
                menuMasterCode: mapping.menuMasterCode,
                menuMasterName: category.menuMaster?.name || 'Unknown',
                categoryCode: mapping.menuCategoryCode,
                categoryName: category.name || 'Unknown',
              });
            }
          });
        } else {
          // Old format: simple array of category codes
          const categoryCodes = item.menuCategoryCode as string[];
          
          categoryCodes.forEach((catCode) => {
            const category = categoryMap.get(catCode);
            if (category && category.menuMasterCode) {
              pairs.push({
                menuMasterCode: category.menuMasterCode,
                menuMasterName: category.menuMaster?.name || 'Unknown',
                categoryCode: catCode,
                categoryName: category.name || 'Unknown',
              });
            }
          });
        }
      } else if (typeof item.menuCategoryCode === 'string') {
        // Single category code (old format)
        const category = categoryMap.get(item.menuCategoryCode);
        if (category && category.menuMasterCode) {
          pairs.push({
            menuMasterCode: category.menuMasterCode,
            menuMasterName: category.menuMaster?.name || 'Unknown',
            categoryCode: item.menuCategoryCode,
            categoryName: category.name || 'Unknown',
          });
        }
      }
    }

    // Fallback to legacy approach
    if (pairs.length === 0 && item.tblMenuCategoryId) {
      const category = categories.find(
        (c) => c.menuCategoryId === item.tblMenuCategoryId?.toString()
      );
      if (category && category.menuMasterCode) {
        pairs.push({
          menuMasterCode: category.menuMasterCode,
          menuMasterName: category.menuMaster?.name || 'Unknown',
          categoryCode: category.menuCategoryCode || '',
          categoryName: category.name || 'Unknown',
        });
      }
    }

    // Group by menu master
    const groupedByMaster = new Map<string, { menuMasterCode: string; menuMasterName: string; categories: Array<{ code: string; name: string }> }>();
    
    pairs.forEach((pair) => {
      if (!groupedByMaster.has(pair.menuMasterCode)) {
        groupedByMaster.set(pair.menuMasterCode, {
          menuMasterCode: pair.menuMasterCode,
          menuMasterName: pair.menuMasterName,
          categories: [],
        });
      }
      const masterGroup = groupedByMaster.get(pair.menuMasterCode)!;
      if (!masterGroup.categories.find(c => c.code === pair.categoryCode)) {
        masterGroup.categories.push({
          code: pair.categoryCode,
          name: pair.categoryName,
        });
      }
    });

    return {
      menuMasterNames: Array.from(groupedByMaster.values()).map(m => m.menuMasterName),
      categoryNames: pairs.map(p => p.categoryName),
      groupedByMaster: Array.from(groupedByMaster.values()),
    };
  };

  // Navigation handlers
  const handleAdd = () => {
    router.push("/master/menu/items/add");
  };

  const handleEdit = (item: MenuItem) => {
    const id = item.menuItemId || item.tblMenuItemId?.toString();
    if (id) router.push(`/master/menu/items/${id}/edit`);
  };

  const handleClone = (item: MenuItem) => {
    const id = item.menuItemId || item.tblMenuItemId?.toString();
    if (id) router.push(`/master/menu/items/add?cloneId=${id}`);
  };

  const handleDelete = (itemId: string) => {
    setDeletingId(itemId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(`/api/master/menu-items/${deletingId}`, {
        method: "DELETE",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Filter out the deleted item by checking both tblMenuItemId and menuItemId
        const updatedItems = menuItems.filter((item) => {
          const itemId = item.menuItemId || item.tblMenuItemId?.toString();
          return itemId !== deletingId;
        });
        setMenuItems(updatedItems);
        toast.success("Menu item deleted successfully");
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to delete menu item";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to delete menu item");
        }
      }
    } catch (error) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Error deleting menu item";
        toast.error(errorMessage);
      }
    } finally {
      setShowConfirmModal(false);
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <MasterDashboardLayout>
        <PageSkeleton />
      </MasterDashboardLayout>
    );
  }

  return (
    <MasterDashboardLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/master/menu")}
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
                      category.menuCategoryCode || category.menuCategoryId
                    }
                    value={
                      (category.menuCategoryCode ||
                        category.menuCategoryId?.toString()) as string
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
                      Menu Master & Categories
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Price Strategy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Prices
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
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {getItemCategoryInfo(item).groupedByMaster.map((masterGroup) =>
                            masterGroup.categories.map((category) => (
                              <span
                                key={`${masterGroup.menuMasterCode}-${category.code}`}
                                className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium"
                              >
                                [{masterGroup.menuMasterName}: {category.name}]
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.isPrice === 0 ? (
                          <div className="flex items-center">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                              Price Disabled
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.priceStrategy === 1
                              ? "Base Price"
                              : item.priceStrategy === 3
                              ? "Open Price"
                              : "N/A"}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.isPrice === 0 ? (
                          <div className="flex items-center">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                              —
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm space-y-1">
                            {item.priceStrategy === 1 ? (
                              <>
                                {item.cardPrice !== null &&
                                  item.cardPrice !== undefined && (
                                    <div className="text-gray-900 dark:text-white">
                                      <span className="text-gray-600 dark:text-gray-400">
                                        Card:
                                      </span>{" "}
                                      {formatPrice(item.cardPrice)}
                                    </div>
                                  )}
                                {item.cashPrice !== null &&
                                  item.cashPrice !== undefined && (
                                    <div className="text-gray-900 dark:text-white">
                                      <span className="text-gray-600 dark:text-gray-400">
                                        Cash:
                                      </span>{" "}
                                      {formatPrice(item.cashPrice)}
                                    </div>
                                  )}
                                {(!item.cardPrice || !item.cashPrice) &&
                                  (item.basePrice || item.price) && (
                                    <div className="text-gray-900 dark:text-white">
                                      {formatPrice(
                                        (item.basePrice ?? item.price) as number
                                      )}
                                    </div>
                                  )}
                              </>
                            ) : item.priceStrategy === 3 ? (
                              <div className="text-gray-500 dark:text-gray-400 italic">
                                Open Price
                              </div>
                            ) : (
                              <div className="text-gray-900 dark:text-white">
                                {formatPrice(
                                  (item.basePrice ?? item.price ?? 0) as number
                                )}
                              </div>
                            )}
                          </div>
                        )}
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
                            onClick={() => handleClone(item)}
                            className="p-1 text-purple-500 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors duration-200"
                            title="Clone menu item"
                          >
                            <DocumentDuplicateIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(
                                item.menuItemId ||
                                  item.tblMenuItemId?.toString() ||
                                  ""
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
                    className="border-2 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-700"
                    style={{
                      borderColor: item.colorCode || "#E5E7EB",
                    }}
                  >
                    {/* Image Display */}
                    <div className="mb-3">
                      {item.menuImg ? (
                        <img
                          src={item.menuImg}
                          alt={item.name}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-24 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                          <div className="text-center text-gray-400 dark:text-gray-500">
                            <svg
                              className="w-8 h-8 mx-auto mb-1"
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
                            <p className="text-xs">No Image</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {item.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          item.isActive === 1
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                        }`}
                      >
                        {item.isActive === 1 ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Menu Master and Categories - Simple Format */}
                    <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <p>
                        <strong>Menu Master & Category:</strong>{" "}
                        <span className="text-gray-900 dark:text-white">
                          {getItemCategoryInfo(item).groupedByMaster.map((masterGroup) =>
                            masterGroup.categories.map((category) => (
                              <span
                                key={`${masterGroup.menuMasterCode}-${category.code}`}
                                className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium mr-1.5"
                              >
                                [{masterGroup.menuMasterName}: {category.name}]
                              </span>
                            ))
                          )}
                        </span>
                      </p>
                      <p>
                        <strong>Label:</strong> {item.labelName}
                      </p>
                      {item.isPrice === 0 ? (
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            <svg
                              className="w-4 h-4 inline-block mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                            Price Disabled
                          </span>
                        </div>
                      ) : (
                        <>
                          <div>
                            <strong>Price Strategy:</strong>{" "}
                            {item.priceStrategy === 1
                              ? "Base Price"
                              : item.priceStrategy === 3
                              ? "Open Price"
                              : "N/A"}
                          </div>
                          {item.priceStrategy === 1 ? (
                            <div className="space-y-1">
                              {item.cardPrice !== null &&
                                item.cardPrice !== undefined && (
                                  <p>
                                    <strong>Card Price:</strong>{" "}
                                    {formatPrice(item.cardPrice)}
                                  </p>
                                )}
                              {item.cashPrice !== null &&
                                item.cashPrice !== undefined && (
                                  <p>
                                    <strong>Cash Price:</strong>{" "}
                                    {formatPrice(item.cashPrice)}
                                  </p>
                                )}
                              {(!item.cardPrice || !item.cashPrice) &&
                                (item.basePrice || item.price) && (
                                  <p>
                                    <strong>Price:</strong>{" "}
                                    {formatPrice(
                                      (item.basePrice ?? item.price) as number
                                    )}
                                  </p>
                                )}
                            </div>
                          ) : item.priceStrategy === 3 ? (
                            <p className="text-gray-500 dark:text-gray-400 italic">
                              Open Price
                            </p>
                          ) : (
                            <p>
                              <strong>Price:</strong>{" "}
                              {formatPrice(
                                (item.basePrice ?? item.price ?? 0) as number
                              )}
                            </p>
                          )}
                        </>
                      )}
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

                                  <div className="flex justify-end space-x-1.5 mt-3">
                                    <button
                                      onClick={() => handleEdit(item)}
                                      className="p-1 text-blue-500 hover:text-blue-700 transition-colors duration-200"
                                      title="Edit menu item"
                                    >
                                      <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleClone(item)}
                                      className="p-1 text-purple-500 hover:text-purple-700 transition-colors duration-200"
                                      title="Clone menu item"
                                    >
                                      <DocumentDuplicateIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDelete(
                                          item.menuItemId ||
                                            item.tblMenuItemId?.toString() ||
                                            ""
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
    </MasterDashboardLayout>
  );
}

