"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import DataTable from "@/components/tables/DataTable";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface DepartmentType {
  deptTypeId: string;
  deptTypeCode: string;
  name: string | null;
  isActive: number;
  createdBy?: string | null;
  createdOn?: string;
  updatedBy?: string | null;
  updatedOn?: string | null;
}

export default function DepartmentTypePage() {
  const router = useRouter();
  const [departmentTypes, setDepartmentTypes] = useState<DepartmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deptTypeToDelete, setDeptTypeToDelete] =
    useState<DepartmentType | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/department-type", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        setDepartmentTypes(Array.isArray(data) ? data : []);
      } else {
        toast.error("Error loading department types");
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Navigation handlers
  const handleAdd = () => {
    router.push("/master/department/type/add");
  };

  const handleEdit = (deptType: DepartmentType) => {
    router.push(`/master/department/type/${deptType.deptTypeId}/edit`);
  };

  const handleDeleteClick = (deptType: DepartmentType) => {
    setDeptTypeToDelete(deptType);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deptTypeToDelete) return;

    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(
        `/api/master/department-type/${deptTypeToDelete.deptTypeId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setDepartmentTypes(
          departmentTypes.filter(
            (type) => type.deptTypeId !== deptTypeToDelete.deptTypeId
          )
        );
        toast.success("Department type deleted successfully");
        setShowDeleteModal(false);
        setDeptTypeToDelete(null);
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to delete department type";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to delete department type");
        }
      }
    } catch (error: any) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Error deleting department type";
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeptTypeToDelete(null);
  };

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Department Types
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage department types for your restaurant
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Department Type
          </button>
        </div>

        {/* Department Types List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Department Types List
            </h3>
          </div>
          {departmentTypes.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No department types found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by creating your first department type.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Department Type
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "Department Type",
                  accessor: "name",
                  cell: (type: DepartmentType) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <BuildingOfficeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {type.name || "N/A"}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (type: DepartmentType) => (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        type.isActive === 1
                          ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                      }`}
                    >
                      {type.isActive === 1 ? "Active" : "Inactive"}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "deptTypeId",
                  sortable: false,
                  cell: (type: DepartmentType) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(type)}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                        title="Edit department type"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(type)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete department type"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={departmentTypes}
              keyExtractor={(type: DepartmentType) =>
                type.deptTypeId.toString()
              }
              searchPlaceholder="Search department types..."
              emptyMessage="No department types found"
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Department Type"
        itemName={deptTypeToDelete?.name || ""}
        description={`Are you sure you want to delete the department type "${deptTypeToDelete?.name}"? This action cannot be undone.`}
      />
    </MasterDashboardLayout>
  );
}
