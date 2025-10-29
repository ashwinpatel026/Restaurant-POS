"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import DataTable from "@/components/tables/DataTable";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface Station {
  tblStationId: string;
  stationCode: string;
  stationname: string | null;
  isActive: number | null;
  isSyncToWeb: number;
  isSyncToLocal: number;
  storeCode: string | null;
}

export default function StationManagementPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stationToDelete, setStationToDelete] = useState<Station | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/station");

      if (response.ok) {
        const data = await response.json();
        setStations(data);
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

  const handleEdit = (station: Station) => {
    setEditingStation(station);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const url = editingStation
        ? `/api/station/${editingStation.tblStationId}`
        : "/api/station";

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
            ? "Station updated successfully!"
            : "Station created successfully!"
        );
        setShowModal(false);
        setEditingStation(null);
        fetchData(); // Refresh data
      } else {
        throw new Error("Failed to save station");
      }
    } catch (error) {
      toast.error("Error saving station");
      console.error("Error:", error);
    }
  };

  const handleDeleteClick = (station: Station) => {
    setStationToDelete(station);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!stationToDelete) return;

    try {
      const response = await fetch(
        `/api/station/${stationToDelete.tblStationId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setStations(
          stations.filter(
            (station) => station.tblStationId !== stationToDelete.tblStationId
          )
        );
        toast.success("Station deleted successfully");
        setShowDeleteModal(false);
        setStationToDelete(null);
      } else {
        throw new Error("Failed to delete station");
      }
    } catch (error) {
      toast.error("Error deleting station");
      console.error("Error:", error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setStationToDelete(null);
  };

  const activeStations = stations.filter((s) => s.isActive === 1).length;
  const inactiveStations = stations.filter((s) => s.isActive === 0).length;

  if (loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Station Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage stations and their configurations for your restaurant
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Station
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  {stations.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    ✓
                  </span>
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
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    ✕
                  </span>
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

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    %
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active Rate
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stations.length > 0
                    ? `${Math.round((activeStations / stations.length) * 100)}%`
                    : "0%"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stations List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Stations List
            </h3>
          </div>
          {stations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <CubeIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No stations found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by creating your first station.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Station
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "Station Name",
                  accessor: "stationname",
                  cell: (station: Station) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <CubeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {station.stationname || "-"}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (station: Station) => (
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        station.isActive === 1
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {station.isActive === 1 ? "Active" : "Inactive"}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "tblStationId",
                  sortable: false,
                  cell: (station: Station) => (
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
              data={stations}
              keyExtractor={(station: Station) =>
                station.tblStationId.toString()
              }
              searchPlaceholder="Search stations..."
              emptyMessage="No stations found"
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
        title={editingStation ? "Edit Station" : "Add New Station"}
        size="md"
      >
        <StationForm
          station={editingStation}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingStation(null);
          }}
        />
      </CRUDModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Station"
        itemName={stationToDelete?.stationname || ""}
      />
    </DashboardLayout>
  );
}

// Station Form Component
function StationForm({
  station,
  onSave,
  onCancel,
}: {
  station?: Station | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    stationname: "",
    isActive: 1,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (station) {
      setFormData({
        stationname: station.stationname || "",
        isActive: station.isActive ?? 1,
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
          value={formData.stationname}
          onChange={(e) =>
            setFormData({ ...formData, stationname: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter station name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Status *
        </label>
        <select
          value={formData.isActive}
          onChange={(e) =>
            setFormData({ ...formData, isActive: parseInt(e.target.value) })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={1}>Active</option>
          <option value={0}>Inactive</option>
        </select>
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
          {loading ? "Saving..." : station ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
