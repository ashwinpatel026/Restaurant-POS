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
    const masterId = parseInt(resolvedParams.id)

    const menuMaster = await prisma.menuMaster.findUnique({
      where: { tblMenuMasterId: masterId }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    return NextResponse.json(menuMaster)
  } catch (error) {
    console.error('Error fetching menu master:', error)
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
    const masterId = parseInt(resolvedParams.id)
    const body = await request.json()

    const menuMaster = await prisma.menuMaster.update({
      where: { tblMenuMasterId: masterId },
      data: {
        ...body,
        updatedBy: parseInt(session.user.id),
        updatedOn: new Date()
      }
    })

    return NextResponse.json(menuMaster)
  } catch (error) {
    console.error('Error updating menu master:', error)
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
    const masterId = parseInt(resolvedParams.id)

    // Check if menu master exists
    const menuMaster = await prisma.menuMaster.findUnique({
      where: { tblMenuMasterId: masterId }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Check if menu master has any categories
    const categoriesCount = await prisma.menuCategory.count({
      where: { tblMenuMasterId: masterId }
    })

    // If menu master has categories, prevent deletion
    if (categoriesCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete menu master "${menuMaster.name}" because it contains ${categoriesCount} categor(ies). Please delete all categories first.` 
      }, { status: 400 })
    }

    // Safe to delete the menu master
    await prisma.menuMaster.delete({
      where: { tblMenuMasterId: masterId }
    })

    return NextResponse.json({ message: 'Menu master deleted successfully' })
  } catch (error) {
    console.error('Error deleting menu master:', error)
    
    // Handle foreign key constraint error specifically
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json({ 
        error: 'Cannot delete this menu master because it has related categories and menu items. Please delete all categories and items first.' 
      }, { status: 400 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
