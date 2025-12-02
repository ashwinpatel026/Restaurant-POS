import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to generate unique tax code
async function generateTaxCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}TAX`
  
  // Get all tax codes that match the WL pattern for this store
  const taxes = await prisma.tax.findMany({
    where: {
      taxCode: {
        startsWith: prefix
      },
      storeCode: storeCode
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }
    
    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const taxes = await prisma.tax.findMany({
      where: {
        ...storeFilter
      },
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

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { taxname, taxrate } = body

    // Generate unique tax code for the selected store
    const taxCode = await generateTaxCode(selectedStoreCode)

    const tax = await prisma.tax.create({
      data: {
        taxCode: taxCode,
        taxname,
        taxrate: parseFloat(taxrate),
        createdBy: parseInt(session.user.id),
        storeCode: selectedStoreCode,
        syncSource: 'location' // Set sync_source to 'location' when created from dashboard
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
