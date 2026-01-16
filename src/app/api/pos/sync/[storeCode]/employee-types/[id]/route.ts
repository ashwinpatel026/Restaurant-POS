import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/employee-types/:id Get employee type
 * @apiName GetEmployeeType
 * @apiGroup EmployeeType
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Employee type identifier (numeric `employeeTypeId` or string `typeCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Employee type record
 * @apiSuccess {String}  data.employeeTypeId Employee type ID (string)
 * @apiSuccess {String}  data.typeCode Employee type code
 * @apiSuccess {String}  data.typeName Employee type name
 * @apiSuccess {Boolean} data.isActive Active status
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source (e.g., "POS", "location")
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Employee type not found
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

    let employeeType = null
    const numericId = Number(id)

    if (!Number.isNaN(numericId)) {
      employeeType = await locationPrisma.employeeType.findFirst({
        where: {
          employeeTypeId: BigInt(numericId),
          storeCode
        }
      })
    }

    if (!employeeType) {
      employeeType = await locationPrisma.employeeType.findFirst({
        where: { typeCode: id, storeCode }
      })
    }

    if (!employeeType) {
      return NextResponse.json(
        { error: 'Employee type not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...employeeType,
        employeeTypeId: employeeType.employeeTypeId.toString(),
        createdBy: employeeType.createdBy ? employeeType.createdBy.toString() : null,
        updatedBy: employeeType.updatedBy ? employeeType.updatedBy.toString() : null,
        createdOn: employeeType.createdOn ? employeeType.createdOn.toISOString() : null,
        updatedOn: employeeType.updatedOn ? employeeType.updatedOn.toISOString() : null
      }
    })
  } catch (error: any) {
    console.error('Error fetching employee type (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/employee-types/:id Update employee type
 * @apiName UpdateEmployeeType
 * @apiGroup EmployeeType
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Employee type identifier (numeric `employeeTypeId` or string `typeCode`)
 *
 * @apiBody {String} [typeName] Employee type name
 * @apiBody {String} [description] Employee type description
 * @apiBody {Boolean} [isActive] Active status
 * @apiBody {Boolean} [isDelete] Soft delete flag
 * @apiBody {Number} [updatedBy] User ID (integer) who updated the employee type
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated employee type record
 * @apiSuccess {String}  data.employeeTypeId Employee type ID (string)
 * @apiSuccess {String}  data.typeCode Employee type code
 * @apiSuccess {String}  data.typeName Employee type name
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Employee type not found
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

    const { typeName, description, isActive, isDelete, updatedBy } = body

    const numericId = Number(id)
    let existingEmployeeType = null

    if (!Number.isNaN(numericId)) {
      existingEmployeeType = await locationPrisma.employeeType.findFirst({
        where: {
          employeeTypeId: BigInt(numericId),
          storeCode
        }
      })
    }

    if (!existingEmployeeType) {
      existingEmployeeType = await locationPrisma.employeeType.findFirst({
        where: { typeCode: id, storeCode }
      })
    }

    if (!existingEmployeeType) {
      return NextResponse.json(
        { error: 'Employee type not found' },
        { status: 404 }
      )
    }

    const updateData: any = addPOSSyncMetadata({
      updatedBy: updatedBy ? BigInt(updatedBy) : null
    }, storeCode)

    updateData.syncId = existingEmployeeType.syncId

    if (typeName !== undefined) updateData.typeName = typeName
    if (description !== undefined) {
      updateData.description = description ? description : null
    }
    if (isActive !== undefined) updateData.isActive = !!isActive
    if (isDelete !== undefined) updateData.isDelete = !!isDelete

    const updatedEmployeeType = await locationPrisma.employeeType.update({
      where: { employeeTypeId: existingEmployeeType.employeeTypeId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Employee type updated successfully',
      data: {
        ...updatedEmployeeType,
        employeeTypeId: updatedEmployeeType.employeeTypeId.toString(),
        createdBy: updatedEmployeeType.createdBy
          ? updatedEmployeeType.createdBy.toString()
          : null,
        updatedBy: updatedEmployeeType.updatedBy
          ? updatedEmployeeType.updatedBy.toString()
          : null,
        createdOn: updatedEmployeeType.createdOn
          ? updatedEmployeeType.createdOn.toISOString()
          : null,
        updatedOn: updatedEmployeeType.updatedOn
          ? updatedEmployeeType.updatedOn.toISOString()
          : null
      }
    })
  } catch (error: any) {
    console.error('Error updating employee type (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/employee-types/:id Delete employee type
 * @apiName DeleteEmployeeType
 * @apiGroup EmployeeType
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Employee type identifier (numeric `employeeTypeId` or string `typeCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted employee type identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Employee type not found
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
    let existingEmployeeType = null

    if (!Number.isNaN(numericId)) {
      existingEmployeeType = await locationPrisma.employeeType.findFirst({
        where: {
          employeeTypeId: BigInt(numericId),
          storeCode
        }
      })
    }

    if (!existingEmployeeType) {
      existingEmployeeType = await locationPrisma.employeeType.findFirst({
        where: { typeCode: id, storeCode }
      })
    }

    if (!existingEmployeeType) {
      return NextResponse.json(
        { error: 'Employee type not found' },
        { status: 404 }
      )
    }

    await locationPrisma.employeeType.delete({
      where: { employeeTypeId: existingEmployeeType.employeeTypeId }
    })

    return NextResponse.json({
      success: true,
      message: 'Employee type deleted successfully',
      data: {
        typeCode: existingEmployeeType.typeCode,
        employeeTypeId: existingEmployeeType.employeeTypeId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting employee type (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
