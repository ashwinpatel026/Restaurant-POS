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
import {
  formatPhoneDisplay,
  createEmailLink,
  createPhoneLink,
} from "@/lib/utils";

interface Employee {
  employeeId: string;
  employeeCode: string;
  employeeType: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneno: string | null;
  roleCode: string | null;
  isActive: number | null;
  createdBy?: string | null;
  createdOn?: string;
  updatedBy?: string | null;
  updatedOn?: string | null;
}

interface EmployeeType {
  employeeTypeId: string;
  typeCode: string;
  typeName: string | null;
}

export default function EmployeePage() {
  const router = useRouter();
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null
  );

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
      const [employeesRes, employeeTypesRes] = await Promise.all([
        fetch(buildApiUrl("/api/dashboard/employee"), {
          cache: "no-store",
        }),
        fetch(buildApiUrl("/api/dashboard/employee-type"), {
          cache: "no-store",
        }),
      ]);

      if (employeesRes.status === 403) {
        router.push("/dashboard/access-denied");
        return;
      }

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(Array.isArray(data) ? data : []);
      } else {
        toast.error("Error loading employees");
      }

      if (employeeTypesRes.ok) {
        const empTypesData = await employeeTypesRes.json();
        setEmployeeTypes(Array.isArray(empTypesData) ? empTypesData : []);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Helper function to get employee type name
  const getEmployeeTypeName = (typeCode: string | null): string => {
    if (!typeCode) return "N/A";
    const empType = employeeTypes.find((et) => et.typeCode === typeCode);
    return empType?.typeName || typeCode;
  };

  // Navigation handlers
  const handleAdd = () => {
    router.push("/dashboard/employee/add");
  };

  const handleEdit = (employee: Employee) => {
    router.push(`/dashboard/employee/${employee.employeeId}/edit`);
  };

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;

    try {
      const url = buildApiUrl(
        `/api/dashboard/employee/${employeeToDelete.employeeId}`
      );
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (response.ok) {
        setEmployees(
          employees.filter(
            (emp) => emp.employeeId !== employeeToDelete.employeeId
          )
        );
        toast.success("Employee deleted successfully");
        setShowDeleteModal(false);
        setEmployeeToDelete(null);
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to delete employee";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to delete employee");
        }
      }
    } catch (error: any) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Error deleting employee";
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setEmployeeToDelete(null);
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
              Employees
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage employees for your restaurant
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Employee
          </button>
        </div>

        {/* Employees List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Employees List
            </h3>
          </div>
          {employees.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No employees found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by creating your first employee.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Employee
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "Employee",
                  accessor: "firstName",
                  cell: (emp: Employee) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {emp.firstName || ""} {emp.lastName || ""}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Email",
                  accessor: "email",
                  cell: (emp: Employee) => {
                    const emailLink = createEmailLink(emp.email);
                    if (!emailLink) {
                      return (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          N/A
                        </div>
                      );
                    }
                    return (
                      <a
                        href={emailLink}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                      >
                        {emp.email}
                      </a>
                    );
                  },
                },
                {
                  header: "Phone",
                  accessor: "phoneno",
                  cell: (emp: Employee) => {
                    const phoneLink = createPhoneLink(emp.phoneno);
                    const formattedPhone = formatPhoneDisplay(emp.phoneno);
                    if (!phoneLink || !formattedPhone) {
                      return (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          N/A
                        </div>
                      );
                    }
                    return (
                      <a
                        href={phoneLink}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                      >
                        {formattedPhone}
                      </a>
                    );
                  },
                },
                {
                  header: "Employee Type",
                  accessor: "employeeType",
                  cell: (emp: Employee) => (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {getEmployeeTypeName(emp.employeeType)}
                    </div>
                  ),
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (emp: Employee) => (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        emp.isActive === 1
                          ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                      }`}
                    >
                      {emp.isActive === 1 ? "Active" : "Inactive"}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "employeeId",
                  sortable: false,
                  cell: (emp: Employee) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(emp)}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                        title="Edit employee"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(emp)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete employee"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={employees}
              keyExtractor={(emp: Employee) => emp.employeeId.toString()}
              searchPlaceholder="Search employees..."
              emptyMessage="No employees found"
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Employee"
        itemName={
          employeeToDelete
            ? `${employeeToDelete.firstName || ""} ${
                employeeToDelete.lastName || ""
              }`.trim() ||
              employeeToDelete.employeeCode ||
              ""
            : ""
        }
        description={`Are you sure you want to delete the employee "${
          employeeToDelete
            ? `${employeeToDelete.firstName || ""} ${
                employeeToDelete.lastName || ""
              }`.trim() ||
              employeeToDelete.employeeCode ||
              ""
            : ""
        }"? This action cannot be undone.`}
      />
    </DashboardLayout>
  );
}
