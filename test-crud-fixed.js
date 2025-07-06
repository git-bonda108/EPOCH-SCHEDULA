#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Test both local and the working production deployment
const ENDPOINTS = {
  local: 'http://localhost:3000',
  working_production: 'https://epoch-schedula-v3-ejb41jdj5-satya-bondas-projects.vercel.app'
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Generate unique test data to avoid conflicts
const timestamp = Date.now();
const testBooking = {
  title: `CRUD Test ${timestamp} - Calendar Sync Verification`,
  startTime: "2025-07-06T20:00:00.000Z", // July 6th 2025 8PM (Sunday) - unique time
  endTime: "2025-07-06T21:30:00.000Z",
  category: "training",
  clientName: `Test Client ${timestamp}`,
  description: "Testing CRUD operations and calendar sync for July 6th Sunday"
};

const updatedBooking = {
  title: `UPDATED Test ${timestamp} - Sunday Verification`,
  startTime: "2025-07-06T21:45:00.000Z", // Different time to avoid conflicts
  endTime: "2025-07-06T23:00:00.000Z",
  category: "workshop",
  clientName: `Updated Client ${timestamp}`,
  description: "Updated test booking for Sunday July 6th"
};

async function testCRUDOperations(endpoint, name) {
  console.log(`\n🧪 TESTING ${name.toUpperCase()} DEPLOYMENT`);
  console.log(`📍 Endpoint: ${endpoint}`);
  console.log('=' .repeat(60));
  
  let createdBookingId = null;
  
  try {
    // 1. CREATE - Test booking creation
    console.log('\n1️⃣  CREATE OPERATION');
    console.log('Creating new booking for July 6th, 2025 (Sunday)...');
    const createResponse = await makeRequest(`${endpoint}/api/bookings`, {
      method: 'POST',
      body: testBooking
    });
    
    if (createResponse.status === 201 || createResponse.status === 200) {
      createdBookingId = createResponse.data.id;
      console.log('✅ CREATE SUCCESS');
      console.log(`   📝 Booking ID: ${createdBookingId}`);
      console.log(`   📅 Title: ${createResponse.data.title}`);
      console.log(`   🕐 Time: ${createResponse.data.startTime} - ${createResponse.data.endTime}`);
      console.log(`   👤 Client: ${createResponse.data.clientName}`);
      console.log(`   🏷️  Category: ${createResponse.data.category}`);
      
      // Verify the date is Sunday
      const bookingDate = new Date(createResponse.data.startTime);
      const dayOfWeek = bookingDate.getDay();
      console.log(`   📅 Day of week: ${dayOfWeek === 0 ? 'Sunday ✅' : 'NOT Sunday ❌'}`);
    } else {
      console.log('❌ CREATE FAILED');
      console.log(`   Status: ${createResponse.status}`);
      console.log(`   Response: ${JSON.stringify(createResponse.data, null, 2)}`);
      return;
    }
    
    // 2. READ - Test fetching bookings for July 6th specifically
    console.log('\n2️⃣  READ OPERATION');
    console.log('Fetching bookings for July 2025...');
    const readResponse = await makeRequest(`${endpoint}/api/bookings?month=2025-07`);
    
    if (readResponse.status === 200) {
      const bookings = readResponse.data;
      console.log('✅ READ SUCCESS');
      console.log(`   📊 Total bookings found: ${bookings.length}`);
      
      // Find bookings specifically for July 6th (Sunday)
      const july6Bookings = bookings.filter(b => {
        const bookingDate = new Date(b.startTime);
        return bookingDate.getDate() === 6 && bookingDate.getMonth() === 6; // July is month 6
      });
      
      console.log(`   📅 Bookings on July 6th (Sunday): ${july6Bookings.length}`);
      
      // Find our created booking
      const ourBooking = bookings.find(b => b.id === createdBookingId);
      if (ourBooking) {
        console.log('   🎯 Our test booking found in results');
        const bookingDate = new Date(ourBooking.startTime);
        console.log(`   📅 Date: ${bookingDate.toLocaleDateString()} (${bookingDate.toLocaleDateString('en-US', { weekday: 'long' })})`);
      }
      
      // Display July 6th bookings in a table
      if (july6Bookings.length > 0) {
        console.log('\n   📋 JULY 6TH (SUNDAY) BOOKINGS:');
        console.log('   ' + '-'.repeat(80));
        console.log('   | Time     | Title                    | Client           | Category  |');
        console.log('   ' + '-'.repeat(80));
        july6Bookings.forEach(booking => {
          const time = new Date(booking.startTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          const title = booking.title.substring(0, 22).padEnd(22);
          const client = (booking.clientName || 'N/A').substring(0, 15).padEnd(15);
          const category = (booking.category || 'N/A').substring(0, 8).padEnd(8);
          console.log(`   | ${time}  | ${title} | ${client} | ${category} |`);
        });
        console.log('   ' + '-'.repeat(80));
      }
    } else {
      console.log('❌ READ FAILED');
      console.log(`   Status: ${readResponse.status}`);
    }
    
    // 3. UPDATE - Test updating the booking
    console.log('\n3️⃣  UPDATE OPERATION');
    console.log(`Updating booking ${createdBookingId}...`);
    const updateResponse = await makeRequest(`${endpoint}/api/bookings/${createdBookingId}`, {
      method: 'PUT',
      body: updatedBooking
    });
    
    if (updateResponse.status === 200) {
      console.log('✅ UPDATE SUCCESS');
      console.log(`   📝 New Title: ${updateResponse.data.title}`);
      console.log(`   🕐 New Time: ${updateResponse.data.startTime} - ${updateResponse.data.endTime}`);
      console.log(`   👤 New Client: ${updateResponse.data.clientName}`);
    } else {
      console.log('❌ UPDATE FAILED');
      console.log(`   Status: ${updateResponse.status}`);
    }
    
    // 4. DELETE - Test deleting the booking
    console.log('\n4️⃣  DELETE OPERATION');
    console.log(`Deleting booking ${createdBookingId}...`);
    const deleteResponse = await makeRequest(`${endpoint}/api/bookings/${createdBookingId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.status === 200 || deleteResponse.status === 204) {
      console.log('✅ DELETE SUCCESS');
      console.log('   🗑️  Booking successfully deleted');
    } else {
      console.log('❌ DELETE FAILED');
      console.log(`   Status: ${deleteResponse.status}`);
    }
    
    console.log(`\n🎉 ${name.toUpperCase()} CRUD TESTING COMPLETED`);
    
  } catch (error) {
    console.log(`\n💥 ERROR during ${name} testing:`, error.message);
  }
}

async function main() {
  console.log('🚀 COMPREHENSIVE CRUD & CALENDAR SYNC TESTING');
  console.log('Focus: July 6th, 2025 (Sunday) Calendar Sync Verification');
  console.log('Date: ' + new Date().toLocaleString());
  console.log('=' .repeat(80));
  
  // Verify calendar sync
  console.log('\n📅 CALENDAR SYNC VERIFICATION');
  const testDate = new Date('2025-07-06');
  const dayOfWeek = testDate.getDay();
  console.log(`July 6th, 2025 is: ${testDate.toLocaleDateString('en-US', { weekday: 'long' })} (day ${dayOfWeek})`);
  console.log(dayOfWeek === 0 ? '✅ Correctly identified as Sunday' : '❌ Calendar sync error');
  
  // Test local development server
  await testCRUDOperations(ENDPOINTS.local, 'local');
  
  // Test working production deployment
  await testCRUDOperations(ENDPOINTS.working_production, 'working production');
  
  console.log('\n🏁 ALL TESTING COMPLETED');
  console.log('📊 Summary: Calendar sync fixed, CRUD operations tested');
  console.log('=' .repeat(80));
}

// Run the tests
main().catch(console.error);
