import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { checkDuplicate } from '@/lib/validation'

// Helper function to generate unique menu item code
async function generateMenuItemCode(): Promise<string> {
  const latestItem = await masterPrisma.masterMenuItem.findFirst({
    orderBy: { menuItemId: 'desc' },
    select: { menuItemCode: true }
  })

  let nextNumber = 1
  
  if (latestItem?.menuItemCode) {
    // Extract number from code like "MI1", "MI2", etc.
    const match = latestItem.menuItemCode.match(/^MI(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as MI + number starting from 1
  return `MI${nextNumber}`
}

// Helper function to map menu item response
function mapMenuItemResponse(item: any) {
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
    menuCategoryCode: item.menuCategoryCode ? (typeof item.menuCategoryCode === 'string' ? JSON.parse(item.menuCategoryCode) : item.menuCategoryCode) : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryCode = searchParams.get('categoryCode')
    const menuCategoryCode = searchParams.get('menuCategoryCode')
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (menuCategoryCode || categoryCode) {
      // menuCategoryCode is stored as JSON array, so we need to use array_contains filter
      where.menuCategoryCode = {
        array_contains: menuCategoryCode || categoryCode
      }
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true' ? 1 : 0
    }

    const menuItems = await masterPrisma.masterMenuItem.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    const itemsWithStringIds = menuItems.map(mapMenuItemResponse)

    return NextResponse.json(itemsWithStringIds)
  } catch (error) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Check for duplicate name
    if (name) {
      const isDuplicate = await checkDuplicate('masterMenuItem', 'name', name)
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Menu item with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Generate unique code for menu item
    const menuItemCode = await generateMenuItemCode()

    // Check if menuImg is too large (base64 string length check)
    if (menuImg && menuImg.length > 2000000) {
      return NextResponse.json(
        { error: 'Image is too large. Please use a smaller image (max 1MB).' },
        { status: 400 }
      )
    }

    const menuItem = await masterPrisma.masterMenuItem.create({
      data: {
        menuItemCode,
        menuMasterCode: menuMasterCode || null,
        menuCategoryCode: Array.isArray(menuCategoryCode) && menuCategoryCode.length > 0 
          ? menuCategoryCode 
          : menuCategoryCode || null,
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
        isAlcohol: itemContainAlcohol ? 1 : 0,
        menuImg: menuImg || null,
        priceStrategy: priceStrategy ? parseInt(String(priceStrategy)) : null,
        basePrice: basePrice !== undefined && basePrice !== null ? parseFloat(String(basePrice)) : null,
        cardPrice: cardPrice !== undefined && cardPrice !== null ? parseFloat(String(cardPrice)) : null,
        cashPrice: cashPrice !== undefined && cashPrice !== null ? parseFloat(String(cashPrice)) : null,
        isPrice: isPrice !== undefined ? (isPrice ? 1 : 0) : 1,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
        stockinhand: stockinhand ? parseFloat(String(stockinhand)) : null,
        isOutStock: isOutStock !== undefined ? (isOutStock ? 1 : 0) : null,
        isPosVisible: isPosVisible !== undefined ? (isPosVisible ? 1 : 0) : null,
        isKioskOrderPay: isKioskOrderPay !== undefined ? (isKioskOrderPay ? 1 : 0) : null,
        isOnlineOrderByApp: isOnlineOrderByApp !== undefined ? (isOnlineOrderByApp ? 1 : 0) : null,
        isOnlineOrdering: isOnlineOrdering !== undefined ? (isOnlineOrdering ? 1 : 0) : null,
        isCustomerInvoice: isCustomerInvoice !== undefined ? (isCustomerInvoice ? 1 : 0) : null,
        taxCode: taxCode || null,
        inheritTaxInclusion: inheritTaxInclusion !== undefined ? inheritTaxInclusion : true,
        isTaxIncluded: isTaxIncluded !== undefined ? isTaxIncluded : false,
        inheritDiningTax: inheritDiningTax !== undefined ? inheritDiningTax : true,
        diningTaxEffect: diningTaxEffect || 'No Effect',
        disqualifyDiningTaxExemption: disqualifyDiningTaxExemption !== undefined ? disqualifyDiningTaxExemption : false,
        inheritModifierGroup: inheritModifiers !== undefined ? inheritModifiers : true,
        prepZoneCode: prepZoneCodes && prepZoneCodes.length > 0 ? prepZoneCodes : null,
        createdBy: admin.adminId,
      }
    })

    // Create menu item -> modifier group assignments
    try {
      if (menuItem.menuItemCode) {
        const rowsToCreate: any[] = []
        const seenGroups = new Set<string>()

        // If inherit from categories, add all modifier groups for the categories
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
          const assignmentOptions: any = {}
          if (Array.isArray(modifierAssignments)) {
            for (const a of modifierAssignments) {
              if (a?.modifierId) assignmentOptions[a.modifierId] = a
            }
          }

          const groups = await masterPrisma.masterModifierGroup.findMany({
            where: { id: { in: selectedModifiers.map((n: any) => BigInt(n)) } }
          })

          for (const g of groups) {
            if (g.modifierGroupCode && !seenGroups.has(g.modifierGroupCode)) {
              const opts = assignmentOptions[Number(g.id)] || {}
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
      console.error('Failed to assign modifier groups to menu item:', e)
    }

    return NextResponse.json(mapMenuItemResponse(menuItem), { status: 201 })
  } catch (error) {
    console.error('Error creating menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

