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
    const itemId = parseInt(resolvedParams.id)

    const modifierItem = await prisma.modifierItem.findUnique({
      where: { tblModifierItemId: itemId },
      include: {
        modifier: {
          include: {
            menuItem: {
              include: {
                menuCategory: {
                  include: {
                    menuMaster: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!modifierItem) {
      return NextResponse.json({ error: 'Modifier item not found' }, { status: 404 })
    }

    return NextResponse.json(modifierItem)
  } catch (error) {
    console.error('Error fetching modifier item:', error)
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
    const itemId = parseInt(resolvedParams.id)
    const body = await request.json()

    const { name, labelName, colorCode, price, tblModifierId } = body;

    const modifierItem = await prisma.modifierItem.update({
      where: { tblModifierItemId: itemId },
      data: {
        name,
        labelName,
        colorCode,
        price: parseFloat(price),
        tblModifierId: parseInt(tblModifierId)
      }
    })

    // Fetch modifier data for the updated item
    const modifier = await prisma.modifier.findUnique({
      where: { tblModifierId: modifierItem.tblModifierId },
      select: {
        tblModifierId: true,
        name: true,
        labelName: true
      }
    })

    const itemWithModifier = {
      ...modifierItem,
      modifier
    }

    return NextResponse.json(itemWithModifier)
  } catch (error) {
    console.error('Error updating modifier item:', error)
    
    // Provide more specific error messages
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Modifier item not found' },
        { status: 404 }
      )
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A modifier item with this name already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
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
    const itemId = parseInt(resolvedParams.id)

    await prisma.modifierItem.delete({
      where: { tblModifierItemId: itemId }
    })

    return NextResponse.json({ message: 'Modifier item deleted successfully' })
  } catch (error) {
    console.error('Error deleting modifier item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
