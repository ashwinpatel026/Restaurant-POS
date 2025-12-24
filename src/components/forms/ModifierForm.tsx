"use client";

import { useState, useEffect } from "react";
import { TrashIcon, PencilIcon } from "@heroicons/react/24/outline";
import { LoadingOverlay } from "@/components/ui/SkeletonLoader";
import ModifierItemModal from "@/components/modifiers/ModifierItemModal";
import ToggleIndicator from "@/components/ui/ToggleIndicator";

// Helper function to normalize prefix array
const normalizePrefix = (value: unknown): string[] => {
  if (!value) return [];
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? value.split(",")
    : [];
  return values
    .map((v) => (typeof v === "string" ? v.trim() : String(v).trim()))
    .filter((v) => v);
};

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
  isActive: number;
  assignedCategories?: { code: string; name: string }[];
}

interface Category {
  menuCategoryCode: string;
  name: string;
}

interface ModifierItemState {
  id?: string;
  name: string;
  labelName: string;
  colorCode: string;
  forColorCode: string;
  price: number;
  isDefault: number;
  displayOrder: number;
  isActive: number;
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
    priceStrategy: 1,
    price: 0,
    isActive: 1,
    prefix: [] as string[],
  });

  const [modifierItems, setModifierItems] = useState<ModifierItemState[]>([]);
  const [removedItemIds, setRemovedItemIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [prefixInput, setPrefixInput] = useState("");
  const [allPrefixes, setAllPrefixes] = useState<string[]>([]);
  const [showPrefixSuggestions, setShowPrefixSuggestions] = useState(false);
  const [filteredPrefixSuggestions, setFilteredPrefixSuggestions] = useState<
    string[]
  >([]);

  useEffect(() => {
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
        priceStrategy: (modifier as any).priceStrategy ?? 1,
        price: (modifier as any).price ?? 0,
        isActive: modifier.isActive ?? 1,
        prefix: normalizePrefix((modifier as any).prefix),
      });
      setPrefixInput("");
      setRemovedItemIds([]);
      // Load items if provided in modifier data
      if ((modifier as any).items && Array.isArray((modifier as any).items)) {
        const loadedItems = (modifier as any).items.map((item: any) => ({
          id: item.id,
          name: item.name || "",
          labelName: item.labelName || "",
          colorCode: item.colorCode || "#3B82F6",
          forColorCode: item.forColorCode || "#FFFFFF",
          price:
            typeof item.price === "number"
              ? item.price
              : parseFloat(item.price) || 0,
          isDefault: item.isDefault || 0,
          displayOrder:
            typeof item.displayOrder === "number" ? item.displayOrder : 1,
          isActive: item.isActive ?? 1,
        }));
        setModifierItems(loadedItems);
      } else {
        setModifierItems([]);
      }
    } else {
      // Reset to empty for new modifier
      setModifierItems([]);
      setRemovedItemIds([]);
    }
  }, [modifier]);

  // Fetch all prefixes for suggestions
  useEffect(() => {
    const fetchAllPrefixes = async () => {
      try {
        const token = localStorage.getItem("master_admin_token");
        const isMaster = !!token;
        const url = isMaster
          ? "/api/master/modifier-groups"
          : "/api/dashboard/modifier-groups";
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (isMaster) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          cache: "no-store",
          headers,
        });
        if (response.ok) {
          const groups = await response.json();
          const allPrefixValues: string[] = [];

          groups.forEach((g: any) => {
            if (g.prefix) {
              const prefixes = normalizePrefix(g.prefix);
              allPrefixValues.push(...prefixes);
            }
          });

          // Remove duplicates and sort
          const uniquePrefixes = Array.from(new Set(allPrefixValues))
            .filter((p) => p && p.trim())
            .sort();

          setAllPrefixes(uniquePrefixes);
        }
      } catch (error) {
        console.error("Error fetching prefixes:", error);
      }
    };

    fetchAllPrefixes();
  }, []);

  // Filter prefix suggestions based on input
  useEffect(() => {
    if (prefixInput.trim()) {
      const filtered = allPrefixes.filter(
        (prefix) =>
          prefix.toLowerCase().includes(prefixInput.toLowerCase()) &&
          !formData.prefix.includes(prefix)
      );
      setFilteredPrefixSuggestions(filtered);
      setShowPrefixSuggestions(filtered.length > 0);
    } else {
      setShowPrefixSuggestions(false);
      setFilteredPrefixSuggestions([]);
    }
  }, [prefixInput, allPrefixes, formData.prefix]);

  // No longer fetching categories; assignments shown read-only from modifier.assignedCategories

  // Removed legacy fetchModifierItems; items are created alongside group on save for add flow

  const handleAddItem = () => {
    setEditingItemIndex(null);
    setIsModalOpen(true);
  };

  const handleEditItem = (index: number) => {
    setEditingItemIndex(index);
    setIsModalOpen(true);
  };

  const handleSaveItem = (item: ModifierItemState) => {
    if (editingItemIndex !== null && editingItemIndex >= 0) {
      // Update existing item
      const updated = [...modifierItems];
      updated[editingItemIndex] = item;
      setModifierItems(updated);
    } else {
      // Add new item
      setModifierItems([...modifierItems, item]);
    }
    setIsModalOpen(false);
    setEditingItemIndex(null);
  };

  const removeModifierItem = (index: number) => {
    if (index >= 0 && index < modifierItems.length) {
      setShowConfirmModal(true);
      setDeletingIndex(index);
    }
  };

  const confirmRemoveModifierItem = () => {
    if (
      deletingIndex !== null &&
      deletingIndex >= 0 &&
      deletingIndex < modifierItems.length
    ) {
      const itemToRemove = modifierItems[deletingIndex];
      if (itemToRemove?.id) {
        setRemovedItemIds((prev) =>
          prev.includes(itemToRemove.id!) ? prev : [...prev, itemToRemove.id!]
        );
      }
      const updated = modifierItems.filter((_, i) => i !== deletingIndex);
      setModifierItems(updated);
    }
    setShowConfirmModal(false);
    setDeletingIndex(null);
  };

  // Prefix handlers
  const handlePrefixAdd = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setFormData((prev) => {
      if (prev.prefix.includes(trimmed)) {
        return prev;
      }
      return {
        ...prev,
        prefix: [...prev.prefix, trimmed],
      };
    });
  };

  const handlePrefixRemove = (prefix: string) => {
    setFormData((prev) => ({
      ...prev,
      prefix: prev.prefix.filter((item) => item !== prefix),
    }));
  };

  const handlePrefixKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (prefixInput.trim()) {
        handlePrefixAdd(prefixInput);
        setPrefixInput("");
        setShowPrefixSuggestions(false);
      }
    } else if (e.key === "Backspace" && prefixInput === "") {
      setFormData((prev) => ({
        ...prev,
        prefix: prev.prefix.slice(0, Math.max(prev.prefix.length - 1, 0)),
      }));
    } else if (e.key === "Escape") {
      setShowPrefixSuggestions(false);
    }
  };

  const handlePrefixSuggestionClick = (suggestion: string) => {
    handlePrefixAdd(suggestion);
    setPrefixInput("");
    setShowPrefixSuggestions(false);
  };

  const handlePrefixInputFocus = () => {
    if (prefixInput.trim()) {
      const filtered = allPrefixes.filter(
        (prefix) =>
          prefix.toLowerCase().includes(prefixInput.toLowerCase()) &&
          !formData.prefix.includes(prefix)
      );
      setFilteredPrefixSuggestions(filtered);
      setShowPrefixSuggestions(filtered.length > 0);
    } else {
      const available = allPrefixes.filter(
        (prefix) => !formData.prefix.includes(prefix)
      );
      setFilteredPrefixSuggestions(available);
      setShowPrefixSuggestions(available.length > 0);
    }
  };

  const handlePrefixInputBlur = () => {
    setTimeout(() => {
      setShowPrefixSuggestions(false);
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        groupName: formData.groupName,
        labelName: formData.labelName,
        showDefaultTop: parseInt(String(formData.showDefaultTop)),
        inheritFromMenuGroup: parseInt(String(formData.inheritFromMenuGroup)),
        priceStrategy: parseInt(String(formData.priceStrategy)),
        price:
          formData.priceStrategy === 3
            ? parseFloat(String(formData.price))
            : null,
        isActive: parseInt(String(formData.isActive)),
        prefix: normalizePrefix(formData.prefix),
        modifierItems: modifierItems
          .filter((item) => item.name.trim() !== "")
          .map((item, idx) => ({
            id: item.id,
            name: item.name,
            labelName: item.labelName || null,
            colorCode: item.colorCode || null,
            forColorCode: item.forColorCode || null,
            price:
              formData.priceStrategy === 2
                ? typeof item.price === "number"
                  ? item.price
                  : parseFloat(String(item.price)) || 0
                : null,
            isDefault: item.isDefault ? 1 : 0,
            displayOrder:
              typeof item.displayOrder === "number"
                ? item.displayOrder
                : idx + 1,
            isActive: typeof item.isActive === "number" ? item.isActive : 1,
          })),
        removedItemIds,
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
                Modifiers Details
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Basic information about the modifiers
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Modifiers Name *
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
                {/* Assigned Categories (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assigned Categories
                  </label>
                  {modifier &&
                  (modifier as any).assignedCategories &&
                  (modifier as any).assignedCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(modifier as any).assignedCategories.map(
                        (c: any, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            title={c.code}
                          >
                            {c.name}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No categories assigned
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Managed in Menu Categories &rarr; assign via menu category
                    edit.
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prefix
                </label>
                <div className="relative">
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700">
                    {formData.prefix.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.prefix.map((prefix) => (
                          <span
                            key={prefix}
                            className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium px-2 py-1 rounded-full"
                          >
                            {prefix}
                            <button
                              type="button"
                              onClick={() => handlePrefixRemove(prefix)}
                              className="ml-1 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                              aria-label={`Remove ${prefix}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      value={prefixInput}
                      onChange={(e) => setPrefixInput(e.target.value)}
                      onKeyDown={handlePrefixKeyDown}
                      onFocus={handlePrefixInputFocus}
                      onBlur={handlePrefixInputBlur}
                      placeholder="Type a prefix and press Enter or select from suggestions"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Suggestions Dropdown */}
                  {showPrefixSuggestions &&
                    filteredPrefixSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredPrefixSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() =>
                              handlePrefixSuggestionClick(suggestion)
                            }
                            className="w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Press Enter or comma to add a prefix. Click suggestions to
                  select. Use the × icon to remove a prefix.
                </p>
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
                  Items{" "}
                  {modifierItems.length > 0 && `(${modifierItems.length})`}
                </h4>
                <button
                  type="button"
                  onClick={handleAddItem}
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
                    {modifierItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          No modifier items added yet. Click "+ Add Item" to
                          start.
                        </td>
                      </tr>
                    ) : (
                      modifierItems.map((item, index) => (
                        <tr key={item.id || index}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.name || "Unnamed Item"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {item.labelName || "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <button
                                type="button"
                                className="px-4 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg"
                                style={{
                                  backgroundColor: item.colorCode || "#3B82F6",
                                  color: item.forColorCode || "#FFFFFF",
                                }}
                                title={`Color: ${
                                  item.colorCode || "#3B82F6"
                                }, Text: ${item.forColorCode || "#FFFFFF"}`}
                              >
                                {item.name || "Preview"}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {formData.priceStrategy === 2 &&
                              typeof item.price === "number"
                                ? `$${item.price.toFixed(2)}`
                                : "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <ToggleIndicator
                                value={item.isDefault}
                                activeColor="blue"
                                size="md"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {item.displayOrder || index + 1}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <ToggleIndicator
                                value={item.isActive}
                                activeColor="green"
                                size="md"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleEditItem(index)}
                                className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                title="Edit modifier item"
                              >
                                <PencilIcon className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeModifierItem(index)}
                                className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                title="Delete modifier item"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
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

        {/* Modifier Item Modal */}
        <ModifierItemModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItemIndex(null);
          }}
          onSave={handleSaveItem}
          item={
            editingItemIndex !== null && editingItemIndex >= 0
              ? modifierItems[editingItemIndex]
              : null
          }
          priceStrategy={formData.priceStrategy}
          nextDisplayOrder={
            modifierItems.length > 0
              ? Math.max(...modifierItems.map((i) => i.displayOrder || 0), 0) +
                1
              : 1
          }
        />

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
