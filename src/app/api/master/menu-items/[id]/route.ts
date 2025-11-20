import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to map menu item response
function mapMenuItemResponse(item: any) {
  return {
    ...item,
    menuItemId: item.menuItemId.toString(),
    skuPlu: item.skuPlu?.toString() || null,
    cardPrice: item.cardPrice ? Number(item.cardPrice) : null,
    cashPrice: item.cashPrice ? Number(item.cashPrice) : null,
    stockinhand: item.stockinhand ? Number(item.stockinhand) : null,
    createdBy: item.createdBy?.toString() || null,
    updatedBy: item.updatedBy?.toString() || null,
    createdOn: item.createdOn?.toISOString() || null,
    updatedOn: item.updatedOn?.toISOString() || null,
    // Handle JSON fields
    prepZoneCode: item.prepZoneCode ? (typeof item.prepZoneCode === 'string' ? JSON.parse(item.prepZoneCode) : item.prepZoneCode) : null,
    menuCategoryCode: item.menuCategoryCode ? (typeof item.menuCategoryCode === 'string' ? JSON.parse(item.menuCategoryCode) : item.menuCategoryCode) : null,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const itemId = BigInt(resolvedParams.id)

    const menuItem = await masterPrisma.masterMenuItem.findUnique({
      where: { menuItemId: itemId }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Fetch modifier group assignments for this menu item
    const assignedModifierGroups: any[] = []
    const inheritModifiersFlag = menuItem.inheritModifierGroup !== undefined 
      ? menuItem.inheritModifierGroup 
      : true

    if (menuItem.menuItemCode) {
      const assignments = await masterPrisma.masterMenuItemModifierGroup.findMany({
        where: { menuItemCode: menuItem.menuItemCode }
      })

      if (assignments.length > 0) {
        const groupCodes = assignments.map((a: any) => a.modifierGroupCode).filter(Boolean)
        
        if (groupCodes.length > 0) {
          const modifierGroups = await masterPrisma.masterModifierGroup.findMany({
            where: { modifierGroupCode: { in: groupCodes } }
          })

          for (const assignment of assignments) {
            const group = modifierGroups.find((g: any) => g.modifierGroupCode === assignment.modifierGroupCode)
            if (group) {
              assignedModifierGroups.push({
                id: group.id.toString(),
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

    const itemWithStringIds = {
      ...mapMenuItemResponse(menuItem),
      assignedModifiers: assignedModifierGroups,
      inheritModifiers: inheritModifiersFlag,
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
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
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
      menuMasterCode,
      menuCategoryCode,
      taxCode,
      inheritTaxInclusion,
      isTaxIncluded,
      inheritDiningTax,
      diningTaxEffect,
      disqualifyDiningTaxExemption,
      isActive,
      stockinhand,
      selectedModifiers,
      inheritModifiers,
      modifierAssignments,
      prepZoneCodes,
    } = body

    // Check if menuImg is too large
    if (menuImg && menuImg.length > 2000000) {
      return NextResponse.json(
        { error: 'Image is too large. Please use a smaller image (max 1MB).' },
        { status: 400 }
      )
    }

    const menuItem = await masterPrisma.masterMenuItem.update({
      where: { menuItemId: itemId },
      data: {
        name: name || null,
        kitchenName: kitchenName || null,
        labelName: labelName || null,
        colorCode: colorCode || null,
        calories: calories || null,
        description: description || null,
        itemSize: itemSize || null,
        skuPlu: skuPlu ? BigInt(skuPlu) : null,
        isAlcohol: itemContainAlcohol !== undefined ? (itemContainAlcohol ? 1 : 0) : undefined,
        menuImg: menuImg || null,
        priceStrategy: priceStrategy ? parseInt(String(priceStrategy)) : null,
        cardPrice: cardPrice !== undefined && cardPrice !== null ? parseFloat(String(cardPrice)) : null,
        cashPrice: cashPrice !== undefined && cashPrice !== null ? parseFloat(String(cashPrice)) : null,
        isPrice: isPrice !== undefined ? (isPrice ? 1 : 0) : undefined,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : undefined,
        stockinhand: stockinhand ? parseFloat(String(stockinhand)) : null,
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
        menuMasterCode: menuMasterCode || null,
        menuCategoryCode: Array.isArray(menuCategoryCode) && menuCategoryCode.length > 0 
          ? menuCategoryCode 
          : menuCategoryCode || null,
        updatedBy: admin.adminId,
        updatedOn: new Date()
      }
    })

    // Replace menu item -> modifier group assignments
    try {
      if (menuItem.menuItemCode) {
        // Clear existing rows
        await masterPrisma.masterMenuItemModifierGroup.deleteMany({
          where: { menuItemCode: menuItem.menuItemCode }
        })

        const rowsToCreate: any[] = []
        const seenGroups = new Set<string>()

        // Inherit from categories
        if (inheritModifiers && menuItem.menuCategoryCode) {
          const categoryCodes = Array.isArray(menuItem.menuCategoryCode) 
            ? menuItem.menuCategoryCode 
            : [menuItem.menuCategoryCode]
          const categoryModifiers = await masterPrisma.masterMenuCategoryModifier.findMany({
            where: { menuCategoryCode: { in: categoryCodes } }
          })

          for (const cm of categoryModifiers) {
            if (cm.modifierGroupCode && !seenGroups.has(cm.modifierGroupCode)) {
              rowsToCreate.push({
                menuItemCode: menuItem.menuItemCode,
                modifierGroupCode: cm.modifierGroupCode,
                inheritFromMenuGroup: 1,
                isInheritFromMenuCategory: 1,
                isRequired: 0,
                isMultiselect: 0,
                minSelection: null,
                maxSelection: null,
                createdBy: admin.adminId,
              })
              seenGroups.add(cm.modifierGroupCode)
            }
          }
        }

        // Add explicit selected modifier groups
        if (Array.isArray(selectedModifiers) && selectedModifiers.length > 0) {
          const groups = await masterPrisma.masterModifierGroup.findMany({
            where: { id: { in: selectedModifiers.map((n: any) => BigInt(n)) } }
          })

          for (const g of groups) {
            if (g.modifierGroupCode && !seenGroups.has(g.modifierGroupCode)) {
              const opts = Array.isArray(modifierAssignments)
                ? (modifierAssignments.find((a: any) => Number(a.modifierId) === Number(g.id)) || {})
                : {}
              rowsToCreate.push({
                menuItemCode: menuItem.menuItemCode,
                modifierGroupCode: g.modifierGroupCode,
                inheritFromMenuGroup: 0,
                isInheritFromMenuCategory: 0,
                isRequired: typeof opts.isRequired === 'number' ? opts.isRequired : 0,
                isMultiselect: typeof opts.isMultiselect === 'number' ? opts.isMultiselect : 0,
                minSelection: typeof opts.minSelection === 'number' ? opts.minSelection : null,
                maxSelection: typeof opts.maxSelection === 'number' ? opts.maxSelection : null,
                createdBy: admin.adminId,
              })
              seenGroups.add(g.modifierGroupCode)
            }
          }
        }

        if (rowsToCreate.length > 0) {
          await masterPrisma.masterMenuItemModifierGroup.createMany({
            data: rowsToCreate,
            skipDuplicates: true
          })
        }
      }
    } catch (e) {
      console.error('Failed to update modifier group assignments for menu item:', e)
    }

    return NextResponse.json(mapMenuItemResponse(menuItem))
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
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const itemId = BigInt(resolvedParams.id)

    // Check if menu item exists
    const menuItem = await masterPrisma.masterMenuItem.findUnique({
      where: { menuItemId: itemId }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Delete menu item modifier group relationships first
    if (menuItem.menuItemCode) {
      await masterPrisma.masterMenuItemModifierGroup.deleteMany({
        where: { menuItemCode: menuItem.menuItemCode }
      })
    }

    // Now safe to delete the menu item
    await masterPrisma.masterMenuItem.delete({
      where: { menuItemId: itemId }
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

