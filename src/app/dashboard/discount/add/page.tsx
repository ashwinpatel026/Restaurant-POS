"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import StatusToggle from "@/components/forms/StatusToggle";
import DatePicker from "react-datepicker";
import { format, parse } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import { usePagePermission } from "@/hooks/usePagePermission";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface Department {
  deptId: string;
  deptCode: string;
  deptName: string | null;
  isActive: number;
}

interface MenuCategory {
  menuCategoryId: string;
  menuCategoryCode: string;
  name: string | null;
  menuMasterCode: string;
  isActive?: number;
}

export default function AddDiscountPage() {
  const router = useRouter();
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();
  
  // Check permission to create discounts
  const { hasPermission, loading: permissionLoading } = usePagePermission({
    requiredPermissions: ["discount.create"],
  });

  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [selectedMenuCategories, setSelectedMenuCategories] = useState<
    string[]
  >([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    promoCode: "",
    discountName: "",
    discountType: "",
    discountMode: "PERCENTAGE",
    discountValue: "",
    maxDiscountAmount: "",
    isItemLevel: false,
    isBillLevel: false,
    requiresManagerApproval: false,
    allowedRoles: [] as string[],
    validFrom: null as Date | null,
    validTo: null as Date | null,
    menuCategory: [] as string[],
    deptCode: "",
    discountNote: "",
    isDelete: false,
    isOpenDiscount: false,
    applyDiscountType: "SELECTED_ITEM", // "SELECTED_ITEM" or "ENTIRE_TRANSACTION"
    isActive: true,
  });

  const discountTypes = [
    { value: "STAFFMEAL", label: "Staff Meal" },
    { value: "COMPLIMENTARY", label: "Complimentary" },
    { value: "PROMO", label: "Promo" },
    { value: "HAPPYHOUR", label: "Happy Hour" },
    { value: "COUPON", label: "Coupon" },
    { value: "LOYALTY", label: "Loyalty" },
    { value: "MANUAL", label: "Manual" },
    { value: "VOUCHER", label: "Voucher" },
    { value: "COMPENSATION", label: "Compensation" },
  ];

  const discountModes = [
    { value: "PERCENTAGE", label: "Percentage" },
    { value: "FIXED", label: "Fixed Amount" },
  ];

  const availableRoles = ["Manager", "Owner", "Staff", "System"];

  if (permissionLoading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!hasPermission) {
    return null; // usePagePermission will redirect to access-denied
  }

  const fetchData = async () => {
    try {
      const [deptsRes, categoriesRes] = await Promise.all([
        fetch(buildApiUrl("/api/dashboard/department"), {
          cache: "no-store",
        }),
        fetch(buildApiUrl("/api/dashboard/menu/categories"), {
          cache: "no-store",
        }),
      ]);

      if (deptsRes.ok) {
        const deptsData = await deptsRes.json();
        setDepartments(deptsData.filter((d: Department) => d.isActive === 1));
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setMenuCategories(
          categoriesData.filter((c: MenuCategory) => c.isActive === 1)
        );
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    }
  };

  const handleMenuCategoryToggle = (categoryCode: string) => {
    setSelectedMenuCategories((prev) => {
      if (prev.includes(categoryCode)) {
        return prev.filter((code) => code !== categoryCode);
      } else {
        return [...prev, categoryCode];
      }
    });
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = buildApiUrl("/api/dashboard/discount");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promoCode: formData.promoCode || null,
          discountName: formData.discountName,
          discountType: formData.discountType,
          discountMode: formData.discountMode,
          discountValue: formData.isOpenDiscount
            ? null
            : parseFloat(formData.discountValue),
          maxDiscountAmount: formData.maxDiscountAmount
            ? parseFloat(formData.maxDiscountAmount)
            : null,
          isItemLevel: formData.applyDiscountType === "SELECTED_ITEM",
          isBillLevel: formData.applyDiscountType === "ENTIRE_TRANSACTION",
          requiresManagerApproval: formData.requiresManagerApproval,
          allowedRoles: selectedRoles.length > 0 ? selectedRoles : null,
          validFrom: formData.validFrom
            ? format(formData.validFrom, "yyyy-MM-dd")
            : null,
          validTo: formData.validTo
            ? format(formData.validTo, "yyyy-MM-dd")
            : null,
          menuCategory:
            selectedMenuCategories.length > 0 ? selectedMenuCategories : null,
          deptCode: formData.deptCode || null,
          discountNote: formData.discountNote || null,
          isDelete: formData.isDelete,
          isOpenDiscount: formData.isOpenDiscount,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        toast.success("Discount created successfully!");
        router.push("/dashboard/discount");
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to create discount";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to create discount");
        }
      }
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Error creating discount";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

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
              Add Discount
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create a new discount or promotional code
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Basic Information
                </h3>
                <div className="space-y-4">
                  {/* First Row: Promo Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Promo Code
                    </label>
                    <input
                      type="text"
                      value={formData.promoCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          promoCode: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional promo code"
                    />
                  </div>

                  {/* Second Row: Discount Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Discount Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.discountName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter discount name"
                    />
                  </div>

                  {/* Third Row: Discount Type and Discount Mode */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Discount Type *
                      </label>
                      <select
                        required
                        value={formData.discountType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discountType: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="" disabled>
                          Select discount type
                        </option>
                        {discountTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Discount Mode *
                      </label>
                      <select
                        required
                        value={formData.discountMode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discountMode: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {discountModes.map((mode) => (
                          <option key={mode.value} value={mode.value}>
                            {mode.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Discount Note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Discount Note
                    </label>
                    <textarea
                      value={formData.discountNote}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountNote: e.target.value,
                        })
                      }
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional note about this discount"
                    />
                  </div>
                </div>
              </div>

              {/* Discount Value Section - Fourth Row */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Discount Value
                </h3>
                <div className="space-y-4">
                  {/* Open Discount Checkbox First */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isOpenDiscount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isOpenDiscount: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-base font-medium text-gray-700 dark:text-gray-300">
                        Open Discount
                      </span>
                    </label>
                  </div>

                  {/* Discount Value and Max Discount Amount in one row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Discount Value {!formData.isOpenDiscount && "*"}
                      </label>
                      <input
                        type="number"
                        required={!formData.isOpenDiscount}
                        disabled={formData.isOpenDiscount}
                        step="0.01"
                        min="0"
                        value={formData.discountValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discountValue: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Discount Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.maxDiscountAmount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxDiscountAmount: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Note: Keep Zero for Remove Restriction
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validity Period */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Validity Period
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valid From
                    </label>
                    <DatePicker
                      selected={formData.validFrom}
                      onChange={(date: Date | null) =>
                        setFormData({ ...formData, validFrom: date })
                      }
                      dateFormat="MM-dd-yyyy"
                      placeholderText="MM-dd-yyyy"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      wrapperClassName="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valid To
                    </label>
                    <DatePicker
                      selected={formData.validTo}
                      onChange={(date: Date | null) =>
                        setFormData({ ...formData, validTo: date })
                      }
                      dateFormat="MM-dd-yyyy"
                      placeholderText="MM-dd-yyyy"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      wrapperClassName="w-full"
                      minDate={formData.validFrom || undefined}
                    />
                  </div>
                </div>
              </div>

              {/* Apply Discount Type */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Apply Discount
                </h3>
                <div className="flex flex-row gap-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyDiscountType"
                      value="SELECTED_ITEM"
                      checked={formData.applyDiscountType === "SELECTED_ITEM"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          applyDiscountType: e.target.value,
                        })
                      }
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Apply Discount on Selected Item
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyDiscountType"
                      value="ENTIRE_TRANSACTION"
                      checked={
                        formData.applyDiscountType === "ENTIRE_TRANSACTION"
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          applyDiscountType: e.target.value,
                        })
                      }
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Apply Discount on Entire Transaction
                    </span>
                  </label>
                </div>
              </div>

              {/* Allowed Roles */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Allowed Roles
                </h3>
                <div className="flex flex-row space-x-4">
                  {availableRoles.map((role) => (
                    <label
                      key={role}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role)}
                        onChange={() => handleRoleToggle(role)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-base text-gray-700 dark:text-gray-300">
                        {role}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Requires Manager Approval */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.requiresManagerApproval}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiresManagerApproval: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-base font-medium text-gray-700 dark:text-gray-300">
                    Requires Manager Approval
                  </span>
                </label>
              </div>

              {/* Department */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Department
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.deptCode}
                    onChange={(e) =>
                      setFormData({ ...formData, deptCode: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.deptId} value={dept.deptCode}>
                        {dept.deptName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Menu Categories */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Menu Categories
                </h3>
                {menuCategories.length === 0 ? (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No categories available
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                    <div className="flex flex-wrap gap-2">
                      {menuCategories.map((category) => {
                        const isSelected = selectedMenuCategories.includes(
                          category.menuCategoryCode
                        );
                        return (
                          <button
                            key={category.menuCategoryId}
                            type="button"
                            onClick={() =>
                              handleMenuCategoryToggle(
                                category.menuCategoryCode
                              )
                            }
                            className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                            }`}
                          >
                            {category.name || category.menuCategoryCode}
                            {isSelected && (
                              <CheckIcon className="w-4 h-4 inline-block ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <StatusToggle
                label="Discount Status"
                description="Toggle to control whether this discount is active."
                value={formData.isActive}
                onChange={(val) => setFormData({ ...formData, isActive: val })}
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
                {loading ? "Creating..." : "Create Discount"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

