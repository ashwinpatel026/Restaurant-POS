"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import MenuItemTabbedForm from "@/components/forms/MenuItemTabbedForm";
import { FormSkeleton, Spinner } from "@/components/ui/SkeletonLoader";

interface MenuCategory {
  tblMenuCategoryId?: number;
  menuCategoryCode?: string;
  name: string;
  menuMaster?: {
    name: string;
  };
}

export default function AddMenuItemPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/menu/categories");
      if (response.ok) {
        const categoriesData = await response.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      toast.error("Error loading categories");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      const response = await fetch("/api/menu/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Menu item created successfully!");
        router.push("/dashboard/menu/items");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create menu item");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error creating menu item"
      );
      console.error("Error:", error);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/menu/items");
  };

  if (loading) {
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

  return (
    <DashboardLayout>
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
        <MenuItemTabbedForm
          categories={categories}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </DashboardLayout>
  );
}
