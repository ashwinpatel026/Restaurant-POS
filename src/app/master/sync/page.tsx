"use client";

import { useState, useEffect } from "react";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { formatDateSafe } from "@/lib/utils";

interface SyncStatus {
  locationCode: string;
  tableName: string;
  lastSyncTime: string | null;
  lastSyncStatus: number;
  totalRecordsSynced: number;
  lastErrorMessage: string | null;
}

interface SyncLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  source: string;
  changeTime: string;
  syncStatus: number;
  locationCode: string | null;
  errorMessage: string | null;
  retryCount: number;
}

interface Location {
  locationId: string;
  locationName: string;
  storeCode: string;
  isActive: number;
}

export default function SyncManagementPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([]);
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "status" | "log" | "sync" | "clone"
  >("status");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sourceLocation, setSourceLocation] = useState<string>("");
  const [targetLocation, setTargetLocation] = useState<string>("");
  const [cloneMode, setCloneMode] = useState<"clone" | "merge">("clone");
  const [cloning, setCloning] = useState(false);

  const syncableTables = [
    { value: "", label: "All Tables" },
    { value: "tbl_master_printer", label: "Printer Master" },
    { value: "tbl_master_department_type", label: "Department Type" },
    { value: "tbl_master_department", label: "Department" },
    { value: "tbl_master_menu_master", label: "Menu Master" },
    { value: "tbl_master_menu_category", label: "Menu Category" },
    { value: "tbl_master_menu_item", label: "Menu Item" },
    { value: "tbl_master_modifier_group", label: "Modifier Group" },
    { value: "tbl_master_modifier_item", label: "Modifier Item" },
    { value: "tbl_master_prep_zone", label: "Prep Zone" },
    { value: "tbl_master_station", label: "Station" },
    { value: "tbl_master_tax", label: "Tax" },
    { value: "tbl_master_time_events", label: "Time Events" },
    { value: "tbl_master_menu_master_event", label: "Menu Master Event" },
    {
      value: "tbl_master_menu_category_modifier",
      label: "Menu Category Modifier",
    },
    {
      value: "tbl_master_menu_item_modifier_group",
      label: "Menu Item Modifier Group",
    },
    // User tables removed from UI - synced individually on create/update only
  ];

  // Initial load - fetch locations only
  useEffect(() => {
    fetchLocations();
  }, []);

  // Fetch data when filters change (but not on initial load)
  useEffect(() => {
    if (!isInitialLoad) {
      fetchSyncStatus();
      fetchSyncLog();
      fetchPendingCount();
    }
  }, [selectedLocation, selectedTable]);

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/locations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const activeLocations = data.filter(
          (loc: Location) => loc.isActive === 1
        );
        setLocations(activeLocations);

        // Mark initial load as complete and fetch data (with empty location = All Locations)
        if (isInitialLoad) {
          setIsInitialLoad(false);
          // Fetch initial data after locations are loaded
          setTimeout(() => {
            fetchSyncStatus();
            fetchSyncLog();
            fetchPendingCount();
          }, 0);
        }
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const params = new URLSearchParams();
      if (selectedLocation) params.append("locationCode", selectedLocation);
      if (selectedTable) params.append("tableName", selectedTable);

      const response = await fetch(`/api/master/sync/status?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data.data?.status || []);
        setPendingCount(data.data?.pendingCount || 0);
      }
    } catch (error) {
      console.error("Error fetching sync status:", error);
    }
  };

  const fetchSyncLog = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const params = new URLSearchParams();
      if (selectedLocation) params.append("locationCode", selectedLocation);
      if (selectedTable) params.append("tableName", selectedTable);
      params.append("status", "0"); // Pending
      params.append("limit", "50");

      const response = await fetch(`/api/master/sync/log?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSyncLog(data.data?.entries || []);
      }
    } catch (error) {
      console.error("Error fetching sync log:", error);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const params = new URLSearchParams();
      if (selectedLocation) params.append("locationCode", selectedLocation);

      const response = await fetch(
        `/api/master/sync/log?${params}&status=0&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.data?.total || 0);
      }
    } catch (error) {
      console.error("Error fetching pending count:", error);
    }
  };

  const handleManualSync = async (fullSync: boolean = false) => {
    if (!selectedLocation) {
      toast.error("Please select a location");
      return;
    }

    setSyncing(true);
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/sync/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          locationCode: selectedLocation,
          tableName: selectedTable || undefined,
          fullSync: fullSync,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(
          `Sync completed! Processed: ${data.data.recordsProcessed}, Succeeded: ${data.data.recordsSucceeded}, Failed: ${data.data.recordsFailed}`
        );
        // Refresh data
        fetchSyncStatus();
        fetchSyncLog();
        fetchPendingCount();
      } else {
        toast.error(data.error || data.message || "Sync failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Error triggering sync");
      console.error("Error:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleLocationClone = async () => {
    if (!sourceLocation || !targetLocation) {
      toast.error("Please select both source and target locations");
      return;
    }

    if (sourceLocation === targetLocation) {
      toast.error("Source and target locations cannot be the same");
      return;
    }

    setCloning(true);
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/sync/location-to-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceLocationCode: sourceLocation,
          targetLocationCode: targetLocation,
          tableName: selectedTable || undefined,
          fullSync: true,
          cloneMode: cloneMode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(
          `Location clone completed! Processed: ${data.data.recordsProcessed}, Succeeded: ${data.data.recordsSucceeded}, Failed: ${data.data.recordsFailed}`
        );
        // Refresh data
        fetchSyncStatus();
        fetchSyncLog();
        fetchPendingCount();
      } else {
        toast.error(data.error || data.message || "Location clone failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Error cloning location data");
      console.error("Error:", error);
    } finally {
      setCloning(false);
    }
  };

  const getStatusBadge = (status: number) => {
    if (status === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircleIcon className="w-4 h-4 mr-1" />
          Success
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <XCircleIcon className="w-4 h-4 mr-1" />
        Failed
      </span>
    );
  };

  const getOperationBadge = (operation: string) => {
    const colors: Record<string, string> = {
      INSERT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      UPDATE:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
          colors[operation] || "bg-gray-100 text-gray-800"
        }`}
      >
        {operation}
      </span>
    );
  };

  if (loading) {
    return (
      <MasterDashboardLayout>
        <PageSkeleton />
      </MasterDashboardLayout>
    );
  }

  return (
    <MasterDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Sync Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage synchronization between Master and Location databases
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {pendingCount > 0 && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {pendingCount} pending sync(s)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.locationId} value={loc.storeCode}>
                    {loc.locationName} ({loc.storeCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Table
              </label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {syncableTables.map((table) => (
                  <option key={table.value} value={table.value}>
                    {table.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  fetchSyncStatus();
                  fetchSyncLog();
                  fetchPendingCount();
                }}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5 inline mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("status")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "status"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Sync Status
            </button>
            <button
              onClick={() => setActiveTab("log")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "log"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Sync Log ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab("sync")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "sync"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Manual Sync
            </button>
            <button
              onClick={() => setActiveTab("clone")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "clone"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Location Clone
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "status" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Table
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Sync
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Records Synced
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {syncStatus.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-4 text-center text-gray-500 dark:text-gray-400"
                      >
                        No sync status found. Trigger a sync to see status.
                      </td>
                    </tr>
                  ) : (
                    syncStatus.map((status, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {status.locationCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {status.tableName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDateSafe(status.lastSyncTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(status.lastSyncStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {status.totalRecordsSynced.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {status.lastErrorMessage ? (
                            <span
                              className="text-red-600 dark:text-red-400"
                              title={status.lastErrorMessage}
                            >
                              {status.lastErrorMessage.substring(0, 50)}...
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "log" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Table
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Operation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Record ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Change Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Retries
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {syncLog.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-4 text-center text-gray-500 dark:text-gray-400"
                      >
                        No pending syncs found.
                      </td>
                    </tr>
                  ) : (
                    syncLog.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {entry.tableName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getOperationBadge(entry.operation)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                          {entry.recordId.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDateSafe(entry.changeTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.syncStatus === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Pending
                            </span>
                          ) : entry.syncStatus === 1 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Processed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {entry.retryCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "sync" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Manual Sync
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Trigger a manual synchronization for the selected location and
                  table.
                </p>
              </div>

              {!selectedLocation && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex">
                    <InformationCircleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Please select a location to sync.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleManualSync(false)}
                  disabled={!selectedLocation || syncing}
                  className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {syncing ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                      Incremental Sync
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleManualSync(true)}
                  disabled={!selectedLocation || syncing}
                  className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {syncing ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                      Full Sync
                    </>
                  )}
                </button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Sync Information
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>
                    • <strong>Incremental Sync:</strong> Syncs only pending
                    changes from sync_log
                  </li>
                  <li>
                    • <strong>Full Sync:</strong> Re-syncs all records from
                    master tables
                  </li>
                  <li>
                    • <strong>Selected Location:</strong>{" "}
                    {selectedLocation || "None"}
                  </li>
                  <li>
                    • <strong>Selected Table:</strong>{" "}
                    {selectedTable || "All Tables"}
                  </li>
                  <li>
                    • <strong>Pending Syncs:</strong> {pendingCount} record(s)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === "clone" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Location-to-Location Clone Sync
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Clone all syncable data from one location to another. All
                  codes will be automatically transformed to match the target
                  location.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Source Location
                  </label>
                  <select
                    value={sourceLocation}
                    onChange={(e) => setSourceLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select source location...</option>
                    {locations.map((loc) => (
                      <option key={loc.locationId} value={loc.storeCode}>
                        {loc.locationName} ({loc.storeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Location
                  </label>
                  <select
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select target location...</option>
                    {locations
                      .filter((loc) => loc.storeCode !== sourceLocation)
                      .map((loc) => (
                        <option key={loc.locationId} value={loc.storeCode}>
                          {loc.locationName} ({loc.storeCode})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Table (Optional)
                  </label>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {syncableTables.map((table) => (
                      <option key={table.value} value={table.value}>
                        {table.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Clone Mode
                  </label>
                  <select
                    value={cloneMode}
                    onChange={(e) =>
                      setCloneMode(e.target.value as "clone" | "merge")
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="clone">Clone (Replace All)</option>
                    <option value="merge">Merge (Skip Existing)</option>
                  </select>
                </div>
              </div>

              {(!sourceLocation || !targetLocation) && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex">
                    <InformationCircleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Please select both source and target locations to proceed.
                    </p>
                  </div>
                </div>
              )}

              {sourceLocation &&
                targetLocation &&
                sourceLocation === targetLocation && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-sm text-red-800 dark:text-red-200">
                        Source and target locations cannot be the same.
                      </p>
                    </div>
                  </div>
                )}

              <button
                onClick={handleLocationClone}
                disabled={
                  !sourceLocation ||
                  !targetLocation ||
                  sourceLocation === targetLocation ||
                  cloning
                }
                className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cloning ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                    Cloning Data...
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                    Clone Location Data
                  </>
                )}
              </button>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Clone Information
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>
                    • <strong>Clone Mode:</strong>{" "}
                    {cloneMode === "clone"
                      ? "Replace all existing data in target location"
                      : "Only add new records, skip existing ones"}
                  </li>
                  <li>
                    • <strong>Code Transformation:</strong> All codes will be
                    automatically transformed (e.g., WMLOC001TAX1 →
                    WMLOC002TAX1)
                  </li>
                  <li>
                    • <strong>Source Location:</strong>{" "}
                    {sourceLocation || "Not selected"}
                  </li>
                  <li>
                    • <strong>Target Location:</strong>{" "}
                    {targetLocation || "Not selected"}
                  </li>
                  <li>
                    • <strong>Selected Table:</strong>{" "}
                    {selectedTable || "All Tables"}
                  </li>
                  <li>
                    • <strong>What Gets Cloned:</strong> All syncable tables
                    (Tax, Printer, Station, Menu, Modifiers, etc.)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </MasterDashboardLayout>
  );
}
