import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { masterPrisma } from '@/lib/databaseManager'

/**
 * Refresh token endpoint
 * Attempts to refresh a token if it's expired but the admin is still valid
 * This allows extending sessions without requiring re-login if admin is still active
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    try {
      // Try to decode the token (even if expired)
      const decoded = jwt.decode(token) as any
      
      if (!decoded || decoded.type !== 'master_admin' || !decoded.adminId) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        )
      }

      // Verify admin still exists and is active
      const admin = await masterPrisma.admin.findUnique({
        where: { adminId: BigInt(decoded.adminId) }
      })

      if (!admin || !admin.isActive) {
        return NextResponse.json(
          { error: 'Admin not found or inactive' },
          { status: 401 }
        )
      }

      // Generate new token (even if old one was expired, we'll give a fresh one)
      const newToken = jwt.sign(
        {
          adminId: admin.adminId.toString(),
          email: admin.email,
          role: admin.role,
          type: 'master_admin'
        },
        process.env.NEXTAUTH_SECRET || 'fallback-secret',
        { expiresIn: '1h' }
      )

      return NextResponse.json({
        token: newToken,
        admin: {
          adminId: admin.adminId.toString(),
          email: admin.email,
          username: admin.username,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
          name: `${admin.firstName} ${admin.lastName}`
        }
      })
    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

