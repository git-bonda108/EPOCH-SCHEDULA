#!/bin/bash

# Comprehensive CRUD Operations Test Script
# Tests all date formats: "Jul 13th", "13-Jul", "07/13", "13jul"

echo "🚀 STARTING COMPREHENSIVE CRUD OPERATIONS TEST"
echo "Testing enhanced natural language parsing with all date formats"
echo "=============================================================="

BASE_URL="http://localhost:3000/api/chat"

# Function to test API endpoint
test_api() {
    local message="$1"
    local test_name="$2"
    
    echo ""
    echo "🧪 TEST: $test_name"
    echo "📝 Message: '$message'"
    echo "---"
    
    response=$(curl -s -X POST "$BASE_URL" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"$message\"}")
    
    echo "📋 Response:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo "=============================================================="
}

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 2

# CREATE OPERATIONS - Test all date formats
echo ""
echo "🔨 TESTING CREATE OPERATIONS WITH ALL DATE FORMATS"
echo "=================================================="

test_api "book training Jul 13th 2 PM to 3 PM" "CREATE with 'Jul 13th' format"
test_api "schedule meeting 19-Jul 10 AM to 11 AM" "CREATE with '19-Jul' format"
test_api "book session 07/20 3 PM to 4 PM" "CREATE with '07/20' format"
test_api "schedule training 21jul 1 PM to 2 PM" "CREATE with '21jul' format"

# READ/QUERY OPERATIONS - Test all date formats
echo ""
echo "🔍 TESTING QUERY OPERATIONS WITH ALL DATE FORMATS"
echo "================================================="

test_api "show me sessions Jul 13th" "QUERY with 'Jul 13th' format"
test_api "what sessions do I have 19-Jul" "QUERY with '19-Jul' format"
test_api "check my schedule 07/20" "QUERY with '07/20' format"
test_api "list bookings 21jul" "QUERY with '21jul' format"

# UPDATE OPERATIONS - Test all date formats
echo ""
echo "✏️ TESTING UPDATE OPERATIONS WITH ALL DATE FORMATS"
echo "=================================================="

test_api "update session Jul 13th from 2 PM to 4 PM" "UPDATE with 'Jul 13th' format"
test_api "change meeting 19-Jul to 11 AM" "UPDATE with '19-Jul' format"
test_api "reschedule session 07/20 to 5 PM" "UPDATE with '07/20' format"
test_api "move training 21jul to 3 PM" "UPDATE with '21jul' format"

# DELETE OPERATIONS - Test all date formats
echo ""
echo "🗑️ TESTING DELETE OPERATIONS WITH ALL DATE FORMATS"
echo "=================================================="

test_api "delete sessions Jul 13th" "DELETE with 'Jul 13th' format"
test_api "cancel meetings 19-Jul" "DELETE with '19-Jul' format"
test_api "remove bookings 07/20" "DELETE with '07/20' format"
test_api "clear schedule 21jul" "DELETE with '21jul' format"

# EDGE CASES AND MIXED FORMATS
echo ""
echo "🎯 TESTING EDGE CASES AND MIXED SCENARIOS"
echo "========================================="

test_api "book training tomorrow 9 AM to 10 AM" "CREATE with 'tomorrow'"
test_api "show me today's schedule" "QUERY with 'today'"
test_api "book Azure training Jul 15th 2 PM to 4 PM" "CREATE with category and 'Jul 15th'"
test_api "schedule Python session 15-Jul 10 AM to 12 PM" "CREATE with category and '15-Jul'"

# CONFIRMATION TESTS
echo ""
echo "✅ TESTING CONFIRMATION SCENARIOS"
echo "================================="

test_api "yes, book it" "CONFIRMATION test"
test_api "confirm the session" "CONFIRMATION test"
test_api "go ahead and schedule" "CONFIRMATION test"

echo ""
echo "🎉 COMPREHENSIVE CRUD TESTING COMPLETED!"
echo "Check the responses above for any parsing issues."
echo "All date formats should be recognized: Jul 13th, 13-Jul, 07/13, 13jul"
