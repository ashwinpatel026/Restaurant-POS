import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, checkConnection } from '@/lib/database'
import { generateUniqueCode } from '@/lib/codeGenerator'

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
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryCode = searchParams.get('categoryCode')
    const menuCategoryCode = searchParams.get('menuCategoryCode')
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (menuCategoryCode || categoryCode) {
      where.menuCategoryCode = menuCategoryCode || categoryCode
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true' ? 1 : 0
    }

    const menuItems = await prisma.menuItem.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    // Convert menuItemId to string for JSON serialization
    const itemsWithStringIds = (menuItems as any[]).map((item: any) => ({
      ...item,
      menuItemId: (item.menuItemId ?? item.tblMenuItemId)?.toString?.() ?? undefined,
      skuPlu: item.skuPlu ? item.skuPlu.toString() : null,
    }))

    // Cache response for 60 seconds
    return NextResponse.json(itemsWithStringIds, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
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
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      inheritModifiers,
      modifierAssignments,
      // Prep time fields
      prepZoneCode,
      dimension,
      weight,
      prepTimeMinutes
    } = body

    // Generate unique code for menu item
    const menuItemCode = await generateUniqueCode('menuItem', 'menuItemCode')

    // Check if menuImg is too large (base64 string length check)
    if (menuImg && menuImg.length > 2000000) { // ~2MB base64 string for 1MB file
      return NextResponse.json(
        { error: 'Image is too large. Please use a smaller image (max 1MB).' },
        { status: 400 }
      )
    }

    const menuItem = await withRetry(async () => {
      return await (prisma as any).menuItem.create({
        data: {
          menuItemCode,
          menuCategoryCode: menuCategoryCode || null,
          name: name || null,
          kitchenName: kitchenName || null,
          labelName: labelName || null,
          colorCode: colorCode || null,
          calories: calories || null,
          description: description || null,
          itemSize: itemSize || null,
          skuPlu: skuPlu ? (typeof skuPlu === 'string' ? BigInt(skuPlu) : BigInt(String(skuPlu))) : null,
          itemContainAlcohol: itemContainAlcohol ? 1 : 0,
          menuImg: menuImg || null,
          priceStrategy: priceStrategy ? parseInt(priceStrategy) : null,
          basePrice: basePrice != null ? parseFloat(basePrice) : null,
          isPrice: isPrice !== undefined ? (isPrice ? 1 : 0) : 1,
          isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
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
          createdBy: parseInt(session.user.id),
          storeCode: process.env.STORE_CODE || null
        }
      })
    })

    // Create prep time record if any prep time field is provided
    try {
      const createdItemCode: string | null = (menuItem as any).menuItemCode || null
      if (createdItemCode && (prepZoneCode || dimension || weight || prepTimeMinutes)) {
        await (prisma as any).menuItemPrepTime.create({
          data: {
            menuItemCode: createdItemCode,
            prepZoneCode: prepZoneCode || null,
            dimension: dimension || null,
            weight: weight || null,
            prepTimeMinutes: prepTimeMinutes ? parseInt(prepTimeMinutes.toString()) : 0,
            createdBy: parseInt(session.user.id),
            storeCode: process.env.STORE_CODE || null
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

        // If inherit from category, add all modifier groups for the category
        if (inheritModifiers && (menuItem as any).menuCategoryCode) {
          const categoryCode = (menuItem as any).menuCategoryCode as string
          // Fetch modifier group codes assigned to this category via junction table
          const mcmRows = await prisma.$queryRaw<Array<{ modifier_group_code: string }>>`
            SELECT modifier_group_code FROM tbl_menu_category_modifier 
            WHERE menu_category_code = ${categoryCode}
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
                storeCode: process.env.STORE_CODE || null
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