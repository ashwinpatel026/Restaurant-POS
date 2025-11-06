"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
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
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import DataTable from "@/components/tables/DataTable";
import {
  TableSkeleton,
  StatsSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/SkeletonLoader";

interface PrepZone {
  prepZoneId: string; // Changed to string for BigInt serialization
  prepZoneCode: string;
  prepZoneName: string | null;
  stationCode?: string | null;
  isActive: number;
  sendToExpediter?: number | null;
  alwaysPrintTicket?: number | null;
  printerCode?: string | null;
  backupPrinterCode?: string | null;
  createdBy?: number | null;
  createdOn?: string;
  updatedBy?: number | null;
  updatedOn?: string | null;
  isSyncToWeb: number;
  isSyncToLocal: number;
  storeCode?: string | null;
}

interface Printer {
  printerId: string; // Changed to string for BigInt serialization
  printerCode: string;
  printerName: string | null;
  isActive?: number | null;
}

interface Station {
  tblStationId: string; // Changed to string for BigInt serialization
  stationCode: string;
  stationname: string | null;
  isActive?: number | null;
}

export default function PrepZonePage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [prepZones, setPrepZones] = useState<PrepZone[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastRefreshRef = useRef<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<PrepZone | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<PrepZone | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Refetch when refresh parameter is present (only once per refresh token)
  useEffect(() => {
    const refreshToken = searchParams.get("refresh");
    if (
      pathname === "/dashboard/prep-zone" &&
      refreshToken &&
      refreshToken !== lastRefreshRef.current &&
      !fetchingRef.current
    ) {
      lastRefreshRef.current = refreshToken;
      fetchData();
      // Clean up the refresh parameter after a delay to avoid re-triggering
      setTimeout(() => {
        router.replace("/dashboard/prep-zone", { scroll: false });
      }, 100);
    }
  }, [pathname, searchParams, router]);

  const fetchData = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const [zonesRes, printersRes, stationsRes] = await Promise.all([
        fetch("/api/menu/prep-zone"),
        fetch("/api/printer"),
        fetch("/api/station"),
      ]);

      if (zonesRes.ok) {
        const data = await zonesRes.json();
        setPrepZones(data);
      }

      if (printersRes.ok) {
        const data = await printersRes.json();
        setPrinters(data);
      }

      if (stationsRes.ok) {
        const data = await stationsRes.json();
        setStations(data);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Modal handlers
  const handleAdd = () => {
    setEditingZone(null);
    setShowModal(true);
  };

  const handleEdit = (zone: PrepZone) => {
    setEditingZone(zone);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const url = editingZone
        ? `/api/menu/prep-zone/${editingZone.prepZoneId}`
        : "/api/menu/prep-zone";

      const method = editingZone ? "PUT" : "POST";

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
          editingZone
            ? "Prep Zone updated successfully!"
            : "Prep Zone created successfully!"
        );
        setShowModal(false);
        setEditingZone(null);
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save prep zone");
      }
    } catch (error: any) {
      toast.error(error.message || "Error saving prep zone");
      console.error("Error:", error);
    }
  };

  const handleDeleteClick = (zone: PrepZone) => {
    setZoneToDelete(zone);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!zoneToDelete) return;

    try {
      const response = await fetch(
        `/api/menu/prep-zone/${zoneToDelete.prepZoneId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setPrepZones(
          prepZones.filter(
            (zone) => zone.prepZoneId !== zoneToDelete.prepZoneId
          )
        );
        toast.success("Prep Zone deleted successfully");
        setShowDeleteModal(false);
        setZoneToDelete(null);
      } else {
        throw new Error("Failed to delete prep zone");
      }
    } catch (error) {
      toast.error("Error deleting prep zone");
      console.error("Error:", error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setZoneToDelete(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <PageHeaderSkeleton />

          {/* Stats Skeleton */}
          <StatsSkeleton count={3} />

          {/* Table Skeleton */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="mb-4">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <TableSkeleton rows={8} columns={8} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const activeZones = prepZones.filter((s) => s.isActive === 1).length;
  const inactiveZones = prepZones.filter((s) => s.isActive === 0).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Prep-Zone Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage preparation zones for your kitchen
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Prep-Zone
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
                  Total Zones
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {prepZones.length}
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
                  {activeZones}
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
                  {inactiveZones}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Prep Zones List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Prep Zones List
            </h3>
          </div>
          {prepZones.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <CubeIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No prep zones found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by adding your first prep zone.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Prep Zone
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "#",
                  accessor: "prepZoneId",
                  sortable: false,
                  cell: (zone: PrepZone, index?: number) => (
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
                  header: "Zone Name",
                  accessor: "prepZoneName",
                  cell: (zone: PrepZone) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <CubeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {zone.prepZoneName || "-"}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Station",
                  accessor: "stationCode",
                  cell: (zone: PrepZone) => (
                    <div className="text-sm text-gray-900 dark:text-white">
                      {zone.stationCode ? (
                        <div className="flex items-center">
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {stations.find(
                              (s) => s.stationCode === zone.stationCode
                            )?.stationname || zone.stationCode}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </div>
                  ),
                },
                {
                  header: "Printer",
                  accessor: "printerCode",
                  cell: (zone: PrepZone) => (
                    <div className="text-sm text-gray-900 dark:text-white">
                      {zone.printerCode ? (
                        <div className="flex items-center">
                          <PrinterIcon className="w-4 h-4 mr-2 text-gray-400" />
                          {printers.find(
                            (p) => p.printerCode === zone.printerCode
                          )?.printerName || zone.printerCode}
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
                  cell: (zone: PrepZone) => (
                    <div className="flex items-center justify-center">
                      {zone.sendToExpediter === 1 ? (
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
                  cell: (zone: PrepZone) => (
                    <div className="flex items-center justify-center">
                      {zone.alwaysPrintTicket === 1 ? (
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
                  cell: (zone: PrepZone) => (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        zone.isActive === 1
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {zone.isActive === 1 ? (
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
                  accessor: "prepZoneId",
                  sortable: false,
                  cell: (zone: PrepZone) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(zone)}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                        title="Edit zone"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(zone)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete zone"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={prepZones}
              keyExtractor={(zone: PrepZone) => zone.prepZoneId.toString()}
              searchPlaceholder="Search prep zones..."
              emptyMessage="No prep zones found"
            />
          )}
        </div>
      </div>

      {/* Modal */}
      <CRUDModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingZone(null);
        }}
        title={editingZone ? "Edit Prep Zone" : "Add New Prep Zone"}
        size="md"
      >
        <PrepZoneForm
          zone={editingZone}
          printers={printers}
          stations={stations}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingZone(null);
          }}
        />
      </CRUDModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Prep Zone"
        itemName={zoneToDelete?.prepZoneName || ""}
      />
    </DashboardLayout>
  );
}

// Prep Zone Form Component
function PrepZoneForm({
  zone,
  printers,
  stations,
  onSave,
  onCancel,
}: {
  zone?: PrepZone | null;
  printers: Printer[];
  stations: Station[];
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    prepZoneName: "",
    stationCode: "",
    sendToExpediter: false,
    alwaysPrintTicket: false,
    printerCode: "",
    backupPrinterCode: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (zone) {
      setFormData({
        prepZoneName: zone.prepZoneName || "",
        stationCode: zone.stationCode || "",
        sendToExpediter: zone.sendToExpediter === 1,
        alwaysPrintTicket: zone.alwaysPrintTicket === 1,
        printerCode: zone.printerCode || "",
        backupPrinterCode: zone.backupPrinterCode || "",
        isActive: zone.isActive === 1,
      });
    }
  }, [zone]);

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
          Prep-Zone Name *
        </label>
        <input
          type="text"
          required
          value={formData.prepZoneName}
          onChange={(e) =>
            setFormData({ ...formData, prepZoneName: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter zone name (e.g., Grill Zone)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Station *
        </label>
        <select
          required
          value={formData.stationCode}
          onChange={(e) =>
            setFormData({ ...formData, stationCode: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select Station</option>
          {stations
            .filter((s) => s.isActive === 1 || s.isActive === undefined)
            .map((station) => (
              <option key={station.tblStationId} value={station.stationCode}>
                {station.stationname || station.stationCode}
              </option>
            ))}
        </select>
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

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Backup Printer
        </label>
        <select
          value={formData.backupPrinterCode}
          onChange={(e) =>
            setFormData({ ...formData, backupPrinterCode: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select backup printer</option>
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
          {loading ? "Saving..." : zone ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
