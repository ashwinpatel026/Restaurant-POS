"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import SystemColorPicker from "@/components/ui/SystemColorPicker";
import TextColorPicker from "@/components/ui/TextColorPicker";
import { getPrimaryColor } from "@/components/ui/SystemColorPicker";
import StatusToggle from "@/components/forms/StatusToggle";

interface ModifierItem {
  id?: string;
  name: string;
  labelName: string;
  colorCode: string;
  forColorCode: string;
  price: number;
  isDefault: number;
  displayOrder: number;
  groupCode?: string;
  isActive: number;
}

interface ModifierItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ModifierItem) => void;
  item?: ModifierItem | null;
  priceStrategy?: number; // 1=No Charge, 2=Individual, 3=Group
  nextDisplayOrder: number; // Next display order for new items
}

export default function ModifierItemModal({
  isOpen,
  onClose,
  onSave,
  item,
  priceStrategy = 2,
  nextDisplayOrder,
}: ModifierItemModalProps) {
  const [formData, setFormData] = useState<ModifierItem>({
    id: undefined,
    name: "",
    labelName: "",
    colorCode: getPrimaryColor(),
    forColorCode: "#FFFFFF",
    price: 0,
    isDefault: 0,
    displayOrder: 1,
    groupCode: "",
    isActive: 1,
  });

  useEffect(() => {
    if (isOpen) {
      if (item) {
        // Editing existing item
        setFormData({
          id: item.id,
          name: item.name || "",
          labelName: item.labelName || "",
          colorCode: item.colorCode || getPrimaryColor(),
          forColorCode: item.forColorCode || "#FFFFFF",
          price: item.price || 0,
          isDefault: item.isDefault || 0,
          displayOrder: item.displayOrder || nextDisplayOrder,
          groupCode: item.groupCode || "",
          isActive: item.isActive ?? 1,
        });
      } else {
        // New item - reset form (displayOrder will be auto-assigned)
        setFormData({
          id: undefined,
          name: "",
          labelName: "",
          colorCode: getPrimaryColor(),
          forColorCode: "#FFFFFF",
          price: 0,
          isDefault: 0,
          displayOrder: nextDisplayOrder,
          groupCode: "",
          isActive: 1,
        });
      }
    }
  }, [item, isOpen, nextDisplayOrder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate item name is required
    if (!formData.name || !formData.name.trim()) {
      return; // HTML5 validation will show the required message
    }
    
    // Save the item and close modal
    onSave(formData);
    handleClose();
  };

  const handleClose = () => {
    // Reset form data when modal closes
    setFormData({
      id: undefined,
      name: "",
      labelName: "",
      colorCode: getPrimaryColor(),
      forColorCode: "#FFFFFF",
      price: 0,
      isDefault: 0,
      displayOrder: 1,
      groupCode: "",
      isActive: 1,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
              {item ? "Edit Modifier Item" : "Add Modifier Item"}
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Item Name and POS Label Name in one row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Item Name <span className="text-red-500">*</span>
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
                  Label Name
                </label>
                <input
                  type="text"
                  value={formData.labelName}
                  onChange={(e) =>
                    setFormData({ ...formData, labelName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter label Name"
                />
              </div>
            </div>

            {/* Group Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Group Code
              </label>
              <input
                type="text"
                value={formData.groupCode}
                onChange={(e) =>
                  setFormData({ ...formData, groupCode: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter group code"
                maxLength={50}
              />
            </div>

            {/* Color Code and Text Color */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <SystemColorPicker
                  label="Color Code"
                  value={formData.colorCode}
                  onChange={(color) =>
                    setFormData({ ...formData, colorCode: color })
                  }
                  showLabel={true}
                  showHexInput={true}
                />
              </div>
              <div>
                <TextColorPicker
                  label="Text Color"
                  value={formData.forColorCode}
                  onChange={(color) =>
                    setFormData({ ...formData, forColorCode: color })
                  }
                  showLabel={true}
                />
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  style={{
                    backgroundColor: formData.colorCode || getPrimaryColor(),
                    color: formData.forColorCode || "#FFFFFF",
                  }}
                >
                  {formData.name || "Sample Button"}
                </button>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 dark:text-gray-400 mr-2">
                  $
                </span>
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
                  disabled={priceStrategy !== 2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
              {priceStrategy !== 2 && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Price is managed at the group level
                </p>
              )}
            </div>

            {/* Is Default and Status in one row with toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Is Default Toggle */}
              <StatusToggle
                label="Included in Menu"
                value={formData.isDefault === 1}
                onChange={(value) =>
                  setFormData({ ...formData, isDefault: value ? 1 : 0 })
                }
                trueLabel="Yes"
                falseLabel="No"
              />

              {/* Status Toggle */}
              <StatusToggle
                label="Status"
                value={formData.isActive === 1}
                onChange={(value) =>
                  setFormData({ ...formData, isActive: value ? 1 : 0 })
                }
                trueLabel="Active"
                falseLabel="Inactive"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {item ? "Update" : "Add"} Item
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

