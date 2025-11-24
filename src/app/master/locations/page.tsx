"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";

interface Company {
  companyId: string;
  companyCode: string;
  companyName: string;
}

interface Dealer {
  dealerId: string;
  dealerCode: string;
  dealerName: string;
  companyId: string;
}

interface Location {
  locationId: string;
  locationName: string;
  storeCode: string;
  companyId: string;
  dealerId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  phone?: string;
  email?: string;
  isActive: number;
  syncEnabled: number;
  company?: Company;
  dealer?: Dealer;
  _count?: {
    users: number;
  };
}

export default function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<any[]>([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("");
  const [filterDealerId, setFilterDealerId] = useState<string>("");

  useEffect(() => {
    fetchCompanies();
    fetchDealers();
    fetchLocations();
  }, [filterCompanyId, filterDealerId]);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/companies", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.filter((c: any) => c.isActive === 1));
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchDealers = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const url = filterCompanyId
        ? `/api/master/dealers?companyId=${filterCompanyId}`
        : "/api/master/dealers";
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDealers(data.filter((d: any) => d.isActive === 1));
      }
    } catch (error) {
      console.error("Error fetching dealers:", error);
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("master_admin_token");
      let url = "/api/master/locations";
      const params = new URLSearchParams();
      if (filterCompanyId) params.append("companyId", filterCompanyId);
      if (filterDealerId) params.append("dealerId", filterDealerId);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      } else {
        toast.error("Failed to fetch locations");
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error("Error fetching locations");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (location: Location) => {
    setLocationToDelete(location);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!locationToDelete) return;

    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(`/api/master/locations/${locationToDelete.locationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Location deactivated successfully");
        fetchLocations();
        setShowDeleteModal(false);
        setLocationToDelete(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete location");
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("Error deleting location");
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setLocationToDelete(null);
  };

  const handleSync = async (id: string) => {
    try {
      setSyncingId(id);
      setSyncProgress([]);
      setShowSyncModal(true);

      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(`/api/master/locations/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ syncType: "FULL" }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSyncProgress(data.progress || []);
        toast.success(
          `Sync completed successfully! ${data.recordsSynced} records synced.`
        );
        setTimeout(() => {
          setShowSyncModal(false);
          setSyncingId(null);
          fetchLocations();
        }, 2000);
      } else {
        setSyncProgress(data.progress || []);
        toast.error(data.error || "Sync failed");
        setTimeout(() => {
          setShowSyncModal(false);
          setSyncingId(null);
        }, 3000);
      }
    } catch (error) {
      console.error("Error syncing location:", error);
      toast.error("Error syncing location");
      setShowSyncModal(false);
      setSyncingId(null);
    }
  };

  const filteredLocations = locations.filter(
    (location) =>
      location.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.storeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.company?.companyName
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

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
              Locations
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage store locations and their settings
            </p>
          </div>
          <button
            onClick={() => router.push("/master/locations/add")}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Location</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Company
              </label>
              <select
                value={filterCompanyId}
                onChange={(e) => {
                  setFilterCompanyId(e.target.value);
                  setFilterDealerId(""); // Reset dealer filter
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.companyName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Dealer
              </label>
              <select
                value={filterDealerId}
                onChange={(e) => setFilterDealerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={!filterCompanyId}
              >
                <option value="">All Dealers</option>
                {dealers.map((dealer) => (
                  <option key={dealer.dealerId} value={dealer.dealerId}>
                    {dealer.dealerName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Locations Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Store Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Company/Dealer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Stats
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
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No locations found
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((location) => (
                    <tr
                      key={location.locationId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                          {location.storeCode}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {location.locationName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <div>{location.company?.companyName || "N/A"}</div>
                          {location.dealer && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {location.dealer.dealerName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {location._count && (
                            <div>{location._count.users} Users</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              location.isActive === 1
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                          >
                            {location.isActive === 1 ? "Active" : "Inactive"}
                          </span>
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              location.syncEnabled === 1
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                            }`}
                          >
                            {location.syncEnabled === 1
                              ? "Sync On"
                              : "Sync Off"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleSync(location.locationId)}
                            disabled={syncingId === location.locationId}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                            title="Sync Data"
                          >
                            <ArrowPathIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => router.push(`/master/locations/${location.locationId}/edit`)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(location)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Location"
          itemName={locationToDelete?.locationName || ""}
          description={`Are you sure you want to deactivate the location "${locationToDelete?.locationName}"? This will not delete associated users.`}
        />

        {/* Sync Progress Modal */}
        {showSyncModal && (
          <SyncProgressModal
            progress={syncProgress}
            onClose={() => {
              setShowSyncModal(false);
              setSyncingId(null);
            }}
          />
        )}
      </div>
    </MasterDashboardLayout>
  );
}

// Sync Progress Modal
function SyncProgressModal({
  progress,
  onClose,
}: {
  progress: any[];
  onClose: () => void;
}) {
  const totalSteps = 9;
  const completedSteps = progress.filter(
    (p) => p.status === "completed"
  ).length;
  const failedSteps = progress.filter((p) => p.status === "failed").length;
  const totalRecords = progress.reduce(
    (sum, p) => sum + (p.recordsSynced || 0),
    0
  );
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
  const isComplete = completedSteps === totalSteps;
  const hasFailed = failedSteps > 0;

  const syncSteps = [
    "Menu Masters",
    "Menu Categories",
    "Menu Items",
    "Modifier Groups",
    "Modifier Items",
    "Prep Zones",
    "Time Events",
    "Tax",
    "Stations",
  ];

  const getStepStatus = (stepName: string) => {
    const stepProgress = progress.find((p) => p.step === stepName);
    if (!stepProgress) return "pending";
    return stepProgress.status;
  };

  const getStepRecords = (stepName: string) => {
    const stepProgress = progress.find((p) => p.step === stepName);
    return stepProgress?.recordsSynced || 0;
  };

  const getStepError = (stepName: string) => {
    const stepProgress = progress.find((p) => p.step === stepName);
    return stepProgress?.error;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Sync Progress
          </h3>
          {isComplete && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {progressPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                hasFailed
                  ? "bg-red-500"
                  : isComplete
                  ? "bg-green-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {completedSteps} of {totalSteps} steps completed • {totalRecords}{" "}
            records synced
          </div>
        </div>

        {/* Step-by-Step Progress */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {syncSteps.map((step) => {
            const status = getStepStatus(step);
            const records = getStepRecords(step);
            const error = getStepError(step);

            return (
              <div
                key={step}
                className={`p-3 rounded-lg border ${
                  status === "completed"
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : status === "failed"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    : status === "in_progress"
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {status === "completed" && (
                      <span className="text-green-600 dark:text-green-400">
                        ✓
                      </span>
                    )}
                    {status === "failed" && (
                      <span className="text-red-600 dark:text-red-400">✕</span>
                    )}
                    {status === "in_progress" && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400" />
                    )}
                    {status === "pending" && (
                      <span className="text-gray-400">○</span>
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {step}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {status === "completed" && `${records} records`}
                    {status === "failed" && error && (
                      <span className="text-red-600 dark:text-red-400">
                        {error}
                      </span>
                    )}
                    {status === "in_progress" && "Syncing..."}
                    {status === "pending" && "Pending"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        {isComplete && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
