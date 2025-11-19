"use client";

import { useEffect, useState } from "react";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import { useMasterAuth } from "@/contexts/MasterAuthContext";
import {
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import Link from "next/link";

interface DashboardStats {
  totalCompanies: number;
  totalDealers: number;
  totalLocations: number;
  totalUsers: number;
}

export default function MasterDashboardPage() {
  const { admin } = useMasterAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalDealers: 0,
    totalLocations: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const [companiesRes, dealersRes, locationsRes, usersRes] = await Promise.all([
        fetch("/api/master/companies", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/master/dealers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/master/locations", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/master/users", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const companies = companiesRes.ok ? await companiesRes.json() : [];
      const dealers = dealersRes.ok ? await dealersRes.json() : [];
      const locations = locationsRes.ok ? await locationsRes.json() : [];
      const users = usersRes.ok ? await usersRes.json() : [];

      setStats({
        totalCompanies: companies.length || 0,
        totalDealers: dealers.length || 0,
        totalLocations: locations.length || 0,
        totalUsers: users.length || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      name: "Companies",
      value: stats.totalCompanies,
      icon: BuildingOfficeIcon,
      href: "/master/companies",
      color: "bg-blue-500",
    },
    {
      name: "Dealers",
      value: stats.totalDealers,
      icon: BuildingStorefrontIcon,
      href: "/master/dealers",
      color: "bg-green-500",
    },
    {
      name: "Locations",
      value: stats.totalLocations,
      icon: MapPinIcon,
      href: "/master/locations",
      color: "bg-purple-500",
    },
    {
      name: "Users",
      value: stats.totalUsers,
      icon: UserGroupIcon,
      href: "/master/users",
      color: "bg-orange-500",
    },
  ];

  if (loading) {
    return (
      <MasterDashboardLayout>
        <PageSkeleton />
      </MasterDashboardLayout>
    );
  }

  return (
    <MasterDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Master Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back, {admin?.name}! Manage your multi-tenant system.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <Link
              key={stat.name}
              href={stat.href}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/master/companies"
              className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Manage Companies
              </span>
            </Link>
            <Link
              href="/master/dealers"
              className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <BuildingStorefrontIcon className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Manage Dealers
              </span>
            </Link>
            <Link
              href="/master/locations"
              className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <MapPinIcon className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Manage Locations
              </span>
            </Link>
            <Link
              href="/master/users"
              className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <UserGroupIcon className="w-6 h-6 text-orange-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Manage Users
              </span>
            </Link>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <ArrowTrendingUpIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Multi-Tenant System
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                This master dashboard allows you to manage companies, dealers, locations, and users
                across your entire system. Use the location dashboard for day-to-day operations
                like orders, menu management, and reports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MasterDashboardLayout>
  );
}

