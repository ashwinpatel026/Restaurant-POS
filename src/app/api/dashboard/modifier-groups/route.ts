import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'
import { Prisma } from '@prisma/client'
import { checkDuplicate } from '@/lib/validation'

// Helper function to sanitize prefix array
function sanitizePrefix(input: unknown): string[] {
  if (!input) {
    return []
  }

  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : []

  const unique = new Set<string>()

  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        unique.add(trimmed)
      }
    }
  }

  return Array.from(unique)
}

// Helper function to normalize prefix from JSON
function normalizePrefix(value: unknown): string[] {
  if (!value) return []
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []
  return values
    .map((v) => (typeof v === 'string' ? v.trim() : String(v).trim()))
    .filter((v) => v)
}

// Helper function to generate unique modifier group code
async function generateModifierGroupCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}MOD`
  
  // Get all modifier group codes that match the WL pattern for this store
  const modifierGroups = await (prisma as any).modifierGroup.findMany({
    where: {
      modifierGroupCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { modifierGroupCode: true },
    orderBy: { id: 'desc' }
  })

  let nextNumber = 1
  
  if (modifierGroups.length > 0) {
    // Extract number from codes like "WLLOC01MOD1", "WLLOC01MOD2", etc.
    const numbers = modifierGroups
      .map((group: any) => {
        const match = group.modifierGroupCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + MOD + number starting from 1
  return `${prefix}${nextNumber}`
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view modifiers
    if (!(await checkLocationPermission(session.user.role, 'modifiers.view'))) {
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

    const filterCategory = searchParams.get('menuCategoryCode') || undefined

    // Use parameterized query instead of raw SQL with string interpolation
    let groups: any[]
    
    if (filterCategory) {
      // If filtering by category, use a more efficient query
      const assignments = await prisma.$queryRaw<Array<{ modifier_group_code: string, menu_category_code: string, category_name: string }>>`
        SELECT DISTINCT mcm.modifier_group_code, mcm.menu_category_code, mc.name AS category_name
        FROM tbl_menu_category_modifier mcm
        JOIN tbl_menu_category mc ON mc.menu_category_code = mcm.menu_category_code
        WHERE mcm.menu_category_code = ${filterCategory}
      `
      
      const groupCodes = assignments.map(a => a.modifier_group_code).filter(Boolean)
      if (groupCodes.length === 0) {
        return NextResponse.json([])
      }
      
      groups = await (prisma as any).modifierGroup.findMany({
        where: {
          modifierGroupCode: { in: groupCodes },
          ...storeFilter
        },
        orderBy: { createdOn: 'desc' }
      })
    } else {
      // Fetch all groups filtered by store
      groups = await (prisma as any).modifierGroup.findMany({
        where: {
          ...storeFilter
        },
        orderBy: { createdOn: 'desc' }
      })
    }

    // Fetch category assignments efficiently using parameterized query
    const groupCodes = groups.map((g: any) => g.modifierGroupCode).filter(Boolean)
    let assignments: Array<{ modifier_group_code: string, menu_category_code: string, category_name: string }> = []
    
    if (groupCodes.length > 0) {
      // Batch process in chunks to avoid very large queries
      const chunkSize = 100
      const chunks: string[][] = []
      for (let i = 0; i < groupCodes.length; i += chunkSize) {
        chunks.push(groupCodes.slice(i, i + chunkSize))
      }
      
      // Process chunks in parallel
      const assignmentPromises = chunks.map(chunk => 
        prisma.$queryRaw<Array<{ modifier_group_code: string, menu_category_code: string, category_name: string }>>`
          SELECT mcm.modifier_group_code, mcm.menu_category_code, mc.name AS category_name
          FROM tbl_menu_category_modifier mcm
          JOIN tbl_menu_category mc ON mc.menu_category_code = mcm.menu_category_code
          WHERE mcm.modifier_group_code = ANY(${chunk}::text[])
        `
      )
      
      const results = await Promise.all(assignmentPromises)
      assignments = results.flat()
    }

    // Map assignments efficiently
    const codeToCategories = new Map<string, {code:string,name:string}[]>()
    for (const row of assignments) {
      const list = codeToCategories.get(row.modifier_group_code) || []
      list.push({ code: row.menu_category_code, name: row.category_name })
      codeToCategories.set(row.modifier_group_code, list)
    }

    const data = groups.map((g: any) => ({
      ...g,
      id: g.id.toString(),
      prefix: normalizePrefix(g.prefix),
      assignedCategories: codeToCategories.get(g.modifierGroupCode || '') || []
    }))

    // Cache response for 60 seconds
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Error fetching modifier groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to create modifiers
    if (!(await checkLocationPermission(session.user.role, 'modifiers.create'))) {
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

    const body = await request.json()
    const {
      groupName,
      labelName,
      isRequired = 0,
      isMultiselect = 0,
      minSelection,
      maxSelection,
      showDefaultTop = 0,
      inheritFromMenuGroup = 0,
      priceStrategy = 1,
      price,
      prefix,
      isActive = 1,
    } = body

    // Check for duplicate name
    if (groupName) {
      const isDuplicate = await checkDuplicate('modifierGroup', 'groupName', groupName, {
        storeCode: selectedStoreCode
      })
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Modifier group with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Generate unique modifier group code for the selected store
    const modifierGroupCode = await generateModifierGroupCode(selectedStoreCode)
    const prefixes = sanitizePrefix(prefix)

    // Handle price based on priceStrategy
    // If priceStrategy is 1 or 2, set price to null
    // If priceStrategy is 3, save the price value (even if it's 0)
    let finalPrice: number | null = null
    if (priceStrategy === 3) {
      if (typeof price === 'number') {
        finalPrice = parseFloat(price.toString())
      } else if (price !== undefined && price !== null) {
        const parsedPrice = parseFloat(String(price))
        finalPrice = isNaN(parsedPrice) ? null : parsedPrice
      } else {
        finalPrice = null
      }
    }

    const groupData: Record<string, unknown> = {
      modifierGroupCode,
      groupName: groupName || null,
      labelName: labelName || null,
      isRequired,
      isMultiselect,
      minSelection: typeof minSelection === 'number' ? minSelection : null,
      maxSelection: typeof maxSelection === 'number' ? maxSelection : null,
      showDefaultTop,
      inheritFromMenuGroup,
      priceStrategy,
      price: finalPrice,
      isActive,
      createdBy: parseInt(session.user.id),
      storeCode: selectedStoreCode,
      syncSource: 'location', // Set sync_source to 'location' when created from dashboard
    }

    if (prefixes.length > 0) {
      groupData.prefix = prefixes
    } else {
      groupData.prefix = Prisma.JsonNull
    }

    const created = await (prisma as any).modifierGroup.create({
      data: groupData,
    })

    const data = { ...created, id: created.id.toString() }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating modifier group:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


