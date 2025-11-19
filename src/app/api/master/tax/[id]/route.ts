import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const taxId = BigInt(idParam)

    const tax = await masterPrisma.masterTax.findUnique({
      where: { tblTaxId: taxId }
    })

    if (!tax) {
      return NextResponse.json({ error: 'Tax not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...tax,
      tblTaxId: tax.tblTaxId.toString(),
      taxrate: tax.taxrate.toString(),
      createdBy: tax.createdBy ? tax.createdBy.toString() : null,
      createdDate: tax.createdDate ? tax.createdDate.toISOString() : null,
      updatedOn: tax.updatedOn ? tax.updatedOn.toISOString() : null
    })
  } catch (error) {
    console.error('Error fetching tax:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const taxId = BigInt(idParam)
    const body = await request.json()

    const { taxname, taxrate } = body

    const tax = await masterPrisma.masterTax.update({
      where: { tblTaxId: taxId },
      data: {
        taxname,
        taxrate: parseFloat(taxrate)
      }
    })

    return NextResponse.json({
      ...tax,
      tblTaxId: tax.tblTaxId.toString(),
      taxrate: tax.taxrate.toString(),
      createdBy: tax.createdBy ? tax.createdBy.toString() : null,
      createdDate: tax.createdDate ? tax.createdDate.toISOString() : null,
      updatedOn: tax.updatedOn ? tax.updatedOn.toISOString() : null
    })
  } catch (error) {
    console.error('Error updating tax:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const taxId = BigInt(idParam)

    await masterPrisma.masterTax.delete({
      where: { tblTaxId: taxId }
    })

    return NextResponse.json({ message: 'Tax deleted successfully' })
  } catch (error) {
    console.error('Error deleting tax:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

