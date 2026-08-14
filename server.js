require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const ProductValidator = require('./lib/validator');
const cacheStore = require('./lib/cache-store');
const auditLogger = require('./lib/audit-logger');
const productLookup = require('./lib/product-lookup');
const dealCurator = require('./lib/deal-curator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Static Files: Public Portfolio 1
app.use(express.static(path.join(__dirname, 'public')));

// Static Files: Private Admin Portfolio 2
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ----------------------------------------------------
// PUBLIC API (Portfolio 1)
// ----------------------------------------------------

// Get filtered product catalog (only verified products)
app.get('/api/products', (req, res) => {
  const { category, ratingTier, search, isDailyDeal, sort } = req.query;
  const products = cacheStore.getFilteredProducts({ category, ratingTier, search, isDailyDeal, sort });

  // Strip internal fields before sending to public
  const publicData = products.map(p => ({
    asin: p.asin,
    title: p.title,
    brand: p.brand,
    category: p.category,
    category_label: p.category_label,
    is_daily_deal: p.is_daily_deal,
    deal_label: p.deal_label,
    current_price: p.current_price,
    list_price: p.list_price,
    currency: p.currency,
    rating: p.rating,
    reviews_count: p.reviews_count,
    image_url: p.image_url,
    affiliate_url: p.affiliate_url,
    in_stock: p.in_stock,
    tags: p.tags
  }));

  res.json({
    success: true,
    count: publicData.length,
    timestamp: new Date().toISOString(),
    data: publicData
  });
});

// Get daily deals
app.get('/api/deals', (req, res) => {
  const deals = cacheStore.getFilteredProducts({ isDailyDeal: true });
  res.json({
    success: true,
    count: deals.length,
    timestamp: new Date().toISOString(),
    data: deals
  });
});

// System config & public metadata (no internal info exposed)
app.get('/api/config', (req, res) => {
  res.json({
    storeName: 'NKiaX Curated Picks',
    disclaimer: 'As an Amazon Associate, we earn from qualifying purchases. Product prices and availability are accurate as of the date/time indicated and are subject to change.',
    currency: 'INR',
    ratingPolicy: {
      minimumThreshold: 3.5,
      topRatedThreshold: 4.0
    }
  });
});

// ----------------------------------------------------
// PRIVATE ADMIN & AUDIT API (Portfolio 2) — Protected
// ----------------------------------------------------

const ADMIN_SECRET = process.env.ADMIN_SECRET_TOKEN || 'nkiax_admin_2026_secure';

const adminAuthMiddleware = (req, res, next) => {
  const token = req.headers['x-admin-token'] || 
                req.headers['authorization']?.replace(/^Bearer\s+/i, '') || 
                req.query.token;

  if (token && token === ADMIN_SECRET) {
    return next();
  }

  if (token && token !== ADMIN_SECRET) {
    auditLogger.log('UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      invalidTokenProvided: true
    }, 'BLOCKED');
    return res.status(403).json({ success: false, error: 'Forbidden: Invalid Admin Secret Token.' });
  }

  if (process.env.NODE_ENV === 'production') {
    auditLogger.log('UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      missingToken: true
    }, 'BLOCKED');
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin Secret Token required in production.' });
  }

  next();
};

app.use('/api/admin', adminAuthMiddleware);

// Admin metrics
app.get('/api/admin/metrics', (req, res) => {
  const metrics = cacheStore.getMetrics();
  res.json({
    success: true,
    metrics: metrics,
    serverTime: new Date().toISOString()
  });
});

// Audit logs
app.get('/api/admin/audit-logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const filterType = req.query.type || null;
  const logs = auditLogger.getLogs(limit, filterType);
  res.json({
    success: true,
    count: logs.length,
    logs: logs
  });
});

// Price delta history
app.get('/api/admin/price-deltas', (req, res) => {
  const deltas = cacheStore.getPriceDeltas(parseInt(req.query.limit) || 50);
  res.json({
    success: true,
    count: deltas.length,
    deltas: deltas
  });
});

// ============================================================
// CORE: Product Lookup — Fetches real Amazon.in page for ASIN
// This is the FIRST STEP in the 1-to-1 Validator pipeline.
// ============================================================
app.post('/api/admin/lookup-product', async (req, res) => {
  const { asin } = req.body;

  if (!asin) {
    return res.status(400).json({ success: false, error: 'ASIN is required.' });
  }

  auditLogger.log('PRODUCT_LOOKUP_INITIATED', { asin: asin.toUpperCase() }, 'SUCCESS');

  const result = await productLookup.lookupByAsin(asin);

  if (!result.success) {
    auditLogger.log('PRODUCT_LOOKUP_FAILED', {
      asin: asin.toUpperCase(),
      error: result.error
    }, 'FAILURE');
  } else {
    auditLogger.log('PRODUCT_LOOKUP_SUCCESS', {
      asin: result.asin,
      title: result.title,
      image: result.image_url ? 'Found' : 'Not found',
      affiliate_url: result.affiliate_url
    }, 'SUCCESS');
  }

  res.json(result);
});

// ============================================================
// CORE: Add Verified Product — Only after lookup + user review
// ============================================================
app.post('/api/admin/add-product', (req, res) => {
  const productData = req.body;

  // Must have been looked up first (checked by client)
  if (!productData.lookup_verified) {
    auditLogger.log('ADD_PRODUCT_BLOCKED_NO_LOOKUP', {
      asin: productData.asin,
      reason: 'Product was not looked up and verified through the 1-to-1 Validator before attempting to add.'
    }, 'BLOCKED');
    return res.status(400).json({
      success: false,
      error: 'Product must be looked up and verified through the 1-to-1 Validator before adding.'
    });
  }

  const result = cacheStore.addVerifiedProduct(productData);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Verify ASIN & Link mapping (standalone check)
app.post('/api/admin/verify-link', (req, res) => {
  const { asin, url } = req.body;
  const result = ProductValidator.verifyAffiliateLink(url, asin);
  auditLogger.log('AFFILIATE_LINK_VERIFICATION_CHECK', {
    asin: asin,
    url: url,
    valid: result.valid,
    reason: result.reason || 'Verified 1-to-1 Match'
  }, result.valid ? 'SUCCESS' : 'FAILURE');

  res.json({ success: true, result: result });
});

// ============================================================
// CORE: Automated Daily Deal Curation & Publication
// Looks up, validates with 8-point integrity agent, and publishes
// ============================================================
app.post('/api/admin/auto-curate', async (req, res) => {
  const customList = req.body?.asins || null;
  const results = await dealCurator.runDailyCuration(customList);
  res.json({
    success: true,
    message: `Automated curation completed: ${results.publishedCount} products verified & published.`,
    data: results
  });
});

// Manual sync — refresh timestamps for existing verified products
app.post('/api/admin/sync', async (req, res) => {
  auditLogger.log('MANUAL_SYNC_TRIGGERED', { initiator: 'Admin User' }, 'SUCCESS');

  const all = cacheStore.getAllProducts();
  const results = [];

  for (const product of all) {
    product.last_verified = new Date().toISOString();
    results.push({ asin: product.asin, status: 'TIMESTAMP_REFRESHED', price: product.current_price });
  }

  auditLogger.log('SYNC_COMPLETED', { totalProcessed: all.length }, 'SUCCESS');

  res.json({
    success: true,
    message: 'Timestamp refresh completed for all verified products.',
    processed: results.length,
    results: results
  });
});

// Simulate price change (for testing delta tracking)
app.post('/api/admin/simulate-price-change', (req, res) => {
  const { asin, newPrice } = req.body;
  const updated = cacheStore.updatePrice(asin, parseFloat(newPrice));
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Product ASIN not found in verified catalog.' });
  }
  res.json({ success: true, updated: updated });
});

// Start Server
app.listen(PORT, () => {
  const productCount = cacheStore.getAllProducts().length;
  console.log(`====================================================`);
  console.log(`🚀 Project Affiliate — Server Active`);
  console.log(`🌐 Portfolio 1 (Public): http://localhost:${PORT}`);
  console.log(`🔒 Portfolio 2 (Private Admin): http://localhost:${PORT}/admin`);
  console.log(`🏷️ Associate Tag: ${process.env.AMAZON_ASSOCIATE_TAG || 'nagireddy0e-21'}`);
  console.log(`📦 Verified Products in Catalog: ${productCount}`);
  console.log(`====================================================`);

  auditLogger.log('SERVER_STARTED', {
    port: PORT,
    verifiedProducts: productCount,
    associateTag: process.env.AMAZON_ASSOCIATE_TAG || 'nagireddy0e-21'
  }, 'SUCCESS');

  // Automatic Daily Curation Timer (runs every 24 hours)
  const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    console.log('⏰ Running automated daily deal curation & sync...');
    dealCurator.runDailyCuration();
  }, DAILY_INTERVAL_MS);

  // If catalog is empty on boot, automatically curate initial deal batch
  if (productCount === 0) {
    setTimeout(() => {
      console.log('📦 Catalog is empty. Triggering initial automated deal curation...');
      dealCurator.runDailyCuration();
    }, 1500);
  }
});

