"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import SystemColorPicker, {
  getPrimaryColor,
} from "@/components/ui/SystemColorPicker";
import { CheckIcon } from "@heroicons/react/24/solid";

interface MenuMaster {
  menuMasterId: string;
  name: string;
}

interface ModifierGroup {
  id: string;
  modifierGroupCode: string | null;
  groupName: string | null;
  labelName: string | null;
}

export default function AddCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [menuMasters, setMenuMasters] = useState<MenuMaster[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [selectedModifierGroups, setSelectedModifierGroups] = useState<
    Set<string>
  >(new Set());
  const [formData, setFormData] = useState({
    name: "",
    colorCode: getPrimaryColor(),
    menuMasterId: "",
    isActive: 1,
  });

  useEffect(() => {
    // Set default color to primary color on mount
    setFormData((prev) => ({ ...prev, colorCode: getPrimaryColor() }));
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [mastersRes, modifierGroupsRes] = await Promise.all([
        fetch("/api/menu/masters"),
        fetch("/api/modifier-groups"),
      ]);

      if (mastersRes.ok) {
        const mastersData = await mastersRes.json();
        setMenuMasters(mastersData);
      }

      if (modifierGroupsRes.ok) {
        const modifierGroupsData = await modifierGroupsRes.json();
        setModifierGroups(modifierGroupsData);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    }
  };

  const handleModifierGroupToggle = (modifierGroupCode: string) => {
    const updated = new Set(selectedModifierGroups);
    if (updated.has(modifierGroupCode)) {
      updated.delete(modifierGroupCode);
    } else {
      updated.add(modifierGroupCode);
    }
    setSelectedModifierGroups(updated);
  };

  const handleSelectAll = () => {
    if (selectedModifierGroups.size === modifierGroups.length) {
      setSelectedModifierGroups(new Set());
    } else {
      const allCodes = new Set(
        modifierGroups
          .map((g) => g.modifierGroupCode)
          .filter((code): code is string => code !== null)
      );
      setSelectedModifierGroups(allCodes);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/menu/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          colorCode: formData.colorCode,
          menuMasterId: formData.menuMasterId,
          isActive: formData.isActive,
          modifierGroupCodes: Array.from(selectedModifierGroups),
        }),
      });

      if (response.ok) {
        toast.success("Category created successfully!");
        router.push("/dashboard/menu/categories");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create category");
      }
    } catch (error: any) {
      toast.error(error.message || "Error creating category");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

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
              Add Menu Category
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create a new menu category for your restaurant
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
                    <SystemColorPicker
                      label="Color Options"
                      value={formData.colorCode}
                      onChange={(color: string) =>
                        setFormData({ ...formData, colorCode: color })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Modifier Groups Selection */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Assign Modifiers (Optional)
                  </h3>
                  {/* {modifierGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-3 py-1 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      {selectedModifierGroups.size === modifierGroups.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  )} */}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Select modifiers that will be available for all items in this
                  category
                </p>
                {modifierGroups.length === 0 ? (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No modifiers available
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {modifierGroups.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-3 py-1 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        {selectedModifierGroups.size === modifierGroups.length
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    )}
                    {modifierGroups.map((group) => {
                      const code = group.modifierGroupCode;
                      if (!code) return null;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => handleModifierGroupToggle(code)}
                          className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                            selectedModifierGroups.has(code)
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                          }`}
                        >
                          {group.groupName || group.labelName || code}
                          {selectedModifierGroups.has(code) && (
                            <CheckIcon className="w-4 h-4 inline-block ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
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
                {loading ? "Creating..." : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
