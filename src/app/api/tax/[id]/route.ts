import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const taxId = parseInt(resolvedParams.id)
    const body = await request.json()

    const { taxname, taxrate } = body

    const tax = await (prisma as any).tax.update({
      where: { tblTaxId: taxId },
      data: {
        taxname,
        taxrate: parseFloat(taxrate),
        storeCode: process.env.STORE_CODE || null
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
    
    if (!session || !['SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const taxId = parseInt(resolvedParams.id)

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
