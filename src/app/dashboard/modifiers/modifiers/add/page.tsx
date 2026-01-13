"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import ModifierForm from "@/components/forms/ModifierForm";
import { FormSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";

function AddModifierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { buildApiUrl } = useApiWithStore();
  const [clonedModifier, setClonedModifier] = useState<any>(null);
  const [loadingClone, setLoadingClone] = useState(false);

  useEffect(() => {
    const cloneId = searchParams.get("cloneId");
    if (cloneId) {
      fetchClonedModifier(cloneId);
    }
  }, [searchParams]);

  const fetchClonedModifier = async (cloneId: string) => {
    try {
      setLoadingClone(true);
      // Fetch modifier group
      const groupResponse = await fetch(buildApiUrl(`/api/dashboard/modifier-groups/${cloneId}`));

      if (!groupResponse.ok) {
        throw new Error("Failed to fetch modifier for cloning");
      }

      const modifierData = await groupResponse.json();

      // Fetch modifier items for this group
      let items: any[] = [];
      if (modifierData.modifierGroupCode) {
        const itemsResponse = await fetch(
          buildApiUrl(`/api/dashboard/modifier-items?modifierGroupCode=${modifierData.modifierGroupCode}`)
        );

        if (itemsResponse.ok) {
          items = await itemsResponse.json();
        }
      }

      // Transform the data for cloning
      const clonedData = {
        ...modifierData,
        // Remove IDs - new ones will be generated
        id: undefined,
        modifierGroupCode: undefined,
        // Append " (Copy)" to name and labelName
        groupName: modifierData.groupName ? `${modifierData.groupName} (Copy)` : "",
        labelName: modifierData.labelName ? `${modifierData.labelName} (Copy)` : "",
        // Keep all other fields (settings, prefix, etc.)
        // Transform items - remove IDs only, keep names as is
        items: items.map((item: any) => ({
          ...item,
          id: undefined, // Remove ID so it will be created as new
          // Keep name and labelName as is (no "(Copy)" appended)
          // Keep all other item fields (price, color, etc.)
        })),
      };

      setClonedModifier(clonedData);
    } catch (error) {
      toast.error("Failed to load modifier for cloning");
      console.error("Error fetching cloned modifier:", error);
      // Redirect back to list if cloning fails
      router.push("/dashboard/modifiers/modifiers");
    } finally {
      setLoadingClone(false);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      const {
        modifierItems: formItems = [],
        removedItemIds: _removed = [],
        ...groupData
      } = formData || {};

      // 1) Create modifier group
      const groupRes = await fetch(
        buildApiUrl("/api/dashboard/modifier-groups"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...groupData,
            price: groupData.priceStrategy === 3 ? groupData.price ?? 0 : null,
          }),
        }
      );

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
          const itemRes = await fetch(
            buildApiUrl("/api/dashboard/modifier-items"),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
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
                groupCode: item.groupCode || null,
                isActive: typeof item.isActive === "number" ? item.isActive : 1,
              }),
            }
          );
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
      router.push("/dashboard/modifiers/modifiers");
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
          Add Modifiers
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a new Modifiers with selection rules and items.
        </p>

        {loadingClone ? (
          <FormSkeleton />
        ) : (
          <ModifierForm
            modifier={clonedModifier}
            onSave={handleSave}
            onCancel={() => router.push("/dashboard/modifiers/modifiers")}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AddModifierPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center text-gray-600 dark:text-gray-400">
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="h-9 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-5 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <FormSkeleton />
          </div>
        </DashboardLayout>
      }
    >
      <AddModifierContent />
    </Suspense>
  );
}
