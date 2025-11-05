"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  ShoppingBagIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { PageSkeleton, StatsSkeleton } from "@/components/ui/SkeletonLoader";

interface DashboardStats {
  todayOrders: number;
  todaySales: number;
  activeOrders: number;
  occupiedTables: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todaySales: 0,
    activeOrders: 0,
    occupiedTables: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Today's Orders",
      value: stats.todayOrders,
      icon: ShoppingBagIcon,
      color: "bg-blue-500",
      change: "+12%",
    },
    {
      title: "Today's Sales",
      value: `$${stats.todaySales.toLocaleString()}`,
      icon: CurrencyDollarIcon,
      color: "bg-green-500",
      change: "+8%",
    },
    {
      title: "Active Orders",
      value: stats.activeOrders,
      icon: ChartBarIcon,
      color: "bg-purple-500",
      change: "",
    },
    {
      title: "Occupied Tables",
      value: stats.occupiedTables,
      icon: UserGroupIcon,
      color: "bg-orange-500",
      change: "",
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back, {session?.user?.name}!
            </p>
          </div>
          <StatsSkeleton count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-1"></div>
                      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-1"></div>
                      <div className="h-5 w-20 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-1"></div>
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    </div>
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back, {session?.user?.name}!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {stat.value}
                  </p>
                  {stat.change && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      {stat.change} from yesterday
                    </p>
                  )}
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Recent Orders
            </h2>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Order #{1000 + i}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Table {i}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      ${(250 * i).toFixed(2)}
                    </p>
                    <span className="badge bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400">
                      Preparing
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
