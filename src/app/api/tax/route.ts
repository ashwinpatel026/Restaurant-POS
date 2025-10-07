import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

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

    const tax = await prisma.tax.create({
      data: {
        taxname,
        taxrate: parseFloat(taxrate),
        storeCode: null
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
