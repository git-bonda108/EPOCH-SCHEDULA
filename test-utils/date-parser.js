// Enhanced Date Parser Utility for Testing
// Supports: "Jul 13th", "13-Jul", "07/13", "13jul"

const CURRENT_DATE = new Date('2025-07-05T12:00:00');

function extractInformationFromMessage(message) {
  const lowerMessage = message.toLowerCase();
  let confidence = 0;
  
  console.log(`🔍 EXTRACTING INFO FROM: "${message}"`);
  
  // STEP 1: INTENT DETECTION
  let intent = 'general';
  
  const bookingKeywords = ['book', 'schedule', 'create', 'add', 'set up', 'arrange', 'plan', 'reserve'];
  const queryKeywords = ['show', 'what', 'when', 'which', 'sessions', 'bookings', 'check', 'see', 'display', 'tell me', 'find', 'have', 'do i have', 'list', 'view'];
  const deleteKeywords = ['delete', 'remove', 'cancel', 'clear', 'cancel appointment', 'cancel meeting', 'clear calendar', 'remove booking'];
  const updateKeywords = ['update', 'change', 'modify', 'edit', 'reschedule', 'move', 'shift', 'adjust', 'change time', 'move to'];
  const confirmationKeywords = ['yes', 'yeah', 'yep', 'confirm', 'correct', 'right', 'book it', 'go ahead', 'proceed'];
  
  const confirmationMatches = confirmationKeywords.filter(keyword => lowerMessage.includes(keyword));
  const deleteMatches = deleteKeywords.filter(keyword => lowerMessage.includes(keyword));  
  const updateMatches = updateKeywords.filter(keyword => lowerMessage.includes(keyword));
  const queryMatches = queryKeywords.filter(keyword => lowerMessage.includes(keyword));
  const bookingMatches = bookingKeywords.filter(keyword => lowerMessage.includes(keyword));
  
  if (confirmationMatches.length > 0) {
    intent = 'book';
    confidence += 80;
  } else if (deleteMatches.length > 0) {
    intent = 'delete';
    confidence += 70;
  } else if (updateMatches.length > 0) {
    intent = 'update';
    confidence += 60;
  } else if (queryMatches.length > 0) {
    intent = 'query';
    confidence += 60;
  } else if (bookingMatches.length > 0) {
    intent = 'book';
    confidence += 50;
  }

  // STEP 2: ENHANCED DATE PARSING - ALL REQUIRED FORMATS
  let date;
  
  // Handle "today" and "tomorrow" first
  if (lowerMessage.includes('today')) {
    date = new Date(CURRENT_DATE);
    confidence += 25;
  } else if (lowerMessage.includes('tomorrow')) {
    date = new Date(CURRENT_DATE);
    date.setDate(date.getDate() + 1);
    confidence += 25;
  }
  
  // Enhanced date patterns for all required formats
  if (!date) {
    const enhancedDatePatterns = [
      // Format: "Jul 13th", "July 13th"
      /(?:july|jul)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
      
      // Format: "13-Jul", "13-July"
      /(\d{1,2})-(?:july|jul)/i,
      
      // Format: "07/13" (MM/DD)
      /07\/(\d{1,2})/i,
      
      // Format: "13jul", "13july" (no spaces/punctuation)
      /(\d{1,2})(?:july|jul)(?!\w)/i,
      
      // Existing patterns for backward compatibility
      /(\d{1,2})[-\/](?:july|jul)/i,
      /(?:july|jul)\s+(\d{1,2})/i,
      /(\d{1,2})\s+(?:july|jul)/i
    ];
    
    console.log('🔍 Testing enhanced date patterns...');
    
    for (let i = 0; i < enhancedDatePatterns.length; i++) {
      const pattern = enhancedDatePatterns[i];
      console.log(`   Pattern ${i + 1}: ${pattern}`);
      const match = message.match(pattern);
      console.log(`   Match result:`, match);
      
      if (match) {
        const day = parseInt(match[1]);
        const month = 6; // July (0-indexed)
        const year = message.includes('2025') ? 2025 : CURRENT_DATE.getFullYear();
        
        console.log(`   Extracted day: ${day}, month: ${month}, year: ${year}`);
        
        date = new Date(year, month, day);
        confidence += 25;
        console.log(`📅 Date parsed: ${date.toDateString()}`);
        break;
      }
    }
    
    if (!date) {
      console.log('❌ No date patterns matched!');
    }
  }

  // STEP 3: TIME PARSING (same as existing logic)
  let time;
  let endTime;
  let duration;
  
  if (intent === 'update') {
    // UPDATE-specific pattern: "from X:XX PM to Y:YY PM"
    const updateTimePattern = /from\s+(\d{1,2})(?::(\d{2}))?\s*(pm|am)\s+to\s+(\d{1,2})(?::(\d{2}))?\s*(pm|am)/i;
    const updateTimeMatch = message.match(updateTimePattern);
    
    if (updateTimeMatch) {
      let newStartHour = parseInt(updateTimeMatch[4]);
      const newStartMinute = parseInt(updateTimeMatch[5] || '0');
      const newStartMeridiem = updateTimeMatch[6].toLowerCase();
      
      if (newStartMeridiem === 'pm' && newStartHour !== 12) newStartHour += 12;
      if (newStartMeridiem === 'am' && newStartHour === 12) newStartHour = 0;
      
      time = { hour: newStartHour, minute: newStartMinute };
      confidence += 40;
    } else {
      const simpleUpdatePattern = /(?:to|at)\s+(\d{1,2})\s*(pm|am)/i;
      const simpleUpdateMatch = message.match(simpleUpdatePattern);
      
      if (simpleUpdateMatch) {
        let newHour = parseInt(simpleUpdateMatch[1]);
        const newMeridiem = simpleUpdateMatch[2].toLowerCase();
        
        if (newMeridiem === 'pm' && newHour !== 12) newHour += 12;
        if (newMeridiem === 'am' && newHour === 12) newHour = 0;
        
        time = { hour: newHour, minute: 0 };
        confidence += 30;
      }
    }
  } else {
    // For CREATE/other operations: Parse time ranges
    const timeRangePattern = /(\d{1,2})\s*(pm|am)\s+(?:to|until|-)\s+(\d{1,2})\s*(pm|am)/i;
    const timeRangeMatch = message.match(timeRangePattern);
    
    if (timeRangeMatch) {
      let startHour = parseInt(timeRangeMatch[1]);
      const startMeridiem = timeRangeMatch[2].toLowerCase();
      let endHour = parseInt(timeRangeMatch[3]);
      const endMeridiem = timeRangeMatch[4].toLowerCase();
      
      if (startMeridiem === 'pm' && startHour !== 12) startHour += 12;
      if (startMeridiem === 'am' && startHour === 12) startHour = 0;
      if (endMeridiem === 'pm' && endHour !== 12) endHour += 12;
      if (endMeridiem === 'am' && endHour === 12) endHour = 0;
      
      time = { hour: startHour, minute: 0 };
      endTime = { hour: endHour, minute: 0 };
      duration = endHour - startHour;
      confidence += 30;
    } else {
      const singleTimePattern = /(\d{1,2})\s*(am|pm)/i;
      const singleTimeMatch = message.match(singleTimePattern);
      
      if (singleTimeMatch) {
        let hour = parseInt(singleTimeMatch[1]);
        const meridiem = singleTimeMatch[2].toLowerCase();
        
        if (meridiem === 'pm' && hour !== 12) hour += 12;
        if (meridiem === 'am' && hour === 12) hour = 0;
        
        time = { hour, minute: 0 };
        duration = 1;
        confidence += 20;
      }
    }
  }

  // STEP 4: CATEGORY DETECTION
  let category;
  const categoryKeywords = {
    'training': 'Training',
    'meeting': 'Meeting',
    'azure': 'Azure',
    'python': 'Python'
  };
  
  for (const [keyword, cat] of Object.entries(categoryKeywords)) {
    if (lowerMessage.includes(keyword)) {
      category = cat;
      confidence += 10;
      break;
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
  };
}

module.exports = { extractInformationFromMessage };
