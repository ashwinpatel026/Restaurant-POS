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

    const { searchParams } = new URL(request.url)
    const menuMasterId = searchParams.get('menuMasterId')

    const where: any = {}
    if (menuMasterId) {
      where.tblMenuMasterId = parseInt(menuMasterId)
    }

    const menuCategories = await prisma.menuCategory.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json(menuCategories)
  } catch (error) {
    console.error('Error fetching menu categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, colorCode, tblMenuMasterId } = body

    const menuCategory = await prisma.menuCategory.create({
      data: {
        name,
        colorCode,
        tblMenuMasterId: parseInt(tblMenuMasterId),
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null
      }
    })

    return NextResponse.json(menuCategory, { status: 201 })
  } catch (error) {
    console.error('Error creating menu category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
