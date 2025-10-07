"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface MenuItemFormProps {
  menuItem?: any;
  categories: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function MenuItemForm({
  menuItem,
  categories,
  onSave,
  onCancel,
}: MenuItemFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    labelName: "",
    colorCode: "#3B82F6",
    calories: "",
    descrip: "",
    skuPlu: "",
    isAlcohol: 0,
    menuImg: "",
    priceStrategy: 1,
    price: 0,
    tblMenuCategoryId: "",
    isActive: 1,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (menuItem) {
      setFormData({
        name: menuItem.name || "",
        labelName: menuItem.labelName || "",
        colorCode: menuItem.colorCode || "#3B82F6",
        calories: menuItem.calories || "",
        descrip: menuItem.descrip || "",
        skuPlu: menuItem.skuPlu?.toString() || "",
        isAlcohol: menuItem.isAlcohol || 0,
        menuImg: menuItem.menuImg || "",
        priceStrategy: menuItem.priceStrategy || 1,
        price: menuItem.price || 0,
        tblMenuCategoryId: menuItem.tblMenuCategoryId?.toString() || "",
        isActive: menuItem.isActive || 1,
      });
    }
  }, [menuItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        skuPlu: formData.skuPlu ? parseInt(formData.skuPlu) : null,
        price: parseFloat(formData.price.toString()),
        tblMenuCategoryId: parseInt(formData.tblMenuCategoryId),
        priceStrategy: parseInt(formData.priceStrategy.toString()),
      };

      const url = menuItem
        ? `/api/menu/items/${menuItem.tblMenuItemId}`
        : "/api/menu/items";

      const method = menuItem ? "PUT" : "POST";

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
          menuItem
            ? "Menu item updated successfully!"
            : "Menu item created successfully!"
        );
        onSave(result);
      } else {
        throw new Error("Failed to save menu item");
      }
    } catch (error) {
      toast.error("Error saving menu item");
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
            placeholder="Enter item name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category *
          </label>
          <select
            required
            value={formData.tblMenuCategoryId}
            onChange={(e) =>
              setFormData({ ...formData, tblMenuCategoryId: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Category</option>
            {categories.map((category) => (
              <option
                key={category.tblMenuCategoryId}
                value={category.tblMenuCategoryId}
              >
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Price *
          </label>
          <input
            type="number"
            required
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.descrip}
            onChange={(e) =>
              setFormData({ ...formData, descrip: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Enter item description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Additional Info
          </label>
          <div className="space-y-2">
            <input
              type="text"
              value={formData.calories}
              onChange={(e) =>
                setFormData({ ...formData, calories: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Calories"
            />
            <input
              type="text"
              value={formData.skuPlu}
              onChange={(e) =>
                setFormData({ ...formData, skuPlu: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="SKU/PLU"
            />
            <input
              type="url"
              value={formData.menuImg}
              onChange={(e) =>
                setFormData({ ...formData, menuImg: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Image URL"
            />
          </div>
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

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isAlcohol === 1}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isAlcohol: e.target.checked ? 1 : 0,
                })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Contains Alcohol
            </span>
          </label>

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
          {loading ? "Saving..." : menuItem ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
