import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { checkDuplicate } from '@/lib/validation'

// Helper function to generate unique suggestion code
async function generateSuggestionCode(): Promise<string> {
  // Get the latest suggestion code from master database
  const latestSuggestion = await masterPrisma.masterSuggestion.findFirst({
    orderBy: { suggestionId: 'desc' },
    select: { suggestionCode: true }
  })

  let nextNumber = 1
  
  if (latestSuggestion?.suggestionCode) {
    // Extract number from code like "SG001", "SG002", etc.
    const match = latestSuggestion.suggestionCode.match(/^SG(\d+)$/i)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as SG + number starting from 1 (padded to 3 digits)
  return `SG${nextNumber.toString().padStart(3, '0')}`
}

// Helper function to map suggestion response
function mapSuggestionResponse(suggestion: any) {
  return {
    ...suggestion,
    suggestionId: suggestion.suggestionId.toString(),
    createdBy: suggestion.createdBy ? suggestion.createdBy.toString() : null,
    createdOn: suggestion.createdOn ? suggestion.createdOn.toISOString() : null,
    updatedBy: suggestion.updatedBy ? suggestion.updatedBy.toString() : null,
    updatedOn: suggestion.updatedOn ? suggestion.updatedOn.toISOString() : null
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const isActive = url.searchParams.get('isActive')
    const prepZoneCode = url.searchParams.get('prepZoneCode')

    const where: any = {}
    
    if (category) {
      where.category = category
    }
    
    if (isActive !== null) {
      where.isActive = parseInt(isActive)
    }
    
    if (prepZoneCode) {
      where.prepZoneCode = prepZoneCode
    }

    const suggestions = await masterPrisma.masterSuggestion.findMany({
      where,
      orderBy: { createdOn: 'desc' }
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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      suggestionText, 
      category, 
      isActive, 
      prepZoneCode, 
      suggestionDesc 
    } = body

    // Validate required fields
    if (!suggestionText) {
      return NextResponse.json(
        { error: 'Suggestion text is required' },
        { status: 400 }
      )
    }

    // Auto-generate suggestion code with SG prefix
    const finalSuggestionCode = await generateSuggestionCode()

    // Check for duplicate code (shouldn't happen, but safety check)
    const existingSuggestion = await masterPrisma.masterSuggestion.findUnique({
      where: { suggestionCode: finalSuggestionCode }
    })

    if (existingSuggestion) {
      return NextResponse.json(
        { error: 'Suggestion code already exists. Please try again.' },
        { status: 400 }
      )
    }

    const suggestion = await masterPrisma.masterSuggestion.create({
      data: {
        suggestionCode: finalSuggestionCode,
        suggestionText,
        category: category || null,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
        prepZoneCode: prepZoneCode || null,
        suggestionDesc: suggestionDesc || null,
        createdBy: admin.adminId
      }
    })

    // Note: Sync will be handled manually through sync management page
    // No automatic sync on create/update

    return NextResponse.json(mapSuggestionResponse(suggestion), { status: 201 })
  } catch (error: any) {
    console.error('Error creating suggestion:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Suggestion code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
