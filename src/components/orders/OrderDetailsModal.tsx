"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onUpdate: () => void;
}

export default function OrderDetailsModal({
  isOpen,
  onClose,
  order,
  onUpdate,
}: OrderDetailsModalProps) {
  if (!order) return null;

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <Dialog.Title className="text-2xl font-bold text-gray-900">
                      {order.orderNumber}
                    </Dialog.Title>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span
                        className={`badge ${getStatusColor(order.status)} mt-1`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Order Type</p>
                      <p className="font-medium">
                        {order.orderType.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Table</p>
                      <p className="font-medium">
                        {order.table
                          ? `Table ${order.table.tableNumber}`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer</p>
                      <p className="font-medium">
                        {order.customerName || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Order Items
                    </h3>
                    <div className="space-y-2">
                      {order.orderItems?.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              {item.menuItem?.name || "Unknown Item"}
                            </p>
                            <p className="text-sm text-gray-600">
                              Qty: {item.quantity} ×{" "}
                              {formatCurrency(item.price)}
                            </p>
                          </div>
                          <p className="font-semibold text-primary-600">
                            {formatCurrency(Number(item.price) * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-medium">
                        {formatCurrency(order.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span className="font-medium">
                        {formatCurrency(order.tax)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Discount:</span>
                      <span className="font-medium">
                        {formatCurrency(order.discount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                      <span>Total:</span>
                      <span className="text-primary-600">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={onClose}
                    className="btn btn-secondary flex-1"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="btn btn-primary flex-1"
                  >
                    Print Receipt
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
