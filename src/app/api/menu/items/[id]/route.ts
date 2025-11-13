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
                inheritFromMenuGroup: assignment.inheritFromMenuGroup,
                isInheritFromMenuCategory: (assignment as any).isInheritFromMenuCategory,
                isRequired: assignment.isRequired ?? 0,
                isMultiselect: assignment.isMultiselect ?? 0,
                minSelection: assignment.minSelection ?? null,
                maxSelection: assignment.maxSelection ?? null
              })
            }
          }
        }
      }
    }

    // Fetch prep time data if exists
    let prepTimeData = null
    if (menuItemCode) {
      const prepTime = await (prisma as any).menuItemPrepTime.findFirst({
        where: { menuItemCode }
      })
      if (prepTime) {
        prepTimeData = {
          prepZoneCode: prepTime.prepZoneCode, // This will be parsed in the form component
          dimension: prepTime.dimension,
          weight: prepTime.weight,
          prepTimeMinutes: prepTime.prepTimeMinutes
        }
      }
    }

    // Convert IDs to strings for JSON response
    const itemWithStringIds = {
      ...menuItem,
      menuItemId: (menuItem as any).menuItemId?.toString?.(),
      skuPlu: (menuItem as any).skuPlu ? (menuItem as any).skuPlu.toString() : null,
      assignedModifiers: assignedModifierGroups,
      inheritModifiers: inheritModifiersFlag,
      // Use prepZoneCode from MenuItem if available, otherwise from MenuItemPrepTime
      prepZoneCode: (menuItem as any).prepZoneCode || prepTimeData?.prepZoneCode || null,
      ...(prepTimeData || {})
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
      cardPrice,
      cashPrice,
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
    inheritModifiers,
    modifierAssignments,
    // Prep time fields
    prepZoneCodes,
    dimension,
    weight,
    prepTimeMinutes
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
          cardPrice: cardPrice !== undefined && cardPrice !== null ? parseFloat(cardPrice.toString()) : null,
          cashPrice: cashPrice !== undefined && cashPrice !== null ? parseFloat(cashPrice.toString()) : null,
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
          prepZoneCode: prepZoneCodes && prepZoneCodes.length > 0 ? prepZoneCodes : null,
          menuCategoryCode: menuCategoryCode || null
        }
      })
    })

    // Update or create prep time record
    try {
      const current = await (prisma as any).menuItem.findUnique({ where: { menuItemId: itemId } as any })
      const menuItemCode: string | null = current?.menuItemCode || null
      if (menuItemCode) {
        // Check if prep time record exists
        const existingPrepTime = await (prisma as any).menuItemPrepTime.findFirst({
          where: { menuItemCode }
        })

        if (prepZoneCodes || dimension || weight || prepTimeMinutes) {
          // Update or create prep time record if any prep time field is provided
          if (existingPrepTime) {
            await (prisma as any).menuItemPrepTime.update({
              where: { id: existingPrepTime.id },
              data: {
                prepZoneCode: prepZoneCodes && prepZoneCodes.length > 0 ? prepZoneCodes : null,
                dimension: dimension || null,
                weight: weight || null,
                prepTimeMinutes: prepTimeMinutes ? parseInt(prepTimeMinutes.toString()) : 0,
                updatedBy: parseInt(session.user.id),
                updatedOn: new Date()
              }
            })
          } else {
            await (prisma as any).menuItemPrepTime.create({
              data: {
                menuItemCode: menuItemCode,
                prepZoneCode: prepZoneCodes && prepZoneCodes.length > 0 ? prepZoneCodes : null,
                dimension: dimension || null,
                weight: weight || null,
                prepTimeMinutes: prepTimeMinutes ? parseInt(prepTimeMinutes.toString()) : 0,
                createdBy: parseInt(session.user.id),
                storeCode: process.env.STORE_CODE || null
              }
            })
          }
        } else if (existingPrepTime) {
          // Delete prep time record if all prep time fields are cleared
          await (prisma as any).menuItemPrepTime.delete({
            where: { id: existingPrepTime.id }
          })
        }
      }
    } catch (e) {
      console.error('Failed to update prep time record:', e)
    }

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
          const mcmRows = await prisma.$queryRawUnsafe<Array<{ modifier_group_code: string }>>(
            `SELECT modifier_group_code FROM tbl_menu_category_modifier WHERE menu_category_code = $1`,
            categoryCode
          )
          for (const row of mcmRows) {
            const code = row.modifier_group_code
            if (code && !seenGroups.has(code)) {
              rowsToCreate.push({
                menuItemCode,
                modifierGroupCode: code,
                inheritFromMenuGroup: 1,
                isInheritFromMenuCategory: 1,
                isRequired: 0,
                isMultiselect: 0,
                minSelection: null,
                maxSelection: null,
                createdBy: parseInt(session.user.id),
                storeCode: process.env.STORE_CODE || null
              })
              seenGroups.add(code)
            }
          }
        }

        // Add explicit selected modifier groups (always allowed, independent of inheritance)
        if (Array.isArray(selectedModifiers) && selectedModifiers.length > 0) {
          const groups = await (prisma as any).modifierGroup.findMany({
            where: { id: { in: selectedModifiers.map((n: any) => BigInt(n)) } }
          })
          for (const g of groups) {
            if (g.modifierGroupCode) {
              // Do not overwrite inherited rows; add only explicit ones when not inheriting
              if (!seenGroups.has(g.modifierGroupCode)) {
                const opts = Array.isArray(modifierAssignments)
                  ? (modifierAssignments.find((a: any) => Number(a.modifierId) === Number(g.id)) || {})
                  : {}
                rowsToCreate.push({
                  menuItemCode,
                  modifierGroupCode: g.modifierGroupCode,
                  inheritFromMenuGroup: 0,
                  isInheritFromMenuCategory: 0,
                  isRequired: typeof opts.isRequired === 'number' ? opts.isRequired : 0,
                  isMultiselect: typeof opts.isMultiselect === 'number' ? opts.isMultiselect : 0,
                  minSelection: typeof opts.minSelection === 'number' ? opts.minSelection : null,
                  maxSelection: typeof opts.maxSelection === 'number' ? opts.maxSelection : null,
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