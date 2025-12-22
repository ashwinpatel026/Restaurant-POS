"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Link from "next/link";
import PermissionAssignment from "@/components/master/PermissionAssignment";

interface Role {
  roleId: string;
  roleCode: string;
  roleName: string;
  description?: string;
  isSystemRole: boolean;
  isActive: boolean;
  permissionCount: number;
  permissions: Array<{
    permissionCode: string;
    permissionName: string;
    module: string;
    action: string;
  }>;
}

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roleCode = params.code as string;
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (roleCode) {
      fetchRole();
    }
  }, [roleCode]);

  const fetchRole = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(`/api/master/roles/${roleCode}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRole(data);
      } else {
        toast.error("Failed to fetch role");
        router.push("/master/roles");
      }
    } catch (error) {
      console.error("Error fetching role:", error);
      toast.error("Error fetching role");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePermissions = async (permissions: string[]) => {
    try {
      setSaving(true);
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(`/api/master/roles/${roleCode}/permissions`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permissions }),
      });

      if (response.ok) {
        toast.success("Permissions updated successfully");
        fetchRole();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update permissions");
      }
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error("Error updating permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MasterDashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </MasterDashboardLayout>
    );
  }

  if (!role) {
    return null;
  }

  const currentPermissions = role.permissions.map(p => p.permissionCode);

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
                {role.roleName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{role.roleCode}</p>
            </div>
            {role.isSystemRole && (
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full text-sm">
                System Role
              </span>
            )}
          </div>
          {role.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">{role.description}</p>
          )}
        </div>

        {/* Permissions Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Permissions
          </h2>
          <PermissionAssignment
            currentPermissions={currentPermissions}
            onSave={handleSavePermissions}
            saving={saving}
            readOnly={role.isSystemRole}
          />
        </div>
      </div>
    </MasterDashboardLayout>
  );
}

