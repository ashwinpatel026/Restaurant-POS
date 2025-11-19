import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Helper to verify master admin token
async function verifyMasterAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (decoded.type !== 'master_admin') {
      return null
    }

    const admin = await masterPrisma.admin.findUnique({
      where: { adminId: BigInt(decoded.adminId) }
    })

    if (!admin || !admin.isActive) {
      return null
    }

    return admin
  } catch {
    return null
  }
}

// GET all admins
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admins = await masterPrisma.admin.findMany({
      orderBy: { createdOn: 'desc' }
    })

    const adminsWithoutPassword = admins.map(a => ({
      adminId: a.adminId.toString(),
      email: a.email,
      username: a.username,
      firstName: a.firstName,
      lastName: a.lastName,
      role: a.role,
      isActive: a.isActive,
      lastLoginAt: a.lastLoginAt,
      createdOn: a.createdOn,
      updatedOn: a.updatedOn
    }))

    return NextResponse.json(adminsWithoutPassword)
  } catch (error) {
    console.error('Error fetching admins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// CREATE admin
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      role
    } = body

    if (!email || !username || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingEmail = await masterPrisma.admin.findUnique({
      where: { email }
    })
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUsername = await masterPrisma.admin.findUnique({
      where: { username }
    })
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create admin
    const newAdmin = await masterPrisma.admin.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role: role as any,
        isActive: true
      }
    })

    const { password: _, ...adminWithoutPassword } = newAdmin

    return NextResponse.json({
      ...adminWithoutPassword,
      adminId: newAdmin.adminId.toString()
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

