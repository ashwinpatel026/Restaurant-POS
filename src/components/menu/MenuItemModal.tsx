"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isVeg: boolean;
  isAvailable: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item?: MenuItem | null;
  categoryId?: string;
}

export default function MenuItemModal({
  isOpen,
  onClose,
  onSuccess,
  item,
  categoryId,
}: MenuItemModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: categoryId || "",
    price: "",
    cost: "",
    isVeg: true,
    isAvailable: true,
    preparationTime: "15",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description || "",
        categoryId: categoryId || "",
        price: item.price.toString(),
        cost: "",
        isVeg: item.isVeg,
        isAvailable: item.isAvailable,
        preparationTime: "15",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        categoryId: categoryId || "",
        price: "",
        cost: "",
        isVeg: true,
        isAvailable: true,
        preparationTime: "15",
      });
    }
  }, [item, categoryId]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/menu/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = item ? `/api/menu/items/${item.id}` : "/api/menu/items";
      const method = item ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          cost: formData.cost ? parseFloat(formData.cost) : null,
          preparationTime: parseInt(formData.preparationTime),
        }),
      });

      if (response.ok) {
        toast.success(
          item ? "Item updated successfully" : "Item created successfully"
        );
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save item");
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
                    {item ? "Edit Menu Item" : "Add Menu Item"}
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
                    <label className="label">Item Name</label>
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

                  <div>
                    <label className="label">Category</label>
                    <select
                      required
                      className="input"
                      value={formData.categoryId}
                      onChange={(e) =>
                        setFormData({ ...formData, categoryId: e.target.value })
                      }
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className="input"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">Cost (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        value={formData.cost}
                        onChange={(e) =>
                          setFormData({ ...formData, cost: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Preparation Time (minutes)</label>
                    <input
                      type="number"
                      required
                      className="input"
                      value={formData.preparationTime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          preparationTime: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isVeg}
                        onChange={(e) =>
                          setFormData({ ...formData, isVeg: e.target.checked })
                        }
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Vegetarian</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isAvailable}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isAvailable: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Available</span>
                    </label>
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
                      {loading ? "Saving..." : item ? "Update" : "Create"}
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
