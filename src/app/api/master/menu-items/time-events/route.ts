import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

export async function GET(request: NextRequest) {
    try {
        const admin = await verifyMasterAdmin(request)

        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
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

        // Call PostgreSQL function fn_get_event_price
        const results = await masterPrisma.$queryRawUnsafe<Array<{
            event_name: string
            final_price: number | string
        }>>(
            `SELECT * FROM fn_get_event_price($1, $2)`,
            deptCode,
            basePriceNum
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
