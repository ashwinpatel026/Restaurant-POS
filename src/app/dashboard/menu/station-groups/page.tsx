"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";

interface StationGroup {
  stationGroupId: number;
  groupName: string;
  colorCode?: string;
  isActive: number;
  stationGroupLists: any[];
  menuMasters: any[];
}

export default function StationGroupsPage() {
  const [stationGroups, setStationGroups] = useState<StationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    masters: 0,
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingStationGroup, setEditingStationGroup] =
    useState<StationGroup | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [groupsRes, mastersRes] = await Promise.all([
        fetch("/api/menu/station-groups"),
        fetch("/api/menu/masters"),
      ]);

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setStationGroups(groupsData);
      }

      if (mastersRes.ok) {
        const mastersData = await mastersRes.json();
        setStats((prev) => ({ ...prev, masters: mastersData.length }));
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
    setEditingStationGroup(null);
    setShowModal(true);
  };

  const handleEdit = (stationGroup: StationGroup) => {
    setEditingStationGroup(stationGroup);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const url = editingStationGroup
        ? `/api/menu/station-groups/${editingStationGroup.stationGroupId}`
        : "/api/menu/station-groups";

      const method = editingStationGroup ? "PUT" : "POST";

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
          editingStationGroup
            ? "Station Group updated successfully!"
            : "Station Group created successfully!"
        );
        setShowModal(false);
        setEditingStationGroup(null);
        fetchData(); // Refresh data
      } else {
        throw new Error("Failed to save station group");
      }
    } catch (error) {
      toast.error("Error saving station group");
      console.error("Error:", error);
    }
  };

  const handleDelete = async (stationGroupId: number) => {
    if (!confirm("Are you sure you want to delete this station group?")) return;

    try {
      const response = await fetch(
        `/api/menu/station-groups/${stationGroupId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setStationGroups(
          stationGroups.filter((sg) => sg.stationGroupId !== stationGroupId)
        );
        toast.success("Station Group deleted successfully");
      } else {
        throw new Error("Failed to delete station group");
      }
    } catch (error) {
      toast.error("Error deleting station group");
      console.error("Error:", error);
    }
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Station Groups
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage kitchen station groups for efficient order routing
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Station Group
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">G</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Groups
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stationGroups.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-semibold">A</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stationGroups.filter((sg) => sg.isActive === 1).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">M</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Menu Masters
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.masters}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Station Groups List */}
        <div className="bg-white dark:bg-gray-700 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Station Groups List
            </h3>
          </div>
          <div className="p-6">
            {stationGroups.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 dark:text-gray-300 text-2xl">
                    🏭
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No station groups found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Get started by creating your first station group.
                </p>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Station Group
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stationGroups.map((stationGroup) => (
                  <div
                    key={stationGroup.stationGroupId}
                    className="border dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{
                            backgroundColor:
                              stationGroup.colorCode || "#3B82F6",
                          }}
                        ></div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {stationGroup.groupName}
                        </h3>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          stationGroup.isActive === 1
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                        }`}
                      >
                        {stationGroup.isActive === 1 ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                        title="View station group details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(stationGroup)}
                        className="p-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                        title="Edit station group"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(stationGroup.stationGroupId)
                        }
                        className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
                        title="Delete station group"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <CRUDModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingStationGroup(null);
        }}
        title={
          editingStationGroup ? "Edit Station Group" : "Add New Station Group"
        }
        size="md"
      >
        <StationGroupForm
          stationGroup={editingStationGroup}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingStationGroup(null);
          }}
        />
      </CRUDModal>
    </DashboardLayout>
  );
}

// Station Group Form Component
function StationGroupForm({
  stationGroup,
  onSave,
  onCancel,
}: {
  stationGroup?: StationGroup | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    groupName: "",
    colorCode: "#3B82F6",
    isActive: 1,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stationGroup) {
      setFormData({
        groupName: stationGroup.groupName || "",
        colorCode: stationGroup.colorCode || "#3B82F6",
        isActive: stationGroup.isActive || 1,
      });
    }
  }, [stationGroup]);

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
          Group Name *
        </label>
        <input
          type="text"
          required
          value={formData.groupName}
          onChange={(e) =>
            setFormData({ ...formData, groupName: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Enter station group name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Color Code
        </label>
        <input
          type="color"
          value={formData.colorCode}
          onChange={(e) =>
            setFormData({ ...formData, colorCode: e.target.value })
          }
          className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isActive === 1}
            onChange={(e) =>
              setFormData({ ...formData, isActive: e.target.checked ? 1 : 0 })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
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
          {loading ? "Saving..." : stationGroup ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
