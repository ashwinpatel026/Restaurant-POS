import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ORD-${timestamp}-${random}`
}

export function generateSupplyOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `SUP-${timestamp}-${random}`
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
    IN_STOCK: 'bg-green-100 text-green-800',
    LOW_STOCK: 'bg-yellow-100 text-yellow-800',
    OUT_OF_STOCK: 'bg-red-100 text-red-800',
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

