"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { FormSkeleton } from "@/components/ui/SkeletonLoader";

interface ModifierItem {
  id: string;
  modifierItemCode?: string;
  modifierGroupCode?: string;
  name: string;
  labelName: string;
  colorCode?: string;
  price: number;
  isDefault?: number;
  displayOrder?: number | null;
  isActive?: number;
}

interface ModifierGroup {
  id: string;
  modifierGroupCode?: string | null;
  groupName?: string | null;
}

export default function EditModifierItemPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [modifierItem, setModifierItem] = useState<ModifierItem | null>(null);
  const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    modifierGroupCode: "",
    name: "",
    labelName: "",
    colorCode: "#3B82F6",
    price: "",
    isDefault: 0,
    displayOrder: "",
    isActive: 1,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("master_admin_token");
      const [itemRes, groupsRes] = await Promise.all([
        fetch(`/api/master/modifier-items/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/master/modifier-groups", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (itemRes.ok) {
        const itemData = await itemRes.json();
        setModifierItem(itemData);
        setFormData({
          modifierGroupCode: itemData.modifierGroupCode || "",
          name: itemData.name || "",
          labelName: itemData.labelName || "",
          colorCode: itemData.colorCode || "#3B82F6",
          price: itemData.price ? String(itemData.price) : "",
          isDefault: itemData.isDefault ?? 0,
          displayOrder: itemData.displayOrder
            ? String(itemData.displayOrder)
            : "",
          isActive: itemData.isActive ?? 1,
        });
      } else {
        toast.error("Failed to fetch modifier item.");
        router.push("/master/modifiers/items");
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setModifiers(Array.isArray(groupsData) ? groupsData : []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error loading modifier item data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);

    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(`/api/master/modifier-items/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          modifierGroupCode: formData.modifierGroupCode || null,
          name: formData.name || null,
          labelName: formData.labelName || null,
          colorCode: formData.colorCode || null,
          price: formData.price ? parseFloat(formData.price) : null,
          isDefault: formData.isDefault,
          displayOrder: formData.displayOrder
            ? parseInt(formData.displayOrder)
            : null,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        toast.success("Modifier item updated successfully!");
        router.push("/master/modifiers/items");
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to update modifier item";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to update modifier item");
        }
      }
    } catch (error) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Error updating modifier item";
        toast.error(errorMessage);
      }
      console.error("Error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MasterDashboardLayout>
        <FormSkeleton />
      </MasterDashboardLayout>
    );
  }

  if (!modifierItem) {
    return (
      <MasterDashboardLayout>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Modifier item not found.
        </div>
      </MasterDashboardLayout>
    );
  }

  return (
    <MasterDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/master/modifiers/items")}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            <span className="text-lg font-medium">Back to Modifier Items</span>
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Edit Modifier Item: {modifierItem.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Update modifier item configuration and pricing.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6"
        >
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Basic Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Modifier Group *
              </label>
              <select
                required
                value={formData.modifierGroupCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    modifierGroupCode: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Modifier Group</option>
                {modifiers.map((group) => (
                  <option
                    key={group.id}
                    value={group.modifierGroupCode || ""}
                  >
                    {group.groupName || group.modifierGroupCode}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter item name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Label Name
                </label>
                <input
                  type="text"
                  value={formData.labelName}
                  onChange={(e) =>
                    setFormData({ ...formData, labelName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Display label"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color Code
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.colorCode}
                    onChange={(e) =>
                      setFormData({ ...formData, colorCode: e.target.value })
                    }
                    className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.colorCode}
                    onChange={(e) =>
                      setFormData({ ...formData, colorCode: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, displayOrder: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Options
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isDefault === 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isDefault: e.target.checked ? 1 : 0,
                      })
                    }
                    className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Default Selection
                  </span>
                </label>
              </div>

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
                    className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => router.push("/master/modifiers/items")}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Updating..." : "Update Modifier Item"}
            </button>
          </div>
        </form>
      </div>
    </MasterDashboardLayout>
  );
}

