import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

function serializeCustomer(record: any) {
  return {
    ...record,
    customerId: record.customerId.toString(),
    createdBy: record.createdBy != null ? record.createdBy.toString() : null,
    updatedBy: record.updatedBy != null ? record.updatedBy.toString() : null,
    createdAt: record.createdAt ? record.createdAt.toISOString() : null,
    updatedAt: record.updatedAt ? record.updatedAt.toISOString() : null
  }
}

function posCustomerMeta(data: any, storeCode: string) {
  const result = addPOSSyncMetadata(data, storeCode)
  delete result.isSyncToWeb
  delete result.isSyncToLocal
  if (result.updatedOn) {
    result.updatedAt = result.updatedOn
    delete result.updatedOn
  }
  return result
}

async function findCustomer(storeCode: string, id: string) {
  if (/^\d+$/.test(id)) {
    const byId = await locationPrisma.customerMaster.findFirst({
      where: { customerId: BigInt(id), storeCode, isDelete: false }
    })
    if (byId) return byId
  }

  return locationPrisma.customerMaster.findFirst({
    where: { customerCode: id, storeCode, isDelete: false }
  })
}

function readText(value: unknown, max: number) {
  const text = String(value ?? '').trim()
  if (!text) return null
  if (text.length > max) return false as const
  return text
}

/**
 * @api {get} /api/pos/sync/:storeCode/customers/:id Get customer
 * @apiName GetCustomer
 * @apiGroup Customers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `customerId` or string `customerCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Customer record
 * @apiSuccess {String}  data.customerId Customer ID (string)
 * @apiSuccess {String}  data.customerCode Customer code
 * @apiSuccess {String}  data.phoneNumber Phone number
 * @apiSuccess {String}  data.customerName Customer name
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Customer not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const customer = await findCustomer(storeCode, id)
    if (!customer || customer.storeCode !== storeCode) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: serializeCustomer(customer)
    })
  } catch (error: any) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/customers/:id Update customer
 * @apiName UpdateCustomer
 * @apiGroup Customers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `customerId` or string `customerCode`
 *
 * @apiBody {String}  [customerCode] Customer code
 * @apiBody {String}  [phoneNumber] Phone number
 * @apiBody {String}  [customerName] Customer name
 * @apiBody {String}  [businessName] Business name
 * @apiBody {String}  [email] Email
 * @apiBody {String}  [addressLine1] Address line 1
 * @apiBody {String}  [addressLine2] Address line 2
 * @apiBody {String}  [city] City
 * @apiBody {String}  [state] State
 * @apiBody {String}  [zipCode] Zip code
 * @apiBody {String}  [country] Country
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {Boolean} [isDelete] Soft delete flag
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated customer
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Customer not found
 * @apiError (409) Conflict Customer code or phone already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

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
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const existing = await findCustomer(storeCode, id)
    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const payload: any = {
      updatedBy: body.updatedBy ? BigInt(body.updatedBy) : null
    }

    if (body.customerCode !== undefined || body.customer_code !== undefined) {
      const customerCode = readText(body.customerCode ?? body.customer_code, 40)
      if (!customerCode) {
        return NextResponse.json(
          { error: 'customerCode must be between 1 and 40 characters' },
          { status: 400 }
        )
      }
      const conflict = await locationPrisma.customerMaster.findFirst({
        where: {
          storeCode,
          isDelete: false,
          customerCode,
          NOT: { customerId: existing.customerId }
        }
      })
      if (conflict) {
        return NextResponse.json(
          { error: 'Customer with this code already exists' },
          { status: 409 }
        )
      }
      payload.customerCode = customerCode
    }

    if (body.phoneNumber !== undefined || body.phone_number !== undefined) {
      const phoneNumber = readText(body.phoneNumber ?? body.phone_number, 20)
      if (!phoneNumber) {
        return NextResponse.json(
          { error: 'phoneNumber must be between 1 and 20 characters' },
          { status: 400 }
        )
      }
      const conflict = await locationPrisma.customerMaster.findFirst({
        where: {
          storeCode,
          isDelete: false,
          phoneNumber,
          NOT: { customerId: existing.customerId }
        }
      })
      if (conflict) {
        return NextResponse.json(
          { error: 'Customer with this phone number already exists' },
          { status: 409 }
        )
      }
      payload.phoneNumber = phoneNumber
    }

    if (body.customerName !== undefined || body.customer_name !== undefined) {
      const customerName = readText(body.customerName ?? body.customer_name, 150)
      if (!customerName) {
        return NextResponse.json(
          { error: 'customerName must be between 1 and 150 characters' },
          { status: 400 }
        )
      }
      payload.customerName = customerName
    }

    const optionalMap: Array<[string, string, number]> = [
      ['businessName', 'business_name', 100],
      ['email', 'email', 150],
      ['addressLine1', 'address_line1', 255],
      ['addressLine2', 'address_line2', 150],
      ['city', 'city', 100],
      ['state', 'state', 100],
      ['zipCode', 'zip_code', 20],
      ['country', 'country', 50]
    ]

    for (const [camel, snake, max] of optionalMap) {
      if (body[camel] !== undefined || body[snake] !== undefined) {
        const value = readText(body[camel] ?? body[snake], max)
        if (value === false) {
          return NextResponse.json(
            { error: `${camel} exceeds the allowed length` },
            { status: 400 }
          )
        }
        payload[camel] = value
      }
    }

    if (body.isActive !== undefined) payload.isActive = body.isActive !== false
    if (body.isDelete !== undefined) payload.isDelete = body.isDelete === true

    const updateData = posCustomerMeta(payload, storeCode)
    updateData.syncId = existing.syncId

    const updated = await locationPrisma.customerMaster.update({
      where: { customerId: existing.customerId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      data: serializeCustomer(updated)
    })
  } catch (error: any) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/customers/:id Delete customer
 * @apiName DeleteCustomer
 * @apiGroup Customers
 * @apiVersion 1.0.0
 *
 * @apiDescription Soft-deletes the customer (`isDelete=true`, `isActive=false`).
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `customerId` or string `customerCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.customerId Customer ID (string)
 * @apiSuccess {String}  data.customerCode Customer code
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Customer not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const existing = await findCustomer(storeCode, id)
    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    await locationPrisma.customerMaster.update({
      where: { customerId: existing.customerId },
      data: posCustomerMeta(
        {
          isDelete: true,
          isActive: false,
          syncId: existing.syncId
        },
        storeCode
      )
    })

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
      data: {
        customerId: existing.customerId.toString(),
        customerCode: existing.customerCode
      }
    })
  } catch (error: any) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
