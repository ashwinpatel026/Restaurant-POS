"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";

interface Modifier {
  tblModifierId: number;
  name: string;
  labelName: string;
  colorCode?: string;
  priceStrategy: number;
  price?: number;
  required: number;
  isMultiselect: number;
  minSelection?: number;
  maxSelection?: number;
}

export default function ModifiersPage() {
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const modifiersRes = await fetch("/api/menu/modifiers");

      if (modifiersRes.ok) {
        const modifiersData = await modifiersRes.json();
        setModifiers(modifiersData);
        setStats((prev) => ({ ...prev, total: modifiersData.length }));
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Modal handlers
  const handleAdd = () => {
    setEditingModifier(null);
    setShowModal(true);
  };

  const handleEdit = (modifier: Modifier) => {
    setEditingModifier(modifier);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const url = editingModifier
        ? `/api/menu/modifiers/${editingModifier.tblModifierId}`
        : "/api/menu/modifiers";

      const method = editingModifier ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          editingModifier
            ? "Modifier updated successfully!"
            : "Modifier created successfully!"
        );
        setShowModal(false);
        setEditingModifier(null);
        fetchData(); // Refresh data
      } else {
        throw new Error("Failed to save modifier");
      }
    } catch (error) {
      toast.error("Error saving modifier");
      console.error("Error:", error);
    }
  };

  const handleDelete = (modifierId: number) => {
    setDeletingId(modifierId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/menu/modifiers/${deletingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setModifiers(
          modifiers.filter((mod) => mod.tblModifierId !== deletingId)
        );
        setStats((prev) => ({ ...prev, total: prev.total - 1 }));
        toast.success("Modifier deleted successfully");
      } else {
        throw new Error("Failed to delete modifier");
      }
    } catch (error) {
      toast.error("Error deleting modifier");
      console.error("Error:", error);
    } finally {
      setShowConfirmModal(false);
      setDeletingId(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Modifiers
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage item customization options and pricing strategies
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Modifier
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    M
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Modifiers
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {modifiers.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    R
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Required
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {modifiers.filter((m) => m.required === 1).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    S
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Single Select
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {modifiers.filter((m) => m.isMultiselect === 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    I
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Items
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modifiers List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Modifiers List
            </h3>
          </div>
          <div className="p-6">
            {modifiers.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 dark:text-gray-500 text-2xl">
                    ⚙️
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No modifiers found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Get started by creating your first modifier.
                </p>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Modifier
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modifiers.map((modifier) => (
                  <div
                    key={modifier.tblModifierId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-700"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{
                            backgroundColor: modifier.colorCode || "#3B82F6",
                          }}
                        ></div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {modifier.name}
                        </h3>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            modifier.required === 1
                              ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                              : "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                          }`}
                        >
                          {modifier.required === 1 ? "Required" : "Optional"}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            modifier.isMultiselect === 1
                              ? "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400"
                              : "bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {modifier.isMultiselect === 1 ? "Multi" : "Single"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <p>
                        <strong>Label:</strong> {modifier.labelName}
                      </p>
                      <p>
                        <strong>Price Strategy:</strong>{" "}
                        {modifier.priceStrategy === 1
                          ? "No Charge"
                          : modifier.priceStrategy === 2
                          ? "Individual Price"
                          : "Group Price"}
                      </p>
                      {modifier.price && (
                        <p>
                          <strong>Price:</strong> {formatPrice(modifier.price)}
                        </p>
                      )}
                      {modifier.minSelection && (
                        <p>
                          <strong>Min Selection:</strong>{" "}
                          {modifier.minSelection}
                        </p>
                      )}
                      {modifier.maxSelection && (
                        <p>
                          <strong>Max Selection:</strong>{" "}
                          {modifier.maxSelection}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        className="p-1 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        title="View modifier details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(modifier)}
                        className="p-1 text-blue-500 hover:text-blue-700 transition-colors duration-200"
                        title="Edit modifier"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(modifier.tblModifierId)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200"
                        title="Delete modifier"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <CRUDModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingModifier(null);
        }}
        title={editingModifier ? "Edit Modifier" : "Add New Modifier"}
        size="lg"
      >
        <ModifierForm
          modifier={editingModifier}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingModifier(null);
          }}
        />
      </CRUDModal>

      {/* Confirmation Modal */}
      <CRUDModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setDeletingId(null);
        }}
        title="Confirm Delete"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">
              Delete Modifier
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this modifier? This action
                cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowConfirmModal(false);
                setDeletingId(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </CRUDModal>
    </DashboardLayout>
  );
}

// Modifier Form Component
function ModifierForm({
  modifier,
  onSave,
  onCancel,
}: {
  modifier?: Modifier | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    labelName: "",
    colorCode: "#3B82F6",
    priceStrategy: 1,
    price: 0,
    required: 0,
    isMultiselect: 0,
    minSelection: 1,
    maxSelection: 1,
  });

  const [modifierItems, setModifierItems] = useState([
    { name: "", labelName: "", colorCode: "#3B82F6", price: 0 },
    { name: "", labelName: "", colorCode: "#3B82F6", price: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (modifier) {
      setFormData({
        name: modifier.name || "",
        labelName: modifier.labelName || "",
        colorCode: modifier.colorCode || "#3B82F6",
        priceStrategy: modifier.priceStrategy || 1,
        price: modifier.price || 0,
        required: modifier.required || 0,
        isMultiselect: modifier.isMultiselect || 0,
        minSelection: modifier.minSelection || 1,
        maxSelection: modifier.maxSelection || 1,
      });

      // Fetch modifier items for editing
      fetchModifierItems(modifier.tblModifierId);
    } else {
      // Reset to default 2 empty rows for new modifier
      setModifierItems([
        { name: "", labelName: "", colorCode: "#3B82F6", price: 0 },
        { name: "", labelName: "", colorCode: "#3B82F6", price: 0 },
      ]);
    }
  }, [modifier]);

  const fetchModifierItems = async (modifierId: number) => {
    try {
      const response = await fetch(
        `/api/menu/modifier-items?modifierId=${modifierId}`
      );
      if (response.ok) {
        const items = await response.json();
        setModifierItems(
          items.length > 0
            ? items
            : [
                { name: "", labelName: "", colorCode: "#3B82F6", price: 0 },
                { name: "", labelName: "", colorCode: "#3B82F6", price: 0 },
              ]
        );
      }
    } catch (error) {
      console.error("Error fetching modifier items:", error);
      // Fallback to default empty rows
      setModifierItems([
        { name: "", labelName: "", colorCode: "#3B82F6", price: 0 },
        { name: "", labelName: "", colorCode: "#3B82F6", price: 0 },
      ]);
    }
  };

  const addModifierItem = () => {
    setModifierItems([
      ...modifierItems,
      { name: "", labelName: "", colorCode: "#3B82F6", price: 0 },
    ]);
  };

  const updateModifierItem = (index: number, field: string, value: any) => {
    const updated = [...modifierItems];
    updated[index] = { ...updated[index], [field]: value };
    setModifierItems(updated);
  };

  const removeModifierItem = (index: number) => {
    if (modifierItems.length > 1) {
      setShowConfirmModal(true);
      setDeletingIndex(index);
    }
  };

  const confirmRemoveModifierItem = () => {
    if (deletingIndex !== null && modifierItems.length > 1) {
      const updated = modifierItems.filter((_, i) => i !== deletingIndex);
      setModifierItems(updated);
    }
    setShowConfirmModal(false);
    setDeletingIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        price: parseFloat(formData.price.toString()),
        priceStrategy: parseInt(formData.priceStrategy.toString()),
        required: parseInt(formData.required.toString()),
        isMultiselect: parseInt(formData.isMultiselect.toString()),
        minSelection: parseInt(formData.minSelection.toString()),
        maxSelection: parseInt(formData.maxSelection.toString()),
        modifierItems: modifierItems.filter((item) => item.name.trim() !== ""), // Only include items with names
      };

      await onSave(submitData);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Modifier Group Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Modifier group details
          </h3>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Advanced settings
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              * Modifier group name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter modifier group name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              POS name (button label)
            </label>
            <input
              type="text"
              value={formData.labelName}
              onChange={(e) =>
                setFormData({ ...formData, labelName: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter button label"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Button color
          </label>
          <input
            type="color"
            value={formData.colorCode}
            onChange={(e) =>
              setFormData({ ...formData, colorCode: e.target.value })
            }
            className="w-16 h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
        <p className="text-sm text-gray-600">
          How are modifiers priced in this group?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              formData.priceStrategy === 1
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => setFormData({ ...formData, priceStrategy: 1 })}
          >
            <h4 className="font-medium text-gray-900">No charge</h4>
          </div>

          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              formData.priceStrategy === 2
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => setFormData({ ...formData, priceStrategy: 2 })}
          >
            <h4 className="font-medium text-gray-900">Individual</h4>
            <p className="text-sm text-gray-600 mt-1">
              Each modifier has a unique price.
            </p>
          </div>

          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              formData.priceStrategy === 3
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => setFormData({ ...formData, priceStrategy: 3 })}
          >
            <h4 className="font-medium text-gray-900">Group</h4>
            <p className="text-sm text-gray-600 mt-1">
              All modifiers share the same price.
            </p>
          </div>
        </div>

        {formData.priceStrategy === 3 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Advanced Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required
            </label>
            <select
              value={formData.required}
              onChange={(e) =>
                setFormData({ ...formData, required: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>Optional</option>
              <option value={1}>Required</option>
              <option value={2}>Optional but Force Show</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selection Type
            </label>
            <select
              value={formData.isMultiselect}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isMultiselect: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>Single Select</option>
              <option value={1}>Multi Select</option>
            </select>
          </div>
        </div>

        {formData.isMultiselect === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Selection
              </label>
              <input
                type="number"
                min="0"
                value={formData.minSelection}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minSelection: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Selection
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxSelection}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxSelection: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Modifiers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Modifiers</h3>
          <button
            type="button"
            onClick={addModifierItem}
            className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Add Item
          </button>
        </div>

        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing strategy
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modifierItems.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        updateModifierItem(index, "name", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter modifier name"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {formData.priceStrategy === 1
                        ? "No charge"
                        : formData.priceStrategy === 2
                        ? "Base price"
                        : "Group price"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {formData.priceStrategy === 2 ? (
                      <div className="flex items-center">
                        <span className="text-gray-500 mr-2">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) =>
                            updateModifierItem(
                              index,
                              "price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {modifierItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeModifierItem(index)}
                        className="text-red-600 hover:text-red-800 transition-colors duration-200"
                        title="Delete modifier item"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                Delete Modifier Item
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
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
    </form>
  );
}
