"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  outlet?: {
    name: string;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        toast.success("User status updated");
        fetchUsers();
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage system users and their access
            </p>
          </div>
          <button className="btn btn-primary">
            <PlusIcon className="w-5 h-5 mr-2" />
            Add User
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">No users found</p>
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Outlet</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="font-medium">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="text-gray-600">{user.email}</td>
                      <td>
                        <span className="badge bg-blue-100 text-blue-800">
                          {user.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="text-gray-600">
                        {user.outlet?.name || "N/A"}
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            handleToggleStatus(user.id, user.isActive)
                          }
                          className={`badge ${
                            user.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <button className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
