import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { masterPrisma } from '@/lib/databaseManager'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const admin = await masterPrisma.admin.findUnique({
      where: { email }
    })

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Update last login
    await masterPrisma.admin.update({
      where: { adminId: admin.adminId },
      data: { lastLoginAt: new Date() }
    }).catch(err => {
      console.error('Failed to update last login:', err)
    })

    // Generate JWT token
    const token = jwt.sign(
      {
        adminId: admin.adminId.toString(),
        email: admin.email,
        role: admin.role,
        type: 'master_admin'
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      token,
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
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

