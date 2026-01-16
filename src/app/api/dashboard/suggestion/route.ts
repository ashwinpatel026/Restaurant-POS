import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to generate unique suggestion code
async function generateSuggestionCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}SG`
  
  const suggestions = await prisma.suggestion.findMany({
    where: {
      suggestionCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { suggestionCode: true },
    orderBy: { suggestionId: 'desc' }
  })

  let nextNumber = 1
  
  if (suggestions.length > 0) {
    const numbers = suggestions
      .map(suggestion => {
        const match = suggestion.suggestionCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  return `${prefix}${nextNumber}`
}

// Helper function to map suggestion response
function mapSuggestionResponse(suggestion: any) {
  return {
    ...suggestion,
    suggestionId: suggestion.suggestionId.toString(),
    createdAt: suggestion.createdAt ? suggestion.createdAt.toISOString() : null,
    updatedAt: suggestion.updatedAt ? suggestion.updatedAt.toISOString() : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view suggestions
    if (!(await checkLocationPermission(session.user.role, 'suggestion.view'))) {
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
    
    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const suggestions = await prisma.suggestion.findMany({
      where: {
        ...storeFilter,
        isDelete: false
      },
      orderBy: { createdAt: 'desc' }
    })

    const suggestionsWithStringId = suggestions.map(mapSuggestionResponse)

    return NextResponse.json(suggestionsWithStringId)
  } catch (error) {
    console.error('Error fetching suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to create suggestions
    if (!(await checkLocationPermission(session.user.role, 'suggestion.create'))) {
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

    const body = await request.json()
    const {
      suggestionText,
      category,
      isActive,
      prepZoneCode,
      suggestionDesc
    } = body

    if (!suggestionText) {
      return NextResponse.json(
        { error: 'Suggestion text is required' },
        { status: 400 }
      )
    }

    const finalSuggestionCode = await generateSuggestionCode(selectedStoreCode)

    const suggestion = await prisma.suggestion.create({
      data: {
        suggestionCode: finalSuggestionCode,
        suggestionText,
        category: category || null,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
        prepZoneCode: prepZoneCode || null,
        suggestionDesc: suggestionDesc || null,
        storeCode: selectedStoreCode,
        isDelete: false,
      }
    })

    return NextResponse.json(mapSuggestionResponse(suggestion), { status: 201 })
  } catch (error: any) {
    console.error('Error creating suggestion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
