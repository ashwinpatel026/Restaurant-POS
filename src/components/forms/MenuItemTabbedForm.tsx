"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import SystemColorPicker, {
  getPrimaryColor,
} from "@/components/ui/SystemColorPicker";
import TextColorPicker from "@/components/ui/TextColorPicker";
import ModifierSelectionModal from "@/components/modals/ModifierSelectionModal";
import MenuMasterCategorySelectionModal from "@/components/modals/MenuMasterCategorySelectionModal";
import { LoadingOverlay } from "@/components/ui/SkeletonLoader";
import { CheckIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import { useFormik } from "formik";
import { menuItemSchema } from "@/validation/menuItemSchema";
import { useFormikAutoFocus } from "@/hooks/useFormikAutoFocus";
import { capitalizeFirstLetter } from "@/lib/utils";

interface MenuItemFormProps {
  menuItem?: any;
  menuMasters?: any[];
  categories: any[];
  onSave: (data: any) => Promise<any>;
  onCancel: () => void;
}

export default function MenuItemTabbedForm({
  menuItem,
  menuMasters = [],
  categories,
  onSave,
  onCancel,
}: MenuItemFormProps) {
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();
  
  // Refs for auto-focus on validation errors
  const nameRef = useRef<HTMLInputElement>(null);
  const labelNameRef = useRef<HTMLInputElement>(null);
  const colorCodeRef = useRef<HTMLElement>(null);
  const forColorCodeRef = useRef<HTMLElement>(null);
  const menuMasterRef = useRef<HTMLElement>(null);
  const categoryRef = useRef<HTMLElement>(null);
  const retailPriceRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    kitchenName: "",
    labelName: "",
    colorCode: getPrimaryColor(),
    forColorCode: "#FFFFFF",
    calories: "",
    description: "",
    itemSize: "",
    skuPlu: "",
    barcode: "",
    itemContainAlcohol: 0,
    menuImg: "",
    priceStrategy: 1, // 1=Base Price, 3=Open Price
    basePrice: 0,
    retailPrice: 0,
    isPrice: 1,
    menuMasterCode: [] as string[],
    menuCategoryCode: "",
    deptCode: "",
    originalDeptCode: "",
    isActive: 1,
    stockinhand: "",
    taxCode: "",
    inheritTaxInclusion: true,
    isTaxIncluded: false,
    inheritDiningTax: true,
    diningTaxEffect: "No Effect",
    disqualifyDiningTaxExemption: false,
    isOutStock: 0,
    isPosVisible: 0,
    isKioskOrderPay: 0,
    isOnlineOrderByApp: 0,
    isOnlineOrdering: 0,
    isCustomerInvoice: 0,
    dimension: "",
    weight: "",
    prepTimeMinutes: 0,
  });

  const [modifiers, setModifiers] = useState<any[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([]);
  const [modifierOptions, setModifierOptions] = useState<
    Record<
      number,
      {
        isRequired: number;
        isMultiselect: number;
        minSelection: number | null;
        maxSelection: number | null;
      }
    >
  >({});

  const handleRemoveModifier = (modifierId: number) => {
    setSelectedModifiers((prev) => prev.filter((id) => id !== modifierId));
    setModifierOptions((prev) => {
      const next = { ...prev } as any;
      delete next[modifierId];
      return next;
    });
  };
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [showMenuMasterCategoryModal, setShowMenuMasterCategoryModal] =
    useState(false);
  const [selectedMenuMasters, setSelectedMenuMasters] = useState<any[]>([]);
  const [inheritModifiers, setInheritModifiers] = useState(true);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [inheritedModifiers, setInheritedModifiers] = useState<any[]>([]);
  const [prepZones, setPrepZones] = useState<any[]>([]);
  const [selectedPrepZones, setSelectedPrepZones] = useState<Set<string>>(
    new Set()
  );
  const [selectedCategoryMap, setSelectedCategoryMap] = useState<Map<string, string[]>>(
    new Map()
  );
  const [filteredCategories, setFilteredCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Time Event Configuration state
  const [timeEvents, setTimeEvents] = useState<Array<{
    event_name: string;
    final_price: number;
    eventCode?: string;
    byFixedValue?: boolean;
  }>>([]);
  const [timeEventDetails, setTimeEventDetails] = useState<Record<string, {
    eventCode: string;
    eventName: string;
    byFixedValue: boolean;
    isDelete?: boolean;
    isOverride?: boolean;
  }>>({});
  const [timeEventFormulas, setTimeEventFormulas] = useState<Record<string, number>>({});
  const [loadingTimeEvents, setLoadingTimeEvents] = useState(false);
  const [updatingEventCode, setUpdatingEventCode] = useState<string | null>(null);
  const [originalDeptCode, setOriginalDeptCode] = useState<string>('');

  useEffect(() => {
    if (selectedStoreCode) {
      fetchModifiers();
      fetchTaxes();
      fetchPrepZones();
      fetchDepartments();
    }
  }, [selectedStoreCode]);

  // Update selectedMenuMasters when menuMasterCode changes
  useEffect(() => {
    if (Array.isArray(formData.menuMasterCode) && formData.menuMasterCode.length > 0) {
      const masters = menuMasters.filter((m) =>
        formData.menuMasterCode.includes(m.menuMasterCode)
      );
      setSelectedMenuMasters(masters);
    } else {
      setSelectedMenuMasters([]);
    }
  }, [formData.menuMasterCode, menuMasters]);

  // Filter categories when menu masters change
  useEffect(() => {
    if (Array.isArray(formData.menuMasterCode) && formData.menuMasterCode.length > 0) {
      const filtered = categories.filter((cat) =>
        formData.menuMasterCode.includes(cat.menuMasterCode || "")
      );
      setFilteredCategories(filtered);
      // Clear selected categories if they don't belong to any selected menu master
      setSelectedCategoryMap((prev) => {
        const valid = new Map<string, string[]>();
        prev.forEach((categoryCodes, masterCode) => {
          if (formData.menuMasterCode.includes(masterCode)) {
            const validCategories = categoryCodes.filter((categoryCode) => {
              const category = categories.find(
                (cat) => cat.menuCategoryCode === categoryCode
              );
              return category && formData.menuMasterCode.includes(category.menuMasterCode || "");
            });
            if (validCategories.length > 0) {
              valid.set(masterCode, validCategories);
            }
          }
        });
        return valid;
      });
    } else {
      setFilteredCategories([]);
      setSelectedCategoryMap(new Map());
    }
  }, [formData.menuMasterCode, categories]);

  // Auto-update department when categories change
  useEffect(() => {
    if (selectedCategoryMap.size > 0 && Array.isArray(formData.menuMasterCode) && formData.menuMasterCode.length > 0) {
      // Get department from first selected category or menu master
      const firstMasterCode = Array.from(selectedCategoryMap.keys())[0];
      const firstCategoryCodes = selectedCategoryMap.get(firstMasterCode);
      const firstCategoryCode = firstCategoryCodes && firstCategoryCodes.length > 0 ? firstCategoryCodes[0] : null;
      const firstCategory = firstCategoryCode ? categories.find(
        (cat) => cat.menuCategoryCode === firstCategoryCode
      ) : null;
      const master = menuMasters.find(
        (m) => m.menuMasterCode === firstMasterCode
      );

      // Only auto-update if current deptCode is empty
      if (!formData.deptCode) {
        const newDeptCode = firstCategory?.deptCode || master?.deptCode || "";
        if (newDeptCode) {
          setFormData((prev) => ({ ...prev, deptCode: newDeptCode }));
        }
      }
    }
  }, [selectedCategoryMap, formData.menuMasterCode, categories, menuMasters]);

  // Handle menu master and category selection from modal
  const handleMenuMasterCategorySelect = (
    masters: any[],
    categoryMap: Map<string, string[]>
  ) => {
    if (masters.length > 0 && categoryMap.size > 0) {
      // Auto-select department from first menu master or first selected category
      const firstMaster = masters[0];
      const firstMasterCode = firstMaster.menuMasterCode;
      const firstCategoryCodes = categoryMap.get(firstMasterCode);
      const firstCategoryCode = firstCategoryCodes && firstCategoryCodes.length > 0 ? firstCategoryCodes[0] : null;
      let autoDeptCode = firstMaster.deptCode || "";
      if (!autoDeptCode && firstCategoryCode) {
        const firstCategory = categories.find(
          (cat) => cat.menuCategoryCode === firstCategoryCode
        );
        autoDeptCode = firstCategory?.deptCode || "";
      }

      const masterCodes = masters.map((m) => m.menuMasterCode);
      setFormData((prev) => ({
        ...prev,
        menuMasterCode: masterCodes as any,
        deptCode: autoDeptCode,
      }));
      formik.setFieldValue("menuMasterCode", masterCodes.join(","));
      setSelectedMenuMasters(masters);
      setSelectedCategoryMap(categoryMap);
    } else {
      setFormData((prev) => ({
        ...prev,
        menuMasterCode: [] as any,
        deptCode: "",
      }));
      formik.setFieldValue("menuMasterCode", "");
      setSelectedMenuMasters([]);
      setSelectedCategoryMap(new Map());
    }
  };

  useEffect(() => {
    if (menuItem) {
      const initialData = {
        name: menuItem.name || "",
        kitchenName: menuItem.kitchenName || "",
        labelName: menuItem.labelName || "",
        colorCode: menuItem.colorCode || getPrimaryColor(),
        forColorCode: menuItem.forColorCode || "#FFFFFF",
        calories: menuItem.calories || "",
        description: menuItem.description || menuItem.descrip || "",
        itemSize: menuItem.itemSize || "",
        skuPlu: menuItem.skuPlu?.toString() || "",
        barcode: menuItem.barcode || "",
        itemContainAlcohol:
          menuItem.itemContainAlcohol ?? menuItem.isAlcohol ?? 0,
        menuImg: menuItem.menuImg || "",
        priceStrategy: menuItem.priceStrategy || 1,
        basePrice: menuItem.basePrice != null ? Number(menuItem.basePrice) : (menuItem.price != null ? Number(menuItem.price) : 0),
        retailPrice: menuItem.basePrice != null ? Number(menuItem.basePrice) : (menuItem.price != null ? Number(menuItem.price) : 0),
        isPrice: menuItem.isPrice ?? 1,
        menuMasterCode: (() => {
          // Handle menuMasterCode - could be string, array, or JSON string
          if (Array.isArray(menuItem.menuMasterCode)) {
            return menuItem.menuMasterCode;
          }
          if (typeof menuItem.menuMasterCode === "string") {
            try {
              const parsed = JSON.parse(menuItem.menuMasterCode);
              return Array.isArray(parsed) ? parsed : [menuItem.menuMasterCode];
            } catch {
              return menuItem.menuMasterCode ? [menuItem.menuMasterCode] : [];
            }
          }
          return [];
        })(),
        menuCategoryCode: menuItem.menuCategoryCode || "",
        deptCode: menuItem.deptCode || "",
        originalDeptCode: menuItem.deptCode || "",
        isActive: menuItem.isActive ?? 1,
        stockinhand: menuItem.stockinhand?.toString() || "",
        taxCode: menuItem.taxCode || "",
        inheritTaxInclusion:
          menuItem.inheritTaxInclusion !== undefined
            ? menuItem.inheritTaxInclusion
            : true,
        isTaxIncluded:
          menuItem.isTaxIncluded !== undefined ? menuItem.isTaxIncluded : false,
        inheritDiningTax:
          menuItem.inheritDiningTax !== undefined
            ? menuItem.inheritDiningTax
            : true,
        diningTaxEffect: menuItem.diningTaxEffect || "No Effect",
        disqualifyDiningTaxExemption:
          menuItem.disqualifyDiningTaxExemption !== undefined
            ? menuItem.disqualifyDiningTaxExemption
            : false,
        isOutStock: menuItem.isOutStock ?? 0,
        isPosVisible: menuItem.isPosVisible ?? 0,
        isKioskOrderPay: menuItem.isKioskOrderPay ?? 0,
        isOnlineOrderByApp: menuItem.isOnlineOrderByApp ?? 0,
        isOnlineOrdering: menuItem.isOnlineOrdering ?? 0,
        isCustomerInvoice: menuItem.isCustomerInvoice ?? 0,
        dimension: menuItem.dimension || "",
        weight: menuItem.weight || "",
        prepTimeMinutes: menuItem.prepTimeMinutes ?? 0,
      };
      setFormData(initialData);
      // Also update Formik values
      formik.setValues(initialData);

      // Parse prepZoneCode from JSON if it exists
      let prepZoneCodes: string[] = [];
      if (menuItem.prepZoneCode) {
        try {
          if (typeof menuItem.prepZoneCode === "string") {
            // Try to parse if it's a JSON string
            prepZoneCodes = JSON.parse(menuItem.prepZoneCode);
          } else if (Array.isArray(menuItem.prepZoneCode)) {
            // Already an array
            prepZoneCodes = menuItem.prepZoneCode;
          }
        } catch (e) {
          // If parsing fails, treat as single value (backward compatibility)
          prepZoneCodes = [menuItem.prepZoneCode];
        }
      }
      setSelectedPrepZones(new Set(prepZoneCodes));

      // Handle menuCategoryCode - supports both structured format and old format
      const categoryMap = new Map<string, string[]>();
      
      if (menuItem.menuCategoryCode) {
        let structuredArray: Array<{ menuMasterCode: string; menuCategoryCode: string }> = [];
        
        try {
          let parsed: any = menuItem.menuCategoryCode;
          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
          
          if (Array.isArray(parsed) && parsed.length > 0) {
            const firstItem = parsed[0];
            // Check if it's structured format
            if (firstItem && typeof firstItem === 'object' && 'menuMasterCode' in firstItem && 'menuCategoryCode' in firstItem) {
              // Structured format - use directly
              structuredArray = parsed;
            } else {
              // Old format - convert to structured format using categories lookup
              const masterCodes = Array.isArray(formData.menuMasterCode) 
                ? formData.menuMasterCode 
                : (formData.menuMasterCode ? [formData.menuMasterCode] : []);
              
              parsed.forEach((categoryCode: string) => {
                const category = categories.find(cat => cat.menuCategoryCode === categoryCode);
                if (category) {
                  const masterCode = category.menuMasterCode;
                  if (masterCodes.includes(masterCode)) {
                    structuredArray.push({ menuMasterCode: masterCode, menuCategoryCode: categoryCode });
                  } else if (masterCodes.length > 0) {
                    // Fallback to first master if unmatched
                    structuredArray.push({ menuMasterCode: masterCodes[0], menuCategoryCode: categoryCode });
                  }
                }
              });
            }
          }
        } catch (e) {
          // If parsing fails, try to handle as single value (backward compatibility)
          const masterCodes = Array.isArray(formData.menuMasterCode) 
            ? formData.menuMasterCode 
            : (formData.menuMasterCode ? [formData.menuMasterCode] : []);
          if (masterCodes.length > 0) {
            structuredArray.push({ 
              menuMasterCode: masterCodes[0], 
              menuCategoryCode: String(menuItem.menuCategoryCode) 
            });
          }
        }
        
        // Build category map from structured array
        structuredArray.forEach(({ menuMasterCode, menuCategoryCode }) => {
          if (!categoryMap.has(menuMasterCode)) {
            categoryMap.set(menuMasterCode, []);
          }
          categoryMap.get(menuMasterCode)!.push(menuCategoryCode);
        });
      }

      setSelectedCategoryMap(categoryMap);

      // Set selected modifiers if editing (ONLY explicit rows: inherit_from_menu_group = 0)
      if (
        menuItem.assignedModifiers &&
        Array.isArray(menuItem.assignedModifiers)
      ) {
        const explicitModifiers = menuItem.assignedModifiers.filter(
          (modifier: any) => Number(modifier.inheritFromMenuGroup) === 0
        );
        const explicitIds = explicitModifiers
          .map((modifier: any) => modifier.tblModifierId || modifier.id)
          .filter(Boolean);
        setSelectedModifiers(explicitIds);

        // Set modifier options from assignedModifiers to preserve settings when cloning
        const options: Record<
          number,
          {
            isRequired: number;
            isMultiselect: number;
            minSelection: number | null;
            maxSelection: number | null;
          }
        > = {};
        explicitModifiers.forEach((modifier: any) => {
          const modifierId = modifier.tblModifierId || modifier.id;
          if (modifierId) {
            options[modifierId] = {
              isRequired: modifier.isRequired ?? 0,
              isMultiselect: modifier.isMultiselect ?? 0,
              minSelection: modifier.minSelection ?? null,
              maxSelection: modifier.maxSelection ?? null,
            };
          }
        });
        setModifierOptions(options);
      }

      // Set inherit modifiers flag from MenuItem.inheritModifiers
      if (menuItem.inheritModifiers !== undefined) {
        setInheritModifiers(menuItem.inheritModifiers);
      } else if (menuItem.inheritModifierGroup !== undefined) {
        // Fallback to inheritModifierGroup if inheritModifiers is not set
        setInheritModifiers(menuItem.inheritModifierGroup);
      }
      
      // Set original department code for tracking changes
      setOriginalDeptCode(menuItem.deptCode || "");
    }
  }, [menuItem]);

  // Fetch time events when department is selected, price is enabled, and retail price is set
  useEffect(() => {
    const fetchTimeEvents = async () => {
      // Check if all conditions are met
      if (
        formData.deptCode &&
        formData.isPrice === 1 &&
        formData.retailPrice > 0 &&
        selectedStoreCode
      ) {
        setLoadingTimeEvents(true);
        try {
          // Call PostgreSQL function to get calculated prices (location dashboard endpoint)
          const functionResponse = await fetch(
            buildApiUrl(`/api/dashboard/menu-items/time-events?deptCode=${encodeURIComponent(
              formData.deptCode
            )}&basePrice=${formData.retailPrice}`)
          );

          if (!functionResponse.ok) {
            throw new Error("Failed to fetch time events");
          }

          const functionResults = await functionResponse.json();

          // Fetch time event details to get eventCode and byFixedValue (filtered by storeCode)
          const detailsResponse = await fetch(
            buildApiUrl(`/api/dashboard/events?storeCode=${encodeURIComponent(selectedStoreCode)}`)
          );

          let eventDetailsMap: Record<string, {
            eventCode: string;
            eventName: string;
            byFixedValue: boolean;
            isDelete?: boolean;
            isOverride?: boolean;
          }> = {};

          if (detailsResponse.ok) {
            const eventDetails = await detailsResponse.json();
            // Filter events by department code (deptCode is JSON array)
            const deptEvents = eventDetails.filter((event: any) => {
              if (!event.deptCode) return false;
              try {
                const deptCodes = typeof event.deptCode === 'string' 
                  ? JSON.parse(event.deptCode) 
                  : event.deptCode;
                if (Array.isArray(deptCodes)) {
                  return deptCodes.includes(formData.deptCode) || event.overrideAllEvents;
                }
                return deptCodes === formData.deptCode || event.overrideAllEvents;
              } catch {
                return event.deptCode === formData.deptCode || event.overrideAllEvents;
              }
            });
            
            deptEvents.forEach((event: any) => {
              eventDetailsMap[event.eventName] = {
                eventCode: event.eventCode,
                eventName: event.eventName,
                byFixedValue: event.byFixedValue || false,
                isDelete: event.isDelete || false,
                isOverride: event.overrideAllEvents || false,
              };
            });
          }

          setTimeEventDetails(eventDetailsMap);

          // Merge function results with event details
          const mergedEvents = functionResults.map((result: any) => {
            const details = eventDetailsMap[result.event_name];
            return {
              event_name: result.event_name,
              final_price: result.final_price,
              eventCode: details?.eventCode,
              byFixedValue: details?.byFixedValue || false,
            };
          });

          setTimeEvents(mergedEvents);

          // Initialize formula values with calculated prices
          const initialFormulas: Record<string, number> = {};
          mergedEvents.forEach((event: any) => {
            if (event.eventCode) {
              initialFormulas[event.eventCode] = event.final_price;
            }
          });
          setTimeEventFormulas(initialFormulas);

          // If editing, fetch existing formula values and override calculated values
          if (menuItem?.menuItemId || menuItem?.tblMenuItemId) {
            try {
              const itemId = menuItem.menuItemId || menuItem.tblMenuItemId;
              const existingFormulasResponse = await fetch(
                buildApiUrl(`/api/dashboard/menu-items/${itemId}/time-events?storeCode=${encodeURIComponent(selectedStoreCode)}`)
              );

              if (existingFormulasResponse.ok) {
                const existingFormulas = await existingFormulasResponse.json();
                // Override with saved values if they exist and update event details
                Object.keys(existingFormulas).forEach((eventCode) => {
                  if (initialFormulas[eventCode] !== undefined) {
                    initialFormulas[eventCode] = existingFormulas[eventCode].formulaValue;
                  }
                  // Update event details with isDelete and isOverride if they exist
                  if (eventDetailsMap[eventCode]) {
                    const existing = eventDetailsMap[eventCode];
                    eventDetailsMap[eventCode] = {
                      ...existing,
                      isDelete: existingFormulas[eventCode]?.isDelete || false,
                      isOverride: existingFormulas[eventCode]?.isOverride || false,
                    };
                  }
                });
                setTimeEventFormulas(initialFormulas);
                setTimeEventDetails(eventDetailsMap);
              }
            } catch (e) {
              console.error("Error fetching existing formula values:", e);
              // Continue with calculated values
            }
          }
        } catch (error) {
          console.error("Error fetching time events:", error);
          toast.error("Failed to load time events");
          setTimeEvents([]);
          setTimeEventFormulas({});
          setTimeEventDetails({});
        } finally {
          setLoadingTimeEvents(false);
        }
      } else {
        // Only clear state if it's not already empty to prevent unnecessary re-renders
        setTimeEvents((prev) => prev.length > 0 ? [] : prev);
        setTimeEventFormulas((prev) => Object.keys(prev).length > 0 ? {} : prev);
        setTimeEventDetails((prev) => Object.keys(prev).length > 0 ? {} : prev);
      }
    };
    fetchTimeEvents();
  }, [formData.deptCode, formData.isPrice, formData.retailPrice, menuItem?.menuItemId, menuItem?.tblMenuItemId, selectedStoreCode, buildApiUrl]);

  // Create a stable dependency for selected categories
  const selectedCategoriesKey = useMemo(() => {
    return Array.from(selectedCategoryMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([master, categories]) => `${master}:${categories.sort().join(",")}`)
      .join("|");
  }, [selectedCategoryMap]);

  // Load inherited modifiers list when inheritance is enabled
  useEffect(() => {
    const load = async () => {
      try {
        if (
          !inheritModifiers ||
          selectedCategoryMap.size === 0 ||
          !selectedStoreCode
        ) {
          setInheritedModifiers([]);
          return;
        }
        // Load modifiers for all selected categories and combine them
        const categoryCodes = Array.from(selectedCategoryMap.values()).flat();
        const allModifiers: any[] = [];
        const seenCodes = new Set<string>();

        // Fetch modifiers for each category
        for (const categoryCode of categoryCodes) {
          try {
            const res = await fetch(
              buildApiUrl(
                `/api/dashboard/modifier-groups?menuCategoryCode=${encodeURIComponent(
                  categoryCode
                )}`
              )
            );
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) {
                // Add modifiers that haven't been seen yet (avoid duplicates)
                for (const modifier of data) {
                  // Use modifierGroupCode as primary identifier, fallback to id
                  const code =
                    modifier.modifierGroupCode || String(modifier.id);
                  if (code && !seenCodes.has(String(code))) {
                    seenCodes.add(String(code));
                    allModifiers.push(modifier);
                  }
                }
              }
            }
          } catch (e) {
            console.error(
              `Error loading modifiers for category ${categoryCode}:`,
              e
            );
          }
        }
        setInheritedModifiers(allModifiers);
      } catch (e) {
        console.error("Error loading inherited modifiers", e);
        setInheritedModifiers([]);
      }
    };
    load();
  }, [inheritModifiers, selectedCategoriesKey, selectedStoreCode]);

  const fetchModifiers = async () => {
    try {
      const response = await fetch(
        buildApiUrl("/api/dashboard/modifier-groups")
      );
      if (response.ok) {
        const modifiersData = await response.json();
        setModifiers(modifiersData);
      }
    } catch (error) {
      console.error("Error fetching modifiers:", error);
    }
  };

  const fetchTaxes = async () => {
    try {
      const res = await fetch(buildApiUrl("/api/dashboard/tax"));
      if (res.ok) {
        const data = await res.json();
        setTaxes(data);
      }
    } catch (e) {
      console.error("Error fetching taxes", e);
    }
  };

  const fetchPrepZones = async () => {
    try {
      const res = await fetch(buildApiUrl("/api/dashboard/menu/prep-zone"));
      if (res.ok) {
        const data = await res.json();
        setPrepZones(data);
      }
    } catch (e) {
      console.error("Error fetching prep zones", e);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(buildApiUrl("/api/dashboard/department"));
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.filter((d: any) => d.isActive === 1));
      }
    } catch (e) {
      console.error("Error fetching departments", e);
    }
  };

  // Formik instance for validation
  const formik = useFormik({
    initialValues: {
      name: formData.name,
      labelName: formData.labelName,
      kitchenName: formData.kitchenName,
      colorCode: formData.colorCode,
      forColorCode: formData.forColorCode,
      menuMasterCode: Array.isArray(formData.menuMasterCode) 
        ? (formData.menuMasterCode.length > 0 ? formData.menuMasterCode.join(",") : "")
        : (formData.menuMasterCode || ""),
      menuCategoryCode: (() => {
        const firstMasterCategories = Array.from(selectedCategoryMap.values())[0];
        return firstMasterCategories && firstMasterCategories.length > 0 ? firstMasterCategories[0] : "";
      })(),
      calories: formData.calories,
      description: formData.description,
      itemSize: formData.itemSize,
      skuPlu: formData.skuPlu,
      barcode: formData.barcode,
      itemContainAlcohol: formData.itemContainAlcohol,
      menuImg: formData.menuImg,
      priceStrategy: formData.priceStrategy,
      basePrice: formData.basePrice,
      retailPrice: formData.retailPrice,
      isPrice: formData.isPrice,
      deptCode: formData.deptCode,
      isActive: formData.isActive,
      stockinhand: formData.stockinhand,
      taxCode: formData.taxCode,
      inheritTaxInclusion: formData.inheritTaxInclusion,
      isTaxIncluded: formData.isTaxIncluded,
      inheritDiningTax: formData.inheritDiningTax,
      diningTaxEffect: formData.diningTaxEffect,
      disqualifyDiningTaxExemption: formData.disqualifyDiningTaxExemption,
      isOutStock: formData.isOutStock,
      isPosVisible: formData.isPosVisible,
      isKioskOrderPay: formData.isKioskOrderPay,
      isOnlineOrderByApp: formData.isOnlineOrderByApp,
      isOnlineOrdering: formData.isOnlineOrdering,
      isCustomerInvoice: formData.isCustomerInvoice,
      dimension: formData.dimension,
      weight: formData.weight,
      prepTimeMinutes: formData.prepTimeMinutes,
    },
    validationSchema: menuItemSchema,
    enableReinitialize: true,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values, { setTouched, setFieldError }) => {
      // Update Formik values from current formData before validation
      formik.setFieldValue("name", formData.name, false);
      formik.setFieldValue("labelName", formData.labelName, false);
      formik.setFieldValue("kitchenName", formData.kitchenName, false);
      formik.setFieldValue("colorCode", formData.colorCode, false);
      formik.setFieldValue("forColorCode", formData.forColorCode, false);
      formik.setFieldValue("menuMasterCode", formData.menuMasterCode, false);
      // Validate that each master has at least one category
      const missingCategories = Array.isArray(formData.menuMasterCode) ? formData.menuMasterCode.filter(
        (masterCode) => {
          const categories = selectedCategoryMap.get(masterCode);
          return !categories || categories.length === 0;
        }
      ) : [];
      
      if (missingCategories.length > 0 || selectedCategoryMap.size === 0) {
        setTouched({
          menuMasterCode: true,
          menuCategoryCode: true,
        });
        setFieldError("menuCategoryCode", "Please select at least one category for each menu master");
        toast.error("Please select at least one category for each menu master");
        return;
      }

      // Set menuCategoryCode as array for validation (to match what will be submitted)
      const allCategoryCodes = Array.from(selectedCategoryMap.values()).flat();
      formik.setFieldValue("menuCategoryCode", allCategoryCodes.length > 0 ? allCategoryCodes[0] : "", false);
      
      // Mark all fields as touched to show errors
      setTouched({
        name: true,
        labelName: true,
        colorCode: true,
        forColorCode: true,
        menuMasterCode: true,
        menuCategoryCode: true,
        priceStrategy: true,
        retailPrice: true,
        isPrice: true,
      });
      
      // Validate and check for errors
      await formik.validateForm();
      
      // If there are errors, don't submit
      if (Object.keys(formik.errors).length > 0) {
        toast.error("Please fix the validation errors");
        
        // Ensure retailPrice is marked as touched if it has an error
        if (formik.errors.retailPrice) {
          formik.setFieldTouched("retailPrice", true);
          // Scroll to and focus the retailPrice field
          setTimeout(() => {
            if (retailPriceRef.current) {
              retailPriceRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              setTimeout(() => {
                retailPriceRef.current?.focus();
              }, 300);
            }
          }, 100);
        }
        return;
      }
      
      // No errors, proceed with submission
      onSubmitForm();
    },
  });

  // Sync Formik values with formData when formData changes (for non-validated fields)
  useEffect(() => {
    // Only sync the fields that are used for validation
    formik.setFieldValue("name", formData.name);
    formik.setFieldValue("labelName", formData.labelName);
    formik.setFieldValue("kitchenName", formData.kitchenName);
    formik.setFieldValue("colorCode", formData.colorCode);
    formik.setFieldValue("forColorCode", formData.forColorCode);
    formik.setFieldValue("menuMasterCode", formData.menuMasterCode);
    formik.setFieldValue("priceStrategy", formData.priceStrategy);
    formik.setFieldValue("retailPrice", formData.retailPrice);
    formik.setFieldValue("isPrice", formData.isPrice);
  }, [formData.name, formData.labelName, formData.kitchenName, formData.colorCode, formData.forColorCode, formData.menuMasterCode, formData.priceStrategy, formData.retailPrice, formData.isPrice]);

  // Auto-focus on first error field
  useFormikAutoFocus(formik, {
    name: nameRef,
    labelName: labelNameRef,
    colorCode: colorCodeRef,
    forColorCode: forColorCodeRef,
    menuMasterCode: menuMasterRef,
    menuCategoryCode: categoryRef,
    retailPrice: retailPriceRef,
  });

  // Extract submission logic to separate function
  const onSubmitForm = async () => {
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        skuPlu: formData.skuPlu ? formData.skuPlu : null,
        barcode: formData.barcode || null,
        priceStrategy: formData.priceStrategy
          ? parseInt(formData.priceStrategy.toString())
          : null,
        // Retail price saved to basePrice
        basePrice:
          formData.priceStrategy === 1
            ? formData.retailPrice
              ? parseFloat(formData.retailPrice.toString())
              : null
            : formData.priceStrategy === 3
            ? 0
            : null,
        // Keep cardPrice and cashPrice for backward compatibility (set to null)
        cardPrice: null,
        cashPrice: null,
        menuMasterCode: formData.menuMasterCode || null,
        menuCategoryCode:
          selectedCategoryMap.size > 0
            ? Array.from(selectedCategoryMap.entries()).flatMap(([menuMasterCode, categoryCodes]) =>
                categoryCodes.map(menuCategoryCode => ({
                  menuMasterCode,
                  menuCategoryCode,
                }))
              )
            : null,
        itemContainAlcohol: formData.itemContainAlcohol === 1 ? 1 : 0,
        isPrice: formData.isPrice === 1 ? 1 : 0,
        isActive: formData.isActive === 1 ? 1 : 0,
        stockinhand: formData.stockinhand
          ? parseFloat(formData.stockinhand.toString())
          : null,
        // New fields for modifier assignment
        selectedModifiers,
        modifierAssignments: selectedModifiers.map((id) => ({
          modifierId: id,
          ...(modifierOptions[id] || {
            isRequired: 0,
            isMultiselect: 0,
            minSelection: null,
            maxSelection: null,
          }),
        })),
        inheritModifiers,
        // Prep time fields
        prepZoneCodes:
          Array.from(selectedPrepZones).length > 0
            ? Array.from(selectedPrepZones)
            : null,
        dimension: formData.dimension || null,
        weight: formData.weight || null,
        prepTimeMinutes: formData.prepTimeMinutes
          ? parseInt(formData.prepTimeMinutes.toString())
          : null,
      };

      // Save menu item first
      const savedMenuItem = await onSave(submitData);

      // Get menuItemId - use savedMenuItem.menuItemId or fall back to existing menuItem
      const menuItemId = savedMenuItem?.menuItemId || menuItem?.menuItemId || menuItem?.tblMenuItemId;
      const menuItemCode = savedMenuItem?.menuItemCode || menuItem?.menuItemCode;

      // Check if department changed (for edit mode)
      const departmentChanged = menuItem && formData.deptCode && formData.originalDeptCode &&
        formData.deptCode !== formData.originalDeptCode;

      // If department changed, mark old time events as deleted first (even if no new events)
      if (departmentChanged && menuItemId && menuItemCode && formData.originalDeptCode && selectedStoreCode) {
        try {
          const markDeletedResponse = await fetch(
            buildApiUrl(`/api/dashboard/menu-items/${menuItemId}/time-events/mark-deleted?storeCode=${encodeURIComponent(selectedStoreCode)}`),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                menuItemCode: menuItemCode,
                oldDeptCode: formData.originalDeptCode,
              }),
            }
          );

          if (markDeletedResponse.ok) {
            const markResult = await markDeletedResponse.json();
            console.log("Marked old time events as deleted:", markResult.markedDeleted);
          } else {
            console.warn("Failed to mark old time events as deleted");
          }
        } catch (markDeletedError) {
          console.error("Error marking old time events as deleted:", markDeletedError);
        }
      }

      // If menu item was saved successfully and we have time events, save them
      if (menuItemId && menuItemCode && timeEvents.length > 0 && formData.deptCode && formData.isPrice === 1 && formData.retailPrice > 0 && selectedStoreCode) {
        try {
          // Prepare time events data for bulk save
          const timeEventsData = timeEvents.map((event) => {
            const eventCode = event.eventCode || "";
            const eventDetail = Object.values(timeEventDetails).find(d => d.eventCode === eventCode) as {
              eventCode: string;
              eventName: string;
              byFixedValue: boolean;
              isDelete?: boolean;
              isOverride?: boolean;
            } | undefined;

            // Use updated formula value if user changed it, otherwise use calculated value
            const formulaValue = timeEventFormulas[eventCode] !== undefined
              ? timeEventFormulas[eventCode]
              : event.final_price;

            return {
              timeEventCode: eventCode,
              formulaValue: formulaValue,
              isFixedValue: eventDetail?.byFixedValue || event.byFixedValue || false,
              isDelete: false, // New events are not deleted
              isOverride: eventDetail?.isOverride || false,
            };
          });

          // Call bulk save endpoint
          const bulkSaveResponse = await fetch(
            buildApiUrl(`/api/dashboard/menu-items/${menuItemId}/time-events/bulk?storeCode=${encodeURIComponent(selectedStoreCode)}`),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                menuItemCode: menuItemCode,
                timeEvents: timeEventsData,
              }),
            }
          );

          if (bulkSaveResponse.ok) {
            const bulkResult = await bulkSaveResponse.json();
            console.log("Time events saved:", bulkResult);
            if (bulkResult.errors && bulkResult.errors.length > 0) {
              console.warn("Some time events failed to save:", bulkResult.errors);
              toast.error(`Menu item saved, but ${bulkResult.errors.length} time event(s) failed to save`);
            } else {
              if (menuItem) {
                toast.success(`Menu item and ${bulkResult.created || timeEvents.length} time event(s) updated successfully!`);
              } else {
                toast.success(`Menu item and ${bulkResult.created || timeEvents.length} time event(s) created successfully!`);
              }
            }
            // Navigate after a short delay to allow toast to show
            setTimeout(() => {
              onCancel();
            }, 1000);
          } else {
            const errorData = await bulkSaveResponse.json();
            console.error("Failed to save time events:", errorData);
            toast.error(errorData.error || "Menu item saved but failed to save time events");
            // Still navigate even if time events failed
            setTimeout(() => {
              onCancel();
            }, 1500);
          }
        } catch (timeEventError) {
          console.error("Error saving time events:", timeEventError);
          toast.error("Menu item saved but failed to save time events");
          // Still navigate even if time events failed
          setTimeout(() => {
            onCancel();
          }, 1500);
        }
      } else if (savedMenuItem) {
        // Only show success toast if no time events were processed or if it's a new item without time events
        if (!timeEvents.length || !formData.deptCode || formData.isPrice !== 1 || formData.retailPrice <= 0) {
          if (menuItem) {
            toast.success("Menu item updated successfully!");
          } else {
            toast.success("Menu item created successfully!");
          }
          // Navigate after a short delay
          setTimeout(() => {
            onCancel();
          }, 1000);
        }
      }
    } catch (error) {
      // Error is already handled in onSave, just prevent it from propagating
      // No need to log here as it's already handled upstream
    } finally {
      setLoading(false);
    }
  };

  const handleModifierToggle = (modifierId: number) => {
    setSelectedModifiers((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId]
    );
    setModifierOptions((prev) => {
      const next = { ...prev } as any;
      if (!(modifierId in next)) {
        next[modifierId] = {
          isRequired: 0,
          isMultiselect: 0,
          minSelection: null,
          maxSelection: null,
        };
      }
      return next;
    });
  };

  const handleModifierModalConfirm = async (selectedIds: number[]) => {
    setSelectedModifiers(selectedIds);
    setModifierOptions((prev) => {
      const next = { ...prev } as any;
      for (const id of selectedIds) {
        if (!(id in next))
          next[id] = {
            isRequired: 0,
            isMultiselect: 0,
            minSelection: null,
            maxSelection: null,
          };
      }
      return next;
    });
    // Refresh modifiers list to ensure selected modifiers are available for display
    await fetchModifiers();
  };

  return (
    <LoadingOverlay isLoading={loading}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <form onSubmit={formik.handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Basic Information
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Essential details about the menu item
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    maxLength={30}
                    name="name"
                    value={formData.name}
                    onChange={(e) => {
                      const capitalizedValue = capitalizeFirstLetter(e.target.value);
                      setFormData({ ...formData, name: capitalizedValue });
                      formik.setFieldValue("name", capitalizedValue);
                    }}
                    onBlur={(e) => {
                      formik.handleBlur(e);
                      // Only copy if labelName is blank/empty
                      if (!formData.labelName || formData.labelName.trim() === "") {
                        setFormData({ ...formData, labelName: e.target.value });
                        formik.setFieldValue("labelName", e.target.value);
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:outline-none transition-all ${
                      formik.errors.name && formik.touched.name
                        ? "border-red-500 dark:border-red-500 animate-shake focus:border-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:border-blue-500"
                    }`}
                    placeholder="Enter item name"
                  />
                  {formik.errors.name && formik.touched.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {formik.errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kitchen Name
                  </label>
                  <input
                    type="text"
                    value={formData.kitchenName}
                    onChange={(e) =>
                      setFormData({ ...formData, kitchenName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter kitchen name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Label Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={labelNameRef}
                    type="text"
                    maxLength={30}
                    name="labelName"
                    value={formData.labelName}
                    onChange={(e) => {
                      setFormData({ ...formData, labelName: e.target.value });
                      formik.setFieldValue("labelName", e.target.value);
                    }}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:outline-none transition-all ${
                      formik.errors.labelName && formik.touched.labelName
                        ? "border-red-500 dark:border-red-500 animate-shake focus:border-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:border-blue-500"
                    }`}
                    placeholder="Enter display label"
                  />
                  {formik.errors.labelName && formik.touched.labelName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {formik.errors.labelName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Item Size
                  </label>
                  <input
                    type="text"
                    value={formData.itemSize}
                    onChange={(e) =>
                      setFormData({ ...formData, itemSize: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter item size"
                  />
                </div>
              </div>

              <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Menu Master & Categories <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowMenuMasterCategoryModal(true)}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                      >
                        {selectedMenuMasters.length > 0 && Array.from(selectedCategoryMap.values()).reduce((sum, cats) => sum + cats.length, 0) > 0
                          ? `${selectedMenuMasters.length} menu master${selectedMenuMasters.length === 1 ? "" : "s"} - ${Array.from(selectedCategoryMap.values()).reduce((sum, cats) => sum + cats.length, 0)} categor${Array.from(selectedCategoryMap.values()).reduce((sum, cats) => sum + cats.length, 0) === 1 ? "y" : "ies"} selected`
                          : selectedMenuMasters.length > 0
                          ? `${selectedMenuMasters.length} menu master${selectedMenuMasters.length === 1 ? "" : "s"} - No categories selected`
                          : "Click to select Menu Masters & Categories"}
                      </button>

                    {/* Display Selected Menu Masters and Categories */}
                    {selectedMenuMasters.length > 0 && (
                      <div className="space-y-3">
                        {selectedMenuMasters.map((master) => {
                          const categoryCodes = selectedCategoryMap.get(master.menuMasterCode) || [];
                          const selectedCategories = categoryCodes
                            .map((code) =>
                              categories.find(
                                (c) =>
                                  c.menuCategoryCode === code ||
                                  c.menuCategoryId?.toString() === code
                              )
                            )
                            .filter(Boolean);

                          return (
                            <div
                              key={master.menuMasterCode}
                              className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Menu Master:
                                  </div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {master.name || master.labelName || master.menuMasterCode}
                                  </div>
                                  {master.labelName &&
                                    master.labelName !== master.name && (
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {master.labelName}
                                      </div>
                                    )}
                                  <div className="text-xs text-gray-400 dark:text-gray-500">
                                    Code: {master.menuMasterCode}
                                  </div>
                                  {selectedCategories.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        Selected Categories ({selectedCategories.length}):
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedCategories.map((category) => (
                                          <div
                                            key={category.menuCategoryCode || category.menuCategoryId}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded text-sm font-medium"
                                          >
                                            {category.name}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updatedMap = new Map(selectedCategoryMap);
                                                const currentCategories = updatedMap.get(master.menuMasterCode) || [];
                                                const updatedCategories = currentCategories.filter(
                                                  (code) => code !== (category.menuCategoryCode || category.menuCategoryId?.toString())
                                                );
                                                if (updatedCategories.length > 0) {
                                                  updatedMap.set(master.menuMasterCode, updatedCategories);
                                                } else {
                                                  updatedMap.delete(master.menuMasterCode);
                                                }
                                                setSelectedCategoryMap(updatedMap);
                                              }}
                                              className="ml-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                                            >
                                              <XMarkIcon className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {selectedCategories.length === 0 && (
                                    <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-700">
                                      <div className="text-xs text-red-600 dark:text-red-400">
                                        ⚠ At least one category required for this menu master
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedMasters = selectedMenuMasters.filter(
                                      (m) => m.menuMasterCode !== master.menuMasterCode
                                    );
                                    const updatedMap = new Map(selectedCategoryMap);
                                    updatedMap.delete(master.menuMasterCode);
                                    handleMenuMasterCategorySelect(updatedMasters, updatedMap);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                  <XMarkIcon className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {(formik.errors.menuMasterCode && formik.touched.menuMasterCode) || 
                   (formik.errors.menuCategoryCode && formik.touched.menuCategoryCode) || 
                   (Array.from(selectedMenuMasters).some(m => {
                     const categories = selectedCategoryMap.get(m.menuMasterCode);
                     return !categories || categories.length === 0;
                   }) && formik.touched.menuCategoryCode) ? (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {formik.errors.menuMasterCode || formik.errors.menuCategoryCode || "Please select at least one category"}
                    </p>
                  ) : null}
                </div>

                {/* Department Selection - Always visible, enabled after menu master and category selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.deptCode}
                    onChange={(e) =>
                      setFormData({ ...formData, deptCode: e.target.value })
                    }
                    disabled={!Array.isArray(formData.menuMasterCode) || formData.menuMasterCode.length === 0 || 
                      Array.from(selectedMenuMasters).some(m => {
                        const categories = selectedCategoryMap.get(m.menuMasterCode);
                        return !categories || categories.length === 0;
                      })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.deptId} value={dept.deptCode}>
                        {dept.deptName}
                      </option>
                    ))}
                  </select>
                  {(!Array.isArray(formData.menuMasterCode) || formData.menuMasterCode.length === 0 || 
                    Array.from(selectedMenuMasters).some(m => {
                      const categories = selectedCategoryMap.get(m.menuMasterCode);
                      return !categories || categories.length === 0;
                    })) && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Please select menu masters and at least one category for each master
                    </p>
                  )}
                </div>

                {/* Color Code Section - All three wrapped */}
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <SystemColorPicker
                        label="Color Code (Background)"
                        value={formData.colorCode}
                        onChange={(color: string) => {
                          setFormData({ ...formData, colorCode: color });
                          formik.setFieldValue("colorCode", color);
                        }}
                      />
                      {formik.errors.colorCode && formik.touched.colorCode && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {formik.errors.colorCode}
                        </p>
                      )}
                    </div>
                    <div>
                      <TextColorPicker
                        label="Text Color"
                        value={formData.forColorCode}
                        onChange={(color: string) => {
                          setFormData({ ...formData, forColorCode: color });
                          formik.setFieldValue("forColorCode", color);
                        }}
                      />
                      {formik.errors.forColorCode && formik.touched.forColorCode && (
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
                        backgroundColor: formData.colorCode || "#3B82F6",
                        color: formData.forColorCode || "#FFFFFF",
                      }}
                    >
                      Sample Button
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: "isActive", label: "Active" },
                  { key: "itemContainAlcohol", label: "Contains Alcohol" },
                  { key: "isOutStock", label: "Out of Stock" },
                  { key: "isPosVisible", label: "POS Visible" },
                  { key: "isKioskOrderPay", label: "Kiosk Order Pay" },
                  { key: "isOnlineOrderByApp", label: "Online Order by App" },
                  { key: "isOnlineOrdering", label: "Online Ordering" },
                  { key: "isCustomerInvoice", label: "Customer Invoice" },
                ].map((t) => (
                  <div
                    key={t.key}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t.label}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          [t.key]: (prev as any)[t.key] === 1 ? 0 : 1,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        (formData as any)[t.key] === 1
                          ? "bg-blue-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                      aria-pressed={(formData as any)[t.key] === 1}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          (formData as any)[t.key] === 1
                            ? "translate-x-5"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prep Zone & Prep Time Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Prep-Zone & Prep Time
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select a prep-zone and configure prep-time details for this menu
                item
              </p>
            </div>

            <div className="space-y-6">
              {/* Prep Zone Selection */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Prep Zones
                  </label>
                  {prepZones.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPrepZones.size === prepZones.length) {
                          setSelectedPrepZones(new Set());
                        } else {
                          const allCodes = new Set(
                            prepZones.map((z) => z.prepZoneCode).filter(Boolean)
                          );
                          setSelectedPrepZones(allCodes);
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-3 py-1 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      {selectedPrepZones.size === prepZones.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Select one or more prep zones for this menu item
                </p>
                {prepZones.length === 0 ? (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No prep zones available
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                    <div className="max-h-64 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:dark:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 [&::-webkit-scrollbar-thumb]:dark:hover:bg-gray-500">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {prepZones.map((prepZone) => {
                          const prepZoneValue = prepZone.prepZoneCode || "";
                          const isSelected =
                            selectedPrepZones.has(prepZoneValue);
                          return (
                            <button
                              key={prepZone.prepZoneCode || prepZone.prepZoneId}
                              type="button"
                              onClick={() => {
                                const updated = new Set(selectedPrepZones);
                                if (updated.has(prepZoneValue)) {
                                  updated.delete(prepZoneValue);
                                } else {
                                  updated.add(prepZoneValue);
                                }
                                setSelectedPrepZones(updated);
                              }}
                              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
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
                                    title={
                                      prepZone.prepZoneName || prepZoneValue
                                    }
                                  >
                                    {prepZone.prepZoneName || prepZoneValue}
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
                )}
              </div>

              {/* Prep Time Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prep Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.prepTimeMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        prepTimeMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dimension
                  </label>
                  <input
                    type="text"
                    value={formData.dimension}
                    onChange={(e) =>
                      setFormData({ ...formData, dimension: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter dimension"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Weight
                  </label>
                  <input
                    type="text"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter weight"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Pricing
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Set pricing strategy and prices
                </p>
              </div>

              {/* Price Enabled Toggle at the top */}
              <div className="mb-6 flex items-center space-x-8">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Pricing
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newIsPrice = formData.isPrice === 1 ? 0 : 1;
                      setFormData({
                        ...formData,
                        isPrice: newIsPrice,
                      });
                      // Update Formik and trigger validation
                      formik.setFieldValue("isPrice", newIsPrice);
                      if (newIsPrice === 1 && formData.priceStrategy === 1) {
                        // Validate retailPrice when enabling pricing with Base Price
                        formik.setFieldTouched("retailPrice", true);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      formData.isPrice === 1
                        ? "bg-blue-600"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                    role="switch"
                    aria-checked={formData.isPrice === 1}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.isPrice === 1 ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Disable if pricing is managed by combos or modifiers
                </p>
              </div>

              {formData.isPrice === 1 && (
                <div className="space-y-6">
                  {/* Price Strategy Selection - Buttons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Price Strategy *
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            priceStrategy: 1,
                          });
                          // Update Formik and trigger validation
                          formik.setFieldValue("priceStrategy", 1);
                          if (formData.isPrice === 1) {
                            // Validate retailPrice when Base Price is selected with pricing enabled
                            formik.setFieldTouched("retailPrice", true);
                          }
                        }}
                        className={`relative px-6 py-3 rounded-lg border-2 transition-all font-medium ${
                          formData.priceStrategy === 1
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                      >
                        Base Price
                        {formData.priceStrategy === 1 && (
                          <CheckIcon className="w-5 h-5 inline-block ml-2" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            priceStrategy: 3,
                            retailPrice: 0,
                          });
                          // Update Formik - retailPrice not required for Open Price
                          formik.setFieldValue("priceStrategy", 3);
                          formik.setFieldValue("retailPrice", 0);
                          formik.setFieldTouched("retailPrice", false);
                        }}
                        className={`relative px-6 py-3 rounded-lg border-2 transition-all font-medium ${
                          formData.priceStrategy === 3
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                      >
                        Open Price
                        {formData.priceStrategy === 3 && (
                          <CheckIcon className="w-5 h-5 inline-block ml-2" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Conditional Price Inputs */}
                  {formData.priceStrategy === 1 ? (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg
                          className="w-4 h-4 text-gray-500 dark:text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Set retail prices
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Retail Price {formData.isPrice === 1 && formData.priceStrategy === 1 && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          ref={retailPriceRef}
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.retailPrice || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            // If input is empty, set to null for better validation, otherwise parse as float
                            const value = inputValue === "" ? null : (parseFloat(inputValue) || 0);
                            setFormData({
                              ...formData,
                              retailPrice: value ?? 0, // Keep 0 for display purposes
                            });
                            // Update Formik with actual value (null if empty) for validation
                            formik.setFieldValue("retailPrice", value);
                          }}
                          onBlur={() => {
                            // Trigger validation on blur
                            formik.setFieldTouched("retailPrice", true);
                          }}
                          className={`w-1/3 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            formik.touched.retailPrice && formik.errors.retailPrice
                              ? "border-red-500 dark:border-red-500"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                          placeholder="0.00"
                        />
                        {formik.touched.retailPrice && formik.errors.retailPrice && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {formik.errors.retailPrice}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <svg
                            className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            Open Price Strategy
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            This item uses open pricing. Prices will be set at the
                            point of sale.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Time Event Configuration Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Time Event Configuration
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Menu Item Time Events
                </p>
              </div>

              {!formData.deptCode || formData.isPrice !== 1 || formData.retailPrice <= 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {!formData.deptCode && formData.isPrice !== 1 && formData.retailPrice <= 0
                      ? "Please select Department and enable Pricing with base price to view time events"
                      : !formData.deptCode
                        ? "Please select Department to view time events"
                        : formData.isPrice !== 1
                          ? "Please enable Pricing to view time events"
                          : "Please enter base price to view time events"}
                  </p>
                </div>
              ) : loadingTimeEvents ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Loading time events...
                  </p>
                </div>
              ) : timeEvents.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No time events found for this department
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-hidden border border-gray-200 dark:border-gray-600 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Event Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Formula Value
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {timeEvents.map((event, index) => {
                          const eventCode = event.eventCode || "";
                          const eventDetail = Object.values(timeEventDetails).find(d => d.eventCode === eventCode);
                          const byFixedValue = eventDetail?.byFixedValue ?? event.byFixedValue ?? false;
                          const currentFormulaValue = timeEventFormulas[eventCode] ?? event.final_price;
                          const originalFormulaValue = event.final_price;
                          const hasChanged = currentFormulaValue !== originalFormulaValue;
                          const isUpdating = updatingEventCode === eventCode;

                          return (
                            <tr key={index}>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {event.event_name}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={currentFormulaValue}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    setTimeEventFormulas((prev) => ({
                                      ...prev,
                                      [eventCode]: newValue,
                                    }));
                                  }}
                                  disabled={!byFixedValue || isUpdating}
                                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!byFixedValue
                                    ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600"
                                    : "border-gray-300 dark:border-gray-600"
                                    }`}
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!eventCode || !byFixedValue || !hasChanged) return;

                                    const itemId = menuItem?.menuItemId || menuItem?.tblMenuItemId;
                                    if (!itemId) {
                                      toast.error("Please save the menu item first before updating formula values");
                                      return;
                                    }

                                    setUpdatingEventCode(eventCode);
                                    try {
                                      const response = await fetch(
                                        buildApiUrl(`/api/dashboard/menu-items/${itemId}/time-events/${encodeURIComponent(eventCode)}?storeCode=${encodeURIComponent(selectedStoreCode || '')}`),
                                        {
                                          method: "PUT",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            formulaValue: currentFormulaValue,
                                          }),
                                        }
                                      );

                                      if (response.ok) {
                                        toast.success("Formula value updated successfully");
                                        // Update the original value to reflect the change
                                        setTimeEvents((prev) =>
                                          prev.map((e) =>
                                            e.eventCode === eventCode
                                              ? { ...e, final_price: currentFormulaValue }
                                              : e
                                          )
                                        );
                                      } else {
                                        const errorData = await response.json();
                                        toast.error(
                                          errorData.error || "Failed to update formula value"
                                        );
                                      }
                                    } catch (error) {
                                      console.error("Error updating formula value:", error);
                                      toast.error("Failed to update formula value");
                                    } finally {
                                      setUpdatingEventCode(null);
                                    }
                                  }}
                                  disabled={!byFixedValue || !hasChanged || isUpdating}
                                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${byFixedValue && hasChanged && !isUpdating
                                    ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                    : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                    }`}
                                >
                                  {isUpdating ? "Updating..." : "Update"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Note: Formula value can only be edited when 'Fixed Value' is enabled. Use the Update button to save changes.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tax Configuration Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Tax Configuration
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure tax settings for this menu item
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Tax
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, taxCode: "" })}
                      className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.taxCode === ""
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                    >
                      None
                      {formData.taxCode === "" && (
                        <CheckIcon className="w-4 h-4 inline-block ml-2" />
                      )}
                    </button>
                    {taxes.map((t) => (
                      <button
                        key={t.taxCode}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, taxCode: t.taxCode })
                        }
                        className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                          formData.taxCode === t.taxCode
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                      >
                        {t.taxname}
                        {formData.taxCode === t.taxCode && (
                          <CheckIcon className="w-4 h-4 inline-block ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: "inheritTaxInclusion",
                    label: "Inherit tax inclusion from category",
                  },
                  { key: "isTaxIncluded", label: "Tax is included in price" },
                  {
                    key: "inheritDiningTax",
                    label: "Inherit dining tax from category",
                  },
                  {
                    key: "disqualifyDiningTaxExemption",
                    label: "Disqualify dining tax exemption",
                  },
                ].map((t) => (
                  <div
                    key={t.key}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t.label}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          [t.key]: !(prev as any)[t.key],
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        (formData as any)[t.key]
                          ? "bg-blue-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                      aria-pressed={(formData as any)[t.key]}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          (formData as any)[t.key]
                            ? "translate-x-5"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dining Tax Effect
                </label>
                <div className="flex flex-wrap gap-2">
                  {["No Effect", "Add", "Subtract"].map((effect) => (
                    <button
                      key={effect}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          diningTaxEffect: effect,
                        })
                      }
                      className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.diningTaxEffect === effect
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                    >
                      {effect}
                      {formData.diningTaxEffect === effect && (
                        <CheckIcon className="w-4 h-4 inline-block ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Additional Information
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Description, nutritional info, and images
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Enter item description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Calories
                  </label>
                  <input
                    type="text"
                    value={formData.calories}
                    onChange={(e) =>
                      setFormData({ ...formData, calories: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter calories"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SKU/PLU
                  </label>
                  <input
                    type="text"
                    value={formData.skuPlu}
                    onChange={(e) =>
                      setFormData({ ...formData, skuPlu: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter SKU/PLU"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter barcode"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stock in Hand
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stockinhand}
                    onChange={(e) =>
                      setFormData({ ...formData, stockinhand: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter stock"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setImageLoading(true);

                    // Check file size (max 1MB)
                    const maxSize = 1 * 1024 * 1024;
                    if (file.size > maxSize) {
                      toast.error("Image size must be less than 1MB");
                      e.target.value = "";
                      setImageLoading(false);
                      return;
                    }

                    // Check file type
                    if (!file.type.startsWith("image/")) {
                      toast.error("Please select a valid image file");
                      e.target.value = "";
                      setImageLoading(false);
                      return;
                    }

                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result as string;
                      if (result.length > 1400000) {
                        toast.error(
                          "Image is too large. Please use a smaller image."
                        );
                        e.target.value = "";
                        setImageLoading(false);
                        return;
                      }

                      setFormData({ ...formData, menuImg: result });
                      setImageLoading(false);
                      toast.success("Image uploaded successfully!");
                    };

                    reader.onerror = () => {
                      toast.error("Error reading image file");
                      e.target.value = "";
                      setImageLoading(false);
                    };

                    reader.readAsDataURL(file);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/20 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Supported formats: JPG, PNG (Max size: 1MB)
                </p>
                {imageLoading && (
                  <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    <span>Processing image...</span>
                  </div>
                )}
                {formData.menuImg && !imageLoading && (
                  <div className="mt-2">
                    <img
                      src={formData.menuImg}
                      alt="Preview"
                      className="h-24 w-24 object-cover rounded border border-gray-300 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, menuImg: "" });
                        const fileInput = document.querySelector(
                          'input[type="file"]'
                        ) as HTMLInputElement;
                        if (fileInput) fileInput.value = "";
                      }}
                      className="mt-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modifiers Section */}
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Modifiers
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select modifiers that customers can choose for this menu item
              </p>
            </div>

            <div className="space-y-6">
              {/* Item-level modifier groups */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Item-level modifiers
                </h4>
                {selectedModifiers.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">
                      No modifiers selected
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Click "Add modifiers " to select modifiers for this item
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
                        {(() => {
                          const inheritedCodes = new Set(
                            (inheritedModifiers || [])
                              .map((m: any) => m.modifierGroupCode)
                              .filter(Boolean)
                          );
                          return selectedModifiers
                            .filter((modifierId) => {
                              const modifier = modifiers.find(
                                (m) =>
                                  Number(m.id) === Number(modifierId) ||
                                  Number(m.tblModifierId) === Number(modifierId)
                              );
                              return (
                                modifier &&
                                !inheritedCodes.has(modifier.modifierGroupCode)
                              );
                            })
                            .map((modifierId) => {
                              const modifier = modifiers.find(
                                (m) =>
                                  Number(m.id) === Number(modifierId) ||
                                  Number(m.tblModifierId) === Number(modifierId)
                              );
                              if (!modifier) return null;
                              const opts = modifierOptions[modifierId] || {
                                isRequired: 0,
                                isMultiselect: 0,
                                minSelection: null,
                                maxSelection: null,
                              };
                              const multi = opts.isMultiselect === 1;
                              return (
                                <tr key={modifierId}>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {modifier.groupName || modifier.labelName || modifier.name || 'Unnamed Modifier'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <select
                                      value={(opts.isRequired ?? 0).toString()}
                                      onChange={(e) =>
                                        setModifierOptions((prev) => ({
                                          ...prev,
                                          [modifierId]: {
                                            ...(prev[modifierId] || opts),
                                            isRequired: parseInt(
                                              e.target.value
                                            ),
                                          },
                                        }))
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                      <option value="0">Optional</option>
                                      <option value="2">
                                        Optional - Force Show
                                      </option>
                                      <option value="1">Required</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={multi}
                                      onChange={(e) =>
                                        setModifierOptions((prev) => ({
                                          ...prev,
                                          [modifierId]: {
                                            ...(prev[modifierId] || opts),
                                            isMultiselect: e.target.checked
                                              ? 1
                                              : 0,
                                          },
                                        }))
                                      }
                                      className="h-4 w-4 text-blue-600"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    {multi ? (
                                      <input
                                        type="number"
                                        min={0}
                                        value={opts.minSelection ?? ""}
                                        onChange={(e) =>
                                          setModifierOptions((prev) => ({
                                            ...prev,
                                            [modifierId]: {
                                              ...(prev[modifierId] || opts),
                                              minSelection:
                                                e.target.value === ""
                                                  ? null
                                                  : parseInt(e.target.value),
                                            },
                                          }))
                                        }
                                        className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                      />
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-500">
                                        n/a
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {multi ? (
                                      <input
                                        type="number"
                                        min={0}
                                        value={opts.maxSelection ?? ""}
                                        onChange={(e) =>
                                          setModifierOptions((prev) => ({
                                            ...prev,
                                            [modifierId]: {
                                              ...(prev[modifierId] || opts),
                                              maxSelection:
                                                e.target.value === ""
                                                  ? null
                                                  : parseInt(e.target.value),
                                            },
                                          }))
                                        }
                                        className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                      />
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-500">
                                        n/a
                                      </span>
                                    )}
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
                            });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowModifierModal(true)}
                  className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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

              {/* Inheritance section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Inherit modifiers?
                </h4>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInheritModifiers(true)}
                    className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                      inheritModifiers
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                  >
                    Yes, inherit modifiers set at the menu category-level.
                    {inheritModifiers && (
                      <CheckIcon className="w-4 h-4 inline-block ml-2" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setInheritModifiers(false)}
                    className={`relative px-4 py-2 rounded-lg border-2 transition-all ${
                      !inheritModifiers
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                  >
                    No
                    {!inheritModifiers && (
                      <CheckIcon className="w-4 h-4 inline-block ml-2" />
                    )}
                  </button>
                </div>

                {inheritModifiers && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      This menu item will automatically inherit modifiers from
                      its menu categories:
                      <span className="font-medium">
                        {" "}
                        {Array.from(selectedCategoryMap.values())
                          .flat()
                          .map(
                            (code) =>
                              filteredCategories.find(
                                (c) => c.menuCategoryCode === code
                              )?.name
                          )
                          .filter(Boolean)
                          .join(", ") || "Selected Categories"}
                      </span>
                    </p>
                  </div>
                )}

                {inheritModifiers && (
                  <div className="mt-4">
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
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {inheritedModifiers.length === 0 && (
                            <tr>
                              <td
                                className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
                                colSpan={5}
                              >
                                No modifiers inherited from category.
                              </td>
                            </tr>
                          )}
                          {inheritedModifiers.map((m: any) => (
                            <tr key={m.id || m.modifierGroupCode}>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {m.groupName ||
                                  m.labelName ||
                                  m.modifierGroupCode}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400">
                                n/a
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400">
                                n/a
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400">
                                n/a
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400">
                                n/a
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Saving..." : menuItem ? "Update" : "Create"}
            </button>
          </div>
        </form>

        {/* Modifier Selection Modal */}
        <ModifierSelectionModal
          isOpen={showModifierModal}
          onClose={() => setShowModifierModal(false)}
          onConfirm={handleModifierModalConfirm}
          selectedModifierIds={selectedModifiers}
          menuItemId={menuItem?.tblMenuItemId}
        />
        <MenuMasterCategorySelectionModal
          isOpen={showMenuMasterCategoryModal}
          onClose={() => setShowMenuMasterCategoryModal(false)}
          onConfirm={handleMenuMasterCategorySelect}
          selectedMenuMasterCodes={Array.isArray(formData.menuMasterCode) ? formData.menuMasterCode : (formData.menuMasterCode ? [formData.menuMasterCode] : [])}
          selectedCategoryMap={(() => {
            // Convert Map<string, string[]> to Map<string, string[]> for modal (it expects this format)
            const mapForModal = new Map<string, string[]>();
            selectedCategoryMap.forEach((categories, masterCode) => {
              mapForModal.set(masterCode, categories);
            });
            return mapForModal;
          })()}
          menuMasters={menuMasters}
          categories={categories}
        />
      </div>
    </LoadingOverlay>
  );
}
