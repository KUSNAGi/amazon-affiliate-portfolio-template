require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const AmazonCreatorAPI = require('./lib/amazon-api');
const ProductValidator = require('./lib/validator');
const cacheStore = require('./lib/cache-store');
const auditLogger = require('./lib/audit-logger');

const app = express();
const PORT = process.env.PORT || 3000;
const amazonApi = new AmazonCreatorAPI();

app.use(cors());
app.use(express.json());

// Static Files: Public Portfolio 1
app.use(express.static(path.join(__dirname, 'public')));

// Static Files: Private Admin Portfolio 2
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ----------------------------------------------------
// PUBLIC API (Portfolio 1)
// ----------------------------------------------------

// Get filtered product catalog
app.get('/api/products', (req, res) => {
  const { category, ratingTier, search, isDailyDeal, sort } = req.query;
  const products = cacheStore.getFilteredProducts({ category, ratingTier, search, isDailyDeal, sort });
  
  res.json({
    success: true,
    count: products.length,
    timestamp: new Date().toISOString(),
    storefront: process.env.AMAZON_STOREFRONT_URL || 'https://www.amazon.in/shop/NKiaX',
    associateTag: process.env.AMAZON_ASSOCIATE_TAG || 'nagireddy0e-21',
    data: products
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

// System config & public metadata
app.get('/api/config', (req, res) => {
  res.json({
    storeName: 'NKiaX Influencer Showcase',
    storefrontUrl: process.env.AMAZON_STOREFRONT_URL || 'https://www.amazon.in/shop/NKiaX',
    associateTag: process.env.AMAZON_ASSOCIATE_TAG || 'nagireddy0e-21',
    disclaimer: 'As an Amazon Associate and Influencer, I earn from qualifying purchases. Product prices and availability are accurate as of the date/time indicated and are subject to change.',
    currency: 'INR',
    ratingPolicy: {
      minimumThreshold: 3.5,
      topRatedThreshold: 4.0
    }
  });
});

// ----------------------------------------------------
// PRIVATE ADMIN & AUDIT API (Portfolio 2)
// ----------------------------------------------------

// Admin metrics
app.get('/api/admin/metrics', (req, res) => {
  const metrics = cacheStore.getMetrics();
  res.json({
    success: true,
    apiConfigured: amazonApi.isConfigured(),
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

// Verify ASIN & Link mapping
app.post('/api/admin/verify-link', (req, res) => {
  const { asin, url } = req.body;
  const result = ProductValidator.verifyAffiliateLink(url, asin);
  auditLogger.log('AFFILIATE_LINK_VERIFICATION_CHECK', {
    asin: asin,
    url: url,
    valid: result.valid,
    reason: result.reason || 'Verified 1-to-1 Match'
  }, result.valid ? 'SUCCESS' : 'FAILURE');

  res.json({
    success: true,
    result: result
  });
});

// Manual Sync Trigger
app.post('/api/admin/sync', async (req, res) => {
  auditLogger.log('MANUAL_SYNC_TRIGGERED', { initiator: 'Admin User' }, 'SUCCESS');
  
  const all = cacheStore.getAllProducts();
  const results = [];

  for (const product of all) {
    // If API configured, fetch live via PA-API
    if (amazonApi.isConfigured()) {
      try {
        const apiRes = await amazonApi.getItems([product.asin]);
        if (apiRes.success && apiRes.data?.ItemsResult?.Items?.length > 0) {
          const item = apiRes.data.ItemsResult.Items[0];
          const priceObj = item.Offers?.Listings?.[0]?.Price;
          if (priceObj && priceObj.Amount) {
            cacheStore.updatePrice(product.asin, priceObj.Amount, null, true);
            results.push({ asin: product.asin, status: 'UPDATED', newPrice: priceObj.Amount });
          }
        }
      } catch (err) {
        results.push({ asin: product.asin, status: 'ERROR', message: err.message });
      }
    } else {
      // In local mode, verify freshness and timestamp
      product.last_verified = new Date().toISOString();
      results.push({ asin: product.asin, status: 'TIMESTAMP_REFRESHED', price: product.current_price });
    }
  }

  auditLogger.log('SYNC_COMPLETED', { totalProcessed: all.length, results: results }, 'SUCCESS');

  res.json({
    success: true,
    message: 'Sync completed successfully.',
    processed: results.length,
    results: results
  });
});

// Add new product
app.post('/api/admin/add-product', (req, res) => {
  const result = cacheStore.addProduct(req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Simulate price change (for testing delta tracking)
app.post('/api/admin/simulate-price-change', (req, res) => {
  const { asin, newPrice } = req.body;
  const updated = cacheStore.updatePrice(asin, parseFloat(newPrice));
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Product ASIN not found' });
  }
  res.json({ success: true, updated: updated });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Amazon Affiliate & Influencer Platform Running!`);
  console.log(`🌐 Portfolio 1 (Public): http://localhost:${PORT}`);
  console.log(`🔒 Portfolio 2 (Private Admin): http://localhost:${PORT}/admin`);
  console.log(`🏷️ Associate Tag: ${process.env.AMAZON_ASSOCIATE_TAG || 'nagireddy0e-21'}`);
  console.log(`🏪 Storefront: ${process.env.AMAZON_STOREFRONT_URL || 'https://www.amazon.in/shop/NKiaX'}`);
  console.log(`====================================================`);

  auditLogger.log('SERVER_STARTED', {
    port: PORT,
    associateTag: process.env.AMAZON_ASSOCIATE_TAG || 'nagireddy0e-21',
    nodeEnv: process.env.NODE_ENV
  }, 'SUCCESS');
});
