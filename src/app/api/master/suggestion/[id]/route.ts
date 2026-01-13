import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const suggestionId = BigInt(idParam)

    const suggestion = await masterPrisma.masterSuggestion.findUnique({
      where: { suggestionId }
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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Check if suggestion exists
    const existingSuggestion = await masterPrisma.masterSuggestion.findUnique({
      where: { suggestionId }
    })

    if (!existingSuggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    // Build update data object
    const updateData: any = {
      updatedBy: admin.adminId,
      updatedOn: new Date()
    }

    if (suggestionText !== undefined) {
      updateData.suggestionText = suggestionText
    }
    
    if (category !== undefined) {
      updateData.category = category || null
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive ? 1 : 0
    }
    
    if (prepZoneCode !== undefined) {
      updateData.prepZoneCode = prepZoneCode || null
    }
    
    if (suggestionDesc !== undefined) {
      updateData.suggestionDesc = suggestionDesc || null
    }

    const updatedSuggestion = await masterPrisma.masterSuggestion.update({
      where: { suggestionId },
      data: updateData
    })

    // Note: Sync will be handled manually through sync management page
    // No automatic sync on create/update

    return NextResponse.json(mapSuggestionResponse(updatedSuggestion))
  } catch (error: any) {
    console.error('Error updating suggestion:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      )
    }

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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const suggestionId = BigInt(idParam)

    // Soft delete by setting isDelete to true
    await masterPrisma.masterSuggestion.update({
      where: { suggestionId },
      data: {
        isDelete: true,
        updatedBy: admin.adminId,
        updatedOn: new Date()
      }
    })

    // Note: Sync will be handled manually through sync management page
    // No automatic sync on delete

    return NextResponse.json({ message: 'Suggestion deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting suggestion:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
