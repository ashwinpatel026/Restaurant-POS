import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/tax/[id]
 * Get a specific tax by ID or code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Try to find by ID first, then by taxCode
    let tax = null
    const taxId = parseInt(id)
    
    if (!isNaN(taxId)) {
      tax = await locationPrisma.tax.findFirst({
        where: {
          tblTaxId: taxId,
          storeCode
        }
      })
    }

    if (!tax) {
      tax = await locationPrisma.tax.findUnique({
        where: { taxCode: id }
      })
    }

    if (!tax || tax.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Tax not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...tax,
        tblTaxId: tax.tblTaxId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching tax:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/pos/sync/[storeCode]/tax/[id]
 * Update a tax
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

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

    // Find existing tax
    const taxId = parseInt(id)
    let existingTax = null

    if (!isNaN(taxId)) {
      existingTax = await locationPrisma.tax.findFirst({
        where: {
          tblTaxId: taxId,
          storeCode
        }
      })
    }

    if (!existingTax) {
      existingTax = await locationPrisma.tax.findUnique({
        where: { taxCode: id }
      })
    }

    if (!existingTax || existingTax.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Tax not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = addPOSSyncMetadata({
      updatedBy: body.updatedBy ? BigInt(body.updatedBy) : null
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingTax.syncId

    if (body.taxname !== undefined) updateData.taxname = body.taxname
    if (body.taxrate !== undefined) updateData.taxrate = parseFloat(body.taxrate)

    // Update tax
    const updatedTax = await locationPrisma.tax.update({
      where: { tblTaxId: existingTax.tblTaxId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Tax updated successfully',
      data: {
        ...updatedTax,
        tblTaxId: updatedTax.tblTaxId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating tax:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/pos/sync/[storeCode]/tax/[id]
 * Delete a tax
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Find existing tax
    const taxId = parseInt(id)
    let existingTax = null

    if (!isNaN(taxId)) {
      existingTax = await locationPrisma.tax.findFirst({
        where: {
          tblTaxId: taxId,
          storeCode
        }
      })
    }

    if (!existingTax) {
      existingTax = await locationPrisma.tax.findUnique({
        where: { taxCode: id }
      })
    }

    if (!existingTax || existingTax.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Tax not found' },
        { status: 404 }
      )
    }

    // Delete tax
    await locationPrisma.tax.delete({
      where: { tblTaxId: existingTax.tblTaxId }
    })

    return NextResponse.json({
      success: true,
      message: 'Tax deleted successfully',
      data: {
        taxCode: existingTax.taxCode,
        tblTaxId: existingTax.tblTaxId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting tax:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

