"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import SystemColorPicker, {
  getPrimaryColor,
} from "@/components/ui/SystemColorPicker";
import TextColorPicker from "@/components/ui/TextColorPicker";
import { CheckIcon } from "@heroicons/react/24/solid";
import StatusToggle from "@/components/forms/StatusToggle";
import { FormSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import { useFormik } from "formik";
import { menuCategorySchema } from "@/validation/menuCategorySchema";
import { useFormikAutoFocus } from "@/hooks/useFormikAutoFocus";
import { capitalizeFirstLetter } from "@/lib/utils";
import ModifierSelectionModal from "@/components/modals/ModifierSelectionModal";

interface MenuMaster {
  menuMasterId: string;
  name: string;
  deptCode: string | null;
}

interface ModifierGroup {
  id: string;
  modifierGroupCode: string | null;
  groupName: string | null;
  labelName: string | null;
  isRequired?: number;
  isMultiselect?: number;
  minSelection?: number | null;
  maxSelection?: number | null;
}

interface Department {
  deptId: string;
  deptCode: string;
  deptName: string | null;
  isActive: number;
}

function AddCategoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();
  const [loading, setLoading] = useState(false);
  const [loadingClone, setLoadingClone] = useState(false);
  const [menuMasters, setMenuMasters] = useState<MenuMaster[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([]);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [pendingModifierCodes, setPendingModifierCodes] = useState<
    string[] | null
  >(null);
  const [pendingModifierNames, setPendingModifierNames] =
    useState<Set<string> | null>(null);

  const resolveSelectedModifierIds = (
    groups: ModifierGroup[],
    codes?: string[] | null,
    names?: Set<string> | null,
  ) => {
    if (codes && codes.length > 0) {
      return groups
        .filter(
          (g) => g.modifierGroupCode && codes.includes(g.modifierGroupCode),
        )
        .map((g) => parseInt(g.id))
        .filter((id) => !Number.isNaN(id));
    }
    if (names && names.size > 0) {
      return groups
        .filter((g) =>
          names.has(g.groupName || g.labelName || g.modifierGroupCode || ""),
        )
        .map((g) => parseInt(g.id))
        .filter((id) => !Number.isNaN(id));
    }
    return [];
  };

  const getSelectedModifierGroupCodes = () =>
    selectedModifiers
      .map(
        (id) =>
          modifierGroups.find((g) => Number(g.id) === Number(id))
            ?.modifierGroupCode,
      )
      .filter((code): code is string => !!code);

  // Refs for auto-focus on validation errors
  const nameRef = useRef<HTMLInputElement>(null);
  const colorCodeRef = useRef<HTMLElement>(null);
  const forColorCodeRef = useRef<HTMLElement>(null);
  const menuMasterRef = useRef<HTMLElement>(null);

  // Formik instance for validation
  const formik = useFormik({
    initialValues: {
      name: "",
      colorCode: getPrimaryColor(),
      forColorCode: "#FFFFFF",
      menuMasterId: "",
      deptCode: "",
      isActive: 1,
      disableInPOS: 0,
    },
    validationSchema: menuCategorySchema,
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
    validateOnChange: true,
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
    if (selectedStoreCode) {
      const cloneId = searchParams.get("cloneId");
      if (!cloneId) {
        formik.setFieldValue("colorCode", getPrimaryColor());
        formik.setFieldValue("forColorCode", "#FFFFFF");
      }
      fetchData();
    }
  }, [selectedStoreCode]);

  useEffect(() => {
    const cloneId = searchParams.get("cloneId");
    if (cloneId && selectedStoreCode) {
      fetchClonedCategory(cloneId);
    }
  }, [searchParams, selectedStoreCode]);

  // Resolve cloned modifier codes/names to IDs once modifier groups are loaded
  useEffect(() => {
    if (
      modifierGroups.length === 0 ||
      (!pendingModifierCodes && !pendingModifierNames)
    ) {
      return;
    }
    setSelectedModifiers(
      resolveSelectedModifierIds(
        modifierGroups,
        pendingModifierCodes,
        pendingModifierNames,
      ),
    );
    setPendingModifierCodes(null);
    setPendingModifierNames(null);
  }, [modifierGroups, pendingModifierCodes, pendingModifierNames]);

  const fetchClonedCategory = async (cloneId: string) => {
    try {
      setLoadingClone(true);
      const response = await fetch(
        buildApiUrl(`/api/dashboard/menu/categories/${cloneId}`),
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch category for cloning");
      }

      const categoryData = await response.json();

      formik.setValues({
        name: categoryData.name ? `${categoryData.name} (Copy)` : "",
        colorCode: categoryData.colorCode || getPrimaryColor(),
        forColorCode: categoryData.forColorCode || "#FFFFFF",
        menuMasterId:
          categoryData.menuMaster?.menuMasterId?.toString() ||
          categoryData.tblMenuMasterId?.toString() ||
          "",
        deptCode: categoryData.deptCode || "",
        isActive:
          typeof categoryData.isActive === "number" ? categoryData.isActive : 1,
        disableInPOS:
          typeof categoryData.disableInPOS === "number"
            ? categoryData.disableInPOS
            : 0,
      });

      if (
        Array.isArray(categoryData.modifierGroupCodes) &&
        categoryData.modifierGroupCodes.length > 0
      ) {
        setPendingModifierCodes(categoryData.modifierGroupCodes);
      } else if (
        Array.isArray(categoryData.modifierGroups) &&
        categoryData.modifierGroups.length > 0
      ) {
        setPendingModifierNames(new Set<string>(categoryData.modifierGroups));
      }
    } catch (error) {
      toast.error("Failed to load category for cloning");
      console.error("Error fetching cloned category:", error);
      router.push("/dashboard/menu/categories");
    } finally {
      setLoadingClone(false);
    }
  };

  const fetchData = async () => {
    try {
      const [mastersRes, modifierGroupsRes, departmentsRes] = await Promise.all(
        [
          fetch(buildApiUrl("/api/dashboard/menu/masters"), {
            cache: "no-store",
          }),
          fetch(buildApiUrl("/api/dashboard/modifier-groups"), {
            cache: "no-store",
          }),
          fetch(buildApiUrl("/api/dashboard/department"), {
            cache: "no-store",
          }),
        ],
      );

      if (mastersRes.ok) {
        const mastersData = await mastersRes.json();
        setMenuMasters(mastersData);
      }

      if (modifierGroupsRes.ok) {
        const modifierGroupsData = await modifierGroupsRes.json();
        setModifierGroups(modifierGroupsData);
      }

      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json();
        setDepartments(
          departmentsData.filter((d: Department) => d.isActive === 1),
        );
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    }
  };

  // Handle menu master selection and auto-select department
  const handleMenuMasterSelect = (menuMasterId: string) => {
    const selectedMaster = menuMasters.find(
      (m) => m.menuMasterId === menuMasterId,
    );
    formik.setFieldValue("menuMasterId", menuMasterId);
    formik.setFieldValue("deptCode", selectedMaster?.deptCode || "");
  };

  async function onSubmitForm(values: any) {
    setLoading(true);

    try {
      const response = await fetch(
        buildApiUrl("/api/dashboard/menu/categories"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: values.name.trim(),
            colorCode: values.colorCode,
            forColorCode: values.forColorCode,
            menuMasterId: values.menuMasterId,
            deptCode: values.deptCode || null,
            isActive: values.isActive,
            disableInPOS: values.disableInPOS,
            modifierGroupCodes: getSelectedModifierGroupCodes(),
          }),
        },
      );

      if (response.ok) {
        toast.success("Category created successfully!");
        router.push(`/dashboard/menu/categories`);
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to create category";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to create category");
        }
      }
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Error creating category";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleRemoveModifier = (modifierId: number) => {
    setSelectedModifiers((prev) => prev.filter((id) => id !== modifierId));
  };

  const handleModifierModalConfirm = async (selectedIds: number[]) => {
    setSelectedModifiers(selectedIds);
    try {
      const response = await fetch(
        buildApiUrl("/api/dashboard/modifier-groups"),
        { cache: "no-store" },
      );
      if (response.ok) {
        setModifierGroups(await response.json());
      }
    } catch (error) {
      console.error("Error refreshing modifier groups:", error);
    }
  };

  if (loadingClone) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 text-gray-500 dark:text-gray-400">
              <ArrowLeftIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
          <FormSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  const isCloning = !!searchParams.get("cloneId");

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
              {isCloning ? "Clone Menu Category" : "Add Menu Category"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {isCloning
                ? "Create a copy of an existing menu category"
                : "Create a new menu category for your restaurant"}
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
                      maxLength={30}
                      {...formik.getFieldProps("name")}
                      onChange={(e) => {
                        const capitalizedValue = capitalizeFirstLetter(
                          e.target.value,
                        );
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
                              {menuMasters.map((master) => {
                                const isSelected =
                                  formik.values.menuMasterId ===
                                  master.menuMasterId;
                                return (
                                  <button
                                    key={master.menuMasterId}
                                    type="button"
                                    onClick={() =>
                                      handleMenuMasterSelect(
                                        master.menuMasterId,
                                      )
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
                        {formik.errors.menuMasterId &&
                          formik.touched.menuMasterId && (
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
                      {...formik.getFieldProps("deptCode")}
                      disabled={!formik.values.menuMasterId}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
                          value={formik.values.colorCode}
                          onChange={(color: string) =>
                            formik.setFieldValue("colorCode", color)
                          }
                        />
                        {formik.errors.colorCode &&
                          formik.touched.colorCode && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                              {formik.errors.colorCode}
                            </p>
                          )}
                      </div>
                      <div>
                        <TextColorPicker
                          label="Text Color"
                          value={formik.values.forColorCode}
                          onChange={(color: string) =>
                            formik.setFieldValue("forColorCode", color)
                          }
                        />
                        {formik.errors.forColorCode &&
                          formik.touched.forColorCode && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                              {formik.errors.forColorCode}
                            </p>
                          )}
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

              {/* Modifiers Selection */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Assign Modifiers (Optional)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowModifierModal(true)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Add modifiers
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Select modifiers that will be available for all items in this
                  category
                </p>

                {selectedModifiers.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">
                      No modifiers selected
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Click &quot;Add modifiers&quot; to select modifiers for
                      this category
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-gray-200 dark:border-gray-600 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Modifier Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Required?
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Multi-select?
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Min # selections
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Max # selections
                          </th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedModifiers.map((modifierId) => {
                          const modifier = modifierGroups.find(
                            (m) => Number(m.id) === Number(modifierId),
                          );
                          if (!modifier) return null;
                          const multi = (modifier.isMultiselect ?? 0) === 1;
                          return (
                            <tr key={modifierId}>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {modifier.groupName ||
                                    modifier.labelName ||
                                    modifier.modifierGroupCode ||
                                    "Unnamed Modifier"}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {(modifier.isRequired ?? 0) === 1
                                  ? "Required"
                                  : (modifier.isRequired ?? 0) === 2
                                    ? "Optional - Force Show"
                                    : "Optional"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {multi ? "Yes" : "No"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {multi
                                  ? (modifier.minSelection ?? "n/a")
                                  : "n/a"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {multi
                                  ? (modifier.maxSelection ?? "n/a")
                                  : "n/a"}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveModifier(modifierId)
                                  }
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  aria-label="Remove modifier group"
                                >
                                  <span aria-hidden>×</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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

              <StatusToggle
                label="Disable In POS"
                description="Toggle to disable this category from appearing in the POS."
                value={formik.values.disableInPOS === 1}
                onChange={(val) =>
                  formik.setFieldValue("disableInPOS", val ? 1 : 0)
                }
                trueLabel="Disabled"
                falseLabel="Enabled"
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
                {loading ? "Creating..." : "Create Category"}
              </button>
            </div>
          </form>
        </div>

        <ModifierSelectionModal
          isOpen={showModifierModal}
          onClose={() => setShowModifierModal(false)}
          onConfirm={handleModifierModalConfirm}
          selectedModifierIds={selectedModifiers}
        />
      </div>
    </DashboardLayout>
  );
}

export default function AddCategoryPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 text-gray-500 dark:text-gray-400">
                <ArrowLeftIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
            <FormSkeleton />
          </div>
        </DashboardLayout>
      }
    >
      <AddCategoryContent />
    </Suspense>
  );
}
