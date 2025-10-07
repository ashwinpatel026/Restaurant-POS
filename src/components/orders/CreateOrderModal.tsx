"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { formatCurrency, calculateTax } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  isVeg: boolean;
}

interface Category {
  id: string;
  name: string;
  menuItems: MenuItem[];
}

interface Table {
  id: string;
  tableNumber: string;
}

interface OrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  price: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOrderModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateOrderModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderType, setOrderType] = useState("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const [menuRes, tablesRes] = await Promise.all([
        fetch("/api/menu"),
        fetch("/api/tables?status=AVAILABLE"),
      ]);

      if (menuRes.ok) {
        const menuData = await menuRes.json();
        setCategories(menuData);
      }

      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(tablesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const addItem = (item: MenuItem) => {
    const existingItem = orderItems.find((oi) => oi.menuItemId === item.id);

    if (existingItem) {
      setOrderItems(
        orderItems.map((oi) =>
          oi.menuItemId === item.id ? { ...oi, quantity: oi.quantity + 1 } : oi
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          menuItemId: item.id,
          menuItemName: item.name,
          quantity: 1,
          price: item.price,
        },
      ]);
    }
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setOrderItems(
      orderItems
        .map((item) => {
          if (item.menuItemId === menuItemId) {
            const newQuantity = item.quantity + delta;
            return { ...item, quantity: Math.max(0, newQuantity) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (menuItemId: string) => {
    setOrderItems(orderItems.filter((item) => item.menuItemId !== menuItemId));
  };

  const calculateTotal = () => {
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = calculateTax(subtotal);
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    if (orderType === "DINE_IN" && !selectedTableId) {
      toast.error("Please select a table");
      return;
    }

    setLoading(true);

    try {
      const { subtotal, tax, total } = calculateTotal();

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          tableId: orderType === "DINE_IN" ? selectedTableId : null,
          customerName: orderType !== "DINE_IN" ? customerName : null,
          customerPhone: orderType !== "DINE_IN" ? customerPhone : null,
          items: orderItems.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal,
          tax,
          total,
        }),
      });

      if (response.ok) {
        toast.success("Order created successfully");
        onSuccess();
        onClose();
        // Reset form
        setOrderItems([]);
        setSelectedTableId("");
        setCustomerName("");
        setCustomerPhone("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create order");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotal();

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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                <div className="flex h-[80vh]">
                  {/* Menu Items */}
                  <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <Dialog.Title className="text-xl font-bold text-gray-900">
                        Create Order
                      </Dialog.Title>
                    </div>

                    {/* Order Type Selection */}
                    <div className="mb-6">
                      <label className="label">Order Type</label>
                      <select
                        className="input"
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value)}
                      >
                        <option value="DINE_IN">Dine In</option>
                        <option value="TAKEAWAY">Takeaway</option>
                        <option value="DELIVERY">Delivery</option>
                      </select>
                    </div>

                    {orderType === "DINE_IN" && (
                      <div className="mb-6">
                        <label className="label">Table</label>
                        <select
                          className="input"
                          value={selectedTableId}
                          onChange={(e) => setSelectedTableId(e.target.value)}
                          required
                        >
                          <option value="">Select a table</option>
                          {tables.map((table) => (
                            <option key={table.id} value={table.id}>
                              Table {table.tableNumber}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {orderType !== "DINE_IN" && (
                      <div className="mb-6 space-y-3">
                        <div>
                          <label className="label">Customer Name</label>
                          <input
                            type="text"
                            className="input"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label">Customer Phone</label>
                          <input
                            type="tel"
                            className="input"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Menu Categories */}
                    <div className="space-y-6">
                      {categories.map((category) => (
                        <div key={category.id}>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            {category.name}
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {category.menuItems.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => addItem(item)}
                                className="text-left p-3 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">
                                    {item.name}
                                  </span>
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      item.isVeg ? "bg-green-500" : "bg-red-500"
                                    }`}
                                  />
                                </div>
                                <span className="text-primary-600 font-semibold text-sm">
                                  {formatCurrency(item.price)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="w-96 p-6 bg-gray-50 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">
                        Order Summary
                      </h3>
                      <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                      {orderItems.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                          No items added
                        </p>
                      ) : (
                        orderItems.map((item) => (
                          <div
                            key={item.menuItemId}
                            className="bg-white p-3 rounded-lg"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-medium text-sm flex-1">
                                {item.menuItemName}
                              </span>
                              <button
                                onClick={() => removeItem(item.menuItemId)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() =>
                                    updateQuantity(item.menuItemId, -1)
                                  }
                                  className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                                >
                                  <MinusIcon className="w-4 h-4" />
                                </button>
                                <span className="font-medium w-8 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(item.menuItemId, 1)
                                  }
                                  className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                                >
                                  <PlusIcon className="w-4 h-4" />
                                </button>
                              </div>
                              <span className="font-semibold text-primary-600">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-300">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-medium">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax (18%):</span>
                        <span className="font-medium">
                          {formatCurrency(tax)}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                        <span>Total:</span>
                        <span className="text-primary-600">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={loading || orderItems.length === 0}
                      className="btn btn-primary w-full mt-4"
                    >
                      {loading ? "Creating..." : "Create Order"}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
