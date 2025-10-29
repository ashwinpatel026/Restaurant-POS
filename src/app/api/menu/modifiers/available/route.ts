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
    const search = searchParams.get('search')
    const excludeMenuItemId = searchParams.get('excludeMenuItemId')

    // Build where clause
    const where: any = {}
    
    // Exclude modifiers already assigned to the menu item
    if (excludeMenuItemId) {
      // TODO: Update when menu item-modifier assignment system is ready
      // For now, just proceed with all modifiers
    }

    // Add search filter
    if (search) {
      where.OR = [
        { groupName: { contains: search, mode: 'insensitive' } },
        { labelName: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get modifier groups with their items using the new models
    const modifiers = await (prisma as any).modifierGroup.findMany({
      where,
      orderBy: { groupName: 'asc' }
    })

    // Get all modifier items and group by modifierGroupCode
    const allItems = await (prisma as any).modifierItem.findMany({
      where: { isActive: 1 },
      orderBy: { displayOrder: 'asc' }
    })

    // Group items by modifierGroupCode
    const itemsByGroup = new Map<string, any[]>()
    for (const item of allItems) {
      if (item.modifierGroupCode) {
        const items = itemsByGroup.get(item.modifierGroupCode) || []
        items.push(item)
        itemsByGroup.set(item.modifierGroupCode, items)
      }
    }

    // Format response to match the modal interface
    const formattedModifiers = modifiers.map((modifier: any) => {
      const items = itemsByGroup.get(modifier.modifierGroupCode) || []
      const itemCount = items.length
      const sampleItems = items.slice(0, 3).map((item: any) => item.name)
      
      // Determine configuration summary
      let configSummary = ''
      if (modifier.isRequired === 1) {
        configSummary = 'Required'
      } else {
        configSummary = 'Optional'
      }
      
      if (modifier.isMultiselect === 1) {
        configSummary += ', multi select'
      } else {
        configSummary += ', single select'
      }

      return {
        id: modifier.id.toString(),
        name: modifier.groupName,
        labelName: modifier.labelName,
        posName: modifier.labelName || modifier.groupName,
        colorCode: '#3B82F6', // Default color
        required: modifier.isRequired,
        isMultiselect: modifier.isMultiselect,
        minSelection: modifier.minSelection,
        maxSelection: modifier.maxSelection,
        additionalChargeType: 'price_set_on_individual_modifiers',
        itemCount,
        sampleItems,
        configSummary,
        modifierItems: items.map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          labelName: item.labelName,
          posName: item.labelName || item.name,
          price: item.price,
          colorCode: item.colorCode
        }))
      }
    })

    return NextResponse.json(formattedModifiers)
  } catch (error) {
    console.error('Error fetching available modifiers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}