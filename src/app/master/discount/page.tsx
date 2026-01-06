"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import DataTable from "@/components/tables/DataTable";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface Discount {
  discountId: string;
  discountCode: string;
  promoCode: string;
  discountName: string;
  discountType: string;
  discountMode: string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  isItemLevel: boolean;
  isBillLevel: boolean;
  requiresManagerApproval: boolean;
  allowedRoles?: any;
  validFrom?: string | null;
  validTo?: string | null;
  menuCategory?: any;
  deptCode?: string | null;
  discountNote?: string | null;
  isDelete: boolean;
  isOpenDiscount: boolean;
  isActive: boolean;
  createdBy?: string | null;
  createdDate?: string;
  updatedBy?: string | null;
  updatedOn?: string | null;
}

export default function DiscountPage() {
  const router = useRouter();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<Discount | null>(
    null
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/discount", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        setDiscounts(Array.isArray(data) ? data : []);
      } else {
        toast.error("Error loading discounts");
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Helper function to format discount value
  const formatDiscountValue = (discount: Discount): string => {
    if (
      discount.discountMode === "PERCENTAGE" ||
      discount.discountType === "PERCENTAGE"
    ) {
      return `${discount.discountValue}%`;
    }
    return `$${discount.discountValue.toFixed(2)}`;
  };

  // Navigation handlers
  const handleAdd = () => {
    router.push("/master/discount/add");
  };

  const handleEdit = (discount: Discount) => {
    router.push(`/master/discount/${discount.discountId}/edit`);
  };

  const handleDeleteClick = (discount: Discount) => {
    setDiscountToDelete(discount);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!discountToDelete) return;

    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(
        `/api/master/discount/${discountToDelete.discountId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setDiscounts(
          discounts.filter(
            (discount) => discount.discountId !== discountToDelete.discountId
          )
        );
        toast.success("Discount deleted successfully");
        setShowDeleteModal(false);
        setDiscountToDelete(null);
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to delete discount";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to delete discount");
        }
      }
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Error deleting discount";
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDiscountToDelete(null);
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
              Discounts
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage discounts and promotional codes
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Discount
          </button>
        </div>

        {/* Discounts List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Discounts List
            </h3>
          </div>
          {discounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <TagIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No discounts found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by creating your first discount.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Discount
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "Discount Name",
                  accessor: "discountName",
                  cell: (discount: Discount) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <TagIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {discount.discountName}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Type",
                  accessor: "discountType",
                  cell: (discount: Discount) => (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {discount.discountType}
                    </div>
                  ),
                },
                {
                  header: "Value",
                  accessor: "discountValue",
                  cell: (discount: Discount) => (
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDiscountValue(discount)}
                    </div>
                  ),
                },
                {
                  header: "Level",
                  accessor: "isItemLevel",
                  cell: (discount: Discount) => (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {discount.isItemLevel
                        ? "Item"
                        : discount.isBillLevel
                        ? "Bill"
                        : "N/A"}
                    </div>
                  ),
                },
                {
                  header: "Valid Period",
                  accessor: "validFrom",
                  cell: (discount: Discount) => (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {discount.validFrom && discount.validTo
                        ? `${new Date(
                            discount.validFrom
                          ).toLocaleDateString()} - ${new Date(
                            discount.validTo
                          ).toLocaleDateString()}`
                        : "No limit"}
                    </div>
                  ),
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (discount: Discount) => (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        discount.isActive
                          ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                      }`}
                    >
                      {discount.isActive ? "Active" : "Inactive"}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "discountId",
                  sortable: false,
                  cell: (discount: Discount) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(discount)}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                        title="Edit discount"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(discount)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete discount"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={discounts}
              keyExtractor={(discount: Discount) =>
                discount.discountId.toString()
              }
              searchPlaceholder="Search discounts..."
              emptyMessage="No discounts found"
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Discount"
        itemName={discountToDelete?.discountName || ""}
        description={`Are you sure you want to delete the discount "${discountToDelete?.discountName}"? This action cannot be undone.`}
      />
    </MasterDashboardLayout>
  );
}
