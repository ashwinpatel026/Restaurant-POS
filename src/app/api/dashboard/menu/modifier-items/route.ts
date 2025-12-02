import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching modifier items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
    const { modifierGroupCode, name, labelName, colorCode, price } = body

    const created = await (prisma as any).modifierItem.create({
      data: {
        modifierItemCode: await (await import('@/lib/codeGenerator')).generateUniqueCode('modifierItem', 'modifierItemCode'),
        modifierGroupCode: modifierGroupCode || null,
        name: name || null,
        labelName: labelName || null,
        colorCode: colorCode || null,
        price: typeof price === 'number' ? price : null,
        isActive: 1,
        storeCode: selectedStoreCode,
        syncSource: 'location' // Set sync_source to 'location' when created from dashboard
      }
    })

    const data = { ...created, id: created.id.toString() }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating modifier item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
