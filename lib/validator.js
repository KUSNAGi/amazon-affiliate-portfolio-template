/**
 * Validation & Policy Compliance Engine for Amazon Associates & Influencer Links
 */

const ASIN_REGEX = /^[A-Z0-9]{10}$/;
const EXPECTED_TAG = process.env.AMAZON_ASSOCIATE_TAG || 'your-tag-21';

class ProductValidator {
  /**
   * Validate ASIN format
   */
  static isValidASIN(asin) {
    if (!asin || typeof asin !== 'string') return false;
    return ASIN_REGEX.test(asin.trim().toUpperCase());
  }

  /**
   * Generates a policy-compliant Amazon.in affiliate link for an ASIN
   */
  static generateAffiliateUrl(asin, tag = EXPECTED_TAG) {
    if (!this.isValidASIN(asin)) {
      throw new Error(`Cannot generate affiliate link: Invalid ASIN '${asin}'`);
    }
    return `https://www.amazon.in/dp/${asin.trim().toUpperCase()}?tag=${tag}`;
  }

  /**
   * Verifies that an affiliate URL:
   * 1. Points to amazon.in / amzn.to
   * 2. Contains the exact target ASIN
   * 3. Contains the correct Associate Tag
   */
  static verifyAffiliateLink(url, asin, expectedTag = EXPECTED_TAG) {
    if (!url || typeof url !== 'string') {
      return { valid: false, reason: 'Missing or empty URL' };
    }

    if (!this.isValidASIN(asin)) {
      return { valid: false, reason: `Invalid ASIN '${asin}'` };
    }

    const cleanAsin = asin.trim().toUpperCase();

    // Check for shortlink format (amzn.to)
    if (url.includes('amzn.to/')) {
      return {
        valid: true,
        type: 'shortlink',
        asin: cleanAsin,
        tag: expectedTag,
        url: url
      };
    }

    // Check for standard amazon.in format
    if (!url.includes('amazon.in')) {
      return { valid: false, reason: 'URL does not point to amazon.in or amzn.to' };
    }

    if (!url.includes(cleanAsin)) {
      return { valid: false, reason: `URL does not contain matching ASIN '${cleanAsin}'` };
    }

    if (!url.includes(`tag=${expectedTag}`)) {
      return { valid: false, reason: `URL does not contain valid Associate Tag '${expectedTag}'` };
    }

    return {
      valid: true,
      type: 'canonical_affiliate',
      asin: cleanAsin,
      tag: expectedTag,
      url: url
    };
  }

  /**
   * Validates rating against user rule:
   * - Strictly reject < 3.5
   * - Categorize >= 4.0 as 'top_rated'
   * - Categorize 3.5 - 3.9 as 'value_picks'
   */
  static evaluateRating(rating) {
    const num = parseFloat(rating);
    if (isNaN(num)) {
      return { acceptable: false, tier: 'unknown', reason: 'Invalid rating value' };
    }

    if (num < 3.5) {
      return {
        acceptable: false,
        tier: 'rejected',
        rating: num,
        reason: `Rating ${num} is below the strict minimum threshold of 3.5 stars.`
      };
    }

    if (num >= 4.0) {
      return {
        acceptable: true,
        tier: 'top_rated',
        rating: num,
        label: '4.0 & Above (Top Rated)'
      };
    }

    return {
      acceptable: true,
      tier: 'value_picks',
      rating: num,
      label: '3.5 - 3.9 (Value Picks)'
    };
  }

  /**
   * Validates that price data is under 24 hours old (Amazon policy compliance)
   */
  static isPriceFresh(timestamp) {
    if (!timestamp) return false;
    const priceDate = new Date(timestamp);
    const now = new Date();
    const diffHours = (now - priceDate) / (1000 * 60 * 60);
    return diffHours < 24;
  }

  /**
   * Full Product Schema & Identity Audit
   */
  static validateProductRecord(product, expectedTag = EXPECTED_TAG) {
    const errors = [];

    // 1. ASIN check
    if (!this.isValidASIN(product.asin)) {
      errors.push(`Invalid ASIN: ${product.asin}`);
    }

    // 2. Title check
    if (!product.title || product.title.trim().length < 3) {
      errors.push('Product title is missing or too short.');
    }

    // 3. Link check
    const linkCheck = this.verifyAffiliateLink(product.affiliate_url, product.asin, expectedTag);
    if (!linkCheck.valid) {
      errors.push(`Affiliate link validation failed: ${linkCheck.reason}`);
    }

    // 4. Rating check
    const ratingCheck = this.evaluateRating(product.rating);
    if (!ratingCheck.acceptable) {
      errors.push(ratingCheck.reason);
    }

    // 5. Image check
    const hasValidImage = product.image_url && 
      product.image_url.startsWith('https://') &&
      (product.image_url.includes('media-amazon.com') || product.image_url.includes('images-amazon.com') || product.image_url.includes('ssl-images-amazon.com'));
    if (!hasValidImage) {
      errors.push('Product image must be a valid HTTPS Amazon CDN URL.');
    }

    // 6. Price freshness
    const priceFresh = this.isPriceFresh(product.last_verified);

    return {
      valid: errors.length === 0,
      errors: errors,
      ratingTier: ratingCheck.tier,
      priceFresh: priceFresh,
      asin: product.asin,
      tag: expectedTag
    };
  }
}

module.exports = ProductValidator;
