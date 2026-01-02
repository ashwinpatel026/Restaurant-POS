import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'
import { checkDuplicate } from '@/lib/validation'

// Helper function to generate unique department code
async function generateDepartmentCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}DEP`
  
  // Get all department codes that match the WL pattern for this store
  const departments = await prisma.department.findMany({
    where: {
      deptCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { deptCode: true },
    orderBy: { deptId: 'desc' }
  })

  let nextNumber = 1
  
  if (departments.length > 0) {
    // Extract number from codes like "WLLOC01DEP1", "WLLOC01DEP2", etc.
    const numbers = departments
      .map(dept => {
        const match = dept.deptCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + DEP + number starting from 1
  return `${prefix}${nextNumber}`
}

// Helper function to map department response
function mapDepartmentResponse(dept: any) {
  return {
    ...dept,
    deptId: dept.deptId.toString(),
    createdBy: dept.createdBy ? dept.createdBy.toString() : null,
    createdOn: dept.createdOn ? dept.createdOn.toISOString() : null,
    updatedBy: dept.updatedBy ? dept.updatedBy.toString() : null,
    updatedOn: dept.updatedOn ? dept.updatedOn.toISOString() : null
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view departments
    if (!(await checkLocationPermission(session.user.role, 'departments.view'))) {
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

    const departments = await prisma.department.findMany({
      where: {
        ...storeFilter
      },
      orderBy: { createdOn: 'desc' }
    })

    const deptsWithStringId = departments.map(mapDepartmentResponse)

    return NextResponse.json(deptsWithStringId)
  } catch (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to create departments
    if (!(await checkLocationPermission(session.user.role, 'departments.create'))) {
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
    const { deptName, deptTaxCode, deptTypeCode, isActive } = body

    // Validate required fields
    if (!deptName) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const isDuplicate = await checkDuplicate('department', 'deptName', deptName, {
      storeCode: selectedStoreCode
    })
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Department with this name already exists' },
        { status: 400 }
      )
    }

    // Generate department code automatically
    const deptCode = await generateDepartmentCode(selectedStoreCode)

    const department = await prisma.department.create({
      data: {
        deptCode,
        deptName,
        deptTaxCode: deptTaxCode || null,
        deptTypeCode: deptTypeCode || null,
        isActive: isActive ? 1 : 0,
        createdBy: BigInt(parseInt(session.user.id)),
        storeCode: selectedStoreCode,
        syncSource: 'location'
      }
    })

    return NextResponse.json(mapDepartmentResponse(department), { status: 201 })
  } catch (error: any) {
    console.error('Error creating department:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Department code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
