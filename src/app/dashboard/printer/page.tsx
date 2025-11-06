"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PrinterIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import DataTable from "@/components/tables/DataTable";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface Printer {
  printerId: number;
  printerCode: string;
  printerName: string;
  isActive: number;
  createdBy?: number;
  createdOn?: string;
  isSyncMysql?: number;
  storeCode?: string;
}

export default function PrinterManagementPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [printerToDelete, setPrinterToDelete] = useState<Printer | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/printer");

      if (response.ok) {
        const data = await response.json();
        setPrinters(data);
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
    setEditingPrinter(null);
    setShowModal(true);
  };

  const handleEdit = (printer: Printer) => {
    setEditingPrinter(printer);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const url = editingPrinter
        ? `/api/printer/${editingPrinter.printerId}`
        : "/api/printer";

      const method = editingPrinter ? "PUT" : "POST";

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
          editingPrinter
            ? "Printer updated successfully!"
            : "Printer created successfully!"
        );
        setShowModal(false);
        setEditingPrinter(null);
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save printer");
      }
    } catch (error: any) {
      toast.error(error.message || "Error saving printer");
      console.error("Error:", error);
    }
  };

  const handleDeleteClick = (printer: Printer) => {
    setPrinterToDelete(printer);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!printerToDelete) return;

    try {
      const response = await fetch(
        `/api/printer/${printerToDelete.printerId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setPrinters(
          printers.filter(
            (printer) => printer.printerId !== printerToDelete.printerId
          )
        );
        toast.success("Printer deleted successfully");
        setShowDeleteModal(false);
        setPrinterToDelete(null);
      } else {
        throw new Error("Failed to delete printer");
      }
    } catch (error) {
      toast.error("Error deleting printer");
      console.error("Error:", error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setPrinterToDelete(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  const activePrinters = printers.filter((p) => p.isActive === 1).length;
  const inactivePrinters = printers.filter((p) => p.isActive === 0).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Printer Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage printers for your restaurant
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Printer
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <PrinterIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Printers
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {printers.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {activePrinters}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Inactive
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {inactivePrinters}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Printers List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Printers List
            </h3>
          </div>
          {printers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <PrinterIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No printers found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by adding your first printer.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Printer
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "#",
                  accessor: "printerId",
                  sortable: false,
                  cell: (printer: Printer, index?: number) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {(index ?? 0) + 1}
                        </span>
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Printer Name",
                  accessor: "printerName",
                  cell: (printer: Printer) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <PrinterIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {printer.printerName}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (printer: Printer) => (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        printer.isActive === 1
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {printer.isActive === 1 ? (
                        <>
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "printerId",
                  sortable: false,
                  cell: (printer: Printer) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(printer)}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                        title="Edit printer"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(printer)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete printer"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={printers}
              keyExtractor={(printer: Printer) => printer.printerId.toString()}
              searchPlaceholder="Search printers..."
              emptyMessage="No printers found"
            />
          )}
        </div>
      </div>

      {/* Modal */}
      <CRUDModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingPrinter(null);
        }}
        title={editingPrinter ? "Edit Printer" : "Add New Printer"}
        size="md"
      >
        <PrinterForm
          printer={editingPrinter}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingPrinter(null);
          }}
        />
      </CRUDModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Printer"
        itemName={printerToDelete?.printerName || ""}
      />
    </DashboardLayout>
  );
}

// Printer Form Component
function PrinterForm({
  printer,
  onSave,
  onCancel,
}: {
  printer?: Printer | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    printerName: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (printer) {
      setFormData({
        printerName: printer.printerName || "",
        isActive: printer.isActive === 1,
      });
    }
  }, [printer]);

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
          Printer Name *
        </label>
        <input
          type="text"
          required
          value={formData.printerName}
          onChange={(e) =>
            setFormData({ ...formData, printerName: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter printer name (e.g., Kitchen Printer)"
        />
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) =>
              setFormData({ ...formData, isActive: e.target.checked })
            }
            className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Active
          </span>
        </label>
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
          {loading ? "Saving..." : printer ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
