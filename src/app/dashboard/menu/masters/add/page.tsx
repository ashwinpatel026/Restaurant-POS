"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import SystemColorPicker, {
  getPrimaryColor,
} from "@/components/ui/SystemColorPicker";
import TextColorPicker from "@/components/ui/TextColorPicker";
import { CheckIcon } from "@heroicons/react/24/solid";
import StatusToggle from "@/components/forms/StatusToggle";
import { useApiWithStore } from "@/hooks/useApiWithStore";

interface PrepZone {
  prepZoneId: string;
  prepZoneName: string | null;
  prepZoneCode: string;
  isActive: number;
}

interface Station {
  tblStationId: string;
  stationCode: string;
  stationname: string | null;
  isActive: number;
}

interface TimeEvent {
  id: string;
  eventCode: string;
  eventName: string;
  isActive: number;
}

interface Department {
  deptId: string;
  deptCode: string;
  deptName: string | null;
  isActive: number;
}

export default function AddMenuMasterPage() {
  const router = useRouter();
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();
  const [loading, setLoading] = useState(false);
  const [prepZones, setPrepZones] = useState<PrepZone[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [timeEvents, setTimeEvents] = useState<TimeEvent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedPrepZones, setSelectedPrepZones] = useState<Set<string>>(
    new Set()
  );
  const [selectedStations, setSelectedStations] = useState<Set<string>>(
    new Set()
  );
  const [formData, setFormData] = useState({
    name: "",
    labelName: "",
    colorCode: getPrimaryColor(),
    forColorCode: "#FFFFFF",
    deptCode: "",
    eventCode: "",
    isEventMenu: 0,
    isActive: 1,
  });

  useEffect(() => {
    // Set default color to primary color on mount
    setFormData((prev) => ({ 
      ...prev, 
      colorCode: getPrimaryColor(),
      forColorCode: "#FFFFFF"
    }));
    if (selectedStoreCode) {
      fetchData();
    }
  }, [selectedStoreCode]);

  const fetchData = async () => {
    try {
      const [prepZonesRes, stationsRes, eventsRes, departmentsRes] = await Promise.all([
        fetch(buildApiUrl("/api/dashboard/menu/prep-zone"), {
          cache: "no-store",
        }),
        fetch(buildApiUrl("/api/dashboard/station"), { cache: "no-store" }),
        fetch(buildApiUrl("/api/dashboard/events"), { cache: "no-store" }),
        fetch(buildApiUrl("/api/dashboard/department"), { cache: "no-store" }),
      ]);

      if (prepZonesRes.ok) {
        const prepZonesData = await prepZonesRes.json();
        setPrepZones(prepZonesData);
      }

      if (stationsRes.ok) {
        const stationsData = await stationsRes.json();
        setStations(stationsData.filter((s: Station) => s.isActive === 1));
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setTimeEvents(eventsData.filter((e: TimeEvent) => e.isActive === 1));
      }

      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json();
        setDepartments(departmentsData.filter((d: Department) => d.isActive === 1));
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    }
  };

  const handlePrepZoneToggle = (prepZoneCode: string) => {
    const updated = new Set(selectedPrepZones);
    if (updated.has(prepZoneCode)) {
      updated.delete(prepZoneCode);
    } else {
      updated.add(prepZoneCode);
    }
    setSelectedPrepZones(updated);
  };

  const handleSelectAllPrepZones = () => {
    if (selectedPrepZones.size === prepZones.length) {
      setSelectedPrepZones(new Set());
    } else {
      const allCodes = new Set(prepZones.map((z) => z.prepZoneCode));
      setSelectedPrepZones(allCodes);
    }
  };

  const handleStationToggle = (stationCode: string) => {
    const updated = new Set(selectedStations);
    if (updated.has(stationCode)) {
      updated.delete(stationCode);
    } else {
      updated.add(stationCode);
    }
    setSelectedStations(updated);
  };

  const handleSelectAllStations = () => {
    if (selectedStations.size === stations.length) {
      setSelectedStations(new Set());
    } else {
      const allCodes = new Set(stations.map((s) => s.stationCode));
      setSelectedStations(allCodes);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const prepZoneCodes = Array.from(selectedPrepZones);
      const stationCodes = Array.from(selectedStations);
      const response = await fetch(buildApiUrl("/api/dashboard/menu/masters"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          labelName: formData.labelName,
          colorCode: formData.colorCode,
          forColorCode: formData.forColorCode,
          deptCode: formData.deptCode || null,
          prepZoneCodes: prepZoneCodes.length > 0 ? prepZoneCodes : null,
          stationCodes: stationCodes.length > 0 ? stationCodes : null,
          eventCode: formData.eventCode || null,
          isEventMenu: formData.eventCode ? 1 : 0,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        toast.success("Menu master created successfully!");
        router.push("/dashboard/menu/masters");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create menu master");
      }
    } catch (error: any) {
      toast.error(error.message || "Error creating menu master");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

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
              Add Menu Master
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create a new menu master for your restaurant
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
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
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
                          setFormData({
                            ...formData,
                            labelName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter display label"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Department
                      </label>
                      <select
                        value={formData.deptCode}
                        onChange={(e) =>
                          setFormData({ ...formData, deptCode: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.deptId} value={dept.deptCode}>
                            {dept.deptName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      {/* Empty div for alignment */}
                    </div>
                  </div>

                  {/* Color Code Section - All three wrapped */}
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <SystemColorPicker
                          label="Color Code (Background)"
                          value={formData.colorCode}
                          onChange={(color: string) =>
                            setFormData({ ...formData, colorCode: color })
                          }
                        />
                      </div>
                      <div>
                        <TextColorPicker
                          label="Text Color"
                          value={formData.forColorCode}
                          onChange={(color: string) =>
                            setFormData({ ...formData, forColorCode: color })
                          }
                        />
                      </div>
                    </div>

                    {/* Sample Button */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Color Preview
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Preview how the colors will look together
                      </p>
                      <button
                        type="button"
                        className="px-6 py-3 rounded-lg font-medium transition-all hover:opacity-90"
                        style={{
                          backgroundColor: formData.colorCode || "#3B82F6",
                          color: formData.forColorCode || "#FFFFFF",
                        }}
                      >
                        Sample Button
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Prep Zones
                      </label>
                      {prepZones.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAllPrepZones}
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-3 py-1 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          {selectedPrepZones.size === prepZones.length
                            ? "Deselect All"
                            : "Select All"}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Select one or more prep zones for this menu master
                    </p>
                    {prepZones.length === 0 ? (
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          No prep zones available
                        </p>
                      </div>
                    ) : (
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                        <div className="flex flex-wrap gap-2">
                          {prepZones.map((zone) => {
                            const isSelected = selectedPrepZones.has(
                              zone.prepZoneCode
                            );
                            return (
                              <button
                                key={zone.prepZoneId}
                                type="button"
                                onClick={() =>
                                  handlePrepZoneToggle(zone.prepZoneCode)
                                }
                                className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                                }`}
                              >
                                {zone.prepZoneName}
                                {isSelected && (
                                  <CheckIcon className="w-4 h-4 inline-block ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Stations
                      </label>
                      {stations.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAllStations}
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-3 py-1 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          {selectedStations.size === stations.length
                            ? "Deselect All"
                            : "Select All"}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Select one or more stations for this menu master
                    </p>
                    {stations.length === 0 ? (
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          No stations available
                        </p>
                      </div>
                    ) : (
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                        <div className="flex flex-wrap gap-2">
                          {stations.map((station) => {
                            const isSelected = selectedStations.has(
                              station.stationCode
                            );
                            return (
                              <button
                                key={station.tblStationId}
                                type="button"
                                onClick={() =>
                                  handleStationToggle(station.stationCode)
                                }
                                className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                                }`}
                              >
                                {station.stationname || station.stationCode}
                                {isSelected && (
                                  <CheckIcon className="w-4 h-4 inline-block ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
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

              <StatusToggle
                label="Menu Master Status"
                description="Toggle to control whether this menu master is active across the POS."
                value={formData.isActive === 1}
                onChange={(val) =>
                  setFormData({ ...formData, isActive: val ? 1 : 0 })
                }
              />
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
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Menu Master"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
