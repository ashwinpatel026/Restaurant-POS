import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, checkConnection } from '@/lib/database'

// Helper function to handle database operations with retry
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error.message)
      
      if (error.code === 'P1017' || error.message.includes('Server has closed the connection')) {
        if (attempt < maxRetries) {
          console.log(`Checking connection health before retry ${attempt}...`)
          const isHealthy = await checkConnection()
          if (!isHealthy) {
            console.log('Connection is not healthy, waiting longer...')
            await new Promise(resolve => setTimeout(resolve, attempt * 2000))
          } else {
            console.log(`Retrying in ${attempt * 1000}ms...`)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000))
          }
          continue
        }
      }
      
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const itemId = BigInt(resolvedParams.id)

    const menuItem = await (prisma as any).menuItem.findUnique({
      where: { menuItemId: itemId } as any
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Fetch modifier group assignments for this menu item
    const menuItemCode = (menuItem as any).menuItemCode
    const assignedModifierGroups: any[] = []
    
    // Get inheritModifierGroup flag from MenuItem table
    const inheritModifiersFlag = (menuItem as any).inheritModifierGroup !== undefined 
      ? (menuItem as any).inheritModifierGroup 
      : true

    if (menuItemCode) {
      const assignments = await (prisma as any).menuItemModifierGroup.findMany({
        where: { menuItemCode }
      })

      // Get modifier group details for assigned groups
      if (assignments.length > 0) {
        // Get modifier group codes
        const groupCodes = assignments.map((a: any) => a.modifierGroupCode).filter(Boolean)
        
        if (groupCodes.length > 0) {
          const modifierGroups = await (prisma as any).modifierGroup.findMany({
            where: { modifierGroupCode: { in: groupCodes } }
          })

          // Map to include IDs for the form - include ALL assigned modifiers (both inherited and explicit)
          for (const assignment of assignments) {
            const group = modifierGroups.find((g: any) => g.modifierGroupCode === assignment.modifierGroupCode)
            if (group) {
              assignedModifierGroups.push({
                id: Number(group.id),
                tblModifierId: Number(group.id),
                modifierGroupCode: group.modifierGroupCode,
                inheritFromMenuGroup: assignment.inheritFromMenuGroup
              })
            }
          }
        }
      }
    }

    // Convert IDs to strings for JSON response
    const itemWithStringIds = {
      ...menuItem,
      menuItemId: (menuItem as any).menuItemId?.toString?.(),
      skuPlu: (menuItem as any).skuPlu ? (menuItem as any).skuPlu.toString() : null,
      assignedModifiers: assignedModifierGroups,
      inheritModifiers: inheritModifiersFlag
    }

    return NextResponse.json(itemWithStringIds)
  } catch (error) {
    console.error('Error fetching menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const itemId = BigInt(resolvedParams.id)
    const body = await request.json()

    const {
      name,
      kitchenName,
      labelName,
      colorCode,
      calories,
      description,
      itemSize,
      skuPlu,
      itemContainAlcohol,
      menuImg,
      priceStrategy,
      basePrice,
      isPrice,
      isOutStock,
      isPosVisible,
      isKioskOrderPay,
      isOnlineOrderByApp,
      isOnlineOrdering,
      isCustomerInvoice,
      menuCategoryCode,
      taxCode,
      inheritTaxInclusion,
      isTaxIncluded,
      inheritDiningTax,
      diningTaxEffect,
      disqualifyDiningTaxExemption,
      isActive,
      stockinhand,
      // New fields for modifier assignment
      selectedModifiers,
      inheritModifiers
    } = body

    // Check if menuImg is too large (base64 string length check)
    if (menuImg && menuImg.length > 2000000) { // ~2MB base64 string for 1MB file
      return NextResponse.json(
        { error: 'Image is too large. Please use a smaller image (max 1MB).' },
        { status: 400 }
      )
    }

    const menuItem = await withRetry(async () => {
      return await (prisma as any).menuItem.update({
        where: { menuItemId: itemId } as any,
        data: {
          name: name || null,
          kitchenName: kitchenName || null,
          labelName: labelName || null,
          colorCode: colorCode || null,
          calories: calories || null,
          description: description || null,
          itemSize: itemSize || null,
          skuPlu: skuPlu ? BigInt(skuPlu) : null,
          itemContainAlcohol: itemContainAlcohol !== undefined ? (itemContainAlcohol ? 1 : 0) : undefined,
          menuImg: menuImg || null,
          priceStrategy: priceStrategy ? parseInt(priceStrategy) : null,
          basePrice: basePrice ? parseFloat(basePrice) : null,
          isPrice: isPrice !== undefined ? (isPrice ? 1 : 0) : undefined,
          isActive: isActive !== undefined ? (isActive ? 1 : 0) : undefined,
          stockinhand: stockinhand ? parseFloat(stockinhand) : null,
          isOutStock: isOutStock !== undefined ? (isOutStock ? 1 : 0) : null,
          isPosVisible: isPosVisible !== undefined ? (isPosVisible ? 1 : 0) : null,
          isKioskOrderPay: isKioskOrderPay !== undefined ? (isKioskOrderPay ? 1 : 0) : null,
          isOnlineOrderByApp: isOnlineOrderByApp !== undefined ? (isOnlineOrderByApp ? 1 : 0) : null,
          isOnlineOrdering: isOnlineOrdering !== undefined ? (isOnlineOrdering ? 1 : 0) : null,
          isCustomerInvoice: isCustomerInvoice !== undefined ? (isCustomerInvoice ? 1 : 0) : null,
          taxCode: taxCode || null,
          inheritTaxInclusion: inheritTaxInclusion !== undefined ? inheritTaxInclusion : undefined,
          isTaxIncluded: isTaxIncluded !== undefined ? isTaxIncluded : undefined,
          inheritDiningTax: inheritDiningTax !== undefined ? inheritDiningTax : undefined,
          diningTaxEffect: diningTaxEffect || null,
          disqualifyDiningTaxExemption: disqualifyDiningTaxExemption !== undefined ? disqualifyDiningTaxExemption : undefined,
          inheritModifierGroup: inheritModifiers !== undefined ? inheritModifiers : undefined,
          menuCategoryCode: menuCategoryCode || null
        }
      })
    })

    // Replace menu item -> modifier group assignments
    try {
      // Fetch current item to get code
      const current = await (prisma as any).menuItem.findUnique({ where: { menuItemId: itemId } as any })
      const menuItemCode: string | null = current?.menuItemCode || null
      if (menuItemCode) {
        // Clear existing rows
        await (prisma as any).menuItemModifierGroup.deleteMany({ where: { menuItemCode } })

        const rowsToCreate: any[] = []
        const seenGroups = new Set<string>() // Track already added modifier groups

        // Inherit from category
        if (inheritModifiers && current?.menuCategoryCode) {
          const categoryCode = current.menuCategoryCode as string
          const categoryGroups = await (prisma as any).modifierGroup.findMany({
            where: { menuCategoryCode: categoryCode }
          })
          for (const g of categoryGroups) {
            if (g.modifierGroupCode && !seenGroups.has(g.modifierGroupCode)) {
              rowsToCreate.push({
                menuItemCode,
                modifierGroupCode: g.modifierGroupCode,
                inheritFromMenuGroup: 1,
                createdBy: parseInt(session.user.id),
                storeCode: process.env.STORE_CODE || null
              })
              seenGroups.add(g.modifierGroupCode)
            }
          }
        }

        // Add explicit selected modifier groups (these take precedence if already in inherited list)
        if (Array.isArray(selectedModifiers) && selectedModifiers.length > 0) {
          const groups = await (prisma as any).modifierGroup.findMany({
            where: { id: { in: selectedModifiers.map((n: any) => BigInt(n)) } }
          })
          for (const g of groups) {
            if (g.modifierGroupCode) {
              // If already added as inherited, update it to explicit
              if (seenGroups.has(g.modifierGroupCode)) {
                const index = rowsToCreate.findIndex(
                  (r) => r.menuItemCode === menuItemCode && r.modifierGroupCode === g.modifierGroupCode
                )
                if (index >= 0) {
                  rowsToCreate[index].inheritFromMenuGroup = 0
                }
              } else {
                rowsToCreate.push({
                  menuItemCode,
                  modifierGroupCode: g.modifierGroupCode,
                  inheritFromMenuGroup: 0,
                  createdBy: parseInt(session.user.id),
                  storeCode: process.env.STORE_CODE || null
                })
                seenGroups.add(g.modifierGroupCode)
              }
            }
          }
        }

        if (rowsToCreate.length > 0) {
          await (prisma as any).menuItemModifierGroup.createMany({ data: rowsToCreate, skipDuplicates: true })
        }
      }
    } catch (e) {
      console.error('Failed to update modifier group assignments for menu item:', e)
    }

    // Convert IDs to strings for JSON response
    const itemWithStringIds = {
      ...menuItem,
      menuItemId: (menuItem as any).menuItemId?.toString?.(),
      skuPlu: (menuItem as any).skuPlu ? (menuItem as any).skuPlu.toString() : null,
    }

    return NextResponse.json(itemWithStringIds)
  } catch (error) {
    console.error('Error updating menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const itemId = BigInt(resolvedParams.id)

    // Check if menu item exists
    const menuItem = await (prisma as any).menuItem.findUnique({
      where: { menuItemId: itemId } as any
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Now safe to delete the menu item
    await withRetry(async () => {
      await (prisma as any).menuItem.delete({
        where: { menuItemId: itemId } as any
      })
    })

    return NextResponse.json({ message: 'Menu item deleted successfully' })
  } catch (error) {
    console.error('Error deleting menu item:', error)
    
    // Handle foreign key constraint error specifically
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json({ 
        error: 'Cannot delete this menu item because it has related orders. Please remove all related data first.' 
      }, { status: 400 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}