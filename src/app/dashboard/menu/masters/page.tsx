"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface MenuMaster {
  menuMasterId: string;
  menuMasterCode: string;
  name: string;
  labelName?: string;
  colorCode?: string;
  isActive: number;
  prepZoneCode?: string;
  isEventMenu?: number;
}

interface PrepZone {
  prepZoneId: string;
  prepZoneName: string | null;
  prepZoneCode: string;
  isActive: number;
}

export default function MenuMastersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuMasters, setMenuMasters] = useState<MenuMaster[]>([]);
  const [prepZones, setPrepZones] = useState<PrepZone[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastRefreshRef = useRef<string | null>(null);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPrepZone, setSelectedPrepZone] = useState("");
  const [selectedEventMenu, setSelectedEventMenu] = useState("");
  const [filteredMasters, setFilteredMasters] = useState<MenuMaster[]>([]);

  // View mode state
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  useEffect(() => {
    fetchData();
  }, []);

  // Refetch when refresh parameter is present (only once per refresh token)
  useEffect(() => {
    const refreshToken = searchParams.get("refresh");
    if (
      pathname === "/dashboard/menu/masters" &&
      refreshToken &&
      refreshToken !== lastRefreshRef.current &&
      !fetchingRef.current
    ) {
      lastRefreshRef.current = refreshToken;
      fetchData();
      // Clean up the refresh parameter after a delay to avoid re-triggering
      setTimeout(() => {
        router.replace("/dashboard/menu/masters", { scroll: false });
      }, 100);
    }
  }, [pathname, searchParams, router]);

  // Filter effect
  useEffect(() => {
    applyFilters();
  }, [menuMasters, searchTerm, selectedPrepZone, selectedEventMenu]);

  const applyFilters = () => {
    let filtered = [...menuMasters];

    // Search by name
    if (searchTerm) {
      filtered = filtered.filter((master) =>
        master.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by prep zone
    if (selectedPrepZone) {
      filtered = filtered.filter(
        (master) => master.prepZoneCode === selectedPrepZone
      );
    }

    // Filter by event menu
    if (selectedEventMenu) {
      const isEvent = selectedEventMenu === "event";
      filtered = filtered.filter(
        (master) => master.isEventMenu === (isEvent ? 1 : 0)
      );
    }

    setFilteredMasters(filtered);
  };

  // Helper function to get prep zone name by code
  const getPrepZoneName = (prepZoneCode?: string) => {
    if (!prepZoneCode) return "None";
    const zone = prepZones.find((g) => g.prepZoneCode === prepZoneCode);
    return zone?.prepZoneName || "Unknown";
  };

  const fetchData = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const [mastersRes, prepZonesRes] = await Promise.all([
        fetch("/api/menu/masters", { cache: "no-store" }),
        fetch("/api/menu/prep-zone", { cache: "no-store" }),
      ]);

      if (mastersRes.ok) {
        const mastersData = await mastersRes.json();
        setMenuMasters(mastersData);
      }

      if (prepZonesRes.ok) {
        const prepZonesData = await prepZonesRes.json();
        setPrepZones(prepZonesData);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Navigation handlers
  const handleAdd = () => {
    router.push("/dashboard/menu/masters/add");
  };

  const handleEdit = (masterId: string) => {
    router.push(`/dashboard/menu/masters/${masterId}/edit`);
  };

  const handleDelete = (masterId: string) => {
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
          menuMasters.filter((master) => master.menuMasterId !== deletingId)
        );
        toast.success("Menu master deleted successfully");
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete menu master");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting menu master");
      console.error("Error:", error);
    } finally {
      setShowConfirmModal(false);
      setDeletingId(null);
    }
  };

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
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/menu")}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            <span className="text-lg font-medium">Back to Menu Management</span>
          </button>
        </div>
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

            {/* Prep Zone Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prep Zone
              </label>
              <select
                value={selectedPrepZone}
                onChange={(e) => setSelectedPrepZone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Prep Zones</option>
                {prepZones.map((zone) => (
                  <option key={zone.prepZoneId} value={zone.prepZoneCode}>
                    {zone.prepZoneName}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Menu Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Menu Type
              </label>
              <select
                value={selectedEventMenu}
                onChange={(e) => setSelectedEventMenu(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Menus</option>
                <option value="regular">Regular Menu</option>
                <option value="event">Event Menu</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedPrepZone("");
                setSelectedEventMenu("");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Menu Masters List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Menu Masters List ({filteredMasters.length})
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title="Grid View"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title="Table View"
              >
                <TableCellsIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className={viewMode === "table" ? "overflow-x-auto" : "p-6"}>
            {filteredMasters.length === 0 ? (
              <div className="text-center py-8 p-6">
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
            ) : viewMode === "table" ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Menu Master
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Label
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Prep Zone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Menu Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredMasters.map((master) => (
                    <tr
                      key={master.menuMasterId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      style={
                        master.colorCode
                          ? {
                              borderLeft: `4px solid ${master.colorCode}`,
                            }
                          : undefined
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                            style={{
                              backgroundColor: master.colorCode || "#3B82F6",
                            }}
                          ></div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {master.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {master.labelName || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {getPrepZoneName(master.prepZoneCode)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {master.isEventMenu === 1 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400">
                            Event Menu
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            Regular
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            master.isActive === 1
                              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                              : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                          }`}
                        >
                          {master.isActive === 1 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(master.menuMasterId)}
                            className="p-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                            title="Edit menu master"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(master.menuMasterId)}
                            className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
                            title="Delete menu master"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMasters.map((master) => (
                  <div
                    key={master.menuMasterId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-700"
                    style={
                      master.colorCode
                        ? { borderColor: master.colorCode }
                        : undefined
                    }
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
                        <strong>Prep Zone:</strong>{" "}
                        {getPrepZoneName(master.prepZoneCode)}
                      </p>
                      {master.isEventMenu === 1 && (
                        <p>
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400">
                            Event Menu
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(master.menuMasterId)}
                        className="p-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                        title="Edit menu master"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(master.menuMasterId)}
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
