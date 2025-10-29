"use client";

import { useState, useEffect } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { LoadingOverlay } from "@/components/ui/SkeletonLoader";

interface ModifierGroupData {
  id?: string;
  modifierGroupCode?: string | null;
  groupName?: string | null;
  labelName?: string | null;
  isRequired: number;
  isMultiselect: number;
  minSelection?: number | null;
  maxSelection?: number | null;
  showDefaultTop: number;
  inheritFromMenuGroup: number;
  menuCategoryCode?: string | null;
  isActive: number;
}

interface Category {
  menuCategoryCode: string;
  name: string;
}

interface ModifierFormProps {
  modifier?: ModifierGroupData | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function ModifierForm({
  modifier,
  onSave,
  onCancel,
}: ModifierFormProps) {
  const [formData, setFormData] = useState({
    groupName: "",
    labelName: "",
    isRequired: 0,
    isMultiselect: 0,
    minSelection: "",
    maxSelection: "",
    showDefaultTop: 0,
    inheritFromMenuGroup: 0,
    menuCategoryCode: "",
    priceStrategy: 1,
    price: 0,
    isActive: 1,
  });

  const [modifierItems, setModifierItems] = useState([
    {
      name: "",
      labelName: "",
      colorCode: "#3B82F6",
      price: 0,
      isDefault: 0,
      displayOrder: 1,
      isActive: 1,
    },
    {
      name: "",
      labelName: "",
      colorCode: "#3B82F6",
      price: 0,
      isDefault: 0,
      displayOrder: 2,
      isActive: 1,
    },
  ]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  useEffect(() => {
    // Fetch categories on component mount
    fetchCategories();

    if (modifier) {
      setFormData({
        groupName: modifier.groupName || "",
        labelName: modifier.labelName || "",
        isRequired: modifier.isRequired ?? 0,
        isMultiselect: modifier.isMultiselect ?? 0,
        minSelection:
          modifier.minSelection != null ? String(modifier.minSelection) : "",
        maxSelection:
          modifier.maxSelection != null ? String(modifier.maxSelection) : "",
        showDefaultTop: modifier.showDefaultTop ?? 0,
        inheritFromMenuGroup: modifier.inheritFromMenuGroup ?? 0,
        menuCategoryCode: modifier.menuCategoryCode || "",
        priceStrategy: (modifier as any).priceStrategy ?? 1,
        price: (modifier as any).price ?? 0,
        isActive: modifier.isActive ?? 1,
      });
      // Load items if provided in modifier data
      if ((modifier as any).items && Array.isArray((modifier as any).items)) {
        const loadedItems = (modifier as any).items.map((item: any) => ({
          name: item.name || "",
          labelName: item.labelName || "",
          colorCode: item.colorCode || "#3B82F6",
          price: typeof item.price === "number" ? item.price : 0,
          isDefault: item.isDefault || 0,
          displayOrder:
            typeof item.displayOrder === "number" ? item.displayOrder : 1,
          isActive: item.isActive ?? 1,
        }));
        setModifierItems(
          loadedItems.length > 0
            ? loadedItems
            : [
                {
                  name: "",
                  labelName: "",
                  colorCode: "#3B82F6",
                  price: 0,
                  isDefault: 0,
                  displayOrder: 1,
                  isActive: 1,
                },
              ]
        );
      }
    } else {
      // Reset to default 2 empty rows for new modifier
      setModifierItems([
        {
          name: "",
          labelName: "",
          colorCode: "#3B82F6",
          price: 0,
          isDefault: 0,
          displayOrder: 1,
          isActive: 1,
        },
        {
          name: "",
          labelName: "",
          colorCode: "#3B82F6",
          price: 0,
          isDefault: 0,
          displayOrder: 2,
          isActive: 1,
        },
      ]);
    }
  }, [modifier]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/menu/categories");
      if (response.ok) {
        const categoriesData = await response.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Removed legacy fetchModifierItems; items are created alongside group on save for add flow

  const addModifierItem = () => {
    setModifierItems([
      ...modifierItems,
      {
        name: "",
        labelName: "",
        colorCode: "#3B82F6",
        price: 0,
        isDefault: 0,
        displayOrder: modifierItems.length + 1,
        isActive: 1,
      },
    ]);
  };

  const updateModifierItem = (index: number, field: string, value: any) => {
    const updated = [...modifierItems];
    updated[index] = { ...updated[index], [field]: value };
    setModifierItems(updated);
  };

  const removeModifierItem = (index: number) => {
    if (modifierItems.length > 1) {
      setShowConfirmModal(true);
      setDeletingIndex(index);
    }
  };

  const confirmRemoveModifierItem = () => {
    if (deletingIndex !== null && modifierItems.length > 1) {
      const updated = modifierItems.filter((_, i) => i !== deletingIndex);
      setModifierItems(updated);
    }
    setShowConfirmModal(false);
    setDeletingIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        groupName: formData.groupName,
        labelName: formData.labelName,
        isRequired: parseInt(String(formData.isRequired)),
        isMultiselect: parseInt(String(formData.isMultiselect)),
        minSelection: formData.minSelection
          ? parseInt(String(formData.minSelection))
          : null,
        maxSelection: formData.maxSelection
          ? parseInt(String(formData.maxSelection))
          : null,
        showDefaultTop: parseInt(String(formData.showDefaultTop)),
        inheritFromMenuGroup: parseInt(String(formData.inheritFromMenuGroup)),
        menuCategoryCode: formData.menuCategoryCode || null,
        priceStrategy: parseInt(String(formData.priceStrategy)),
        price:
          formData.priceStrategy === 3
            ? parseFloat(String(formData.price))
            : null,
        isActive: parseInt(String(formData.isActive)),
        modifierItems: modifierItems
          .filter((item) => item.name.trim() !== "")
          .map((item, idx) => ({
            name: item.name,
            labelName: item.labelName || null,
            colorCode: item.colorCode || null,
            price: typeof item.price === "number" ? item.price : null,
            isDefault: item.isDefault ? 1 : 0,
            displayOrder:
              typeof item.displayOrder === "number"
                ? item.displayOrder
                : idx + 1,
            isActive: typeof item.isActive === "number" ? item.isActive : 1,
          })),
      };

      console.log("Submitting modifier data:", submitData);
      await onSave(submitData);
    } catch (error) {
      console.error("Error submitting modifier:", error);
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
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Modifier Group Details Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Modifier Group Details
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Basic information about the modifier group
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Modifier Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.groupName}
                    onChange={(e) =>
                      setFormData({ ...formData, groupName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter modifier group name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    POS Name (Button Label)
                  </label>
                  <input
                    type="text"
                    value={formData.labelName}
                    onChange={(e) =>
                      setFormData({ ...formData, labelName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter button label"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Inherit to Category (by Code)
                  </label>
                  <select
                    value={formData.menuCategoryCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        menuCategoryCode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a category (optional)</option>
                    {categories.map((category) => (
                      <option
                        key={category.menuCategoryCode}
                        value={category.menuCategoryCode}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Assign this group to a category; items may inherit
                    accordingly.
                  </p>
                </div>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.showDefaultTop === 1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          showDefaultTop: e.target.checked ? 1 : 0,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Show Defaults on Top
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.inheritFromMenuGroup === 1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inheritFromMenuGroup: e.target.checked ? 1 : 0,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Inherit From Menu Group
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive === 1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isActive: e.target.checked ? 1 : 0,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Active
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Pricing Strategy
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How are modifiers in this group priced?
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.priceStrategy === 1
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                  onClick={() => setFormData({ ...formData, priceStrategy: 1 })}
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    No Charge
                  </h4>
                </div>

                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.priceStrategy === 2
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                  onClick={() => setFormData({ ...formData, priceStrategy: 2 })}
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Individual
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Each item has its own price.
                  </p>
                </div>

                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.priceStrategy === 3
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                  onClick={() => setFormData({ ...formData, priceStrategy: 3 })}
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Group
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    All items share the same price.
                  </p>
                </div>
              </div>

              {formData.priceStrategy === 3 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group Price
                  </label>
                  <input
                    type="number"
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
              )}
            </div>
          </div>

          {/* Advanced Settings Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Advanced Settings
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure selection requirements and behavior
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Required?
                  </label>
                  <select
                    value={formData.isRequired}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isRequired: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Optional</option>
                    <option value={1}>Required</option>
                    <option value={2}>Optional but Force Show</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selection Type
                  </label>
                  <select
                    value={formData.isMultiselect}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isMultiselect: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Single Select</option>
                    <option value={1}>Multi Select</option>
                  </select>
                </div>
              </div>

              {formData.isMultiselect === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Min Selection
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minSelection}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minSelection: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Selection
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxSelection}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxSelection: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modifier Items Section */}
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Modifier Items
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Define the individual options available in this modifier group
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-900 dark:text-white">
                  Items
                </h4>
                <button
                  type="button"
                  onClick={addModifierItem}
                  className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  + Add Item
                </button>
              </div>

              <div className="overflow-hidden border border-gray-200 dark:border-gray-600 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Label
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Color
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Default
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Active
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {modifierItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              updateModifierItem(index, "name", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter modifier name"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.labelName || ""}
                            onChange={(e) =>
                              updateModifierItem(
                                index,
                                "labelName",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter label"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={item.colorCode || "#3B82F6"}
                              onChange={(e) =>
                                updateModifierItem(
                                  index,
                                  "colorCode",
                                  e.target.value
                                )
                              }
                              className="h-10 w-16 border border-gray-300 dark:border-gray-600 rounded"
                            />
                            <input
                              type="text"
                              value={item.colorCode || "#3B82F6"}
                              onChange={(e) =>
                                updateModifierItem(
                                  index,
                                  "colorCode",
                                  e.target.value
                                )
                              }
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="#3B82F6"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <span className="text-gray-500 dark:text-gray-400 mr-2">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price}
                              onChange={(e) =>
                                updateModifierItem(
                                  index,
                                  "price",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              disabled={formData.priceStrategy !== 2}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                              placeholder="0.00"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={item.isDefault === 1}
                            onChange={(e) =>
                              updateModifierItem(
                                index,
                                "isDefault",
                                e.target.checked ? 1 : 0
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={1}
                            value={item.displayOrder || index + 1}
                            onChange={(e) =>
                              updateModifierItem(
                                index,
                                "displayOrder",
                                parseInt(e.target.value) || index + 1
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={item.isActive === 1}
                            onChange={(e) =>
                              updateModifierItem(
                                index,
                                "isActive",
                                e.target.checked ? 1 : 0
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          {modifierItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeModifierItem(index)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                              title="Delete modifier item"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              {loading ? "Saving..." : modifier ? "Update" : "Create"}
            </button>
          </div>
        </form>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
                  <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">
                  Delete Modifier Item
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete this modifier item? This
                    action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-center space-x-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmModal(false);
                      setDeletingIndex(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmRemoveModifierItem}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LoadingOverlay>
  );
}
