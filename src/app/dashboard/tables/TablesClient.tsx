"use client";

import { useEffect, useState } from "react";
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
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import { usePagePermission } from "@/hooks/usePagePermission";

export interface Table {
  tableId: string | number;
  tableCode: string;
  code: string;
  tableName: string;
  seatingCapacity: number;
  status: string | null; // Free, Available, Occupied
  isActive?: number | null;
  createdOn?: string | null;
  storeCode?: string | null;
}

const normalizeStatus = (status: string | null | undefined): string => {
  if (!status) return "Free";
  const raw = String(status).trim();
  if (raw === "0" || raw.toLowerCase() === "free") return "Free";
  if (raw === "1" || raw.toLowerCase() === "available") return "Available";
  if (raw === "2" || raw.toLowerCase() === "occupied") return "Occupied";
  return "Free";
};

const getStatusColor = (status: string | null) => {
  switch (normalizeStatus(status)) {
    case "Occupied":
      return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800";
    case "Available":
      return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    default:
      return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800";
  }
};

const getBorderColor = (status: string | null): string => {
  switch (normalizeStatus(status)) {
    case "Occupied":
      return "border-2 border-red-400 dark:border-red-600";
    case "Available":
      return "border-2 border-blue-400 dark:border-blue-600";
    default:
      return "border-2 border-green-400 dark:border-green-600";
  }
};

export default function TablesClient() {
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();
  const { hasPermission, loading: permissionLoading } = usePagePermission({
    requiredPermissions: ["tables.view"],
  });

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchTables = async () => {
    if (!selectedStoreCode) {
      setTables([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(buildApiUrl("/api/dashboard/tables"), {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        const sortedData = [...list].sort((a: Table, b: Table) => {
          const dateA = new Date(a.createdOn || 0).getTime();
          const dateB = new Date(b.createdOn || 0).getTime();
          return dateB - dateA;
        });
        setTables(sortedData);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to fetch tables");
        setTables([]);
      }
    } catch (error) {
      toast.error("Failed to fetch tables");
      console.error("Error:", error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (permissionLoading || !hasPermission) return;
    fetchTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreCode, permissionLoading, hasPermission]);

  const handleStatusChange = async (
    tableId: string | number,
    newStatus: string,
  ) => {
    try {
      const response = await fetch(
        buildApiUrl(`/api/dashboard/tables/${tableId}`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );

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
      const response = await fetch(
        buildApiUrl(`/api/dashboard/tables/${tableToDelete.tableId}`),
        {
          method: "DELETE",
        },
      );

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

  if (permissionLoading || loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!hasPermission) {
    return null;
  }

  const statusOptions = ["Free", "Available", "Occupied"];

  const freeTables = tables.filter(
    (t) => normalizeStatus(t.status) === "Free",
  ).length;
  const availableTables = tables.filter(
    (t) => normalizeStatus(t.status) === "Available",
  ).length;
  const occupiedTables = tables.filter(
    (t) => normalizeStatus(t.status) === "Occupied",
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Table Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage restaurant tables and seating
              {selectedStoreCode ? ` · ${selectedStoreCode}` : ""}
            </p>
          </div>
          <div className="flex items-center space-x-3">
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
              disabled={!selectedStoreCode}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Table
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Tables
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {tables.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Free
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {freeTables}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Available
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {availableTables}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Occupied
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {occupiedTables}
            </p>
          </div>
        </div>

        {tables.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {!selectedStoreCode
                ? "Select a store to view tables."
                : "No tables found for this store. Add your first table to get started."}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((table) => (
              <div
                key={table.tableId}
                className={`${getBorderColor(
                  table.status,
                )} rounded-lg p-6 hover:shadow-lg transition-all bg-white dark:bg-gray-800`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {table.tableName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Code: {table.code}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {table.tableCode}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {table.seatingCapacity}{" "}
                      {table.seatingCapacity === 1 ? "seat" : "seats"}
                    </p>
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
                        table.status,
                      )}`}
                    >
                      {normalizeStatus(table.status)}
                    </span>
                  </div>

                  <select
                    value={normalizeStatus(table.status)}
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
                      Table Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Table Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Seats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
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
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {table.tableName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {table.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {table.tableCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {table.seatingCapacity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={normalizeStatus(table.status)}
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
          tableToDelete?.tableName
            ? tableToDelete.tableName
            : tableToDelete?.code || ""
        }
      />
    </DashboardLayout>
  );
}
