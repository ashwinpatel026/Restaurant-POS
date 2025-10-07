import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const modifierId = searchParams.get('modifierId')

    const where: any = {}
    if (modifierId) {
      where.tblModifierId = parseInt(modifierId)
    }

    // Fetch modifier items without include (temporary fix until Prisma client is regenerated)
    const modifierItems = await prisma.modifierItem.findMany({
      where,
      orderBy: { tblModifierItemId: 'asc' }
    })

    // Manually fetch modifier data and attach it
    const modifierIds = [...new Set(modifierItems.map((item: any) => item.tblModifierId))]
    const modifiers = await prisma.modifier.findMany({
      where: {
        tblModifierId: { in: modifierIds }
      },
      select: {
        tblModifierId: true,
        name: true,
        labelName: true
      }
    })

    // Create a map for quick lookup
    const modifierMap = new Map(modifiers.map((mod: any) => [mod.tblModifierId, mod]))

    // Attach modifier data to each item
    const itemsWithModifiers = modifierItems.map((item: any) => ({
      ...item,
      modifier: modifierMap.get(item.tblModifierId) || null
    }))

    return NextResponse.json(itemsWithModifiers)
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
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, labelName, colorCode, price, tblModifierId } = body

    const modifierItem = await prisma.modifierItem.create({
      data: {
        name,
        labelName,
        colorCode,
        price: parseFloat(price),
        tblModifierId: parseInt(tblModifierId),
        storeCode: 'MAIN'
      }
    })

    // Fetch modifier data for the created item
    const modifier = await prisma.modifier.findUnique({
      where: { tblModifierId: modifierItem.tblModifierId },
      select: {
        tblModifierId: true,
        name: true,
        labelName: true
      }
    })

    const itemWithModifier = {
      ...modifierItem,
      modifier
    }

    return NextResponse.json(itemWithModifier, { status: 201 })
  } catch (error) {
    console.error('Error creating modifier item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
