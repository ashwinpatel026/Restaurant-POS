"use client";

import { useRouter } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import ModifierForm from "@/components/forms/ModifierForm";
import { FormSkeleton } from "@/components/ui/SkeletonLoader";

export default function AddModifierPage() {
  const router = useRouter();

  const handleSave = async (formData: any) => {
    try {
      const {
        modifierItems: formItems = [],
        removedItemIds: _removed = [],
        ...groupData
      } = formData || {};

      const token = localStorage.getItem("master_admin_token");

      // 1) Create modifier group
      const groupRes = await fetch("/api/master/modifier-groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...groupData,
          price: groupData.priceStrategy === 3 ? groupData.price ?? 0 : null,
        }),
      });

      if (!groupRes.ok) {
        try {
          const errorData = await groupRes.json();
          const errorMessage = errorData.error || "Failed to create modifier group";
          toast.error(errorMessage);
          return;
        } catch (jsonError) {
          toast.error("Failed to create modifier group");
          return;
        }
      }

      const createdGroup = await groupRes.json();

      // 2) Create modifier items (if any)
      if (Array.isArray(formItems)) {
        for (const item of formItems) {
          if (!item.name?.trim()) continue;
          const itemRes = await fetch("/api/master/modifier-items", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              modifierGroupCode:
                createdGroup.modifierGroupCode ||
                createdGroup.modifier_group_code,
              name: item.name,
              labelName: item.labelName || null,
              colorCode: item.colorCode || null,
              forColorCode: item.forColorCode || null,
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
            try {
              const err = await itemRes.json();
              toast.error(err.error || "Failed to create modifier item");
              return;
            } catch (jsonError) {
              toast.error("Failed to create modifier item");
              return;
            }
          }
        }
      }

      toast.success("Modifier group created successfully!");
      router.push("/master/modifiers/modifiers");
    } catch (error) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Network error. Please check your connection.");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Error creating modifier";
        toast.error(errorMessage);
      }
    }
  };

  return (
    <MasterDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/master/modifiers/modifiers")}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            <span className="text-lg font-medium">Back to Modifiers</span>
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Add Modifiers
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a new Modifiers with selection rules and items.
        </p>

        <ModifierForm
          onSave={handleSave}
          onCancel={() => router.push("/master/modifiers/modifiers")}
        />
      </div>
    </MasterDashboardLayout>
  );
}
