import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { Prisma } from '@prisma/master-client'
import { checkDuplicate } from '@/lib/validation'
import { normalizeToStructuredFormat, MenuCategoryMapping, isStructuredFormat, convertToSimpleFormat } from '@/lib/utils/menuItemFormat'

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
    const searchCode = menuCategoryCode || categoryCode
    
    if (searchCode) {
      // For structured format, we need to search within the JSON array
      // Use raw SQL query to handle both old and new formats
      // This will search for the category code in both:
      // - Old format: ["MC1", "MC2"] 
      // - New format: [{"menuMasterCode": "MM1", "menuCategoryCode": "MC1"}, ...]
      const escapedCode = searchCode.replace(/'/g, "''")
      const rawWhere = `(
        menu_category_code::text LIKE '%"${escapedCode}"%' OR
        menu_category_code::text LIKE '%"menuCategoryCode":"${escapedCode}"%'
      )`
      // Use $queryRaw for complex JSON queries, but for now use simpler approach
      // We'll filter after fetching if needed, or use Prisma's JSON filtering
      where.menuCategoryCode = {
        // This will work for old format, for new format we'll filter in memory
        array_contains: searchCode
      }
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true' ? 1 : 0
    }

    const menuItems = await masterPrisma.masterMenuItem.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    // Fetch all categories once for conversion (if needed)
    const allCategories = await masterPrisma.masterMenuCategory.findMany({
      select: {
        menuCategoryCode: true,
        menuMasterCode: true,
      },
    })

    // Map items and filter if needed (for structured format category filtering)
    let itemsWithStringIds = menuItems.map(item => mapMenuItemResponse(item, allCategories))
    
    // If filtering by category code and we have results, also check structured format
    if (searchCode && itemsWithStringIds.length > 0) {
      // Check if any items have structured format that matches
      const structuredMatches = menuItems.filter(item => {
        if (!item.menuCategoryCode) return false
        let parsed: any = item.menuCategoryCode
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed)
          } catch {
            return false
          }
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0]
          // Structured format
          if (first && typeof first === 'object' && 'menuCategoryCode' in first) {
            return parsed.some((p: any) => p.menuCategoryCode === searchCode)
          }
        }
        return false
      })
      
      // Merge results (avoid duplicates)
      if (structuredMatches.length > 0) {
        const existingIds = new Set(itemsWithStringIds.map(i => i.menuItemId))
        const additionalItems = structuredMatches
          .filter(item => !existingIds.has(item.menuItemId.toString()))
          .map(item => mapMenuItemResponse(item, allCategories))
        itemsWithStringIds = [...itemsWithStringIds, ...additionalItems]
      }
    }

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

    // Handle menuMasterCode - can be string or array (JSON field)
    let processedMenuMasterCode: string[] | null = null;
    if (menuMasterCode) {
      if (Array.isArray(menuMasterCode)) {
        processedMenuMasterCode = menuMasterCode.length > 0 ? menuMasterCode : null;
      } else if (typeof menuMasterCode === 'string') {
        processedMenuMasterCode = [menuMasterCode];
      }
    }

    // Handle menuCategoryCode - supports both structured format and old format
    let processedMenuCategoryCode: MenuCategoryMapping[] | null = null;
    
    if (menuCategoryCode) {
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
          } else if (typeof menuCategoryCode === 'string') {
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
    const storedMenuMasterCode = processedMenuMasterCode && processedMenuMasterCode.length > 0
      ? processedMenuMasterCode
      : Prisma.JsonNull;

    // Store menuCategoryCode as structured format or JsonNull
    const storedMenuCategoryCode = processedMenuCategoryCode && processedMenuCategoryCode.length > 0
      ? processedMenuCategoryCode
      : Prisma.JsonNull;

    const menuItem = await masterPrisma.masterMenuItem.create({
      data: {
        menuItemCode,
        menuMasterCode: storedMenuMasterCode as any,
        menuCategoryCode: storedMenuCategoryCode as any, // Store as structured format
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

