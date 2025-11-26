import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ORD-${timestamp}-${random}`
}


export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(num)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

/**
 * Safely formats a date value, handling null/undefined and invalid dates
 * Returns "Never" for null/undefined/invalid dates, otherwise formats the date
 * @param dateValue - Date value (string, Date object, null, or undefined)
 * @returns Formatted date string or "Never" if invalid/null
 */
export function formatDateSafe(
  dateValue: string | null | undefined | Date
): string {
  if (!dateValue) {
    return "Never";
  }

  // Handle if it's already a Date object
  if (dateValue instanceof Date) {
    if (isNaN(dateValue.getTime())) {
      return "Never";
    }
    return dateValue.toLocaleString();
  }

  // Try to parse the date string
  let date: Date;

  // If it's already an ISO string or valid date string, use it directly
  if (typeof dateValue === "string") {
    date = new Date(dateValue);
  } else {
    return "Never";
  }

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    // Try alternative parsing methods
    // Sometimes PostgreSQL returns dates in different formats
    const timestamp = Date.parse(dateValue);
    if (!isNaN(timestamp)) {
      date = new Date(timestamp);
    } else {
      return "Never";
    }
  }

  // Final validation
  if (isNaN(date.getTime())) {
    return "Never";
  }

  // Format the date
  return date.toLocaleString();
}

export function calculateTax(amount: number, taxRate: number = 0.18): number {
  return amount * taxRate
}

export function calculateDiscount(
  amount: number,
  discountPercent: number
): number {
  return amount * (discountPercent / 100)
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PREPARING: 'bg-purple-100 text-purple-800',
    READY: 'bg-green-100 text-green-800',
    SERVED: 'bg-teal-100 text-teal-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
    AVAILABLE: 'bg-green-100 text-green-800',
    OCCUPIED: 'bg-red-100 text-red-800',
    RESERVED: 'bg-blue-100 text-blue-800',
  }
  return statusColors[status] || 'bg-gray-100 text-gray-800'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// USA-based formatting utilities

/**
 * Formats Federal Tax ID as XX-XXXXXXX
 * @param value - Input string
 * @returns Formatted string (XX-XXXXXXX)
 */
export function formatFederalTaxId(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 2) {
    return cleaned;
  }
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 9)}`;
}

/**
 * Formats Social Security Number as XXX-XX-XXXX
 * @param value - Input string
 * @returns Formatted string (XXX-XX-XXXX)
 */
export function formatSSN(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 5) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`;
}

/**
 * Formats US Phone Number as (XXX) XXX-XXXX
 * @param value - Input string
 * @returns Formatted string ((XXX) XXX-XXXX)
 */
export function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  }
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}

/**
 * Formats US Zipcode as XXXXX or XXXXX-XXXX
 * @param value - Input string
 * @returns Formatted string (XXXXX or XXXXX-XXXX)
 */
export function formatZipcode(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 5) {
    return cleaned;
  }
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}`;
}

