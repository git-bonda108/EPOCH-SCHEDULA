
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const date = searchParams.get('date')
    const category = searchParams.get('category')

    let whereClause: any = {}

    // Add search query filter
    if (query) {
      whereClause.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { clientName: { contains: query, mode: 'insensitive' } },
      ]
    }

    // Add date filter
    if (date) {
      const searchDate = new Date(date)
      const startOfDay = new Date(searchDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(searchDate)
      endOfDay.setHours(23, 59, 59, 999)

      whereClause.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    // Add category filter
    if (category) {
      whereClause.category = category
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      orderBy: {
        startTime: 'asc',
      },
    })

    // Convert BigInt to string for JSON serialization
    const serializedBookings = bookings.map((booking: any) => ({
      ...booking,
      id: booking.id.toString(),
    }))

    return NextResponse.json(serializedBookings)
  } catch (error) {
    console.error('Error searching bookings:', error)
    return NextResponse.json(
      { message: 'Failed to search bookings' },
      { status: 500 }
    )
  }
}
