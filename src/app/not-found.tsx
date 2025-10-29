"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { HomeIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function NotFound() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
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
            Page Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Sorry, we couldn't find the page you're looking for. It might have
            been moved, deleted, or you entered the wrong URL.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors duration-200"
          >
            <HomeIcon className="w-5 h-5 mr-2" />
            Go to Dashboard
          </Link>

          <div className="text-center">
            <button
              onClick={() => window.history.back()}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
            >
              ← Go back to previous page
            </button>
          </div>
        </div>

        {/* Additional Help */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            If you believe this is an error, please contact support or try
            refreshing the page.
          </p>
        </div>
      </div>
    </div>
  );
}
