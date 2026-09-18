"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  CubeIcon,
  DocumentIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import { usePagePermission } from "@/hooks/usePagePermission";

interface PrinterProfile {
  profileId: string;
  profileCode: string;
  name: string;
  printerType: string;
  isActive: boolean;
}

interface StationAssignment {
  profileSettingId: string;
  profileCode: string;
  profileName: string;
  stationCode: string;
  stationName: string;
  localPrinterName: string;
  backupPrinterName: string;
}

const PRINTER_TYPES = [
  { value: "Receipt", label: "Receipt", icon: PrinterIcon },
  { value: "Prep-Zone", label: "Prep-Zone", icon: CubeIcon },
  { value: "Document", label: "Document", icon: DocumentIcon },
] as const;

const EMPTY_FORM = {
  name: "",
  printerType: "Receipt",
  isActive: true,
};

export default function PrinterProfilePage() {
  const { selectedStoreCode, fetchWithStore } = useApiWithStore();
  const { hasPermission, loading: permissionLoading } = usePagePermission({
    requiredPermissions: ["printers.view"],
  });

  const [profiles, setProfiles] = useState<PrinterProfile[]>([]);
  const [assignments, setAssignments] = useState<StationAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const selectedProfile = profiles.find(
    (profile) => profile.profileId === selectedProfileId,
  );
  const visibleAssignments = useMemo(
    () =>
      selectedProfile
        ? assignments.filter(
            (assignment) => assignment.profileCode === selectedProfile.profileCode,
          )
        : assignments,
    [assignments, selectedProfile],
  );

  const fetchData = async () => {
    if (!selectedStoreCode) {
      setProfiles([]);
      setAssignments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetchWithStore("/api/dashboard/printer-profile", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load printer profiles");
      }

      setProfiles(Array.isArray(payload?.profiles) ? payload.profiles : []);
      setAssignments(
        Array.isArray(payload?.assignments) ? payload.assignments : [],
      );
    } catch (error) {
      setProfiles([]);
      setAssignments([]);
      toast.error(
        error instanceof Error ? error.message : "Failed to load printer profiles",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedProfileId("");
    setForm(EMPTY_FORM);
    fetchData();
  }, [selectedStoreCode]);

  const selectProfile = (profile: PrinterProfile) => {
    setSelectedProfileId(profile.profileId);
    setForm({
      name: profile.name,
      printerType: profile.printerType,
      isActive: profile.isActive,
    });
  };

  const handleAddNew = async () => {
    try {
      setSaving(true);
      const response = await fetchWithStore("/api/dashboard/printer-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create printer profile");
      }

      toast.success(
        `Printer profile created for ${payload?.stationAssignmentsCreated ?? 0} station(s)`,
      );
      await fetchData();
      if (payload?.profile?.profileId) {
        setSelectedProfileId(payload.profile.profileId);
        setForm({
          name: payload.profile.name,
          printerType: payload.profile.printerType,
          isActive: payload.profile.isActive,
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create printer profile",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedProfile) {
      toast.error("Select a printer profile to edit");
      return;
    }

    try {
      setSaving(true);
      const response = await fetchWithStore(
        `/api/dashboard/printer-profile/${selectedProfile.profileId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update printer profile");
      }

      toast.success("Printer profile updated");
      await fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update printer profile",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProfile) return;

    try {
      setSaving(true);
      const response = await fetchWithStore(
        `/api/dashboard/printer-profile/${selectedProfile.profileId}`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete printer profile");
      }

      toast.success("Printer profile deleted");
      setShowDeleteModal(false);
      setSelectedProfileId("");
      setForm(EMPTY_FORM);
      await fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete printer profile",
      );
    } finally {
      setSaving(false);
    }
  };

  if (permissionLoading || loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!hasPermission) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Printer Profile
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Create printer profiles and assign them to every station in this store
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    Sr No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {profiles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No printer profiles yet
                    </td>
                  </tr>
                ) : (
                  profiles.map((profile, index) => (
                    <tr
                      key={profile.profileId}
                      onClick={() => selectProfile(profile)}
                      className={`cursor-pointer ${
                        selectedProfileId === profile.profileId
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {profile.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {profile.printerType}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="card space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Enter profile name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Printer Type *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {PRINTER_TYPES.map((type) => {
                  const Icon = type.icon;
                  const selected = form.printerType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, printerType: type.value }))
                      }
                      className={`flex flex-col items-center rounded-lg border px-3 py-4 text-sm font-medium transition-colors ${
                        selected
                          ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300"
                          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      <Icon className="mb-2 h-6 w-6" />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Active
            </label>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleAddNew}
                disabled={saving}
                className="rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Add New
              </button>
              <button
                type="button"
                onClick={handleEdit}
                disabled={saving || !selectedProfile}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={saving || !selectedProfile}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-gray-800 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Station printer assignments
            </h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Sr No
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Profile Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Station Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Local Printer Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Backup Printer Name
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {visibleAssignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {selectedProfile
                      ? "No station assignments for this profile"
                      : "Select or create a profile to see station assignments"}
                  </td>
                </tr>
              ) : (
                visibleAssignments.map((assignment, index) => (
                  <tr key={assignment.profileSettingId}>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {assignment.profileName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {assignment.stationName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {assignment.localPrinterName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {assignment.backupPrinterName || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Printer Profile"
        itemName={selectedProfile?.name || "this printer profile"}
        isLoading={saving}
      />
    </DashboardLayout>
  );
}
