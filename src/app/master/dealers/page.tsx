"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/ui/SkeletonLoader";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import DataTable from "@/components/tables/DataTable";

interface Company {
  companyId: string;
  companyCode: string;
  companyName: string;
}

interface Dealer {
  dealerId: string;
  dealerCode: string;
  dealerName: string;
  companyId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  phone?: string;
  email?: string;
  isActive: number;
  company?: Company;
  _count?: {
    locations: number;
    users: number;
  };
}

export default function DealersPage() {
  const router = useRouter();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingDealer, setDeletingDealer] = useState<Dealer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterCompanyId, setFilterCompanyId] = useState<string>("");

  useEffect(() => {
    fetchCompanies();
    fetchDealers();
  }, [filterCompanyId]);

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
        // Show all companies (active and inactive) for selection
        setCompanies(data);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast.error("Error fetching companies");
    }
  };

  const fetchDealers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/dealers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();

        setDealers(data);
      } else {
        toast.error("Failed to fetch dealers");
      }
    } catch (error) {
      console.error("Error fetching dealers:", error);
      toast.error("Error fetching dealers");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (dealer: Dealer) => {
    setDeletingDealer(dealer);
    setDeletingId(dealer.dealerId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(`/api/master/dealers/${deletingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Dealer deactivated successfully");
        fetchDealers();
        setDeletingId(null);
        setDeletingDealer(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete dealer");
      }
    } catch (error) {
      console.error("Error deleting dealer:", error);
      toast.error("Error deleting dealer");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingId(null);
    setDeletingDealer(null);
  };

  // Filter dealers by company if filter is set
  const filteredDealers = filterCompanyId
    ? dealers.filter((dealer) => dealer.companyId === filterCompanyId)
    : dealers;

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
              Dealers
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage dealers and their settings
            </p>
          </div>
          <button
            onClick={() => router.push("/master/dealers/add")}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Dealer</span>
          </button>
        </div>

        {/* Dealers Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {/* Company Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Company
            </label>
            <select
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.companyId} value={company.companyId}>
                  {company.companyName}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            columns={[
              {
                header: "Code",
                accessor: "dealerCode",
                cell: (dealer: Dealer) => (
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {dealer.dealerCode}
                  </div>
                ),
              },
              {
                header: "Name",
                accessor: "dealerName",
                cell: (dealer: Dealer) => (
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {dealer.dealerName}
                  </div>
                ),
              },
              {
                header: "Company",
                accessor: "company",
                cell: (dealer: Dealer) => (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {dealer.company?.companyName || "N/A"}
                  </div>
                ),
              },
              {
                header: "Contact",
                accessor: "email",
                cell: (dealer: Dealer) => (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {dealer.email && (
                      <div className="truncate max-w-xs" title={dealer.email}>
                        {dealer.email}
                      </div>
                    )}
                    {dealer.phone && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {dealer.phone}
                      </div>
                    )}
                    {dealer.city && dealer.state && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {dealer.city}, {dealer.state} {dealer.zipcode}
                      </div>
                    )}
                    {!dealer.email && !dealer.phone && (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                ),
              },
              {
                header: "Stats",
                accessor: "_count",
                sortable: false,
                cell: (dealer: Dealer) => (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {dealer._count ? (
                      <>
                        <div>{dealer._count.locations} Locations</div>
                        <div>{dealer._count.users} Users</div>
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
                cell: (dealer: Dealer) => (
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      dealer.isActive === 1
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {dealer.isActive === 1 ? "Active" : "Inactive"}
                  </span>
                ),
              },
              {
                header: "Actions",
                accessor: "dealerId",
                sortable: false,
                cell: (dealer: Dealer) => (
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() =>
                        router.push(`/master/dealers/${dealer.dealerId}/edit`)
                      }
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(dealer)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={filteredDealers}
            keyExtractor={(dealer) => dealer.dealerId}
            searchable={true}
            searchPlaceholder="Search dealers..."
            emptyMessage="No dealers found"
          />
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={!!deletingId}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Dealer"
          itemName={deletingDealer?.dealerName || ""}
          description="Are you sure you want to deactivate this dealer? This will not delete associated locations or users."
          isLoading={isDeleting}
        />
      </div>
    </MasterDashboardLayout>
  );
}
