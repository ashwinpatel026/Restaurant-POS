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
    const menuCategoryCode = searchParams.get('menuCategoryCode') || undefined

    const where: any = {}
    if (menuCategoryCode) where.menuCategoryCode = menuCategoryCode

    const groups = await (prisma as any).modifierGroup.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    const data = groups.map((g: any) => ({
      ...g,
      id: g.id.toString()
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching modifier groups:', error)
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
      groupName,
      labelName,
      isRequired = 0,
      isMultiselect = 0,
      minSelection,
      maxSelection,
      showDefaultTop = 0,
      inheritFromMenuGroup = 0,
      menuCategoryCode,
      priceStrategy = 1,
      price,
      isActive = 1,
    } = body

    const modifierGroupCode = await generateUniqueCode('modifierGroup', 'modifierGroupCode')

    const created = await (prisma as any).modifierGroup.create({
      data: {
        modifierGroupCode,
        groupName: groupName || null,
        labelName: labelName || null,
        isRequired,
        isMultiselect,
        minSelection: typeof minSelection === 'number' ? minSelection : null,
        maxSelection: typeof maxSelection === 'number' ? maxSelection : null,
        showDefaultTop,
        inheritFromMenuGroup,
        menuCategoryCode: menuCategoryCode || null,
        priceStrategy,
        price: typeof price === 'number' && price > 0 ? price : null,
        isActive,
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null,
      },
    })

    const data = { ...created, id: created.id.toString() }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating modifier group:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


