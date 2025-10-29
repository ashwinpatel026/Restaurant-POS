"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { LoadingOverlay } from "@/components/ui/SkeletonLoader";

interface ModifierItem {
  id?: string;
  tblModifierItemId?: number;
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

interface ModifierItemFormProps {
  modifierItem?: ModifierItem | null;
  modifiers: ModifierGroup[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function ModifierItemForm({
  modifierItem,
  modifiers,
  onSave,
  onCancel,
}: ModifierItemFormProps) {
  const [formData, setFormData] = useState({
    name: modifierItem?.name || "",
    labelName: modifierItem?.labelName || "",
    colorCode: modifierItem?.colorCode || "#3B82F6",
    price: modifierItem?.price || 0,
    modifierGroupCode: modifierItem?.modifierGroupCode || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        modifierGroupCode: formData.modifierGroupCode,
        name: formData.name,
        labelName: formData.labelName,
        colorCode: formData.colorCode,
        price: parseFloat(formData.price.toString()),
      };

      console.log("Submitting modifier item data:", submitData);
      await onSave(submitData);
    } catch (error) {
      console.error("Error submitting modifier item:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoadingOverlay isLoading={loading}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color Code
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.colorCode}
                    onChange={(e) =>
                      setFormData({ ...formData, colorCode: e.target.value })
                    }
                    className="h-10 w-20 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-700"
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
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
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
              {loading ? "Saving..." : modifierItem ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </LoadingOverlay>
  );
}
