import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to generate unique modifier group code
async function generateModifierGroupCode(): Promise<string> {
  // Get the latest modifier group code from master database
  const latestGroup = await masterPrisma.masterModifierGroup.findFirst({
    orderBy: { id: 'desc' },
    select: { modifierGroupCode: true }
  })

  let nextNumber = 1
  
  if (latestGroup?.modifierGroupCode) {
    // Extract number from code like "MG001"
    const match = latestGroup.modifierGroupCode.match(/^MG(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as MG + padded 3-digit number
  return `MG${String(nextNumber).padStart(3, '0')}`
}

// Helper function to map modifier group response
function mapModifierGroupResponse(group: any) {
  return {
    ...group,
    id: group.id.toString(),
    price: group.price ? group.price.toString() : null,
    createdBy: group.createdBy ? group.createdBy.toString() : null,
    createdOn: group.createdOn ? group.createdOn.toISOString() : null,
    updatedBy: group.updatedBy ? group.updatedBy.toString() : null,
    updatedOn: group.updatedOn ? group.updatedOn.toISOString() : null
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const menuCategoryCode = searchParams.get('menuCategoryCode')

    let groups: any[] = []

    if (menuCategoryCode) {
      // Fetch modifier groups associated with the menu category
      const categoryModifiers = await masterPrisma.masterMenuCategoryModifier.findMany({
        where: {
          menuCategoryCode: menuCategoryCode
        },
        select: {
          modifierGroupCode: true
        }
      })

      // Extract unique modifier group codes
      const modifierGroupCodes = [...new Set(
        categoryModifiers
          .map((cm: any) => cm.modifierGroupCode)
          .filter(Boolean)
      )]

      // Fetch modifier groups separately
      if (modifierGroupCodes.length > 0) {
        groups = await masterPrisma.masterModifierGroup.findMany({
          where: {
            modifierGroupCode: { in: modifierGroupCodes }
          },
          orderBy: { createdOn: 'desc' }
        })
      } else {
        groups = []
      }
    } else {
      // Fetch all modifier groups
      groups = await masterPrisma.masterModifierGroup.findMany({
        orderBy: { createdOn: 'desc' }
      })
    }

    const groupsWithStringId = groups.map(mapModifierGroupResponse)

    return NextResponse.json(groupsWithStringId)
  } catch (error) {
    console.error('Error fetching modifier groups:', error)
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
      groupName,
      labelName,
      isRequired = 0,
      isMultiselect = 0,
      minSelection,
      maxSelection,
      showDefaultTop = 0,
      inheritFromMenuGroup = 0,
      priceStrategy = 1,
      price,
      isActive = 1,
    } = body

    const modifierGroupCode = await generateModifierGroupCode()

    const created = await masterPrisma.masterModifierGroup.create({
      data: {
        modifierGroupCode,
        groupName: groupName || null,
        labelName: labelName || null,
        isRequired,
        isMultiselect,
        minSelection: typeof minSelection === 'number' ? minSelection : null,
        maxSelection: typeof maxSelection === 'number' ? maxSelection : null,
        showDefaultTop,
        inheritFromMenuGroup,
        priceStrategy,
        price: typeof price === 'number' && price > 0 ? parseFloat(price.toString()) : null,
        isActive,
        createdBy: admin.adminId,
      },
    })

    return NextResponse.json(mapModifierGroupResponse(created), { status: 201 })
  } catch (error: any) {
    console.error('Error creating modifier group:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Modifier group code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

