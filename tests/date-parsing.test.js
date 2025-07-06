// Enhanced Natural Language Date Parsing Tests
// Testing all required formats: "Jul 13th", "13-Jul", "07/13", "13jul"

const { extractInformationFromMessage } = require('../test-utils/date-parser');

describe('Enhanced Date Parsing Tests', () => {
  const CURRENT_DATE = new Date('2025-07-05T12:00:00');
  
  // Test cases for all required date formats
  const testCases = [
    // Format: "Jul 13th"
    {
      input: "book training Jul 13th 2 PM to 3 PM",
      expected: { day: 13, month: 6, year: 2025 }, // July = month 6 (0-indexed)
      format: "Jul 13th"
    },
    {
      input: "schedule meeting Jul 19th at 10 AM",
      expected: { day: 19, month: 6, year: 2025 },
      format: "Jul 19th"
    },
    
    // Format: "13-Jul"
    {
      input: "book training 13-Jul 2 PM to 3 PM",
      expected: { day: 13, month: 6, year: 2025 },
      format: "13-Jul"
    },
    {
      input: "schedule session 19-Jul at 4 PM",
      expected: { day: 19, month: 6, year: 2025 },
      format: "19-Jul"
    },
    
    // Format: "07/13" (MM/DD)
    {
      input: "book training 07/13 2 PM to 3 PM",
      expected: { day: 13, month: 6, year: 2025 },
      format: "07/13"
    },
    {
      input: "schedule meeting 07/19 at 10 AM",
      expected: { day: 19, month: 6, year: 2025 },
      format: "07/19"
    },
    
    // Format: "13jul" (no spaces/punctuation)
    {
      input: "book training 13jul 2 PM to 3 PM",
      expected: { day: 13, month: 6, year: 2025 },
      format: "13jul"
    },
    {
      input: "schedule session 19jul at 4 PM",
      expected: { day: 19, month: 6, year: 2025 },
      format: "19jul"
    },
    
    // Edge cases
    {
      input: "book training July 13 2 PM to 3 PM",
      expected: { day: 13, month: 6, year: 2025 },
      format: "July 13 (existing)"
    },
    {
      input: "book training 13 July 2 PM to 3 PM",
      expected: { day: 13, month: 6, year: 2025 },
      format: "13 July (existing)"
    }
  ];

  testCases.forEach(({ input, expected, format }) => {
    test(`should parse ${format} format correctly`, () => {
      const result = extractInformationFromMessage(input);
      
      expect(result.date).toBeDefined();
      expect(result.date.getDate()).toBe(expected.day);
      expect(result.date.getMonth()).toBe(expected.month);
      expect(result.date.getFullYear()).toBe(expected.year);
      expect(result.intent).toBe('book');
    });
  });

  // Test CRUD operations with various date formats
  describe('CRUD Operations with Enhanced Date Parsing', () => {
    test('CREATE with Jul 13th format', () => {
      const result = extractInformationFromMessage("book training Jul 13th 2 PM to 3 PM");
      expect(result.intent).toBe('book');
      expect(result.date.getDate()).toBe(13);
      expect(result.time.hour).toBe(14); // 2 PM in 24-hour
    });

    test('DELETE with 13-Jul format', () => {
      const result = extractInformationFromMessage("delete all sessions 13-Jul");
      expect(result.intent).toBe('delete');
      expect(result.date.getDate()).toBe(13);
    });

    test('UPDATE with 07/13 format', () => {
      const result = extractInformationFromMessage("update session 07/13 from 2 PM to 3 PM");
      expect(result.intent).toBe('update');
      expect(result.date.getDate()).toBe(13);
      expect(result.time.hour).toBe(15); // 3 PM in 24-hour (new time)
    });

    test('QUERY with 13jul format', () => {
      const result = extractInformationFromMessage("show me sessions 13jul");
      expect(result.intent).toBe('query');
      expect(result.date.getDate()).toBe(13);
    });
  });
});
