"use client";

import { useCallback } from "react";
import { useStore } from "@/contexts/StoreContext";

/**
 * Hook to build API URLs with storeCode from context
 * Automatically appends storeCode query parameter from context
 */
export function useApiWithStore() {
  const { selectedStoreCode } = useStore();
  
  /**
   * Build API URL with storeCode from context
   * @param baseUrl - Base API URL (e.g., "/api/dashboard/tax")
   * @returns URL with storeCode query parameter if available
   */
  const buildApiUrl = useCallback((baseUrl: string): string => {
    if (!selectedStoreCode) {
      return baseUrl;
    }

    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}storeCode=${encodeURIComponent(selectedStoreCode)}`;
  }, [selectedStoreCode]);

  /**
   * Fetch with automatic storeCode inclusion
   * @param url - API URL
   * @param options - Fetch options
   */
  const fetchWithStore = async (
    url: string,
    options?: RequestInit
  ): Promise<Response> => {
    const apiUrl = buildApiUrl(url);
    return fetch(apiUrl, options);
  };

  return {
    selectedStoreCode,
    buildApiUrl,
    fetchWithStore,
  };
}

