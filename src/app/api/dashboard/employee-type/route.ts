import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'
import { checkDuplicate } from '@/lib/validation'
import { locationPrisma } from '@/lib/databaseManager'

// Helper function to generate unique employee type code
async function generateEmployeeTypeCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}ET`
  
  // Get all employee type codes that match the WL pattern for this store
  const employeeTypes = await prisma.employeeType.findMany({
    where: {
      typeCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { typeCode: true },
    orderBy: { employeeTypeId: 'desc' }
  })

  let nextNumber = 1
  
  if (employeeTypes.length > 0) {
    // Extract number from codes like "WLLOC01ET1", "WLLOC01ET2", etc.
    const numbers = employeeTypes
      .map(empType => {
        const match = empType.typeCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + ET + number starting from 1
  return `${prefix}${nextNumber}`
}

// Helper function to map employee type response
function mapEmployeeTypeResponse(empType: any) {
  return {
    ...empType,
    employeeTypeId: empType.employeeTypeId.toString(),
    createdBy: empType.createdBy ? empType.createdBy.toString() : null,
    createdOn: empType.createdOn ? empType.createdOn.toISOString() : null,
    updatedBy: empType.updatedBy ? empType.updatedBy.toString() : null,
    updatedOn: empType.updatedOn ? empType.updatedOn.toISOString() : null
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view employee types
    if (!(await checkLocationPermission(session.user.role, 'employee_types.view'))) {
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

    const employeeTypes = await prisma.employeeType.findMany({
      where: {
        ...storeFilter
      },
      orderBy: { createdOn: 'desc' }
    })

    const empTypesWithStringId = employeeTypes.map(mapEmployeeTypeResponse)

    return NextResponse.json(empTypesWithStringId)
  } catch (error) {
    console.error('Error fetching employee types:', error)
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

    // Check permission to create employee types
    if (!(await checkLocationPermission(session.user.role, 'employee_types.create'))) {
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
    const { typeName, description, isActive } = body

    // Validate required fields
    if (!typeName) {
      return NextResponse.json(
        { error: 'Employee type name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const isDuplicate = await checkDuplicate('employeeType', 'typeName', typeName, {
      db: locationPrisma,
      storeCode: selectedStoreCode
    })
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Employee type with this name already exists' },
        { status: 400 }
      )
    }

    // Generate employee type code automatically
    const typeCode = await generateEmployeeTypeCode(selectedStoreCode)

    const employeeType = await prisma.employeeType.create({
      data: {
        typeCode,
        typeName,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: BigInt(parseInt(session.user.id)),
        storeCode: selectedStoreCode,
        syncSource: 'location'
      }
    })

    return NextResponse.json(mapEmployeeTypeResponse(employeeType), { status: 201 })
  } catch (error: any) {
    console.error('Error creating employee type:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Employee type code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

