"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import DataTable from "@/components/tables/DataTable";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import { usePagePermission } from "@/hooks/usePagePermission";
import StatusToggle from "@/components/forms/StatusToggle";
import { formatDecimal } from "@/utils/formatDecimal";

interface Fee {
  feeId: number;
  feeCode: string;
  feeName: string | null;
  feeType: string;
  dollarPer: string | null;
  feeValue: number | null;
  isActive: boolean;
}

const FEE_TYPES = ["Fee", "Gratuity", "Surcharge", "Card Fee"] as const;
const DOLLAR_PER_OPTIONS = ["Percent", "Dollar"] as const;

export default function FeeManagementPage() {
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();

  const { hasPermission, loading: permissionLoading } = usePagePermission({
    requiredPermissions: ["fees.view"],
  });

  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<Fee | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreCode]);

  const fetchData = async () => {
    try {
      const url = buildApiUrl("/api/dashboard/fee");

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setFees(
          data.map((fee: any) => ({
            ...fee,
            feeId: Number(fee.feeId),
          })),
        );
      }
    } catch (error) {
      toast.error("Error loading fees");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingFee(null);
    setShowModal(true);
  };

  const handleEdit = (fee: Fee) => {
    setEditingFee(fee);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const baseUrl = editingFee
        ? `/api/dashboard/fee/${editingFee.feeId}`
        : "/api/dashboard/fee";
      const url = buildApiUrl(baseUrl);

      const method = editingFee ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await response.json();
        toast.success(
          editingFee ? "Fee updated successfully!" : "Fee created successfully!",
        );
        setShowModal(false);
        setEditingFee(null);
        fetchData();
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to save fee";
          toast.error(errorMessage);
        } catch {
          toast.error("Failed to save fee");
        }
      }
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Error saving fee";
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteClick = (fee: Fee) => {
    setFeeToDelete(fee);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!feeToDelete) return;

    try {
      const url = buildApiUrl(`/api/dashboard/fee/${feeToDelete.feeId}`);

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (response.ok) {
        setFees(fees.filter((fee) => fee.feeId !== feeToDelete.feeId));
        toast.success("Fee deleted successfully");
        setShowDeleteModal(false);
        setFeeToDelete(null);
      } else {
        throw new Error("Failed to delete fee");
      }
    } catch (error) {
      toast.error("Error deleting fee");
      console.error("Error:", error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setFeeToDelete(null);
  };

  if (permissionLoading || loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!hasPermission) {
    return null;
  }

  const activeFees = fees.filter((f) => f.isActive).length;
  const inactiveFees = fees.filter((f) => !f.isActive).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Fee Master
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage various fees like gratuity, surcharge, and card fees.
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Fee
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <BanknotesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Fees
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {fees.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {activeFees}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Inactive
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {inactiveFees}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Fee List
            </h3>
          </div>
          {fees.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <BanknotesIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No fees found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by adding your first fee.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Fee
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "#",
                  accessor: "feeId",
                  sortable: false,
                  cell: (_fee: Fee, index?: number) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {(index ?? 0) + 1}
                        </span>
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Fee Name",
                  accessor: "feeName",
                  cell: (fee: Fee) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <BanknotesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {fee.feeName}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Fee Type",
                  accessor: "feeType",
                },
                {
                  header: "Dollar / Percent",
                  accessor: "dollarPer",
                },
                {
                  header: "Value",
                  accessor: "feeValue",
                  cell: (fee: Fee) => (
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {formatDecimal(fee.feeValue ?? 0)}
                    </span>
                  ),
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (fee: Fee) => (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        fee.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {fee.isActive ? (
                        <>
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "feeId",
                  sortable: false,
                  cell: (fee: Fee) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(fee)}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                        title="Edit fee"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(fee)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete fee"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={fees}
              keyExtractor={(fee: Fee) => fee.feeId.toString()}
              searchPlaceholder="Search fees..."
              emptyMessage="No fees found"
            />
          )}
        </div>
      </div>

      <CRUDModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingFee(null);
        }}
        title={editingFee ? "Edit Fee" : "Add New Fee"}
        size="md"
      >
        <FeeForm
          fee={editingFee}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingFee(null);
          }}
        />
      </CRUDModal>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Fee"
        itemName={feeToDelete?.feeName || ""}
      />
    </DashboardLayout>
  );
}

function FeeForm({
  fee,
  onSave,
  onCancel,
}: {
  fee?: Fee | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    feeName: "",
    feeType: FEE_TYPES[0],
    dollarPer: DOLLAR_PER_OPTIONS[0],
    feeValue: "0.00",
    isActive: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fee) {
      setFormData({
        feeName: fee.feeName || "",
        feeType: (fee.feeType as (typeof FEE_TYPES)[number]) || FEE_TYPES[0],
        dollarPer:
          (fee.dollarPer as (typeof DOLLAR_PER_OPTIONS)[number]) ||
          DOLLAR_PER_OPTIONS[0],
        feeValue:
          fee.feeValue !== null && fee.feeValue !== undefined
            ? formatDecimal(fee.feeValue)
            : "0.00",
        isActive: fee.isActive,
      });
    }
  }, [fee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        ...formData,
        feeValue: parseFloat(String(formData.feeValue || "0")),
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Fee Name *
        </label>
        <input
          type="text"
          required
          value={formData.feeName}
          onChange={(e) =>
            setFormData({ ...formData, feeName: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter fee name"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fee Type *
          </label>
          <select
            value={formData.feeType}
            onChange={(e) =>
              setFormData({
                ...formData,
                feeType: e.target.value as (typeof FEE_TYPES)[number],
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {FEE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Dollar / Percent *
          </label>
          <select
            value={formData.dollarPer}
            onChange={(e) =>
              setFormData({
                ...formData,
                dollarPer: e.target.value as (typeof DOLLAR_PER_OPTIONS)[number],
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {DOLLAR_PER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Fee Value *
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={formData.feeValue}
          onChange={(e) =>
            setFormData({
              ...formData,
              feeValue: e.target.value,
            })
          }
          onBlur={(e) =>
            setFormData({
              ...formData,
              feeValue: formatDecimal(e.target.value),
            })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter fee value"
        />
      </div>

      <StatusToggle
        label="Fee Status"
        description="Toggle to control whether this fee is active."
        value={formData.isActive}
        onChange={(val) => setFormData({ ...formData, isActive: val })}
      />

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "Saving..." : fee ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

