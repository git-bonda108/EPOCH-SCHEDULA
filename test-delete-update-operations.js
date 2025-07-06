#!/usr/bin/env node

/**
 * COMPREHENSIVE DELETE/UPDATE OPERATIONS TEST
 * Tests the new date validation logic:
 * - DELETE: All dates allowed (past, current, future)
 * - UPDATE: Only current and future dates allowed
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Helper function to format dates
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Helper function to create test booking
async function createTestBooking(title, startTime, endTime) {
  const response = await fetch(`${API_BASE}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      description: 'Test booking for DELETE/UPDATE validation',
      category: 'testing',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      clientName: 'Test Client',
      clientEmail: 'test@example.com'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create booking: ${await response.text()}`);
  }
  
  return await response.json();
}

// Helper function to delete booking
async function deleteBooking(id) {
  const response = await fetch(`${API_BASE}/api/bookings?id=${id}`, {
    method: 'DELETE'
  });
  
  return {
    ok: response.ok,
    status: response.status,
    data: await response.json()
  };
}

// Helper function to update booking
async function updateBooking(id, updateData) {
  const response = await fetch(`${API_BASE}/api/bookings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updateData })
  });
  
  return {
    ok: response.ok,
    status: response.status,
    data: await response.json()
  };
}

async function runTests() {
  console.log('🧪 STARTING DELETE/UPDATE OPERATIONS TEST');
  console.log('=' .repeat(60));
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  console.log(`📅 Test Dates:`);
  console.log(`   Yesterday: ${formatDate(yesterday)}`);
  console.log(`   Today: ${formatDate(today)}`);
  console.log(`   Tomorrow: ${formatDate(tomorrow)}`);
  console.log('');
  
  let testResults = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  try {
    // Test 1: Create bookings for past, current, and future dates
    console.log('📝 STEP 1: Creating test bookings...');
    
    const pastBooking = await createTestBooking(
      'Past Booking (DELETE TEST)',
      new Date(yesterday.getTime() + 9 * 60 * 60 * 1000), // 9 AM yesterday
      new Date(yesterday.getTime() + 10 * 60 * 60 * 1000)  // 10 AM yesterday
    );
    
    const currentBooking = await createTestBooking(
      'Current Booking (UPDATE TEST)',
      new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2 PM today
      new Date(today.getTime() + 15 * 60 * 60 * 1000)  // 3 PM today
    );
    
    const futureBooking = await createTestBooking(
      'Future Booking (UPDATE TEST)',
      new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000), // 4 PM tomorrow
      new Date(tomorrow.getTime() + 17 * 60 * 60 * 1000)  // 5 PM tomorrow
    );
    
    console.log(`✅ Created 3 test bookings`);
    console.log(`   Past: ${pastBooking.id}`);
    console.log(`   Current: ${currentBooking.id}`);
    console.log(`   Future: ${futureBooking.id}`);
    console.log('');
    
    // Test 2: DELETE operations (should work for ALL dates)
    console.log('🗑️  STEP 2: Testing DELETE operations...');
    
    // Delete past booking
    const deletePastResult = await deleteBooking(pastBooking.id);
    if (deletePastResult.ok) {
      console.log('✅ DELETE past booking: SUCCESS');
      testResults.passed++;
    } else {
      console.log('❌ DELETE past booking: FAILED');
      testResults.failed++;
    }
    testResults.details.push({
      test: 'DELETE past booking',
      passed: deletePastResult.ok,
      status: deletePastResult.status,
      message: deletePastResult.data.message
    });
    
    // Test 3: UPDATE operations
    console.log('');
    console.log('✏️  STEP 3: Testing UPDATE operations...');
    
    // Try to update past booking (should fail)
    const pastUpdateBooking = await createTestBooking(
      'Past Booking (UPDATE FAIL TEST)',
      new Date(yesterday.getTime() + 11 * 60 * 60 * 1000), // 11 AM yesterday
      new Date(yesterday.getTime() + 12 * 60 * 60 * 1000)  // 12 PM yesterday
    );
    
    const updatePastResult = await updateBooking(pastUpdateBooking.id, {
      title: 'Updated Past Booking',
      description: 'This should fail',
      category: 'testing',
      startTime: new Date(yesterday.getTime() + 11 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(yesterday.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      clientName: 'Test Client',
      clientEmail: 'test@example.com'
    });
    
    if (!updatePastResult.ok && updatePastResult.status === 400) {
      console.log('✅ UPDATE past booking: CORRECTLY REJECTED');
      testResults.passed++;
    } else {
      console.log('❌ UPDATE past booking: SHOULD HAVE BEEN REJECTED');
      testResults.failed++;
    }
    testResults.details.push({
      test: 'UPDATE past booking (should fail)',
      passed: !updatePastResult.ok && updatePastResult.status === 400,
      status: updatePastResult.status,
      message: updatePastResult.data.message
    });
    
    // Update current booking (should succeed)
    const updateCurrentResult = await updateBooking(currentBooking.id, {
      title: 'Updated Current Booking',
      description: 'This should succeed',
      category: 'testing',
      startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(today.getTime() + 15 * 60 * 60 * 1000).toISOString(),
      clientName: 'Updated Client',
      clientEmail: 'updated@example.com'
    });
    
    if (updateCurrentResult.ok) {
      console.log('✅ UPDATE current booking: SUCCESS');
      testResults.passed++;
    } else {
      console.log('❌ UPDATE current booking: FAILED');
      testResults.failed++;
    }
    testResults.details.push({
      test: 'UPDATE current booking',
      passed: updateCurrentResult.ok,
      status: updateCurrentResult.status,
      message: updateCurrentResult.data.message || 'Success'
    });
    
    // Update future booking (should succeed)
    const updateFutureResult = await updateBooking(futureBooking.id, {
      title: 'Updated Future Booking',
      description: 'This should succeed',
      category: 'testing',
      startTime: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(tomorrow.getTime() + 17 * 60 * 60 * 1000).toISOString(),
      clientName: 'Updated Client',
      clientEmail: 'updated@example.com'
    });
    
    if (updateFutureResult.ok) {
      console.log('✅ UPDATE future booking: SUCCESS');
      testResults.passed++;
    } else {
      console.log('❌ UPDATE future booking: FAILED');
      testResults.failed++;
    }
    testResults.details.push({
      test: 'UPDATE future booking',
      passed: updateFutureResult.ok,
      status: updateFutureResult.status,
      message: updateFutureResult.data.message || 'Success'
    });
    
    // Test 4: DELETE remaining bookings (cleanup)
    console.log('');
    console.log('🧹 STEP 4: Cleanup - deleting remaining test bookings...');
    
    await deleteBooking(pastUpdateBooking.id);
    await deleteBooking(currentBooking.id);
    await deleteBooking(futureBooking.id);
    
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    testResults.failed++;
  }
  
  // Final results
  console.log('');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  console.log('');
  console.log('📋 DETAILED RESULTS:');
  testResults.details.forEach((result, index) => {
    console.log(`${index + 1}. ${result.test}: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Status: ${result.status}, Message: ${result.message}`);
  });
  
  console.log('');
  console.log('🎯 VALIDATION SUMMARY:');
  console.log('   DELETE Operations: ✅ Allow ALL dates (past, current, future)');
  console.log('   UPDATE Operations: ✅ Allow ONLY current and future dates');
  
  if (testResults.failed === 0) {
    console.log('');
    console.log('🎉 ALL TESTS PASSED! DELETE/UPDATE operations working correctly.');
    process.exit(0);
  } else {
    console.log('');
    console.log('⚠️  Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
