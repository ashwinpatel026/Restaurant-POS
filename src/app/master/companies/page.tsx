"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/ui/SkeletonLoader";
import DataTable from "@/components/tables/DataTable";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";

interface Company {
  companyId: string;
  companyName: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  phone?: string;
  email?: string;
  isActive: number;
  _count?: {
    dealers: number;
    locations: number;
    users: number;
  };
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/companies", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      } else {
        toast.error("Failed to fetch companies");
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast.error("Error fetching companies");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;

    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(
        `/api/master/companies/${companyToDelete.companyId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setCompanies(
          companies.filter(
            (company) => company.companyId !== companyToDelete.companyId
          )
        );
        toast.success("Company deactivated successfully");
        setShowDeleteModal(false);
        setCompanyToDelete(null);
      } else {
        throw new Error("Failed to delete company");
      }
    } catch (error) {
      toast.error("Error deleting company");
      console.error("Error:", error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setCompanyToDelete(null);
  };

  if (loading) {
    return (
      <MasterDashboardLayout>
        <TableSkeleton />
      </MasterDashboardLayout>
    );
  }

  return (
    <MasterDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Companies
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your companies and their settings
            </p>
          </div>
          <button
            onClick={() => {
              setEditingCompany(null);
              setShowModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Company</span>
          </button>
        </div>

        {/* Companies List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Companies List
            </h3>
          </div>
          {companies.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No companies found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by creating your first company.
              </p>
              <button
                onClick={() => {
                  setEditingCompany(null);
                  setShowModal(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Company
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "Company Name",
                  accessor: "companyName",
                  cell: (company: Company) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <BuildingOfficeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {company.companyName}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Address",
                  accessor: "addressLine1",
                  cell: (company: Company) => (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {company.addressLine1 && (
                        <div>{company.addressLine1}</div>
                      )}
                      {company.addressLine2 && (
                        <div className="text-xs">{company.addressLine2}</div>
                      )}
                      {company.zipcode && (
                        <div className="text-xs">Zip: {company.zipcode}</div>
                      )}
                      {!company.addressLine1 && (
                        <span className="text-gray-400 text-xs">
                          No address
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  header: "City",
                  accessor: "city",
                  cell: (company: Company) => (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {company.city || <span className="text-gray-400">-</span>}
                    </div>
                  ),
                },
                {
                  header: "State",
                  accessor: "state",
                  cell: (company: Company) => (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {company.state || (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  ),
                },
                {
                  header: "Country",
                  accessor: "country",
                  cell: (company: Company) => (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {company.country || (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  ),
                },
                {
                  header: "Contact",
                  accessor: "email",
                  cell: (company: Company) => (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {company.email && (
                        <div
                          className="truncate max-w-xs"
                          title={company.email}
                        >
                          {company.email}
                        </div>
                      )}
                      {company.phone && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {company.phone}
                        </div>
                      )}
                      {!company.email && !company.phone && (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  ),
                },
                {
                  header: "Stats",
                  accessor: "_count",
                  sortable: false,
                  cell: (company: Company) => (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {company._count ? (
                        <>
                          <div className="text-xs">
                            <span className="font-medium">
                              {company._count.dealers}
                            </span>{" "}
                            Dealers
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">
                              {company._count.locations}
                            </span>{" "}
                            Locations
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">
                              {company._count.users}
                            </span>{" "}
                            Users
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  ),
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (company: Company) => (
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        company.isActive === 1
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {company.isActive === 1 ? "Active" : "Inactive"}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "companyId",
                  sortable: false,
                  cell: (company: Company) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingCompany(company);
                          setShowModal(true);
                        }}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                        title="Edit company"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(company)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete company"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={companies}
              keyExtractor={(company: Company) => company.companyId.toString()}
              searchPlaceholder="Search companies..."
              emptyMessage="No companies found"
            />
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <CompanyModal
            company={editingCompany}
            onClose={() => {
              setShowModal(false);
              setEditingCompany(null);
            }}
            onSuccess={() => {
              fetchCompanies();
              setShowModal(false);
              setEditingCompany(null);
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Company"
          itemName={companyToDelete?.companyName || ""}
          description={`Are you sure you want to deactivate the company "${companyToDelete?.companyName}"? This will not delete associated dealers, locations, or users.`}
        />
      </div>
    </MasterDashboardLayout>
  );
}

// Company Form Modal
function CompanyModal({
  company,
  onClose,
  onSuccess,
}: {
  company: Company | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    companyName: company?.companyName || "",
    addressLine1: company?.addressLine1 || "",
    addressLine2: company?.addressLine2 || "",
    city: company?.city || "",
    state: company?.state || "",
    country: company?.country || "",
    zipcode: company?.zipcode || "",
    phone: company?.phone || "",
    email: company?.email || "",
    isActive: company?.isActive ?? 1,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("master_admin_token");
      const url = company
        ? `/api/master/companies/${company.companyId}`
        : "/api/master/companies";
      const method = company ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          company
            ? "Company updated successfully"
            : "Company created successfully"
        );
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save company");
      }
    } catch (error) {
      console.error("Error saving company:", error);
      toast.error("Error saving company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {company ? "Edit Company" : "Add Company"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) =>
                  setFormData({ ...formData, addressLine1: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Street address, P.O. box"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) =>
                  setFormData({ ...formData, addressLine2: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Apartment, suite, unit, building, floor, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Zip Code
                </label>
                <input
                  type="text"
                  value={formData.zipcode}
                  onChange={(e) =>
                    setFormData({ ...formData, zipcode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            {company && (
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive === 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isActive: e.target.checked ? 1 : 0,
                      })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active
                  </span>
                </label>
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : company ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
