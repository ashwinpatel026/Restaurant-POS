import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const companyId = url.searchParams.get('companyId')

    const dealers = await masterPrisma.dealer.findMany({
      where: {
        isActive: 1,
        ...(companyId && { companyId: BigInt(companyId) })
      },
      orderBy: {
        createdOn: 'desc'
      }
    })

    // Fetch company data separately for each dealer
    const dealersWithCompany = await Promise.all(
      dealers.map(async (dealer) => {
        const company = await masterPrisma.company.findUnique({
          where: { companyId: dealer.companyId },
          select: {
            companyId: true,
            companyCode: true,
            companyName: true
          }
        })

        return {
          ...dealer,
          dealerId: dealer.dealerId.toString(),
          companyId: dealer.companyId.toString(),
          company: company ? {
            ...company,
            companyId: company.companyId.toString()
          } : null
        }
      })
    )

    return NextResponse.json(dealersWithCompany)
  } catch (error) {
    console.error('Error fetching dealers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      dealerCode,
      dealerName,
      companyId,
      address,
      phone,
      email
    } = body

    // Check if dealer code already exists
    const existingDealer = await masterPrisma.dealer.findUnique({
      where: { dealerCode }
    })

    if (existingDealer) {
      return NextResponse.json(
        { error: 'Dealer code already exists' },
        { status: 400 }
      )
    }

    // Verify company exists
    const company = await masterPrisma.company.findUnique({
      where: { companyId: BigInt(companyId) }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    const dealer = await masterPrisma.dealer.create({
      data: {
        dealerCode,
        dealerName,
        companyId: BigInt(companyId),
        address: address || null,
        phone: phone || null,
        email: email || null,
        isActive: 1
      }
    })

    return NextResponse.json({
      ...dealer,
      dealerId: dealer.dealerId.toString(),
      companyId: dealer.companyId.toString()
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

