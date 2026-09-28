import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  buildStoreFilter,
  checkLocationPermission,
} from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

function serializeCourse(course: any) {
  return {
    ...course,
    courseId: course.courseId,
    createdBy: course.createdBy ? course.createdBy.toString() : null,
    updatedBy: course.updatedBy ? course.updatedBy.toString() : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkLocationPermission(session.user.role, 'courses.view'))) {
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

    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const courses = await prisma.course.findMany({
      where: {
        ...storeFilter,
        isDelete: false,
      },
      orderBy: [{ displayOrder: 'asc' }, { courseId: 'asc' }],
    })

    return NextResponse.json(courses.map(serializeCourse))
  } catch (error) {
    console.error('Error fetching courses:', error)
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

    if (!(await checkLocationPermission(session.user.role, 'courses.create'))) {
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

    const body = await request.json()
    const courseName = String(body.courseName || '').trim()
    const displayOrder = Number(body.displayOrder)

    if (!courseName) {
      return NextResponse.json(
        { error: 'Course name is required' },
        { status: 400 }
      )
    }

    if (courseName.length > 50) {
      return NextResponse.json(
        { error: 'Course name must be 50 characters or fewer' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(displayOrder)) {
      return NextResponse.json(
        { error: 'Display order is required' },
        { status: 400 }
      )
    }

    const isDuplicate = await prisma.course.findFirst({
      where: {
        storeCode: selectedStoreCode,
        isDelete: false,
        courseName: { equals: courseName, mode: 'insensitive' },
      },
    })
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Course with this name already exists' },
        { status: 400 }
      )
    }

    const userId = parseInt(session.user.id, 10)

    const course = await prisma.course.create({
      data: {
        courseName,
        displayOrder,
        isActive: body.isActive ?? true,
        createdBy: isNaN(userId) ? null : BigInt(userId),
        updatedBy: isNaN(userId) ? null : BigInt(userId),
        createdOn: new Date(),
        updatedOn: new Date(),
        storeCode: selectedStoreCode,
        syncSource: 'location',
      },
    })

    return NextResponse.json(serializeCourse(course), { status: 201 })
  } catch (error: any) {
    console.error('Error creating course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
