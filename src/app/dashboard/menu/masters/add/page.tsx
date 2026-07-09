"use client";

import { useState, useEffect, useRef } from "react";
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
import { useFormik } from "formik";
import { menuMasterSchema } from "@/validation/menuMasterSchema";
import { useFormikAutoFocus } from "@/hooks/useFormikAutoFocus";
import { capitalizeFirstLetter } from "@/lib/utils";

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
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(
    new Set()
  );

  // Refs for auto-focus on validation errors
  const nameRef = useRef<HTMLInputElement>(null);
  const labelNameRef = useRef<HTMLInputElement>(null);
  const colorCodeRef = useRef<HTMLElement>(null);
  const forColorCodeRef = useRef<HTMLElement>(null);

  // Formik instance for validation
  const formik = useFormik({
    initialValues: {
      name: "",
      labelName: "",
      colorCode: getPrimaryColor(),
      forColorCode: "#FFFFFF",
      deptCode: "",
      isEventMenu: 0,
      isActive: 1,
      disableInPOS: 0,
    },
    validationSchema: menuMasterSchema,
    onSubmit: async (values, { setTouched }) => {
      // Mark all fields as touched to show errors
      setTouched({
        name: true,
        labelName: true,
        colorCode: true,
        forColorCode: true,
        deptCode: true,
      });

      // Validate and check for errors
      await formik.validateForm();

      // If there are errors, don't submit
      if (Object.keys(formik.errors).length > 0) {
        return;
      }

      // No errors, proceed with submission
      onSubmitForm(values);
    },
    validateOnChange: true,
    validateOnBlur: true,
  });

  // Auto-focus on first error field
  useFormikAutoFocus(formik, {
    name: nameRef,
    labelName: labelNameRef,
    colorCode: colorCodeRef,
    forColorCode: forColorCodeRef,
  });

  useEffect(() => {
    // Set default color to primary color on mount
    formik.setFieldValue("colorCode", getPrimaryColor());
    formik.setFieldValue("forColorCode", "#FFFFFF");
    if (selectedStoreCode) {
      fetchData();
    }
  }, [selectedStoreCode]);

  const fetchData = async () => {
    try {
      const [prepZonesRes, stationsRes, eventsRes, departmentsRes] =
        await Promise.all([
          fetch(buildApiUrl("/api/dashboard/menu/prep-zone"), {
            cache: "no-store",
          }),
          fetch(buildApiUrl("/api/dashboard/station"), { cache: "no-store" }),
          fetch(buildApiUrl("/api/dashboard/events"), { cache: "no-store" }),
          fetch(buildApiUrl("/api/dashboard/department"), {
            cache: "no-store",
          }),
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
        setDepartments(
          departmentsData.filter((d: Department) => d.isActive === 1)
        );
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

  const handleEventToggle = (eventCode: string) => {
    const updated = new Set(selectedEvents);
    if (updated.has(eventCode)) {
      updated.delete(eventCode);
    } else {
      updated.add(eventCode);
    }
    setSelectedEvents(updated);
  };

  const handleSelectAllEvents = () => {
    if (selectedEvents.size === timeEvents.length) {
      setSelectedEvents(new Set());
    } else {
      const allCodes = new Set(timeEvents.map((e) => e.eventCode));
      setSelectedEvents(allCodes);
    }
  };

  async function onSubmitForm(values: any) {
    setLoading(true);

    try {
      const prepZoneCodes = Array.from(selectedPrepZones);
      const stationCodes = Array.from(selectedStations);
      const eventCodes = Array.from(selectedEvents);
      const response = await fetch(buildApiUrl("/api/dashboard/menu/masters"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name.trim(),
          labelName: values.labelName || null,
          colorCode: values.colorCode,
          forColorCode: values.forColorCode,
          deptCode: values.deptCode || null,
          prepZoneCodes: prepZoneCodes.length > 0 ? prepZoneCodes : null,
          stationCodes: stationCodes.length > 0 ? stationCodes : null,
          eventCodes: eventCodes.length > 0 ? eventCodes : null,
          isEventMenu: eventCodes.length > 0 ? 1 : 0,
          isActive: values.isActive,
          disableInPOS: values.disableInPOS,
        }),
      });

      if (response.ok) {
        toast.success("Menu master created successfully!");
        router.push("/dashboard/menu/masters");
      } else {
        try {
          const errorData = await response.json();
          const errorMessage =
            errorData.error || "Failed to create menu master";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to create menu master");
        }
      }
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Error creating menu master";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
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
              Add Menu Master
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create a new menu master for your restaurant
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={formik.handleSubmit}>
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
                        Menu Master Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={nameRef}
                        type="text"
                        maxLength={30}
                        {...formik.getFieldProps("name")}
                        onChange={(e) => {
                          const capitalizedValue = capitalizeFirstLetter(e.target.value);
                          formik.setFieldValue("name", capitalizedValue);
                        }}
                        onBlur={(e) => {
                          formik.handleBlur(e);
                          // Only copy if labelName is blank/empty
                          if (!formik.values.labelName || formik.values.labelName.trim() === "") {
                            formik.setFieldValue("labelName", e.target.value);
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:outline-none transition-all ${formik.errors.name && formik.touched.name
                            ? "border-red-500 dark:border-red-500 animate-shake focus:border-red-500"
                            : "border-gray-300 dark:border-gray-600 focus:border-blue-500"
                          }`}
                        placeholder="Enter menu master name"
                      />
                      {formik.errors.name && formik.touched.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {formik.errors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Label Name
                      </label>
                      <input
                        ref={labelNameRef}
                        type="text"
                        maxLength={30}
                        {...formik.getFieldProps("labelName")}
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:outline-none transition-all ${formik.errors.labelName && formik.touched.labelName
                            ? "border-red-500 dark:border-red-500 animate-shake focus:border-red-500"
                            : "border-gray-300 dark:border-gray-600 focus:border-blue-500"
                          }`}
                        placeholder="Enter display label"
                      />
                      {formik.errors.labelName && formik.touched.labelName && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {formik.errors.labelName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Department
                      </label>
                      <select
                        {...formik.getFieldProps("deptCode")}
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
                    <div>{/* Empty div for alignment */}</div>
                  </div>

                  {/* Color Code Section - All three wrapped */}
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <SystemColorPicker
                          label="Color Code (Background)"
                          value={formik.values.colorCode}
                          onChange={(color: string) =>
                            formik.setFieldValue("colorCode", color)
                          }
                        />
                        {formik.errors.colorCode && formik.touched.colorCode && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {formik.errors.colorCode}
                          </p>
                        )}
                      </div>
                      <div>
                        <TextColorPicker
                          label="Text Color"
                          value={formik.values.forColorCode}
                          onChange={(color: string) =>
                            formik.setFieldValue("forColorCode", color)
                          }
                        />
                        {formik.errors.forColorCode && formik.touched.forColorCode && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {formik.errors.forColorCode}
                          </p>
                        )}
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
                          backgroundColor: formik.values.colorCode || "#3B82F6",
                          color: formik.values.forColorCode || "#FFFFFF",
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
                                className={`relative px-4 py-2 rounded-lg border-2 transition-all ${isSelected
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
                                className={`relative px-4 py-2 rounded-lg border-2 transition-all ${isSelected
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
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select Time Events
                    </label>
                    {timeEvents.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllEvents}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-3 py-1 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        {selectedEvents.size === timeEvents.length
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Select one or more time events to restrict menu availability to
                    specific times/days
                  </p>
                  {timeEvents.length === 0 ? (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No time events available
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                      <div className="flex flex-wrap gap-2">
                        {timeEvents.map((event) => {
                          const isSelected = selectedEvents.has(event.eventCode);
                          return (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => handleEventToggle(event.eventCode)}
                              className={`relative px-4 py-2 rounded-lg border-2 transition-all ${isSelected
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                                }`}
                            >
                              {event.eventName} ({event.eventCode})
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

              <StatusToggle
                label="Menu Master Status"
                description="Toggle to control whether this menu master is active across the POS."
                value={formik.values.isActive === 1}
                onChange={(val) =>
                  formik.setFieldValue("isActive", val ? 1 : 0)
                }
              />

              <StatusToggle
                label="Disable In POS"
                description="Toggle to disable this menu master from appearing in the POS."
                value={formik.values.disableInPOS === 1}
                onChange={(val) =>
                  formik.setFieldValue("disableInPOS", val ? 1 : 0)
                }
                trueLabel="Disabled"
                falseLabel="Enabled"
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
