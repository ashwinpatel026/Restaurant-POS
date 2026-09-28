"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
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

interface Customer {
  customerId: string;
  customerCode: string;
  phoneNumber: string;
  customerName: string;
  businessName: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  isActive: boolean;
}

const emptyForm = {
  customerName: "",
  phoneNumber: "",
  businessName: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  isActive: true,
};

export default function CustomerManagementPage() {
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();

  const { hasPermission, loading: permissionLoading } = usePagePermission({
    requiredPermissions: ["customers.view"],
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreCode]);

  const fetchData = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/dashboard/customer"));
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      toast.error("Error loading customers");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: typeof emptyForm) => {
    try {
      const baseUrl = editingCustomer
        ? `/api/dashboard/customer/${editingCustomer.customerId}`
        : "/api/dashboard/customer";
      const response = await fetch(buildApiUrl(baseUrl), {
        method: editingCustomer ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingCustomer
            ? "Customer updated successfully!"
            : "Customer created successfully!",
        );
        setShowModal(false);
        setEditingCustomer(null);
        fetchData();
      } else {
        try {
          const errorData = await response.json();
          toast.error(errorData.error || "Failed to save customer");
        } catch {
          toast.error("Failed to save customer");
        }
      }
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error(
          error instanceof Error ? error.message : "Error saving customer",
        );
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    try {
      const response = await fetch(
        buildApiUrl(`/api/dashboard/customer/${customerToDelete.customerId}`),
        { method: "DELETE" },
      );

      if (response.ok) {
        setCustomers(
          customers.filter(
            (customer) => customer.customerId !== customerToDelete.customerId,
          ),
        );
        toast.success("Customer deleted successfully");
        setShowDeleteModal(false);
        setCustomerToDelete(null);
      } else {
        throw new Error("Failed to delete customer");
      }
    } catch (error) {
      toast.error("Error deleting customer");
      console.error("Error:", error);
    }
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

  const activeCustomers = customers.filter((customer) => customer.isActive).length;
  const inactiveCustomers = customers.filter((customer) => !customer.isActive).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Customer Master
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage customer names, phone numbers, and addresses.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingCustomer(null);
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Customer
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Customers"
            value={customers.length}
            icon={<UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-900/20"
          />
          <StatCard
            label="Active"
            value={activeCustomers}
            icon={<CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />}
            iconBg="bg-green-100 dark:bg-green-900/20"
          />
          <StatCard
            label="Inactive"
            value={inactiveCustomers}
            icon={<XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />}
            iconBg="bg-red-100 dark:bg-red-900/20"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Customer List
            </h3>
          </div>
          {customers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No customers found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by adding your first customer.
              </p>
              <button
                onClick={() => {
                  setEditingCustomer(null);
                  setShowModal(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Customer
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "Customer",
                  accessor: "customerName",
                  cell: (customer: Customer) => (
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {customer.customerName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {customer.customerCode}
                      </div>
                    </div>
                  ),
                },
                { header: "Phone", accessor: "phoneNumber" },
                {
                  header: "Business",
                  accessor: "businessName",
                  cell: (customer: Customer) => customer.businessName || "—",
                },
                {
                  header: "City",
                  accessor: "city",
                  cell: (customer: Customer) => customer.city || "—",
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (customer: Customer) => (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {customer.isActive ? "Active" : "Inactive"}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "customerId",
                  sortable: false,
                  cell: (customer: Customer) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingCustomer(customer);
                          setShowModal(true);
                        }}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded"
                        title="Edit customer"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setCustomerToDelete(customer);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded"
                        title="Delete customer"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={customers}
              keyExtractor={(customer: Customer) => customer.customerId}
              searchPlaceholder="Search customers..."
              emptyMessage="No customers found"
            />
          )}
        </div>
      </div>

      <CRUDModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? "Edit Customer" : "Add New Customer"}
        size="lg"
      >
        <CustomerForm
          customer={editingCustomer}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingCustomer(null);
          }}
        />
      </CRUDModal>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setCustomerToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer"
        itemName={customerToDelete?.customerName || ""}
      />
    </DashboardLayout>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent";

function CustomerForm({
  customer,
  onSave,
  onCancel,
}: {
  customer?: Customer | null;
  onSave: (data: typeof emptyForm) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        customerName: customer.customerName || "",
        phoneNumber: customer.phoneNumber || "",
        businessName: customer.businessName || "",
        email: customer.email || "",
        addressLine1: customer.addressLine1 || "",
        addressLine2: customer.addressLine2 || "",
        city: customer.city || "",
        state: customer.state || "",
        zipCode: customer.zipCode || "",
        country: customer.country || "",
        isActive: customer.isActive,
      });
    } else {
      setFormData(emptyForm);
    }
  }, [customer]);

  const setField = (key: keyof typeof emptyForm, value: string | boolean) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {customer ? (
        <Field label="Customer Code">
          <input className={inputClass} value={customer.customerCode} readOnly />
        </Field>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Customer Name" required>
          <input
            className={inputClass}
            required
            maxLength={150}
            value={formData.customerName}
            onChange={(e) => setField("customerName", e.target.value)}
            placeholder="Enter customer name"
          />
        </Field>
        <Field label="Phone Number" required>
          <input
            className={inputClass}
            required
            maxLength={20}
            value={formData.phoneNumber}
            onChange={(e) => setField("phoneNumber", e.target.value)}
            placeholder="Enter phone number"
          />
        </Field>
        <Field label="Business Name">
          <input
            className={inputClass}
            maxLength={100}
            value={formData.businessName}
            onChange={(e) => setField("businessName", e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            className={inputClass}
            type="email"
            maxLength={150}
            value={formData.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </Field>
        <Field label="Address Line 1">
          <input
            className={inputClass}
            maxLength={255}
            value={formData.addressLine1}
            onChange={(e) => setField("addressLine1", e.target.value)}
          />
        </Field>
        <Field label="Address Line 2">
          <input
            className={inputClass}
            maxLength={150}
            value={formData.addressLine2}
            onChange={(e) => setField("addressLine2", e.target.value)}
          />
        </Field>
        <Field label="City">
          <input
            className={inputClass}
            maxLength={100}
            value={formData.city}
            onChange={(e) => setField("city", e.target.value)}
          />
        </Field>
        <Field label="State">
          <input
            className={inputClass}
            maxLength={100}
            value={formData.state}
            onChange={(e) => setField("state", e.target.value)}
          />
        </Field>
        <Field label="Zip Code">
          <input
            className={inputClass}
            maxLength={20}
            value={formData.zipCode}
            onChange={(e) => setField("zipCode", e.target.value)}
          />
        </Field>
        <Field label="Country">
          <input
            className={inputClass}
            maxLength={50}
            value={formData.country}
            onChange={(e) => setField("country", e.target.value)}
          />
        </Field>
      </div>

      <StatusToggle
        label="Customer Status"
        description="Toggle to control whether this customer is active."
        value={formData.isActive}
        onChange={(val) => setField("isActive", val)}
      />

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : customer ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
