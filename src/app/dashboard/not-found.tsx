"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import {
  HomeIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/layouts/DashboardLayout";

export default function DashboardNotFound() {
  const { theme } = useTheme();

  return (
    <DashboardLayout>
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/20">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>

          {/* Error Content */}
          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white">
              404
            </h1>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Dashboard Page Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
              The dashboard page you're looking for doesn't exist or has been
              moved. This might be due to recent updates or changes.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200"
            >
              <HomeIcon className="w-5 h-5 mr-2" />
              Go to Dashboard
            </Link>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Go Back
              </button>

              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200"
              >
                Refresh Page
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Popular dashboard pages:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/dashboard/prep-zone"
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
              >
                Prep Zone
              </Link>
              <Link
                href="/dashboard/menu"
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
              >
                Menu
              </Link>
              <Link
                href="/dashboard/orders"
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
              >
                Orders
              </Link>
              <Link
                href="/dashboard/users"
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
              >
                Users
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
