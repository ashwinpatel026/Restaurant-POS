"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import SystemColorPicker, {
  getPrimaryColor,
} from "@/components/ui/SystemColorPicker";
import TextColorPicker from "@/components/ui/TextColorPicker";
import { CheckIcon } from "@heroicons/react/24/solid";
import StatusToggle from "@/components/forms/StatusToggle";
import { FormSkeleton } from "@/components/ui/SkeletonLoader";
import { capitalizeFirstLetter } from "@/lib/utils";
import { useFormik } from "formik";
import { menuCategorySchema } from "@/validation/menuCategorySchema";
import { useFormikAutoFocus } from "@/hooks/useFormikAutoFocus";

interface MenuMaster {
  menuMasterId: string;
  name: string;
  deptCode: string | null;
}

interface MenuCategory {
  tblMenuCategoryId: number;
  name: string;
  colorCode?: string;
  forColorCode?: string;
  deptCode?: string | null;
  isActive: number;
  tblMenuMasterId: number;
  modifierGroups?: string[];
  modifierGroupCodes?: string[];
}

interface ModifierGroup {
  id: string;
  modifierGroupCode: string | null;
  groupName: string | null;
  labelName: string | null;
}

interface Department {
  deptId: string;
  deptCode: string;
  deptName: string | null;
  isActive: number;
}

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;

  // Refs for auto-focus on validation errors
  const nameRef = useRef<HTMLInputElement>(null);
  const colorCodeRef = useRef<HTMLElement>(null);
  const forColorCodeRef = useRef<HTMLElement>(null);
  const menuMasterRef = useRef<HTMLElement>(null);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [menuMasters, setMenuMasters] = useState<MenuMaster[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedModifierGroups, setSelectedModifierGroups] = useState<
    Set<string>
  >(new Set());
  const [category, setCategory] = useState<MenuCategory | null>(null);

  async function onSubmitForm(values: any) {
    setLoading(true);

    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(
        `/api/master/menu-categories/${categoryId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: values.name.trim(),
            colorCode: values.colorCode,
            forColorCode: values.forColorCode,
            menuMasterId: values.menuMasterId,
            deptCode: values.deptCode || null,
            isActive: values.isActive,
            modifierGroupCodes: Array.from(selectedModifierGroups),
          }),
        }
      );

      if (response.ok) {
        toast.success("Category updated successfully!");
        router.push(`/master/menu/categories`);
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to update category";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to update category");
        }
      }
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Error updating category";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  const formik = useFormik({
    initialValues: {
      name: "",
      colorCode: getPrimaryColor(),
      forColorCode: "#FFFFFF",
      menuMasterId: "",
      deptCode: "",
      isActive: 1,
    },
    validationSchema: menuCategorySchema,
    enableReinitialize: true,
    onSubmit: async (values, { setTouched }) => {
      // Mark all fields as touched to show errors
      setTouched({
        name: true,
        colorCode: true,
        forColorCode: true,
        menuMasterId: true,
        deptCode: true,
      });

      // Validate and check for errors
      await formik.validateForm();

      // If there are errors, don't submit
      if (Object.keys(formik.errors).length > 0) {
        return;
      }

      // No errors, proceed with submission
      onSubmitForm(values);
    },
    validateOnChange: false,
    validateOnBlur: true,
  });

  // Auto-focus on first error field
  useFormikAutoFocus(formik, {
    name: nameRef,
    colorCode: colorCodeRef,
    forColorCode: forColorCodeRef,
    menuMasterId: menuMasterRef,
  });

  useEffect(() => {
    if (categoryId) {
      fetchData();
    }
  }, [categoryId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const [categoryRes, mastersRes, modifierGroupsRes, departmentsRes] = await Promise.all([
        fetch(`/api/master/menu-categories/${categoryId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }),
        fetch("/api/master/menu-masters", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }),
        fetch("/api/master/modifier-groups", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }),
        fetch("/api/master/department", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }),
      ]);

      if (categoryRes.ok) {
        const categoryData = await categoryRes.json();
        setCategory(categoryData);
        formik.setValues({
          name: categoryData.name || "",
          colorCode: categoryData.colorCode || getPrimaryColor(),
          forColorCode: categoryData.forColorCode || "#FFFFFF",
          menuMasterId:
            categoryData.menuMaster?.menuMasterId?.toString() ||
            categoryData.tblMenuMasterId?.toString() ||
            "",
          deptCode: categoryData.deptCode || "",
          isActive:
            typeof categoryData.isActive === "number"
              ? categoryData.isActive
              : 1,
        });

        // Preselect using codes
        if (
          Array.isArray(categoryData.modifierGroupCodes) &&
          categoryData.modifierGroupCodes.length > 0
        ) {
          setSelectedModifierGroups(new Set(categoryData.modifierGroupCodes));
        } else if (
          Array.isArray(categoryData.modifierGroups) &&
          categoryData.modifierGroups.length > 0
        ) {
          // Fallback: try to map names to codes
          const namesSet = new Set<string>(categoryData.modifierGroups);
          (window as any).__pendingModifierNames = namesSet;
        }
      }

      if (mastersRes.ok) {
        const mastersData = await mastersRes.json();
        setMenuMasters(mastersData);
      }

      if (modifierGroupsRes.ok) {
        const modifierGroupsData = await modifierGroupsRes.json();
        setModifierGroups(modifierGroupsData);
        // If we had only names from category, map to codes now
        const pendingNames: Set<string> | undefined = (window as any)
          .__pendingModifierNames;
        if (pendingNames && pendingNames.size > 0) {
          const codesFromNames = modifierGroupsData
            .filter((g: any) =>
              pendingNames.has(
                g.groupName || g.labelName || g.modifierGroupCode
              )
            )
            .map((g: any) => g.modifierGroupCode)
            .filter((c: string | null) => c !== null) as string[];
          if (codesFromNames.length > 0) {
            setSelectedModifierGroups(new Set(codesFromNames));
          }
          (window as any).__pendingModifierNames = undefined;
        }
      }

      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json();
        setDepartments(departmentsData.filter((d: Department) => d.isActive === 1));
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleModifierGroupToggle = (modifierGroupCode: string) => {
    const updated = new Set(selectedModifierGroups);
    if (updated.has(modifierGroupCode)) {
      updated.delete(modifierGroupCode);
    } else {
      updated.add(modifierGroupCode);
    }
    setSelectedModifierGroups(updated);
  };

  // Handle menu master selection and auto-select department
  const handleMenuMasterSelect = (menuMasterId: string) => {
    const selectedMaster = menuMasters.find((m) => m.menuMasterId === menuMasterId);
    // Auto-select department from menu master only if category doesn't already have one
    const newDeptCode = formik.values.deptCode || selectedMaster?.deptCode || "";
    formik.setFieldValue("menuMasterId", menuMasterId);
    formik.setFieldValue("deptCode", newDeptCode);
  };

  const handleSelectAll = () => {
    if (selectedModifierGroups.size === modifierGroups.length) {
      setSelectedModifierGroups(new Set());
    } else {
      const allCodes = new Set(
        modifierGroups
          .map((g) => g.modifierGroupCode)
          .filter((code): code is string => code !== null)
      );
      setSelectedModifierGroups(allCodes);
    }
  };


  if (fetchLoading) {
    return (
      <MasterDashboardLayout>
        <FormSkeleton />
      </MasterDashboardLayout>
    );
  }

  return (
    <MasterDashboardLayout>
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
              Edit Menu Category
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Update menu category information
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={formik.handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Basic Information
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={nameRef}
                      type="text"
                      required
                      maxLength={30}
                      {...formik.getFieldProps("name")}
                      onChange={(e) => {
                        const capitalizedValue = capitalizeFirstLetter(e.target.value);
                        formik.setFieldValue("name", capitalizedValue);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:outline-none transition-all ${
                        formik.errors.name && formik.touched.name
                          ? "border-red-500 dark:border-red-500 animate-shake focus:border-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:border-blue-500"
                      }`}
                      placeholder="Enter category name"
                    />
                    {formik.errors.name && formik.touched.name && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {formik.errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Menu Master <span className="text-red-500">*</span>
                    </label>
                    {menuMasters.length === 0 ? (
                      <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-sm text-gray-500 dark:text-gray-400">
                        No menu masters available. Please create a menu master
                        first.
                      </div>
                    ) : (
                      <>
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                        <div className="max-h-48 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:dark:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 [&::-webkit-scrollbar-thumb]:dark:hover:bg-gray-500">
                          <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {menuMasters.map((master) => {
                              const isSelected =
                                formik.values.menuMasterId === master.menuMasterId;
                              return (
                                <button
                                  key={master.menuMasterId}
                                  type="button"
                                  onClick={() =>
                                    handleMenuMasterSelect(master.menuMasterId)
                                  }
                                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`text-sm font-medium truncate ${
                                          isSelected
                                            ? "text-blue-700 dark:text-blue-300"
                                            : "text-gray-700 dark:text-gray-300"
                                        }`}
                                        title={master.name}
                                      >
                                        {master.name}
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <CheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {formik.errors.menuMasterId && formik.touched.menuMasterId && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {formik.errors.menuMasterId}
                        </p>
                      )}
                      </>
                    )}
                  </div>

                  {/* Department Selection - Always visible, enabled after menu master selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <select
                      name="deptCode"
                      value={formik.values.deptCode}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      disabled={!formik.values.menuMasterId}
                      className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.deptId} value={dept.deptCode}>
                          {dept.deptName}
                        </option>
                      ))}
                    </select>
                    {!formik.values.menuMasterId && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Please select a menu master first
                      </p>
                    )}
                    
                  </div>

                  {/* Color Code Section - All three wrapped */}
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <SystemColorPicker
                          label="Color Code (Background)"
                          value={formik.values.colorCode || ""}
                          onChange={(color: string) =>
                            formik.setFieldValue("colorCode", color)
                          }
                        />
                      </div>
                      <div>
                        <TextColorPicker
                          label="Text Color"
                          value={formik.values.forColorCode || "#FFFFFF"}
                          onChange={(color: string) =>
                            formik.setFieldValue("forColorCode", color)
                          }
                        />
                      </div>
                    </div>

                    {/* Sample Button */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Color Preview
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Preview how the colors will look together
                      </p>
                      <button
                        type="button"
                        className="px-6 py-3 rounded-lg font-medium transition-all hover:opacity-90"
                        style={{
                          backgroundColor: formik.values.colorCode || "#3B82F6",
                          color: formik.values.forColorCode || "#FFFFFF",
                        }}
                      >
                        Sample Button
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modifier Groups Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Assign Modifiers (Optional)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Select modifiers that will be available for all items in this
                  category
                </p>
                {modifierGroups.length === 0 ? (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No modifier groups available
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {modifierGroups.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-3 py-1 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          {selectedModifierGroups.size === modifierGroups.length
                            ? "Deselect All"
                            : "Select All"}
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:dark:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 [&::-webkit-scrollbar-thumb]:dark:hover:bg-gray-500">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
                        {modifierGroups.map((group) => {
                          const code = group.modifierGroupCode;
                          if (!code) return null;
                          const isSelected = selectedModifierGroups.has(code);
                          return (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => handleModifierGroupToggle(code)}
                              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm font-medium truncate ${
                                      isSelected
                                        ? "text-blue-700 dark:text-blue-300"
                                        : "text-gray-700 dark:text-gray-300"
                                    }`}
                                    title={
                                      group.groupName || group.labelName || code
                                    }
                                  >
                                    {group.groupName || group.labelName || code}
                                  </p>
                                </div>
                                {isSelected && (
                                  <CheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <StatusToggle
                label="Category Status"
                description="Toggle to control whether this category is active and visible across the POS."
                value={formik.values.isActive === 1}
                onChange={(val) =>
                  formik.setFieldValue("isActive", val ? 1 : 0)
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
                {loading ? "Updating..." : "Update Category"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MasterDashboardLayout>
  );
}
