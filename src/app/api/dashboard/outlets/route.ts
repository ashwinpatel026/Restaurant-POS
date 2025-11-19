import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const outlets = await (prisma as any).outlet.findMany({
      include: {
        users: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(outlets)
  } catch (error) {
    console.error('Error fetching outlets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, code, address, city, state, zipCode, phone, email, openingTime, closingTime } = body

    const outlet = await (prisma as any).outlet.create({
      data: {
        name,
        code,
        address,
        city,
        state,
        zipCode,
        phone,
        email,
        openingTime,
        closingTime,
      },
      include: {
        users: true,
      }
    })

    return NextResponse.json(outlet, { status: 201 })
  } catch (error) {
    console.error('Error creating outlet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
