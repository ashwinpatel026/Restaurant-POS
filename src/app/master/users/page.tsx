"use client";

import { useState, useEffect } from "react";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/ui/SkeletonLoader";
import DataTable from "@/components/tables/DataTable";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import StatusToggle from "@/components/forms/StatusToggle";

interface Company {
  companyId: string;
  companyCode: string;
  companyName: string;
  isActive?: number;
}

interface Dealer {
  dealerId: string;
  dealerCode: string;
  dealerName: string;
  companyId: string;
  isActive?: number;
}

interface Location {
  locationId: string;
  locationCode: string;
  locationName: string;
  storeCode: string;
  companyId: string;
  dealerId?: string;
  isActive?: number;
}

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  accessLevel: string;
  companyId?: string;
  dealerId?: string;
  locationId?: string;
  isActive: boolean;
  company?: Company;
  dealer?: Dealer;
  location?: Location;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  useEffect(() => {
    fetchCompanies();
    fetchDealers();
    fetchLocations();
    fetchUsers();
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
        setCompanies(data.filter((c: Company) => c.isActive === 1));
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchDealers = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/dealers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDealers(data.filter((d: Dealer) => d.isActive === 1));
      }
    } catch (error) {
      console.error("Error fetching dealers:", error);
    }
  };

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/locations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLocations(data.filter((l: Location) => l.isActive === 1));
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error fetching users");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(`/api/master/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("User deactivated successfully");
        fetchUsers();
        setDeletingId(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error deleting user");
    }
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
              Users
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage location-level users and their access
            </p>
          </div>
          <button
            onClick={() => {
              setEditingUser(null);
              setShowModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add User</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <DataTable
            columns={[
              {
                header: "Name",
                accessor: "firstName",
                cell: (user: User) => (
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.firstName} {user.lastName}
                  </div>
                ),
              },
              {
                header: "Email",
                accessor: "email",
                cell: (user: User) => (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </div>
                ),
              },
              {
                header: "Role",
                accessor: "role",
                cell: (user: User) => (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {user.role}
                  </span>
                ),
              },
              {
                header: "Access Level",
                accessor: "accessLevel",
                cell: (user: User) => (
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {user.accessLevel}
                  </span>
                ),
              },
              {
                header: "Assignment",
                accessor: "companyId",
                sortable: false,
                cell: (user: User) => (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {user.company && <div>{user.company.companyName}</div>}
                    {user.dealer && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {user.dealer.dealerName}
                      </div>
                    )}
                    {user.location && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {user.location.locationName}
                      </div>
                    )}
                    {!user.company && !user.dealer && !user.location && (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </div>
                ),
              },
              {
                header: "Status",
                accessor: "isActive",
                cell: (user: User) => (
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                ),
              },
              {
                header: "Actions",
                accessor: "userId",
                sortable: false,
                cell: (user: User) => (
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(user.userId)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={users}
            keyExtractor={(user) => user.userId}
            searchPlaceholder="Search users by name or email..."
            emptyMessage="No users found"
          />
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <UserModal
            user={editingUser}
            companies={companies}
            dealers={dealers}
            locations={locations}
            onClose={() => {
              setShowModal(false);
              setEditingUser(null);
            }}
            onSuccess={() => {
              fetchUsers();
              setShowModal(false);
              setEditingUser(null);
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deletingId && (
          <DeleteConfirmationModal
            isOpen={!!deletingId}
            onClose={() => setDeletingId(null)}
            onConfirm={() => {
              handleDelete(deletingId);
              setDeletingId(null);
            }}
            title="Delete User"
            itemName={
              users.find((u) => u.userId === deletingId)?.email || "this user"
            }
            description="Are you sure you want to deactivate this user? They will no longer be able to access the system."
          />
        )}
      </div>
    </MasterDashboardLayout>
  );
}

// User Form Modal
function UserModal({
  user,
  companies,
  dealers,
  locations,
  onClose,
  onSuccess,
}: {
  user: User | null;
  companies: Company[];
  dealers: Dealer[];
  locations: Location[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: user?.email || "",
    password: "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    role: user?.role || "OUTLET_MANAGER",
    accessLevel: user?.accessLevel || "LOCATION",
    companyId: user?.companyId || "",
    dealerId: user?.dealerId || "",
    locationId: user?.locationId || "",
    isActive: user?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  // Removed filtered dealers/locations logic as we're simplifying the LOCATION access level

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("master_admin_token");
      const url = user
        ? `/api/master/users/${user.userId}`
        : "/api/master/users";
      const method = user ? "PUT" : "POST";

      const submitData: any = { ...formData };
      if (user && !submitData.password) {
        delete submitData.password; // Don't send password if not changed
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        toast.success(
          user ? "User updated successfully" : "User created successfully"
        );
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save user");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("Error saving user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {user ? "Edit User" : "Add User"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={!!user}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password {user ? "(leave blank to keep current)" : "*"}
              </label>
              <input
                type="password"
                required={!user}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="OUTLET_MANAGER">Outlet Manager</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="COMPANY_ADMIN">Company Admin</option>
                  <option value="DEALER_ADMIN">Dealer Admin</option>
                  <option value="CAPTAIN">Captain</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="KITCHEN_STAFF">Kitchen Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Access Level *
                </label>
                <select
                  required
                  value={formData.accessLevel}
                  onChange={(e) => {
                    const newLevel = e.target.value;
                    setFormData({
                      ...formData,
                      accessLevel: newLevel,
                      companyId:
                        newLevel !== "COMPANY" ? "" : formData.companyId,
                      dealerId: newLevel !== "DEALER" ? "" : formData.dealerId,
                      locationId:
                        newLevel !== "LOCATION" ? "" : formData.locationId,
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="COMPANY">Company</option>
                  <option value="DEALER">Dealer</option>
                  <option value="LOCATION">Location</option>
                </select>
              </div>
            </div>
            {formData.accessLevel === "COMPANY" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company *
                </label>
                <select
                  required
                  value={formData.companyId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      companyId: e.target.value,
                      dealerId: "",
                      locationId: "",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.companyId} value={company.companyId}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {formData.accessLevel === "DEALER" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dealer *
                </label>
                <select
                  required
                  value={formData.dealerId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dealerId: e.target.value,
                      locationId: "",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Dealer</option>
                  {dealers.map((dealer) => (
                    <option key={dealer.dealerId} value={dealer.dealerId}>
                      {dealer.dealerName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {formData.accessLevel === "LOCATION" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location *
                </label>
                <select
                  required
                  value={formData.locationId}
                  onChange={(e) =>
                    setFormData({ ...formData, locationId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Location</option>
                  {locations.map((location) => (
                    <option
                      key={location.locationId}
                      value={location.locationId}
                    >
                      {location.locationName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {user && (
              <StatusToggle
                label="User Status"
                description="Toggle to control whether this user is active and can access the system."
                value={formData.isActive}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    isActive: val,
                  })
                }
                disabled={loading}
              />
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
                {loading ? "Saving..." : user ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
