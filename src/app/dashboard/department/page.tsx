"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
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
import { useApiWithStore } from "@/hooks/useApiWithStore";

interface Department {
  deptId: string;
  deptCode: string;
  deptName: string | null;
  deptTaxCode: string | null;
  deptTypeCode: string | null;
  isActive: number;
  createdBy?: string | null;
  createdOn?: string;
  updatedBy?: string | null;
  updatedOn?: string | null;
}

interface DepartmentType {
  deptTypeId: string;
  deptTypeCode: string;
  name: string | null;
  isActive: number;
}

interface Tax {
  tblTaxId: string;
  taxCode: string;
  taxname: string;
}

export default function DepartmentPage() {
  const router = useRouter();
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentTypes, setDepartmentTypes] = useState<DepartmentType[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

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
      const [deptsRes, deptTypesRes, taxesRes] = await Promise.all([
        fetch(buildApiUrl("/api/dashboard/department"), {
          cache: "no-store",
        }),
        fetch(buildApiUrl("/api/dashboard/department-type"), {
          cache: "no-store",
        }),
        fetch(buildApiUrl("/api/dashboard/tax"), {
          cache: "no-store",
        }),
      ]);

      // Redirect to access denied if any request returns forbidden
      if (
        deptsRes.status === 403 ||
        deptTypesRes.status === 403 ||
        taxesRes.status === 403
      ) {
        router.push("/dashboard/access-denied");
        return;
      }

      if (deptsRes.ok) {
        const data = await deptsRes.json();
        setDepartments(Array.isArray(data) ? data : []);
      } else {
        toast.error("Error loading departments");
      }

      if (deptTypesRes.ok) {
        const deptTypesData = await deptTypesRes.json();
        setDepartmentTypes(Array.isArray(deptTypesData) ? deptTypesData : []);
      }

      if (taxesRes.ok) {
        const taxesData = await taxesRes.json();
        setTaxes(Array.isArray(taxesData) ? taxesData : []);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Helper functions to get names from codes
  const getDepartmentTypeName = (deptTypeCode: string | null): string => {
    if (!deptTypeCode) return "N/A";
    const deptType = departmentTypes.find(
      (dt) => dt.deptTypeCode === deptTypeCode
    );
    return deptType?.name || deptTypeCode;
  };

  const getTaxName = (taxCode: string | null): string => {
    if (!taxCode) return "N/A";
    const tax = taxes.find((t) => t.taxCode === taxCode);
    return tax?.taxname || taxCode;
  };

  // Navigation handlers
  const handleAdd = () => {
    router.push("/dashboard/department/add");
  };

  const handleEdit = (dept: Department) => {
    router.push(`/dashboard/department/${dept.deptId}/edit`);
  };

  const handleDeleteClick = (dept: Department) => {
    setDeptToDelete(dept);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deptToDelete) return;

    try {
      const url = buildApiUrl(
        `/api/dashboard/department/${deptToDelete.deptId}`
      );
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (response.ok) {
        setDepartments(
          departments.filter((dept) => dept.deptId !== deptToDelete.deptId)
        );
        toast.success("Department deleted successfully");
        setShowDeleteModal(false);
        setDeptToDelete(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete department");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting department");
      console.error("Error:", error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeptToDelete(null);
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
              Departments
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage departments for your restaurant
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Department
          </button>
        </div>

        {/* Departments List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Departments List
            </h3>
          </div>
          {departments.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No departments found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by creating your first department.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Department
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "Department",
                  accessor: "deptName",
                  cell: (dept: Department) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <BuildingOfficeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {dept.deptName || "N/A"}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Department Type",
                  accessor: "deptTypeCode",
                  cell: (dept: Department) => (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {getDepartmentTypeName(dept.deptTypeCode)}
                    </div>
                  ),
                },
                {
                  header: "Tax Name",
                  accessor: "deptTaxCode",
                  cell: (dept: Department) => (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {getTaxName(dept.deptTaxCode)}
                    </div>
                  ),
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (dept: Department) => (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        dept.isActive === 1
                          ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                      }`}
                    >
                      {dept.isActive === 1 ? "Active" : "Inactive"}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "deptId",
                  sortable: false,
                  cell: (dept: Department) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(dept)}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                        title="Edit department"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(dept)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete department"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={departments}
              keyExtractor={(dept: Department) => dept.deptId.toString()}
              searchPlaceholder="Search departments..."
              emptyMessage="No departments found"
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Department"
        itemName={deptToDelete?.deptName || ""}
        description={`Are you sure you want to delete the department "${deptToDelete?.deptName}"? This action cannot be undone.`}
      />
    </DashboardLayout>
  );
}
