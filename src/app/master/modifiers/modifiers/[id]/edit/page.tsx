"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import ModifierForm from "@/components/forms/ModifierForm";
import { FormSkeleton } from "@/components/ui/SkeletonLoader";

interface ModifierGroup {
  id: string;
  modifierGroupCode?: string | null;
  groupName?: string | null;
  labelName?: string | null;
  isRequired: number;
  isMultiselect: number;
  minSelection?: number | null;
  maxSelection?: number | null;
  showDefaultTop: number;
  inheritFromMenuGroup: number;
  priceStrategy: number;
  price?: number | null;
  isActive: number;
  items?: any[];
}

export default function EditModifierPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [modifier, setModifier] = useState<ModifierGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModifier = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const token = localStorage.getItem("master_admin_token");

        // Fetch modifier group
        const groupResponse = await fetch(`/api/master/modifier-groups/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!groupResponse.ok) {
          toast.error("Failed to fetch modifier.");
          router.push("/master/modifiers/modifiers");
          return;
        }

        const modifierData = await groupResponse.json();

        // Fetch modifier items for this group
        let items: any[] = [];
        if (modifierData.modifierGroupCode) {
          const itemsResponse = await fetch(
            `/api/master/modifier-items?modifierGroupCode=${modifierData.modifierGroupCode}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (itemsResponse.ok) {
            items = await itemsResponse.json();
          }
        }

        // Combine group and items
        setModifier({
          ...modifierData,
          items: items,
        });
      } catch (error) {
        console.error("Error fetching modifier:", error);
        toast.error("Error loading modifier data.");
      } finally {
        setLoading(false);
      }
    };

    fetchModifier();
  }, [id, router]);

  const handleSave = async (formData: any) => {
    if (!id) return;
    try {
      const {
        modifierItems: formItems = [],
        removedItemIds = [],
        ...groupData
      } = formData || {};

      const token = localStorage.getItem("master_admin_token");

      // 1) Update modifier group
      const groupResponse = await fetch(`/api/master/modifier-groups/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...groupData,
          price: groupData.priceStrategy === 3 ? groupData.price ?? 0 : null,
        }),
      });

      if (!groupResponse.ok) {
        try {
          const errorData = await groupResponse.json();
          const errorMessage = errorData.error || "Failed to update modifier group";
          toast.error(errorMessage);
          return;
        } catch (jsonError) {
          toast.error("Failed to update modifier group");
          return;
        }
      }

      const updatedGroup = await groupResponse.json();

      const modifierGroupCode =
        updatedGroup.modifierGroupCode ||
        updatedGroup.modifier_group_code ||
        modifier?.modifierGroupCode ||
        null;

      // 2) Handle removed items
      if (Array.isArray(removedItemIds)) {
        for (const itemId of removedItemIds) {
          if (!itemId) continue;
          const deleteRes = await fetch(
            `/api/master/modifier-items/${itemId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (!deleteRes.ok) {
            const err = await deleteRes.json().catch(() => ({}));
            throw new Error(err.error || "Failed to delete modifier item");
          }
        }
      }

      // 3) Upsert modifier items
      if (Array.isArray(formItems)) {
        for (const item of formItems) {
          if (!item.name?.trim()) continue;

          const payload = {
            modifierGroupCode,
            name: item.name,
            labelName: item.labelName || null,
            colorCode: item.colorCode || null,
            forColorCode: item.forColorCode || null,
            price: typeof item.price === "number" ? item.price : null,
            isDefault: item.isDefault ? 1 : 0,
            displayOrder:
              typeof item.displayOrder === "number" ? item.displayOrder : null,
            isActive: typeof item.isActive === "number" ? item.isActive : 1,
          };

          if (item.id) {
            const updateRes = await fetch(
              `/api/master/modifier-items/${item.id}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
              }
            );
            if (!updateRes.ok) {
              const err = await updateRes.json().catch(() => ({}));
              throw new Error(err.error || "Failed to update modifier item");
            }
          } else {
            const createRes = await fetch("/api/master/modifier-items", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            });
            if (!createRes.ok) {
              const err = await createRes.json().catch(() => ({}));
              throw new Error(err.error || "Failed to create modifier item");
            }
          }
        }
      }

      toast.success("Modifier group updated successfully!");
      router.push("/master/modifiers/modifiers");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error updating modifier"
      );
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <MasterDashboardLayout>
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
      </MasterDashboardLayout>
    );
  }

  if (!modifier) {
    return (
      <MasterDashboardLayout>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Modifier not found.
        </div>
      </MasterDashboardLayout>
    );
  }

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
          Edit Modifiers: {modifier.groupName}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Update configuration and options for this modifiers.
        </p>

        <ModifierForm
          modifier={modifier}
          onSave={handleSave}
          onCancel={() => router.push("/master/modifiers/modifiers")}
        />
      </div>
    </MasterDashboardLayout>
  );
}
