"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import toast from "react-hot-toast";

interface QROrder {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  total: number;
  table: { tableNumber: string };
  customerName: string;
  createdAt: string;
}

export default function QROrdersPage() {
  const [orders, setOrders] = useState<QROrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(
        "/api/orders?type=QR_ORDER&status=PENDING,CONFIRMED"
      );
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching QR orders:", error);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">QR Orders</h1>
          <p className="text-gray-600 mt-1">
            Manage orders placed via QR code scanning
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">No pending QR orders</p>
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
                      Table {order.table.tableNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      {order.customerName}
                    </p>
                  </div>
                  <span className={`badge ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-primary-600">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Time:</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {order.status === "PENDING" && (
                    <>
                      <button
                        onClick={() =>
                          handleStatusUpdate(order.id, "CONFIRMED")
                        }
                        className="flex-1 btn btn-primary text-sm py-2"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() =>
                          handleStatusUpdate(order.id, "CANCELLED")
                        }
                        className="flex-1 btn btn-danger text-sm py-2"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {order.status === "CONFIRMED" && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, "PREPARING")}
                      className="flex-1 btn btn-primary text-sm py-2"
                    >
                      Start Preparing
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
