import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/modifier-groups
 * Get all modifier groups for a store
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

    // Get modifier groups
    const modifierGroups = await locationPrisma.modifierGroup.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: modifierGroups.length,
      data: modifierGroups.map(group => ({
        ...group,
        id: group.id.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching modifier groups:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pos/sync/[storeCode]/modifier-groups
 * Create a new modifier group
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

    const { modifierGroupCode, groupName, isActive = 1 } = body

    // Validate required fields
    if (!modifierGroupCode || !groupName) {
      return NextResponse.json(
        { error: 'modifierGroupCode and groupName are required' },
        { status: 400 }
      )
    }

    // Check if modifier group code already exists
    const existing = await locationPrisma.modifierGroup.findFirst({
      where: {
        modifierGroupCode,
        storeCode
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Modifier group with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const modifierGroupData = addPOSSyncMetadata({
      modifierGroupCode,
      groupName,
      labelName: body.labelName || null,
      isRequired: body.isRequired ? 1 : 0,
      isMultiselect: body.isMultiselect ? 1 : 0,
      minSelection: body.minSelection || null,
      maxSelection: body.maxSelection || null,
      priceStrategy: body.priceStrategy || 1,
      price: body.price ? parseFloat(body.price) : null,
      prefix: body.prefix || null,
      isActive: isActive ? 1 : 0,
      createdOn: new Date()
    }, storeCode)

    // Create modifier group
    const modifierGroup = await locationPrisma.modifierGroup.create({
      data: modifierGroupData
    })

    return NextResponse.json({
      success: true,
      message: 'Modifier group created successfully',
      data: {
        ...modifierGroup,
        id: modifierGroup.id.toString()
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating modifier group:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

