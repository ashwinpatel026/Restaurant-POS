import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { Prisma } from '@prisma/master-client'
import { normalizeToStructuredFormat, MenuCategoryMapping, isStructuredFormat } from '@/lib/utils/menuItemFormat'

// Helper function to map menu item response
function mapMenuItemResponse(item: any, categories?: Array<{ menuCategoryCode: string; menuMasterCode: string }>): any {
  // Parse menuCategoryCode
  let menuCategoryCodeParsed: any = null;
  if (item.menuCategoryCode) {
    if (typeof item.menuCategoryCode === 'string') {
      try {
        menuCategoryCodeParsed = JSON.parse(item.menuCategoryCode);
      } catch {
        menuCategoryCodeParsed = item.menuCategoryCode;
      }
    } else {
      menuCategoryCodeParsed = item.menuCategoryCode;
    }
  }
  
  // If it's old format (simple array), convert to structured format if we have menuMasterCode and categories
  if (menuCategoryCodeParsed && Array.isArray(menuCategoryCodeParsed) && menuCategoryCodeParsed.length > 0) {
    const firstItem = menuCategoryCodeParsed[0];
    // Check if it's structured format
    if (!(firstItem && typeof firstItem === 'object' && 'menuMasterCode' in firstItem && 'menuCategoryCode' in firstItem)) {
      // Old format - convert to structured format
      const menuMasterCodeParsed = item.menuMasterCode 
        ? (Array.isArray(item.menuMasterCode) ? item.menuMasterCode : [item.menuMasterCode])
        : [];
      
      if (menuMasterCodeParsed.length > 0 && categories && categories.length > 0) {
        menuCategoryCodeParsed = normalizeToStructuredFormat(
          menuCategoryCodeParsed as string[],
          menuMasterCodeParsed,
          categories
        );
      }
    }
  }
  
  return {
    ...item,
    menuItemId: item.menuItemId.toString(),
    skuPlu: item.skuPlu?.toString() || null,
    basePrice: item.basePrice ? Number(item.basePrice) : null,
    cardPrice: item.cardPrice ? Number(item.cardPrice) : null,
    cashPrice: item.cashPrice ? Number(item.cashPrice) : null,
    stockinhand: item.stockinhand ? Number(item.stockinhand) : null,
    createdBy: item.createdBy?.toString() || null,
    updatedBy: item.updatedBy?.toString() || null,
    createdOn: item.createdOn?.toISOString() || null,
    updatedOn: item.updatedOn?.toISOString() || null,
    // Handle JSON fields
    prepZoneCode: item.prepZoneCode ? (typeof item.prepZoneCode === 'string' ? JSON.parse(item.prepZoneCode) : item.prepZoneCode) : null,
    menuCategoryCode: menuCategoryCodeParsed, // Return structured format
    menuMasterCode: item.menuMasterCode ? (() => {
      // Handle JSON field - can be array or single value
      if (Array.isArray(item.menuMasterCode)) {
        return item.menuMasterCode;
      }
      if (typeof item.menuMasterCode === 'string') {
        return [item.menuMasterCode];
      }
      return [item.menuMasterCode];
    })() : null,
    deptCode: item.deptCode || null,
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

    // Fetch categories for conversion (if needed)
    const allCategories = await masterPrisma.masterMenuCategory.findMany({
      select: {
        menuCategoryCode: true,
        menuMasterCode: true,
      },
    })

    const itemWithStringIds = {
      ...mapMenuItemResponse(menuItem, allCategories),
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
      forColorCode,
      calories,
      description,
      itemSize,
      skuPlu,
      barcode,
      itemContainAlcohol,
      menuImg,
      priceStrategy,
      cardPrice,
      cashPrice,
      basePrice,
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
      deptCode,
    } = body

    // Check if menuImg is too large
    if (menuImg && menuImg.length > 2000000) {
      return NextResponse.json(
        { error: 'Image is too large. Please use a smaller image (max 1MB).' },
        { status: 400 }
      )
    }

    // Handle menuMasterCode - can be string or array (JSON field)
    let processedMenuMasterCode: string[] | null = null;
    if (menuMasterCode !== undefined) {
      if (Array.isArray(menuMasterCode)) {
        processedMenuMasterCode = menuMasterCode.length > 0 ? menuMasterCode : null;
      } else if (typeof menuMasterCode === 'string' && menuMasterCode.length > 0) {
        processedMenuMasterCode = [menuMasterCode];
      }
    }

    // Handle menuCategoryCode - supports both structured format and old format
    let processedMenuCategoryCode: MenuCategoryMapping[] | null = null;
    
    if (menuCategoryCode !== undefined) {
      // Check if it's already in structured format
      if (isStructuredFormat(menuCategoryCode)) {
        processedMenuCategoryCode = menuCategoryCode as MenuCategoryMapping[];
      } else {
        // Old format: need to convert to structured format
        // Fetch categories to get their menuMasterCode mapping
        const allCategories = await masterPrisma.masterMenuCategory.findMany({
          select: {
            menuCategoryCode: true,
            menuMasterCode: true,
          },
        });
        
        if (processedMenuMasterCode && allCategories.length > 0) {
          // Convert old format to structured format
          let categoryCodes: string[] = [];
          if (Array.isArray(menuCategoryCode)) {
            categoryCodes = menuCategoryCode;
          } else if (typeof menuCategoryCode === 'string' && menuCategoryCode.length > 0) {
            try {
              const parsed = JSON.parse(menuCategoryCode);
              categoryCodes = Array.isArray(parsed) ? parsed : [menuCategoryCode];
            } catch {
              categoryCodes = [menuCategoryCode];
            }
          }
          
          processedMenuCategoryCode = normalizeToStructuredFormat(
            categoryCodes,
            processedMenuMasterCode,
            allCategories
          );
        }
      }
    }

    // Validate: if menuMasterCode is array, menuCategoryCode must have at least one entry per master
    if (processedMenuMasterCode && processedMenuCategoryCode) {
      const masterCodesSet = new Set(processedMenuMasterCode);
      const categoryMasterCodes = new Set(processedMenuCategoryCode.map(item => item.menuMasterCode));
      
      // Check that each master has at least one category
      for (const masterCode of masterCodesSet) {
        if (!categoryMasterCodes.has(masterCode)) {
          return NextResponse.json(
            { error: 'At least one category required for each menu master' },
            { status: 400 }
          );
        }
      }
    }

    // Store menuMasterCode as JSON array (always array format, even for single selection)
    const storedMenuMasterCode = processedMenuMasterCode !== undefined
      ? (processedMenuMasterCode && processedMenuMasterCode.length > 0
          ? processedMenuMasterCode
          : Prisma.JsonNull)
      : undefined;

    // Store menuCategoryCode as structured format or JsonNull
    const storedMenuCategoryCode = processedMenuCategoryCode !== undefined
      ? (processedMenuCategoryCode && processedMenuCategoryCode.length > 0
          ? processedMenuCategoryCode
          : Prisma.JsonNull)
      : undefined;

    const menuItem = await masterPrisma.masterMenuItem.update({
      where: { menuItemId: itemId },
      data: {
        name: name || null,
        kitchenName: kitchenName || null,
        labelName: labelName || null,
        colorCode: colorCode || null,
        deptCode: deptCode || null,
        forColorCode: forColorCode || null,
        calories: calories || null,
        description: description || null,
        itemSize: itemSize || null,
        skuPlu: skuPlu ? BigInt(skuPlu) : null,
        barcode: barcode || null,
        isAlcohol: itemContainAlcohol !== undefined ? (itemContainAlcohol ? 1 : 0) : undefined,
        menuImg: menuImg || null,
        priceStrategy: priceStrategy ? parseInt(String(priceStrategy)) : null,
        basePrice: basePrice !== undefined && basePrice !== null ? parseFloat(String(basePrice)) : null,
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
        menuMasterCode: storedMenuMasterCode as any,
        menuCategoryCode: storedMenuCategoryCode as any, // Store as structured format
        inheritTaxInclusion: inheritTaxInclusion !== undefined ? inheritTaxInclusion : undefined,
        isTaxIncluded: isTaxIncluded !== undefined ? isTaxIncluded : undefined,
        inheritDiningTax: inheritDiningTax !== undefined ? inheritDiningTax : undefined,
        diningTaxEffect: diningTaxEffect || null,
        disqualifyDiningTaxExemption: disqualifyDiningTaxExemption !== undefined ? disqualifyDiningTaxExemption : undefined,
        inheritModifierGroup: inheritModifiers !== undefined ? inheritModifiers : undefined,
        prepZoneCode: prepZoneCodes && prepZoneCodes.length > 0 ? prepZoneCodes : null,
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
          const categoryCodes: string[] = Array.isArray(menuItem.menuCategoryCode) 
            ? menuItem.menuCategoryCode.filter((code): code is string => typeof code === 'string')
            : typeof menuItem.menuCategoryCode === 'string' 
              ? [menuItem.menuCategoryCode]
              : []
          const categoryModifiers = categoryCodes.length > 0
            ? await masterPrisma.masterMenuCategoryModifier.findMany({
                where: { menuCategoryCode: { in: categoryCodes } }
              })
            : []

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

