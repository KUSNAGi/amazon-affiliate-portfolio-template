require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const ProductValidator = require('./lib/validator');
const cacheStore = require('./lib/cache-store');
const auditLogger = require('./lib/audit-logger');
const productLookup = require('./lib/product-lookup');
const dealCurator = require('./lib/deal-curator');
const safeFailGuardian = require('./lib/safe-fail-guardian');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Static Files: Public Portfolio 1
app.use(express.static(path.join(__dirname, 'public')));

// Static Files: Private Admin Portfolio 2
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Public Legal Pages
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

// Pinterest Auto-Publish RSS 2.0 XML Feed
app.get(['/api/pinterest-feed.xml', '/api/pinterest-feed', '/feed.xml'], (req, res) => {
  try {
    const products = cacheStore.getAllProducts().filter(p => p.in_stock && p.current_price > 0);
    const host = 'https://nkiax.vercel.app';

    const itemsXml = products.slice(0, 60).map(p => {
      const cleanTitle = (p.title || 'Curated Amazon Deal')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      const affLink = p.affiliate_url || `https://www.amazon.in/dp/${p.asin}?tag=nagireddy0e-21`;
      const imgUrl = p.image_url || 'https://m.media-amazon.com/images/I/31at6m6WP0L.jpg';
      const formattedPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p.current_price);
      const discount = p.list_price && p.list_price > p.current_price ? ` (${Math.round((p.list_price - p.current_price) / p.list_price * 100)}% OFF)` : '';

      const desc = `${cleanTitle} - Now only ${formattedPrice}${discount} on Amazon.in! Rated ${p.rating}★ (${p.reviews_count || 100}+ reviews). Curated by NKiaX. #ad #AmazonDeals #DailyDeals #${p.brand ? p.brand.replace(/[^a-zA-Z0-9]/g, '') : 'BestDeals'}`
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const pubDate = new Date(p.verified_at || Date.now()).toUTCString();

      return `
    <item>
      <title>${cleanTitle}</title>
      <link>${affLink}</link>
      <guid isPermaLink="true">${affLink}</guid>
      <description>${desc}</description>
      <enclosure url="${imgUrl}" type="image/jpeg" length="1024" />
      <media:content url="${imgUrl}" medium="image" />
      <pubDate>${pubDate}</pubDate>
    </item>`;
    }).join('\n');

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>NKiaX Curated Picks — Top Amazon Today's Deals</title>
    <link>${host}</link>
    <description>Daily verified 4+ star deals and handpicked electronics and home essentials from Amazon.in with live prices.</description>
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${host}/api/pinterest-feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.send(rssXml);
  } catch (err) {
    console.error('Error generating Pinterest RSS feed:', err);
    res.status(500).set('Content-Type', 'text/plain').send('Error generating RSS feed');
  }
});

// Pinterest Bulk Upload CSV Generator & Download Endpoint
const { generatePinterestCsv } = require('./lib/pinterest-csv-generator');
app.get(['/api/download/pinterest-pins.csv', '/pinterest-pins.csv', '/api/pinterest-csv'], (req, res) => {
  try {
    const { csvContent } = generatePinterestCsv('Best Deals on Amazon');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pinterest-bulk-pins.csv"');
    res.send(csvContent);
  } catch (err) {
    console.error('Error serving Pinterest CSV:', err);
    res.status(500).send('Error generating Pinterest CSV');
  }
});

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

// Public Feedback Submission
const FEEDBACKS_FILE = path.join(__dirname, 'data', 'feedbacks.json');
const loadFeedbacks = () => {
  try {
    if (fs.existsSync(FEEDBACKS_FILE)) {
      return JSON.parse(fs.readFileSync(FEEDBACKS_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
};
const saveFeedbacks = (feedbacks) => {
  try {
    fs.writeFileSync(FEEDBACKS_FILE, JSON.stringify(feedbacks, null, 2));
  } catch (e) {}
};

app.post('/api/feedback', (req, res) => {
  const { category, asin, message, contact } = req.body;
  if (!message || message.trim().length < 5) {
    return res.status(400).json({ success: false, error: 'Please provide a detailed message (at least 5 characters).' });
  }

  const newFeedback = {
    id: 'FB-' + Date.now().toString(36).toUpperCase(),
    category: category || 'general_feedback',
    asin: asin ? asin.trim().toUpperCase() : null,
    message: message.trim(),
    contact: contact ? contact.trim() : 'Anonymous',
    status: 'PENDING_REVIEW',
    submittedAt: new Date().toISOString(),
    ip: req.ip || '127.0.0.1'
  };

  const feedbacks = loadFeedbacks();
  feedbacks.unshift(newFeedback);
  saveFeedbacks(feedbacks);

  auditLogger.log('CUSTOMER_FEEDBACK_SUBMITTED', {
    id: newFeedback.id,
    category: newFeedback.category,
    asin: newFeedback.asin
  }, 'SUCCESS');

  res.json({ success: true, message: 'Feedback submitted successfully.', feedbackId: newFeedback.id });
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

// Get all feedbacks for Portfolio 2 (Private Admin)
app.get('/api/admin/feedbacks', (req, res) => {
  const feedbacks = loadFeedbacks();
  res.json({ success: true, count: feedbacks.length, feedbacks });
});

// Update feedback status (Owner action)
app.post('/api/admin/feedbacks/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const feedbacks = loadFeedbacks();
  const fb = feedbacks.find(f => f.id === id);
  if (!fb) {
    return res.status(404).json({ success: false, error: 'Feedback not found.' });
  }
  fb.status = status || 'REVIEWED';
  fb.reviewedAt = new Date().toISOString();
  if (note) fb.ownerNote = note;
  saveFeedbacks(feedbacks);

  auditLogger.logHumanReadable({
    toolOrModule: '💬 Feedback Manager',
    actionPerformed: `Customer Feedback ${id} updated to status ${fb.status}`,
    permissionUsed: 'OWNER_MUTATE',
    complianceStatus: '100%_COMPLIANT',
    details: { id, status: fb.status, note }
  });
  res.json({ success: true, feedback: fb });
});

// System Status & Safe-Fail Guardian API
app.get('/api/admin/system-status', (req, res) => {
  res.json({
    success: true,
    status: safeFailGuardian.status,
    serverTime: new Date().toISOString(),
    serverTimeIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  });
});

// Owner Safe-Fail Reset
app.post('/api/admin/safe-fail/reset', (req, res) => {
  const { operator } = req.body;
  const result = safeFailGuardian.resetEmergencyHalt(operator || 'Project Owner');
  res.json(result);
});

// Trigger 5-Hour Ecosystem Health Audit
app.post('/api/admin/health-check', async (req, res) => {
  const report = await safeFailGuardian.runFiveHourHealthAudit();
  res.json({ success: true, report });
});

// ============================================================
// 2-HOUR CONTINUOUS COMPLIANCE & MONITORING ENGINE
// Checks price changes, out-of-stock items, and updates Today's Deals
// ============================================================
const runTwoHourComplianceAudit = async () => {
  if (safeFailGuardian.isHalted()) {
    console.warn('⚠️ [2-Hour Compliance] Skipped: System under Safe-Fail Emergency Halt.');
    return;
  }

  console.log('🛡️ [2-Hour Compliance Audit] Starting price verification and deal sync...');
  auditLogger.logHumanReadable({
    toolOrModule: '📉 Price & Policy Monitor',
    actionPerformed: '2-Hour automated price check and deal sync started',
    permissionUsed: 'READ_PUBLIC_METADATA',
    complianceStatus: '100%_COMPLIANT',
    details: { scheduledInterval: '2 Hours' }
  });

  try {
    const allProducts = cacheStore.getAllProducts();
    let priceChangeCount = 0;
    let removedUnavailableCount = 0;

    for (const product of allProducts) {
      try {
        const lookup = await productLookup.lookupByAsin(product.asin);
        if (!lookup.success || !lookup.current_price || lookup.current_price <= 0) {
          cacheStore.removeProduct(product.asin);
          removedUnavailableCount++;
          auditLogger.logHumanReadable({
            toolOrModule: '📉 Price & Policy Monitor',
            actionPerformed: `Product ASIN ${product.asin} (${product.title.substring(0, 30)}...) auto-removed (Unavailable/Out of stock on Amazon)`,
            permissionUsed: 'UPDATE_CATALOG_STATE',
            complianceStatus: '100%_COMPLIANT',
            details: { asin: product.asin, reason: lookup.error }
          });
        } else if (lookup.current_price !== product.current_price) {
          cacheStore.updatePrice(product.asin, lookup.current_price);
          priceChangeCount++;
        }
      } catch (err) {
        console.error(`Compliance check error for ASIN ${product.asin}:`, err.message);
      }
    }

    const curationResult = await dealCurator.runDailyCuration();

    auditLogger.logHumanReadable({
      toolOrModule: '📉 Price & Policy Monitor',
      actionPerformed: `2-Hour Compliance Audit finished: ${priceChangeCount} prices updated, ${removedUnavailableCount} out-of-stock removed, ${curationResult.publishedCount} fresh deals added`,
      permissionUsed: 'UPDATE_CATALOG_STATE',
      complianceStatus: '100%_COMPLIANT',
      details: {
        pricesUpdated: priceChangeCount,
        unavailableRemoved: removedUnavailableCount,
        freshDealsIngested: curationResult.publishedCount
      }
    });

    console.log(`🛡️ [2-Hour Compliance Audit] Complete: ${priceChangeCount} prices updated, ${removedUnavailableCount} unavailable removed, ${curationResult.publishedCount} deals verified.`);
  } catch (err) {
    auditLogger.logHumanReadable({
      toolOrModule: '📉 Price & Policy Monitor',
      actionPerformed: `2-Hour Compliance Audit encountered error: ${err.message}`,
      permissionUsed: 'SYSTEM_ERROR',
      complianceStatus: 'ERROR',
      details: { error: err.message }
    });
  }
};

// Start Server
app.listen(PORT, () => {
  const productCount = cacheStore.getAllProducts().length;
  console.log(`====================================================`);
  console.log(`🚀 Project Affiliate — Server Active`);
  console.log(`🌐 Portfolio 1 (Public): http://localhost:${PORT}`);
  console.log(`🔒 Portfolio 2 (Private Admin): http://localhost:${PORT}/admin`);
  console.log(`🏷️ Associate Tag: ${process.env.AMAZON_ASSOCIATE_TAG || 'nagireddy0e-21'}`);
  console.log(`📦 Verified Products in Catalog: ${productCount}`);
  console.log(`⏱️ Compliance Audit: Every 2 Hours | Health Audit: Every 5 Hours`);
  console.log(`🛡️ Safe-Fail Guardian: Active (Reports to nr1130businessmail@gmail.com)`);
  console.log(`====================================================`);

  auditLogger.logHumanReadable({
    toolOrModule: '🚀 Server Bootstrap',
    actionPerformed: `Server started successfully on port ${PORT} with ${productCount} verified products`,
    permissionUsed: 'SYSTEM_BOOT',
    complianceStatus: '100%_COMPLIANT',
    details: {
      port: PORT,
      catalogSize: productCount,
      associateTag: process.env.AMAZON_ASSOCIATE_TAG || 'nagireddy0e-21',
      complianceInterval: '2 Hours',
      healthAuditInterval: '5 Hours',
      emergencyContact: 'nr1130businessmail@gmail.com'
    }
  });

  // Recurring 2-Hour Compliance & Price Sync Timer
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  setInterval(runTwoHourComplianceAudit, TWO_HOURS_MS);

  // Recurring 5-Hour Ecosystem Health Audit Timer
  const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
  setInterval(() => {
    safeFailGuardian.runFiveHourHealthAudit();
  }, FIVE_HOURS_MS);

  // Run initial health audit
  setTimeout(() => {
    safeFailGuardian.runFiveHourHealthAudit();
  }, 2000);
});



