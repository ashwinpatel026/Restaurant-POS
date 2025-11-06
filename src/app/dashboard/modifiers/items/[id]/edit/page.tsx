"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import ModifierItemForm from "@/components/forms/ModifierItemForm";
import { FormSkeleton } from "@/components/ui/SkeletonLoader";

interface ModifierItem {
  id: string;
  modifierItemCode?: string;
  modifierGroupCode?: string;
  name: string;
  labelName: string;
  colorCode?: string;
  price: number;
  isDefault?: number;
  displayOrder?: number | null;
  isActive?: number;
}

interface ModifierGroup {
  id: string;
  modifierGroupCode?: string | null;
  groupName?: string | null;
}

export default function EditModifierItemPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [modifierItem, setModifierItem] = useState<ModifierItem | null>(null);
  const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [itemRes, groupsRes] = await Promise.all([
        fetch(`/api/modifier-items/${id}`),
        fetch("/api/modifier-groups"),
      ]);

      if (itemRes.ok) {
        const itemData = await itemRes.json();
        setModifierItem(itemData);
      } else {
        toast.error("Failed to fetch modifier item.");
        router.push("/dashboard/modifiers/items");
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setModifiers(groupsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error loading modifier item data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    if (!id) return;

    try {
      const response = await fetch(`/api/modifier-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Modifier item updated successfully!");
        router.push(`/dashboard/modifiers/items?refresh=${Date.now()}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update modifier item");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error updating modifier item"
      );
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <FormSkeleton />
      </DashboardLayout>
    );
  }

  if (!modifierItem) {
    return (
      <DashboardLayout>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Modifier item not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/modifiers/items")}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            <span className="text-lg font-medium">Back to Modifier Items</span>
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Edit Modifier Item: {modifierItem.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Update modifier item configuration and pricing.
        </p>

        <ModifierItemForm
          modifierItem={modifierItem}
          modifiers={modifiers}
          onSave={handleSave}
          onCancel={() => router.push("/dashboard/modifiers/items")}
        />
      </div>
    </DashboardLayout>
  );
}
