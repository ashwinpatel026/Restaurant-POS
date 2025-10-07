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
import MenuMasterForm from "@/components/forms/MenuMasterForm";

interface MenuMaster {
  tblMenuMasterId: number;
  name: string;
  labelName?: string;
  colorCode?: string;
  isActive: number;
  stationGroupId?: number;
  taxId?: number;
  availabilityId?: number;
}

interface StationGroup {
  stationGroupId: number;
  groupName: string;
  isActive: number;
}

interface Availability {
  availabilityId: number;
  avaiDays?: string;
  avilTime?: string;
}

interface Tax {
  tblTaxId: number;
  taxname: string;
  taxrate: number;
}

export default function MenuMastersPage() {
  const [menuMasters, setMenuMasters] = useState<MenuMaster[]>([]);
  const [stationGroups, setStationGroups] = useState<StationGroup[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    categories: 0,
    items: 0,
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingMaster, setEditingMaster] = useState<MenuMaster | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStationGroup, setSelectedStationGroup] = useState("");
  const [selectedTax, setSelectedTax] = useState("");
  const [filteredMasters, setFilteredMasters] = useState<MenuMaster[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  // Filter effect
  useEffect(() => {
    applyFilters();
  }, [menuMasters, searchTerm, selectedStationGroup, selectedTax]);

  const applyFilters = () => {
    let filtered = [...menuMasters];

    // Search by name
    if (searchTerm) {
      filtered = filtered.filter((master) =>
        master.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by station group
    if (selectedStationGroup) {
      filtered = filtered.filter(
        (master) => master.stationGroupId === parseInt(selectedStationGroup)
      );
    }

    // Filter by tax
    if (selectedTax) {
      filtered = filtered.filter(
        (master) => master.taxId === parseInt(selectedTax)
      );
    }

    setFilteredMasters(filtered);
  };

  // Helper function to get station group name by ID
  const getStationGroupName = (stationGroupId?: number) => {
    if (!stationGroupId) return "None";
    const group = stationGroups.find(
      (g) => g.stationGroupId === stationGroupId
    );
    return group?.groupName || "Unknown";
  };

  // Helper function to get tax name by ID
  const getTaxName = (taxId?: number) => {
    if (!taxId) return "None";
    const tax = taxes.find((t) => t.tblTaxId === taxId);
    return tax?.taxname || "Unknown";
  };

  // Helper function to get availability details by ID
  const getAvailabilityDetails = (availabilityId?: number) => {
    if (!availabilityId) return "None";
    const avail = availability.find((a) => a.availabilityId === availabilityId);
    if (!avail) return "Unknown";

    const days = avail.avaiDays || "All Days";
    const time = avail.avilTime || "All Times";
    return `${days} - ${time}`;
  };

  const fetchData = async () => {
    try {
      const [
        mastersRes,
        groupsRes,
        availRes,
        taxesRes,
        categoriesRes,
        itemsRes,
      ] = await Promise.all([
        fetch("/api/menu/masters"),
        fetch("/api/menu/station-groups"),
        fetch("/api/menu/availability"),
        fetch("/api/tax"),
        fetch("/api/menu/categories"),
        fetch("/api/menu/items"),
      ]);

      if (mastersRes.ok) {
        const mastersData = await mastersRes.json();
        setMenuMasters(mastersData);
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setStationGroups(groupsData);
      }

      if (availRes.ok) {
        const availData = await availRes.json();
        setAvailability(availData);
      }

      if (taxesRes.ok) {
        const taxesData = await taxesRes.json();
        setTaxes(taxesData);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setStats((prev) => ({ ...prev, categories: categoriesData.length }));
      }

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setStats((prev) => ({ ...prev, items: itemsData.length }));
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
    setEditingMaster(null);
    setShowModal(true);
  };

  const handleEdit = (master: MenuMaster) => {
    setEditingMaster(master);
    setShowModal(true);
  };

  const handleSave = (savedMaster: MenuMaster) => {
    if (editingMaster) {
      setMenuMasters(
        menuMasters.map((master) =>
          master.tblMenuMasterId === savedMaster.tblMenuMasterId
            ? savedMaster
            : master
        )
      );
    } else {
      setMenuMasters([savedMaster, ...menuMasters]);
    }
    setShowModal(false);
    setEditingMaster(null);
    fetchData(); // Refresh data
  };

  const handleDelete = (masterId: number) => {
    setDeletingId(masterId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/menu/masters/${deletingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMenuMasters(
          menuMasters.filter((master) => master.tblMenuMasterId !== deletingId)
        );
        toast.success("Menu master deleted successfully");
      } else {
        throw new Error("Failed to delete menu master");
      }
    } catch (error) {
      toast.error("Error deleting menu master");
      console.error("Error:", error);
    } finally {
      setShowConfirmModal(false);
      setDeletingId(null);
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
              Menu Masters
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your restaurant menu masters and configurations
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Menu Master
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search by Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search by Menu Master Name
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter menu master name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Station Group Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Station Group
              </label>
              <select
                value={selectedStationGroup}
                onChange={(e) => setSelectedStationGroup(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Station Groups</option>
                {stationGroups.map((group) => (
                  <option
                    key={group.stationGroupId}
                    value={group.stationGroupId}
                  >
                    {group.groupName}
                  </option>
                ))}
              </select>
            </div>

            {/* Tax Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tax
              </label>
              <select
                value={selectedTax}
                onChange={(e) => setSelectedTax(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Taxes</option>
                {taxes.map((tax) => (
                  <option key={tax.tblTaxId} value={tax.tblTaxId}>
                    {tax.taxname}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedStationGroup("");
                setSelectedTax("");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    M
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Masters
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {filteredMasters.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    A
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {filteredMasters.filter((m) => m.isActive === 1).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                    C
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Categories
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.categories}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    I
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Items
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.items}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Masters List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Menu Masters List ({filteredMasters.length})
            </h3>
          </div>
          <div className="p-6">
            {filteredMasters.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 dark:text-gray-500 text-2xl">
                    📋
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {menuMasters.length === 0
                    ? "No menu masters found"
                    : "No menu masters match your filters"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {menuMasters.length === 0
                    ? "Get started by creating your first menu master."
                    : "Try adjusting your search criteria or clear the filters."}
                </p>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Menu Master
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMasters.map((master) => (
                  <div
                    key={master.tblMenuMasterId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-700"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{
                            backgroundColor: master.colorCode || "#3B82F6",
                          }}
                        ></div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {master.name}
                        </h3>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          master.isActive === 1
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                        }`}
                      >
                        {master.isActive === 1 ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <p>
                        <strong>Label:</strong> {master.labelName || "N/A"}
                      </p>
                      <p>
                        <strong>Station Group:</strong>{" "}
                        {getStationGroupName(master.stationGroupId)}
                      </p>
                      <p>
                        <strong>Tax:</strong> {getTaxName(master.taxId)}
                      </p>
                      {master.availabilityId && (
                        <p>
                          <strong>Availability:</strong>{" "}
                          {getAvailabilityDetails(master.availabilityId)}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                        title="View menu master details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(master)}
                        className="p-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                        title="Edit menu master"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(master.tblMenuMasterId)}
                        className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
                        title="Delete menu master"
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
          setEditingMaster(null);
        }}
        title={editingMaster ? "Edit Menu Master" : "Add New Menu Master"}
        size="lg"
      >
        <MenuMasterForm
          menuMaster={editingMaster}
          stationGroups={stationGroups}
          availability={availability}
          taxes={taxes}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingMaster(null);
          }}
        />
      </CRUDModal>

      {/* Confirmation Modal */}
      <CRUDModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setDeletingId(null);
        }}
        title="Confirm Delete"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
              <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Delete Menu Master
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete this menu master? This action
                cannot be undone and will affect all related categories and menu
                items.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowConfirmModal(false);
                setDeletingId(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </CRUDModal>
    </DashboardLayout>
  );
}
