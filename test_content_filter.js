// Test script for ContentFilter context-aware functionality
import { contentFilter } from './server/contentFilter.js';

async function testContentFilter() {
  console.log('Testing ContentFilter context-aware functionality...\n');

  // Test cases
  const testCases = [
    {
      name: 'Educational: Gun safety class - should PASS',
      content: 'Gun safety class this Saturday at 9 AM. Learn proper firearm handling and shooting fundamentals.',
      messageType: 'educational',
      expectedValid: true
    },
    {
      name: 'Educational: Concealed carry training - should PASS',
      content: 'Our concealed carry training course covers gun safety, legal requirements, and range practice.',
      messageType: 'educational',
      expectedValid: true
    },
    {
      name: 'Marketing: Gun sale promotion - should FAIL',
      content: 'Military-grade weapons sale this weekend! Best gun deals in town.',
      messageType: 'marketing',
      expectedValid: false
    },
    {
      name: 'Educational: Basic firearm course - should PASS',
      content: 'Basic pistol course includes ammunition safety, gun handling, and instructor certification.',
      messageType: 'educational',
      expectedValid: true
    },
    {
      name: 'Marketing: Combat weapon promotion - should FAIL',
      content: 'Assault rifle clearance sale! Military arsenal available now.',
      messageType: 'marketing',
      expectedValid: false
    },
    {
      name: 'Administrative: Class reminder - should PASS',
      content: 'Reminder: Your gun safety class is tomorrow. Bring your range gear and safety equipment.',
      messageType: 'administrative',
      expectedValid: true
    },
    {
      name: 'Non-educational gun mention - should FAIL',
      content: 'Got my new gun yesterday, it\'s awesome!',
      messageType: 'educational',
      expectedValid: false
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of testCases) {
    try {
      const result = await contentFilter.validateMessage(
        testCase.content, 
        'test-instructor-123', 
        testCase.messageType
      );

      const passed = result.isValid === testCase.expectedValid;
      
      console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${testCase.name}`);
      console.log(`   Content: "${testCase.content}"`);
      console.log(`   Type: ${testCase.messageType}`);
      console.log(`   Expected: ${testCase.expectedValid ? 'VALID' : 'BLOCKED'}`);
      console.log(`   Actual: ${result.isValid ? 'VALID' : 'BLOCKED'}`);
      
      if (!result.isValid) {
        console.log(`   Violations: ${result.violations.map(v => v.word).join(', ')}`);
        console.log(`   Reason: ${result.blockedReason}`);
      }
      console.log('');

      if (passed) {
        passedTests++;
      } else {
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${testCase.name}`);
      console.log(`   Error: ${error.message}`);
      console.log('');
      failedTests++;
    }
  }

  console.log(`\n=== TEST RESULTS ===`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Total: ${passedTests + failedTests}`);
  
  if (failedTests === 0) {
    console.log('🎉 All tests passed! Context-aware filtering is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Review the implementation.');
  }
}

// Run the test
testContentFilter().catch(console.error);