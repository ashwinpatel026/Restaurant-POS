"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface TimeEvent {
  id: string;
  eventCode: string;
  eventName: string;
  globalPriceAmountAdd: number | null;
  globalPriceAmountDisc: number | null;
  globalPricePerAdd: number | null;
  globalPricePerDisc: number | null;
  monday: string | null;
  monStartTime: string | null;
  monEndTime: string | null;
  tuesday: string | null;
  tueStartTime: string | null;
  tueEndTime: string | null;
  wednesday: string | null;
  wedStartTime: string | null;
  wedEndTime: string | null;
  thursday: string | null;
  thuStartTime: string | null;
  thuEndTime: string | null;
  friday: string | null;
  friStartTime: string | null;
  friEndTime: string | null;
  saturday: string | null;
  satStartTime: string | null;
  satEndTime: string | null;
  sunday: string | null;
  sunStartTime: string | null;
  sunEndTime: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
  isActive: number;
  createdDate: string | null;
  createdBy: number | null;
  storeCode: string | null;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<TimeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<TimeEvent[]>([]);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter effect
  useEffect(() => {
    applyFilters();
  }, [events, searchTerm]);

  const applyFilters = () => {
    let filtered = [...events];

    // Search by event name or code
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.eventCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      toast.error("Error loading events");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const handleAdd = () => {
    router.push("/dashboard/events/add");
  };

  const handleEdit = (event: TimeEvent) => {
    router.push(`/dashboard/events/${event.id}/edit`);
  };

  const handleDelete = (eventId: string) => {
    setDeletingId(eventId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/events/${deletingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEvents(events.filter((event) => event.id !== deletingId));
        toast.success("Event deleted successfully");
      } else {
        throw new Error("Failed to delete event");
      }
    } catch (error) {
      toast.error("Error deleting event");
      console.error("Error:", error);
    } finally {
      setShowConfirmModal(false);
      setDeletingId(null);
    }
  };

  const getActiveDaysWithTimes = (event: TimeEvent) => {
    const days = [
      {
        name: "Monday",
        key: "monday",
        startTime: event.monStartTime,
        endTime: event.monEndTime,
      },
      {
        name: "Tuesday",
        key: "tuesday",
        startTime: event.tueStartTime,
        endTime: event.tueEndTime,
      },
      {
        name: "Wednesday",
        key: "wednesday",
        startTime: event.wedStartTime,
        endTime: event.wedEndTime,
      },
      {
        name: "Thursday",
        key: "thursday",
        startTime: event.thuStartTime,
        endTime: event.thuEndTime,
      },
      {
        name: "Friday",
        key: "friday",
        startTime: event.friStartTime,
        endTime: event.friEndTime,
      },
      {
        name: "Saturday",
        key: "saturday",
        startTime: event.satStartTime,
        endTime: event.satEndTime,
      },
      {
        name: "Sunday",
        key: "sunday",
        startTime: event.sunStartTime,
        endTime: event.sunEndTime,
      },
    ];

    return days.filter((day) => event[day.key as keyof TimeEvent]);
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    // Convert 24-hour to 12-hour format for display
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getPriceAdjustmentDisplay = (event: TimeEvent) => {
    const parts = [];
    if (event.globalPriceAmountAdd)
      parts.push(`+$${event.globalPriceAmountAdd}`);
    if (event.globalPriceAmountDisc)
      parts.push(`-$${event.globalPriceAmountDisc}`);
    if (event.globalPricePerAdd) parts.push(`+${event.globalPricePerAdd}%`);
    if (event.globalPricePerDisc) parts.push(`-${event.globalPricePerDisc}%`);
    return parts.length > 0 ? parts.join(", ") : "No adjustment";
  };

  const getEventDateDisplay = (event: TimeEvent) => {
    if (!event.eventStartDate || !event.eventEndDate) {
      return "All Date";
    }
    return `${new Date(event.eventStartDate).toLocaleDateString()} - ${new Date(
      event.eventEndDate
    ).toLocaleDateString()}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
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
              Time Events
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage time-based pricing and availability events
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Event
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Events
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by event name or code..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm("");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Events List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Events List ({filteredEvents.length})
            </h3>
          </div>
          <div className="p-6">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClockIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {events.length === 0
                    ? "No events found"
                    : "No events match your filters"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {events.length === 0
                    ? "Get started by creating your first time event."
                    : "Try adjusting your search criteria or clear the filters."}
                </p>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-700"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                          <ClockIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {event.eventName}
                          </h3>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          event.isActive === 1
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                        }`}
                      >
                        {event.isActive === 1 ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Price Adjustment with Border */}
                    <div className="mb-4">
                      <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Price Adjustment
                          </span>
                          <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            {getPriceAdjustmentDisplay(event)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Days with Times */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Active Days:
                      </h4>
                      <div className="space-y-1">
                        {getActiveDaysWithTimes(event).length > 0 ? (
                          getActiveDaysWithTimes(event).map((day, index) => (
                            <div
                              key={index}
                              className="text-xs text-gray-600 dark:text-gray-400"
                            >
                              <span className="font-medium">{day.name}:</span>{" "}
                              {formatTime(day.startTime)} -{" "}
                              {formatTime(day.endTime)}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500 dark:text-gray-500 italic">
                            No active days configured
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Event Duration */}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>
                        <strong className="text-gray-900 dark:text-white">
                          Duration:
                        </strong>{" "}
                        {getEventDateDisplay(event)}
                      </p>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => handleEdit(event)}
                        className="p-2 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        title="Edit event"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete event"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
          <div className="flex items-center justify-center">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
              <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Delete Event
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete this event? This action cannot
                be undone.
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
