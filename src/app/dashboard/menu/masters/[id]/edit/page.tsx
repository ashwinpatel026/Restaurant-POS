"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import SystemColorPicker from "@/components/ui/SystemColorPicker";
import { CheckIcon } from "@heroicons/react/24/solid";

interface PrepZone {
  prepZoneId: string;
  prepZoneName: string | null;
  prepZoneCode: string;
  isActive: number;
}

interface TimeEvent {
  id: string;
  eventCode: string;
  eventName: string;
  isActive: number;
}

interface MenuMaster {
  menuMasterId: string;
  menuMasterCode: string;
  name: string;
  labelName: string | null;
  colorCode: string | null;
  prepZoneCode: string | null;
  isEventMenu: number;
  isActive: number;
}

interface MenuMasterEvent {
  eventCode: string;
}

export default function EditMenuMasterPage() {
  const router = useRouter();
  const params = useParams();
  const masterId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [prepZones, setPrepZones] = useState<PrepZone[]>([]);
  const [timeEvents, setTimeEvents] = useState<TimeEvent[]>([]);
  const [menuMaster, setMenuMaster] = useState<MenuMaster | null>(null);
  const [currentEventCode, setCurrentEventCode] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    labelName: "",
    colorCode: "#3B82F6",
    prepZoneCode: "",
    eventCode: "",
    isEventMenu: 0,
    isActive: 1,
  });

  useEffect(() => {
    if (masterId) {
      fetchData();
    }
  }, [masterId]);

  const fetchData = async () => {
    try {
      const [prepZonesRes, eventsRes, masterRes] = await Promise.all([
        fetch("/api/menu/prep-zone"),
        fetch("/api/events"),
        fetch(`/api/menu/masters/${masterId}`),
      ]);

      if (prepZonesRes.ok) {
        const prepZonesData = await prepZonesRes.json();
        setPrepZones(prepZonesData);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setTimeEvents(eventsData.filter((e: TimeEvent) => e.isActive === 1));
      }

      if (masterRes.ok) {
        const masterData = await masterRes.json();
        setMenuMaster(masterData);

        // Fetch associated event if it's an event menu
        let eventCode = "";
        if (masterData.isEventMenu === 1 && masterData.menuMasterCode) {
          const eventAssocRes = await fetch(
            `/api/menu/masters/${masterId}/events`
          );
          if (eventAssocRes.ok) {
            const eventAssocData = await eventAssocRes.json();
            if (eventAssocData.length > 0) {
              eventCode = eventAssocData[0].eventCode;
              setCurrentEventCode(eventCode);
            }
          }
        }

        setFormData({
          name: masterData.name || "",
          labelName: masterData.labelName || "",
          colorCode: masterData.colorCode || "#3B82F6",
          prepZoneCode: masterData.prepZoneCode || "",
          eventCode: eventCode,
          isEventMenu: masterData.isEventMenu || 0,
          isActive: masterData.isActive || 1,
        });
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/menu/masters/${masterId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          labelName: formData.labelName,
          colorCode: formData.colorCode,
          prepZoneCode: formData.prepZoneCode || null,
          eventCode: formData.eventCode || null,
          currentEventCode: currentEventCode || null,
          isEventMenu: formData.eventCode ? 1 : 0,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        toast.success("Menu master updated successfully!");
        router.push("/dashboard/menu/masters");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update menu master");
      }
    } catch (error: any) {
      toast.error(error.message || "Error updating menu master");
      console.error("Error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!menuMaster) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Menu Master Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            The menu master you're looking for doesn't exist.
          </p>
          <button
            onClick={() => router.push("/dashboard/menu/masters")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Menu Masters
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Menu Master
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Update menu master: {menuMaster.name}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Menu Master Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter menu master name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Label Name
                    </label>
                    <input
                      type="text"
                      value={formData.labelName}
                      onChange={(e) =>
                        setFormData({ ...formData, labelName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter display label"
                    />
                  </div>

                  <SystemColorPicker
                    label="Color Code"
                    value={formData.colorCode || ""}
                    onChange={(color: string) =>
                      setFormData({ ...formData, colorCode: color })
                    }
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Prep Zone
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            prepZoneCode: "",
                          })
                        }
                        className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                          formData.prepZoneCode === ""
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                      >
                        None
                        {formData.prepZoneCode === "" && (
                          <CheckIcon className="w-4 h-4 inline-block ml-2" />
                        )}
                      </button>
                      {prepZones.map((zone) => (
                        <button
                          key={zone.prepZoneId}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              prepZoneCode: zone.prepZoneCode,
                            })
                          }
                          className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                            formData.prepZoneCode === zone.prepZoneCode
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                          }`}
                        >
                          {zone.prepZoneName}
                          {formData.prepZoneCode === zone.prepZoneCode && (
                            <CheckIcon className="w-4 h-4 inline-block ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Event Configuration */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Time Event Configuration
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time Event
                    </label>
                    <select
                      value={formData.eventCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eventCode: e.target.value,
                          isEventMenu: e.target.value ? 1 : 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No Time Event (Available Always)</option>
                      {timeEvents.map((event) => (
                        <option key={event.id} value={event.eventCode}>
                          {event.eventName} ({event.eventCode})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Select a time event to restrict menu availability to
                      specific times/days
                    </p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Status
                </h3>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive === 1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isActive: e.target.checked ? 1 : 0,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Active
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 rounded-b-lg flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Updating..." : "Update Menu Master"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
