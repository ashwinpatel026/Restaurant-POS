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

    const modifiers = await prisma.modifier.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json(modifiers)
  } catch (error) {
    console.error('Error fetching modifiers:', error)
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
    const {
      name,
      labelName,
      colorCode,
      priceStrategy,
      price,
      required,
      isMultiselect,
      minSelection,
      maxSelection,
      modifierItems
    } = body

    const modifier = await prisma.modifier.create({
      data: {
        name,
        labelName,
        colorCode,
        priceStrategy: parseInt(priceStrategy),
        price: parseFloat(price || 0),
        required: parseInt(required),
        isMultiselect: parseInt(isMultiselect),
        minSelection: parseInt(minSelection),
        maxSelection: parseInt(maxSelection),
        createdBy: parseInt(session.user.id),
        storeCode: 'MAIN'
      }
    })

    // Create modifier items if provided
    if (modifierItems && modifierItems.length > 0) {
      const modifierItemsData = modifierItems.map((item: any) => ({
        name: item.name,
        labelName: item.labelName || item.name,
        colorCode: item.colorCode || '#3B82F6',
        price: item.price || 0, // Keep as number, Prisma will handle Decimal conversion
        tblModifierId: modifier.tblModifierId,
        storeCode: 'MAIN'
      }))

      await prisma.modifierItem.createMany({
        data: modifierItemsData
      })
    }

    return NextResponse.json(modifier, { status: 201 })
  } catch (error) {
    console.error('Error creating modifier:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
