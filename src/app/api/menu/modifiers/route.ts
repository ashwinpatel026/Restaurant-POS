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
    const includeItems = searchParams.get('includeItems') === 'true'

    // Build where clause for new schema (modifier groups)
    const where: any = {}

    // Fetch modifier groups
    const groups = await (prisma as any).modifierGroup.findMany({
      where,
      orderBy: { groupName: 'asc' }
    })

    // Optionally fetch all modifier items and group them by modifierGroupCode
    let itemsByGroup: Map<string, any[]> = new Map()
    if (includeItems) {
      const allItems = await (prisma as any).modifierItem.findMany({
        where: { isActive: 1 },
        orderBy: { displayOrder: 'asc' }
      })

      for (const item of allItems) {
        if (!item.modifierGroupCode) continue
        const list = itemsByGroup.get(item.modifierGroupCode) || []
        list.push(item)
        itemsByGroup.set(item.modifierGroupCode, list)
      }
    }

    // Map to legacy-compatible response shape expected by the UI
    const formatted = groups.map((group: any) => {
      const groupItems = includeItems
        ? (itemsByGroup.get(group.modifierGroupCode) || [])
        : []

      const itemCount = groupItems.length
      const sampleItems = groupItems.slice(0, 3).map((it: any) => it.name)

      return {
        // IDs - both formats for compatibility
        id: Number(group.id),
        tblModifierId: Number(group.id),
        name: group.groupName,
        labelName: group.labelName,
        posName: group.labelName || group.groupName,
        colorCode: '#3B82F6',
        required: group.isRequired,
        isMultiselect: group.isMultiselect,
        minSelection: group.minSelection,
        maxSelection: group.maxSelection,
        additionalChargeType: 'price_set_on_individual_modifiers',
        // Helpers
        itemCount,
        sampleItems,
        // Optional items
        modifierItems: includeItems
          ? groupItems.map((it: any) => ({
              id: Number(it.id),
              tblModifierItemId: Number(it.id),
              name: it.name,
              labelName: it.labelName,
              posName: it.labelName || it.name,
              colorCode: it.colorCode,
              price: it.price
            }))
          : undefined
      }
    })

    return NextResponse.json(formatted)
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

    // Create a new modifier group using the new schema
    const createdGroup = await (prisma as any).modifierGroup.create({
      data: {
        groupName: name,
        labelName,
        // No explicit posName field in schema; use labelName/derived in UI
        // Default color if not provided
        // colorCode is not stored in group table; UI uses default
        priceStrategy: priceStrategy ? parseInt(priceStrategy) : 1,
        // price is defined at item level in the new model; keep null here
        isRequired: required ? parseInt(required) : 0,
        isMultiselect: isMultiselect ? parseInt(isMultiselect) : 0,
        minSelection: minSelection ? parseInt(minSelection) : null,
        maxSelection: maxSelection ? parseInt(maxSelection) : null,
        // The new schema uses menuCategoryCode (string) instead of id; skip mapping here
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null
      }
    })

    // Create modifier items if provided
    if (modifierItems && modifierItems.length > 0) {
      const itemsData = modifierItems.map((item: any) => ({
        name: item.name,
        labelName: item.labelName || item.name,
        colorCode: item.colorCode || '#3B82F6',
        price: item.price || 0,
        modifierGroupCode: createdGroup.modifierGroupCode || null,
        storeCode: process.env.STORE_CODE || null
      }))

      await (prisma as any).modifierItem.createMany({
        data: itemsData
      })
    }

    return NextResponse.json(createdGroup, { status: 201 })
  } catch (error) {
    console.error('Error creating modifier:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
