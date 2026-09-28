import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  canAccessStore,
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params
    const courseId = parseInt(resolvedParams.id, 10)
    if (!Number.isInteger(courseId)) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const course = await prisma.course.findUnique({
      where: { courseId },
    })

    if (!course || course.isDelete) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (selectedStoreCode && course.storeCode !== selectedStoreCode) {
      if (!canAccessStore(accessInfo, course.storeCode || '')) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }
    }

    return NextResponse.json(serializeCourse(course))
  } catch (error) {
    console.error('Error fetching course:', error)
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

    if (!(await checkLocationPermission(session.user.role, 'courses.update'))) {
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

    const resolvedParams = await params
    const courseId = parseInt(resolvedParams.id, 10)
    if (!Number.isInteger(courseId)) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
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

    const existingCourse = await prisma.course.findUnique({
      where: { courseId },
    })

    if (!existingCourse || existingCourse.isDelete) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (
      existingCourse.storeCode &&
      !canAccessStore(accessInfo, existingCourse.storeCode)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const isDuplicate = await prisma.course.findFirst({
      where: {
        storeCode: existingCourse.storeCode || selectedStoreCode,
        isDelete: false,
        courseName: { equals: courseName, mode: 'insensitive' },
        NOT: { courseId },
      },
    })
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Course with this name already exists' },
        { status: 400 }
      )
    }

    const userId = parseInt(session.user.id, 10)

    const course = await prisma.course.update({
      where: { courseId },
      data: {
        courseName,
        displayOrder,
        isActive: body.isActive ?? existingCourse.isActive,
        updatedOn: new Date(),
        updatedBy: isNaN(userId) ? existingCourse.updatedBy : BigInt(userId),
        storeCode: existingCourse.storeCode || selectedStoreCode,
        syncSource: 'location',
      },
    })

    return NextResponse.json(serializeCourse(course))
  } catch (error: any) {
    console.error('Error updating course:', error)
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

    if (!(await checkLocationPermission(session.user.role, 'courses.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    const resolvedParams = await params
    const courseId = parseInt(resolvedParams.id, 10)
    if (!Number.isInteger(courseId)) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const existingCourse = await prisma.course.findUnique({
      where: { courseId },
    })

    if (!existingCourse || existingCourse.isDelete) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (
      existingCourse.storeCode &&
      !canAccessStore(accessInfo, existingCourse.storeCode)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const userId = parseInt(session.user.id, 10)

    await prisma.course.update({
      where: { courseId },
      data: {
        isDelete: true,
        updatedOn: new Date(),
        updatedBy: isNaN(userId) ? existingCourse.updatedBy : BigInt(userId),
      },
    })

    return NextResponse.json({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
