"use client";

import { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Fragment } from "react";

interface ModifierItem {
  id: number;
  name: string;
  labelName: string;
  posName: string;
  price: number;
  colorCode?: string;
}

interface ModifierGroup {
  id: number;
  name: string;
  labelName: string;
  posName: string;
  colorCode?: string;
  required: number;
  isMultiselect: number;
  minSelection?: number;
  maxSelection?: number;
  additionalChargeType?: string;
  itemCount: number;
  sampleItems: string[];
  configSummary: string;
  modifierItems: ModifierItem[];
}

interface ModifierSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedModifierIds: number[]) => void;
  selectedModifierIds: number[];
  menuItemId?: number;
}

export default function ModifierSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  selectedModifierIds,
  menuItemId,
}: ModifierSelectionModalProps) {
  const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModifier, setSelectedModifier] =
    useState<ModifierGroup | null>(null);
  const [localSelectedIds, setLocalSelectedIds] =
    useState<number[]>(selectedModifierIds);

  useEffect(() => {
    setLocalSelectedIds(selectedModifierIds);
  }, [selectedModifierIds]);

  useEffect(() => {
    if (isOpen) {
      fetchModifiers();
    }
  }, [isOpen, searchTerm, menuItemId]);

  const fetchModifiers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (menuItemId) params.append("excludeMenuItemId", menuItemId.toString());

      const response = await fetch(`/api/menu/modifiers/available?${params}`);
      if (response.ok) {
        const data = await response.json();
        setModifiers(data);
      } else {
        console.error("Failed to fetch modifiers");
      }
    } catch (error) {
      console.error("Error fetching modifiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleModifierToggle = (modifierId: number) => {
    setLocalSelectedIds((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  const handleConfirm = () => {
    onConfirm(localSelectedIds);
    onClose();
  };

  const filteredModifiers = modifiers.filter(
    (modifier) =>
      modifier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      modifier.labelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      modifier.posName.toLowerCase().includes(searchTerm.toLowerCase())
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
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white flex items-center"
                  >
                    Select Modifier Groups
                    <button className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex h-96">
                  {/* Left Panel - Modifier Groups List */}
                  <div className="w-1/2 pr-4 border-r border-gray-200 dark:border-gray-700">
                    <div className="mb-4">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {loading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                        </div>
                      ) : (
                        filteredModifiers.map((modifier) => (
                          <div
                            key={modifier.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              localSelectedIds.includes(modifier.id)
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : selectedModifier?.id === modifier.id
                                ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                                : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}
                            onClick={() => setSelectedModifier(modifier)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  {localSelectedIds.includes(modifier.id) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleModifierToggle(modifier.id);
                                      }}
                                      className="mr-2 text-red-500 hover:text-red-700"
                                    >
                                      <XMarkIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                  <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {modifier.name}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      POS Name: {modifier.posName}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                      {modifier.configSummary}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                      {modifier.sampleItems.join(", ")}
                                      {modifier.itemCount > 3 &&
                                        ` and ${modifier.itemCount - 3} more`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={localSelectedIds.includes(
                                    modifier.id
                                  )}
                                  onChange={() =>
                                    handleModifierToggle(modifier.id)
                                  }
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Panel - Selected Modifier Details */}
                  <div className="w-1/2 pl-4">
                    {selectedModifier ? (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {selectedModifier.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          POS Name: {selectedModifier.posName}
                        </p>

                        <div className="space-y-3 mb-6">
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Pricing:
                            </span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Additional charge - price set on individual
                              modifiers
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Required?:
                            </span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedModifier.required === 1
                                ? "Required"
                                : "Optional - Force Show"}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Multi-select?:
                            </span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedModifier.isMultiselect === 1
                                ? "Yes"
                                : "No"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Options:
                          </h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {selectedModifier.modifierItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-600 rounded"
                              >
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {item.name}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  ${Number(item.price).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        Select a modifier group to view details
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Done
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
