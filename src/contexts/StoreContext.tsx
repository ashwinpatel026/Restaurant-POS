"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { StoreManager } from "@/lib/store/storeManager";

interface Store {
  storeCode: string;
  locationName: string;
  companyName?: string | null;
  isDefault: boolean;
}

interface StoreContextType {
  selectedStoreCode: string | null;
  stores: Store[];
  setSelectedStoreCode: (storeCode: string) => void;
  loading: boolean;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [selectedStoreCode, setSelectedStoreCodeState] = useState<
    string | null
  >(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch available stores
  const fetchStores = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/stores");
      if (response.ok) {
        const data = await response.json();
        setStores(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
    return [];
  }, []);

  // Initialize store selection
  useEffect(() => {
    const initializeStore = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const fetchedStores = await fetchStores();
      if (fetchedStores.length === 0) {
        setLoading(false);
        return;
      }

      // Priority: localStorage > user default > first accessible store
      const accessibleCodes = fetchedStores.map((s: Store) => s.storeCode);
      const userDefaultStore =
        session?.user?.defaultStoreCode ||
        fetchedStores.find((s: Store) => s.isDefault)?.storeCode ||
        null;

      // Check localStorage first
      let selectedStore: string | null = null;

      if (typeof window !== "undefined") {
        const savedStore = localStorage.getItem("selectedStoreCode");
        if (savedStore && accessibleCodes.includes(savedStore)) {
          selectedStore = savedStore;
        } else if (savedStore && !accessibleCodes.includes(savedStore)) {
          // Clear localStorage if saved store is no longer accessible
          localStorage.removeItem("selectedStoreCode");
        }
      }

      // Fallback to user default
      if (
        !selectedStore &&
        userDefaultStore &&
        accessibleCodes.includes(userDefaultStore)
      ) {
        selectedStore = userDefaultStore;
      }

      // Fallback to first accessible store
      if (!selectedStore && accessibleCodes.length > 0) {
        selectedStore = accessibleCodes[0];
      }

      if (selectedStore) {
        setSelectedStoreCodeState(selectedStore);
        StoreManager.saveToLocalStorage(selectedStore);
      }

      setLoading(false);
    };

    initializeStore();
  }, [session, fetchStores]);

  // Update selected store
  const setSelectedStoreCode = useCallback((storeCode: string) => {
    setSelectedStoreCodeState(storeCode);
    StoreManager.saveToLocalStorage(storeCode);

    // Dispatch event for any components that need to refresh
    window.dispatchEvent(
      new CustomEvent("storeChanged", {
        detail: { storeCode },
      })
    );
  }, []);

  // Refresh stores list
  const refreshStores = useCallback(async () => {
    await fetchStores();
  }, [fetchStores]);

  return (
    <StoreContext.Provider
      value={{
        selectedStoreCode,
        stores,
        setSelectedStoreCode,
        loading,
        refreshStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
