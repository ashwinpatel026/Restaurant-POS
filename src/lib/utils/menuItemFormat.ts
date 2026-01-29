/**
 * Utility functions for converting between old and new menuCategoryCode formats
 * 
 * Old format: ["MC1", "MC2", "MC4"] (simple array of category codes)
 * New format: [{menuMasterCode: "MM1", menuCategoryCode: "MC1"}, ...] (structured array)
 */

export interface MenuCategoryMapping {
  menuMasterCode: string;
  menuCategoryCode: string;
}

/**
 * Convert old format (string array) to new format (structured array)
 * Requires menuMasterCode array and categories lookup to map correctly
 */
export function convertToStructuredFormat(
  categoryCodes: string[],
  menuMasterCodes: string[],
  categories: Array<{ menuCategoryCode: string; menuMasterCode: string }>
): MenuCategoryMapping[] {
  const result: MenuCategoryMapping[] = [];
  
  // Group categories by their menuMasterCode
  const masterCategoryMap = new Map<string, string[]>();
  
  categoryCodes.forEach((categoryCode) => {
    const category = categories.find(cat => cat.menuCategoryCode === categoryCode);
    if (category) {
      const masterCode = category.menuMasterCode;
      if (!masterCategoryMap.has(masterCode)) {
        masterCategoryMap.set(masterCode, []);
      }
      masterCategoryMap.get(masterCode)!.push(categoryCode);
    }
  });
  
  // Build structured array
  menuMasterCodes.forEach((masterCode) => {
    const categoryCodesForMaster = masterCategoryMap.get(masterCode) || [];
    categoryCodesForMaster.forEach((categoryCode) => {
      result.push({
        menuMasterCode: masterCode,
        menuCategoryCode: categoryCode,
      });
    });
  });
  
  // Handle any unmatched categories (backward compatibility)
  categoryCodes.forEach((categoryCode) => {
    const category = categories.find(cat => cat.menuCategoryCode === categoryCode);
    if (category && !menuMasterCodes.includes(category.menuMasterCode)) {
      // Assign to first master if unmatched
      if (menuMasterCodes.length > 0) {
        result.push({
          menuMasterCode: menuMasterCodes[0],
          menuCategoryCode: categoryCode,
        });
      }
    }
  });
  
  return result;
}

/**
 * Convert new format (structured array) to old format (string array)
 * Useful for backward compatibility or when only category codes are needed
 */
export function convertToSimpleFormat(
  structuredArray: MenuCategoryMapping[]
): string[] {
  return structuredArray.map(item => item.menuCategoryCode);
}

/**
 * Normalize menuCategoryCode to structured format
 * Handles both old and new formats, returns new format
 */
export function normalizeToStructuredFormat(
  menuCategoryCode: any,
  menuMasterCode: string | string[],
  categories?: Array<{ menuCategoryCode: string; menuMasterCode: string }>
): MenuCategoryMapping[] | null {
  if (!menuCategoryCode) {
    return null;
  }
  
  // Already in structured format
  if (Array.isArray(menuCategoryCode) && menuCategoryCode.length > 0) {
    const firstItem = menuCategoryCode[0];
    if (firstItem && typeof firstItem === 'object' && 'menuMasterCode' in firstItem && 'menuCategoryCode' in firstItem) {
      return menuCategoryCode as MenuCategoryMapping[];
    }
  }
  
  // Old format: string array or single string
  let categoryCodes: string[] = [];
  if (Array.isArray(menuCategoryCode)) {
    categoryCodes = menuCategoryCode;
  } else if (typeof menuCategoryCode === 'string') {
    try {
      const parsed = JSON.parse(menuCategoryCode);
      categoryCodes = Array.isArray(parsed) ? parsed : [menuCategoryCode];
    } catch {
      categoryCodes = [menuCategoryCode];
    }
  }
  
  // Convert to structured format if we have categories lookup
  if (categories && categoryCodes.length > 0) {
    const masterCodes = Array.isArray(menuMasterCode) ? menuMasterCode : [menuMasterCode];
    return convertToStructuredFormat(categoryCodes, masterCodes, categories);
  }
  
  // If no categories lookup, return null (shouldn't happen in normal flow)
  return null;
}

/**
 * Check if menuCategoryCode is in structured format
 */
export function isStructuredFormat(menuCategoryCode: any): boolean {
  if (!Array.isArray(menuCategoryCode) || menuCategoryCode.length === 0) {
    return false;
  }
  
  const firstItem = menuCategoryCode[0];
  return firstItem && typeof firstItem === 'object' && 'menuMasterCode' in firstItem && 'menuCategoryCode' in firstItem;
}
