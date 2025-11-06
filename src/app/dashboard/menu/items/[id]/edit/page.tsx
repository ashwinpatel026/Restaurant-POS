"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import MenuItemTabbedForm from "@/components/forms/MenuItemTabbedForm";
import { FormSkeleton, Spinner } from "@/components/ui/SkeletonLoader";

interface MenuItem {
  menuItemId?: string;
  menuItemCode?: string;
  menuCategoryCode?: string;
  tblMenuItemId?: number;
  tblMenuCategoryId?: number;
  name: string;
  kitchenName?: string;
  labelName: string;
  colorCode?: string;
  calories?: string;
  description?: string;
  descrip?: string;
  itemSize?: string;
  skuPlu?: number | string;
  itemContainAlcohol?: number;
  isAlcohol?: number;
  menuImg?: string;
  priceStrategy?: number;
  basePrice?: number;
  price?: number;
  isPrice?: number;
  isActive: number;
  stockinhand?: number;
  taxCode?: string;
  modifiers: any[];
  assignedModifiers?: any[];
  inheritModifiers?: boolean;
  inheritModifierGroup?: boolean;
}

interface MenuCategory {
  tblMenuCategoryId?: number;
  menuCategoryCode?: string;
  name: string;
  menuMaster?: {
    name: string;
  };
}

export default function EditMenuItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (itemId) {
      fetchData();
    }
  }, [itemId]);

  const fetchData = async () => {
    try {
      const [itemRes, categoriesRes] = await Promise.all([
        fetch(`/api/menu/items/${itemId}`),
        fetch("/api/menu/categories"),
      ]);

      if (itemRes.ok) {
        const itemData = await itemRes.json();

        // assignedModifiers and inheritModifiers are already fetched by the API endpoint
        // Keep them as returned from the API
        setMenuItem(itemData);
      } else {
        toast.error("Menu item not found");
        router.push("/dashboard/menu/items");
        return;
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
      router.push("/dashboard/menu/items");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      const response = await fetch(`/api/menu/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Menu item updated successfully!");
        router.push(`/dashboard/menu/items?refresh=${Date.now()}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update menu item");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error updating menu item"
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
              <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
          <FormSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  if (!menuItem) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            Menu item not found
          </p>
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
              Edit Menu Item
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Update menu item information
            </p>
          </div>
        </div>

        {/* Form */}
        <MenuItemTabbedForm
          menuItem={menuItem}
          categories={categories}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </DashboardLayout>
  );
}
