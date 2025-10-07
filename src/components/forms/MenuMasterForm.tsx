"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface MenuMasterFormProps {
  menuMaster?: any;
  stationGroups: any[];
  availability: any[];
  taxes: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function MenuMasterForm({
  menuMaster,
  stationGroups,
  availability,
  taxes,
  onSave,
  onCancel,
}: MenuMasterFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    labelName: "",
    colorCode: "#3B82F6",
    taxId: 1,
    stationGroupId: "",
    availabilityId: "",
    isActive: 1,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (menuMaster) {
      setFormData({
        name: menuMaster.name || "",
        labelName: menuMaster.labelName || "",
        colorCode: menuMaster.colorCode || "#3B82F6",
        taxId: menuMaster.taxId || 1,
        stationGroupId: menuMaster.stationGroupId?.toString() || "",
        availabilityId: menuMaster.availabilityId?.toString() || "",
        isActive: menuMaster.isActive || 1,
      });
    }
  }, [menuMaster]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        stationGroupId: formData.stationGroupId
          ? parseInt(formData.stationGroupId)
          : null,
        availabilityId: formData.availabilityId
          ? parseInt(formData.availabilityId)
          : null,
        taxId: parseInt(formData.taxId.toString()),
      };

      const url = menuMaster
        ? `/api/menu/masters/${menuMaster.tblMenuMasterId}`
        : "/api/menu/masters";

      const method = menuMaster ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          menuMaster
            ? "Menu master updated successfully!"
            : "Menu master created successfully!"
        );
        onSave(result);
      } else {
        throw new Error("Failed to save menu master");
      }
    } catch (error) {
      toast.error("Error saving menu master");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter menu master name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Label Name
          </label>
          <input
            type="text"
            value={formData.labelName}
            onChange={(e) =>
              setFormData({ ...formData, labelName: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter display label"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Color Code
          </label>
          <input
            type="color"
            value={formData.colorCode}
            onChange={(e) =>
              setFormData({ ...formData, colorCode: e.target.value })
            }
            className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tax *
          </label>
          <select
            required
            value={formData.taxId}
            onChange={(e) =>
              setFormData({ ...formData, taxId: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Tax</option>
            {taxes.map((tax) => (
              <option key={tax.tblTaxId} value={tax.tblTaxId}>
                {tax.taxname} ({tax.taxrate}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Station Group
          </label>
          <select
            value={formData.stationGroupId}
            onChange={(e) =>
              setFormData({ ...formData, stationGroupId: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Station Group</option>
            {stationGroups.map((group) => (
              <option key={group.stationGroupId} value={group.stationGroupId}>
                {group.groupName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Availability
          </label>
          <select
            value={formData.availabilityId}
            onChange={(e) =>
              setFormData({ ...formData, availabilityId: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Availability</option>
            {availability.map((avail) => (
              <option key={avail.availabilityId} value={avail.availabilityId}>
                {avail.avaiDays || "All Days"} - {avail.avilTime || "Always"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isActive === 1}
            onChange={(e) =>
              setFormData({ ...formData, isActive: e.target.checked ? 1 : 0 })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Active
          </span>
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
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
          {loading ? "Saving..." : menuMaster ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
