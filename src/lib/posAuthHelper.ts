// Helper functions for POS client authentication
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { masterPrisma, locationPrisma } from './databaseManager'

export interface POSAuthResult {
  isValid: boolean
  storeCode?: string
  locationId?: bigint
  error?: string
}

/**
 * Verify POS client authentication
 * Supports API key or JWT token authentication
 */
export async function verifyPOSClient(request: NextRequest, storeCode?: string): Promise<POSAuthResult> {
  const authHeader = request.headers.get('authorization')
  
  // Check for Bearer token (JWT)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifyPOSJWT(authHeader.substring(7), storeCode)
  }
  
  // Check for API key in header
  const apiKey = request.headers.get('x-api-key') || request.headers.get('api-key')
  if (apiKey) {
    return verifyPOSAPIKey(apiKey, storeCode)
  }
  
  // Check for API key in query params (for GET requests)
  const url = new URL(request.url)
  const queryApiKey = url.searchParams.get('api_key') || url.searchParams.get('apikey')
  if (queryApiKey) {
    return verifyPOSAPIKey(queryApiKey, storeCode)
  }
  
  return {
    isValid: false,
    error: 'No authentication credentials provided'
  }
}

/**
 * Verify POS JWT token
 */
async function verifyPOSJWT(token: string, requestedStoreCode?: string): Promise<POSAuthResult> {
  try {
    const decoded = jwt.verify(
      token,
      process.env.POS_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (decoded.type !== 'pos_client') {
      return {
        isValid: false,
        error: 'Invalid token type'
      }
    }

    const storeCode = decoded.storeCode || requestedStoreCode
    if (!storeCode) {
      return {
        isValid: false,
        error: 'Store code is required'
      }
    }

    // Verify location exists and is active in master DB
    const location = await masterPrisma.location.findUnique({
      where: { storeCode }
    })

    if (!location) {
      return {
        isValid: false,
        error: 'Location not found'
      }
    }

    if (location.isActive !== 1) {
      return {
        isValid: false,
        error: 'Location is not active'
      }
    }

    if (location.syncEnabled !== 1) {
      return {
        isValid: false,
        error: 'Sync is disabled for this location'
      }
    }

    return {
      isValid: true,
      storeCode: location.storeCode,
      locationId: location.locationId
    }
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message || 'Invalid token'
    }
  }
}

/**
 * Verify POS API key
 * API keys are stored in the database per location
 */
async function verifyPOSAPIKey(apiKey: string, requestedStoreCode?: string): Promise<POSAuthResult> {
  try {
    // Find location by API key
    const location = await masterPrisma.location.findUnique({
      where: { apiKey }
    })

    if (!location) {
      return {
        isValid: false,
        error: 'Invalid API key'
      }
    }

    // If storeCode is requested, verify it matches
    if (requestedStoreCode && location.storeCode !== requestedStoreCode) {
      return {
        isValid: false,
        error: 'API key does not match the requested store code'
      }
    }

    // Verify location is active
    if (location.isActive !== 1) {
      return {
        isValid: false,
        error: 'Location is not active'
      }
    }

    // Verify sync is enabled
    if (location.syncEnabled !== 1) {
      return {
        isValid: false,
        error: 'Sync is disabled for this location'
      }
    }

    return {
      isValid: true,
      storeCode: location.storeCode,
      locationId: location.locationId
    }
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message || 'Authentication failed'
    }
  }
}

/**
 * Verify store code exists and is active in location database
 * This is a helper to ensure storeCode is valid before operations
 */
export async function verifyStoreCode(storeCode: string): Promise<{
  isValid: boolean
  locationId?: bigint
  error?: string
}> {
  try {
    // Check in master DB first
    const location = await masterPrisma.location.findUnique({
      where: { storeCode }
    })

    if (!location) {
      return {
        isValid: false,
        error: 'Store code not found'
      }
    }

    if (location.isActive !== 1) {
      return {
        isValid: false,
        error: 'Location is not active'
      }
    }

    if (location.syncEnabled !== 1) {
      return {
        isValid: false,
        error: 'Sync is disabled for this location'
      }
    }

    return {
      isValid: true,
      locationId: location.locationId
    }
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message || 'Failed to verify store code'
    }
  }
}

