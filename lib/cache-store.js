const fs = require('fs');
const path = require('path');
const integrityAgent = require('./integrity-agent');
const auditLogger = require('./audit-logger');

const VERIFIED_FILE = path.join(__dirname, '..', 'data', 'verified-products.json');
const DELTA_FILE = path.join(__dirname, '..', 'data', 'price-deltas.json');

class CacheStore {
  constructor() {
    this.products = new Map();
    this.priceDeltas = [];
    this.init();
  }

  init() {
    this._loadPriceDeltas();
    this._loadVerifiedCatalog();
  }

  _loadPriceDeltas() {
    try {
      if (fs.existsSync(DELTA_FILE)) {
        const raw = fs.readFileSync(DELTA_FILE, 'utf8');
        this.priceDeltas = JSON.parse(raw);
      }
    } catch (err) {
      this.priceDeltas = [];
    }
  }

  _persistDeltas() {
    try {
      fs.writeFileSync(DELTA_FILE, JSON.stringify(this.priceDeltas.slice(-500), null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save price deltas:', err.message);
    }
  }

  /**
   * Load ONLY previously verified products from the verified catalog.
   * This file is populated exclusively via the 1-to-1 Validator Tool.
   */
  _loadVerifiedCatalog() {
    try {
      if (fs.existsSync(VERIFIED_FILE)) {
        const raw = fs.readFileSync(VERIFIED_FILE, 'utf8');
        const items = JSON.parse(raw);

        let loaded = 0;
        for (const item of items) {
          // Re-validate format on load (not re-lookup — these were already verified)
          const audit = integrityAgent.validateProduct(item);
          if (audit.status === 'PASS') {
            this.products.set(item.asin, item);
            loaded++;
          } else {
            auditLogger.log('VERIFIED_CATALOG_ITEM_STALE', {
              asin: item.asin,
              title: item.title,
              reasons: audit.steps.filter(s => !s.passed).map(s => s.detail)
            }, 'WARNING');
          }
        }

        auditLogger.log('VERIFIED_CATALOG_LOADED', {
          total_in_file: items.length,
          loaded: loaded,
          source: 'verified-products.json'
        }, 'SUCCESS');
      } else {
        auditLogger.log('VERIFIED_CATALOG_EMPTY', {
          message: 'No verified products yet. Add products via the 1-to-1 Validator in Portfolio 2.'
        }, 'SUCCESS');
      }
    } catch (err) {
      auditLogger.log('VERIFIED_CATALOG_LOAD_FAILED', { error: err.message }, 'FAILURE');
    }
  }

  /**
   * Persist the current verified catalog to disk.
   * Called after every product addition or removal.
   */
  _persistVerifiedCatalog() {
    try {
      const all = this.getAllProducts();
      fs.writeFileSync(VERIFIED_FILE, JSON.stringify(all, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist verified catalog:', err.message);
      auditLogger.log('CATALOG_PERSIST_FAILED', { error: err.message }, 'FAILURE');
    }
  }

  getAllProducts() {
    return Array.from(this.products.values());
  }

  getProductByAsin(asin) {
    if (!asin) return null;
    return this.products.get(asin.toUpperCase());
  }

  getFilteredProducts({ category, ratingTier, search, isDailyDeal, sort }) {
    let list = this.getAllProducts();

    // Daily deals filter
    if (isDailyDeal === 'true' || isDailyDeal === true) {
      list = list.filter(p => p.is_daily_deal === true);
    }

    // Category filter
    if (category && category !== 'all') {
      if (category === 'most_purchased' || category === 'trending' || category === 'seasonal_essentials') {
        list = list.filter(p => (p.tags && p.tags.includes(category)) || p.category === category);
      } else {
        list = list.filter(p => p.category === category);
      }
    }

    // Rating tier filter
    if (ratingTier === 'top_rated') {
      list = list.filter(p => parseFloat(p.rating) >= 4.0);
    } else if (ratingTier === 'value_picks') {
      list = list.filter(p => parseFloat(p.rating) >= 3.5 && parseFloat(p.rating) < 4.0);
    } else {
      list = list.filter(p => parseFloat(p.rating) >= 3.5);
    }

    // Keyword search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.asin && p.asin.toLowerCase().includes(q)) ||
        (p.category_label && p.category_label.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sort === 'discount') {
      list.sort((a, b) => {
        const discA = a.list_price ? ((a.list_price - a.current_price) / a.list_price) : 0;
        const discB = b.list_price ? ((b.list_price - b.current_price) / b.list_price) : 0;
        return discB - discA;
      });
    } else if (sort === 'price_asc') {
      list.sort((a, b) => a.current_price - b.current_price);
    } else if (sort === 'price_desc') {
      list.sort((a, b) => b.current_price - a.current_price);
    } else if (sort === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }

  updatePrice(asin, newPrice, newListPrice = null, inStock = true) {
    const existing = this.products.get(asin.toUpperCase());
    if (!existing) return null;

    const oldPrice = existing.current_price;
    existing.current_price = newPrice;
    if (newListPrice) existing.list_price = newListPrice;
    existing.in_stock = inStock;
    existing.last_verified = new Date().toISOString();

    if (oldPrice !== newPrice) {
      const delta = {
        id: 'delta_' + Date.now(),
        asin: existing.asin,
        title: existing.title,
        oldPrice: oldPrice,
        newPrice: newPrice,
        diff: newPrice - oldPrice,
        percentChange: ((newPrice - oldPrice) / oldPrice * 100).toFixed(1),
        timestamp: new Date().toISOString()
      };
      this.priceDeltas.unshift(delta);
      this._persistDeltas();
      auditLogger.log('PRICE_CHANGE_RECORDED', delta, 'SUCCESS');
    } else {
      auditLogger.log('PRICE_VERIFIED_UNCHANGED', { asin: existing.asin, price: newPrice }, 'SUCCESS');
    }

    this.products.set(existing.asin, existing);
    this._persistVerifiedCatalog();
    return existing;
  }

  /**
   * Add a product that has ALREADY been verified through the Product Integrity Agent.
   * This is the ONLY way products enter the active catalog.
   */
  addVerifiedProduct(productData) {
    // Final format check before insertion
    const audit = integrityAgent.validateProduct(productData);
    if (audit.status !== 'PASS') {
      auditLogger.log('ADD_PRODUCT_BLOCKED_AT_GATE', {
        asin: productData.asin,
        reasons: audit.steps.filter(s => !s.passed).map(s => s.detail)
      }, 'BLOCKED');
      return {
        success: false,
        status: 'FAIL',
        errors: audit.steps.filter(s => !s.passed).map(s => s.detail)
      };
    }

    productData.last_verified = new Date().toISOString();
    productData.added_via = '1-to-1 Validator Tool';
    this.products.set(productData.asin.toUpperCase(), productData);
    this._persistVerifiedCatalog();

    auditLogger.log('PRODUCT_VERIFIED_AND_PUBLISHED', {
      asin: productData.asin,
      title: productData.title,
      price: productData.current_price,
      affiliate_url: productData.affiliate_url,
      method: '1-to-1 Validator Tool'
    }, 'SUCCESS');

    return { success: true, status: 'PASS', product: productData };
  }

  removeProduct(asin) {
    const cleanAsin = asin.toUpperCase();
    const existed = this.products.has(cleanAsin);
    if (existed) {
      const product = this.products.get(cleanAsin);
      this.products.delete(cleanAsin);
      this._persistVerifiedCatalog();
      auditLogger.log('PRODUCT_REMOVED', {
        asin: cleanAsin,
        title: product.title
      }, 'SUCCESS');
    }
    return existed;
  }

  getMetrics() {
    const all = this.getAllProducts();
    const topRated = all.filter(p => p.rating >= 4.0).length;
    const valuePicks = all.filter(p => p.rating >= 3.5 && p.rating < 4.0).length;
    const dailyDeals = all.filter(p => p.is_daily_deal).length;

    return {
      totalProducts: all.length,
      topRatedCount: topRated,
      valuePicksCount: valuePicks,
      dailyDealsCount: dailyDeals,
      priceDeltasRecorded: this.priceDeltas.length,
      associateTag: process.env.AMAZON_ASSOCIATE_TAG || 'nagireddy0e-21',
      storefront: process.env.AMAZON_STOREFRONT_URL || 'https://www.amazon.in/shop/influencer-49d2b6c4?ref_=hype_hm_sf_e'
    };
  }

  getPriceDeltas(limit = 50) {
    return this.priceDeltas.slice(0, limit);
  }
}

module.exports = new CacheStore();
