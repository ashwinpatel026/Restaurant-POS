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
import StatusToggle from "@/components/forms/StatusToggle";

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
        fetch("/api/menu/masters", { cache: "no-store" }),
        fetch("/api/modifier-groups", { cache: "no-store" }),
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
    if (!formData.menuMasterId) {
      toast.error("Please select a menu master");
      return;
    }
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
        router.push(`/dashboard/menu/categories`);
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
                <div className="space-y-6">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Menu Master *
                    </label>
                    {menuMasters.length === 0 ? (
                      <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-sm text-gray-500 dark:text-gray-400">
                        No menu masters available. Please create a menu master
                        first.
                      </div>
                    ) : (
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                        <div className="max-h-48 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:dark:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 [&::-webkit-scrollbar-thumb]:dark:hover:bg-gray-500">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
                            {menuMasters.map((master) => {
                              const isSelected =
                                formData.menuMasterId === master.menuMasterId;
                              return (
                                <button
                                  key={master.menuMasterId}
                                  type="button"
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      menuMasterId: master.menuMasterId,
                                    })
                                  }
                                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`text-sm font-medium truncate ${
                                          isSelected
                                            ? "text-blue-700 dark:text-blue-300"
                                            : "text-gray-700 dark:text-gray-300"
                                        }`}
                                        title={master.name}
                                      >
                                        {master.name}
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <CheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
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

              {/* Modifiers Selection */}
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
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
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
                    </div>
                    <div className="max-h-64 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:dark:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 [&::-webkit-scrollbar-thumb]:dark:hover:bg-gray-500">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {modifierGroups.map((group) => {
                          const code = group.modifierGroupCode;
                          if (!code) return null;
                          const isSelected = selectedModifierGroups.has(code);
                          return (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => handleModifierGroupToggle(code)}
                              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm font-medium truncate ${
                                      isSelected
                                        ? "text-blue-700 dark:text-blue-300"
                                        : "text-gray-700 dark:text-gray-300"
                                    }`}
                                    title={
                                      group.groupName || group.labelName || code
                                    }
                                  >
                                    {group.groupName || group.labelName || code}
                                  </p>
                                </div>
                                {isSelected && (
                                  <CheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <StatusToggle
                label="Category Status"
                description="Toggle to control whether this category is active and visible across the POS."
                value={formData.isActive === 1}
                onChange={(val) =>
                  setFormData({ ...formData, isActive: val ? 1 : 0 })
                }
              />
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
