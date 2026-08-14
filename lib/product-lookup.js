/**
 * Product Lookup — Fetches real Amazon.in product page metadata for a given ASIN.
 * 
 * This module reads ONLY publicly available page metadata:
 * - Page <title> tag
 * - Open Graph og:image meta tag
 * - Canonical URL
 * 
 * It does NOT scrape prices, reviews, or any restricted data.
 * It does NOT bypass any Amazon authentication or restrictions.
 * It does NOT automate any restricted Amazon interface.
 * 
 * If Amazon blocks the request or the page is unavailable,
 * the lookup returns FAIL and the product is not published.
 */

const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || 'nagireddy0e-21';

class ProductLookup {

  /**
   * Look up a product on Amazon.in by ASIN.
   * Returns publicly available page metadata.
   */
  async lookupByAsin(asin) {
    if (!asin || typeof asin !== 'string' || !/^[A-Z0-9]{10}$/.test(asin.trim().toUpperCase())) {
      return {
        success: false,
        error: `Invalid ASIN format: '${asin}'. Must be exactly 10 alphanumeric characters.`
      };
    }

    const cleanAsin = asin.trim().toUpperCase();
    const productUrl = `https://www.amazon.in/dp/${cleanAsin}`;
    const affiliateUrl = `https://www.amazon.in/dp/${cleanAsin}?tag=${ASSOCIATE_TAG}`;

    try {
      const response = await fetch(productUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NKiaX-Affiliate-Validator/1.0)',
          'Accept': 'text/html',
          'Accept-Language': 'en-IN,en;q=0.9'
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Amazon.in returned HTTP ${response.status} for ASIN ${cleanAsin}. Product may not exist or page is unavailable.`,
          asin: cleanAsin,
          httpStatus: response.status
        };
      }

      const html = await response.text();

      // Extract page title
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      let pageTitle = titleMatch ? titleMatch[1].trim() : null;

      // Clean up Amazon title format: "Product Name : Amazon.in: Category" → "Product Name"
      if (pageTitle) {
        // Remove trailing " : Amazon.in..." or " - Amazon.in..."
        pageTitle = pageTitle.replace(/\s*[:\-|]\s*Amazon\.in.*$/i, '').trim();
        // Remove "Amazon.in:" prefix if present
        pageTitle = pageTitle.replace(/^Amazon\.in\s*[:\-|]\s*/i, '').trim();
      }

      // Extract Open Graph image (og:image)
      const ogImageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i)
        || html.match(/content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i);
      const ogImage = ogImageMatch ? ogImageMatch[1] : null;

      // Extract landing image from various Amazon patterns
      const landingImgMatch = html.match(/id=["']landingImage["'][^>]*data-old-hires=["']([^"']+)["']/i)
        || html.match(/id=["']landingImage["'][^>]*src=["']([^"']+)["']/i);
      const landingImage = landingImgMatch ? landingImgMatch[1] : null;

      // Try data-a-dynamic-image JSON (contains image URLs as keys)
      let dynamicImage = null;
      const dynamicMatch = html.match(/data-a-dynamic-image=["']({[^"']+})["']/i);
      if (dynamicMatch) {
        try {
          const imgObj = JSON.parse(dynamicMatch[1].replace(/&quot;/g, '"'));
          const urls = Object.keys(imgObj);
          if (urls.length > 0) {
            // Pick the largest image (last key usually)
            dynamicImage = urls[urls.length - 1];
          }
        } catch (e) { /* ignore parse error */ }
      }

      // Try imgTagWrapperId pattern
      const imgWrapMatch = html.match(/id=["']imgTagWrapperId["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/i);
      const wrapImage = imgWrapMatch ? imgWrapMatch[1] : null;

      // Try any m.media-amazon.com image with large dimensions
      let cdnImage = null;
      const cdnMatch = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+._-]+\._SX[56789]\d{2}_\.jpg/);
      if (cdnMatch) cdnImage = cdnMatch[0];

      // Use the best available image (priority order)
      const bestImage = landingImage || dynamicImage || wrapImage || ogImage || cdnImage || null;

      // Check if page looks like a valid product page (has "Add to Cart" or price indicators)
      const looksLikeProduct = html.includes('add-to-cart') || html.includes('a-price') || html.includes('productTitle');

      // Check if the page is a "dog page" (product not found)
      const isDogPage = html.includes('try checking your spelling') || html.includes("looking for something");

      if (isDogPage || !looksLikeProduct) {
        return {
          success: false,
          error: `ASIN ${cleanAsin} does not appear to be a valid, active product on Amazon.in.`,
          asin: cleanAsin
        };
      }

      if (!pageTitle || pageTitle.length < 5) {
        return {
          success: false,
          error: `Could not extract a valid product title from the Amazon.in page for ASIN ${cleanAsin}.`,
          asin: cleanAsin
        };
      }

      return {
        success: true,
        asin: cleanAsin,
        title: pageTitle,
        image_url: bestImage,
        product_url: productUrl,
        affiliate_url: affiliateUrl,
        source: 'amazon.in/dp page metadata',
        looked_up_at: new Date().toISOString()
      };

    } catch (err) {
      return {
        success: false,
        error: `Failed to reach Amazon.in for ASIN ${cleanAsin}: ${err.message}`,
        asin: cleanAsin
      };
    }
  }
}

module.exports = new ProductLookup();
