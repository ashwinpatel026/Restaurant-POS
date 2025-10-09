"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarDaysIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import DataTable from "@/components/tables/DataTable";

interface AvailabilitySchedule {
  id: number;
  avaiCode: string;
  dayName: string;
  startTime: string | Date;
  endTime: string | Date;
  availability?: {
    avaiName: string;
  };
}

interface Availability {
  availabilityId: number;
  avaiCode: string;
  avaiName: string;
  isActive: number;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "AllDays",
];

export default function AvailabilitySchedulePage() {
  const [schedules, setSchedules] = useState<AvailabilitySchedule[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<AvailabilitySchedule | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] =
    useState<AvailabilitySchedule | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedulesResponse, availabilityResponse] = await Promise.all([
        fetch("/api/menu/availability-schedule"),
        fetch("/api/menu/availability"),
      ]);

      if (schedulesResponse.ok && availabilityResponse.ok) {
        const schedulesData = await schedulesResponse.json();
        const availabilityData = await availabilityResponse.json();
        setSchedules(schedulesData);
        setAvailability(availabilityData);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalSchedules = schedules.length;
  const activeAvailabilities = availability.filter(
    (item) => item.isActive === 1
  ).length;

  // Modal handlers
  const handleAdd = () => {
    setEditingSchedule(null);
    setShowModal(true);
  };

  const handleEdit = (schedule: AvailabilitySchedule) => {
    setEditingSchedule(schedule);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const url = editingSchedule
        ? `/api/menu/availability-schedule/${editingSchedule.id}`
        : "/api/menu/availability-schedule";
      const method = editingSchedule ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingSchedule
            ? "Schedule updated successfully"
            : "Schedule created successfully"
        );
        fetchData();
        setShowModal(false);
        setEditingSchedule(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Error saving schedule");
      }
    } catch (error) {
      toast.error("Error saving schedule");
      console.error("Error:", error);
    }
  };

  const handleDeleteClick = (schedule: AvailabilitySchedule) => {
    setScheduleToDelete(schedule);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return;

    try {
      const response = await fetch(
        `/api/menu/availability-schedule/${scheduleToDelete.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Schedule deleted successfully");
        fetchData();
        setShowDeleteModal(false);
        setScheduleToDelete(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Error deleting schedule");
      }
    } catch (error) {
      toast.error("Error deleting schedule");
      console.error("Error:", error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setScheduleToDelete(null);
  };

  // Helper to format time
  const formatTime = (time: string | Date) => {
    if (!time) return "--:--";

    try {
      // If it's already a properly formatted string (HH:MM), return it
      if (typeof time === "string" && /^\d{2}:\d{2}$/.test(time)) {
        return time;
      }

      // If it's a Date object
      if (time instanceof Date) {
        return time.toTimeString().slice(0, 5);
      }

      // For any other string format, try to extract HH:MM
      const timeStr = time.toString();
      if (timeStr.includes(":")) {
        const match = timeStr.match(/(\d{2}:\d{2})/);
        return match ? match[1] : "--:--";
      }

      return "--:--";
    } catch (error) {
      console.error("Error formatting time:", error, time);
      return "--:--";
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
              Availability Schedules
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage specific time schedules for availability periods
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Schedule
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Schedules
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {totalSchedules}
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
                  Available Availabilities
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {activeAvailabilities}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                    D
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Days Covered
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {DAYS.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    AVG
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Schedules per Day
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {DAYS.length > 0
                    ? (totalSchedules / DAYS.length).toFixed(1)
                    : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedules List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Schedules List
            </h3>
          </div>
          {schedules.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDaysIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No schedules found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by creating your first schedule configuration.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Schedule
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "#",
                  accessor: "id",
                  sortable: false,
                  cell: (item: AvailabilitySchedule, index?: number) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {(index ?? 0) + 1}
                        </span>
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Availability",
                  accessor: "availability",
                  cell: (item: AvailabilitySchedule) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.availability?.avaiName || "Unknown"}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Day",
                  accessor: "dayName",
                  cell: (item: AvailabilitySchedule) => (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      {item.dayName}
                    </span>
                  ),
                },
                {
                  header: "Start Time",
                  accessor: "startTime",
                  cell: (item: AvailabilitySchedule) => (
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatTime(item.startTime)}
                    </div>
                  ),
                },
                {
                  header: "End Time",
                  accessor: "endTime",
                  cell: (item: AvailabilitySchedule) => (
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatTime(item.endTime)}
                    </div>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "id",
                  sortable: false,
                  cell: (item: AvailabilitySchedule) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-1 rounded transition-colors duration-200"
                        title="Edit schedule"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete schedule"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={schedules}
              keyExtractor={(item: AvailabilitySchedule) => item.id.toString()}
              searchPlaceholder="Search schedules..."
              emptyMessage="No schedules found"
            />
          )}
        </div>

        {/* Modals */}
        <CRUDModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingSchedule(null);
          }}
          title={editingSchedule ? "Edit Schedule" : "Add New Schedule"}
          size="md"
        >
          <ScheduleForm
            schedule={editingSchedule}
            availability={availability}
            onSave={handleSave}
            onCancel={() => {
              setShowModal(false);
              setEditingSchedule(null);
            }}
          />
        </CRUDModal>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
                  <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-2">
                  Delete Schedule
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete this schedule? This action
                    cannot be undone.
                  </p>
                </div>
                <div className="items-center px-4 py-3">
                  <div className="flex space-x-3">
                    <button
                      onClick={handleDeleteCancel}
                      className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-24 shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Schedule Form Component
function ScheduleForm({
  schedule,
  availability,
  onSave,
  onCancel,
}: {
  schedule?: AvailabilitySchedule | null;
  availability: Availability[];
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    avaiCode: "",
    dayName: "Monday",
    startTime: "09:00",
    endTime: "17:00",
  });

  // Helper function to ensure 24-hour format
  const ensure24HourFormat = (timeValue: string) => {
    if (!timeValue) return "00:00";

    // If the value contains AM/PM, convert to 24-hour format
    const timeStr = timeValue.toString().toUpperCase();

    if (timeStr.includes("AM") || timeStr.includes("PM")) {
      const [time, period] = timeStr.split(/(AM|PM)/);
      const [hours, minutes] = time.trim().split(":");

      let hour24 = parseInt(hours);

      if (period === "AM" && hour24 === 12) {
        hour24 = 0;
      } else if (period === "PM" && hour24 !== 12) {
        hour24 += 12;
      }

      return `${hour24.toString().padStart(2, "0")}:${minutes || "00"}`;
    }

    // If it's already in 24-hour format, return as is
    return timeValue;
  };

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (schedule) {
      setFormData({
        avaiCode: schedule.avaiCode,
        dayName: schedule.dayName,
        startTime:
          typeof schedule.startTime === "string"
            ? schedule.startTime.slice(0, 5)
            : schedule.startTime.toTimeString().slice(0, 5),
        endTime:
          typeof schedule.endTime === "string"
            ? schedule.endTime.slice(0, 5)
            : schedule.endTime.toTimeString().slice(0, 5),
      });
    }
  }, [schedule]);

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
          Availability *
        </label>
        <select
          required
          value={formData.avaiCode}
          onChange={(e) =>
            setFormData({ ...formData, avaiCode: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">Select availability</option>
          {availability
            .filter((item) => item.isActive === 1)
            .map((item) => (
              <option key={item.avaiCode} value={item.avaiCode}>
                {item.avaiName}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Day *
        </label>
        <select
          required
          value={formData.dayName}
          onChange={(e) =>
            setFormData({ ...formData, dayName: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          {DAYS.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Time *
          </label>
          <div className="flex gap-2">
            <select
              required
              value={formData.startTime.split(":")[0] || "09"}
              onChange={(e) => {
                const minutes = formData.startTime.split(":")[1] || "00";
                setFormData({
                  ...formData,
                  startTime: `${e.target.value.padStart(2, "0")}:${minutes}`,
                });
              }}
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i.toString().padStart(2, "0")}>
                  {i.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="flex items-center text-gray-500">:</span>
            <select
              required
              value={formData.startTime.split(":")[1] || "00"}
              onChange={(e) => {
                const hours = formData.startTime.split(":")[0];
                setFormData({
                  ...formData,
                  startTime: `${hours}:${e.target.value.padStart(2, "0")}`,
                });
              }}
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i.toString().padStart(2, "0")}>
                  {i.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Time *
          </label>
          <div className="flex gap-2">
            <select
              required
              value={formData.endTime.split(":")[0] || "17"}
              onChange={(e) => {
                const minutes = formData.endTime.split(":")[1] || "00";
                setFormData({
                  ...formData,
                  endTime: `${e.target.value.padStart(2, "0")}:${minutes}`,
                });
              }}
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i.toString().padStart(2, "0")}>
                  {i.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="flex items-center text-gray-500">:</span>
            <select
              required
              value={formData.endTime.split(":")[1] || "00"}
              onChange={(e) => {
                const hours = formData.endTime.split(":")[0];
                setFormData({
                  ...formData,
                  endTime: `${hours}:${e.target.value.padStart(2, "0")}`,
                });
              }}
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i.toString().padStart(2, "0")}>
                  {i.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
        </div>
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
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        >
          {loading ? "Saving..." : schedule ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
