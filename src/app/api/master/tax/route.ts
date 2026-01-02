import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { checkDuplicate } from '@/lib/validation'

// Helper function to generate unique tax code
async function generateTaxCode(): Promise<string> {
  // Get the latest tax code from master database
  const latestTax = await masterPrisma.masterTax.findFirst({
    orderBy: { tblTaxId: 'desc' },
    select: { taxCode: true }
  })

  let nextNumber = 1
  
  if (latestTax?.taxCode) {
    // Extract number from code like "TAX1", "TAX2", etc.
    const match = latestTax.taxCode.match(/^TAX(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as TAX + number starting from 1
  return `TAX${nextNumber}`
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

    // Check for duplicate tax name
    if (taxname) {
      const isDuplicate = await checkDuplicate('masterTax', 'taxname', taxname);

      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Tax with this name already exists' },
          { status: 409 }
        );
      }
    }

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

