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
  stationGroups?: string[];
  isSyncToWeb: number;
  isSyncToLocal: number;
  storeCode: string | null;
}

interface StationFormData {
  stationname: string;
  isActive: number;
  stationGroups: string[];
}

const normalizeStationGroups = (value: unknown): string[] => {
  if (!value) return [];
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? value.split(",")
    : [];

  const unique = new Set<string>();
  for (const entry of values) {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (trimmed) unique.add(trimmed);
    }
  }

  return Array.from(unique);
};

const mapStation = (station: any): Station => ({
  ...station,
  tblStationId:
    typeof station.tblStationId === "string"
      ? station.tblStationId
      : station.tblStationId?.toString?.() ?? String(station.tblStationId),
  stationGroups: normalizeStationGroups(station.stationGroups),
});

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
      setLoading(true);
      const response = await fetch("/api/station", { cache: "no-store" });

      if (response.ok) {
        const data = await response.json();
        setStations(data.map(mapStation));
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

  const handleSave = async (formData: StationFormData) => {
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
        const mappedStation = mapStation(result);
        toast.success(
          editingStation
            ? "Station updated successfully!"
            : "Station created successfully!"
        );
        setShowModal(false);
        setEditingStation(null);
        setStations((prev) =>
          editingStation
            ? prev.map((station) =>
                station.tblStationId === mappedStation.tblStationId
                  ? mappedStation
                  : station
              )
            : [...prev, mappedStation]
        );
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
        setStations((prev) =>
          prev.filter(
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
                  header: "Groups",
                  accessor: "stationGroups",
                  cell: (station: Station) => (
                    <div className="flex flex-wrap gap-1">
                      {station.stationGroups &&
                      station.stationGroups.length > 0 ? (
                        station.stationGroups.map((group) => (
                          <span
                            key={`${station.tblStationId}-${group}`}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          >
                            {group}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">
                          None
                        </span>
                      )}
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
  onSave: (data: StationFormData) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<StationFormData>({
    stationname: "",
    isActive: 1,
    stationGroups: [],
  });

  const [loading, setLoading] = useState(false);
  const [groupInput, setGroupInput] = useState("");
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  // Fetch all stations to get unique groups
  useEffect(() => {
    const fetchAllGroups = async () => {
      try {
        const response = await fetch("/api/station", { cache: "no-store" });
        if (response.ok) {
          const stations = await response.json();
          const allStationGroups: string[] = [];

          stations.forEach((s: Station) => {
            if (s.stationGroups && Array.isArray(s.stationGroups)) {
              allStationGroups.push(...s.stationGroups);
            }
          });

          // Remove duplicates and sort
          const uniqueGroups = Array.from(new Set(allStationGroups))
            .filter((g) => g && g.trim())
            .sort();

          setAllGroups(uniqueGroups);
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };

    fetchAllGroups();
  }, []);

  useEffect(() => {
    if (station) {
      setFormData({
        stationname: station.stationname || "",
        isActive: station.isActive ?? 1,
        stationGroups: normalizeStationGroups(station.stationGroups),
      });
    } else {
      setFormData({
        stationname: "",
        isActive: 1,
        stationGroups: [],
      });
    }
    setGroupInput("");
  }, [station]);

  // Filter suggestions based on input
  useEffect(() => {
    if (groupInput.trim()) {
      const filtered = allGroups.filter(
        (group) =>
          group.toLowerCase().includes(groupInput.toLowerCase()) &&
          !formData.stationGroups.includes(group)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      // When input is empty, don't show suggestions automatically
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  }, [groupInput, allGroups, formData.stationGroups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        ...formData,
        stationGroups: normalizeStationGroups(formData.stationGroups),
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupAdd = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setFormData((prev) => {
      if (prev.stationGroups.includes(trimmed)) {
        return prev;
      }
      return {
        ...prev,
        stationGroups: [...prev.stationGroups, trimmed],
      };
    });
  };

  const handleGroupRemove = (group: string) => {
    setFormData((prev) => ({
      ...prev,
      stationGroups: prev.stationGroups.filter((item) => item !== group),
    }));
  };

  const handleGroupKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (groupInput.trim()) {
        handleGroupAdd(groupInput);
        setGroupInput("");
        setShowSuggestions(false);
      }
    } else if (e.key === "Backspace" && groupInput === "") {
      setFormData((prev) => ({
        ...prev,
        stationGroups: prev.stationGroups.slice(
          0,
          Math.max(prev.stationGroups.length - 1, 0)
        ),
      }));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleGroupAdd(suggestion);
    setGroupInput("");
    setShowSuggestions(false);
  };

  const handleGroupInputFocus = () => {
    if (groupInput.trim()) {
      // If there's input, show filtered suggestions
      const filtered = allGroups.filter(
        (group) =>
          group.toLowerCase().includes(groupInput.toLowerCase()) &&
          !formData.stationGroups.includes(group)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      // When input is empty and focused, show all available groups
      const available = allGroups.filter(
        (group) => !formData.stationGroups.includes(group)
      );
      setFilteredSuggestions(available);
      setShowSuggestions(available.length > 0);
    }
  };

  const handleGroupInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
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

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Station Groups
        </label>
        <div className="relative">
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700">
            {formData.stationGroups.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.stationGroups.map((group) => (
                  <span
                    key={group}
                    className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium px-2 py-1 rounded-full"
                  >
                    {group}
                    <button
                      type="button"
                      onClick={() => handleGroupRemove(group)}
                      className="ml-1 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                      aria-label={`Remove ${group}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={groupInput}
              onChange={(e) => setGroupInput(e.target.value)}
              onKeyDown={handleGroupKeyDown}
              onFocus={handleGroupInputFocus}
              onBlur={handleGroupInputBlur}
              placeholder="Type a group name and press Enter or select from suggestions"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Press Enter or comma to add a group. Click suggestions to select. Use
          the × icon to remove a group.
        </p>
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
