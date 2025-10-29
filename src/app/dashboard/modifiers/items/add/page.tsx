"use client";

import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import ModifierItemForm from "@/components/forms/ModifierItemForm";
import { FormSkeleton } from "@/components/ui/SkeletonLoader";
import { useState, useEffect } from "react";

interface ModifierGroup {
  id: string;
  modifierGroupCode?: string | null;
  groupName?: string | null;
}

export default function AddModifierItemPage() {
  const router = useRouter();
  const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModifiers();
  }, []);

  const fetchModifiers = async () => {
    try {
      const response = await fetch("/api/modifier-groups");
      if (response.ok) {
        const data = await response.json();
        setModifiers(data);
      }
    } catch (error) {
      console.error("Error fetching modifiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      const response = await fetch("/api/modifier-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Modifier item created successfully!");
        router.push("/dashboard/modifiers/items");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create modifier item");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error creating modifier item"
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
          Add Modifier Item
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a new modifier item with specific options and pricing.
        </p>

        <ModifierItemForm
          modifierItem={null}
          modifiers={modifiers}
          onSave={handleSave}
          onCancel={() => router.push("/dashboard/modifiers/items")}
        />
      </div>
    </DashboardLayout>
  );
}
