"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import DataTable from "@/components/tables/DataTable";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";

interface EmployeeType {
  employeeTypeId: string;
  typeCode: string;
  typeName: string | null;
  description: string | null;
  isActive: boolean;
  createdBy?: string | null;
  createdOn?: string;
  updatedBy?: string | null;
  updatedOn?: string | null;
}

export default function EmployeeTypePage() {
  const router = useRouter();
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeTypeToDelete, setEmployeeTypeToDelete] =
    useState<EmployeeType | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedStoreCode]);

  const fetchData = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const url = buildApiUrl("/api/dashboard/employee-type");
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (response.status === 403) {
        router.push("/dashboard/access-denied");
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setEmployeeTypes(Array.isArray(data) ? data : []);
      } else {
        toast.error("Error loading employee types");
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
    router.push("/dashboard/employee/type/add");
  };

  const handleEdit = (employeeType: EmployeeType) => {
    router.push(`/dashboard/employee/type/${employeeType.employeeTypeId}/edit`);
  };

  const handleDeleteClick = (employeeType: EmployeeType) => {
    setEmployeeTypeToDelete(employeeType);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeTypeToDelete) return;

    try {
      const url = buildApiUrl(
        `/api/dashboard/employee-type/${employeeTypeToDelete.employeeTypeId}`
      );
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (response.ok) {
        setEmployeeTypes(
          employeeTypes.filter(
            (type) => type.employeeTypeId !== employeeTypeToDelete.employeeTypeId
          )
        );
        toast.success("Employee type deleted successfully");
        setShowDeleteModal(false);
        setEmployeeTypeToDelete(null);
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to delete employee type";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to delete employee type");
        }
      }
    } catch (error: any) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Error deleting employee type";
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setEmployeeTypeToDelete(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Employee Types
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage employee types for your restaurant
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Employee Type
          </button>
        </div>

        {/* Employee Types List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Employee Types List
            </h3>
          </div>
          {employeeTypes.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No employee types found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by creating your first employee type.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Employee Type
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "Employee Type",
                  accessor: "typeName",
                  cell: (type: EmployeeType) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {type.typeName || "N/A"}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Description",
                  accessor: "description",
                  cell: (type: EmployeeType) => (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {type.description || "N/A"}
                    </div>
                  ),
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (type: EmployeeType) => (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        type.isActive
                          ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                      }`}
                    >
                      {type.isActive ? "Active" : "Inactive"}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "employeeTypeId",
                  sortable: false,
                  cell: (type: EmployeeType) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(type)}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                        title="Edit employee type"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(type)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete employee type"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={employeeTypes}
              keyExtractor={(type: EmployeeType) =>
                type.employeeTypeId.toString()
              }
              searchPlaceholder="Search employee types..."
              emptyMessage="No employee types found"
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Employee Type"
        itemName={employeeTypeToDelete?.typeName || ""}
        description={`Are you sure you want to delete the employee type "${employeeTypeToDelete?.typeName}"? This action cannot be undone.`}
      />
    </DashboardLayout>
  );
}

