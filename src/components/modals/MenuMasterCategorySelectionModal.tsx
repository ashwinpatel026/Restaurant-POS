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
  onConfirm: (menuMaster: MenuMaster | null, selectedCategoryCodes: string[]) => void;
  selectedMenuMasterCode?: string;
  selectedCategoryCodes: string[];
  menuMasters: MenuMaster[];
  categories: MenuCategory[];
}

export default function MenuMasterCategorySelectionModal({
  isOpen,
  onClose,
  onConfirm,
  selectedMenuMasterCode,
  selectedCategoryCodes,
  menuMasters,
  categories,
}: MenuMasterCategorySelectionModalProps) {
  const [step, setStep] = useState<"master" | "categories">("master");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMaster, setSelectedMaster] = useState<MenuMaster | null>(null);
  const [localSelectedCategories, setLocalSelectedCategories] = useState<Set<string>>(
    new Set(selectedCategoryCodes)
  );

  // Initialize selected master when modal opens
  useEffect(() => {
    if (isOpen) {
      if (selectedMenuMasterCode) {
        const master = menuMasters.find(
          (m) => m.menuMasterCode === selectedMenuMasterCode
        );
        setSelectedMaster(master || null);
        if (master) {
          setStep("categories");
        }
      } else {
        setSelectedMaster(null);
        setStep("master");
      }
      setLocalSelectedCategories(new Set(selectedCategoryCodes));
      setSearchTerm("");
    }
  }, [isOpen, selectedMenuMasterCode, selectedCategoryCodes, menuMasters]);

  // Filter menu masters
  const filteredMasters = menuMasters.filter((master) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      master.name?.toLowerCase().includes(searchLower) ||
      master.labelName?.toLowerCase().includes(searchLower) ||
      master.menuMasterCode?.toLowerCase().includes(searchLower)
    );
  });

  // Filter categories by selected menu master
  const availableCategories = selectedMaster
    ? categories.filter((cat) => cat.menuMasterCode === selectedMaster.menuMasterCode)
    : [];

  const filteredCategories = availableCategories.filter((category) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      category.name?.toLowerCase().includes(searchLower) ||
      category.menuCategoryCode?.toLowerCase().includes(searchLower)
    );
  });

  const handleMasterSelect = (master: MenuMaster) => {
    setSelectedMaster(master);
    // Clear categories that don't belong to the new master
    setLocalSelectedCategories(new Set());
    setSearchTerm("");
    setStep("categories");
  };

  const toggleCategory = (categoryCode: string) => {
    const updated = new Set(localSelectedCategories);
    if (updated.has(categoryCode)) {
      updated.delete(categoryCode);
    } else {
      updated.add(categoryCode);
    }
    setLocalSelectedCategories(updated);
  };

  const handleSelectAllCategories = () => {
    const allCodes = filteredCategories
      .map((cat) => 
        cat.menuCategoryCode || 
        cat.menuCategoryId?.toString() || 
        cat.tblMenuCategoryId?.toString()
      )
      .filter(Boolean) as string[];
    setLocalSelectedCategories(new Set(allCodes));
  };

  const handleDeselectAllCategories = () => {
    setLocalSelectedCategories(new Set());
  };

  const handleBackToMaster = () => {
    setStep("master");
    setSearchTerm("");
  };

  const handleConfirm = () => {
    onConfirm(selectedMaster, Array.from(localSelectedCategories));
    onClose();
  };

  const handleClear = () => {
    setSelectedMaster(null);
    setLocalSelectedCategories(new Set());
    onConfirm(null, []);
    onClose();
  };

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
                      {step === "master" ? "Select Menu Master" : "Select Categories"}
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Selected Master Display (when on categories step) */}
                {step === "categories" && selectedMaster && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Selected Menu Master:
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {selectedMaster.name || selectedMaster.labelName || selectedMaster.menuMasterCode}
                    </div>
                    {selectedMaster.labelName && selectedMaster.labelName !== selectedMaster.name && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedMaster.labelName}
                      </div>
                    )}
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
                            const isSelected =
                              selectedMaster?.menuMasterCode === master.menuMasterCode;
                            return (
                              <button
                                key={master.menuMasterCode}
                                type="button"
                                onClick={() => handleMasterSelect(master)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-700"
                                }`}
                              >
                                <div className="flex items-center justify-between">
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
                                  {isSelected && (
                                    <CheckIcon className="w-6 h-6 text-blue-500" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Categories Step */}
                {step === "categories" && (
                  <>
                    {availableCategories.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400 mb-4">
                        No categories available for this menu master
                      </div>
                    ) : (
                      <>
                        {filteredCategories.length > 0 && (
                          <div className="flex gap-2 mb-3">
                            <button
                              type="button"
                              onClick={handleSelectAllCategories}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Select All
                            </button>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            <button
                              type="button"
                              onClick={handleDeselectAllCategories}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Deselect All
                            </button>
                          </div>
                        )}
                        <div className="max-h-96 overflow-y-auto mb-4">
                          {filteredCategories.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              No categories found
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {filteredCategories.map((category) => {
                                const categoryCode =
                                  category.menuCategoryCode ||
                                  category.menuCategoryId?.toString() ||
                                  category.tblMenuCategoryId?.toString() ||
                                  "";
                                const isSelected = localSelectedCategories.has(categoryCode);
                                return (
                                  <button
                                    key={categoryCode}
                                    type="button"
                                    onClick={() => toggleCategory(categoryCode)}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                      isSelected
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-700"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                          {category.name}
                                        </div>
                                        {category.menuCategoryCode && (
                                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            Code: {category.menuCategoryCode}
                                          </div>
                                        )}
                                      </div>
                                      {isSelected && (
                                        <CheckIcon className="w-6 h-6 text-blue-500" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {localSelectedCategories.size > 0 && (
                          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                            {localSelectedCategories.size} categor{localSelectedCategories.size === 1 ? "y" : "ies"} selected
                          </div>
                        )}
                      </>
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
                        onClick={() => selectedMaster && setStep("categories")}
                        disabled={!selectedMaster}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        Next
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!selectedMaster || localSelectedCategories.size === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Confirm ({localSelectedCategories.size})
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

