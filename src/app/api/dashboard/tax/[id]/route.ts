import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, canAccessStore, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view taxes
    if (!(await checkLocationPermission(session.user.role, 'tax.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    const resolvedParams = await params
    const taxId = parseInt(resolvedParams.id)

    const tax = await (prisma as any).tax.findUnique({
      where: { tblTaxId: taxId },
      include: {
        menuMasters: true
      }
    })

    if (!tax) {
      return NextResponse.json({ error: 'Tax not found' }, { status: 404 })
    }

    // If storeCode is provided, verify the tax belongs to that store or user has access
    if (selectedStoreCode && tax.storeCode !== selectedStoreCode) {
      if (!canAccessStore(accessInfo, tax.storeCode || '')) {
        return NextResponse.json({ error: 'Tax not found' }, { status: 404 })
      }
    }

    return NextResponse.json(tax)
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to update taxes
    if (!(await checkLocationPermission(session.user.role, 'tax.update'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    const resolvedParams = await params
    const taxId = parseInt(resolvedParams.id)
    
    // First check if tax exists and belongs to the selected store
    const existingTax = await (prisma as any).tax.findUnique({
      where: { tblTaxId: taxId }
    })

    if (!existingTax) {
      return NextResponse.json({ error: 'Tax not found' }, { status: 404 })
    }

    // Verify user has access to this tax's store
    if (existingTax.storeCode && !canAccessStore(accessInfo, existingTax.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { taxname, taxrate } = body

    const tax = await (prisma as any).tax.update({
      where: { tblTaxId: taxId },
      data: {
        taxname,
        taxrate: parseFloat(taxrate),
        // Keep the original storeCode, don't change it
        storeCode: existingTax.storeCode || selectedStoreCode,
        // Set sync_source to 'location' when updated from dashboard
        syncSource: 'location'
      }
    })

    return NextResponse.json(tax)
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to delete taxes
    if (!(await checkLocationPermission(session.user.role, 'tax.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    const resolvedParams = await params
    const taxId = parseInt(resolvedParams.id)

    // First check if tax exists and user has access
    const existingTax = await (prisma as any).tax.findUnique({
      where: { tblTaxId: taxId }
    })

    if (!existingTax) {
      return NextResponse.json({ error: 'Tax not found' }, { status: 404 })
    }

    // Verify user has access to this tax's store
    if (existingTax.storeCode && !canAccessStore(accessInfo, existingTax.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.tax.delete({
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
