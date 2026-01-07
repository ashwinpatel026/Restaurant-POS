import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { Prisma } from '@prisma/master-client'

// Helper function to sanitize prefix array
function sanitizePrefix(input: unknown): string[] {
  if (!input) {
    return []
  }

  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : []

  const unique = new Set<string>()

  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        unique.add(trimmed)
      }
    }
  }

  return Array.from(unique)
}

// Helper function to normalize prefix from JSON
function normalizePrefix(value: unknown): string[] {
  if (!value) return []
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []
  return values
    .map((v) => (typeof v === 'string' ? v.trim() : String(v).trim()))
    .filter((v) => v)
}

// Helper function to map modifier group response
function mapModifierGroupResponse(group: any) {
  return {
    ...group,
    id: group.id.toString(),
    price: group.price ? group.price.toString() : null,
    prefix: normalizePrefix(group.prefix),
    createdBy: group.createdBy ? group.createdBy.toString() : null,
    createdOn: group.createdOn ? group.createdOn.toISOString() : null,
    updatedBy: group.updatedBy ? group.updatedBy.toString() : null,
    updatedOn: group.updatedOn ? group.updatedOn.toISOString() : null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const groupId = BigInt(idParam)

    const group = await masterPrisma.masterModifierGroup.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json({ error: 'Modifier group not found' }, { status: 404 })
    }

    return NextResponse.json(mapModifierGroupResponse(group))
  } catch (error) {
    console.error('Error fetching modifier group:', error)
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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const groupId = BigInt(idParam)
    const body = await request.json()

    const {
      groupName,
      labelName,
      isRequired,
      isMultiselect,
      minSelection,
      maxSelection,
      showDefaultTop,
      inheritFromMenuGroup,
      priceStrategy,
      price,
      prefix,
      isActive,
    } = body

    const prefixes = sanitizePrefix(prefix)

    const updateData: Record<string, unknown> = {
      groupName: groupName ?? null,
      labelName: labelName ?? null,
      isRequired: typeof isRequired === 'number' ? isRequired : undefined,
      isMultiselect: typeof isMultiselect === 'number' ? isMultiselect : undefined,
      minSelection: typeof minSelection === 'number' ? minSelection : null,
      maxSelection: typeof maxSelection === 'number' ? maxSelection : null,
      showDefaultTop: typeof showDefaultTop === 'number' ? showDefaultTop : undefined,
      inheritFromMenuGroup: typeof inheritFromMenuGroup === 'number' ? inheritFromMenuGroup : undefined,
      isActive: typeof isActive === 'number' ? isActive : undefined,
      updatedBy: admin.adminId,
      updatedOn: new Date(),
    }

    // Handle priceStrategy and price
    if (typeof priceStrategy === 'number') {
      updateData.priceStrategy = priceStrategy
      
      // If priceStrategy is 1 or 2, set price to null
      // If priceStrategy is 3, save the price value (even if it's 0)
      if (priceStrategy === 1 || priceStrategy === 2) {
        updateData.price = null
      } else if (priceStrategy === 3) {
        // Save price for strategy 3 (even if it's 0)
        if (typeof price === 'number') {
          updateData.price = parseFloat(price.toString())
        } else if (price !== undefined && price !== null) {
          const parsedPrice = parseFloat(String(price))
          updateData.price = isNaN(parsedPrice) ? null : parsedPrice
        } else {
          updateData.price = null
        }
      } else {
        // For any other strategy, set to null
        updateData.price = null
      }
    }

    if (prefixes.length > 0) {
      updateData.prefix = prefixes
    } else {
      updateData.prefix = Prisma.JsonNull
    }

    const updated = await masterPrisma.masterModifierGroup.update({
      where: { id: groupId },
      data: updateData as Prisma.MasterModifierGroupUpdateInput,
    })

    return NextResponse.json(mapModifierGroupResponse(updated))
  } catch (error: any) {
    console.error('Error updating modifier group:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Modifier group not found' },
        { status: 404 }
      )
    }

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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const groupId = BigInt(idParam)

    const group = await masterPrisma.masterModifierGroup.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json({ error: 'Modifier group not found' }, { status: 404 })
    }

    // If items exist under this group, delete them first, then delete group
    if (group.modifierGroupCode) {
      await masterPrisma.masterModifierItem.deleteMany({
        where: { modifierGroupCode: group.modifierGroupCode }
      })
    }

    await masterPrisma.masterModifierGroup.delete({
      where: { id: groupId }
    })

    return NextResponse.json({ message: 'Modifier group deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting modifier group:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Modifier group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

