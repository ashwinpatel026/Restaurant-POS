"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { PlusIcon } from "@heroicons/react/24/outline";
import { formatDate, getStatusColor } from "@/lib/utils";
import toast from "react-hot-toast";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface SupplyOrder {
  id: string;
  orderNumber: string;
  status: string;
  requestedDate: string;
  deliveryDate: string | null;
  outlet: {
    name: string;
    code: string;
  };
  items: {
    rawMaterial: {
      name: string;
      unit: string;
    };
    quantity: number;
    receivedQty: number;
  }[];
}

export default function CentralKitchenPage() {
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const response = await fetch(
        `/api/central-kitchen/orders?status=${filter}`
      );
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      toast.error("Failed to fetch supply orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/central-kitchen/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success("Order status updated");
        fetchOrders();
      } else {
        toast.error("Failed to update order");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const filterOptions = [
    { label: "All Orders", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Preparing", value: "PREPARING" },
    { label: "Dispatched", value: "DISPATCHED" },
    { label: "Delivered", value: "DELIVERED" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Central Kitchen
            </h1>
            <p className="text-gray-600 mt-1">
              Manage supply orders from outlets to central kitchen
            </p>
          </div>
          <button className="btn btn-primary">
            <PlusIcon className="w-5 h-5 mr-2" />
            New Supply Order
          </button>
        </div>

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

        {/* Orders List */}
        {loading ? (
          <PageSkeleton />
        ) : orders.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">No supply orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {order.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.outlet.name} ({order.outlet.code})
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Requested: {formatDate(order.requestedDate)}
                    </p>
                  </div>
                  <span className={`badge ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                {/* Items List */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Items:</h4>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-700">
                          {item.rawMaterial.name}
                        </span>
                        <span className="font-medium">
                          {Number(item.quantity).toFixed(2)}{" "}
                          {item.rawMaterial.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                {order.status !== "DELIVERED" &&
                  order.status !== "CANCELLED" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const nextStatus =
                            order.status === "PENDING"
                              ? "CONFIRMED"
                              : order.status === "CONFIRMED"
                              ? "PREPARING"
                              : order.status === "PREPARING"
                              ? "DISPATCHED"
                              : "DELIVERED";
                          handleStatusUpdate(order.id, nextStatus);
                        }}
                        className="btn btn-primary flex-1 text-sm"
                      >
                        {order.status === "PENDING" && "Confirm"}
                        {order.status === "CONFIRMED" && "Start Preparing"}
                        {order.status === "PREPARING" && "Mark Dispatched"}
                        {order.status === "DISPATCHED" && "Mark Delivered"}
                      </button>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
