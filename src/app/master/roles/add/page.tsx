"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Link from "next/link";
import PermissionAssignment from "@/components/master/PermissionAssignment";

export default function AddRolePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    roleCode: "",
    roleName: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.roleCode || !formData.roleName) {
      toast.error("Role code and role name are required");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/roles", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleCode: formData.roleCode.toUpperCase().replace(/\s+/g, "_"),
          roleName: formData.roleName,
          description: formData.description || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Role created successfully");
        router.push(`/master/roles/${data.roleCode}`);
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to create role";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to create role");
        }
      }
    } catch (error) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("Error creating role");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <MasterDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/master/roles"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Roles
          </Link>
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Add New Role
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Create a new role and assign permissions
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.roleCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      roleCode: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., MANAGER, STAFF"
                  pattern="[A-Z0-9_]+"
                  title="Only uppercase letters, numbers, and underscores allowed"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Use uppercase letters, numbers, and underscores only
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.roleName}
                  onChange={(e) =>
                    setFormData({ ...formData, roleName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Manager, Staff Member"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the role's responsibilities..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/master/roles"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Creating..." : "Create Role"}
              </button>
            </div>
          </form>
        </div>

        {/* Note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> After creating the role, you will be redirected to assign permissions to it.
          </p>
        </div>
      </div>
    </MasterDashboardLayout>
  );
}

