"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { PlusIcon, EyeIcon } from "@heroicons/react/24/outline";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import toast from "react-hot-toast";
import CreateOrderModal from "@/components/orders/CreateOrderModal";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600 mt-1">Manage and track all orders</p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn btn-primary"
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
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Orders Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">No orders found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {order.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.table
                        ? `Table ${order.table.tableNumber}`
                        : order.customerName || "Takeaway"}
                    </p>
                  </div>
                  <span className={`badge ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">
                      {order.orderItems.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-primary-600">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Time:</span>
                    <span className="text-gray-900">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setDetailsModalOpen(true);
                    }}
                    className="flex-1 btn btn-secondary text-sm py-2"
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
                        className="flex-1 btn btn-primary text-sm py-2"
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
