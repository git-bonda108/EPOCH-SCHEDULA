
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'

const trainingTypes = [
  { id: 1, name: 'Azure Fundamentals', category: 'Azure', duration: 60 },
  { id: 2, name: 'Python Basics', category: 'Python', duration: 90 },
  { id: 3, name: 'Advanced Python', category: 'Python', duration: 120 },
  { id: 4, name: 'Azure DevOps', category: 'Azure', duration: 90 },
  { id: 5, name: 'Data Science with Python', category: 'Python', duration: 120 },
  { id: 6, name: 'Azure AI Services', category: 'Azure', duration: 90 },
  { id: 7, name: 'Web Development', category: 'General', duration: 120 },
  { id: 8, name: 'Database Management', category: 'General', duration: 90 },
]

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let filteredTypes = trainingTypes

    if (category) {
      filteredTypes = trainingTypes.filter(
        type => type.category.toLowerCase() === category.toLowerCase()
      )
    }

    return NextResponse.json(filteredTypes)
  } catch (error) {
    console.error('Error fetching training types:', error)
    return NextResponse.json(
      { message: 'Failed to fetch training types' },
      { status: 500 }
    )
  }
}
