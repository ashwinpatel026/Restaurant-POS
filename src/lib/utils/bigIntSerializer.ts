/**
 * BigInt Serialization Utilities
 * Handles conversion of BigInt values to strings for JSON serialization
 */

/**
 * Recursively converts all BigInt values in an object to strings
 * Also handles Date objects by converting them to ISO strings
 */
export function serializeBigInt<T>(obj: T): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  // Handle Date objects - convert to ISO string
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value);
    }
    return serialized;
  }

  return obj;
}

/**
 * Converts a single value (BigInt, number, or string) to a number
 */
export function toNumber(value: any): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    return parseInt(value, 10) || 0;
  }
  return Number(value) || 0;
}

/**
 * Converts a single value (BigInt, number, or string) to a string
 */
export function toString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return String(value);
}

