import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to generate unique department type code
async function generateDepartmentTypeCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}DPT`
  
  // Get all department type codes that match the WL pattern for this store
  const deptTypes = await prisma.departmentType.findMany({
    where: {
      deptTypeCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { deptTypeCode: true },
    orderBy: { deptTypeId: 'desc' }
  })

  let nextNumber = 1
  
  if (deptTypes.length > 0) {
    // Extract number from codes like "WLLOC01DPT1", "WLLOC01DPT2", etc.
    const numbers = deptTypes
      .map(deptType => {
        const match = deptType.deptTypeCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + DPT + number starting from 1
  return `${prefix}${nextNumber}`
}

// Helper function to map department type response
function mapDepartmentTypeResponse(deptType: any) {
  return {
    ...deptType,
    deptTypeId: deptType.deptTypeId.toString(),
    createdBy: deptType.createdBy ? deptType.createdBy.toString() : null,
    createdOn: deptType.createdOn ? deptType.createdOn.toISOString() : null,
    updatedBy: deptType.updatedBy ? deptType.updatedBy.toString() : null,
    updatedOn: deptType.updatedOn ? deptType.updatedOn.toISOString() : null
  }
}

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

    const departmentTypes = await prisma.departmentType.findMany({
      where: {
        ...storeFilter
      },
      orderBy: { createdOn: 'desc' }
    })

    const deptTypesWithStringId = departmentTypes.map(mapDepartmentTypeResponse)

    return NextResponse.json(deptTypesWithStringId)
  } catch (error) {
    console.error('Error fetching department types:', error)
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

    if (!['SUPER_ADMIN', 'ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
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
    const { name, isActive } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Department type name is required' },
        { status: 400 }
      )
    }

    // Generate department type code automatically
    const deptTypeCode = await generateDepartmentTypeCode(selectedStoreCode)

    const departmentType = await prisma.departmentType.create({
      data: {
        deptTypeCode,
        name,
        isActive: isActive ? 1 : 0,
        createdBy: BigInt(parseInt(session.user.id)),
        storeCode: selectedStoreCode,
        syncSource: 'location'
      }
    })

    return NextResponse.json(mapDepartmentTypeResponse(departmentType), { status: 201 })
  } catch (error: any) {
    console.error('Error creating department type:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Department type code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
