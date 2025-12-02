/**
 * Store Manager Utility
 * Manages store selection with priority: URL > localStorage > Database default
 */

export class StoreManager {
  private static readonly STORAGE_KEY = 'selectedStoreCode'
  
  /**
   * Get selected store code with priority:
   * 1. URL query parameter (if valid)
   * 2. localStorage (user's last selection)
   * 3. User's default store from database
   */
  static getSelectedStore(
    urlStoreCode: string | null,
    accessibleStoreCodes: string[],
    userDefaultStore: string | null
  ): string | null {
    // Priority 1: URL parameter (if valid and accessible)
    if (urlStoreCode && accessibleStoreCodes.includes(urlStoreCode)) {
      // Save to localStorage as preference
      this.saveToLocalStorage(urlStoreCode)
      return urlStoreCode
    }
    
    // Priority 2: localStorage (user's last selection)
    if (typeof window !== 'undefined') {
      const savedStore = localStorage.getItem(this.STORAGE_KEY)
      if (savedStore && accessibleStoreCodes.includes(savedStore)) {
        return savedStore
      }
    }
    
    // Priority 3: User's default store
    if (userDefaultStore && accessibleStoreCodes.includes(userDefaultStore)) {
      return userDefaultStore
    }
    
    // Priority 4: First accessible store
    if (accessibleStoreCodes.length > 0) {
      return accessibleStoreCodes[0]
    }
    
    return null
  }
  
  /**
   * Save store selection to localStorage (as user preference)
   */
  static saveToLocalStorage(storeCode: string): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, storeCode)
      } catch (error) {
        console.error('Failed to save store to localStorage:', error)
      }
    }
  }
  
  /**
   * Clear stored preference
   */
  static clearLocalStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }
  
  /**
   * Update URL with store code (without page reload)
   */
  static updateUrl(storeCode: string, pathname: string, searchParams: URLSearchParams): string {
    const params = new URLSearchParams(searchParams.toString())
    params.set('storeCode', storeCode)
    return `${pathname}?${params.toString()}`
  }
}

