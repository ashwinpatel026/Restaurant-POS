"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import DataTable from "@/components/tables/DataTable";

interface PrepStation {
  prepStationId: number;
  prepStationCode: string;
  prepStationName: string;
  stationId?: number;
  isActive: number;
  sendToExpediter?: number;
  alwaysPrintTicket?: number;
  printerCode?: string;
  createdBy?: number;
  createdOn?: string;
  updatedBy?: number;
  updatedOn?: string;
  isSyncMysql?: number;
  storeCode?: string;
}

interface Printer {
  printerId: number;
  printerCode: string;
  printerName: string;
}

export default function PreparationStationPage() {
  const [prepStations, setPrepStations] = useState<PrepStation[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingStation, setEditingStation] = useState<PrepStation | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stationToDelete, setStationToDelete] = useState<PrepStation | null>(
    null
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stationsRes, printersRes] = await Promise.all([
        fetch("/api/menu/station-groups"),
        fetch("/api/printer"),
      ]);

      if (stationsRes.ok) {
        const data = await stationsRes.json();
        setPrepStations(data);
      }

      if (printersRes.ok) {
        const data = await printersRes.json();
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
    setEditingStation(null);
    setShowModal(true);
  };

  const handleEdit = (station: PrepStation) => {
    setEditingStation(station);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const url = editingStation
        ? `/api/menu/station-groups/${editingStation.prepStationId}`
        : "/api/menu/station-groups";

      const method = editingStation ? "PUT" : "POST";

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
          editingStation
            ? "Preparation Station updated successfully!"
            : "Preparation Station created successfully!"
        );
        setShowModal(false);
        setEditingStation(null);
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to save preparation station"
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Error saving preparation station");
      console.error("Error:", error);
    }
  };

  const handleDeleteClick = (station: PrepStation) => {
    setStationToDelete(station);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!stationToDelete) return;

    try {
      const response = await fetch(
        `/api/menu/station-groups/${stationToDelete.prepStationId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setPrepStations(
          prepStations.filter(
            (station) => station.prepStationId !== stationToDelete.prepStationId
          )
        );
        toast.success("Preparation Station deleted successfully");
        setShowDeleteModal(false);
        setStationToDelete(null);
      } else {
        throw new Error("Failed to delete preparation station");
      }
    } catch (error) {
      toast.error("Error deleting preparation station");
      console.error("Error:", error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setStationToDelete(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const activeStations = prepStations.filter((s) => s.isActive === 1).length;
  const inactiveStations = prepStations.filter((s) => s.isActive === 0).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Prep Station Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage preparation stations for your kitchen
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Preparation Station
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <CubeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Stations
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {prepStations.length}
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
                  {activeStations}
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
                  {inactiveStations}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preparation Stations List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Preparation Stations List
            </h3>
          </div>
          {prepStations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <CubeIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No preparation stations found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by adding your first preparation station.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Preparation Station
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "#",
                  accessor: "prepStationId",
                  sortable: false,
                  cell: (station: PrepStation, index?: number) => (
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
                  header: "Station Name",
                  accessor: "prepStationName",
                  cell: (station: PrepStation) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <CubeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {station.prepStationName}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Printer",
                  accessor: "printerCode",
                  cell: (station: PrepStation) => (
                    <div className="text-sm text-gray-900 dark:text-white">
                      {station.printerCode ? (
                        <div className="flex items-center">
                          <PrinterIcon className="w-4 h-4 mr-2 text-gray-400" />
                          {printers.find(
                            (p) => p.printerCode === station.printerCode
                          )?.printerName || station.printerCode}
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </div>
                  ),
                },
                {
                  header: "Send to Expediter",
                  accessor: "sendToExpediter",
                  cell: (station: PrepStation) => (
                    <div className="flex items-center justify-center">
                      {station.sendToExpediter === 1 ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircleIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                  ),
                },
                {
                  header: "Always Print",
                  accessor: "alwaysPrintTicket",
                  cell: (station: PrepStation) => (
                    <div className="flex items-center justify-center">
                      {station.alwaysPrintTicket === 1 ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircleIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                  ),
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (station: PrepStation) => (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        station.isActive === 1
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {station.isActive === 1 ? (
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
                  accessor: "prepStationId",
                  sortable: false,
                  cell: (station: PrepStation) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(station)}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                        title="Edit station"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(station)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete station"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={prepStations}
              keyExtractor={(station: PrepStation) =>
                station.prepStationId.toString()
              }
              searchPlaceholder="Search preparation stations..."
              emptyMessage="No preparation stations found"
            />
          )}
        </div>
      </div>

      {/* Modal */}
      <CRUDModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingStation(null);
        }}
        title={
          editingStation
            ? "Edit Preparation Station"
            : "Add New Preparation Station"
        }
        size="md"
      >
        <PrepStationForm
          station={editingStation}
          printers={printers}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingStation(null);
          }}
        />
      </CRUDModal>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-700">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
                <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-2">
                Delete Preparation Station
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete the station "
                  {stationToDelete?.prepStationName}"? This action cannot be
                  undone.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={handleDeleteCancel}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// Prep Station Form Component
function PrepStationForm({
  station,
  printers,
  onSave,
  onCancel,
}: {
  station?: PrepStation | null;
  printers: Printer[];
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    prepStationName: "",
    stationId: "",
    sendToExpediter: false,
    alwaysPrintTicket: false,
    printerCode: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (station) {
      setFormData({
        prepStationName: station.prepStationName || "",
        stationId: station.stationId?.toString() || "",
        sendToExpediter: station.sendToExpediter === 1,
        alwaysPrintTicket: station.alwaysPrintTicket === 1,
        printerCode: station.printerCode || "",
        isActive: station.isActive === 1,
      });
    }
  }, [station]);

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
          Station Name *
        </label>
        <input
          type="text"
          required
          value={formData.prepStationName}
          onChange={(e) =>
            setFormData({ ...formData, prepStationName: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter station name (e.g., Grill Station)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Printer
        </label>
        <select
          value={formData.printerCode}
          onChange={(e) =>
            setFormData({ ...formData, printerCode: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">No printer assigned</option>
          {printers
            .filter((p) => p.isActive === 1)
            .map((printer) => (
              <option key={printer.printerId} value={printer.printerCode}>
                {printer.printerName}
              </option>
            ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.sendToExpediter}
              onChange={(e) =>
                setFormData({ ...formData, sendToExpediter: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Send to Expediter
            </span>
          </label>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.alwaysPrintTicket}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  alwaysPrintTicket: e.target.checked,
                })
              }
              className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Always Print Ticket
            </span>
          </label>
        </div>
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

      {!station && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            ℹ️ Station code will be automatically generated (e.g., W001, W002,
            W003...)
          </p>
        </div>
      )}

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
          {loading ? "Saving..." : station ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
