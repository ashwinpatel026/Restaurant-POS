import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, checkLocationPermission, canAccessStore } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
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

        const deptCode = searchParams.get('deptCode')
        const basePrice = searchParams.get('basePrice')

        // Validate required parameters
        if (!deptCode || !basePrice) {
            return NextResponse.json(
                { error: 'Department code and base price are required' },
                { status: 400 }
            )
        }

        // Validate base price is a valid number
        const basePriceNum = parseFloat(basePrice)
        if (isNaN(basePriceNum) || basePriceNum < 0) {
            return NextResponse.json(
                { error: 'Base price must be a valid positive number' },
                { status: 400 }
            )
        }

        // Call PostgreSQL function fn_get_event_price with storeCode parameter
        // The function filters location database time events by storeCode
        const results = await prisma.$queryRawUnsafe<Array<{
            event_name: string
            final_price: number | string
        }>>(
            `SELECT * FROM fn_get_event_price($1, $2, $3)`,
            deptCode,
            basePriceNum,
            selectedStoreCode
        )

        // Convert final_price to number if it's a string (PostgreSQL Decimal type)
        const formattedResults = results.map((row) => ({
            event_name: row.event_name,
            final_price: typeof row.final_price === 'string'
                ? parseFloat(row.final_price)
                : Number(row.final_price)
        }))

        return NextResponse.json(formattedResults)
    } catch (error: any) {
        console.error('Error calling fn_get_event_price:', error)
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        )
    }
}
