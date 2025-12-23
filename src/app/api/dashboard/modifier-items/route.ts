import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, canAccessStore, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to generate unique modifier item code
async function generateModifierItemCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}MOI`
  
  // Get all modifier item codes that match the WL pattern for this store
  const modifierItems = await (prisma as any).modifierItem.findMany({
    where: {
      modifierItemCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { modifierItemCode: true },
    orderBy: { id: 'desc' }
  })

  let nextNumber = 1
  
  if (modifierItems.length > 0) {
    // Extract number from codes like "WLLOC01MOI1", "WLLOC01MOI2", etc.
    const numbers = modifierItems
      .map((item: any) => {
        const match = item.modifierItemCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + MOI + number starting from 1
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

    const modifierGroupCode = searchParams.get('modifierGroupCode') || undefined

    const where: any = {
      ...storeFilter
    }
    if (modifierGroupCode) where.modifierGroupCode = modifierGroupCode

    const items = await (prisma as any).modifierItem.findMany({
      where,
      orderBy: [{ modifierGroupCode: 'asc' }, { displayOrder: 'asc' }, { createdOn: 'desc' }]
    })

    const data = items.map((i: any) => ({ ...i, id: i.id.toString() }))
    // Cache response for 60 seconds
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Error fetching modifier items:', error)
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
      modifierGroupCode,
      name,
      labelName,
      colorCode,
      price,
      isDefault = 0,
      displayOrder,
      isActive = 1,
    } = body

    // If modifierGroupCode is provided, fetch the modifier group to get its storeCode
    let finalStoreCode = selectedStoreCode
    if (modifierGroupCode) {
      const modifierGroup = await (prisma as any).modifierGroup.findFirst({
        where: { modifierGroupCode },
        select: { storeCode: true }
      })
      
      if (modifierGroup && modifierGroup.storeCode) {
        // Use the modifier group's storeCode to ensure consistency
        finalStoreCode = modifierGroup.storeCode
        
        // Validate user has access to this store
        if (!canAccessStore(accessInfo, finalStoreCode)) {
          return NextResponse.json(
            { error: 'Unauthorized: You do not have access to this modifier group\'s store' },
            { status: 403 }
          )
        }
      }
    }

    // Generate unique modifier item code for the store (from group or selected)
    const modifierItemCode = await generateModifierItemCode(finalStoreCode)

    const created = await (prisma as any).modifierItem.create({
      data: {
        modifierItemCode,
        modifierGroupCode: modifierGroupCode || null,
        name: name || null,
        labelName: labelName || null,
        colorCode: colorCode || null,
        price: price ?? null,
        isDefault,
        displayOrder: typeof displayOrder === 'number' ? displayOrder : null,
        isActive,
        createdBy: parseInt(session.user.id),
        storeCode: finalStoreCode, // Use the storeCode from modifier group if available
        syncSource: 'location' // Set sync_source to 'location' when created from dashboard
      },
    })

    const data = { ...created, id: created.id.toString() }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating modifier item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


