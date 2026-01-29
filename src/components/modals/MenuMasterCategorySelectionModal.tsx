"use client";

import { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, MagnifyingGlassIcon, CheckIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Fragment } from "react";

interface MenuMaster {
  menuMasterId: string;
  menuMasterCode: string;
  name: string;
  labelName?: string;
}

interface MenuCategory {
  menuCategoryId?: string;
  tblMenuCategoryId?: number | string;
  menuCategoryCode?: string;
  name: string;
  menuMasterCode?: string;
  menuMaster?: {
    name: string;
  };
}

interface MenuMasterCategorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (masters: MenuMaster[], categoryMap: Map<string, string[]>) => void;
  selectedMenuMasterCodes?: string[];
  selectedCategoryMap?: Map<string, string[]> | Record<string, string[]>;
  menuMasters: MenuMaster[];
  categories: MenuCategory[];
}

export default function MenuMasterCategorySelectionModal({
  isOpen,
  onClose,
  onConfirm,
  selectedMenuMasterCodes = [],
  selectedCategoryMap = new Map(),
  menuMasters,
  categories,
}: MenuMasterCategorySelectionModalProps) {
  const [step, setStep] = useState<"master" | "categories">("master");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMasters, setSelectedMasters] = useState<Set<string>>(new Set());
  const [localCategoryMap, setLocalCategoryMap] = useState<Map<string, Set<string>>>(new Map());

  // Initialize selected masters and categories when modal opens
  useEffect(() => {
    if (isOpen) {
      // Convert selectedMenuMasterCodes array to Set
      const masterCodesSet = new Set(selectedMenuMasterCodes || []);
      setSelectedMasters(masterCodesSet);
      
      // Convert selectedCategoryMap to Map<masterCode, Set<categoryCode>>
      let categoryMap = new Map<string, Set<string>>();
      if (selectedCategoryMap instanceof Map) {
        selectedCategoryMap.forEach((categories, masterCode) => {
          categoryMap.set(masterCode, new Set(Array.isArray(categories) ? categories : [categories]));
        });
      } else if (typeof selectedCategoryMap === 'object' && selectedCategoryMap !== null) {
        Object.entries(selectedCategoryMap).forEach(([masterCode, categories]) => {
          categoryMap.set(masterCode, new Set(Array.isArray(categories) ? categories : [categories]));
        });
      }
      setLocalCategoryMap(categoryMap);
      
      // If masters are already selected, go to categories step
      if (masterCodesSet.size > 0) {
        setStep("categories");
      } else {
        setStep("master");
      }
      setSearchTerm("");
    }
  }, [isOpen, selectedMenuMasterCodes, selectedCategoryMap]);

  // Filter menu masters
  const filteredMasters = menuMasters.filter((master) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      master.name?.toLowerCase().includes(searchLower) ||
      master.labelName?.toLowerCase().includes(searchLower) ||
      master.menuMasterCode?.toLowerCase().includes(searchLower)
    );
  });

  // Get categories grouped by selected masters
  const categoriesByMaster = Array.from(selectedMasters).map((masterCode) => {
    const master = menuMasters.find((m) => m.menuMasterCode === masterCode);
    const masterCategories = categories.filter(
      (cat) => cat.menuMasterCode === masterCode
    );
    return {
      master,
      masterCode,
      categories: masterCategories,
    };
  });

  // Filter categories by search term
  const getFilteredCategories = (masterCategories: MenuCategory[]) => {
    return masterCategories.filter((category) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        category.name?.toLowerCase().includes(searchLower) ||
        category.menuCategoryCode?.toLowerCase().includes(searchLower)
      );
    });
  };

  const toggleMaster = (masterCode: string) => {
    const updated = new Set(selectedMasters);
    if (updated.has(masterCode)) {
      updated.delete(masterCode);
      // Remove categories for this master
      const newMap = new Map(localCategoryMap);
      newMap.delete(masterCode);
      setLocalCategoryMap(newMap);
    } else {
      updated.add(masterCode);
    }
    setSelectedMasters(updated);
  };

  const toggleCategory = (masterCode: string, categoryCode: string) => {
    const updated = new Map(localCategoryMap);
    const currentCategories = updated.get(masterCode) || new Set<string>();
    const newCategories = new Set(currentCategories);
    
    if (newCategories.has(categoryCode)) {
      newCategories.delete(categoryCode);
    } else {
      newCategories.add(categoryCode);
    }
    
    if (newCategories.size > 0) {
      updated.set(masterCode, newCategories);
    } else {
      updated.delete(masterCode);
    }
    setLocalCategoryMap(updated);
  };

  const removeAllCategories = (masterCode: string) => {
    const updated = new Map(localCategoryMap);
    updated.delete(masterCode);
    setLocalCategoryMap(updated);
  };

  const handleBackToMaster = () => {
    setStep("master");
    setSearchTerm("");
  };

  const handleConfirm = () => {
    // Validate: each selected master must have at least one category
    const missingCategories: string[] = [];
    selectedMasters.forEach((masterCode) => {
      const categories = localCategoryMap.get(masterCode);
      if (!categories || categories.size === 0) {
        const master = menuMasters.find((m) => m.menuMasterCode === masterCode);
        missingCategories.push(master?.name || masterCode);
      }
    });

    if (missingCategories.length > 0) {
      // Show validation error - we'll handle this in the UI
      return;
    }

    // Get master objects for selected masters
    const selectedMasterObjects = Array.from(selectedMasters)
      .map((code) => menuMasters.find((m) => m.menuMasterCode === code))
      .filter((m): m is MenuMaster => m !== undefined);

    // Convert Map<masterCode, Set<categoryCode>> to Map<masterCode, categoryCode[]>
    const categoryMapArray = new Map<string, string[]>();
    localCategoryMap.forEach((categories, masterCode) => {
      categoryMapArray.set(masterCode, Array.from(categories));
    });

    onConfirm(selectedMasterObjects, categoryMapArray);
    onClose();
  };

  const handleClear = () => {
    setSelectedMasters(new Set());
    setLocalCategoryMap(new Map());
    onConfirm([], new Map());
    onClose();
  };

  // Check if all masters have at least one category selected
  const allMastersHaveCategories = Array.from(selectedMasters).every(
    (masterCode) => {
      const categories = localCategoryMap.get(masterCode);
      return categories && categories.size > 0;
    }
  );

  // Get missing categories for validation display
  const missingCategoryMasters = Array.from(selectedMasters).filter(
    (masterCode) => {
      const categories = localCategoryMap.get(masterCode);
      return !categories || categories.size === 0;
    }
  );

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {step === "categories" && (
                      <button
                        type="button"
                        onClick={handleBackToMaster}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <ChevronRightIcon className="w-5 h-5 rotate-180" />
                      </button>
                    )}
                    <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
                      {step === "master" ? "Select Menu Masters" : "Select Categories"}
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Selected Masters Display (when on categories step) */}
                {step === "categories" && selectedMasters.size > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Selected Menu Masters ({selectedMasters.size}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(selectedMasters).map((masterCode) => {
                        const master = menuMasters.find((m) => m.menuMasterCode === masterCode);
                        return master ? (
                          <div
                            key={masterCode}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded text-sm font-medium text-blue-800 dark:text-blue-200"
                          >
                            {master.name || master.labelName || masterCode}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={
                        step === "master"
                          ? "Search menu masters..."
                          : "Search categories..."
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Menu Masters Step */}
                {step === "master" && (
                  <>
                    <div className="max-h-96 overflow-y-auto mb-4">
                      {filteredMasters.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No menu masters found
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredMasters.map((master) => {
                            const isSelected = selectedMasters.has(master.menuMasterCode);
                            return (
                              <button
                                key={master.menuMasterCode}
                                type="button"
                                onClick={() => toggleMaster(master.menuMasterCode)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-700"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                                      isSelected
                                        ? "border-blue-500 bg-blue-500"
                                        : "border-gray-300 dark:border-gray-600"
                                    }`}>
                                      {isSelected && (
                                        <CheckIcon className="w-3 h-3 text-white" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-gray-900 dark:text-white">
                                        {master.name || master.labelName || master.menuMasterCode}
                                      </div>
                                      {master.labelName && master.labelName !== master.name && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                          {master.labelName}
                                        </div>
                                      )}
                                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        Code: {master.menuMasterCode}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {selectedMasters.size > 0 && (
                      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                        {selectedMasters.size} master{selectedMasters.size === 1 ? "" : "s"} selected
                      </div>
                    )}
                  </>
                )}

                {/* Categories Step */}
                {step === "categories" && (
                  <>
                    {selectedMasters.size === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400 mb-4">
                        Please select at least one menu master first
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {categoriesByMaster.map(({ master, masterCode, categories: masterCategories }) => {
                          if (!master) return null;
                          const filteredCategories = getFilteredCategories(masterCategories);
                          const selectedCategories = localCategoryMap.get(masterCode) || new Set<string>();
                          
                          return (
                            <div key={masterCode} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="mb-3">
                                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                                  {master.name || master.labelName || masterCode}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Select one or more categories for this menu master (at least one required)
                                </div>
                              </div>
                              
                              {filteredCategories.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                  No categories found{searchTerm ? " matching search" : ""}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {filteredCategories.map((category) => {
                                    const categoryCode =
                                      category.menuCategoryCode ||
                                      category.menuCategoryId?.toString() ||
                                      category.tblMenuCategoryId?.toString() ||
                                      "";
                                    const isSelected = selectedCategories.has(categoryCode);
                                    
                                    return (
                                      <button
                                        key={categoryCode}
                                        type="button"
                                        onClick={() => toggleCategory(masterCode, categoryCode)}
                                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                          isSelected
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-700"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                                              isSelected
                                                ? "border-blue-500 bg-blue-500"
                                                : "border-gray-300 dark:border-gray-600"
                                            }`}>
                                              {isSelected && (
                                                <CheckIcon className="w-3 h-3 text-white" />
                                              )}
                                            </div>
                                            <div>
                                              <div className="font-medium text-gray-900 dark:text-white">
                                                {category.name}
                                              </div>
                                              {category.menuCategoryCode && (
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                  Code: {category.menuCategoryCode}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {selectedCategories.size > 0 && (
                                <div className="mt-3 flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                  <span className="text-sm text-green-700 dark:text-green-300">
                                    {selectedCategories.size} categor{selectedCategories.size === 1 ? "y" : "ies"} selected
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeAllCategories(masterCode)}
                                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                                  >
                                    Clear All
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Validation Error */}
                    {missingCategoryMasters.length > 0 && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                          Please select a category for:
                        </div>
                        <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300">
                          {missingCategoryMasters.map((masterCode) => {
                            const master = menuMasters.find((m) => m.menuMasterCode === masterCode);
                            return (
                              <li key={masterCode}>
                                {master?.name || master?.labelName || masterCode}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Clear All
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    {step === "master" ? (
                      <button
                        type="button"
                        onClick={() => selectedMasters.size > 0 && setStep("categories")}
                        disabled={selectedMasters.size === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        Next ({selectedMasters.size})
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={selectedMasters.size === 0 || !allMastersHaveCategories}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Confirm ({Array.from(localCategoryMap.values()).reduce((sum, cats) => sum + cats.size, 0)} categories)
                      </button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

