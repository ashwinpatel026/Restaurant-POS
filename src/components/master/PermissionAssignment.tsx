"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Permission {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  module: string;
  action: string;
  description?: string;
}

interface PermissionAssignmentProps {
  currentPermissions: string[];
  onSave: (permissions: string[]) => Promise<void>;
  saving?: boolean;
  readOnly?: boolean;
}

export default function PermissionAssignment({
  currentPermissions,
  onSave,
  saving = false,
  readOnly = false,
}: PermissionAssignmentProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(currentPermissions)
  );
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetchPermissions();
  }, []);

  useEffect(() => {
    setSelectedPermissions(new Set(currentPermissions));
  }, [currentPermissions]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/permissions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter to only show Create, Delete, Update, View operations
        const allowedActions = ["create", "delete", "update", "view"];
        const filteredPermissions = data.permissions.filter((p: Permission) =>
          allowedActions.includes(p.action)
        );
        setPermissions(filteredPermissions);
        // Expand all modules by default
        const modules = new Set<string>(
          filteredPermissions.map((p: Permission) => p.module)
        );
        setExpandedModules(modules);
      } else {
        toast.error("Failed to fetch permissions");
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Error fetching permissions");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionCode: string) => {
    if (readOnly) return;

    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionCode)) {
      newSelected.delete(permissionCode);
    } else {
      newSelected.add(permissionCode);
    }
    setSelectedPermissions(newSelected);
  };

  const toggleModule = (module: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(module)) {
      newExpanded.delete(module);
    } else {
      newExpanded.add(module);
    }
    setExpandedModules(newExpanded);
  };

  const toggleAllInModule = (module: string) => {
    if (readOnly) return;

    const modulePermissions = permissions
      .filter((p) => p.module === module)
      .map((p) => p.permissionCode);

    const allSelected = modulePermissions.every((code) =>
      selectedPermissions.has(code)
    );

    const newSelected = new Set(selectedPermissions);
    if (allSelected) {
      modulePermissions.forEach((code) => newSelected.delete(code));
    } else {
      modulePermissions.forEach((code) => newSelected.add(code));
    }
    setSelectedPermissions(newSelected);
  };

  const handleSave = async () => {
    await onSave(Array.from(selectedPermissions));
  };

  // Group permissions by module and sort by action order (Create, Delete, Update, View)
  const actionOrder = ["create", "update", "delete", "view"];
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Sort permissions within each module by action order
  Object.keys(groupedPermissions).forEach((module) => {
    groupedPermissions[module].sort((a, b) => {
      const indexA = actionOrder.indexOf(a.action);
      const indexB = actionOrder.indexOf(b.action);
      return indexA - indexB;
    });
  });

  const modules = Object.keys(groupedPermissions).sort();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Selected: {selectedPermissions.size} of {permissions.length}{" "}
            permissions
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Permissions"}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {modules.map((module) => {
          const modulePermissions = groupedPermissions[module];
          const moduleSelected = modulePermissions.filter((p) =>
            selectedPermissions.has(p.permissionCode)
          );
          const allSelected =
            moduleSelected.length === modulePermissions.length;
          const isExpanded = expandedModules.has(module);

          return (
            <div
              key={module}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => toggleModule(module)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-lg capitalize text-gray-900 dark:text-white">
                    {module}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({moduleSelected.length}/{modulePermissions.length})
                  </span>
                </div>
                {!readOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAllInModule(module);
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-gray-800">
                  {modulePermissions.map((permission) => {
                    const isSelected = selectedPermissions.has(
                      permission.permissionCode
                    );
                    return (
                      <label
                        key={permission.permissionCode}
                        className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                          readOnly
                            ? "cursor-not-allowed opacity-60"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            togglePermission(permission.permissionCode)
                          }
                          disabled={readOnly}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {permission.action}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
