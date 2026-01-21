import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission, canAccessStore } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// GET endpoint to fetch all existing formula values for a menu item
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id || !session?.user?.role) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check permission to view menu items
        if (!(await checkLocationPermission(session.user.role, 'menu.view'))) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
        
        // Get selected store from query
        const searchParams = request.nextUrl.searchParams
        const queryStoreCode = searchParams.get('storeCode')
        const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
        
        if (!selectedStoreCode) {
            return NextResponse.json(
                { error: 'No accessible store selected' },
                { status: 403 }
            )
        }

        const { id } = await params

        // Get menu item to retrieve menuItemCode and verify store access
        const menuItem = await prisma.menuItem.findUnique({
            where: { menuItemId: BigInt(id) },
            select: { menuItemCode: true, storeCode: true }
        })

        if (!menuItem || !menuItem.menuItemCode) {
            return NextResponse.json(
                { error: 'Menu item not found' },
                { status: 404 }
            )
        }

        // Verify user has access to this menu item's store
        if (menuItem.storeCode && !canAccessStore(accessInfo, menuItem.storeCode)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Fetch all time event relationships for this menu item filtered by storeCode
        const menuItemTimeEvents = await prisma.menuItemTimeEvent.findMany({
            where: { 
                menuItemCode: menuItem.menuItemCode,
                storeCode: selectedStoreCode
            },
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
