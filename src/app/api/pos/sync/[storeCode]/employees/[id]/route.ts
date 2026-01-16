import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/employees/:id Get employee
 * @apiName GetEmployee
 * @apiGroup Employee
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Employee identifier (numeric `employeeId` or string `employeeCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Employee record
 * @apiSuccess {String}  data.employeeId Employee ID (string)
 * @apiSuccess {String}  data.employeeCode Employee code
 * @apiSuccess {String}  [data.employeeType] Employee type code
 * @apiSuccess {Number}  [data.isActive] Active status (0/1)
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source (e.g., "POS", "location")
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Employee not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    let employee = null
    const numericId = Number(id)

    if (!Number.isNaN(numericId)) {
      employee = await locationPrisma.employee.findFirst({
        where: {
          employeeId: BigInt(numericId),
          storeCode
        }
      })
    }

    if (!employee) {
      employee = await locationPrisma.employee.findFirst({
        where: { employeeCode: id, storeCode }
      })
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...employee,
        employeeId: employee.employeeId.toString(),
        createdBy: employee.createdBy ? employee.createdBy.toString() : null,
        updatedBy: employee.updatedBy ? employee.updatedBy.toString() : null,
        createdOn: employee.createdOn ? employee.createdOn.toISOString() : null,
        updatedOn: employee.updatedOn ? employee.updatedOn.toISOString() : null
      }
    })
  } catch (error: any) {
    console.error('Error fetching employee (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/employees/:id Update employee
 * @apiName UpdateEmployee
 * @apiGroup Employee
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Employee identifier (numeric `employeeId` or string `employeeCode`)
 *
 * @apiBody {String} [employeeType] Employee type code
 * @apiBody {String} [businessName] Business name
 * @apiBody {String} [firstName] First name
 * @apiBody {String} [lastName] Last name
 * @apiBody {String} [address] Address
 * @apiBody {String} [email] Email
 * @apiBody {String} [phoneno] Phone number
 * @apiBody {Number} [posAccessThisLocation] POS access at this location (0/1)
 * @apiBody {String} [posAccessCode] POS access code
 * @apiBody {Number} [allowPosAllLocation] POS access all locations (0/1)
 * @apiBody {Number} [isUpdateEmpidAllLocation] Update employee ID all locations (0/1)
 * @apiBody {Number} [isActive] Active status (0/1)
 * @apiBody {String} [roleCode] Role code
 * @apiBody {Boolean} [isDelete] Soft delete flag
 * @apiBody {String} [alternateId] Alternate ID
 * @apiBody {Number} [updatedBy] User ID (integer) who updated the employee
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated employee record
 * @apiSuccess {String}  data.employeeId Employee ID (string)
 * @apiSuccess {String}  data.employeeCode Employee code
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Employee not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const {
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
      isDelete,
      alternateId,
      updatedBy
    } = body

    const numericId = Number(id)
    let existingEmployee = null

    if (!Number.isNaN(numericId)) {
      existingEmployee = await locationPrisma.employee.findFirst({
        where: {
          employeeId: BigInt(numericId),
          storeCode
        }
      })
    }

    if (!existingEmployee) {
      existingEmployee = await locationPrisma.employee.findFirst({
        where: { employeeCode: id, storeCode }
      })
    }

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const updateData: any = addPOSSyncMetadata({
      updatedBy: updatedBy ? BigInt(updatedBy) : null
    }, storeCode)

    updateData.syncId = existingEmployee.syncId

    if (employeeType !== undefined) updateData.employeeType = employeeType || null
    if (businessName !== undefined) updateData.businessName = businessName || null
    if (firstName !== undefined) updateData.firstName = firstName || null
    if (lastName !== undefined) updateData.lastName = lastName || null
    if (address !== undefined) updateData.address = address || null
    if (email !== undefined) updateData.email = email || null
    if (phoneno !== undefined) updateData.phoneno = phoneno || null
    if (posAccessThisLocation !== undefined) {
      updateData.posAccessThisLocation = posAccessThisLocation === null
        ? null
        : Number(posAccessThisLocation)
    }
    if (posAccessCode !== undefined) updateData.posAccessCode = posAccessCode || null
    if (allowPosAllLocation !== undefined) {
      updateData.allowPosAllLocation = allowPosAllLocation === null
        ? null
        : Number(allowPosAllLocation)
    }
    if (isUpdateEmpidAllLocation !== undefined) {
      updateData.isUpdateEmpidAllLocation = isUpdateEmpidAllLocation === null
        ? null
        : Number(isUpdateEmpidAllLocation)
    }
    if (isActive !== undefined) updateData.isActive = isActive ? 1 : 0
    if (roleCode !== undefined) updateData.roleCode = roleCode || null
    if (isDelete !== undefined) updateData.isDelete = !!isDelete
    if (alternateId !== undefined) updateData.alternateId = alternateId || null

    const updatedEmployee = await locationPrisma.employee.update({
      where: { employeeId: existingEmployee.employeeId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully',
      data: {
        ...updatedEmployee,
        employeeId: updatedEmployee.employeeId.toString(),
        createdBy: updatedEmployee.createdBy
          ? updatedEmployee.createdBy.toString()
          : null,
        updatedBy: updatedEmployee.updatedBy
          ? updatedEmployee.updatedBy.toString()
          : null,
        createdOn: updatedEmployee.createdOn
          ? updatedEmployee.createdOn.toISOString()
          : null,
        updatedOn: updatedEmployee.updatedOn
          ? updatedEmployee.updatedOn.toISOString()
          : null
      }
    })
  } catch (error: any) {
    console.error('Error updating employee (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/employees/:id Delete employee
 * @apiName DeleteEmployee
 * @apiGroup Employee
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Employee identifier (numeric `employeeId` or string `employeeCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted employee identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Employee not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const numericId = Number(id)
    let existingEmployee = null

    if (!Number.isNaN(numericId)) {
      existingEmployee = await locationPrisma.employee.findFirst({
        where: {
          employeeId: BigInt(numericId),
          storeCode
        }
      })
    }

    if (!existingEmployee) {
      existingEmployee = await locationPrisma.employee.findFirst({
        where: { employeeCode: id, storeCode }
      })
    }

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    await locationPrisma.employee.delete({
      where: { employeeId: existingEmployee.employeeId }
    })

    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully',
      data: {
        employeeCode: existingEmployee.employeeCode,
        employeeId: existingEmployee.employeeId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting employee (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
