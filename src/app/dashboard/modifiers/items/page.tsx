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

interface ModifierItem {
  tblModifierItemId: number;
  tblModifierId: number;
  name: string;
  labelName: string;
  colorCode?: string;
  price: number;
  modifier?: {
    tblModifierId: number;
    name: string;
    labelName: string;
  };
}

interface Modifier {
  tblModifierId: number;
  name: string;
  labelName: string;
}

function ModifierItemForm({
  modifierItem,
  modifiers,
  onSave,
  onCancel,
}: {
  modifierItem?: ModifierItem | null;
  modifiers: Modifier[];
  onSave: (data: ModifierItem) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: modifierItem?.name || "",
    labelName: modifierItem?.labelName || "",
    colorCode: modifierItem?.colorCode || "#3B82F6",
    price: modifierItem?.price || 0,
    tblModifierId: modifierItem?.tblModifierId || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error("Name is required");
      }
      if (!formData.labelName.trim()) {
        throw new Error("Label name is required");
      }
      if (!formData.tblModifierId) {
        throw new Error("Please select a modifier");
      }
      if (formData.price < 0) {
        throw new Error("Price must be a positive number");
      }
      const url = modifierItem
        ? `/api/menu/modifier-items/${modifierItem.tblModifierItemId}`
        : "/api/menu/modifier-items";

      const method = modifierItem ? "PUT" : "POST";

      // Ensure proper data types are sent
      const submitData = {
        ...formData,
        price: parseFloat(formData.price.toString()),
        tblModifierId: parseInt(formData.tblModifierId.toString()),
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          modifierItem
            ? "Modifier item updated successfully!"
            : "Modifier item created successfully!"
        );
        onSave(result);
      } else {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error || "Failed to save modifier item");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error saving modifier item"
      );
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter item name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label Name *
          </label>
          <input
            type="text"
            required
            value={formData.labelName}
            onChange={(e) =>
              setFormData({ ...formData, labelName: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter display label"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Modifier *
          </label>
          <select
            required
            value={formData.tblModifierId}
            onChange={(e) =>
              setFormData({ ...formData, tblModifierId: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Modifier</option>
            {modifiers.map((modifier) => (
              <option
                key={modifier.tblModifierId}
                value={modifier.tblModifierId}
              >
                {modifier.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Color Code
        </label>
        <input
          type="color"
          value={formData.colorCode}
          onChange={(e) =>
            setFormData({ ...formData, colorCode: e.target.value })
          }
          className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "Saving..." : modifierItem ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

export default function ModifierItemsPage() {
  const [modifierItems, setModifierItems] = useState<ModifierItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ModifierItem[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModifier, setSelectedModifier] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ModifierItem | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters effect
  useEffect(() => {
    applyFilters();
  }, [modifierItems, searchTerm, selectedModifier, priceRange]);

  const applyFilters = () => {
    let filtered = [...modifierItems];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.labelName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by modifier
    if (selectedModifier) {
      filtered = filtered.filter(
        (item) => item.tblModifierId === parseInt(selectedModifier)
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

    setFilteredItems(filtered);
    setStats((prev) => ({ ...prev, total: filtered.length }));
  };

  const fetchData = async () => {
    try {
      const [itemsRes, modifiersRes] = await Promise.all([
        fetch("/api/menu/modifier-items"),
        fetch("/api/menu/modifiers"),
      ]);

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setModifierItems(itemsData);
      } else {
        console.error(
          "Failed to fetch modifier items:",
          itemsRes.status,
          itemsRes.statusText
        );
      }

      if (modifiersRes.ok) {
        const modifiersData = await modifiersRes.json();
        setModifiers(modifiersData);
      }
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

  const handleEdit = (item: ModifierItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSave = (savedItem: ModifierItem) => {
    if (editingItem) {
      setModifierItems(
        modifierItems.map((item) =>
          item.tblModifierItemId === savedItem.tblModifierItemId
            ? savedItem
            : item
        )
      );
    } else {
      setModifierItems([savedItem, ...modifierItems]);
    }
    setShowModal(false);
    setEditingItem(null);
    fetchData(); // Refresh data
  };

  const handleDelete = (itemId: number) => {
    setDeletingId(itemId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/menu/modifier-items/${deletingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setModifierItems(
          modifierItems.filter((item) => item.tblModifierItemId !== deletingId)
        );
        toast.success("Modifier item deleted successfully");
      } else {
        throw new Error("Failed to delete modifier item");
      }
    } catch (error) {
      toast.error("Error deleting modifier item");
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
              Modifier Items
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage specific modifier options and pricing
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Modifier Item
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search by Name
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter name or label..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modifier
              </label>
              <select
                value={selectedModifier}
                onChange={(e) => setSelectedModifier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Modifiers</option>
                {modifiers.map((modifier) => (
                  <option
                    key={modifier.tblModifierId}
                    value={modifier.tblModifierId}
                  >
                    {modifier.name}
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
                value={priceRange.max}
                onChange={(e) =>
                  setPriceRange({ ...priceRange, max: e.target.value })
                }
                placeholder="999.99"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedModifier("");
                setPriceRange({ min: "", max: "" });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">T</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Items</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-semibold">M</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Modifiers</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {modifiers.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">P</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Price</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {modifierItems.length > 0
                    ? formatPrice(
                        modifierItems.reduce(
                          (acc, item) => acc + item.price,
                          0
                        ) / modifierItems.length
                      )
                    : formatPrice(0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modifier Items List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Modifier Items List ({filteredItems.length})
            </h3>
          </div>
          <div className="p-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-2xl">🏷️</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No modifier items found
                </h3>
                <p className="text-gray-500 mb-4">
                  Get started by creating your first modifier item.
                </p>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Modifier Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <div
                    key={item.tblModifierItemId}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{
                            backgroundColor: item.colorCode || "#3B82F6",
                          }}
                        ></div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.name}
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>
                        <strong>Label:</strong> {item.labelName}
                      </p>
                      <p>
                        <strong>Modifier:</strong>{" "}
                        {item.modifier?.name || "N/A"}
                      </p>
                      <p>
                        <strong>Price:</strong> {formatPrice(item.price)}
                      </p>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        className="p-1 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        title="View modifier item details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1 text-blue-500 hover:text-blue-700 transition-colors duration-200"
                        title="Edit modifier item"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.tblModifierItemId)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200"
                        title="Delete modifier item"
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
        title={editingItem ? "Edit Modifier Item" : "Add New Modifier Item"}
        size="lg"
      >
        <ModifierItemForm
          modifierItem={editingItem}
          modifiers={modifiers}
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
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">
              Delete Modifier Item
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this modifier item? This action
                cannot be undone.
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
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
