import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to map suggestion response
function mapSuggestionResponse(suggestion: any) {
  return {
    ...suggestion,
    suggestionId: suggestion.suggestionId.toString(),
    createdAt: suggestion.createdAt ? suggestion.createdAt.toISOString() : null,
    updatedAt: suggestion.updatedAt ? suggestion.updatedAt.toISOString() : null,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const { id: idParam } = await params
    const suggestionId = BigInt(idParam)

    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const suggestion = await prisma.suggestion.findFirst({
      where: {
        suggestionId,
        ...storeFilter
      }
    })

    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    return NextResponse.json(mapSuggestionResponse(suggestion))
  } catch (error) {
    console.error('Error fetching suggestion:', error)
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
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to update suggestions
    if (!(await checkLocationPermission(session.user.role, 'suggestion.update'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const { id: idParam } = await params
    const suggestionId = BigInt(idParam)
    const body = await request.json()

    const {
      suggestionText,
      category,
      isActive,
      prepZoneCode,
      suggestionDesc
    } = body

    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const existingSuggestion = await prisma.suggestion.findFirst({
      where: {
        suggestionId,
        ...storeFilter
      }
    })

    if (!existingSuggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    const suggestion = await prisma.suggestion.update({
      where: { suggestionId },
      data: {
        suggestionText: suggestionText ?? existingSuggestion.suggestionText,
        category: category !== undefined ? (category || null) : existingSuggestion.category,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : existingSuggestion.isActive,
        prepZoneCode: prepZoneCode !== undefined ? (prepZoneCode || null) : existingSuggestion.prepZoneCode,
        suggestionDesc: suggestionDesc !== undefined ? (suggestionDesc || null) : existingSuggestion.suggestionDesc
      }
    })

    return NextResponse.json(mapSuggestionResponse(suggestion))
  } catch (error) {
    console.error('Error updating suggestion:', error)
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
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to delete suggestions
    if (!(await checkLocationPermission(session.user.role, 'suggestion.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const { id: idParam } = await params
    const suggestionId = BigInt(idParam)

    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)
    const existingSuggestion = await prisma.suggestion.findFirst({
      where: {
        suggestionId,
        ...storeFilter
      }
    })

    if (!existingSuggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    await prisma.suggestion.update({
      where: { suggestionId },
      data: {
        isDelete: true,
        isActive: 0
      }
    })

    return NextResponse.json({ message: 'Suggestion deleted successfully' })
  } catch (error) {
    console.error('Error deleting suggestion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
