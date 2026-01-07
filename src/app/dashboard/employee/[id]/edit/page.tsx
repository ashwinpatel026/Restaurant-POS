"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import { formatPhone } from "@/lib/utils";
import StatusToggle from "@/components/forms/StatusToggle";

interface Employee {
  employeeId: string;
  employeeCode: string;
  employeeType: string | null;
  businessName: string | null;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  email: string | null;
  phoneno: string | null;
  posAccessThisLocation: number | null;
  posAccessCode: string | null;
  allowPosAllLocation: number | null;
  isUpdateEmpidAllLocation: number | null;
  isActive: number | null;
  roleCode: string | null;
  alternateId: string | null;
}

interface EmployeeType {
  employeeTypeId: string;
  typeCode: string;
  typeName: string | null;
  isActive: boolean;
}

interface Role {
  roleCode: string;
  roleName: string;
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { buildApiUrl } = useApiWithStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [formData, setFormData] = useState({
    employeeCode: "",
    employeeType: "",
    businessName: "",
    firstName: "",
    lastName: "",
    address: "",
    email: "",
    phoneno: "",
    posAccessThisLocation: 0,
    posAccessCode: "",
    allowPosAllLocation: 0,
    isUpdateEmpidAllLocation: 0,
    isActive: 1,
    roleCode: "",
    alternateId: "",
  });

  useEffect(() => {
    fetchEmployee();
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [employeeTypesRes, rolesRes] = await Promise.all([
        fetch(buildApiUrl("/api/dashboard/employee-type"), {
          cache: "no-store",
        }),
        fetch(buildApiUrl("/api/dashboard/roles"), {
          cache: "no-store",
        }),
      ]);

      if (employeeTypesRes.ok) {
        const data = await employeeTypesRes.json();
        setEmployeeTypes(data.filter((et: EmployeeType) => et.isActive));
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.map((r: any) => ({
          roleCode: r.roleCode,
          roleName: r.roleName,
        })));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const fetchEmployee = async () => {
    try {
      setFetching(true);
      const url = buildApiUrl(`/api/dashboard/employee/${id}`);
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (response.ok) {
        const data: Employee = await response.json();
        setFormData({
          employeeCode: data.employeeCode || "",
          employeeType: data.employeeType || "",
          businessName: data.businessName || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          address: data.address || "",
          email: data.email || "",
          phoneno: data.phoneno ? formatPhone(data.phoneno) : "",
          posAccessThisLocation: data.posAccessThisLocation || 0,
          posAccessCode: data.posAccessCode || "",
          allowPosAllLocation: data.allowPosAllLocation || 0,
          isUpdateEmpidAllLocation: data.isUpdateEmpidAllLocation || 0,
          isActive: data.isActive || 0,
          roleCode: data.roleCode || "",
          alternateId: data.alternateId || "",
        });
      } else {
        toast.error("Error loading employee");
        router.push("/dashboard/employee");
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
      router.push("/dashboard/employee");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = buildApiUrl(`/api/dashboard/employee/${id}`);
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeCode: formData.employeeCode,
          employeeType: formData.employeeType || null,
          businessName: formData.businessName || null,
          firstName: formData.firstName || null,
          lastName: formData.lastName || null,
          address: formData.address || null,
          email: formData.email || null,
          phoneno: formData.phoneno ? formData.phoneno.replace(/\D/g, "") : null,
          posAccessThisLocation: formData.posAccessThisLocation || null,
          posAccessCode: formData.posAccessCode || null,
          allowPosAllLocation: formData.allowPosAllLocation || null,
          isUpdateEmpidAllLocation: formData.isUpdateEmpidAllLocation || null,
          isActive: formData.isActive,
          roleCode: formData.roleCode || null,
          alternateId: formData.alternateId || null,
        }),
      });

      if (response.ok) {
        toast.success("Employee updated successfully!");
        router.push("/dashboard/employee");
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to update employee";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to update employee");
        }
      }
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Error updating employee";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
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
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Employee
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Update employee information
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employee Type
                    </label>
                    <select
                      value={formData.employeeType}
                      onChange={(e) =>
                        setFormData({ ...formData, employeeType: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Employee Type</option>
                      {employeeTypes.map((et) => (
                        <option key={et.employeeTypeId} value={et.typeCode}>
                          {et.typeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter first name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter last name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) =>
                        setFormData({ ...formData, businessName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter business name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={formData.phoneno}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        setFormData({ ...formData, phoneno: formatted });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(123) 456-7890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter email"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employee Role
                    </label>
                    <select
                      value={formData.roleCode}
                      onChange={(e) =>
                        setFormData({ ...formData, roleCode: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Employee Role</option>
                      {roles.map((role) => (
                        <option key={role.roleCode} value={role.roleCode}>
                          {role.roleName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Address Information
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter address"
                  />
                </div>
              </div>

              {/* POS Access Information */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  POS Access Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.posAccessThisLocation === 1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            posAccessThisLocation: e.target.checked ? 1 : 0,
                          })
                        }
                        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        POS Access This Location
                      </span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowPosAllLocation === 1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            allowPosAllLocation: e.target.checked ? 1 : 0,
                          })
                        }
                        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Allow POS All Location
                      </span>
                    </label>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        POS Access Code
                      </label>
                      <input
                        type="text"
                        value={formData.posAccessCode}
                        onChange={(e) =>
                          setFormData({ ...formData, posAccessCode: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter POS access code"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Alternate ID
                      </label>
                      <input
                        type="text"
                        value={formData.alternateId}
                        onChange={(e) =>
                          setFormData({ ...formData, alternateId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter alternate ID"
                      />
                    </div>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isUpdateEmpidAllLocation === 1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isUpdateEmpidAllLocation: e.target.checked ? 1 : 0,
                          })
                        }
                        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Update Emp ID All Location
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Status Toggle */}
              <StatusToggle
                label="Employee Status"
                description="Toggle to control whether this employee is active."
                value={formData.isActive === 1}
                onChange={(val) =>
                  setFormData({ ...formData, isActive: val ? 1 : 0 })
                }
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 rounded-b-lg flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update Employee"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
