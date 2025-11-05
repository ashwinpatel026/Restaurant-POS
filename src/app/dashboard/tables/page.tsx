"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  QrCodeIcon,
  PencilIcon,
  TrashIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import TableModal from "@/components/tables/TableModal";
import QRCodeModal from "@/components/tables/QRCodeModal";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import CRUDModal from "@/components/modals/CRUDModal";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";

interface Table {
  tableId: string | number;
  tableNumber: string;
  seatingCapacity: number;
  currentOccupancy: number;
  location: string | null;
  status: number | null; // 0 = Available, 1 = Occupied, 2 = Reserved, 3 = Maintenance
  createdDate: string;
  qrCode?: string;
}

// Map status number to string
const getStatusString = (status: number | null): string => {
  switch (status) {
    case 0:
      return "AVAILABLE";
    case 1:
      return "OCCUPIED";
    case 2:
      return "RESERVED";
    case 3:
      return "MAINTENANCE";
    default:
      return "AVAILABLE";
  }
};

// Map status string to number
const getStatusNumber = (status: string): number => {
  switch (status) {
    case "OCCUPIED":
      return 1;
    case "RESERVED":
      return 2;
    case "MAINTENANCE":
      return 3;
    default:
      return 0; // AVAILABLE
  }
};

// Get status color classes
const getStatusColor = (status: number | null) => {
  const statusStr = getStatusString(status);
  switch (statusStr) {
    case "OCCUPIED":
      return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800";
    case "RESERVED":
      return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "MAINTENANCE":
      return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
    default:
      return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800";
  }
};

// Get border color based on status
const getBorderColor = (status: number | null): string => {
  const statusStr = getStatusString(status);
  switch (statusStr) {
    case "OCCUPIED":
      return "border-2 border-red-400 dark:border-red-600";
    case "RESERVED":
      return "border-2 border-blue-400 dark:border-blue-600";
    case "MAINTENANCE":
      return "border-2 border-yellow-400 dark:border-yellow-600";
    default:
      return "border-2 border-green-400 dark:border-green-600";
  }
};

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/tables");
      if (response.ok) {
        const data = await response.json();
        // Sort by createdDate descending (most recent first)
        const sortedData = data.sort((a: Table, b: Table) => {
          const dateA = new Date(a.createdDate || 0).getTime();
          const dateB = new Date(b.createdDate || 0).getTime();
          return dateB - dateA;
        });
        setTables(sortedData);
      } else {
        toast.error("Failed to fetch tables");
      }
    } catch (error) {
      toast.error("Failed to fetch tables");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    tableId: string | number,
    newStatus: string
  ) => {
    try {
      const statusNumber = getStatusNumber(newStatus);
      const response = await fetch(`/api/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusNumber }),
      });

      if (response.ok) {
        toast.success("Table status updated");
        fetchTables();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update table status");
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error("Error:", error);
    }
  };

  const handleDeleteClick = (table: Table) => {
    setTableToDelete(table);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tableToDelete) return;

    try {
      const response = await fetch(`/api/tables/${tableToDelete.tableId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Table deleted successfully");
        setTables(tables.filter((t) => t.tableId !== tableToDelete.tableId));
        setShowDeleteModal(false);
        setTableToDelete(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete table");
      }
    } catch (error) {
      toast.error("Error deleting table");
      console.error("Error:", error);
    }
  };

  const statusOptions = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"];

  const activeTables = tables.filter(
    (t) => getStatusString(t.status) === "AVAILABLE"
  ).length;
  const occupiedTables = tables.filter(
    (t) => getStatusString(t.status) === "OCCUPIED"
  ).length;
  const reservedTables = tables.filter(
    (t) => getStatusString(t.status) === "RESERVED"
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Table Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage restaurant tables and seating
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
                title="Grid View"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
                title="List View"
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => {
                setSelectedTable(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Table
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                    🪑
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Tables
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {tables.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                    ✓
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Available
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {activeTables}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 font-semibold text-sm">
                    👥
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Occupied
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {occupiedTables}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                    📅
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Reserved
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {reservedTables}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tables View */}
        {loading ? (
          <PageSkeleton />
        ) : tables.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No tables found. Add your first table to get started.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((table) => (
              <div
                key={table.tableId}
                className={`${getBorderColor(
                  table.status
                )} rounded-lg p-6 hover:shadow-lg transition-all bg-white dark:bg-gray-800`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Table {table.tableNumber}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {table.seatingCapacity}{" "}
                      {table.seatingCapacity === 1 ? "seat" : "seats"}
                    </p>
                    {table.currentOccupancy > 0 && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Currently: {table.currentOccupancy} guests
                      </p>
                    )}
                    {table.location && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        📍 {table.location}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTable(table);
                      setQrModalOpen(true);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="View QR Code"
                  >
                    <QrCodeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Status:
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                        table.status
                      )}`}
                    >
                      {getStatusString(table.status)}
                    </span>
                  </div>

                  <select
                    value={getStatusString(table.status)}
                    onChange={(e) =>
                      handleStatusChange(table.tableId, e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => {
                        setSelectedTable(table);
                        setModalOpen(true);
                      }}
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="Edit table"
                    >
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(table)}
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Delete table"
                    >
                      <TrashIcon className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Table Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Seating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Current Guests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {tables.map((table) => (
                    <tr
                      key={table.tableId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Table {table.tableNumber}
                          </h3>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {table.seatingCapacity}{" "}
                          {table.seatingCapacity === 1 ? "seat" : "seats"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {table.location || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={getStatusString(table.status)}
                          onChange={(e) =>
                            handleStatusChange(table.tableId, e.target.value)
                          }
                          className="px-3 py-1 text-xs font-medium border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {table.currentOccupancy > 0 ? (
                            <span className="text-orange-600 dark:text-orange-400">
                              {table.currentOccupancy} guests
                            </span>
                          ) : (
                            "-"
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedTable(table);
                              setQrModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="View QR Code"
                          >
                            <QrCodeIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTable(table);
                              setModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit table"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(table)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete table"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TableModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedTable(null);
        }}
        onSuccess={fetchTables}
        table={selectedTable}
      />

      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false);
          setSelectedTable(null);
        }}
        table={selectedTable}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setTableToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Table"
        itemName={
          tableToDelete?.tableNumber ? `Table ${tableToDelete.tableNumber}` : ""
        }
      />
    </DashboardLayout>
  );
}
