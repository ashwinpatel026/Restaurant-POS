"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { PlusIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { getStatusColor } from "@/lib/utils";
import toast from "react-hot-toast";

interface InventoryItem {
  id: string;
  rawMaterial: {
    id: string;
    name: string;
    unit: string;
    reorderLevel: number;
  };
  quantity: number;
  status: string;
  lastRestocked: string | null;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetchInventory();
  }, [filter]);

  const fetchInventory = async () => {
    try {
      const response = await fetch(`/api/inventory?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      }
    } catch (error) {
      toast.error("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  const filterOptions = [
    { label: "All Items", value: "ALL" },
    { label: "In Stock", value: "IN_STOCK" },
    { label: "Low Stock", value: "LOW_STOCK" },
    { label: "Out of Stock", value: "OUT_OF_STOCK" },
  ];

  const lowStockItems = inventory.filter(
    (item) => item.status === "LOW_STOCK" || item.status === "OUT_OF_STOCK"
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Inventory Management
            </h1>
            <p className="text-gray-600 mt-1">
              Track and manage raw materials inventory
            </p>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Low Stock Alert</h3>
              <p className="text-sm text-red-700 mt-1">
                {lowStockItems.length} item
                {lowStockItems.length !== 1 ? "s" : ""} need restocking
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === option.value
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Inventory Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : inventory.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">No inventory items found</p>
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Current Stock</th>
                    <th>Reorder Level</th>
                    <th>Unit</th>
                    <th>Status</th>
                    <th>Last Restocked</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.rawMaterial.name}</td>
                      <td>
                        <span
                          className={`font-semibold ${
                            Number(item.quantity) <=
                            Number(item.rawMaterial.reorderLevel)
                              ? "text-red-600"
                              : "text-gray-900"
                          }`}
                        >
                          {Number(item.quantity).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        {Number(item.rawMaterial.reorderLevel).toFixed(2)}
                      </td>
                      <td className="text-gray-600">{item.rawMaterial.unit}</td>
                      <td>
                        <span
                          className={`badge ${getStatusColor(item.status)}`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="text-gray-600">
                        {item.lastRestocked
                          ? new Date(item.lastRestocked).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td>
                        <button className="text-primary-600 hover:text-primary-800 font-medium text-sm">
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
