import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

// Helper function to generate unique tax code
async function generateTaxCode(): Promise<string> {
  // Get the latest tax code
  const latestTax = await prisma.tax.findFirst({
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const taxes = await prisma.tax.findMany({
      orderBy: { taxname: 'asc' }
    })

    return NextResponse.json(taxes)
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
    const session = await getServerSession(authOptions)

    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taxname, taxrate } = body

    // Generate unique tax code
    const taxCode = await generateTaxCode()

    const tax = await prisma.tax.create({
      data: {
        taxCode: taxCode,
        taxname,
        taxrate: parseFloat(taxrate),
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null
      }
    })

    return NextResponse.json(tax, { status: 201 })
  } catch (error) {
    console.error('Error creating tax:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
