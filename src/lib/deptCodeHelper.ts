/**
 * Helper function to normalize deptCode from string to JSON array format
 * Handles backward compatibility during migration from string to JSON
 * 
 * @param deptCode - Can be string, JSON string, JSON array, or null
 * @returns Normalized JSON array or null
 */
export function normalizeDeptCode(deptCode: any): any {
  // If null or undefined, return null
  if (deptCode === null || deptCode === undefined) {
    return null;
  }

  // If already a JSON array, return as is
  if (Array.isArray(deptCode)) {
    return deptCode.length > 0 ? deptCode : null;
  }

  // If it's a string, try to parse it
  if (typeof deptCode === 'string') {
    // Empty string
    if (deptCode.trim() === '') {
      return null;
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(deptCode);
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed : null;
      }
      // If parsed but not an array, wrap it in an array
      return [parsed];
    } catch (e) {
      // If parsing fails, treat as a single string value and wrap in array
      return [deptCode];
    }
  }

  // For any other type, try to convert to array
  return [deptCode];
}

/**
 * Helper function to convert deptCode to JSON string format for database storage
 * 
 * @param deptCode - Can be string, JSON string, JSON array, or null
 * @returns JSON string or null
 */
export function deptCodeToJsonString(deptCode: any): string | null {
  const normalized = normalizeDeptCode(deptCode);
  if (normalized === null) {
    return null;
  }
  return JSON.stringify(normalized);
}
