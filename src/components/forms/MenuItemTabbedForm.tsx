"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import ColorCodeField from "@/components/ui/ColorCodeField";
import ModifierSelectionModal from "@/components/modals/ModifierSelectionModal";
import { LoadingOverlay } from "@/components/ui/SkeletonLoader";

interface MenuItemFormProps {
  menuItem?: any;
  categories: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function MenuItemTabbedForm({
  menuItem,
  categories,
  onSave,
  onCancel,
}: MenuItemFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    kitchenName: "",
    labelName: "",
    colorCode: "#3B82F6",
    calories: "",
    description: "",
    itemSize: "",
    skuPlu: "",
    itemContainAlcohol: 0,
    menuImg: "",
    priceStrategy: 1,
    basePrice: 0,
    isPrice: 1,
    menuCategoryCode: "",
    isActive: 1,
    stockinhand: "",
    taxCode: "",
    inheritTaxInclusion: true,
    isTaxIncluded: false,
    inheritDiningTax: true,
    diningTaxEffect: "No Effect",
    disqualifyDiningTaxExemption: false,
    isOutStock: 0,
    isPosVisible: 0,
    isKioskOrderPay: 0,
    isOnlineOrderByApp: 0,
    isOnlineOrdering: 0,
    isCustomerInvoice: 0,
  });

  const [modifiers, setModifiers] = useState<any[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [inheritModifiers, setInheritModifiers] = useState(true);
  const [taxes, setTaxes] = useState<any[]>([]);

  useEffect(() => {
    fetchModifiers();
    fetchTaxes();
  }, []);

  useEffect(() => {
    if (menuItem) {
      setFormData({
        name: menuItem.name || "",
        kitchenName: menuItem.kitchenName || "",
        labelName: menuItem.labelName || "",
        colorCode: menuItem.colorCode || "#3B82F6",
        calories: menuItem.calories || "",
        description: menuItem.description || menuItem.descrip || "",
        itemSize: menuItem.itemSize || "",
        skuPlu: menuItem.skuPlu?.toString() || "",
        itemContainAlcohol:
          menuItem.itemContainAlcohol ?? menuItem.isAlcohol ?? 0,
        menuImg: menuItem.menuImg || "",
        priceStrategy: menuItem.priceStrategy || 1,
        basePrice: menuItem.basePrice ?? menuItem.price ?? 0,
        isPrice: menuItem.isPrice ?? 1,
        menuCategoryCode: menuItem.menuCategoryCode || "",
        isActive: menuItem.isActive ?? 1,
        stockinhand: menuItem.stockinhand?.toString() || "",
        taxCode: menuItem.taxCode || "",
        inheritTaxInclusion:
          menuItem.inheritTaxInclusion !== undefined
            ? menuItem.inheritTaxInclusion
            : true,
        isTaxIncluded:
          menuItem.isTaxIncluded !== undefined ? menuItem.isTaxIncluded : false,
        inheritDiningTax:
          menuItem.inheritDiningTax !== undefined
            ? menuItem.inheritDiningTax
            : true,
        diningTaxEffect: menuItem.diningTaxEffect || "No Effect",
        disqualifyDiningTaxExemption:
          menuItem.disqualifyDiningTaxExemption !== undefined
            ? menuItem.disqualifyDiningTaxExemption
            : false,
        isOutStock: menuItem.isOutStock ?? 0,
        isPosVisible: menuItem.isPosVisible ?? 0,
        isKioskOrderPay: menuItem.isKioskOrderPay ?? 0,
        isOnlineOrderByApp: menuItem.isOnlineOrderByApp ?? 0,
        isOnlineOrdering: menuItem.isOnlineOrdering ?? 0,
        isCustomerInvoice: menuItem.isCustomerInvoice ?? 0,
      });

      // Set selected modifiers if editing (include ALL assigned modifiers for display)
      if (
        menuItem.assignedModifiers &&
        Array.isArray(menuItem.assignedModifiers)
      ) {
        // Include ALL modifiers for display (both inherited and explicit)
        const allModifierIds = menuItem.assignedModifiers
          .map((modifier: any) => modifier.tblModifierId || modifier.id)
          .filter(Boolean);
        setSelectedModifiers(allModifierIds);
      }

      // Set inherit modifiers flag from MenuItem.inheritModifiers
      if (menuItem.inheritModifiers !== undefined) {
        setInheritModifiers(menuItem.inheritModifiers);
      } else if (menuItem.inheritModifierGroup !== undefined) {
        // Fallback to inheritModifierGroup if inheritModifiers is not set
        setInheritModifiers(menuItem.inheritModifierGroup);
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

  const fetchTaxes = async () => {
    try {
      const res = await fetch("/api/tax");
      if (res.ok) {
        const data = await res.json();
        setTaxes(data);
      }
    } catch (e) {
      console.error("Error fetching taxes", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        skuPlu: formData.skuPlu ? formData.skuPlu : null,
        basePrice: formData.basePrice
          ? parseFloat(formData.basePrice.toString())
          : null,
        priceStrategy: formData.priceStrategy
          ? parseInt(formData.priceStrategy.toString())
          : null,
        menuCategoryCode: formData.menuCategoryCode || null,
        itemContainAlcohol: formData.itemContainAlcohol === 1 ? 1 : 0,
        isPrice: formData.isPrice === 1 ? 1 : 0,
        isActive: formData.isActive === 1 ? 1 : 0,
        stockinhand: formData.stockinhand
          ? parseFloat(formData.stockinhand.toString())
          : null,
        // New fields for modifier assignment
        selectedModifiers,
        inheritModifiers,
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

  const handleModifierModalConfirm = (selectedIds: number[]) => {
    setSelectedModifiers(selectedIds);
  };

  return (
    <LoadingOverlay isLoading={loading}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Basic Information
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Essential details about the menu item
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    Kitchen Name
                  </label>
                  <input
                    type="text"
                    value={formData.kitchenName}
                    onChange={(e) =>
                      setFormData({ ...formData, kitchenName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter kitchen name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Item Size
                  </label>
                  <input
                    type="text"
                    value={formData.itemSize}
                    onChange={(e) =>
                      setFormData({ ...formData, itemSize: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter item size"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.menuCategoryCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        menuCategoryCode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option
                        key={
                          category.menuCategoryCode ||
                          category.tblMenuCategoryId
                        }
                        value={
                          category.menuCategoryCode ||
                          category.tblMenuCategoryId
                        }
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <ColorCodeField
                  value={formData.colorCode}
                  onChange={(val) =>
                    setFormData({ ...formData, colorCode: val })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: "isActive", label: "Active" },
                  { key: "itemContainAlcohol", label: "Contains Alcohol" },
                  { key: "isOutStock", label: "Out of Stock" },
                  { key: "isPosVisible", label: "POS Visible" },
                  { key: "isKioskOrderPay", label: "Kiosk Order Pay" },
                  { key: "isOnlineOrderByApp", label: "Online Order by App" },
                  { key: "isOnlineOrdering", label: "Online Ordering" },
                  { key: "isCustomerInvoice", label: "Customer Invoice" },
                ].map((t) => (
                  <div
                    key={t.key}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t.label}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          [t.key]: (prev as any)[t.key] === 1 ? 0 : 1,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        (formData as any)[t.key] === 1
                          ? "bg-blue-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                      aria-pressed={(formData as any)[t.key] === 1}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          (formData as any)[t.key] === 1
                            ? "translate-x-5"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Pricing
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set pricing strategy and tax options
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Base Price *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.basePrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        basePrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Additional Information
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Description, nutritional info, and images
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Enter item description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Calories
                  </label>
                  <input
                    type="text"
                    value={formData.calories}
                    onChange={(e) =>
                      setFormData({ ...formData, calories: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter calories"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SKU/PLU
                  </label>
                  <input
                    type="text"
                    value={formData.skuPlu}
                    onChange={(e) =>
                      setFormData({ ...formData, skuPlu: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter SKU/PLU"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stock in Hand
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stockinhand}
                    onChange={(e) =>
                      setFormData({ ...formData, stockinhand: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter stock"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    const maxSize = 1 * 1024 * 1024;
                    if (file.size > maxSize) {
                      toast.error("Image size must be less than 1MB");
                      e.target.value = "";
                      setImageLoading(false);
                      return;
                    }

                    // Check file type
                    if (!file.type.startsWith("image/")) {
                      toast.error("Please select a valid image file");
                      e.target.value = "";
                      setImageLoading(false);
                      return;
                    }

                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result as string;
                      if (result.length > 1400000) {
                        toast.error(
                          "Image is too large. Please use a smaller image."
                        );
                        e.target.value = "";
                        setImageLoading(false);
                        return;
                      }

                      setFormData({ ...formData, menuImg: result });
                      setImageLoading(false);
                      toast.success("Image uploaded successfully!");
                    };

                    reader.onerror = () => {
                      toast.error("Error reading image file");
                      e.target.value = "";
                      setImageLoading(false);
                    };

                    reader.readAsDataURL(file);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/20 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Supported formats: JPG, PNG, GIF (Max size: 1MB)
                </p>
                {imageLoading && (
                  <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 mt-2">
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

          {/* Tax Configuration Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Tax Configuration
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure tax settings for this menu item
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tax Code
                  </label>
                  <select
                    value={formData.taxCode}
                    onChange={(e) =>
                      setFormData({ ...formData, taxCode: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Tax Code</option>
                    {taxes.map((t) => (
                      <option key={t.taxCode} value={t.taxCode}>
                        {t.taxname} ({t.taxCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: "inheritTaxInclusion",
                    label: "Inherit tax inclusion from category",
                  },
                  { key: "isTaxIncluded", label: "Tax is included in price" },
                  {
                    key: "inheritDiningTax",
                    label: "Inherit dining tax from category",
                  },
                  {
                    key: "disqualifyDiningTaxExemption",
                    label: "Disqualify dining tax exemption",
                  },
                ].map((t) => (
                  <div
                    key={t.key}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t.label}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          [t.key]: !(prev as any)[t.key],
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        (formData as any)[t.key]
                          ? "bg-blue-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                      aria-pressed={(formData as any)[t.key]}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          (formData as any)[t.key]
                            ? "translate-x-5"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dining Tax Effect
                </label>
                <select
                  value={formData.diningTaxEffect}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      diningTaxEffect: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="No Effect">No Effect</option>
                  <option value="Add">Add</option>
                  <option value="Subtract">Subtract</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modifiers Section */}
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Modifier Groups
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select modifier groups that customers can choose for this menu
                item
              </p>
            </div>

            <div className="space-y-6">
              {/* Item-level modifier groups */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Item-level modifier groups
                </h4>

                {selectedModifiers.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">
                      No modifier groups selected
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Click "Add modifier group" to select modifiers for this
                      item
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedModifiers.map((modifierId) => {
                      const modifier = modifiers.find(
                        (m) =>
                          m.id === modifierId || m.tblModifierId === modifierId
                      );
                      if (!modifier) {
                        return null;
                      }

                      return (
                        <div
                          key={modifierId}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        >
                          <div className="flex items-center">
                            <div
                              className="w-4 h-4 rounded-full mr-3"
                              style={{
                                backgroundColor:
                                  modifier.colorCode || "#3B82F6",
                              }}
                            ></div>
                            <div>
                              <h5 className="font-medium text-gray-900 dark:text-white">
                                {modifier.name}
                              </h5>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {modifier.labelName}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleModifierToggle(modifierId)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowModifierModal(true)}
                  className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Add modifier group
                </button>
              </div>

              {/* Inheritance section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Inherit modifier groups?
                </h4>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="inheritModifiers"
                      checked={inheritModifiers}
                      onChange={() => setInheritModifiers(true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Yes, inherit modifier groups set at the menu group-level.
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="inheritModifiers"
                      checked={!inheritModifiers}
                      onChange={() => setInheritModifiers(false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      No
                    </span>
                  </label>
                </div>

                {inheritModifiers && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      This menu item will automatically inherit modifier groups
                      from its category:
                      <span className="font-medium">
                        {" "}
                        {categories.find(
                          (c) =>
                            c.menuCategoryCode === formData.menuCategoryCode ||
                            c.tblMenuCategoryId?.toString() ===
                              formData.menuCategoryCode
                        )?.name || "Selected Category"}
                      </span>
                    </p>
                  </div>
                )}
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
              {loading ? "Saving..." : menuItem ? "Update" : "Create"}
            </button>
          </div>
        </form>

        {/* Modifier Selection Modal */}
        <ModifierSelectionModal
          isOpen={showModifierModal}
          onClose={() => setShowModifierModal(false)}
          onConfirm={handleModifierModalConfirm}
          selectedModifierIds={selectedModifiers}
          menuItemId={menuItem?.tblMenuItemId}
        />
      </div>
    </LoadingOverlay>
  );
}
