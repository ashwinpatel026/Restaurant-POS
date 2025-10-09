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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (categoryId) {
      where.tblMenuCategoryId = parseInt(categoryId)
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true' ? 1 : 0
    }

    const menuItems = await prisma.menuItem.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json(menuItems)
  } catch (error) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      return await prisma.menuItem.create({
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
          tblMenuCategoryId: parseInt(tblMenuCategoryId),
          createdBy: parseInt(session.user.id),
          storeCode: process.env.STORE_CODE || null
        }
      })
    })

    // Create modifier assignments if provided
    if (selectedModifiers && selectedModifiers.length > 0) {
      await withRetry(async () => {
        const modifierAssignments = selectedModifiers.map((modifierId: number) => ({
          tblMenuItemId: menuItem.tblMenuItemId,
          tblModifierId: modifierId,
          storeCode: process.env.STORE_CODE || null
        }))

        await prisma.menuItemModifier.createMany({
          data: modifierAssignments
        })
      })
    }

    return NextResponse.json(menuItem, { status: 201 })
  } catch (error) {
    console.error('Error creating menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
