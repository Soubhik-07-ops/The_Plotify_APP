#!/usr/bin/env node

// Simple property test runner
const { runPropertyTests, testPropertyCount, testPropertyTypes, testPropertyPriceRange } = require('../lib/test-utils');

async function main() {
    console.log('🏠 Property Test Runner');
    console.log('=======================\n');

    try {
        // Run the full test suite
        await runPropertyTests();

        console.log('\n✅ All tests completed successfully!');
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main }; 