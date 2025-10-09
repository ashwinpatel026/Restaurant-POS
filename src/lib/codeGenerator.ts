import { prisma } from './database'

/**
 * Generates the next sequential code with W00 prefix
 * @param model - Prisma model name
 * @param codeField - Field name for the code (e.g., 'printerCode', 'prepStationCode')
 * @returns Next sequential code (e.g., W001, W002, W003...)
 */
export async function generateNextCode(
  model: 'printer' | 'prepStation' | 'availability' | 'tax' | 'menuMaster' | 'menuCategory' | 'menuItem',
  codeField: string
): Promise<string> {
  try {
    // Get the last record with W prefix, ordered by code descending
    const lastRecord = await (prisma[model] as any).findFirst({
      where: {
        [codeField]: {
          startsWith: 'W'
        }
      },
      orderBy: {
        [codeField]: 'desc'
      }
    })

    if (!lastRecord || !lastRecord[codeField]) {
      return 'W001'
    }

    // Extract the number from the last code (e.g., W001 -> 001)
    const lastCode = lastRecord[codeField] as string
    const lastNumber = parseInt(lastCode.substring(1))
    
    // Increment and pad with zeros to maintain 3 digits
    const nextNumber = lastNumber + 1
    const nextCode = `W${nextNumber.toString().padStart(3, '0')}`
    
    return nextCode
  } catch (error) {
    console.error('Error generating code:', error)
    return 'W001'
  }
}

/**
 * Generates a unique code with retry logic in case of conflicts
 * @param model - Prisma model name
 * @param codeField - Field name for the code
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Unique sequential code
 */
export async function generateUniqueCode(
  model: 'printer' | 'prepStation' | 'availability' | 'tax' | 'menuMaster' | 'menuCategory' | 'menuItem',
  codeField: string,
  maxRetries: number = 3
): Promise<string> {
  let attempts = 0
  
  while (attempts < maxRetries) {
    try {
      const code = await generateNextCode(model, codeField)
      
      // Verify uniqueness
      const existing = await (prisma[model] as any).findFirst({
        where: {
          [codeField]: code
        }
      })
      
      if (!existing) {
        return code
      }
      
      attempts++
    } catch (error) {
      console.error('Error in generateUniqueCode:', error)
      attempts++
    }
  }
  
  // Fallback: generate with timestamp
  return `W${Date.now().toString().slice(-6)}`
}

