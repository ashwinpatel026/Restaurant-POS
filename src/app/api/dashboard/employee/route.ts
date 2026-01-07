import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'
import { checkDuplicate } from '@/lib/validation'
import { locationPrisma } from '@/lib/databaseManager'

// Helper function to generate unique employee code
async function generateEmployeeCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}EMP`
  
  // Get all employee codes that match the WL pattern for this store (excluding soft-deleted)
  const employees = await prisma.employee.findMany({
    where: {
      employeeCode: {
        startsWith: prefix
      },
      storeCode: storeCode,
      isDelete: false
    },
    select: { employeeCode: true },
    orderBy: { employeeId: 'desc' }
  })

  let nextNumber = 1
  
  if (employees.length > 0) {
    // Extract number from codes like "WLLOC01EMP1", "WLLOC01EMP2", etc.
    const numbers = employees
      .map(emp => {
        const match = emp.employeeCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + EMP + number starting from 1
  return `${prefix}${nextNumber}`
}

// Helper function to map employee response
function mapEmployeeResponse(emp: any) {
  return {
    ...emp,
    employeeId: emp.employeeId.toString(),
    createdBy: emp.createdBy ? emp.createdBy.toString() : null,
    createdOn: emp.createdOn ? emp.createdOn.toISOString() : null,
    updatedBy: emp.updatedBy ? emp.updatedBy.toString() : null,
    updatedOn: emp.updatedOn ? emp.updatedOn.toISOString() : null
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view employees
    if (!(await checkLocationPermission(session.user.role, 'employees.view'))) {
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

    const employees = await prisma.employee.findMany({
      where: {
        isDelete: false,
        ...storeFilter
      },
      orderBy: { createdOn: 'desc' }
    })

    const employeesWithStringId = employees.map(mapEmployeeResponse)

    return NextResponse.json(employeesWithStringId)
  } catch (error) {
    console.error('Error fetching employees:', error)
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

    // Check permission to create employees
    if (!(await checkLocationPermission(session.user.role, 'employees.create'))) {
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
      employeeCode,
      employeeType,
      businessName,
      firstName,
      lastName,
      address,
      email,
      phoneno,
      posAccessThisLocation,
      posAccessCode,
      allowPosAllLocation,
      isUpdateEmpidAllLocation,
      isActive,
      roleCode,
      alternateId
    } = body

    // Generate employee code if not provided
    let finalEmployeeCode = employeeCode
    if (!finalEmployeeCode || finalEmployeeCode.trim() === '') {
      finalEmployeeCode = await generateEmployeeCode(selectedStoreCode)
    }

    // Check for duplicate employee code (excluding soft-deleted)
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        employeeCode: finalEmployeeCode,
        storeCode: selectedStoreCode,
        isDelete: false
      }
    })
    if (existingEmployee) {
      return NextResponse.json(
        { error: 'Employee with this code already exists' },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.create({
      data: {
        employeeCode: finalEmployeeCode,
        employeeType: employeeType || null,
        businessName: businessName || null,
        firstName: firstName || null,
        lastName: lastName || null,
        address: address || null,
        email: email || null,
        phoneno: phoneno || null,
        posAccessThisLocation: posAccessThisLocation || null,
        posAccessCode: posAccessCode || null,
        allowPosAllLocation: allowPosAllLocation || null,
        isUpdateEmpidAllLocation: isUpdateEmpidAllLocation || null,
        isActive: isActive !== undefined ? isActive : 1,
        roleCode: roleCode || null,
        alternateId: alternateId || null,
        createdBy: BigInt(parseInt(session.user.id)),
        storeCode: selectedStoreCode,
        syncSource: 'location'
      }
    })

    return NextResponse.json(mapEmployeeResponse(employee), { status: 201 })
  } catch (error: any) {
    console.error('Error creating employee:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Employee code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

