"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";

interface Availability {
  availabilityId: number;
  avaiDays?: string;
  avilTime?: string;
}

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingAvailability, setEditingAvailability] =
    useState<Availability | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/menu/availability");

      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
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
    setEditingAvailability(null);
    setShowModal(true);
  };

  const handleEdit = (availabilityItem: Availability) => {
    setEditingAvailability(availabilityItem);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const url = editingAvailability
        ? `/api/menu/availability/${editingAvailability.availabilityId}`
        : "/api/menu/availability";

      const method = editingAvailability ? "PUT" : "POST";

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
          editingAvailability
            ? "Availability updated successfully!"
            : "Availability created successfully!"
        );
        setShowModal(false);
        setEditingAvailability(null);
        fetchData(); // Refresh data
      } else {
        throw new Error("Failed to save availability");
      }
    } catch (error) {
      toast.error("Error saving availability");
      console.error("Error:", error);
    }
  };

  const handleDelete = (availabilityId: number) => {
    setDeletingId(availabilityId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/menu/availability/${deletingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAvailability(
          availability.filter((a) => a.availabilityId !== deletingId)
        );
        toast.success("Availability deleted successfully");
      } else {
        throw new Error("Failed to delete availability");
      }
    } catch (error) {
      toast.error("Error deleting availability");
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
              Availability
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage availability schedules for menu items and categories
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Availability
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Schedules
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {availability.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Availability List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Availability Schedules
            </h3>
          </div>
          <div className="overflow-x-auto">
            {availability.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClockIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No availability schedules found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Get started by creating your first availability schedule.
                </p>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Availability
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time Slot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {availability.map((item) => (
                    <tr
                      key={item.availabilityId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                            <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.avaiDays === "All Days"
                                ? "All Days"
                                : item.avaiDays
                                    ?.split(",")
                                    .map((day) => day.trim())
                                    .join(", ") || "No Days"}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {item.availabilityId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {item.avilTime === "All Times"
                            ? "All Times (24/7)"
                            : item.avilTime || "No Time Set"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                            title="Edit availability"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.availabilityId)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                            title="Delete availability"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <CRUDModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingAvailability(null);
        }}
        title={
          editingAvailability ? "Edit Availability" : "Add New Availability"
        }
        size="lg"
      >
        <AvailabilityForm
          availability={editingAvailability}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingAvailability(null);
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
              Delete Availability Schedule
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete this availability schedule? This
                action cannot be undone.
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

// Availability Form Component
function AvailabilityForm({
  availability,
  onSave,
  onCancel,
}: {
  availability?: Availability | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    selectedDays: [] as string[],
    fromTime: "",
    toTime: "",
    allTimes: false,
  });

  const [loading, setLoading] = useState(false);

  const dayOptions = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Generate 24-hour time options
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        times.push(timeString);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  useEffect(() => {
    if (availability) {
      // Parse existing days (e.g., "Monday,Tuesday" or "All Days")
      const daysString = availability.avaiDays || "";
      const selectedDays =
        daysString === "All Days"
          ? [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ]
          : daysString
          ? daysString.split(",").map((day) => day.trim())
          : [];

      // Parse existing time slot (e.g., "09:00 - 18:00" or "All Times")
      const timeSlot = availability.avilTime || "";
      const allTimes = timeSlot === "All Times";
      const [fromTime = "", toTime = ""] = timeSlot.includes(" - ")
        ? timeSlot.split(" - ")
        : ["", ""];

      setFormData({
        selectedDays: selectedDays,
        fromTime: fromTime,
        toTime: toTime,
        allTimes: allTimes,
      });
    }
  }, [availability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate that at least one day is selected
      if (formData.selectedDays.length === 0) {
        toast.error("Please select at least one day");
        setLoading(false);
        return;
      }

      // Format days string
      const avaiDays =
        formData.selectedDays.length === 7
          ? "All Days"
          : formData.selectedDays.join(",");

      // Format time string
      const avilTime = formData.allTimes
        ? "All Times"
        : formData.fromTime && formData.toTime
        ? `${formData.fromTime} - ${formData.toTime}`
        : formData.fromTime || formData.toTime || "";

      const dataToSave = {
        avaiDays,
        avilTime,
      };

      await onSave(dataToSave);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Days *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {dayOptions.map((day) => (
            <label key={day} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.selectedDays.includes(day)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData({
                      ...formData,
                      selectedDays: [...formData.selectedDays, day],
                    });
                  } else {
                    setFormData({
                      ...formData,
                      selectedDays: formData.selectedDays.filter(
                        (d) => d !== day
                      ),
                    });
                  }
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {day}
              </span>
            </label>
          ))}
        </div>
        {formData.selectedDays.length === 0 && (
          <p className="text-sm text-red-500 dark:text-red-400 mt-1">
            Please select at least one day
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Time Settings
        </label>

        {/* All Times Option */}
        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.allTimes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  allTimes: e.target.checked,
                  fromTime: e.target.checked ? "" : formData.fromTime,
                  toTime: e.target.checked ? "" : formData.toTime,
                })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              All Times (24/7)
            </span>
          </label>
        </div>

        {/* Time Range (only show if All Times is not checked) */}
        {!formData.allTimes && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Time
              </label>
              <select
                value={formData.fromTime}
                onChange={(e) =>
                  setFormData({ ...formData, fromTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option
                  value=""
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  Select start time
                </option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Time
              </label>
              <select
                value={formData.toTime}
                onChange={(e) =>
                  setFormData({ ...formData, toTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option
                  value=""
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  Select end time
                </option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
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
          {loading ? "Saving..." : availability ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
