"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  ArrowRightIcon,
  ChartBarIcon,
  DocumentTextIcon,
  TagIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import toast from "react-hot-toast";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

export default function MenuManagementPage() {
  const [stats, setStats] = useState({
    menuMasters: 0,
    categories: 0,
    menuItems: 0,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [mastersRes, categoriesRes, itemsRes] = await Promise.all([
          fetch("/api/menu/masters"),
          fetch("/api/menu/categories"),
          fetch("/api/menu/items"),
        ]);

        setStats({
          menuMasters: mastersRes.ok ? (await mastersRes.json()).length : 0,
          categories: categoriesRes.ok
            ? (await categoriesRes.json()).length
            : 0,
          menuItems: itemsRes.ok ? (await itemsRes.json()).length : 0,
        });
      } catch (e) {
        console.error("Failed to load menu counts", e);
      }
    };
    fetchCounts();
  }, []);

  const managementSections = [
    {
      title: "Menu Masters",
      description: "Manage main menu configurations and settings",
      href: "/dashboard/menu/masters",
      icon: DocumentTextIcon,
      color: "blue",
      count: stats.menuMasters,
      stats: [
        { label: "Total Masters", value: stats.menuMasters },
        { label: "Active", value: stats.menuMasters },
      ],
    },
    {
      title: "Menu Categories",
      description: "Organize menu items into categories",
      href: "/dashboard/menu/categories",
      icon: TagIcon,
      color: "green",
      count: stats.categories,
      stats: [
        { label: "Total Categories", value: stats.categories },
        { label: "Active", value: stats.categories },
      ],
    },
    {
      title: "Menu Items",
      description: "Manage individual menu items and pricing",
      href: "/dashboard/menu/items",
      icon: CubeIcon,
      color: "purple",
      count: stats.menuItems,
      stats: [
        { label: "Total Items", value: stats.menuItems },
        { label: "With Modifiers", value: stats.menuItems },
      ],
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        icon: "text-blue-600 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-700",
        hover: "hover:border-blue-300 dark:hover:border-blue-600",
      },
      green: {
        bg: "bg-green-50 dark:bg-green-900/20",
        icon: "text-green-600 dark:text-green-400",
        border: "border-green-200 dark:border-green-700",
        hover: "hover:border-green-300 dark:hover:border-green-600",
      },
      purple: {
        bg: "bg-purple-50 dark:bg-purple-900/20",
        icon: "text-purple-600 dark:text-purple-400",
        border: "border-purple-200 dark:border-purple-700",
        hover: "hover:border-purple-300 dark:hover:border-purple-600",
      },
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  // Removed loading gate as we only display counts when available

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Menu Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive menu system management dashboard
            </p>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managementSections.map((section) => {
            const Icon = section.icon;
            const colorClasses = getColorClasses(section.color);

            return (
              <Link
                key={section.title}
                href={section.href}
                className={`group block bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 ${colorClasses.border} ${colorClasses.hover} transition-all duration-200 hover:shadow-md`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${colorClasses.bg}`}>
                      <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
                    </div>
                    <ArrowRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {section.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    {section.description}
                  </p>

                  <div className="flex justify-between items-center">
                    <div className="flex space-x-4">
                      {section.stats.map((stat, index) => (
                        <div key={index} className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {stat.label}
                          </p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses.bg} ${colorClasses.icon}`}
                    >
                      {section.count} Total
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/menu/masters"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <DocumentTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Create Menu Master
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Set up new menu configuration
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/menu/items"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <CubeIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Add Menu Item
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create new menu items
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/menu/categories"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <TagIcon className="w-5 h-5 text-green-600 dark:text-green-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Organize Categories
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage menu categories
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
