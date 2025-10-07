"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  table?: any;
}

export default function TableModal({
  isOpen,
  onClose,
  onSuccess,
  table,
}: TableModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tableNumber: "",
    capacity: "4",
    location: "",
  });

  useEffect(() => {
    if (table) {
      setFormData({
        tableNumber: table.tableNumber,
        capacity: table.capacity.toString(),
        location: table.location || "",
      });
    } else {
      setFormData({
        tableNumber: "",
        capacity: "4",
        location: "",
      });
    }
  }, [table]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = table ? `/api/tables/${table.id}` : "/api/tables";
      const method = table ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(formData.capacity),
        }),
      });

      if (response.ok) {
        toast.success(
          table ? "Table updated successfully" : "Table created successfully"
        );
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save table");
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
                    {table ? "Edit Table" : "Add Table"}
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
                    <label className="label">Table Number</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={formData.tableNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tableNumber: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="label">Capacity (seats)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="input"
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData({ ...formData, capacity: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="label">Location</label>
                    <select
                      className="input"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                    >
                      <option value="">Select location</option>
                      <option value="Indoor">Indoor</option>
                      <option value="Outdoor">Outdoor</option>
                      <option value="Patio">Patio</option>
                      <option value="VIP">VIP</option>
                    </select>
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
                      {loading ? "Saving..." : table ? "Update" : "Create"}
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
