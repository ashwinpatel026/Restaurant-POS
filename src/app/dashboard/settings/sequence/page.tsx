"use client";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import SettingsNav from "@/components/settings/SettingsNav";

export default function SequenceSettingsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sequence Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage numbering sequences for orders, receipts, and related records
          </p>
        </div>

        <SettingsNav />
      </div>
    </DashboardLayout>
  );
}
