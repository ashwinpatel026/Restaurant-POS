"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    eventName: "",
    globalPriceAmountAdd: "",
    globalPriceAmountDisc: "",
    globalPricePerAdd: "",
    globalPricePerDisc: "",
    monday: "",
    monStartTime: "",
    monEndTime: "",
    tuesday: "",
    tueStartTime: "",
    tueEndTime: "",
    wednesday: "",
    wedStartTime: "",
    wedEndTime: "",
    thursday: "",
    thuStartTime: "",
    thuEndTime: "",
    friday: "",
    friStartTime: "",
    friEndTime: "",
    saturday: "",
    satStartTime: "",
    satEndTime: "",
    sunday: "",
    sunStartTime: "",
    sunEndTime: "",
    eventStartDate: "",
    eventEndDate: "",
    isActive: 1,
    storeCode: "",
  });

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (response.ok) {
        const event = await response.json();
        setFormData({
          eventName: event.eventName || "",
          globalPriceAmountAdd: event.globalPriceAmountAdd?.toString() || "",
          globalPriceAmountDisc: event.globalPriceAmountDisc?.toString() || "",
          globalPricePerAdd: event.globalPricePerAdd?.toString() || "",
          globalPricePerDisc: event.globalPricePerDisc?.toString() || "",
          monday: event.monday || "",
          monStartTime: event.monStartTime
            ? event.monStartTime.toString().substring(0, 5)
            : "",
          monEndTime: event.monEndTime
            ? event.monEndTime.toString().substring(0, 5)
            : "",
          tuesday: event.tuesday || "",
          tueStartTime: event.tueStartTime
            ? event.tueStartTime.toString().substring(0, 5)
            : "",
          tueEndTime: event.tueEndTime
            ? event.tueEndTime.toString().substring(0, 5)
            : "",
          wednesday: event.wednesday || "",
          wedStartTime: event.wedStartTime
            ? event.wedStartTime.toString().substring(0, 5)
            : "",
          wedEndTime: event.wedEndTime
            ? event.wedEndTime.toString().substring(0, 5)
            : "",
          thursday: event.thursday || "",
          thuStartTime: event.thuStartTime
            ? event.thuStartTime.toString().substring(0, 5)
            : "",
          thuEndTime: event.thuEndTime
            ? event.thuEndTime.toString().substring(0, 5)
            : "",
          friday: event.friday || "",
          friStartTime: event.friStartTime
            ? event.friStartTime.toString().substring(0, 5)
            : "",
          friEndTime: event.friEndTime
            ? event.friEndTime.toString().substring(0, 5)
            : "",
          saturday: event.saturday || "",
          satStartTime: event.satStartTime
            ? event.satStartTime.toString().substring(0, 5)
            : "",
          satEndTime: event.satEndTime
            ? event.satEndTime.toString().substring(0, 5)
            : "",
          sunday: event.sunday || "",
          sunStartTime: event.sunStartTime
            ? event.sunStartTime.toString().substring(0, 5)
            : "",
          sunEndTime: event.sunEndTime
            ? event.sunEndTime.toString().substring(0, 5)
            : "",
          eventStartDate: event.eventStartDate
            ? event.eventStartDate.toString().split("T")[0]
            : "",
          eventEndDate: event.eventEndDate
            ? event.eventEndDate.toString().split("T")[0]
            : "",
          isActive: event.isActive || 0,
          storeCode: event.storeCode || "",
        });
      } else {
        toast.error("Failed to load event");
        router.push("/dashboard/events");
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      toast.error("Failed to load event");
      router.push("/dashboard/events");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Debug logging
      console.log("Form data being sent:", formData);
      console.log("Monday times:", {
        monday: formData.monday,
        monStartTime: formData.monStartTime,
        monEndTime: formData.monEndTime,
      });

      const response = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Event updated successfully");
        router.push("/dashboard/events");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update event");
      }
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  const handleDayToggle = (day: string) => {
    const dayKey = day.toLowerCase() as keyof typeof formData;
    setFormData({
      ...formData,
      [dayKey]: formData[dayKey]
        ? ""
        : day.charAt(0).toUpperCase() + day.slice(1), // Store day name like "Monday"
    });
  };

  const days = [
    { key: "monday", label: "Monday", shortKey: "mon" },
    { key: "tuesday", label: "Tuesday", shortKey: "tue" },
    { key: "wednesday", label: "Wednesday", shortKey: "wed" },
    { key: "thursday", label: "Thursday", shortKey: "thu" },
    { key: "friday", label: "Friday", shortKey: "fri" },
    { key: "saturday", label: "Saturday", shortKey: "sat" },
    { key: "sunday", label: "Sunday", shortKey: "sun" },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push("/dashboard/events")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Event
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Update event details and schedule
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.eventName}
                  onChange={(e) =>
                    setFormData({ ...formData, eventName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Happy Hour Special"
                />
              </div>
            </div>
          </div>

          {/* Price Adjustments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Price Adjustments
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount Add ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.globalPriceAmountAdd}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      globalPriceAmountAdd: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount Discount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.globalPriceAmountDisc}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      globalPriceAmountDisc: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Percentage Add (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.globalPricePerAdd}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      globalPricePerAdd: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Percentage Discount (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.globalPricePerDisc}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      globalPricePerDisc: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Weekly Schedule
            </h2>
            <div className="space-y-4">
              {days.map((day) => {
                const dayKey = day.key as keyof typeof formData;
                const isActive = Boolean(formData[dayKey]);

                return (
                  <div
                    key={day.key}
                    className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                  >
                    <div className="flex items-center w-40">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleDayToggle(day.key)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                        {day.label}
                      </label>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Start Time
                        </label>
                        <input
                          type="text"
                          disabled={!isActive}
                          value={
                            (formData[
                              `${day.shortKey}StartTime` as keyof typeof formData
                            ] as string) || ""
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [`${day.shortKey}StartTime`]: e.target.value,
                            })
                          }
                          placeholder="HH:MM (24-hour format)"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          End Time
                        </label>
                        <input
                          type="text"
                          disabled={!isActive}
                          value={
                            (formData[
                              `${day.shortKey}EndTime` as keyof typeof formData
                            ] as string) || ""
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [`${day.shortKey}EndTime`]: e.target.value,
                            })
                          }
                          placeholder="HH:MM (24-hour format)"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Dates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Event Duration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.eventStartDate || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      eventStartDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.eventEndDate || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, eventEndDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Active (Event is enabled and will be applied)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/events")}
              className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Updating..." : "Update Event"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
