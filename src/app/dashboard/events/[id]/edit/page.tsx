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
  const [selectedDaysToApply, setSelectedDaysToApply] = useState<Set<string>>(
    new Set()
  );
  const [formData, setFormData] = useState({
    eventName: "",
    priceStrategy: "amount_add",
    priceValue: "",
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

        // Determine which strategy is currently active based on which field has a value
        let priceStrategy = "amount_add";
        let priceValue = "";

        if (event.globalPriceAmountAdd) {
          priceStrategy = "amount_add";
          priceValue = event.globalPriceAmountAdd.toString();
        } else if (event.globalPriceAmountDisc) {
          priceStrategy = "amount_disc";
          priceValue = event.globalPriceAmountDisc.toString();
        } else if (event.globalPricePerAdd) {
          priceStrategy = "percent_add";
          priceValue = event.globalPricePerAdd.toString();
        } else if (event.globalPricePerDisc) {
          priceStrategy = "percent_disc";
          priceValue = event.globalPricePerDisc.toString();
        }

        setFormData({
          eventName: event.eventName || "",
          priceStrategy,
          priceValue,
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

        // Check which days have the same schedule as Monday
        const mondayStartTime = event.monStartTime
          ? event.monStartTime.toString().substring(0, 5)
          : "";
        const mondayEndTime = event.monEndTime
          ? event.monEndTime.toString().substring(0, 5)
          : "";

        if (mondayStartTime && mondayEndTime) {
          const matchingDays = new Set<string>();
          const dayTimeMap = [
            {
              key: "tuesday",
              start: event.tueStartTime?.toString().substring(0, 5) || "",
              end: event.tueEndTime?.toString().substring(0, 5) || "",
            },
            {
              key: "wednesday",
              start: event.wedStartTime?.toString().substring(0, 5) || "",
              end: event.wedEndTime?.toString().substring(0, 5) || "",
            },
            {
              key: "thursday",
              start: event.thuStartTime?.toString().substring(0, 5) || "",
              end: event.thuEndTime?.toString().substring(0, 5) || "",
            },
            {
              key: "friday",
              start: event.friStartTime?.toString().substring(0, 5) || "",
              end: event.friEndTime?.toString().substring(0, 5) || "",
            },
            {
              key: "saturday",
              start: event.satStartTime?.toString().substring(0, 5) || "",
              end: event.satEndTime?.toString().substring(0, 5) || "",
            },
            {
              key: "sunday",
              start: event.sunStartTime?.toString().substring(0, 5) || "",
              end: event.sunEndTime?.toString().substring(0, 5) || "",
            },
          ];

          dayTimeMap.forEach((day) => {
            if (day.start === mondayStartTime && day.end === mondayEndTime) {
              matchingDays.add(day.key);
            }
          });

          setSelectedDaysToApply(matchingDays);
        }
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
      // Map the selected strategy to the appropriate backend fields
      const submitData = { ...formData };

      // Reset all price fields
      submitData.globalPriceAmountAdd = "";
      submitData.globalPriceAmountDisc = "";
      submitData.globalPricePerAdd = "";
      submitData.globalPricePerDisc = "";

      // Set the appropriate field based on selected strategy
      switch (formData.priceStrategy) {
        case "amount_add":
          submitData.globalPriceAmountAdd = formData.priceValue;
          break;
        case "amount_disc":
          submitData.globalPriceAmountDisc = formData.priceValue;
          break;
        case "percent_add":
          submitData.globalPricePerAdd = formData.priceValue;
          break;
        case "percent_disc":
          submitData.globalPricePerDisc = formData.priceValue;
          break;
      }

      const response = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
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

  const applyToDays = (
    sourceDay: string,
    targetGroup: "all" | "working" | "weekend",
    apply: boolean
  ) => {
    const sourceDayData = days.find((d) => d.key === sourceDay);
    if (!sourceDayData) return;

    const updatedFormData = { ...formData };
    let targetDays: string[] = [];

    if (targetGroup === "all") {
      targetDays = days.map((d) => d.key);
    } else if (targetGroup === "working") {
      targetDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    } else if (targetGroup === "weekend") {
      targetDays = ["saturday", "sunday"];
    }

    if (apply) {
      // Apply schedule: copy Monday's times to selected group
      const sourceStartTime = formData[
        `${sourceDayData.shortKey}StartTime` as keyof typeof formData
      ] as string;
      const sourceEndTime = formData[
        `${sourceDayData.shortKey}EndTime` as keyof typeof formData
      ] as string;

      if (!sourceStartTime || !sourceEndTime) {
        toast.error("Please set start and end times for Monday first");
        return;
      }

      targetDays.forEach((dayKey) => {
        const dayData = days.find((d) => d.key === dayKey);
        if (dayData) {
          const dayName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
          (updatedFormData as any)[dayKey] = dayName;
          (updatedFormData as any)[`${dayData.shortKey}StartTime`] =
            sourceStartTime;
          (updatedFormData as any)[`${dayData.shortKey}EndTime`] =
            sourceEndTime;
        }
      });

      setFormData(updatedFormData);
      toast.success(
        `Schedule applied to ${
          targetGroup === "all"
            ? "all days"
            : targetGroup === "working"
            ? "working days"
            : "weekend"
        }`
      );
    } else {
      // Remove schedule: clear selected group
      targetDays.forEach((dayKey) => {
        const dayData = days.find((d) => d.key === dayKey);
        if (dayData) {
          (updatedFormData as any)[dayKey] = "";
          (updatedFormData as any)[`${dayData.shortKey}StartTime`] = "";
          (updatedFormData as any)[`${dayData.shortKey}EndTime`] = "";
        }
      });

      setFormData(updatedFormData);
      toast.success(
        `Schedule removed from ${
          targetGroup === "all"
            ? "all days"
            : targetGroup === "working"
            ? "working days"
            : "weekend"
        }`
      );
    }
  };

  const handleDayCheckboxToggle = (dayKey: string, checked: boolean) => {
    const updatedSelectedDays = new Set(selectedDaysToApply);

    if (checked) {
      updatedSelectedDays.add(dayKey);
    } else {
      updatedSelectedDays.delete(dayKey);
    }

    setSelectedDaysToApply(updatedSelectedDays);

    // Apply or remove schedule for the selected day
    const mondayStartTime = formData.monStartTime as string;
    const mondayEndTime = formData.monEndTime as string;

    if (!mondayStartTime || !mondayEndTime) {
      toast.error("Please set start and end times for Monday first");
      return;
    }

    const dayData = days.find((d) => d.key === dayKey);
    if (!dayData) return;

    const updatedFormData = { ...formData };

    if (checked) {
      // Apply Monday's schedule to selected day
      const dayName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
      (updatedFormData as any)[dayKey] = dayName;
      (updatedFormData as any)[`${dayData.shortKey}StartTime`] =
        mondayStartTime;
      (updatedFormData as any)[`${dayData.shortKey}EndTime`] = mondayEndTime;
      toast.success(`Schedule applied to ${dayData.label}`);
    } else {
      // Remove schedule from day
      (updatedFormData as any)[dayKey] = "";
      (updatedFormData as any)[`${dayData.shortKey}StartTime`] = "";
      (updatedFormData as any)[`${dayData.shortKey}EndTime`] = "";
      toast.success(`Schedule removed from ${dayData.label}`);
    }

    setFormData(updatedFormData);
  };

  const handleSelectAllDays = (checked: boolean) => {
    const mondayStartTime = formData.monStartTime as string;
    const mondayEndTime = formData.monEndTime as string;

    if (!mondayStartTime || !mondayEndTime) {
      toast.error("Please set start and end times for Monday first");
      return;
    }

    const allDaysExceptMonday = days.filter((d) => d.key !== "monday");
    const updatedSelectedDays = new Set<string>();
    const updatedFormData = { ...formData };

    if (checked) {
      // Select all days
      allDaysExceptMonday.forEach((dayData) => {
        updatedSelectedDays.add(dayData.key);
        const dayName =
          dayData.key.charAt(0).toUpperCase() + dayData.key.slice(1);
        (updatedFormData as any)[dayData.key] = dayName;
        (updatedFormData as any)[`${dayData.shortKey}StartTime`] =
          mondayStartTime;
        (updatedFormData as any)[`${dayData.shortKey}EndTime`] = mondayEndTime;
      });
      toast.success("Schedule applied to all days");
    } else {
      // Deselect all days
      allDaysExceptMonday.forEach((dayData) => {
        (updatedFormData as any)[dayData.key] = "";
        (updatedFormData as any)[`${dayData.shortKey}StartTime`] = "";
        (updatedFormData as any)[`${dayData.shortKey}EndTime`] = "";
      });
      toast.success("Schedule removed from all days");
    }

    setSelectedDaysToApply(updatedSelectedDays);
    setFormData(updatedFormData);
  };

  const handleMondayToggle = (checked: boolean) => {
    handleDayToggle("monday");

    // Clear selected days when Monday is unchecked
    if (!checked) {
      setSelectedDaysToApply(new Set());
      // Remove schedule from all selected days
      const updatedFormData = { ...formData };
      selectedDaysToApply.forEach((dayKey) => {
        const dayData = days.find((d) => d.key === dayKey);
        if (dayData) {
          (updatedFormData as any)[dayKey] = "";
          (updatedFormData as any)[`${dayData.shortKey}StartTime`] = "";
          (updatedFormData as any)[`${dayData.shortKey}EndTime`] = "";
        }
      });
      setFormData(updatedFormData);
    }
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
            <div className="space-y-4">
              {/* Radio Button Group */}
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="priceStrategy"
                    value="amount_add"
                    checked={formData.priceStrategy === "amount_add"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priceStrategy: e.target.value,
                        priceValue: "",
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                    Amount Add ($)
                  </span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="priceStrategy"
                    value="percent_add"
                    checked={formData.priceStrategy === "percent_add"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priceStrategy: e.target.value,
                        priceValue: "",
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                    Percentage Add (%)
                  </span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="priceStrategy"
                    value="amount_disc"
                    checked={formData.priceStrategy === "amount_disc"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priceStrategy: e.target.value,
                        priceValue: "",
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                    Amount Discount ($)
                  </span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="priceStrategy"
                    value="percent_disc"
                    checked={formData.priceStrategy === "percent_disc"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priceStrategy: e.target.value,
                        priceValue: "",
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                    Percentage Discount (%)
                  </span>
                </label>
              </div>

              {/* Value Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Value:
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.priceValue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priceValue: e.target.value,
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
                    className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg space-y-4"
                  >
                    {/* First Row: Checkbox, Day Label, and Time Inputs */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => {
                            if (day.key === "monday") {
                              handleMondayToggle(e.target.checked);
                            } else {
                              handleDayToggle(day.key);
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <label className="text-sm font-medium text-gray-900 dark:text-white">
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
                            onChange={(e) => {
                              const newStartTime = e.target.value;
                              const updatedFormData = {
                                ...formData,
                                [`${day.shortKey}StartTime`]: newStartTime,
                              };
                              // Update selected days if Monday's time changes
                              if (
                                day.key === "monday" &&
                                selectedDaysToApply.size > 0
                              ) {
                                selectedDaysToApply.forEach((dayKey) => {
                                  const targetDayData = days.find(
                                    (d) => d.key === dayKey
                                  );
                                  if (targetDayData) {
                                    (updatedFormData as any)[
                                      `${targetDayData.shortKey}StartTime`
                                    ] = newStartTime;
                                  }
                                });
                              }
                              setFormData(updatedFormData);
                            }}
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
                            onChange={(e) => {
                              const newEndTime = e.target.value;
                              const updatedFormData = {
                                ...formData,
                                [`${day.shortKey}EndTime`]: newEndTime,
                              };
                              // Update selected days if Monday's time changes
                              if (
                                day.key === "monday" &&
                                selectedDaysToApply.size > 0
                              ) {
                                selectedDaysToApply.forEach((dayKey) => {
                                  const targetDayData = days.find(
                                    (d) => d.key === dayKey
                                  );
                                  if (targetDayData) {
                                    (updatedFormData as any)[
                                      `${targetDayData.shortKey}EndTime`
                                    ] = newEndTime;
                                  }
                                });
                              }
                              setFormData(updatedFormData);
                            }}
                            placeholder="HH:MM (24-hour format)"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Second Row: Apply to List - Only for Monday, always visible */}
                    {day.key === "monday" && (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-4">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            Apply to:
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {/* Select All Checkbox */}
                            {(() => {
                              const isMondayComplete =
                                formData.monday &&
                                formData.monStartTime &&
                                formData.monEndTime;
                              const allDaysExceptMonday = days.filter(
                                (d) => d.key !== "monday"
                              );
                              const allSelected =
                                allDaysExceptMonday.length > 0 &&
                                allDaysExceptMonday.every((day) =>
                                  selectedDaysToApply.has(day.key)
                                );
                              return (
                                <label
                                  className={`flex items-center ${
                                    isMondayComplete
                                      ? "cursor-pointer"
                                      : "cursor-not-allowed opacity-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={(e) =>
                                      handleSelectAllDays(e.target.checked)
                                    }
                                    disabled={!isMondayComplete}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded disabled:cursor-not-allowed"
                                  />
                                  <span className="ml-2 text-xs font-medium text-gray-900 dark:text-white">
                                    All Days
                                  </span>
                                </label>
                              );
                            })()}
                            {days
                              .filter((d) => d.key !== "monday")
                              .map((targetDay) => {
                                const isMondayComplete =
                                  formData.monday &&
                                  formData.monStartTime &&
                                  formData.monEndTime;
                                return (
                                  <label
                                    key={targetDay.key}
                                    className={`flex items-center ${
                                      isMondayComplete
                                        ? "cursor-pointer"
                                        : "cursor-not-allowed opacity-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedDaysToApply.has(
                                        targetDay.key
                                      )}
                                      onChange={(e) =>
                                        handleDayCheckboxToggle(
                                          targetDay.key,
                                          e.target.checked
                                        )
                                      }
                                      disabled={!isMondayComplete}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded disabled:cursor-not-allowed"
                                    />
                                    <span className="ml-2 text-xs text-gray-900 dark:text-white">
                                      {targetDay.label}
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Dates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Event Duration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Leave blank to keep it active forever
              </p>
            </div>
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
