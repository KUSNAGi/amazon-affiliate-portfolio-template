const assert = require('assert');
const ProductValidator = require('../lib/validator');
const integrityAgent = require('../lib/integrity-agent');
const cacheStore = require('../lib/cache-store');
const auditLogger = require('../lib/audit-logger');

console.log('🧪 Starting Project Affiliate Sequential Integrity Test Suite...\n');

// 1. ASIN Validator Tests
console.log('1. Testing ASIN Formats...');
assert.strictEqual(ProductValidator.isValidASIN('B00TEST001'), true, 'Valid 10-char ASIN must pass');
assert.strictEqual(ProductValidator.isValidASIN('B00TEST002'), true, 'Valid 10-char ASIN must pass');
assert.strictEqual(ProductValidator.isValidASIN('B00TEST003'), true, 'Valid 10-char ASIN must pass');
assert.strictEqual(ProductValidator.isValidASIN('INVALID12345'), false, '12-char ASIN must fail');
assert.strictEqual(ProductValidator.isValidASIN(''), false, 'Empty ASIN must fail');
console.log('   ✅ ASIN Validation Passed!');

// 2. 1-to-1 Affiliate Link Matching
console.log('2. Testing 1-to-1 Affiliate Link Matching...');
const validLinkCheck = ProductValidator.verifyAffiliateLink(
  'https://www.amazon.in/dp/B00TEST001?tag=your-tag-21',
  'B00TEST001',
  'your-tag-21'
);
assert.strictEqual(validLinkCheck.valid, true, 'Matching link & tag must pass');

const wrongAsinCheck = ProductValidator.verifyAffiliateLink(
  'https://www.amazon.in/dp/B00TEST002?tag=your-tag-21',
  'B00TEST001',
  'your-tag-21'
);
assert.strictEqual(wrongAsinCheck.valid, false, 'Mismatched ASIN must be rejected');

const wrongTagCheck = ProductValidator.verifyAffiliateLink(
  'https://www.amazon.in/dp/B00TEST001?tag=wrongtag-21',
  'B00TEST001',
  'your-tag-21'
);
assert.strictEqual(wrongTagCheck.valid, false, 'Mismatched Associate tag must be rejected');
console.log('   ✅ 1-to-1 Link & Tag Matching Passed!');

// 3. Rating Threshold Tests
console.log('3. Testing Rating Rules...');
const topRated = ProductValidator.evaluateRating(4.5);
assert.strictEqual(topRated.acceptable, true);
assert.strictEqual(topRated.tier, 'top_rated');

const valuePick = ProductValidator.evaluateRating(3.8);
assert.strictEqual(valuePick.acceptable, true);
assert.strictEqual(valuePick.tier, 'value_picks');

const rejectedRating = ProductValidator.evaluateRating(3.2);
assert.strictEqual(rejectedRating.acceptable, false);
assert.strictEqual(rejectedRating.tier, 'rejected');
console.log('   ✅ Rating Threshold (< 3.5 reject, 4.0+ top, 3.5-3.9 value) Passed!');

// 4. Product Integrity Agent Sequential Gate
console.log('4. Testing Product Integrity Agent Pipeline...');
const validProduct = {
  asin: 'B00SAMPLE1',
  title: 'Sample Product Unit with Rapid Air Technology, 4.1L',
  brand: 'Demo Brand',
  category: 'home_kitchen',
  rating: 4.5,
  current_price: 7999,
  currency: 'INR',
  image_url: 'https://m.media-amazon.com/images/I/61K61G916tL._SX679_.jpg',
  affiliate_url: 'https://www.amazon.in/dp/B00SAMPLE1?tag=your-tag-21',
  in_stock: true,
  last_verified: new Date().toISOString()
};

const passResult = integrityAgent.validateProduct(validProduct);
assert.strictEqual(passResult.status, 'PASS', 'Valid candidate product must PASS');

const invalidProductMismatchedLink = {
  ...validProduct,
  affiliate_url: 'https://www.amazon.in/dp/B00SAMPLE2?tag=your-tag-21' // Mismatched ASIN
};
const failResult = integrityAgent.validateProduct(invalidProductMismatchedLink);
assert.strictEqual(failResult.status, 'FAIL', 'Mismatched affiliate link must FAIL');
console.log('   ✅ Product Integrity Agent Gate Passed (PASS & FAIL enforcement)!');

// 5. Dynamic Cache & Price Delta Verification
console.log('5. Testing Dynamic Product Addition & Price Delta Tracking...');
const testAsin = 'B099TEST01';
const testProductForCache = {
  asin: testAsin,
  title: 'Test Unit Synthetic Example',
  brand: 'Demo Brand',
  category: 'home_kitchen',
  rating: 4.5,
  current_price: 7999,
  currency: 'INR',
  image_url: 'https://m.media-amazon.com/images/I/61K61G916tL._SX679_.jpg',
  affiliate_url: `https://www.amazon.in/dp/${testAsin}?tag=your-tag-21`,
  in_stock: true,
  last_verified: new Date().toISOString()
};

// Dynamically add verified test product to cache
const addResult = cacheStore.addVerifiedProduct(testProductForCache);
assert.strictEqual(addResult.success, true, 'addVerifiedProduct must succeed');

const productBefore = cacheStore.getProductByAsin(testAsin);
assert(productBefore, `Product ${testAsin} must exist in cache after addition`);
const oldPrice = productBefore.current_price;
const newPrice = oldPrice - 500;

cacheStore.updatePrice(testAsin, newPrice);
const deltas = cacheStore.getPriceDeltas(5);
assert(deltas.length > 0, 'Price delta must be recorded');
assert.strictEqual(deltas[0].asin, testAsin);
assert.strictEqual(deltas[0].newPrice, newPrice);

const logs = auditLogger.getLogs(5);
assert(logs.length > 0, 'Audit logs must be generated');

// Clean up synthetic test product from disk to keep catalog pristine
cacheStore.removeProduct(testAsin);
console.log('   ✅ Dynamic Cache, Price Delta, and Audit Logging Passed!');

console.log('\n🎉 ALL INTEGRITY TESTS PASSED (100% COMPLIANT & ENFORCED)!\n');
