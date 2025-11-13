"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import SystemColorPicker, {
  getPrimaryColor,
} from "@/components/ui/SystemColorPicker";
import ModifierSelectionModal from "@/components/modals/ModifierSelectionModal";
import { LoadingOverlay } from "@/components/ui/SkeletonLoader";
import { CheckIcon } from "@heroicons/react/24/solid";

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
    colorCode: getPrimaryColor(),
    calories: "",
    description: "",
    itemSize: "",
    skuPlu: "",
    itemContainAlcohol: 0,
    menuImg: "",
    priceStrategy: 1, // 1=Base Price, 3=Open Price
    basePrice: 0,
    cardPrice: 0,
    cashPrice: 0,
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
    dimension: "",
    weight: "",
    prepTimeMinutes: 0,
  });

  const [modifiers, setModifiers] = useState<any[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([]);
  const [modifierOptions, setModifierOptions] = useState<
    Record<
      number,
      {
        isRequired: number;
        isMultiselect: number;
        minSelection: number | null;
        maxSelection: number | null;
      }
    >
  >({});

  const handleRemoveModifier = (modifierId: number) => {
    setSelectedModifiers((prev) => prev.filter((id) => id !== modifierId));
    setModifierOptions((prev) => {
      const next = { ...prev } as any;
      delete next[modifierId];
      return next;
    });
  };
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [inheritModifiers, setInheritModifiers] = useState(true);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [inheritedModifiers, setInheritedModifiers] = useState<any[]>([]);
  const [prepZones, setPrepZones] = useState<any[]>([]);
  const [selectedPrepZones, setSelectedPrepZones] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetchModifiers();
    fetchTaxes();
    fetchPrepZones();
  }, []);

  useEffect(() => {
    if (menuItem) {
      setFormData({
        name: menuItem.name || "",
        kitchenName: menuItem.kitchenName || "",
        labelName: menuItem.labelName || "",
        colorCode: menuItem.colorCode || getPrimaryColor(),
        calories: menuItem.calories || "",
        description: menuItem.description || menuItem.descrip || "",
        itemSize: menuItem.itemSize || "",
        skuPlu: menuItem.skuPlu?.toString() || "",
        itemContainAlcohol:
          menuItem.itemContainAlcohol ?? menuItem.isAlcohol ?? 0,
        menuImg: menuItem.menuImg || "",
        priceStrategy: menuItem.priceStrategy || 1,
        basePrice: menuItem.basePrice ?? menuItem.price ?? 0,
        cardPrice:
          menuItem.cardPrice !== null && menuItem.cardPrice !== undefined
            ? parseFloat(menuItem.cardPrice.toString())
            : menuItem.priceStrategy === 3
            ? 0
            : menuItem.basePrice ?? menuItem.price ?? 0,
        cashPrice:
          menuItem.cashPrice !== null && menuItem.cashPrice !== undefined
            ? parseFloat(menuItem.cashPrice.toString())
            : menuItem.priceStrategy === 3
            ? 0
            : menuItem.basePrice ?? menuItem.price ?? 0,
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
        dimension: menuItem.dimension || "",
        weight: menuItem.weight || "",
        prepTimeMinutes: menuItem.prepTimeMinutes ?? 0,
      });

      // Parse prepZoneCode from JSON if it exists
      let prepZoneCodes: string[] = [];
      if (menuItem.prepZoneCode) {
        try {
          if (typeof menuItem.prepZoneCode === "string") {
            // Try to parse if it's a JSON string
            prepZoneCodes = JSON.parse(menuItem.prepZoneCode);
          } else if (Array.isArray(menuItem.prepZoneCode)) {
            // Already an array
            prepZoneCodes = menuItem.prepZoneCode;
          }
        } catch (e) {
          // If parsing fails, treat as single value (backward compatibility)
          prepZoneCodes = [menuItem.prepZoneCode];
        }
      }
      setSelectedPrepZones(new Set(prepZoneCodes));

      // Set selected modifiers if editing (ONLY explicit rows: inherit_from_menu_group = 0)
      if (
        menuItem.assignedModifiers &&
        Array.isArray(menuItem.assignedModifiers)
      ) {
        const explicitIds = menuItem.assignedModifiers
          .filter(
            (modifier: any) => Number(modifier.inheritFromMenuGroup) === 0
          )
          .map((modifier: any) => modifier.tblModifierId || modifier.id)
          .filter(Boolean);
        setSelectedModifiers(explicitIds);
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

  // Load inherited modifiers list when inheritance is enabled
  useEffect(() => {
    const load = async () => {
      try {
        if (!inheritModifiers || !formData.menuCategoryCode) {
          setInheritedModifiers([]);
          return;
        }
        const res = await fetch(
          `/api/modifier-groups?menuCategoryCode=${encodeURIComponent(
            formData.menuCategoryCode
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          setInheritedModifiers(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Error loading inherited modifiers", e);
      }
    };
    load();
  }, [inheritModifiers, formData.menuCategoryCode]);

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

  const fetchPrepZones = async () => {
    try {
      const res = await fetch("/api/menu/prep-zone");
      if (res.ok) {
        const data = await res.json();
        setPrepZones(data);
      }
    } catch (e) {
      console.error("Error fetching prep zones", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        skuPlu: formData.skuPlu ? formData.skuPlu : null,
        priceStrategy: formData.priceStrategy
          ? parseInt(formData.priceStrategy.toString())
          : null,
        // Card and Cash prices
        cardPrice:
          formData.priceStrategy === 1
            ? formData.cardPrice
              ? parseFloat(formData.cardPrice.toString())
              : null
            : formData.priceStrategy === 3
            ? 0
            : null,
        cashPrice:
          formData.priceStrategy === 1
            ? formData.cashPrice
              ? parseFloat(formData.cashPrice.toString())
              : null
            : formData.priceStrategy === 3
            ? 0
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
        modifierAssignments: selectedModifiers.map((id) => ({
          modifierId: id,
          ...(modifierOptions[id] || {
            isRequired: 0,
            isMultiselect: 0,
            minSelection: null,
            maxSelection: null,
          }),
        })),
        inheritModifiers,
        // Prep time fields
        prepZoneCodes:
          Array.from(selectedPrepZones).length > 0
            ? Array.from(selectedPrepZones)
            : null,
        dimension: formData.dimension || null,
        weight: formData.weight || null,
        prepTimeMinutes: formData.prepTimeMinutes
          ? parseInt(formData.prepTimeMinutes.toString())
          : null,
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
    setModifierOptions((prev) => {
      const next = { ...prev } as any;
      if (!(modifierId in next)) {
        next[modifierId] = {
          isRequired: 0,
          isMultiselect: 0,
          minSelection: null,
          maxSelection: null,
        };
      }
      return next;
    });
  };

  const handleModifierModalConfirm = (selectedIds: number[]) => {
    setSelectedModifiers(selectedIds);
    setModifierOptions((prev) => {
      const next = { ...prev } as any;
      for (const id of selectedIds) {
        if (!(id in next))
          next[id] = {
            isRequired: 0,
            isMultiselect: 0,
            minSelection: null,
            maxSelection: null,
          };
      }
      return next;
    });
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

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => {
                        const categoryValue =
                          category.menuCategoryCode ||
                          category.tblMenuCategoryId?.toString() ||
                          "";
                        return (
                          <button
                            key={
                              category.menuCategoryCode ||
                              category.tblMenuCategoryId
                            }
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                menuCategoryCode: categoryValue,
                              })
                            }
                            className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                              formData.menuCategoryCode === categoryValue
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                            }`}
                          >
                            {category.name}
                            {formData.menuCategoryCode === categoryValue && (
                              <CheckIcon className="w-4 h-4 inline-block ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <SystemColorPicker
                  label="Color Code"
                  value={formData.colorCode}
                  onChange={(color: string) =>
                    setFormData({ ...formData, colorCode: color })
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

          {/* Prep Zone & Prep Time Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Prep-Zone & Prep Time
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select a prep-zone and configure prep-time details for this menu
                item
              </p>
            </div>

            <div className="space-y-6">
              {/* Prep Zone Selection */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Prep Zones
                  </label>
                  {prepZones.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPrepZones.size === prepZones.length) {
                          setSelectedPrepZones(new Set());
                        } else {
                          const allCodes = new Set(
                            prepZones.map((z) => z.prepZoneCode).filter(Boolean)
                          );
                          setSelectedPrepZones(allCodes);
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-3 py-1 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      {selectedPrepZones.size === prepZones.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Select one or more prep zones for this menu item
                </p>
                {prepZones.length === 0 ? (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No prep zones available
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                    <div className="max-h-64 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:dark:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 [&::-webkit-scrollbar-thumb]:dark:hover:bg-gray-500">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {prepZones.map((prepZone) => {
                          const prepZoneValue = prepZone.prepZoneCode || "";
                          const isSelected =
                            selectedPrepZones.has(prepZoneValue);
                          return (
                            <button
                              key={prepZone.prepZoneCode || prepZone.prepZoneId}
                              type="button"
                              onClick={() => {
                                const updated = new Set(selectedPrepZones);
                                if (updated.has(prepZoneValue)) {
                                  updated.delete(prepZoneValue);
                                } else {
                                  updated.add(prepZoneValue);
                                }
                                setSelectedPrepZones(updated);
                              }}
                              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
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
                                      prepZone.prepZoneName || prepZoneValue
                                    }
                                  >
                                    {prepZone.prepZoneName || prepZoneValue}
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

              {/* Prep Time Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prep Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.prepTimeMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        prepTimeMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dimension
                  </label>
                  <input
                    type="text"
                    value={formData.dimension}
                    onChange={(e) =>
                      setFormData({ ...formData, dimension: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter dimension"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Weight
                  </label>
                  <input
                    type="text"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter weight"
                  />
                </div>
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
                Set pricing strategy and prices
              </p>
            </div>

            <div className="space-y-6">
              {/* Price Strategy Selection - Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Price Strategy *
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        priceStrategy: 1,
                        // Keep existing prices when switching to Base Price
                      });
                    }}
                    className={`relative px-6 py-3 rounded-lg border-2 transition-all font-medium ${
                      formData.priceStrategy === 1
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                  >
                    Base Price
                    {formData.priceStrategy === 1 && (
                      <CheckIcon className="w-5 h-5 inline-block ml-2" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        priceStrategy: 3,
                        cardPrice: 0,
                        cashPrice: 0,
                      });
                    }}
                    className={`relative px-6 py-3 rounded-lg border-2 transition-all font-medium ${
                      formData.priceStrategy === 3
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                  >
                    Open Price
                    {formData.priceStrategy === 3 && (
                      <CheckIcon className="w-5 h-5 inline-block ml-2" />
                    )}
                  </button>
                </div>
              </div>

              {/* Conditional Price Inputs */}
              {formData.priceStrategy === 1 ? (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Base Price Configuration
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Card Price *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cardPrice || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cardPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cash Price *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cashPrice || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cashPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    * At least one price (Card or Cash) must be provided
                  </p>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Open Price Strategy
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        This item uses open pricing. Prices will be set at the
                        point of sale. Card Price and Cash Price are set to 0.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Card Price (Read-only)
                      </label>
                      <input
                        type="number"
                        value="0.00"
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cash Price (Read-only)
                      </label>
                      <input
                        type="number"
                        value="0.00"
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}
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
                    Select Tax
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, taxCode: "" })}
                      className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.taxCode === ""
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                    >
                      None
                      {formData.taxCode === "" && (
                        <CheckIcon className="w-4 h-4 inline-block ml-2" />
                      )}
                    </button>
                    {taxes.map((t) => (
                      <button
                        key={t.taxCode}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, taxCode: t.taxCode })
                        }
                        className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                          formData.taxCode === t.taxCode
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                      >
                        {t.taxname}
                        {formData.taxCode === t.taxCode && (
                          <CheckIcon className="w-4 h-4 inline-block ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
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
                <div className="flex flex-wrap gap-2">
                  {["No Effect", "Add", "Subtract"].map((effect) => (
                    <button
                      key={effect}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          diningTaxEffect: effect,
                        })
                      }
                      className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.diningTaxEffect === effect
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                    >
                      {effect}
                      {formData.diningTaxEffect === effect && (
                        <CheckIcon className="w-4 h-4 inline-block ml-2" />
                      )}
                    </button>
                  ))}
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
                  Supported formats: JPG, PNG (Max size: 1MB)
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

          {/* Modifiers Section */}
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Modifiers
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select modifiers that customers can choose for this menu item
              </p>
            </div>

            <div className="space-y-6">
              {/* Item-level modifier groups */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Item-level modifiers
                </h4>
                {selectedModifiers.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">
                      No modifiers selected
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Click "Add modifiers " to select modifiers for this item
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-gray-200 dark:border-gray-600 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Modifier Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Required?
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Multi-select?
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Min # selections
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Max # selections
                          </th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {(() => {
                          const inheritedCodes = new Set(
                            (inheritedModifiers || [])
                              .map((m: any) => m.modifierGroupCode)
                              .filter(Boolean)
                          );
                          return selectedModifiers
                            .filter((modifierId) => {
                              const modifier = modifiers.find(
                                (m) =>
                                  m.id === modifierId ||
                                  m.tblModifierId === modifierId
                              );
                              return (
                                modifier &&
                                !inheritedCodes.has(modifier.modifierGroupCode)
                              );
                            })
                            .map((modifierId) => {
                              const modifier = modifiers.find(
                                (m) =>
                                  m.id === modifierId ||
                                  m.tblModifierId === modifierId
                              );
                              if (!modifier) return null;
                              const opts = modifierOptions[modifierId] || {
                                isRequired: 0,
                                isMultiselect: 0,
                                minSelection: null,
                                maxSelection: null,
                              };
                              const multi = opts.isMultiselect === 1;
                              return (
                                <tr key={modifierId}>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {modifier.name}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <select
                                      value={(opts.isRequired ?? 0).toString()}
                                      onChange={(e) =>
                                        setModifierOptions((prev) => ({
                                          ...prev,
                                          [modifierId]: {
                                            ...(prev[modifierId] || opts),
                                            isRequired: parseInt(
                                              e.target.value
                                            ),
                                          },
                                        }))
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                      <option value="0">Optional</option>
                                      <option value="2">
                                        Optional - Force Show
                                      </option>
                                      <option value="1">Required</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={multi}
                                      onChange={(e) =>
                                        setModifierOptions((prev) => ({
                                          ...prev,
                                          [modifierId]: {
                                            ...(prev[modifierId] || opts),
                                            isMultiselect: e.target.checked
                                              ? 1
                                              : 0,
                                          },
                                        }))
                                      }
                                      className="h-4 w-4 text-blue-600"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    {multi ? (
                                      <input
                                        type="number"
                                        min={0}
                                        value={opts.minSelection ?? ""}
                                        onChange={(e) =>
                                          setModifierOptions((prev) => ({
                                            ...prev,
                                            [modifierId]: {
                                              ...(prev[modifierId] || opts),
                                              minSelection:
                                                e.target.value === ""
                                                  ? null
                                                  : parseInt(e.target.value),
                                            },
                                          }))
                                        }
                                        className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                      />
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-500">
                                        n/a
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {multi ? (
                                      <input
                                        type="number"
                                        min={0}
                                        value={opts.maxSelection ?? ""}
                                        onChange={(e) =>
                                          setModifierOptions((prev) => ({
                                            ...prev,
                                            [modifierId]: {
                                              ...(prev[modifierId] || opts),
                                              maxSelection:
                                                e.target.value === ""
                                                  ? null
                                                  : parseInt(e.target.value),
                                            },
                                          }))
                                        }
                                        className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                      />
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-500">
                                        n/a
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm font-medium">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveModifier(modifierId)
                                      }
                                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                      aria-label="Remove modifier group"
                                    >
                                      <span aria-hidden>×</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                        })()}
                      </tbody>
                    </table>
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
                  Add modifiers
                </button>
              </div>

              {/* Inheritance section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Inherit modifiers?
                </h4>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInheritModifiers(true)}
                    className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                      inheritModifiers
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                  >
                    Yes, inherit modifiers set at the menu category-level.
                    {inheritModifiers && (
                      <CheckIcon className="w-4 h-4 inline-block ml-2" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setInheritModifiers(false)}
                    className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                      !inheritModifiers
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                  >
                    No
                    {!inheritModifiers && (
                      <CheckIcon className="w-4 h-4 inline-block ml-2" />
                    )}
                  </button>
                </div>

                {inheritModifiers && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      This menu item will automatically inherit modifiers from
                      its menu category:
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

                {inheritModifiers && (
                  <div className="mt-4">
                    <div className="overflow-hidden border border-gray-200 dark:border-gray-600 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Modifier Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Required?
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Multi-select?
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Min # selections
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Max # selections
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {inheritedModifiers.length === 0 && (
                            <tr>
                              <td
                                className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
                                colSpan={5}
                              >
                                No modifiers inherited from category.
                              </td>
                            </tr>
                          )}
                          {inheritedModifiers.map((m: any) => (
                            <tr key={m.id || m.modifierGroupCode}>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {m.groupName ||
                                  m.labelName ||
                                  m.modifierGroupCode}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400">
                                n/a
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400">
                                n/a
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400">
                                n/a
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400">
                                n/a
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
