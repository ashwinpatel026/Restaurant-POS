import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { checkDuplicate } from '@/lib/validation'

// Helper function to generate unique dealer code
async function generateDealerCode(): Promise<string> {
  const prefix = 'DL';

  // Fetch only dealer codes that start with DL
  const dealers = await masterPrisma.dealer.findMany({
    where: {
      dealerCode: {
        startsWith: prefix
      }
    },
    select: { dealerCode: true }
  });

  let nextNumber = 1;

  if (dealers.length > 0) {
    const numbers = dealers
      .map(dealer => {
        const match = dealer.dealerCode.match(/^DL(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

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
        let company = null
        if (dealer.companyId) {
          company = await masterPrisma.company.findUnique({
            where: { companyId: dealer.companyId },
            select: {
              companyId: true,
              companyCode: true,
              companyName: true
            }
          })
        }

        return {
          ...dealer,
          dealerId: dealer.dealerId.toString(),
          companyId: dealer.companyId ? dealer.companyId.toString() : null,
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
    let {
      dealerCode,
      dealerName,
      companyId,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipcode,
      phone,
      email
    } = body

    // Auto-generate dealer code if not provided
    if (!dealerCode || dealerCode.trim() === '') {
      dealerCode = await generateDealerCode()
    }

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

    // Check for duplicate dealer name
    if (dealerName) {
      const isDuplicate = await checkDuplicate('dealer', 'dealerName', dealerName, {
        db: masterPrisma
      });

      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Dealer with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Verify company exists if provided
    if (companyId) {
      const company = await masterPrisma.company.findUnique({
        where: { companyId: BigInt(companyId) }
      })

      if (!company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        )
      }
    }

    const dealer = await masterPrisma.dealer.create({
      data: {
        dealerCode,
        dealerName,
        ...(companyId && { companyId: BigInt(companyId) }),
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        state: state || null,
        country: country || null,
        zipcode: zipcode || null,
        phone: phone || null,
        email: email || null,
        isActive: 1
      }
    })

    return NextResponse.json({
      ...dealer,
      dealerId: dealer.dealerId.toString(),
      companyId: dealer.companyId ? dealer.companyId.toString() : null
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

