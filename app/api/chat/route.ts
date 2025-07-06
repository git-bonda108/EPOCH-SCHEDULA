
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Current system date - FIXED: Today is July 5, 2025 (Saturday)
const CURRENT_DATE = new Date('2025-07-05T12:00:00')

// DATE VALIDATION HELPER FUNCTIONS
function isDateInPast(date: Date): boolean {
  const currentDateOnly = new Date(CURRENT_DATE)
  currentDateOnly.setHours(0, 0, 0, 0)
  
  const inputDateOnly = new Date(date)
  inputDateOnly.setHours(0, 0, 0, 0)
  
  // Allow TODAY (July 5) and future dates - block only dates BEFORE today
  const isPast = inputDateOnly.getTime() < currentDateOnly.getTime()
  console.log(`🚨 DATE VALIDATION CHECK:`)
  console.log(`   Current Date: ${currentDateOnly.toDateString()} (${currentDateOnly.getTime()})`)
  console.log(`   Requested Date: ${inputDateOnly.toDateString()} (${inputDateOnly.getTime()})`)
  console.log(`   Is Past Date: ${isPast ? 'YES - WILL BLOCK' : 'NO - WILL ALLOW'}`)
  console.log(`   Today (July 5) and future dates: ALLOWED`)
  return isPast
}

function validateDateForOperation(date: Date | undefined, operation: 'CREATE' | 'UPDATE' | 'DELETE'): { isValid: boolean; error?: string } {
  if (!date) {
    return { 
      isValid: false, 
      error: `Please specify a date for the ${operation.toLowerCase()} operation.` 
    }
  }
  
  if (isDateInPast(date)) {
    return { 
      isValid: false, 
      error: `Cannot ${operation.toLowerCase()} sessions for past dates. Please choose a current or future date.` 
    }
  }
  
  return { isValid: true }
}

// SIMPLIFIED CONVERSATION STATE FOR RELIABILITY
interface ConversationState {
  sessionId: string
  lastIntent: 'book' | 'query' | 'delete' | 'update' | 'general' | null
  partialBookingInfo: {
    date?: Date
    time?: { hour: number; minute: number }
    duration?: number
    category?: string
    clientName?: string
    title?: string
  }
}

// SIMPLIFIED SESSION MANAGEMENT FOR WORKING CREATE/QUERY OPERATIONS
const conversationStates = new Map<string, ConversationState>()

function getSessionId(): string {
  return 'simple_session' // Use single session for simplicity during rollback
}

function getConversationState(): ConversationState {
  const sessionId = getSessionId()
  if (!conversationStates.has(sessionId)) {
    conversationStates.set(sessionId, {
      sessionId,
      lastIntent: null,
      partialBookingInfo: {}
    })
  }
  return conversationStates.get(sessionId)!
}

// SIMPLIFIED INFORMATION EXTRACTION FOR WORKING CREATE/QUERY OPERATIONS
interface ExtractedInfo {
  intent: 'book' | 'query' | 'delete' | 'update' | 'general'
  date?: Date
  time?: { hour: number; minute: number }
  endTime?: { hour: number; minute: number }
  duration?: number
  category?: string
  confidence: number
}

function extractInformationFromMessage(message: string): ExtractedInfo {
  const lowerMessage = message.toLowerCase()
  let confidence = 0
  
  console.log(`🔍 EXTRACTING INFO FROM: "${message}"`)
  
  // STEP 1: INTENT DETECTION - Start with working CREATE and QUERY, Add DELETE
  let intent: 'book' | 'query' | 'delete' | 'update' | 'general' = 'general'
  
  const bookingKeywords = ['book', 'schedule', 'create', 'add', 'set up', 'arrange', 'plan', 'reserve']
  const queryKeywords = ['show', 'what', 'when', 'which', 'sessions', 'bookings', 'check', 'see', 'display', 'tell me', 'find', 'have', 'do i have', 'list', 'view']
  const deleteKeywords = ['delete', 'remove', 'cancel', 'clear', 'cancel appointment', 'cancel meeting', 'clear calendar', 'remove booking']
  const updateKeywords = ['update', 'change', 'modify', 'edit', 'reschedule', 'move', 'shift', 'adjust', 'change time', 'move to']
  const confirmationKeywords = ['yes', 'yeah', 'yep', 'confirm', 'correct', 'right', 'book it', 'go ahead', 'proceed']
  
  // DEBUGGING: Check each keyword array individually
  console.log(`🔍 DEBUGGING INTENT DETECTION FOR: "${lowerMessage}"`)
  
  const confirmationMatches = confirmationKeywords.filter(keyword => lowerMessage.includes(keyword))
  const deleteMatches = deleteKeywords.filter(keyword => lowerMessage.includes(keyword))  
  const updateMatches = updateKeywords.filter(keyword => lowerMessage.includes(keyword))
  const queryMatches = queryKeywords.filter(keyword => lowerMessage.includes(keyword))
  const bookingMatches = bookingKeywords.filter(keyword => lowerMessage.includes(keyword))
  
  console.log(`📊 KEYWORD MATCHES:`)
  console.log(`   Confirmation: [${confirmationMatches.join(', ')}]`)
  console.log(`   Delete: [${deleteMatches.join(', ')}]`) 
  console.log(`   Update: [${updateMatches.join(', ')}]`)
  console.log(`   Query: [${queryMatches.join(', ')}]`)
  console.log(`   Booking: [${bookingMatches.join(', ')}]`)

  // Handle confirmation messages first
  if (confirmationMatches.length > 0) {
    intent = 'book'
    confidence += 80
    console.log(`✅ CONFIRMATION INTENT SELECTED`)
  } 
  // PRIORITIZE DELETE DETECTION OVER UPDATE - Critical fix for "remove" misclassification
  else if (deleteMatches.length > 0) {
    intent = 'delete'
    confidence += 70  // Increased confidence for delete operations
    console.log(`✅ DELETE INTENT SELECTED - matched: [${deleteMatches.join(', ')}]`)
  } 
  else if (updateMatches.length > 0) {
    intent = 'update'
    confidence += 60
    console.log(`✅ UPDATE INTENT SELECTED - matched: [${updateMatches.join(', ')}]`)
  } 
  else if (queryMatches.length > 0) {
    intent = 'query'
    confidence += 60
    console.log(`✅ QUERY INTENT SELECTED - matched: [${queryMatches.join(', ')}]`)
  } else if (bookingMatches.length > 0) {
    intent = 'book'
    confidence += 50
    console.log(`✅ BOOKING INTENT SELECTED - matched: [${bookingMatches.join(', ')}]`)
  }

  console.log(`Intent detected: ${intent} (confidence: ${confidence})`)
  
  // STEP 2: BASIC DATE PARSING - Focus on reliable patterns
  let date: Date | undefined
  
  if (lowerMessage.includes('today')) {
    date = new Date(CURRENT_DATE)
    confidence += 25
  } else if (lowerMessage.includes('tomorrow')) {
    date = new Date(CURRENT_DATE)
    date.setDate(date.getDate() + 1)
    confidence += 25
  }
  
  // ENHANCED DATE PARSING - Support all required formats: "Jul 13th", "13-Jul", "07/13", "13jul"
  if (!date) {
    const enhancedDatePatterns = [
      // Format: "Jul 13th", "July 13th"
      /(?:july|jul)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
      
      // Format: "13-Jul", "13-July"
      /(\d{1,2})-(?:july|jul)/i,
      
      // Format: "07/13" (MM/DD for July)
      /07\/(\d{1,2})/i,
      
      // Format: "13jul", "13july" (no spaces/punctuation)
      /(\d{1,2})(?:july|jul)(?!\w)/i,
      
      // Existing patterns for backward compatibility
      /(\d{1,2})[-\/](?:july|jul)/i,
      /(?:july|jul)\s+(\d{1,2})/i,
      /(\d{1,2})\s+(?:july|jul)/i
    ]
    
    console.log('🔍 Testing enhanced date patterns...')
    
    for (let i = 0; i < enhancedDatePatterns.length; i++) {
      const pattern = enhancedDatePatterns[i]
      console.log(`   Pattern ${i + 1}: ${pattern}`)
      const match = message.match(pattern)
      console.log(`   Match result:`, match)
      
      if (match) {
        const day = parseInt(match[1])
        const month = 6 // July (0-indexed)
        const year = message.includes('2025') ? 2025 : CURRENT_DATE.getFullYear()
        
        console.log(`   Extracted day: ${day}, month: ${month}, year: ${year}`)
        
        date = new Date(year, month, day)
        confidence += 25
        console.log(`📅 Enhanced date parsed: ${date.toDateString()}`)
        break
      }
    }
    
    if (!date) {
      console.log('❌ No enhanced date patterns matched!')
    }
  }

  // STEP 3: ENHANCED TIME PARSING - Handle UPDATE vs CREATE contexts differently
  let time: { hour: number; minute: number } | undefined
  let endTime: { hour: number; minute: number } | undefined
  let duration: number | undefined
  
  // For UPDATE operations, handle "from X to Y" differently than CREATE operations
  if (intent === 'update') {
    console.log(`🕐 PARSING UPDATE TIME from message: "${message}"`)
    
    // UPDATE-specific pattern: "from X:XX PM to Y:YY PM" means change start time from X:XX to Y:YY
    const updateTimePattern = /from\s+(\d{1,2})(?::(\d{2}))?\s*(pm|am)\s+to\s+(\d{1,2})(?::(\d{2}))?\s*(pm|am)/i
    const updateTimeMatch = message.match(updateTimePattern)
    
    if (updateTimeMatch) {
      // For UPDATE: "from 9:30 AM to 10:00 AM" means NEW start time is 10:00 AM
      let newStartHour = parseInt(updateTimeMatch[4])  // Use the target time hour (group 4)
      const newStartMinute = parseInt(updateTimeMatch[5] || '0')  // Use target time minutes (group 5, default 0)
      const newStartMeridiem = updateTimeMatch[6].toLowerCase()  // Use target time meridiem (group 6)
      
      // Convert to 24-hour format
      if (newStartMeridiem === 'pm' && newStartHour !== 12) newStartHour += 12
      if (newStartMeridiem === 'am' && newStartHour === 12) newStartHour = 0
      
      time = { hour: newStartHour, minute: newStartMinute }
      confidence += 40
      console.log(`🎯 UPDATE TIME PARSED: New start time will be ${newStartHour}:${newStartMinute.toString().padStart(2, '0')}`)
    } else {
      // Fallback: look for "to X PM" or "at X PM" patterns for updates
      const simpleUpdatePattern = /(?:to|at)\s+(\d{1,2})\s*(pm|am)/i
      const simpleUpdateMatch = message.match(simpleUpdatePattern)
      
      if (simpleUpdateMatch) {
        let newHour = parseInt(simpleUpdateMatch[1])
        const newMeridiem = simpleUpdateMatch[2].toLowerCase()
        
        if (newMeridiem === 'pm' && newHour !== 12) newHour += 12
        if (newMeridiem === 'am' && newHour === 12) newHour = 0
        
        time = { hour: newHour, minute: 0 }
        confidence += 30
        console.log(`🎯 UPDATE TIME PARSED (simple): New start time will be ${newHour}:00`)
      }
    }
  } else {
    // For CREATE/other operations: Parse time ranges like "4 PM to 5 PM" as session duration
    const timeRangePattern = /(\d{1,2})\s*(pm|am)\s+(?:to|until|-)\s+(\d{1,2})\s*(pm|am)/i
    const timeRangeMatch = message.match(timeRangePattern)
    
    if (timeRangeMatch) {
      let startHour = parseInt(timeRangeMatch[1])
      const startMeridiem = timeRangeMatch[2].toLowerCase()
      let endHour = parseInt(timeRangeMatch[3])
      const endMeridiem = timeRangeMatch[4].toLowerCase()
      
      // Convert to 24-hour format
      if (startMeridiem === 'pm' && startHour !== 12) startHour += 12
      if (startMeridiem === 'am' && startHour === 12) startHour = 0
      if (endMeridiem === 'pm' && endHour !== 12) endHour += 12
      if (endMeridiem === 'am' && endHour === 12) endHour = 0
      
      time = { hour: startHour, minute: 0 }
      endTime = { hour: endHour, minute: 0 }
      duration = endHour - startHour
      confidence += 30
    } else {
      // Parse single time like "2 PM"
      const singleTimePattern = /(\d{1,2})\s*(am|pm)/i
      const singleTimeMatch = message.match(singleTimePattern)
      
      if (singleTimeMatch) {
        let hour = parseInt(singleTimeMatch[1])
        const meridiem = singleTimeMatch[2].toLowerCase()
        
        if (meridiem === 'pm' && hour !== 12) hour += 12
        if (meridiem === 'am' && hour === 12) hour = 0
        
        time = { hour, minute: 0 }
        duration = 1 // Default 1 hour
        confidence += 20
      }
    }
  }

  // STEP 4: BASIC CATEGORY DETECTION
  let category: string | undefined
  const categoryKeywords = {
    'training': 'Training',
    'meeting': 'Meeting',
    'azure': 'Azure',
    'python': 'Python'
  }
  
  for (const [keyword, cat] of Object.entries(categoryKeywords)) {
    if (lowerMessage.includes(keyword)) {
      category = cat
      confidence += 10
      break
    }
  }

  return {
    intent,
    date,
    time,
    endTime,
    duration,
    category,
    confidence
  }
}

// SIMPLIFIED SMART DEFAULTS FOR WORKING CREATE OPERATIONS
async function applySmartDefaults(extracted: ExtractedInfo): Promise<{
  startTime?: Date
  endTime?: Date
  category: string
  clientName: string
  title: string
}> {
  console.log('🔧 APPLYING SMART DEFAULTS TO:', extracted)
  
  // Use extracted date or default to tomorrow
  let workingDate = extracted.date
  if (!workingDate) {
    workingDate = new Date(CURRENT_DATE)
    workingDate.setDate(CURRENT_DATE.getDate() + 1)
  }

  // Use extracted time or default to 10 AM
  const hour = extracted.time?.hour ?? 10
  const minute = extracted.time?.minute ?? 0
  
  // Create start time
  const startTime = new Date(workingDate.getTime())
  startTime.setHours(hour, minute, 0, 0)
  
  // Create end time (1 hour later or use duration)
  const endTime = new Date(startTime.getTime())
  if (extracted.endTime) {
    endTime.setHours(extracted.endTime.hour, extracted.endTime.minute, 0, 0)
  } else {
    const duration = extracted.duration ?? 1
    endTime.setTime(startTime.getTime() + (duration * 60 * 60 * 1000))
  }
  
  const defaults = {
    startTime,
    endTime,
    category: extracted.category || 'Training',
    clientName: 'Client',
    title: extracted.category ? `${extracted.category} Training` : 'Training Session'
  }

  console.log('✅ SMART DEFAULTS APPLIED:', defaults)
  return defaults
}

// SIMPLIFIED BOOKING EXECUTOR FOR WORKING CREATE OPERATIONS
async function executeBooking(extracted: ExtractedInfo, defaults: any): Promise<{
  success: boolean
  booking?: any
  error?: string
}> {
  console.log('=== SIMPLIFIED BOOKING EXECUTION START ===')
  console.log('Creating booking with defaults:', defaults)

  // Validate we have required information
  if (!defaults.startTime || !defaults.endTime) {
    return {
      success: false,
      error: 'Missing required time information'
    }
  }

  // 🚨 DATE VALIDATION: Check if booking date is in the past
  const dateValidation = validateDateForOperation(defaults.startTime, 'CREATE')
  if (!dateValidation.isValid) {
    console.log('❌ DATE VALIDATION FAILED FOR CREATE:', dateValidation.error)
    return {
      success: false,
      error: dateValidation.error
    }
  }

  try {
    // Prepare booking data
    const requestBody = {
      title: defaults.title,
      description: 'Session scheduled via Schedula AI',
      category: defaults.category,
      startTime: defaults.startTime.toISOString(),
      endTime: defaults.endTime.toISOString(),
      clientName: defaults.clientName,
    }

    console.log('📝 CREATING BOOKING WITH DATA:', requestBody)

    // Create booking directly in database (no HTTP call needed)
    console.log('🔄 CREATING BOOKING DIRECTLY IN DATABASE...')
    
    const startTime = new Date(requestBody.startTime)
    const endTime = new Date(requestBody.endTime)

    // Validate that end time is after start time
    if (endTime <= startTime) {
      return {
        success: false,
        error: 'End time must be after start time'
      }
    }

    // Check for conflicts
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        AND: [
          {
            startTime: {
              lt: endTime,
            },
          },
          {
            endTime: {
              gt: startTime,
            },
          },
        ],
      },
    })

    if (conflictingBookings.length > 0) {
      return {
        success: false,
        error: 'Time slot conflicts with existing booking'
      }
    }

    const booking = await prisma.booking.create({
      data: {
        title: requestBody.title,
        description: requestBody.description,
        category: requestBody.category,
        startTime,
        endTime,
        clientName: requestBody.clientName || null,
      },
    })

    // Convert BigInt to string for JSON serialization
    const serializedBooking = {
      ...booking,
      id: booking.id.toString(),
    }

    console.log('🎉 BOOKING SUCCESSFULLY CREATED:', serializedBooking.id)
    
    return {
      success: true,
      booking: serializedBooking
    }
  } catch (error) {
    console.error('❌ BOOKING EXECUTION ERROR:', error)
    return {
      success: false,
      error: `System error: ${(error as Error).message}`
    }
  }
}

// DELETE EXECUTOR FOLLOWING SAME PATTERN AS BOOKING EXECUTOR
async function executeDelete(extracted: ExtractedInfo): Promise<{
  success: boolean
  deletedCount: number
  deletedBookings?: any[]
  error?: string
}> {
  console.log('=== DELETE EXECUTION START ===')
  console.log('Processing delete request for:', extracted)

  // 🚨 DATE VALIDATION: Check if delete date is in the past
  const dateValidation = validateDateForOperation(extracted.date, 'DELETE')
  if (!dateValidation.isValid) {
    console.log('❌ DATE VALIDATION FAILED FOR DELETE:', dateValidation.error)
    return {
      success: false,
      deletedCount: 0,
      error: dateValidation.error
    }
  }

  try {
    // Find bookings to delete based on extracted date
    let bookingsToDelete: any[] = []
    
    if (extracted.date) {
      // Get bookings for the specific date
      const startOfDay = new Date(extracted.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(extracted.date)
      endOfDay.setHours(23, 59, 59, 999)
      
      bookingsToDelete = await getBookingsForDateRange(startOfDay, endOfDay)
      console.log(`🔍 Found ${bookingsToDelete.length} bookings to delete on ${extracted.date.toDateString()}`)
    } else {
      console.log('❌ No specific date provided for deletion')
      return {
        success: false,
        deletedCount: 0,
        error: 'Please specify a date for deletion'
      }
    }

    if (bookingsToDelete.length === 0) {
      return {
        success: true,
        deletedCount: 0,
        deletedBookings: [],
        error: 'No bookings found to delete for the specified date'
      }
    }

    // Delete each booking directly from database (no HTTP call needed)
    let deletedCount = 0
    let deletedBookings: any[] = []

    for (const booking of bookingsToDelete) {
      try {
        console.log(`🗑️ Deleting booking: ${booking.id} - ${booking.title}`)
        
        await prisma.booking.delete({
          where: { id: booking.id },
        })

        deletedCount++
        deletedBookings.push(booking)
        console.log(`✅ Successfully deleted booking: ${booking.id}`)
      } catch (deleteError) {
        console.error(`❌ Error deleting booking ${booking.id}:`, deleteError)
      }
    }

    console.log(`🎉 DELETE EXECUTION COMPLETE: ${deletedCount} bookings deleted`)
    
    return {
      success: true,
      deletedCount,
      deletedBookings
    }
  } catch (error) {
    console.error('❌ DELETE EXECUTION ERROR:', error)
    return {
      success: false,
      deletedCount: 0,
      error: `System error: ${(error as Error).message}`
    }
  }
}

// UPDATE EXECUTOR FOLLOWING SAME PATTERN AS DELETE AND BOOKING EXECUTORS
async function executeUpdate(extracted: ExtractedInfo): Promise<{
  success: boolean
  updatedBooking?: any
  originalBooking?: any
  error?: string
}> {
  console.log('=== UPDATE EXECUTION START ===')
  console.log('Processing update request for:', extracted)

  // 🚨 DATE VALIDATION: Check if update date is in the past
  const dateValidation = validateDateForOperation(extracted.date, 'UPDATE')
  if (!dateValidation.isValid) {
    console.log('❌ DATE VALIDATION FAILED FOR UPDATE:', dateValidation.error)
    return {
      success: false,
      error: dateValidation.error
    }
  }

  try {
    // Find booking to update based on extracted date
    let bookingToUpdate: any = null
    
    if (extracted.date) {
      // Get bookings for the specific date
      const startOfDay = new Date(extracted.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(extracted.date)
      endOfDay.setHours(23, 59, 59, 999)
      
      const bookings = await getBookingsForDateRange(startOfDay, endOfDay)
      console.log(`🔍 Found ${bookings.length} bookings on ${extracted.date.toDateString()}`)
      
      if (bookings.length === 1) {
        bookingToUpdate = bookings[0]
      } else if (bookings.length > 1) {
        // For simplicity, update the first booking found
        bookingToUpdate = bookings[0]
        console.log(`📝 Multiple bookings found, updating first one: ${bookingToUpdate.title}`)
      } else {
        return {
          success: false,
          error: 'No bookings found to update on the specified date'
        }
      }
    } else {
      console.log('❌ No specific date provided for update')
      return {
        success: false,
        error: 'Please specify a date for the booking to update'
      }
    }

    // Apply new time if provided
    let newStartTime: Date
    let newEndTime: Date
    
    if (extracted.time) {
      // Use the same date but new time
      newStartTime = new Date(bookingToUpdate.startTime)
      newStartTime.setHours(extracted.time.hour, extracted.time.minute, 0, 0)
      
      if (extracted.endTime) {
        newEndTime = new Date(bookingToUpdate.startTime)
        newEndTime.setHours(extracted.endTime.hour, extracted.endTime.minute, 0, 0)
      } else {
        // Default to 1 hour duration or use existing duration
        const originalDuration = (new Date(bookingToUpdate.endTime).getTime() - new Date(bookingToUpdate.startTime).getTime()) / (1000 * 60 * 60)
        const duration = extracted.duration || originalDuration
        newEndTime = new Date(newStartTime.getTime() + (duration * 60 * 60 * 1000))
      }
    } else {
      console.log('❌ No new time provided for update')
      return {
        success: false,
        error: 'Please specify a new time for the update'
      }
    }

    // Prepare update data
    const updateData = {
      id: bookingToUpdate.id,
      title: bookingToUpdate.title,
      description: bookingToUpdate.description,
      category: extracted.category || bookingToUpdate.category,
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString(),
      clientName: bookingToUpdate.clientName,
    }

    console.log('📝 UPDATING BOOKING WITH DATA:', updateData)

    // Update booking directly in database (no HTTP call needed)
    console.log('🔄 UPDATING BOOKING DIRECTLY IN DATABASE...')
    
    const startTime = new Date(updateData.startTime)
    const endTime = new Date(updateData.endTime)

    // Validate that end time is after start time
    if (endTime <= startTime) {
      return {
        success: false,
        error: 'End time must be after start time'
      }
    }

    // Check for conflicts (excluding the current booking)
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        AND: [
          { id: { not: updateData.id } },
          {
            startTime: {
              lt: endTime,
            },
          },
          {
            endTime: {
              gt: startTime,
            },
          },
        ],
      },
    })

    if (conflictingBookings.length > 0) {
      return {
        success: false,
        error: 'Time slot conflicts with existing booking'
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: updateData.id },
      data: {
        title: updateData.title,
        description: updateData.description,
        category: updateData.category,
        startTime,
        endTime,
        clientName: updateData.clientName || null,
      },
    })

    // Convert BigInt to string for JSON serialization
    const serializedBooking = {
      ...updatedBooking,
      id: updatedBooking.id.toString(),
    }

    console.log('🎉 BOOKING SUCCESSFULLY UPDATED:', serializedBooking.id)
    
    return {
      success: true,
      updatedBooking: serializedBooking,
      originalBooking: bookingToUpdate
    }
  } catch (error) {
    console.error('❌ UPDATE EXECUTION ERROR:', error)
    return {
      success: false,
      error: `System error: ${(error as Error).message}`
    }
  }
}

// HELPER FUNCTION FOR QUERY OPERATIONS - GET BOOKINGS FOR DATE RANGE
async function getBookingsForDateRange(startDate: Date, endDate: Date) {
  try {
    return await prisma.booking.findMany({
      where: { 
        startTime: { 
          gte: startDate, 
          lte: endDate 
        } 
      },
      orderBy: { startTime: 'asc' }
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return []
  }
}

// ENHANCED COLORFUL TABLE GENERATOR FOR QUERY RESPONSES
function generateBookingsTable(bookings: any[], dateRange?: string): string {
  if (bookings.length === 0) {
    return `<div style="text-align: center; padding: 20px; color: #666; font-style: italic;">No bookings found${dateRange ? ` for ${dateRange}` : ''}.</div>`
  }

  // Category color mapping for colorful display
  const getCategoryColor = (category: string | null | undefined) => {
    switch (category?.toLowerCase()) {
      case 'training': return { bg: '#10b981', text: 'white' } // Emerald
      case 'workshop': return { bg: '#3b82f6', text: 'white' } // Blue
      case 'meeting': return { bg: '#8b5cf6', text: 'white' } // Purple
      case 'consultation': return { bg: '#f59e0b', text: 'white' } // Orange
      case 'review': return { bg: '#6366f1', text: 'white' } // Indigo
      case 'azure': return { bg: '#0078d4', text: 'white' } // Azure Blue
      case 'python': return { bg: '#3776ab', text: 'white' } // Python Blue
      default: return { bg: '#6b7280', text: 'white' } // Gray
    }
  }

  let table = `
    <div style="margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
        <thead>
          <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <th style="padding: 16px; text-align: left; font-weight: 700; font-size: 14px;">📚 Session Name</th>
            <th style="padding: 16px; text-align: left; font-weight: 700; font-size: 14px;">📅 Date</th>
            <th style="padding: 16px; text-align: left; font-weight: 700; font-size: 14px;">⏰ Time</th>
            <th style="padding: 16px; text-align: left; font-weight: 700; font-size: 14px;">⏱️ Duration</th>
            <th style="padding: 16px; text-align: left; font-weight: 700; font-size: 14px;">👤 Client</th>
            <th style="padding: 16px; text-align: left; font-weight: 700; font-size: 14px;">🏷️ Category</th>
          </tr>
        </thead>
        <tbody>`

  bookings.forEach((booking, index) => {
    const startTime = new Date(booking.startTime)
    const endTime = new Date(booking.endTime)
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 10) / 10
    const rowBg = index % 2 === 0 ? '#f8fafc' : 'white'
    const categoryColor = getCategoryColor(booking.category)
    
    // Determine if this is a past, present, or future session
    const now = new Date(CURRENT_DATE)
    const isToday = startTime.toDateString() === now.toDateString()
    const isPast = startTime < now
    const isFuture = startTime > now
    
    let dateStyle = 'color: #4a5568;'
    if (isToday) dateStyle = 'color: #059669; font-weight: 600;' // Green for today
    else if (isPast) dateStyle = 'color: #6b7280;' // Gray for past
    else if (isFuture) dateStyle = 'color: #3b82f6;' // Blue for future
    
    table += `
      <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0; transition: all 0.2s ease;">
        <td style="padding: 14px; font-weight: 600; color: #2d3748;">${booking.title}</td>
        <td style="padding: 14px; ${dateStyle}">${startTime.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        })}</td>
        <td style="padding: 14px; color: #4a5568; font-family: monospace;">${startTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        })}</td>
        <td style="padding: 14px; color: #4a5568;">${duration}h</td>
        <td style="padding: 14px; color: #4a5568;">${booking.clientName || 'N/A'}</td>
        <td style="padding: 14px;">
          <span style="background: ${categoryColor.bg}; color: ${categoryColor.text}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
            ${booking.category || 'General'}
          </span>
        </td>
      </tr>`
  })

  table += `
        </tbody>
      </table>
    </div>`

  return table
}

// MAIN CHAT HANDLER
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { message } = await request.json()
    console.log('🔶 =============== CHAT API REQUEST ===============')
    console.log('📥 RECEIVED MESSAGE:', message)

    // Extract information from the message
    const extracted = extractInformationFromMessage(message)
    console.log('🔍 EXTRACTED INFO:', extracted)

    let response = ''

    // Handle different intents
    switch (extracted.intent) {
      case 'book': {
        console.log('📝 HANDLING BOOKING INTENT')
        const defaults = await applySmartDefaults(extracted)
        const result = await executeBooking(extracted, defaults)
        
        if (result.success && result.booking) {
          const startTime = new Date(result.booking.startTime)
          const endTime = new Date(result.booking.endTime)
          
          response = `
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; margin: 16px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 24px; margin-right: 12px;">✅</span>
                <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Booking Confirmed!</h3>
              </div>
              <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px;">
                <p style="margin: 0 0 8px 0;"><strong>📚 Session:</strong> ${result.booking.title}</p>
                <p style="margin: 0 0 8px 0;"><strong>📅 Date:</strong> ${startTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p style="margin: 0 0 8px 0;"><strong>⏰ Time:</strong> ${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                <p style="margin: 0 0 8px 0;"><strong>🏷️ Category:</strong> ${result.booking.category}</p>
                <p style="margin: 0;"><strong>👤 Client:</strong> ${result.booking.clientName}</p>
              </div>
            </div>
          `
        } else {
          response = `
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 12px; margin: 16px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 24px; margin-right: 12px;">❌</span>
                <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Booking Failed</h3>
              </div>
              <p style="margin: 0;">${result.error || 'Unable to create booking. Please try again.'}</p>
            </div>
          `
        }
        break
      }

      case 'query': {
        console.log('🔍 HANDLING QUERY INTENT')
        
        let bookings: any[] = []
        let dateRange = ''
        
        if (extracted.date) {
          // Query for specific date
          const startOfDay = new Date(extracted.date)
          startOfDay.setHours(0, 0, 0, 0)
          const endOfDay = new Date(extracted.date)
          endOfDay.setHours(23, 59, 59, 999)
          
          bookings = await getBookingsForDateRange(startOfDay, endOfDay)
          dateRange = extracted.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        } else {
          // Query for current month
          const now = new Date(CURRENT_DATE)
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
          
          bookings = await getBookingsForDateRange(startOfMonth, endOfMonth)
          dateRange = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        }
        
        const table = generateBookingsTable(bookings, dateRange)
        
        response = `
          <div style="margin: 16px 0;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px; border-radius: 12px 12px 0 0;">
              <div style="display: flex; align-items: center;">
                <span style="font-size: 20px; margin-right: 12px;">📊</span>
                <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Your Schedule${dateRange ? ` - ${dateRange}` : ''}</h3>
              </div>
            </div>
            ${table}
          </div>
        `
        break
      }

      case 'delete': {
        console.log('🗑️ HANDLING DELETE INTENT')
        const result = await executeDelete(extracted)
        
        if (result.success) {
          if (result.deletedCount > 0) {
            const deletedList = result.deletedBookings?.map(booking => 
              `<li style="margin: 4px 0;">📚 ${booking.title} - ${new Date(booking.startTime).toLocaleDateString()}</li>`
            ).join('') || ''
            
            response = `
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 12px; margin: 16px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 24px; margin-right: 12px;">🗑️</span>
                  <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Bookings Deleted</h3>
                </div>
                <p style="margin: 0 0 12px 0;">Successfully deleted ${result.deletedCount} booking(s):</p>
                <ul style="margin: 0; padding-left: 20px;">
                  ${deletedList}
                </ul>
              </div>
            `
          } else {
            response = `
              <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 20px; border-radius: 12px; margin: 16px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 24px; margin-right: 12px;">ℹ️</span>
                  <h3 style="margin: 0; font-size: 18px; font-weight: 700;">No Bookings Found</h3>
                </div>
                <p style="margin: 0;">${result.error || 'No bookings found to delete for the specified date.'}</p>
              </div>
            `
          }
        } else {
          response = `
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 12px; margin: 16px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 24px; margin-right: 12px;">❌</span>
                <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Delete Failed</h3>
              </div>
              <p style="margin: 0;">${result.error || 'Unable to delete bookings. Please try again.'}</p>
            </div>
          `
        }
        break
      }

      case 'update': {
        console.log('✏️ HANDLING UPDATE INTENT')
        const result = await executeUpdate(extracted)
        
        if (result.success && result.updatedBooking) {
          const startTime = new Date(result.updatedBooking.startTime)
          const endTime = new Date(result.updatedBooking.endTime)
          
          response = `
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 20px; border-radius: 12px; margin: 16px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 24px; margin-right: 12px;">✏️</span>
                <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Booking Updated!</h3>
              </div>
              <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px;">
                <p style="margin: 0 0 8px 0;"><strong>📚 Session:</strong> ${result.updatedBooking.title}</p>
                <p style="margin: 0 0 8px 0;"><strong>📅 Date:</strong> ${startTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p style="margin: 0 0 8px 0;"><strong>⏰ New Time:</strong> ${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                <p style="margin: 0 0 8px 0;"><strong>🏷️ Category:</strong> ${result.updatedBooking.category}</p>
                <p style="margin: 0;"><strong>👤 Client:</strong> ${result.updatedBooking.clientName}</p>
              </div>
            </div>
          `
        } else {
          response = `
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 12px; margin: 16px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 24px; margin-right: 12px;">❌</span>
                <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Update Failed</h3>
              </div>
              <p style="margin: 0;">${result.error || 'Unable to update booking. Please try again.'}</p>
            </div>
          `
        }
        break
      }

      default: {
        console.log('💬 HANDLING GENERAL INTENT')
        response = `
          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 20px; border-radius: 12px; margin: 16px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 24px; margin-right: 12px;">🤖</span>
              <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Schedula AI Assistant</h3>
            </div>
            <p style="margin: 0 0 12px 0;">I can help you manage your calendar! Here's what I can do:</p>
            <ul style="margin: 0; padding-left: 20px;">
              <li style="margin: 4px 0;">📅 <strong>Book sessions:</strong> "Book a training session tomorrow at 2 PM"</li>
              <li style="margin: 4px 0;">🔍 <strong>View schedule:</strong> "Show me my bookings for today"</li>
              <li style="margin: 4px 0;">✏️ <strong>Update bookings:</strong> "Change tomorrow's session to 3 PM"</li>
              <li style="margin: 4px 0;">🗑️ <strong>Delete bookings:</strong> "Cancel my session on July 10"</li>
            </ul>
          </div>
        `
        break
      }
    }

    console.log('📤 SENDING RESPONSE')
    console.log('🔶 =============== CHAT API SUCCESS ===============')
    
    return NextResponse.json({ response })
  } catch (error) {
    console.error('❌ CHAT API ERROR:', error)
    return NextResponse.json(
      { 
        response: `
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 12px; margin: 16px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 24px; margin-right: 12px;">⚠️</span>
              <h3 style="margin: 0; font-size: 18px; font-weight: 700;">System Error</h3>
            </div>
            <p style="margin: 0;">I encountered an error processing your request. Please try again.</p>
          </div>
        `
      },
      { status: 500 }
    )
  }
}
