"use client";

import { useState, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ModifierGroup {
  id: string;
  modifierGroupCode: string | null;
  groupName: string | null;
  labelName: string | null;
}

export default function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
}: CategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [selectedModifierGroups, setSelectedModifierGroups] = useState<
    Set<string>
  >(new Set());
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    menuMasterId: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchModifierGroups();
    }
  }, [isOpen]);

  const fetchModifierGroups = async () => {
    try {
      const response = await fetch("/api/modifier-groups");
      if (response.ok) {
        const data = await response.json();
        setModifierGroups(data);
      }
    } catch (error) {
      console.error("Error fetching modifier groups:", error);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          modifierGroupCodes: Array.from(selectedModifierGroups),
        }),
      });

      if (response.ok) {
        toast.success("Category created successfully");
        onSuccess();
        onClose();
        setFormData({ name: "", description: "", menuMasterId: "" });
        setSelectedModifierGroups(new Set());
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to create category");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
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
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-xl font-bold text-gray-900">
                    Add Category
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Category Name</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="label">Description</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Modifier Groups Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label mb-0">
                        Modifier Groups (Optional)
                      </label>
                      {modifierGroups.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {selectedModifierGroups.size === modifierGroups.length
                            ? "Deselect All"
                            : "Select All"}
                        </button>
                      )}
                    </div>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-700">
                      {modifierGroups.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                          No modifier groups available
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {modifierGroups.map((group) => {
                            const code = group.modifierGroupCode;
                            if (!code) return null;
                            return (
                              <label
                                key={group.id}
                                className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-2 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedModifierGroups.has(code)}
                                  onChange={() =>
                                    handleModifierGroupToggle(code)
                                  }
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-900 dark:text-white">
                                  {group.groupName || group.labelName || code}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Select modifier groups that will be available for all
                      items in this category
                    </p>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary flex-1"
                    >
                      {loading ? "Creating..." : "Create"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
