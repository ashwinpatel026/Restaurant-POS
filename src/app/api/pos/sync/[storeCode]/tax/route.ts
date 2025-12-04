import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, getModelByEntity, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/tax
 * Get all taxes for a store
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const lastSyncAt = url.searchParams.get('lastSyncAt')
    const incremental = url.searchParams.get('incremental') === 'true'

    // Build where clause
    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    // Get taxes
    const taxes = await locationPrisma.tax.findMany({
      where,
      orderBy: { updatedOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: taxes.length,
      data: taxes.map(tax => ({
        ...tax,
        tblTaxId: tax.tblTaxId.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching taxes:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pos/sync/[storeCode]/tax
 * Create a new tax
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { taxCode, taxname, taxrate, createdBy } = body

    // Validate required fields
    if (!taxCode || !taxname || taxrate === undefined) {
      return NextResponse.json(
        { error: 'taxCode, taxname, and taxrate are required' },
        { status: 400 }
      )
    }

    // Check if tax code already exists
    const existing = await locationPrisma.tax.findUnique({
      where: { taxCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Tax with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const taxData = addPOSSyncMetadata({
      taxCode,
      taxname,
      taxrate: parseFloat(taxrate),
      createdBy: createdBy ? parseInt(createdBy) : null,
      createdDate: new Date()
    }, storeCode)

    // Create tax
    const tax = await locationPrisma.tax.create({
      data: taxData
    })

    return NextResponse.json({
      success: true,
      message: 'Tax created successfully',
      data: {
        ...tax,
        tblTaxId: tax.tblTaxId.toString()
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating tax:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

