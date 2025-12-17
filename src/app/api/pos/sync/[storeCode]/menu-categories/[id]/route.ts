import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/menu-categories/:id Get menu category
 * @apiName GetMenuCategory
 * @apiGroup MenuCategories
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Menu category identifier (BigInt `menuCategoryId` or `menuCategoryCode`)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    let category = null
    const catId = parseInt(id)
    if (!isNaN(catId)) {
      category = await locationPrisma.menuCategory.findFirst({
        where: { menuCategoryId: catId, storeCode }
      })
    }
    if (!category) {
      category = await locationPrisma.menuCategory.findFirst({
        where: { menuCategoryCode: id, storeCode }
      })
    }

    if (!category || category.storeCode !== storeCode) {
      return NextResponse.json({ error: 'Menu category not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...category,
        menuCategoryId: category.menuCategoryId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching menu category:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/menu-categories/:id Update menu category
 * @apiName UpdateMenuCategory
 * @apiGroup MenuCategories
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Menu category identifier (BigInt `menuCategoryId` or `menuCategoryCode`)
 *
 * @apiBody {String} [name] Category name
 * @apiBody {String} [colorCode] Color code
 * @apiBody {Number|Boolean} [isActive] Active flag
 * @apiBody {Number} [updatedBy] User ID who updated
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    let existing = null
    const catId = parseInt(id)
    if (!isNaN(catId)) {
      existing = await locationPrisma.menuCategory.findFirst({
        where: { menuCategoryId: catId, storeCode }
      })
    }
    if (!existing) {
      existing = await locationPrisma.menuCategory.findFirst({
        where: { menuCategoryCode: id, storeCode }
      })
    }

    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json({ error: 'Menu category not found' }, { status: 404 })
    }

    const updateData: any = addPOSSyncMetadata({}, storeCode)
    updateData.syncId = existing.syncId
    if (body.name !== undefined) updateData.name = body.name
    if (body.colorCode !== undefined) updateData.colorCode = body.colorCode
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0
    if (body.updatedBy !== undefined) updateData.updatedBy = parseInt(body.updatedBy)

    const updated = await locationPrisma.menuCategory.update({
      where: { menuCategoryId: existing.menuCategoryId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Menu category updated successfully',
      data: {
        ...updated,
        menuCategoryId: updated.menuCategoryId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating menu category:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/menu-categories/:id Delete menu category
 * @apiName DeleteMenuCategory
 * @apiGroup MenuCategories
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Menu category identifier (BigInt `menuCategoryId` or `menuCategoryCode`)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    let existing = null
    const catId = parseInt(id)
    if (!isNaN(catId)) {
      existing = await locationPrisma.menuCategory.findFirst({
        where: { menuCategoryId: catId, storeCode }
      })
    }
    if (!existing) {
      existing = await locationPrisma.menuCategory.findFirst({
        where: { menuCategoryCode: id, storeCode }
      })
    }

    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json({ error: 'Menu category not found' }, { status: 404 })
    }

    await locationPrisma.menuCategory.delete({
      where: { menuCategoryId: existing.menuCategoryId }
    })

    return NextResponse.json({
      success: true,
      message: 'Menu category deleted successfully',
      data: {
        menuCategoryCode: existing.menuCategoryCode,
        menuCategoryId: existing.menuCategoryId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting menu category:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

