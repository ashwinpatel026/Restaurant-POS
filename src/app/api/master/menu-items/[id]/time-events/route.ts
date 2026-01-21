import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// GET endpoint to fetch all existing formula values for a menu item
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await verifyMasterAdmin(request)

        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

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

        // Fetch all time event relationships for this menu item
        const menuItemTimeEvents = await masterPrisma.masterMenuItemTimeEvent.findMany({
            where: { menuItemCode: menuItem.menuItemCode },
            select: {
                timeEventCode: true,
                formulaValue: true,
                isFixedValue: true,
                isDelete: true,
                isOverride: true
            }
        })

        // Convert to map format for easy lookup
        const formulaMap: Record<string, { formulaValue: number; isFixedValue: boolean; isDelete: boolean; isOverride: boolean }> = {}
        menuItemTimeEvents.forEach((item) => {
            if (item.timeEventCode) {
                formulaMap[item.timeEventCode] = {
                    formulaValue: item.formulaValue ? Number(item.formulaValue) : 0,
                    isFixedValue: item.isFixedValue || false,
                    isDelete: item.isDelete || false,
                    isOverride: item.isOverride || false
                }
            }
        })

        return NextResponse.json(formulaMap)
    } catch (error: any) {
        console.error('Error fetching menu item time event formula values:', error)
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        )
    }
}
