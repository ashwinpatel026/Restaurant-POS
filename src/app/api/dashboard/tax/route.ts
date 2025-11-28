import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

// Helper function to generate unique tax code
async function generateTaxCode(): Promise<string> {
  const storeCode = process.env.STORE_CODE || ''
  const prefix = `WL${storeCode}TAX`
  
  // Get all tax codes that match the WL pattern for this store
  const taxes = await prisma.tax.findMany({
    where: {
      taxCode: {
        startsWith: prefix
      }
    },
    select: { taxCode: true },
    orderBy: { tblTaxId: 'desc' }
  })

  let nextNumber = 1
  
  if (taxes.length > 0) {
    // Extract number from codes like "WLLOC01TAX1", "WLLOC01TAX2", etc.
    const numbers = taxes
      .map(tax => {
        const match = tax.taxCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter(num => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + TAX + number starting from 1
  return `${prefix}${nextNumber}`
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
