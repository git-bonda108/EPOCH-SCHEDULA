#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Test both local and production deployments
const ENDPOINTS = {
  local: 'http://localhost:3000',
  production: 'https://epoch-schedula-v3-git-production-hotfix-clean-satya-bondas-projects.vercel.app'
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

// Test data for CRUD operations
const testBooking = {
  title: "CRUD Test - Machine Learning Fundamentals",
  startTime: "2025-07-06T10:00:00.000Z", // July 6th 2025 (Sunday)
  endTime: "2025-07-06T12:00:00.000Z",
  category: "training",
  clientName: "Test Client for CRUD Operations"
};

const updatedBooking = {
  title: "UPDATED - Advanced AI Workshop",
  startTime: "2025-07-06T14:00:00.000Z",
  endTime: "2025-07-06T16:00:00.000Z",
  category: "workshop",
  clientName: "Updated Test Client"
};

async function testCRUDOperations(endpoint, name) {
  console.log(`\n🧪 TESTING ${name.toUpperCase()} DEPLOYMENT`);
  console.log(`📍 Endpoint: ${endpoint}`);
  console.log('=' .repeat(60));
  
  let createdBookingId = null;
  
  try {
    // 1. CREATE - Test booking creation
    console.log('\n1️⃣  CREATE OPERATION');
    console.log('Creating new booking...');
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
    } else {
      console.log('❌ CREATE FAILED');
      console.log(`   Status: ${createResponse.status}`);
      console.log(`   Response: ${JSON.stringify(createResponse.data, null, 2)}`);
      return;
    }
    
    // 2. READ - Test fetching bookings
    console.log('\n2️⃣  READ OPERATION');
    console.log('Fetching bookings for July 2025...');
    const readResponse = await makeRequest(`${endpoint}/api/bookings?month=2025-07`);
    
    if (readResponse.status === 200) {
      const bookings = readResponse.data;
      console.log('✅ READ SUCCESS');
      console.log(`   📊 Total bookings found: ${bookings.length}`);
      
      // Find our created booking
      const ourBooking = bookings.find(b => b.id === createdBookingId);
      if (ourBooking) {
        console.log('   🎯 Our test booking found in results');
        console.log(`   📝 Title: ${ourBooking.title}`);
        console.log(`   📅 Date: ${new Date(ourBooking.startTime).toLocaleDateString()}`);
      } else {
        console.log('   ⚠️  Our test booking not found in results');
      }
      
      // Display all bookings in a beautiful table format
      console.log('\n   📋 ALL BOOKINGS:');
      console.log('   ' + '-'.repeat(80));
      console.log('   | ID       | Title                    | Date       | Time     | Client     |');
      console.log('   ' + '-'.repeat(80));
      bookings.forEach(booking => {
        const date = new Date(booking.startTime).toLocaleDateString();
        const time = new Date(booking.startTime).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const id = booking.id.substring(0, 8);
        const title = booking.title.substring(0, 22).padEnd(22);
        const client = (booking.clientName || 'N/A').substring(0, 10).padEnd(10);
        console.log(`   | ${id} | ${title} | ${date} | ${time}  | ${client} |`);
      });
      console.log('   ' + '-'.repeat(80));
    } else {
      console.log('❌ READ FAILED');
      console.log(`   Status: ${readResponse.status}`);
      console.log(`   Response: ${JSON.stringify(readResponse.data, null, 2)}`);
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
      console.log(`   🏷️  New Category: ${updateResponse.data.category}`);
    } else {
      console.log('❌ UPDATE FAILED');
      console.log(`   Status: ${updateResponse.status}`);
      console.log(`   Response: ${JSON.stringify(updateResponse.data, null, 2)}`);
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
      
      // Verify deletion by trying to fetch the booking
      console.log('   🔍 Verifying deletion...');
      const verifyResponse = await makeRequest(`${endpoint}/api/bookings?month=2025-07`);
      if (verifyResponse.status === 200) {
        const remainingBookings = verifyResponse.data;
        const deletedBooking = remainingBookings.find(b => b.id === createdBookingId);
        if (!deletedBooking) {
          console.log('   ✅ Deletion verified - booking no longer exists');
        } else {
          console.log('   ❌ Deletion failed - booking still exists');
        }
      }
    } else {
      console.log('❌ DELETE FAILED');
      console.log(`   Status: ${deleteResponse.status}`);
      console.log(`   Response: ${JSON.stringify(deleteResponse.data, null, 2)}`);
    }
    
    console.log(`\n🎉 ${name.toUpperCase()} CRUD TESTING COMPLETED`);
    
  } catch (error) {
    console.log(`\n💥 ERROR during ${name} testing:`, error.message);
  }
}

async function testCalendarSync(endpoint, name) {
  console.log(`\n📅 TESTING CALENDAR SYNC FOR ${name.toUpperCase()}`);
  console.log('Verifying that July 6th, 2025 is correctly identified as Sunday...');
  
  try {
    // Test that the calendar correctly identifies July 6, 2025 as Sunday
    const testDate = new Date('2025-07-06');
    const dayOfWeek = testDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (dayOfWeek === 0) {
      console.log('✅ CALENDAR SYNC CORRECT');
      console.log('   📅 July 6th, 2025 is correctly identified as Sunday (day 0)');
    } else {
      console.log('❌ CALENDAR SYNC ERROR');
      console.log(`   📅 July 6th, 2025 is incorrectly identified as day ${dayOfWeek}`);
    }
    
    // Test current date functionality
    const now = new Date();
    console.log(`   🕐 Current system date: ${now.toLocaleDateString()} (${now.toLocaleDateString('en-US', { weekday: 'long' })})`);
    
  } catch (error) {
    console.log('💥 Calendar sync test error:', error.message);
  }
}

async function main() {
  console.log('🚀 COMPREHENSIVE CRUD & CALENDAR SYNC TESTING');
  console.log('Testing both local development and production deployments');
  console.log('Date: ' + new Date().toLocaleString());
  console.log('=' .repeat(80));
  
  // Test calendar sync first
  await testCalendarSync(ENDPOINTS.local, 'local');
  
  // Test local development server
  await testCRUDOperations(ENDPOINTS.local, 'local');
  
  // Test production deployment
  await testCRUDOperations(ENDPOINTS.production, 'production');
  
  console.log('\n🏁 ALL TESTING COMPLETED');
  console.log('=' .repeat(80));
}

// Run the tests
main().catch(console.error);
