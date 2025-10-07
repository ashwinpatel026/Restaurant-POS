"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalculatorIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";

interface Tax {
  tblTaxId: number;
  taxname: string;
  taxrate: number | any; // Prisma Decimal type
  isSyncSqlserver: number;
  storeCode?: string;
  menuMasters?: any[];
}

export default function TaxManagementPage() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/tax");

      if (response.ok) {
        const data = await response.json();
        setTaxes(data);
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
    setEditingTax(null);
    setShowModal(true);
  };

  const handleEdit = (tax: Tax) => {
    setEditingTax(tax);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const url = editingTax ? `/api/tax/${editingTax.tblTaxId}` : "/api/tax";

      const method = editingTax ? "PUT" : "POST";

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
          editingTax ? "Tax updated successfully!" : "Tax created successfully!"
        );
        setShowModal(false);
        setEditingTax(null);
        fetchData(); // Refresh data
      } else {
        throw new Error("Failed to save tax");
      }
    } catch (error) {
      toast.error("Error saving tax");
      console.error("Error:", error);
    }
  };

  const handleDelete = async (taxId: number) => {
    if (!confirm("Are you sure you want to delete this tax?")) return;

    try {
      const response = await fetch(`/api/tax/${taxId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTaxes(taxes.filter((tax) => tax.tblTaxId !== taxId));
        toast.success("Tax deleted successfully");
      } else {
        throw new Error("Failed to delete tax");
      }
    } catch (error) {
      toast.error("Error deleting tax");
      console.error("Error:", error);
    }
  };

  const formatTaxRate = (rate: number | any) => {
    // Handle Prisma Decimal type
    const numRate =
      typeof rate === "number" ? rate : parseFloat(rate.toString());
    return `${numRate.toFixed(2)}%`;
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
              Tax Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage tax rates and configurations for your restaurant
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Tax
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <CalculatorIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Taxes
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {taxes.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    H
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Highest Rate
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {taxes.length > 0
                    ? formatTaxRate(
                        Math.max(
                          ...taxes.map((t) => parseFloat(t.taxrate.toString()))
                        )
                      )
                    : "0%"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                    L
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Lowest Rate
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {taxes.length > 0
                    ? formatTaxRate(
                        Math.min(
                          ...taxes.map((t) => parseFloat(t.taxrate.toString()))
                        )
                      )
                    : "0%"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    M
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Menu Masters
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {taxes.reduce(
                    (acc, tax) => acc + (tax.menuMasters?.length || 0),
                    0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Taxes List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Taxes List
            </h3>
          </div>
          <div className="overflow-x-auto">
            {taxes.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalculatorIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No taxes found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Get started by creating your first tax configuration.
                </p>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Tax
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tax Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tax Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Menu Masters
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {taxes.map((tax) => (
                    <tr
                      key={tax.tblTaxId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                            <CalculatorIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {tax.taxname}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {tax.tblTaxId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatTaxRate(tax.taxrate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {tax.menuMasters?.length || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(tax)}
                            className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                            title="Edit tax"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tax.tblTaxId)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                            title="Delete tax"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <CRUDModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTax(null);
        }}
        title={editingTax ? "Edit Tax" : "Add New Tax"}
        size="md"
      >
        <TaxForm
          tax={editingTax}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingTax(null);
          }}
        />
      </CRUDModal>
    </DashboardLayout>
  );
}

// Tax Form Component
function TaxForm({
  tax,
  onSave,
  onCancel,
}: {
  tax?: Tax | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    taxname: "",
    taxrate: 0,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tax) {
      setFormData({
        taxname: tax.taxname || "",
        taxrate: parseFloat(tax.taxrate?.toString() || "0"),
      });
    }
  }, [tax]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tax Name *
        </label>
        <input
          type="text"
          required
          value={formData.taxname}
          onChange={(e) =>
            setFormData({ ...formData, taxname: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter tax name (e.g., Sales Tax, Food Tax)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tax Rate (%) *
        </label>
        <input
          type="number"
          required
          step="0.01"
          min="0"
          max="100"
          value={formData.taxrate}
          onChange={(e) =>
            setFormData({
              ...formData,
              taxrate: parseFloat(e.target.value) || 0,
            })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="0.00"
        />
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
          {loading ? "Saving..." : tax ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
