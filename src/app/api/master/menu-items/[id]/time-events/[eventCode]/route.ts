import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; eventCode: string }> }
) {
    try {
        const admin = await verifyMasterAdmin(request)

        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, eventCode } = await params
        const body = await request.json()

        // Validate formula value
        const formulaValue = body.formulaValue
        if (formulaValue === undefined || formulaValue === null) {
            return NextResponse.json(
                { error: 'Formula value is required' },
                { status: 400 }
            )
        }

        const formulaValueNum = parseFloat(formulaValue)
        if (isNaN(formulaValueNum)) {
            return NextResponse.json(
                { error: 'Formula value must be a valid number' },
                { status: 400 }
            )
        }

        // Get menu item to retrieve menuItemCode
        const menuItem = await masterPrisma.masterMenuItem.findUnique({
            where: { menuItemId: BigInt(id) },
            select: { menuItemCode: true }
        })

        if (!menuItem || !menuItem.menuItemCode) {
            return NextResponse.json(
                { error: 'Menu item not found' },
                { status: 404 }
            )
        }

        // Get time event to retrieve byFixedValue flag
        const timeEvent = await masterPrisma.masterTimeEvent.findUnique({
            where: { eventCode },
            select: { byFixedValue: true }
        })

        if (!timeEvent) {
            return NextResponse.json(
                { error: 'Time event not found' },
                { status: 404 }
            )
        }

        // Check if record exists
        const existing = await masterPrisma.masterMenuItemTimeEvent.findFirst({
            where: {
                menuItemCode: menuItem.menuItemCode,
                timeEventCode: eventCode
            }
        })

        let menuItemTimeEvent
        if (existing) {
            // Update existing record
            menuItemTimeEvent = await masterPrisma.masterMenuItemTimeEvent.update({
                where: { menuItemTimeEventId: existing.menuItemTimeEventId },
                data: {
                    formulaValue: formulaValueNum,
                    isFixedValue: timeEvent.byFixedValue,
                    updatedBy: admin.adminId,
                    updatedOn: new Date()
                }
            })
        } else {
            // Create new record
            menuItemTimeEvent = await masterPrisma.masterMenuItemTimeEvent.create({
                data: {
                    menuItemCode: menuItem.menuItemCode,
                    timeEventCode: eventCode,
                    formulaValue: formulaValueNum,
                    isFixedValue: timeEvent.byFixedValue,
                    createdBy: admin.adminId
                }
            })
        }

        return NextResponse.json({
            success: true,
            data: {
                ...menuItemTimeEvent,
                menuItemTimeEventId: menuItemTimeEvent.menuItemTimeEventId.toString(),
                formulaValue: menuItemTimeEvent.formulaValue ? Number(menuItemTimeEvent.formulaValue) : null,
                createdBy: menuItemTimeEvent.createdBy?.toString() || null,
                updatedBy: menuItemTimeEvent.updatedBy?.toString() || null
            }
        })
    } catch (error: any) {
        console.error('Error updating menu item time event formula value:', error)

        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Record already exists' },
                { status: 409 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        )
    }
}

