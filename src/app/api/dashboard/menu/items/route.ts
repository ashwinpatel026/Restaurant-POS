import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma, checkConnection } from '@/lib/database'
import { checkDuplicate } from '@/lib/validation'
import { normalizeToStructuredFormat, MenuCategoryMapping, isStructuredFormat } from '@/lib/utils/menuItemFormat'

// Helper function to generate unique menu item code
async function generateMenuItemCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}MI`
  
  // Get all menu item codes that match the WL pattern for this store
  const menuItems = await prisma.menuItem.findMany({
    where: {
      menuItemCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { menuItemCode: true },
    orderBy: { menuItemId: 'desc' }
  })

  let nextNumber = 1
  
  if (menuItems.length > 0) {
    // Extract number from codes like "WLLOC01MI1", "WLLOC01MI2", etc.
    const numbers = menuItems
      .map(menuItem => {
        if (!menuItem.menuItemCode) return 0
        const match = menuItem.menuItemCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + MI + number starting from 1
  return `${prefix}${nextNumber}`
}

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view menu items
    if (!(await checkLocationPermission(session.user.role, 'menu.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }
    
    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const categoryCode = searchParams.get('categoryCode')
    const menuCategoryCode = searchParams.get('menuCategoryCode')
    const isActive = searchParams.get('isActive')

    const where: any = {
      ...storeFilter,
      isDelete: false,
    }
    const searchCode = menuCategoryCode || categoryCode
    // Note: Filtering by menuCategoryCode in structured format requires special handling
    // We'll filter after fetching and converting to structured format
    if (isActive !== null) {
      where.isActive = isActive === 'true' ? 1 : 0
    }

    const menuItems = await prisma.menuItem.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    // Fetch all categories for conversion (if needed)
    const allCategories = await prisma.menuCategory.findMany({
      where: {
        ...storeFilter,
        isDelete: false,
      },
      select: {
        menuCategoryCode: true,
        menuMasterCode: true,
      },
    })

    // Convert menuItemId to string and normalize menuCategoryCode to structured format
    let itemsWithStringIds = (menuItems as any[]).map((item: any) => {
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
      
      // If it's old format (simple array), convert to structured format
      if (menuCategoryCodeParsed && Array.isArray(menuCategoryCodeParsed) && menuCategoryCodeParsed.length > 0) {
        const firstItem = menuCategoryCodeParsed[0];
        // Check if it's structured format
        if (!(firstItem && typeof firstItem === 'object' && 'menuMasterCode' in firstItem && 'menuCategoryCode' in firstItem)) {
          // Old format - convert to structured format
          const menuMasterCodeParsed = item.menuMasterCode 
            ? (Array.isArray(item.menuMasterCode) ? item.menuMasterCode : [item.menuMasterCode])
            : [];
          
          if (menuMasterCodeParsed.length > 0 && allCategories.length > 0) {
            menuCategoryCodeParsed = normalizeToStructuredFormat(
              menuCategoryCodeParsed as string[],
              menuMasterCodeParsed,
              allCategories
            );
          }
        }
      }
      
      return {
        ...item,
        menuItemId: (item.menuItemId ?? item.tblMenuItemId)?.toString?.() ?? undefined,
        skuPlu: item.skuPlu ? item.skuPlu.toString() : null,
        menuCategoryCode: menuCategoryCodeParsed, // Return structured format
        menuMasterCode: item.menuMasterCode ? (() => {
          if (Array.isArray(item.menuMasterCode)) {
            return item.menuMasterCode;
          }
          if (typeof item.menuMasterCode === 'string') {
            return [item.menuMasterCode];
          }
          return [item.menuMasterCode];
        })() : null,
      };
    })

    // Filter by category code if specified (for structured format)
    if (searchCode) {
      itemsWithStringIds = itemsWithStringIds.filter((item: any) => {
        if (!item.menuCategoryCode) return false;
        if (Array.isArray(item.menuCategoryCode)) {
          // Check if it's structured format
          const firstItem = item.menuCategoryCode[0];
          if (firstItem && typeof firstItem === 'object' && 'menuCategoryCode' in firstItem) {
            // Structured format - check menuCategoryCode field
            return item.menuCategoryCode.some((entry: any) => entry.menuCategoryCode === searchCode);
          } else {
            // Old format - check directly
            return item.menuCategoryCode.includes(searchCode);
          }
        }
        return false;
      });
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to create menu items
    if (!(await checkLocationPermission(session.user.role, 'menu.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

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
      disableInPOS,
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
      // New fields for modifier assignment
      selectedModifiers,
      inheritModifiers,
      modifierAssignments,
      // Prep time fields
      prepZoneCodes,
      dimension,
      weight,
      prepTimeMinutes,
      deptCode
    } = body

    // Check for duplicate name
    if (name) {
      const isDuplicate = await checkDuplicate('menuItem', 'name', name, {
        storeCode: selectedStoreCode
      })
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Menu item with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Generate unique code for menu item for the selected store
    const menuItemCode = await generateMenuItemCode(selectedStoreCode)

    // Check if menuImg is too large (base64 string length check)
    if (menuImg && menuImg.length > 2000000) { // ~2MB base64 string for 1MB file
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
        const allCategories = await prisma.menuCategory.findMany({
          where: {
            ...storeFilter,
            ...(selectedStoreCode ? { storeCode: selectedStoreCode } : {})
          },
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

    const menuItem = await withRetry(async () => {
      return await (prisma as any).menuItem.create({
        data: {
          menuItemCode,
          menuMasterCode: processedMenuMasterCode && processedMenuMasterCode.length > 0
            ? processedMenuMasterCode
            : null,
          menuCategoryCode: processedMenuCategoryCode || null, // Store as structured format
          name: name || null,
          kitchenName: kitchenName || null,
          labelName: labelName || null,
          colorCode: colorCode || null,
          deptCode: deptCode || null,
          forColorCode: forColorCode || null,
          calories: calories || null,
          description: description || null,
          itemSize: itemSize || null,
          skuPlu: skuPlu ? (typeof skuPlu === 'string' ? BigInt(skuPlu) : BigInt(String(skuPlu))) : null,
          barcode: barcode || null,
          itemContainAlcohol: itemContainAlcohol ? 1 : 0,
          menuImg: menuImg || null,
          priceStrategy: priceStrategy ? parseInt(priceStrategy) : null,
          basePrice: basePrice !== undefined && basePrice !== null ? parseFloat(basePrice.toString()) : null,
          cardPrice: cardPrice !== undefined && cardPrice !== null ? parseFloat(cardPrice.toString()) : null,
          cashPrice: cashPrice !== undefined && cashPrice !== null ? parseFloat(cashPrice.toString()) : null,
          isPrice: isPrice !== undefined ? (isPrice ? 1 : 0) : 1,
          isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
          disableInPOS: disableInPOS !== undefined ? (disableInPOS ? 1 : 0) : 0,
          isDelete: false,
          stockinhand: stockinhand ? parseFloat(stockinhand) : null,
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
          createdBy: parseInt(session.user.id),
          storeCode: selectedStoreCode,
          syncSource: 'location' // Set sync_source to 'location' when created from dashboard
        }
      })
    })

    // Create prep time record if any prep time field is provided
    try {
      const createdItemCode: string | null = (menuItem as any).menuItemCode || null
      if (createdItemCode && (prepZoneCodes || dimension || weight || prepTimeMinutes)) {
        await (prisma as any).menuItemPrepTime.create({
          data: {
            menuItemCode: createdItemCode,
            prepZoneCode: prepZoneCodes && prepZoneCodes.length > 0 ? prepZoneCodes : null,
            dimension: dimension || null,
            weight: weight || null,
            prepTimeMinutes: prepTimeMinutes ? parseInt(prepTimeMinutes.toString()) : 0,
            createdBy: parseInt(session.user.id),
            storeCode: selectedStoreCode
          }
        })
      }
    } catch (e) {
      console.error('Failed to create prep time record:', e)
    }

    // Create menu item -> modifier group assignments
    try {
      const createdItemCode: string | null = (menuItem as any).menuItemCode || null
      if (createdItemCode) {
        const rowsToCreate: any[] = []
        const seenGroups = new Set<string>() // Track already added modifier groups

        // If inherit from category, add all modifier groups for the categories
        if (inheritModifiers && (menuItem as any).menuCategoryCode) {
          const categoryCodes = Array.isArray((menuItem as any).menuCategoryCode) 
            ? (menuItem as any).menuCategoryCode 
            : [(menuItem as any).menuCategoryCode]
          // Fetch modifier group codes assigned to these categories via junction table
          const mcmRows = await prisma.$queryRaw<Array<{ modifier_group_code: string }>>`
            SELECT modifier_group_code FROM tbl_menu_category_modifier 
            WHERE menu_category_code = ANY(${categoryCodes}::text[])
          `
          for (const row of mcmRows) {
            const code = row.modifier_group_code
            if (code && !seenGroups.has(code)) {
            rowsToCreate.push({
                menuItemCode: createdItemCode,
                modifierGroupCode: code,
                inheritFromMenuGroup: 1,
              isInheritFromMenuCategory: 1,
                isRequired: 0,
                isMultiselect: 0,
                minSelection: null,
                maxSelection: null,
                createdBy: parseInt(session.user.id),
                storeCode: selectedStoreCode,
                syncSource: 'location' // Set sync_source to 'location' when created from dashboard
              })
              seenGroups.add(code)
            }
          }
        }

        // Add explicit selected modifier groups (always allowed, independent of inheritance)
        if (Array.isArray(selectedModifiers) && selectedModifiers.length > 0) {
          const assignmentOptions: any = {}
          if (Array.isArray(modifierAssignments)) {
            for (const a of modifierAssignments) {
              if (a?.modifierId) assignmentOptions[a.modifierId] = a
            }
          }
          const groups = await (prisma as any).modifierGroup.findMany({
            where: { id: { in: selectedModifiers.map((n: any) => BigInt(n)) } }
          })
          for (const g of groups) {
            if (g.modifierGroupCode) {
              // Do not overwrite inherited rows; add only explicit ones when not inheriting
              if (!seenGroups.has(g.modifierGroupCode)) {
                const opts = assignmentOptions[Number(g.id)] || {}
                rowsToCreate.push({
                  menuItemCode: createdItemCode,
                  modifierGroupCode: g.modifierGroupCode,
                  inheritFromMenuGroup: 0,
                  isInheritFromMenuCategory: 0,
                  isRequired: typeof opts.isRequired === 'number' ? opts.isRequired : 0,
                  isMultiselect: typeof opts.isMultiselect === 'number' ? opts.isMultiselect : 0,
                  minSelection: typeof opts.minSelection === 'number' ? opts.minSelection : null,
                  maxSelection: typeof opts.maxSelection === 'number' ? opts.maxSelection : null,
                  createdBy: parseInt(session.user.id),
                  storeCode: selectedStoreCode,
                  syncSource: 'location' // Set sync_source to 'location' when created from dashboard
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
      console.error('Failed to assign modifier groups to menu item:', e)
    }

    // Convert IDs to strings for JSON response
    const itemWithStringIds = {
      ...menuItem,
      menuItemId: (menuItem as any).menuItemId?.toString?.(),
      skuPlu: (menuItem as any).skuPlu ? (menuItem as any).skuPlu.toString() : null,
    }

    return NextResponse.json(itemWithStringIds, { status: 201 })
  } catch (error) {
    console.error('Error creating menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}