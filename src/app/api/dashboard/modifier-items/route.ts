import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { generateUniqueCode } from '@/lib/codeGenerator'

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

    const modifierItemCode = await generateUniqueCode('modifierItem', 'modifierItemCode')

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


