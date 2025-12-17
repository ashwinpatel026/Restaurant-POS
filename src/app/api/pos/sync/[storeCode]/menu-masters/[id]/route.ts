import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/menu-masters/:id Get menu master
 * @apiName GetMenuMaster
 * @apiGroup MenuMasters
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Menu master identifier (BigInt `menuMasterId` or `menuMasterCode`)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Menu master not found
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

    let menuMaster = null
    try {
      const masterId = BigInt(id)
      menuMaster = await locationPrisma.menuMaster.findFirst({
        where: { menuMasterId: masterId, storeCode }
      })
    } catch {
      // ignore BigInt parse errors
    }

    if (!menuMaster) {
      menuMaster = await locationPrisma.menuMaster.findFirst({
        where: { menuMasterCode: id, storeCode }
      })
    }

    if (!menuMaster || menuMaster.storeCode !== storeCode) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...menuMaster,
        menuMasterId: menuMaster.menuMasterId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching menu master:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/menu-masters/:id Update menu master
 * @apiName UpdateMenuMaster
 * @apiGroup MenuMasters
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Menu master identifier (BigInt `menuMasterId` or `menuMasterCode`)
 *
 * @apiBody {String} [name] Name
 * @apiBody {String} [labelName] Label name
 * @apiBody {String} [colorCode] Color code
 * @apiBody {Object} [prepZoneCode] Prep zone codes (JSON)
 * @apiBody {Object} [stationCode] Station codes (JSON)
 * @apiBody {Number|Boolean} [isEventMenu] Event menu flag
 * @apiBody {Number|Boolean} [isActive] Active flag
 * @apiBody {Number} [updatedBy] User ID who updated
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Menu master not found
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
    try {
      const masterId = BigInt(id)
      existing = await locationPrisma.menuMaster.findFirst({
        where: { menuMasterId: masterId, storeCode }
      })
    } catch {
      // ignore BigInt parse errors
    }

    if (!existing) {
      existing = await locationPrisma.menuMaster.findFirst({
        where: { menuMasterCode: id, storeCode }
      })
    }

    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    const updateData: any = addPOSSyncMetadata({}, storeCode)
    updateData.syncId = existing.syncId

    if (body.name !== undefined) updateData.name = body.name
    if (body.labelName !== undefined) updateData.labelName = body.labelName
    if (body.colorCode !== undefined) updateData.colorCode = body.colorCode
    if (body.prepZoneCode !== undefined) updateData.prepZoneCode = body.prepZoneCode
    if (body.stationCode !== undefined) updateData.stationCode = body.stationCode
    if (body.isEventMenu !== undefined) updateData.isEventMenu = body.isEventMenu ? 1 : 0
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0
    if (body.updatedBy !== undefined) updateData.updatedBy = parseInt(body.updatedBy)

    const updated = await locationPrisma.menuMaster.update({
      where: { menuMasterId: existing.menuMasterId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Menu master updated successfully',
      data: {
        ...updated,
        menuMasterId: updated.menuMasterId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating menu master:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/menu-masters/:id Delete menu master
 * @apiName DeleteMenuMaster
 * @apiGroup MenuMasters
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Menu master identifier (BigInt `menuMasterId` or `menuMasterCode`)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Menu master not found
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
    try {
      const masterId = BigInt(id)
      existing = await locationPrisma.menuMaster.findFirst({
        where: { menuMasterId: masterId, storeCode }
      })
    } catch {
      // ignore BigInt parse errors
    }

    if (!existing) {
      existing = await locationPrisma.menuMaster.findFirst({
        where: { menuMasterCode: id, storeCode }
      })
    }

    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    await locationPrisma.menuMaster.delete({
      where: { menuMasterId: existing.menuMasterId }
    })

    return NextResponse.json({
      success: true,
      message: 'Menu master deleted successfully',
      data: {
        menuMasterCode: existing.menuMasterCode,
        menuMasterId: existing.menuMasterId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting menu master:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

