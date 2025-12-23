"use client";

import { useRouter } from "next/navigation";
import { 
  ShieldExclamationIcon, 
  ArrowLeftIcon,
  HomeIcon 
} from "@heroicons/react/24/outline";
import Link from "next/link";
import DashboardLayout from "@/components/layouts/DashboardLayout";

export default function AccessDeniedPage() {
  const router = useRouter();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      // If no history, redirect to dashboard
      router.push("/dashboard");
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-100 dark:bg-red-900/20 rounded-full animate-ping opacity-75" />
              <div className="relative bg-red-50 dark:bg-red-900/30 rounded-full p-6">
                <ShieldExclamationIcon className="w-16 h-16 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Access Denied
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
            Please contact your administrator if you believe this is an error.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Go Back
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
            >
              <HomeIcon className="w-5 h-5 mr-2" />
              Go to Dashboard
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Error Code: 403 - Forbidden
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

