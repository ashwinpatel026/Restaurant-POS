import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

// Helper function to generate unique modifier item code
async function generateModifierItemCode(): Promise<string> {
  const storeCode = process.env.STORE_CODE || ''
  const prefix = `WL${storeCode}MOI`
  
  // Get all modifier item codes that match the WL pattern for this store
  const modifierItems = await (prisma as any).modifierItem.findMany({
    where: {
      modifierItemCode: {
        startsWith: prefix
      }
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
      .filter(num => num > 0)
    
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
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const modifierGroupCode = searchParams.get('modifierGroupCode') || undefined

    const where: any = {}
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
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Generate unique modifier item code
    const modifierItemCode = await generateModifierItemCode()

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
        storeCode: process.env.STORE_CODE || null,
      },
    })

    const data = { ...created, id: created.id.toString() }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating modifier item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


