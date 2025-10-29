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
    const categoryId = searchParams.get('categoryId')
    const includeItems = searchParams.get('includeItems') === 'true'

    const where: any = {}
    if (menuItemId) {
      where.tblMenuItemId = parseInt(menuItemId)
    }
    if (categoryId) {
      where.tblMenuCategoryId = parseInt(categoryId)
    }

    const modifiers = await prisma.modifier.findMany({
      where,
      include: {
        modifierItems: includeItems ? {
          where: { isActive: 1 },
          orderBy: { tblModifierItemId: 'asc' }
        } : false
      },
      orderBy: { name: 'asc' }
    })

    // Add item count for each modifier
    const modifiersWithCount = await Promise.all(
      modifiers.map(async (modifier) => {
        const itemCount = await prisma.modifierItem.count({
          where: { 
            tblModifierId: modifier.tblModifierId,
            isActive: 1
          }
        })
        
        return {
          ...modifier,
          itemCount,
          sampleItems: modifier.modifierItems?.slice(0, 3).map(item => item.name) || []
        }
      })
    )

    return NextResponse.json(modifiersWithCount)
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
      posName,
      colorCode,
      priceStrategy,
      price,
      required,
      isMultiselect,
      minSelection,
      maxSelection,
      additionalChargeType,
      tblMenuCategoryId,
      modifierItems
    } = body

    const modifier = await prisma.modifier.create({
      data: {
        name,
        labelName,
        posName: posName || name,
        colorCode,
        priceStrategy: parseInt(priceStrategy),
        price: parseFloat(price || 0),
        required: parseInt(required),
        isMultiselect: parseInt(isMultiselect),
        minSelection: minSelection ? parseInt(minSelection) : null,
        maxSelection: maxSelection ? parseInt(maxSelection) : null,
        additionalChargeType: additionalChargeType || 'price_set_on_individual_modifiers',
        tblMenuCategoryId: tblMenuCategoryId ? parseInt(tblMenuCategoryId) : null,
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null
      }
    })

    // Create modifier items if provided
    if (modifierItems && modifierItems.length > 0) {
      const modifierItemsData = modifierItems.map((item: any) => ({
        name: item.name,
        labelName: item.labelName || item.name,
        posName: item.posName || item.name,
        colorCode: item.colorCode || '#3B82F6',
        price: item.price || 0,
        tblModifierId: modifier.tblModifierId,
        storeCode: process.env.STORE_CODE || null
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
