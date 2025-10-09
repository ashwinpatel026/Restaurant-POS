import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, checkConnection } from '@/lib/database'

// Helper function to handle database operations with retry
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error.message)
      
      if (error.code === 'P1017' || error.message.includes('Server has closed the connection')) {
        if (attempt < maxRetries) {
          console.log(`Checking connection health before retry ${attempt}...`)
          const isHealthy = await checkConnection()
          if (!isHealthy) {
            console.log('Connection is not healthy, waiting longer...')
            await new Promise(resolve => setTimeout(resolve, attempt * 2000))
          } else {
            console.log(`Retrying in ${attempt * 1000}ms...`)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000))
          }
          continue
        }
      }
      
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

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

    const menuItem = await prisma.menuItem.findUnique({
      where: { tblMenuItemId: itemId }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    return NextResponse.json(menuItem)
  } catch (error) {
    console.error('Error fetching menu item:', error)
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

    const {
      name,
      labelName,
      colorCode,
      calories,
      descrip,
      skuPlu,
      isAlcohol,
      menuImg,
      priceStrategy,
      price,
      isActive,
      tblMenuCategoryId,
      selectedModifiers // Added selectedModifiers
    } = body

    // Check if menuImg is too large (base64 string length check)
    if (menuImg && menuImg.length > 2000000) { // ~2MB base64 string for 1MB file
      return NextResponse.json(
        { error: 'Image is too large. Please use a smaller image (max 1MB).' },
        { status: 400 }
      )
    }

    const menuItem = await withRetry(async () => {
      return await prisma.menuItem.update({
        where: { tblMenuItemId: itemId },
        data: {
          name,
          labelName,
          colorCode,
          calories,
          descrip,
          skuPlu: skuPlu ? parseInt(skuPlu) : null,
          isAlcohol: isAlcohol ? 1 : 0,
          menuImg: menuImg || null, // Handle empty strings
          priceStrategy: parseInt(priceStrategy),
          price: parseFloat(price),
          isActive,
          tblMenuCategoryId: parseInt(tblMenuCategoryId)
        }
      })
    })

    // Update modifier assignments if provided
    if (selectedModifiers !== undefined) {
      await withRetry(async () => {
        // Delete existing modifier assignments
        await prisma.menuItemModifier.deleteMany({
          where: { tblMenuItemId: itemId }
        })

        // Create new modifier assignments
        if (selectedModifiers.length > 0) {
          const modifierAssignments = selectedModifiers.map((modifierId: number) => ({
            tblMenuItemId: itemId,
            tblModifierId: modifierId,
            storeCode: process.env.STORE_CODE || null
          }))

          await prisma.menuItemModifier.createMany({
            data: modifierAssignments
          })
        }
      })
    }

    return NextResponse.json(menuItem)
  } catch (error) {
    console.error('Error updating menu item:', error)
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
    const itemId = parseInt(resolvedParams.id)

    // Check if menu item exists
    const menuItem = await prisma.menuItem.findUnique({
      where: { tblMenuItemId: itemId }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Check for related modifiers
    const modifiersCount = await prisma.modifier.count({
      where: { tblMenuItemId: itemId }
    })

    const menuItemModifiersCount = await prisma.menuItemModifier.count({
      where: { tblMenuItemId: itemId }
    })

    const totalModifiers = modifiersCount + menuItemModifiersCount

    // If menu item has modifiers, prevent deletion
    if (totalModifiers > 0) {
      return NextResponse.json({ 
        error: `Cannot delete menu item "${menuItem.name}" because it has ${totalModifiers} modifier(s) associated with it. Please remove all modifiers first.` 
      }, { status: 400 })
    }

    // Safe to delete the menu item
    await prisma.menuItem.delete({
      where: { tblMenuItemId: itemId }
    })

    return NextResponse.json({ message: 'Menu item deleted successfully' })
  } catch (error) {
    console.error('Error deleting menu item:', error)
    
    // Handle foreign key constraint error specifically
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json({ 
        error: 'Cannot delete this menu item because it has related modifiers or orders. Please remove all related data first.' 
      }, { status: 400 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
