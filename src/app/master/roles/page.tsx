"use client";

import { useState, useEffect } from "react";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import DataTable from "@/components/tables/DataTable";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import Link from "next/link";

interface Role {
  roleId: string;
  roleCode: string;
  roleName: string;
  description?: string;
  isSystemRole: boolean;
  isActive: boolean;
  permissionCount: number;
  createdOn: string;
  updatedOn?: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/roles", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      } else {
        toast.error("Failed to fetch roles");
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Error fetching roles");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (roleCode: string) => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(`/api/master/roles/${roleCode}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Role deleted successfully");
        fetchRoles();
        setDeletingId(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete role");
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Error deleting role");
    }
  };

  const columns = [
    {
      header: "Role Code",
      accessor: "roleCode",
      cell: (row: Role) => (
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {row.roleCode}
        </div>
      ),
    },
    {
      header: "Role Name",
      accessor: "roleName",
      cell: (row: Role) => (
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {row.roleName}
        </div>
      ),
    },
    {
      header: "Description",
      accessor: "description",
      cell: (row: Role) => (
        <div className="text-sm text-gray-900 dark:text-white">
          {row.description || "-"}
        </div>
      ),
    },
    {
      header: "Type",
      accessor: "isSystemRole",
      cell: (row: Role) => (
        <span className={`px-2 py-1 rounded text-xs ${
          row.isSystemRole 
            ? "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400" 
            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
        }`}>
          {row.isSystemRole ? "System" : "Custom"}
        </span>
      ),
    },
    {
      header: "Permissions",
      accessor: "permissionCount",
      cell: (row: Role) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {row.permissionCount}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: "roleCode",
      sortable: false,
      cell: (row: Role) => (
        <div className="flex items-center space-x-2">
          <Link
            href={`/master/roles/${row.roleCode}`}
            className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
            title="View/Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </Link>
          {!row.isSystemRole && (
            <button
              onClick={() => setDeletingId(row.roleCode)}
              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
              title="Delete"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <MasterDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheckIcon className="h-8 w-8" />
              Roles & Permissions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage roles and their permissions
            </p>
          </div>
          <Link
            href="/master/roles/add"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Role
          </Link>
        </div>

        {/* Roles List */}
        {loading ? (
          <PageSkeleton />
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Roles List
              </h3>
            </div>
            {roles.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheckIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No roles found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Get started by creating your first role.
                </p>
                <Link
                  href="/master/roles/add"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Role
                </Link>
              </div>
            ) : (
              <DataTable 
                data={roles} 
                columns={columns} 
                keyExtractor={(role) => role.roleId}
                searchPlaceholder="Search roles..."
                emptyMessage="No roles found"
              />
            )}
          </div>
        )}

        <DeleteConfirmationModal
          isOpen={!!deletingId}
          onClose={() => setDeletingId(null)}
          onConfirm={() => {
            if (deletingId) {
              handleDelete(deletingId);
            }
          }}
          title="Delete Role"
          itemName={deletingId ? roles.find(r => r.roleCode === deletingId)?.roleName || deletingId : ""}
          description="This action cannot be undone."
        />
      </div>
    </MasterDashboardLayout>
  );
}

