const assert = require('assert');
const ProductValidator = require('../lib/validator');
const integrityAgent = require('../lib/integrity-agent');
const cacheStore = require('../lib/cache-store');
const auditLogger = require('../lib/audit-logger');

console.log('🧪 Starting Project Affiliate Sequential Integrity Test Suite...\n');

// 1. ASIN Validator Tests
console.log('1. Testing ASIN Formats...');
assert.strictEqual(ProductValidator.isValidASIN('B097RJ867P'), true, 'Valid 10-char ASIN must pass');
assert.strictEqual(ProductValidator.isValidASIN('B0CHX1W1XY'), true, 'Valid 10-char ASIN must pass');
assert.strictEqual(ProductValidator.isValidASIN('B08N5XSG8Z'), true, 'Valid 10-char ASIN must pass');
assert.strictEqual(ProductValidator.isValidASIN('INVALID12345'), false, '12-char ASIN must fail');
assert.strictEqual(ProductValidator.isValidASIN(''), false, 'Empty ASIN must fail');
console.log('   ✅ ASIN Validation Passed!');

// 2. 1-to-1 Affiliate Link Matching
console.log('2. Testing 1-to-1 Affiliate Link Matching...');
const validLinkCheck = ProductValidator.verifyAffiliateLink(
  'https://www.amazon.in/dp/B097RJ867P?tag=nagireddy0e-21',
  'B097RJ867P',
  'nagireddy0e-21'
);
assert.strictEqual(validLinkCheck.valid, true, 'Matching link & tag must pass');

const wrongAsinCheck = ProductValidator.verifyAffiliateLink(
  'https://www.amazon.in/dp/B08N5XSG8Z?tag=nagireddy0e-21',
  'B097RJ867P',
  'nagireddy0e-21'
);
assert.strictEqual(wrongAsinCheck.valid, false, 'Mismatched ASIN must be rejected');

const wrongTagCheck = ProductValidator.verifyAffiliateLink(
  'https://www.amazon.in/dp/B097RJ867P?tag=wrongtag-21',
  'B097RJ867P',
  'nagireddy0e-21'
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
  asin: 'B097RJ867P',
  title: 'Philips Digital Air Fryer HD9252/90 with Rapid Air Technology, 4.1L',
  brand: 'Philips',
  category: 'home_kitchen',
  rating: 4.5,
  current_price: 7999,
  currency: 'INR',
  image_url: 'https://m.media-amazon.com/images/I/61K61G916tL._SX679_.jpg',
  affiliate_url: 'https://www.amazon.in/dp/B097RJ867P?tag=nagireddy0e-21',
  in_stock: true,
  last_verified: new Date().toISOString()
};

const passResult = integrityAgent.validateProduct(validProduct);
assert.strictEqual(passResult.status, 'PASS', 'Valid candidate product must PASS');

const invalidProductMismatchedLink = {
  ...validProduct,
  affiliate_url: 'https://www.amazon.in/dp/B08N5XSG8Z?tag=nagireddy0e-21' // Mismatched ASIN
};
const failResult = integrityAgent.validateProduct(invalidProductMismatchedLink);
assert.strictEqual(failResult.status, 'FAIL', 'Mismatched affiliate link must FAIL');
console.log('   ✅ Product Integrity Agent Gate Passed (PASS & FAIL enforcement)!');

// 5. Price Delta & Audit Logging
console.log('5. Testing Price Delta Tracking & Audit Logging...');
const testAsin = 'B097RJ867P';
const productBefore = cacheStore.getProductByAsin(testAsin);
assert(productBefore, `Product ${testAsin} must exist in cache`);
const oldPrice = productBefore.current_price;
const newPrice = oldPrice - 500;

cacheStore.updatePrice(testAsin, newPrice);
const deltas = cacheStore.getPriceDeltas(5);
assert(deltas.length > 0, 'Price delta must be recorded');
assert.strictEqual(deltas[0].asin, testAsin);
assert.strictEqual(deltas[0].newPrice, newPrice);

const logs = auditLogger.getLogs(5);
assert(logs.length > 0, 'Audit logs must be generated');
console.log('   ✅ Price Delta and Audit Logging Passed!');

console.log('\n🎉 ALL INTEGRITY TESTS PASSED (100% COMPLIANT & ENFORCED)!\n');
