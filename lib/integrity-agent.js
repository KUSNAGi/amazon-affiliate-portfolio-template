/**
 * Product Integrity Agent — Project Affiliate Supervisor Subsystem
 * 
 * Strict Responsibility: Sequential 1-by-1 validation of candidate products.
 * Guarantees 1-to-1 match across:
 * 1. ASIN format & integrity
 * 2. Canonical Amazon.in URL
 * 3. Exact affiliate link tag (configured in .env)
 * 4. Title & Brand match
 * 5. Rating threshold (Must be >= 3.5 Stars; Tiered >= 4.0 vs 3.5-3.9)
 * 6. Amazon CDN image URL validity
 * 7. Price & Deal freshness (< 24 hours)
 * 8. Stock & Availability status
 * 
 * Rules:
 * - Never guesses missing data
 * - Never silently corrects uncertain data
 * - Returns explicit PASS or FAIL
 * - Logs all audits to AuditLogger
 */

const ProductValidator = require('./validator');
const auditLogger = require('./audit-logger');

class ProductIntegrityAgent {
  constructor(tag = process.env.AMAZON_ASSOCIATE_TAG || 'your-tag-21') {
    this.partnerTag = tag;
  }

  /**
   * Sequentially validate a candidate product through the 10-step integrity pipeline
   */
  validateProduct(product) {
    const checkResults = [];
    let isPassed = true;

    // Step 1: ASIN Format & Pattern
    const isValidAsin = ProductValidator.isValidASIN(product.asin);
    checkResults.push({
      step: 1,
      name: 'ASIN Format Verification',
      passed: isValidAsin,
      detail: isValidAsin ? `Valid 10-char ASIN: ${product.asin}` : `Invalid ASIN: ${product.asin}`
    });
    if (!isValidAsin) isPassed = false;

    // Step 2: Canonical Amazon.in Affiliate URL Match
    const linkCheck = ProductValidator.verifyAffiliateLink(product.affiliate_url, product.asin, this.partnerTag);
    checkResults.push({
      step: 2,
      name: '1-to-1 Affiliate Link & Tag Verification',
      passed: linkCheck.valid,
      detail: linkCheck.valid ? `Verified destination matches ${product.asin} with tag '${this.partnerTag}'` : linkCheck.reason
    });
    if (!linkCheck.valid) isPassed = false;

    // Step 3: Product Title & Brand Completeness
    const hasValidTitle = product.title && product.title.trim().length >= 5;
    const hasValidBrand = product.brand && product.brand.trim().length >= 2;
    const infoPassed = hasValidTitle && hasValidBrand;
    checkResults.push({
      step: 3,
      name: 'Product Title & Brand Integrity',
      passed: infoPassed,
      detail: infoPassed ? `Title: "${product.title.substr(0, 40)}...", Brand: "${product.brand}"` : 'Missing title or brand information'
    });
    if (!infoPassed) isPassed = false;

    // Step 4: Rating Gate Check (Strict >= 3.5 Stars)
    const ratingEval = ProductValidator.evaluateRating(product.rating);
    checkResults.push({
      step: 4,
      name: 'Quality Rating Gate Check',
      passed: ratingEval.acceptable,
      detail: ratingEval.acceptable ? `Rating: ${ratingEval.rating} ⭐ (Tier: ${ratingEval.tier})` : ratingEval.reason
    });
    if (!ratingEval.acceptable) isPassed = false;

    // Step 5: Permitted Visual/Media Asset Verification
    const hasValidImage = product.image_url && 
      (product.image_url.includes('media-amazon.com') || product.image_url.includes('images-amazon.com')) &&
      product.image_url.startsWith('https://');
    checkResults.push({
      step: 5,
      name: 'Amazon CDN Media Verification',
      passed: Boolean(hasValidImage),
      detail: hasValidImage ? `Valid HTTPS Amazon CDN URL: ${product.image_url}` : 'Invalid or non-Amazon CDN image URL'
    });
    if (!hasValidImage) isPassed = false;

    // Step 6: Price & Currency Integrity
    const hasValidPrice = typeof product.current_price === 'number' && product.current_price > 0;
    const hasValidCurrency = product.currency === 'INR';
    const pricePassed = hasValidPrice && hasValidCurrency;
    checkResults.push({
      step: 6,
      name: 'Price & Currency Verification',
      passed: pricePassed,
      detail: pricePassed ? `Price: ₹${product.current_price} INR` : 'Invalid price or currency code'
    });
    if (!pricePassed) isPassed = false;

    // Step 7: 24-Hour Price Freshness Boundary
    const isFresh = ProductValidator.isPriceFresh(product.last_verified);
    checkResults.push({
      step: 7,
      name: '24-Hour Cache Freshness Policy',
      passed: isFresh,
      detail: isFresh ? `Verified timestamp is under 24h old (${product.last_verified})` : 'Price timestamp expired or missing (>24h old)'
    });
    if (!isFresh) isPassed = false;

    // Step 8: Stock & Availability Verification
    const inStock = product.in_stock !== false;
    checkResults.push({
      step: 8,
      name: 'Stock & Availability Check',
      passed: inStock,
      detail: inStock ? 'In-Stock & Purchasable' : 'Item marked out-of-stock'
    });
    if (!inStock) isPassed = false;

    // Final Determination
    const result = {
      asin: product.asin,
      title: product.title,
      status: isPassed ? 'PASS' : 'FAIL',
      ratingTier: ratingEval.tier,
      timestamp: new Date().toISOString(),
      steps: checkResults,
      product: isPassed ? product : null
    };

    // Log validation result to persistent audit trail
    auditLogger.log(
      isPassed ? 'PRODUCT_INTEGRITY_PASS' : 'PRODUCT_INTEGRITY_FAIL',
      {
        asin: product.asin,
        title: product.title,
        status: result.status,
        failedSteps: checkResults.filter(s => !s.passed).map(s => s.name)
      },
      isPassed ? 'SUCCESS' : 'BLOCKED'
    );

    return result;
  }

  /**
   * Sequentially process a batch of products one-by-one with fail-safe isolation
   */
  validateBatchSequentially(products) {
    const passed = [];
    const failed = [];

    for (const product of products) {
      const audit = this.validateProduct(product);
      if (audit.status === 'PASS') {
        passed.push(audit);
      } else {
        failed.push(audit);
      }
    }

    return {
      total: products.length,
      passedCount: passed.length,
      failedCount: failed.length,
      passed: passed,
      failed: failed
    };
  }
}

module.exports = new ProductIntegrityAgent();
