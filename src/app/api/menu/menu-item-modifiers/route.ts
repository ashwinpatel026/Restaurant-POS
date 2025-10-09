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
    const menuItemId = searchParams.get('menuItemId')

    const where: any = {}
    if (menuItemId) {
      where.tblMenuItemId = parseInt(menuItemId)
    }

    const menuItemModifiers = await prisma.menuItemModifier.findMany({
      where,
      orderBy: { menuItemModifierId: 'asc' }
    })

    return NextResponse.json(menuItemModifiers)
  } catch (error) {
    console.error('Error fetching menu item modifiers:', error)
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
    const { tblMenuItemId, tblModifierId } = body

    const menuItemModifier = await prisma.menuItemModifier.create({
      data: {
        tblMenuItemId: parseInt(tblMenuItemId),
        tblModifierId: parseInt(tblModifierId),
        storeCode: process.env.STORE_CODE || null
      }
    })

    return NextResponse.json(menuItemModifier, { status: 201 })
  } catch (error) {
    console.error('Error creating menu item modifier:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const menuItemId = searchParams.get('menuItemId')
    const modifierId = searchParams.get('modifierId')

    if (!menuItemId || !modifierId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    await prisma.menuItemModifier.deleteMany({
      where: {
        tblMenuItemId: parseInt(menuItemId),
        tblModifierId: parseInt(modifierId)
      }
    })

    return NextResponse.json({ message: 'Menu item modifier deleted successfully' })
  } catch (error) {
    console.error('Error deleting menu item modifier:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
