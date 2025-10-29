"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { PlusIcon, QrCodeIcon } from "@heroicons/react/24/outline";
import { getStatusColor } from "@/lib/utils";
import toast from "react-hot-toast";
import TableModal from "@/components/tables/TableModal";
import QRCodeModal from "@/components/tables/QRCodeModal";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface Table {
  id: string;
  tableNumber: string;
  capacity: number;
  status: string;
  location: string | null;
  qrCode: string;
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/tables");
      if (response.ok) {
        const data = await response.json();
        setTables(data);
      }
    } catch (error) {
      toast.error("Failed to fetch tables");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (tableId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success("Table status updated");
        fetchTables();
      } else {
        toast.error("Failed to update table status");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const statusOptions = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Table Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage restaurant tables and seating
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedTable(null);
              setModalOpen(true);
            }}
            className="btn btn-primary"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Table
          </button>
        </div>

        {/* Tables Grid */}
        {loading ? (
          <PageSkeleton />
        ) : tables.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">
              No tables found. Add your first table to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className={`card hover:shadow-lg transition-all cursor-pointer ${
                  table.status === "OCCUPIED"
                    ? "border-2 border-red-400"
                    : table.status === "RESERVED"
                    ? "border-2 border-blue-400"
                    : table.status === "MAINTENANCE"
                    ? "border-2 border-yellow-400"
                    : "border-2 border-green-400"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Table {table.tableNumber}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {table.capacity} {table.capacity === 1 ? "seat" : "seats"}
                    </p>
                    {table.location && (
                      <p className="text-xs text-gray-500 mt-1">
                        {table.location}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTable(table);
                      setQrModalOpen(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <QrCodeIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`badge ${getStatusColor(table.status)}`}>
                      {table.status}
                    </span>
                  </div>

                  <select
                    value={table.status}
                    onChange={(e) =>
                      handleStatusChange(table.id, e.target.value)
                    }
                    className="input text-sm"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      setSelectedTable(table);
                      setModalOpen(true);
                    }}
                    className="btn btn-secondary w-full text-sm py-2"
                  >
                    Edit Table
                  </button>
                </div>
              </div>
            ))}
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
    </DashboardLayout>
  );
}
