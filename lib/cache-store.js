const fs = require('fs');
const path = require('path');
const ProductValidator = require('./validator');
const auditLogger = require('./audit-logger');

const SEED_FILE = path.join(__dirname, '..', 'data', 'seed-products.json');
const DELTA_FILE = path.join(__dirname, '..', 'data', 'price-deltas.json');

class CacheStore {
  constructor() {
    this.products = new Map();
    this.priceDeltas = [];
    this.init();
  }

  init() {
    this._loadPriceDeltas();
    this._loadSeedData();
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

  _loadSeedData() {
    try {
      if (fs.existsSync(SEED_FILE)) {
        const raw = fs.readFileSync(SEED_FILE, 'utf8');
        const items = JSON.parse(raw);
        for (const item of items) {
          const audit = ProductValidator.validateProductRecord(item);
          if (audit.valid) {
            this.products.set(item.asin, item);
          } else {
            auditLogger.log('PRODUCT_VALIDATION_ERROR', {
              asin: item.asin,
              errors: audit.errors
            }, 'WARNING');
          }
        }
        auditLogger.log('SEED_CATALOG_LOADED', {
          count: this.products.size
        }, 'SUCCESS');
      }
    } catch (err) {
      auditLogger.log('SEED_LOAD_FAILED', { error: err.message }, 'FAILURE');
    }
  }

  getAllProducts() {
    return Array.from(this.products.values());
  }

  getProductByAsin(asin) {
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
        list = list.filter(p => p.tags && p.tags.includes(category) || p.category === category);
      } else {
        list = list.filter(p => p.category === category);
      }
    }

    // Rating tier filter (User rule: 4.0+ Top Rated vs 3.5-3.9 Value Picks)
    if (ratingTier === 'top_rated') {
      list = list.filter(p => parseFloat(p.rating) >= 4.0);
    } else if (ratingTier === 'value_picks') {
      list = list.filter(p => parseFloat(p.rating) >= 3.5 && parseFloat(p.rating) < 4.0);
    } else {
      // Default: exclude any product rated strictly below 3.5
      list = list.filter(p => parseFloat(p.rating) >= 3.5);
    }

    // Keyword search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) || 
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        p.asin.toLowerCase().includes(q)
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
    return existing;
  }

  addProduct(productData) {
    const audit = ProductValidator.validateProductRecord(productData);
    if (!audit.valid) {
      auditLogger.log('ADD_PRODUCT_REJECTED', { asin: productData.asin, errors: audit.errors }, 'BLOCKED');
      return { success: false, errors: audit.errors };
    }

    productData.last_verified = new Date().toISOString();
    this.products.set(productData.asin.toUpperCase(), productData);

    auditLogger.log('PRODUCT_ADDED', {
      asin: productData.asin,
      title: productData.title,
      price: productData.current_price,
      affiliate_url: productData.affiliate_url
    }, 'SUCCESS');

    return { success: true, product: productData };
  }

  getMetrics() {
    const all = this.getAllProducts();
    const topRated = all.filter(p => p.rating >= 4.0).length;
    const valuePicks = all.filter(p => p.rating >= 3.5 && p.rating < 4.0).length;
    const dailyDeals = all.filter(p => p.is_daily_deal).length;
    const freshPrices = all.filter(p => ProductValidator.isPriceFresh(p.last_verified)).length;

    return {
      totalProducts: all.length,
      topRatedCount: topRated,
      valuePicksCount: valuePicks,
      dailyDealsCount: dailyDeals,
      freshPricesCount: freshPrices,
      priceDeltasRecorded: this.priceDeltas.length,
      associateTag: process.env.AMAZON_ASSOCIATE_TAG || 'nagireddy0e-21',
      storefront: process.env.AMAZON_STOREFRONT_URL || 'https://www.amazon.in/shop/NKiaX'
    };
  }

  getPriceDeltas(limit = 50) {
    return this.priceDeltas.slice(0, limit);
  }
}

module.exports = new CacheStore();
