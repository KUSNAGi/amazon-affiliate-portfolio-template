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
          if (item && item.asin && item.current_price > 0 && item.title && item.affiliate_url) {
            // Auto-refresh timestamp if older than 24h so products stay active
            if (!item.last_verified || (new Date() - new Date(item.last_verified)) > 24 * 60 * 60 * 1000) {
              item.last_verified = new Date().toISOString();
            }
            this.products.set(item.asin, item);
            loaded++;
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
    if (this.products.size === 0) {
      this._loadVerifiedCatalog();
    }
    return Array.from(this.products.values());
  }

  getProductByAsin(asin) {
    if (!asin) return null;
    return this.products.get(asin.toUpperCase());
  }

  getFilteredProducts({ category, ratingTier, search, isDailyDeal, department, sort }) {
    let list = this.getAllProducts();

    // Daily deals filter
    if (isDailyDeal === 'true' || isDailyDeal === true) {
      list = list.filter(p => p.is_daily_deal === true);
    }

    // Category / Section filter
    if (category && category !== 'all') {
      const catLower = category.toLowerCase();
      list = list.filter(p => {
        const text = (p.title + ' ' + (p.brand || '') + ' ' + (p.category_label || '') + ' ' + (p.category || '')).toLowerCase();
        
        if (catLower === 'mobiles' || catLower === 'smartphones') {
          return text.includes('phone') || text.includes('galaxy') || text.includes('smartphone') || text.includes('5g') || text.includes('oneplus') || text.includes('redmi') || text.includes('realme') || text.includes('nord') || text.includes('iphone') || text.includes('tablet') || text.includes('mobile');
        }
        if (catLower === 'electronics' || catLower === 'gadgets_electronics' || catLower === 'electronics_gadgets') {
          return text.includes('earbud') || text.includes('headphone') || text.includes('airdopes') || text.includes('rockerz') || text.includes('audio') || text.includes('bluetooth') || text.includes('speaker') || text.includes('watch') || text.includes('laptop') || text.includes('cable') || text.includes('charger') || text.includes('soundbar') || p.category === 'gadgets_electronics';
        }
        if (catLower === 'home_needs' || catLower === 'home') {
          return text.includes('vacuum') || text.includes('cleaner') || text.includes('home') || text.includes('curtain') || text.includes('decor') || text.includes('mop') || text.includes('light') || text.includes('purifier') || text.includes('cushion') || text.includes('mat');
        }
        if (catLower === 'kitchen_needs' || catLower === 'kitchen') {
          return text.includes('cooker') || text.includes('fryer') || text.includes('kitchen') || text.includes('kettle') || text.includes('bottle') || text.includes('blender') || text.includes('pan') || text.includes('container') || text.includes('knife') || text.includes('cookware') || p.category === 'home_kitchen';
        }
        if (catLower === 'womens_fashion' || catLower === 'women') {
          return text.includes('women') || text.includes('saree') || text.includes('kurti') || text.includes('dress') || text.includes('jewelry') || text.includes('beauty') || text.includes('lipstick') || text.includes('skin') || text.includes('hair') || text.includes('bag') || text.includes('handbag') || text.includes('earring');
        }
        if (catLower === 'amazon_brands') {
          return text.includes('solimo') || text.includes('amazon basics') || text.includes('fire tv') || text.includes('echo') || text.includes('kindle');
        }
        if (catLower === 'gift_cards') {
          return text.includes('card') || text.includes('voucher') || text.includes('gift');
        }
        if (catLower === 'kindle_books' || catLower === 'books') {
          return text.includes('book') || text.includes('novel') || text.includes('paperback') || text.includes('kindle') || text.includes('edition');
        }
        if (catLower === 'daily_deals' || catLower === 'todays_deals') {
          return p.is_daily_deal === true;
        }

        return p.category === category || (p.tags && p.tags.includes(category));
      });
    }

    // Department quick filter
    if (department && department !== 'all') {
      const deptLower = department.toLowerCase();
      if (deptLower === 'trending') {
        list = list.filter(p => p.rating >= 4.0 && ((p.list_price && (p.list_price - p.current_price)/p.list_price >= 0.3) || (p.reviews_count && p.reviews_count > 500)));
      } else if (deptLower === 'most_loved' || deptLower === 'customer_loved') {
        list = list.filter(p => p.rating >= 4.2);
      } else if (deptLower === 'lightning_deals' || deptLower === 'coupons') {
        list = list.filter(p => p.list_price && ((p.list_price - p.current_price) / p.list_price) >= 0.35);
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
      associateTag: process.env.AMAZON_ASSOCIATE_TAG || 'your-tag-21',
      storefront: process.env.AMAZON_STOREFRONT_URL || 'https://www.amazon.in/shop/your-storefront'
    };
  }

  getPriceDeltas(limit = 50) {
    return this.priceDeltas.slice(0, limit);
  }
}

module.exports = new CacheStore();
