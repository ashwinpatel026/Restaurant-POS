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
    const modifierId = parseInt(resolvedParams.id)

    const modifier = await prisma.modifier.findUnique({
      where: { tblModifierId: modifierId }
    })

    if (!modifier) {
      return NextResponse.json({ error: 'Modifier not found' }, { status: 404 })
    }

    return NextResponse.json(modifier)
  } catch (error) {
    console.error('Error fetching modifier:', error)
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
    const modifierId = parseInt(resolvedParams.id)
    const body = await request.json()
    
    const {
      name,
      labelName,
      colorCode,
      priceStrategy,
      price,
      required,
      isMultiselect,
      minSelection,
      maxSelection,
      modifierItems
    } = body

    // Update the modifier
    const modifier = await prisma.modifier.update({
      where: { tblModifierId: modifierId },
      data: {
        name,
        labelName,
        colorCode,
        priceStrategy: parseInt(priceStrategy),
        price: parseFloat(price || 0),
        required: parseInt(required),
        isMultiselect: parseInt(isMultiselect),
        minSelection: parseInt(minSelection),
        maxSelection: parseInt(maxSelection)
      }
    })

    // Update modifier items if provided
    if (modifierItems && modifierItems.length > 0) {
      // Delete existing modifier items
      await prisma.modifierItem.deleteMany({
        where: { tblModifierId: modifierId }
      })

      // Create new modifier items
      const modifierItemsData = modifierItems.map((item: any) => ({
        name: item.name,
        labelName: item.labelName || item.name,
        colorCode: item.colorCode || '#3B82F6',
        price: item.price || 0,
        tblModifierId: modifier.tblModifierId,
        storeCode: 'MAIN'
      }))

      await prisma.modifierItem.createMany({
        data: modifierItemsData
      })
    }

    return NextResponse.json(modifier)
  } catch (error) {
    console.error('Error updating modifier:', error)
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
    const modifierId = parseInt(resolvedParams.id)

    await prisma.modifier.delete({
      where: { tblModifierId: modifierId }
    })

    return NextResponse.json({ message: 'Modifier deleted successfully' })
  } catch (error) {
    console.error('Error deleting modifier:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
