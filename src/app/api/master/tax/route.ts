import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to generate unique tax code
async function generateTaxCode(): Promise<string> {
  // Get the latest tax code from master database
  const latestTax = await masterPrisma.masterTax.findFirst({
    orderBy: { tblTaxId: 'desc' },
    select: { taxCode: true }
  })

  let nextNumber = 1
  
  if (latestTax?.taxCode) {
    // Extract number from code like "T001"
    const match = latestTax.taxCode.match(/^T(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as T + padded 3-digit number
  return `T${String(nextNumber).padStart(3, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const taxes = await masterPrisma.masterTax.findMany({
      orderBy: { taxname: 'asc' }
    })

    const taxesWithStringId = taxes.map(tax => ({
      ...tax,
      tblTaxId: tax.tblTaxId.toString(),
      taxrate: tax.taxrate.toString(),
      createdBy: tax.createdBy ? tax.createdBy.toString() : null,
      createdDate: tax.createdDate ? tax.createdDate.toISOString() : null,
      updatedOn: tax.updatedOn ? tax.updatedOn.toISOString() : null
    }))

    return NextResponse.json(taxesWithStringId)
  } catch (error) {
    console.error('Error fetching taxes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taxname, taxrate } = body

    // Generate unique tax code
    const taxCode = await generateTaxCode()

    const tax = await masterPrisma.masterTax.create({
      data: {
        taxCode: taxCode,
        taxname,
        taxrate: parseFloat(taxrate),
        createdBy: admin.adminId
      }
    })

    return NextResponse.json({
      ...tax,
      tblTaxId: tax.tblTaxId.toString(),
      taxrate: tax.taxrate.toString(),
      createdBy: tax.createdBy ? tax.createdBy.toString() : null,
      createdDate: tax.createdDate ? tax.createdDate.toISOString() : null,
      updatedOn: tax.updatedOn ? tax.updatedOn.toISOString() : null
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating tax:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

