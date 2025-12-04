import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { masterPrisma } from '@/lib/databaseManager'

/**
 * POST /api/pos/auth/generate-token
 * Generate JWT token for POS client authentication
 * 
 * This endpoint is for testing/development purposes.
 * In production, tokens should be generated through a secure authentication flow.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if request has body
    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', message: parseError.message },
        { status: 400 }
      )
    }

    // Validate body exists
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      )
    }

    const { storeCode, expiresIn } = body

    // Validate storeCode
    if (!storeCode) {
      return NextResponse.json(
        { error: 'storeCode is required' },
        { status: 400 }
      )
    }

    // Verify location exists and is active
    const location = await masterPrisma.location.findUnique({
      where: { storeCode }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    if (location.isActive !== 1) {
      return NextResponse.json(
        { error: 'Location is not active' },
        { status: 400 }
      )
    }

    if (location.syncEnabled !== 1) {
      return NextResponse.json(
        { error: 'Sync is disabled for this location' },
        { status: 400 }
      )
    }

    // Generate JWT token
    const secret = process.env.POS_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
    const tokenExpiry = expiresIn || '24h' // Default 24 hours

    const token = jwt.sign(
      {
        type: 'pos_client',
        storeCode: location.storeCode,
        locationId: location.locationId.toString(),
        iat: Math.floor(Date.now() / 1000)
      },
      secret,
      {
        expiresIn: tokenExpiry
      }
    )

    // Calculate expiration date
    let expiresAt: Date
    if (tokenExpiry === '24h' || tokenExpiry.endsWith('h')) {
      const hours = tokenExpiry === '24h' ? 24 : parseInt(tokenExpiry.replace('h', ''))
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)
    } else if (tokenExpiry.endsWith('d')) {
      const days = parseInt(tokenExpiry.replace('d', ''))
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    } else if (tokenExpiry.endsWith('m')) {
      const minutes = parseInt(tokenExpiry.replace('m', ''))
      expiresAt = new Date(Date.now() + minutes * 60 * 1000)
    } else {
      // Default to 24 hours if format is unrecognized
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    }

    return NextResponse.json({
      success: true,
      token,
      storeCode: location.storeCode,
      locationId: location.locationId.toString(),
      expiresIn: tokenExpiry,
      expiresAt: expiresAt.toISOString()
    })
  } catch (error: any) {
    console.error('Error generating JWT token:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

