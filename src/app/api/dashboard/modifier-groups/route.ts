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
          modifierGroupCode: { in: groupCodes }
        },
        orderBy: { createdOn: 'desc' }
      })
    } else {
      // Fetch all groups without filtering
      groups = await (prisma as any).modifierGroup.findMany({
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


