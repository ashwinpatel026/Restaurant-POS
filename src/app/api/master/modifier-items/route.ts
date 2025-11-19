import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to generate unique modifier item code
async function generateModifierItemCode(): Promise<string> {
  // Get the latest modifier item code from master database
  const latestItem = await masterPrisma.masterModifierItem.findFirst({
    orderBy: { id: 'desc' },
    select: { modifierItemCode: true }
  })

  let nextNumber = 1
  
  if (latestItem?.modifierItemCode) {
    // Extract number from code like "MI001"
    const match = latestItem.modifierItemCode.match(/^MI(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as MI + padded 3-digit number
  return `MI${String(nextNumber).padStart(3, '0')}`
}

// Helper function to map modifier item response
function mapModifierItemResponse(item: any) {
  return {
    ...item,
    id: item.id.toString(),
    price: item.price ? item.price.toString() : null,
    createdBy: item.createdBy ? item.createdBy.toString() : null,
    createdOn: item.createdOn ? item.createdOn.toISOString() : null,
    updatedBy: item.updatedBy ? item.updatedBy.toString() : null,
    updatedOn: item.updatedOn ? item.updatedOn.toISOString() : null
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const modifierGroupCode = searchParams.get('modifierGroupCode') || undefined

    const where: any = {}
    if (modifierGroupCode) where.modifierGroupCode = modifierGroupCode

    const items = await masterPrisma.masterModifierItem.findMany({
      where,
      orderBy: [{ modifierGroupCode: 'asc' }, { displayOrder: 'asc' }, { createdOn: 'desc' }]
    })

    const itemsWithStringId = items.map(mapModifierItemResponse)

    return NextResponse.json(itemsWithStringId)
  } catch (error) {
    console.error('Error fetching modifier items:', error)
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
    const {
      modifierGroupCode,
      name,
      labelName,
      colorCode,
      price,
      isDefault = 0,
      displayOrder,
      isActive = 1,
    } = body

    const modifierItemCode = await generateModifierItemCode()

    const created = await masterPrisma.masterModifierItem.create({
      data: {
        modifierItemCode,
        modifierGroupCode: modifierGroupCode || null,
        name: name || null,
        labelName: labelName || null,
        colorCode: colorCode || null,
        price: price ? parseFloat(price.toString()) : null,
        isDefault,
        displayOrder: typeof displayOrder === 'number' ? displayOrder : null,
        isActive,
        createdBy: admin.adminId,
      },
    })

    return NextResponse.json(mapModifierItemResponse(created), { status: 201 })
  } catch (error: any) {
    console.error('Error creating modifier item:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Modifier item code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

