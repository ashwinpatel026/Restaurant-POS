import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { masterPrisma } from '@/lib/databaseManager'

export async function GET(request: NextRequest) {
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
      const decoded = jwt.verify(
        token,
        process.env.NEXTAUTH_SECRET || 'fallback-secret'
      ) as any

      if (decoded.type !== 'master_admin') {
        return NextResponse.json(
          { error: 'Invalid token type' },
          { status: 401 }
        )
      }

      const admin = await masterPrisma.admin.findUnique({
        where: { adminId: BigInt(decoded.adminId) }
      })

      if (!admin || !admin.isActive) {
        return NextResponse.json(
          { error: 'Admin not found or inactive' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        adminId: admin.adminId.toString(),
        email: admin.email,
        username: admin.username,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        name: `${admin.firstName} ${admin.lastName}`
      })
    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

