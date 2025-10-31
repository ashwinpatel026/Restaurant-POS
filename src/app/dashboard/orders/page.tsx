"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { PlusIcon, EyeIcon } from "@heroicons/react/24/outline";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import CreateOrderModal from "@/components/orders/CreateOrderModal";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  total: number;
  table?: { tableNumber: string };
  customerName?: string;
  createdAt: string;
  orderItems: { quantity: number }[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetchOrders();
    // Set up polling for real-time updates
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/orders?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
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
    { label: "Preparing", value: "PREPARING" },
    { label: "Ready", value: "READY" },
    { label: "Completed", value: "COMPLETED" },
  ];

  // Dark-mode aware status badge colors
  const badgeColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800";
      case "PREPARING":
        return "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800";
      case "READY":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800";
      case "SERVED":
        return "bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400 border border-teal-200 dark:border-teal-800";
      case "COMPLETED":
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
      case "CANCELLED":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800";
      default:
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Orders
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and track all orders
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            New Order
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
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Orders Grid */}
        {loading ? (
          <PageSkeleton />
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No orders found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {order.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.table
                        ? `Table ${order.table.tableNumber}`
                        : order.customerName || "Takeaway"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${badgeColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Items:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-200">
                      {order.orderItems.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Total:
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Time:
                    </span>
                    <span className="text-gray-900 dark:text-gray-300">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setDetailsModalOpen(true);
                    }}
                    className="flex-1 inline-flex justify-center items-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <EyeIcon className="w-4 h-4 mr-1" />
                    View
                  </button>
                  {order.status !== "COMPLETED" &&
                    order.status !== "CANCELLED" && (
                      <button
                        onClick={() => {
                          const nextStatus =
                            order.status === "PENDING"
                              ? "PREPARING"
                              : order.status === "PREPARING"
                              ? "READY"
                              : order.status === "READY"
                              ? "SERVED"
                              : "COMPLETED";
                          handleStatusUpdate(order.id, nextStatus);
                        }}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      >
                        {order.status === "PENDING" && "Start"}
                        {order.status === "PREPARING" && "Ready"}
                        {order.status === "READY" && "Serve"}
                        {order.status === "SERVED" && "Complete"}
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateOrderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchOrders}
      />

      <OrderDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onUpdate={fetchOrders}
      />
    </DashboardLayout>
  );
}
