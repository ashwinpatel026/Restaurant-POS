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
    const categoryId = parseInt(resolvedParams.id)

    const category = await prisma.menuCategory.findUnique({
      where: { tblMenuCategoryId: categoryId }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error fetching category:', error)
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
    const categoryId = parseInt(resolvedParams.id)
    const body = await request.json()

    const { name, colorCode, isActive, tblMenuMasterId } = body

    const category = await prisma.menuCategory.update({
      where: { tblMenuCategoryId: categoryId },
      data: {
        name,
        colorCode,
        isActive,
        tblMenuMasterId: parseInt(tblMenuMasterId)
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating category:', error)
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
    const categoryId = parseInt(resolvedParams.id)

    // Check if category exists
    const category = await prisma.menuCategory.findUnique({
      where: { tblMenuCategoryId: categoryId }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if category has any menu items
    const itemsCount = await prisma.menuItem.count({
      where: { tblMenuCategoryId: categoryId }
    })

    // If category has menu items, prevent deletion
    if (itemsCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete category "${category.name}" because it contains ${itemsCount} menu item(s). Please delete all menu items first or move them to another category.` 
      }, { status: 400 })
    }

    // Safe to delete the category
    await prisma.menuCategory.delete({
      where: { tblMenuCategoryId: categoryId }
    })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    
    // Handle foreign key constraint error specifically
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json({ 
        error: 'Cannot delete this category because it has related menu items. Please delete all menu items first or move them to another category.' 
      }, { status: 400 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
