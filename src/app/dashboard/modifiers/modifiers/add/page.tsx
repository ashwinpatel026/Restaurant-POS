"use client";

import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import ModifierForm from "@/components/forms/ModifierForm";
import { FormSkeleton } from "@/components/ui/SkeletonLoader";

export default function AddModifierPage() {
  const router = useRouter();

  const handleSave = async (formData: any) => {
    try {
      // 1) Create modifier group
      const groupRes = await fetch("/api/modifier-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName: formData.groupName,
          labelName: formData.labelName,
          isRequired: formData.isRequired,
          isMultiselect: formData.isMultiselect,
          minSelection: formData.minSelection,
          maxSelection: formData.maxSelection,
          showDefaultTop: formData.showDefaultTop,
          inheritFromMenuGroup: formData.inheritFromMenuGroup,
          menuCategoryCode: formData.menuCategoryCode || null,
          priceStrategy: formData.priceStrategy,
          price: formData.priceStrategy === 3 ? formData.price : null,
          isActive: formData.isActive,
        }),
      });

      if (!groupRes.ok) {
        const errorData = await groupRes.json();
        throw new Error(errorData.error || "Failed to create modifier group");
      }

      const createdGroup = await groupRes.json();

      // 2) Create modifier items (if any)
      if (Array.isArray(formData.modifierItems)) {
        for (const item of formData.modifierItems) {
          if (!item.name?.trim()) continue;
          const itemRes = await fetch("/api/modifier-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              modifierGroupCode:
                createdGroup.modifierGroupCode ||
                createdGroup.modifier_group_code,
              name: item.name,
              labelName: item.labelName || null,
              colorCode: item.colorCode || null,
              price: typeof item.price === "number" ? item.price : null,
              isDefault: item.isDefault ? 1 : 0,
              displayOrder:
                typeof item.displayOrder === "number"
                  ? item.displayOrder
                  : null,
              isActive: 1,
            }),
          });
          if (!itemRes.ok) {
            const err = await itemRes.json();
            throw new Error(err.error || "Failed to create modifier item");
          }
        }
      }

      toast.success("Modifier group created successfully!");
      router.push("/dashboard/modifiers/modifiers");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error creating modifier"
      );
      console.error("Error:", error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/modifiers/modifiers")}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            <span className="text-lg font-medium">Back to Modifiers</span>
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Add Modifier Group
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a new modifier group with selection rules and items.
        </p>

        <ModifierForm
          onSave={handleSave}
          onCancel={() => router.push("/dashboard/modifiers/modifiers")}
        />
      </div>
    </DashboardLayout>
  );
}
