"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import MasterMenuItemTabbedForm from "@/components/forms/MasterMenuItemTabbedForm";
import { FormSkeleton, Spinner } from "@/components/ui/SkeletonLoader";

interface MenuCategory {
  menuCategoryId?: string;
  menuCategoryCode?: string;
  name: string;
  menuMasterCode?: string;
  menuMaster?: {
    name: string;
  };
}

interface MenuMaster {
  menuMasterId: string;
  menuMasterCode: string;
  name: string;
}

function AddMasterMenuItemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [menuMasters, setMenuMasters] = useState<MenuMaster[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [clonedItem, setClonedItem] = useState<any>(null);
  const [loadingClone, setLoadingClone] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const cloneId = searchParams.get("cloneId");
    if (cloneId) {
      fetchClonedItem(cloneId);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const [mastersRes, categoriesRes] = await Promise.all([
        fetch("/api/master/menu-masters", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/master/menu-categories", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (mastersRes.ok) {
        const mastersData = await mastersRes.json();
        setMenuMasters(mastersData);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClonedItem = async (cloneId: string) => {
    try {
      setLoadingClone(true);
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch(`/api/master/menu-items/${cloneId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch item for cloning");
      }

      const itemData = await response.json();

      // Transform the data for cloning
      const clonedData = {
        ...itemData,
        // Remove IDs - new ones will be generated
        menuItemId: undefined,
        tblMenuItemId: undefined,
        menuItemCode: undefined,
        // Append " (Copy)" to name and labelName
        name: itemData.name ? `${itemData.name} (Copy)` : "",
        labelName: itemData.labelName ? `${itemData.labelName} (Copy)` : "",
        // Clear barcode (should be unique)
        barcode: "",
        // Keep all other fields (modifiers, prep time, pricing, categories, etc.)
        // The form will handle the rest
      };

      setClonedItem(clonedData);
    } catch (error) {
      toast.error("Failed to load item for cloning");
      console.error("Error fetching cloned item:", error);
      // Redirect back to list if cloning fails
      router.push("/master/menu/items");
    } finally {
      setLoadingClone(false);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/menu-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        // Don't show success toast yet - form will show it after saving time events
        // Return the created menu item data so form can save time events
        // After form completes, redirect to list page
        setTimeout(() => {
          router.push("/master/menu/items");
        }, 500);
        return data;
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to create menu item";
          toast.error(errorMessage);
          throw new Error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to create menu item");
          throw jsonError;
        }
      }
    } catch (error) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Error creating menu item";
        toast.error(errorMessage);
      }
      throw error;
    }
  };

  const handleCancel = () => {
    router.push("/master/menu/items");
  };

  if (loading || loadingClone) {
    return (
      <MasterDashboardLayout>
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
      </MasterDashboardLayout>
    );
  }

  return (
    <MasterDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCancel}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Add New Menu Item
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create a new menu item with detailed information
            </p>
          </div>
        </div>

        {/* Form */}
        <MasterMenuItemTabbedForm
          menuItem={clonedItem}
          menuMasters={menuMasters}
          categories={categories}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </MasterDashboardLayout>
  );
}

export default function AddMasterMenuItemPage() {
  return (
    <Suspense
      fallback={
        <MasterDashboardLayout>
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
        </MasterDashboardLayout>
      }
    >
      <AddMasterMenuItemContent />
    </Suspense>
  );
}

