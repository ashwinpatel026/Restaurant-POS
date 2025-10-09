"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  ClockIcon,
  CalendarDaysIcon,
  CogIcon,
  TagIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

export default function AvailabilityDashboardPage() {
  const [stats, setStats] = useState({
    availability: 0,
    schedules: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch availability stats
      const availabilityResponse = await fetch("/api/menu/availability");
      if (availabilityResponse.ok) {
        const availabilityData = await availabilityResponse.json();
        setStats((prev) => ({
          ...prev,
          availability: availabilityData.length,
        }));
      }

      // Fetch schedule stats
      const scheduleResponse = await fetch("/api/menu/availability-schedule");
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json();
        setStats((prev) => ({
          ...prev,
          schedules: scheduleData.length,
        }));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30",
      green:
        "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30",
      yellow:
        "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
      red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30",
      purple:
        "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30",
      indigo:
        "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30",
    };
    return colors[color] || colors.blue;
  };

  const menuItems = [
    {
      title: "Availability",
      description: "Configure availability periods and time slots",
      href: "/dashboard/availability/availability",
      icon: ClockIcon,
      color: "blue",
      count: stats.availability,
      stats: [
        { label: "Total Availabilities", value: stats.availability },
        { label: "Active", value: stats.availability },
      ],
    },
    {
      title: "Availability Schedules",
      description: "Manage specific time schedules for availability periods",
      href: "/dashboard/menu/availability-schedule",
      icon: CalendarDaysIcon,
      color: "green",
      count: stats.schedules,
      stats: [
        { label: "Total Schedules", value: stats.schedules },
        { label: "Active", value: stats.schedules },
      ],
    },
  ];

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Availability Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage availability and availability schedules for your restaurant
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                    A
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Availability
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats.availability}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                    S
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Schedules
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats.schedules}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className={`block p-6 border-2 border-dashed rounded-lg transition-all duration-200 ${getColorClasses(
                  item.color
                )}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Icon className="w-8 h-8" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="text-sm opacity-75 text-gray-700 dark:text-gray-300">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <div className="flex space-x-4">
                    {item.stats.map((stat, index) => (
                      <div key={index} className="text-center">
                        <p className="text-xs opacity-75 text-gray-600 dark:text-gray-400">
                          {stat.label}
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-75 text-gray-600 dark:text-gray-400">
                      Total
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {item.count}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
