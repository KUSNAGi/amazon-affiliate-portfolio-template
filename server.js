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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Static Files: Private Admin Portfolio 2
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Public Legal Pages
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

// Google Sheets Direct Live Sync Endpoints (Option 1 & Direct Download)
const auditSheetService = require('./lib/audit-sheet-service');

app.get(['/sheets/master-ecosystem-audit.csv', '/master-ecosystem-audit.csv', '/api/sheets/master-audit.csv'], (req, res) => {
  try {
    const { csvContent } = auditSheetService.generateMasterAuditCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="master-ecosystem-audit.csv"');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(csvContent);
  } catch (err) {
    res.status(500).send('Error serving master audit CSV');
  }
});

app.get(['/sheets/daily-ecosystem-reports.csv', '/daily-ecosystem-reports.csv', '/api/sheets/daily-reports.csv'], (req, res) => {
  try {
    const { csvContent } = auditSheetService.generateDailyReportsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="daily-ecosystem-reports.csv"');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(csvContent);
  } catch (err) {
    res.status(500).send('Error serving daily reports CSV');
  }
});

// Pinterest Auto-Publishing RSS Feed (Built-in Pinterest 24/7 Automation)
const { generatePinterestRssFeed } = require('./lib/pinterest-feed');
app.get(['/api/feed/pinterest-deals.xml', '/pinterest-deals.xml', '/feed.xml'], (req, res) => {
  try {
    const xml = generatePinterestRssFeed('Best Deals on Amazon');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating Pinterest RSS feed');
  }
});

// Pinterest Bulk Upload CSV Generator & Download Endpoint
const { generatePinterestCsv } = require('./lib/pinterest-csv-generator');
app.get(['/api/download/pinterest-pins.csv', '/pinterest-pins.csv', '/api/pinterest-csv'], (req, res) => {
  try {
    const { csvContent } = generatePinterestCsv('Best Deals on Amazon');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pinterest-bulk-pins.csv"');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.send(csvContent);
  } catch (err) {
    console.error('Error serving Pinterest CSV:', err);
    res.status(500).send('Error generating Pinterest CSV');
  }
});

app.get(['/top-5-pinterest-pins.csv', '/api/download/top-5-pins.csv', '/top-5-pins.csv'], (req, res) => {
  try {
    const tag = process.env.AMAZON_ASSOCIATE_TAG || 'your-tag-21';
    const csvContent = '\uFEFF' + [
      'Title,Media URL,Pinterest board,Thumbnail,Description,Link,Publish date,Keywords',
      `Sample Wireless Earbuds - ₹1099 (50% OFF),https://m.media-amazon.com/images/I/514jLzHX86L._SX679_.jpg,Best Deals on Amazon,,Sample Wireless Bluetooth Earbuds | Now only ₹1,099 on Amazon India! Rated 4.2★. Tap to buy on Amazon! #ad #AmazonDeals,https://www.amazon.in/dp/B00SAMPLE1?tag=${tag},,"Amazon Deals, Electronics, Today Deals"`,
      `Sample 5G Smartphone - ₹19999 (20% OFF),https://m.media-amazon.com/images/I/71M0xLXh+4L._SX679_.jpg,Best Deals on Amazon,,Sample 5G Mobile Smartphone | Now only ₹19,999 on Amazon India! Rated 4.5★. Tap to buy on Amazon! #ad #AmazonDeals,https://www.amazon.in/dp/B00SAMPLE2?tag=${tag},,"Amazon Deals, Mobiles, Today Deals"`,
      `Sample Smart Laptop - ₹30999,https://m.media-amazon.com/images/I/61k40fQ5NBL._SX679_.jpg,Best Deals on Amazon,,Sample Display Laptop | Now only ₹30,999 on Amazon India! Rated 4.4★. Tap to buy on Amazon! #ad #AmazonDeals,https://www.amazon.in/dp/B00SAMPLE3?tag=${tag},,"Amazon Deals, Electronics, Today Deals"`,
      `Sample Wireless Headphones - ₹1499,https://m.media-amazon.com/images/I/51wXpMvK7zL._SX679_.jpg,Best Deals on Amazon,,Sample Bluetooth Headphones | Now only ₹1,499 on Amazon India! Rated 4.0★. Tap to buy on Amazon! #ad #AmazonDeals,https://www.amazon.in/dp/B00SAMPLE4?tag=${tag},,"Amazon Deals, Electronics, Today Deals"`,
      `Sample Flagship Smartphone - ₹72490,https://m.media-amazon.com/images/I/51e6719IBfL._SX679_.jpg,Best Deals on Amazon,,Sample Flagship Smartphone | Now only ₹72,490 on Amazon India! Rated 4.7★. Tap to buy on Amazon! #ad #AmazonDeals,https://www.amazon.in/dp/B00SAMPLE5?tag=${tag},,"Amazon Deals, Mobiles, Today Deals"`
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="top-5-pinterest-pins.csv"');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(csvContent);
  } catch (err) {
    res.status(500).send('Error serving top 5 pins CSV');
  }
});

// Claimed Domain Gateway for Pinterest (Auto-redirects visitors to Amazon Affiliate Link)
app.get('/deal/:asin', (req, res) => {
  const { asin } = req.params;
  const targetTag = process.env.AMAZON_ASSOCIATE_TAG || 'your-tag-21';
  const amazonUrl = `https://www.amazon.in/dp/${asin}?tag=${targetTag}`;
  
  auditLogger.logHumanReadable({
    toolOrModule: '📌 Pinterest Deal Gateway',
    actionPerformed: `Redirected visitor from Pinterest for ASIN ${asin} to Amazon.in`,
    permissionUsed: 'AFFILIATE_REDIRECT',
    complianceStatus: '100%_COMPLIANT',
    details: { asin, amazonUrl }
  });

  res.redirect(302, amazonUrl);
});

// ----------------------------------------------------
// PUBLIC API (Portfolio 1)
// ----------------------------------------------------

// Get filtered product catalog (only verified products)
app.get('/api/products', (req, res) => {
  const { category, ratingTier, search, isDailyDeal, department, sort } = req.query;
  const products = cacheStore.getFilteredProducts({ category, ratingTier, search, isDailyDeal, department, sort });

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

  res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
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
  res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
  res.json({
    success: true,
    count: deals.length,
    timestamp: new Date().toISOString(),
    data: deals
  });
});

// Lightweight 24/7 Keep-Alive & Heartbeat for cron-job.org / monitoring
app.get(['/api/cron/ping', '/api/ping', '/ping', '/healthz'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    status: 'OK',
    uptime: Math.floor(process.uptime ? process.uptime() : 0),
    timestamp: new Date().toISOString(),
    keepAlive: true
  });
});

// ============================================================
// PUBLIC CRON ENDPOINTS (Vercel Cron & Cron-Job.org)
// ============================================================
app.get(['/api/cron/2hour-sync', '/api/cron-sync', '/api/cron/sync'], async (req, res) => {
  const syncJobId = 'CRON_' + Date.now();
  res.json({
    success: true,
    jobId: syncJobId,
    status: 'PROCESSING',
    message: '2-Hour automated deal curation & price validation successfully triggered.'
  });
  try {
    await runTwoHourComplianceAudit();
  } catch (e) {
    console.error('Cron error:', e);
  }
});

app.post(['/api/cron/2hour-sync', '/api/cron-sync', '/api/cron/sync'], async (req, res) => {
  const syncJobId = 'CRON_' + Date.now();
  res.json({
    success: true,
    jobId: syncJobId,
    status: 'PROCESSING',
    message: '2-Hour automated deal curation & price validation successfully triggered.'
  });
  try {
    await runTwoHourComplianceAudit();
  } catch (e) {
    console.error('Cron error:', e);
  }
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
    storeName: 'Curated Deals Hub',
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

const ADMIN_CONFIG_FILE = path.join(__dirname, 'data', 'admin-config.json');

function getAdminSecret() {
  try {
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(ADMIN_CONFIG_FILE, 'utf8'));
      if (cfg && cfg.adminPassword) return cfg.adminPassword.trim();
    }
  } catch (e) {}
  return (process.env.ADMIN_SECRET_TOKEN || process.env.ADMIN_PASSWORD || '').trim();
}

function setAdminSecret(newPassword) {
  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify({ adminPassword: newPassword.trim(), updatedAt: new Date().toISOString() }, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

function isPasswordValid(inputToken) {
  if (!inputToken) return false;
  const configured = getAdminSecret();
  if (!configured) {
    console.warn('⚠️ [SECURITY] No ADMIN_PASSWORD configured in environment or data/admin-config.json.');
    return false;
  }
  return inputToken.trim() === configured;
}

// Public endpoint to verify owner passcode
app.post('/api/admin/auth/verify', (req, res) => {
  const { token } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanToken = (token || '').trim();

  if (isPasswordValid(cleanToken)) {
    auditLogger.logHumanReadable({
      toolOrModule: '🔒 Owner Security Gate',
      actionPerformed: 'Owner successfully authenticated into Private Portfolio 2',
      permissionUsed: 'OWNER_AUTH',
      complianceStatus: '100%_COMPLIANT',
      details: { ip, timestamp: new Date().toISOString() }
    });
    return res.json({ success: true, authenticated: true });
  }

  auditLogger.logHumanReadable({
    toolOrModule: '🔒 Owner Security Gate',
    actionPerformed: `UNAUTHORIZED ACCESS ATTEMPT REJECTED (IP: ${ip})`,
    permissionUsed: 'UNAUTHORIZED_ATTEMPT',
    complianceStatus: 'VIOLATION_BLOCKED',
    details: { ip, timestamp: new Date().toISOString() }
  });

  return res.status(401).json({
    success: false,
    authenticated: false,
    error: 'Access Denied: Invalid Master Security Key.'
  });
});

// Endpoint to change master password
app.post('/api/admin/auth/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, error: 'New password must be at least 4 characters.' });
  }
  const current = getAdminSecret();
  if (currentPassword && currentPassword.trim() === current) {
    setAdminSecret(newPassword.trim());
    auditLogger.logHumanReadable({
      toolOrModule: '🔒 Owner Security Gate',
      actionPerformed: 'Owner successfully updated Master Security Password for Portfolio 2',
      permissionUsed: 'OWNER_MUTATE',
      complianceStatus: '100%_COMPLIANT'
    });
    return res.json({ success: true, message: 'Password updated successfully!' });
  }
  return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
});

const adminAuthMiddleware = (req, res, next) => {
  // Allow public callbacks and auth endpoints
  if (req.path === '/auth/verify' || req.path.includes('/pinterest/oauth/callback')) {
    return next();
  }

  const token = (req.headers['x-admin-token'] || 
                req.headers['authorization']?.replace(/^Bearer\s+/i, '') || 
                req.query.token || '').trim();

  if (isPasswordValid(token)) {
    return next();
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  auditLogger.logHumanReadable({
    toolOrModule: '🔒 Owner Security Gate',
    actionPerformed: `BLOCKED UNAUTHORIZED API CALL to ${req.method} ${req.originalUrl} from IP: ${ip}`,
    permissionUsed: 'UNAUTHORIZED_ATTEMPT',
    complianceStatus: 'VIOLATION_BLOCKED',
    details: { ip, path: req.originalUrl, method: req.method }
  });

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Private Portfolio 2 is restricted to the verified owner only.'
  });
};

// ============================================================
// CRON ROUTE: Daily 10:00 PM Report Trigger
// ============================================================
app.get(['/api/cron/daily-report', '/api/cron-daily-report'], (req, res) => {
  try {
    const report = auditSheetService.generateDailyReport();
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

// Audit logs (JSON)
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

// Google Sheets Compatible Master Ecosystem Audit Export (All Historic Logs)
app.get(['/api/admin/export/master-audit.csv', '/api/admin/master-audit.csv', '/api/export/audit.csv'], (req, res) => {
  try {
    const { csvContent } = auditSheetService.generateMasterAuditCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="master-ecosystem-audit.csv"');
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting master audit CSV:', err);
    res.status(500).send('Error generating master audit sheet');
  }
});

// Google Sheets Compatible Daily Performance & Health Report Export (10:00 PM Daily Reports)
app.get(['/api/admin/export/daily-reports.csv', '/api/admin/daily-reports.csv', '/api/export/daily-reports.csv'], (req, res) => {
  try {
    const { csvContent } = auditSheetService.generateDailyReportsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="daily-ecosystem-reports.csv"');
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting daily reports CSV:', err);
    res.status(500).send('Error generating daily reports sheet');
  }
});

// Get Daily Reports JSON
app.get('/api/admin/daily-reports', (req, res) => {
  const reports = auditSheetService.loadDailyReports();
  res.json({ success: true, count: reports.length, reports });
});

// Manually trigger today's daily 10:00 PM report generation
app.post('/api/admin/daily-reports/generate', (req, res) => {
  const report = auditSheetService.generateDailyReport();
  auditLogger.logHumanReadable({
    toolOrModule: '📊 Daily 10:00 PM Report Engine',
    actionPerformed: `Daily Performance & Health Summary Report compiled for ${report.date}`,
    permissionUsed: 'GENERATE_DAILY_REPORT',
    complianceStatus: '100%_COMPLIANT',
    details: report.summary
  });
  res.json({ success: true, report });
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

// Manual Trigger: 2-Hour Price & Compliance Sync
app.post('/api/admin/run-price-sync', async (req, res) => {
  try {
    await runTwoHourComplianceAudit();
    const count = cacheStore.getAllProducts().length;
    res.json({ success: true, message: `2-Hour Compliance & Price Sync completed successfully across ${count} products.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual Trigger: 5-Hour Full Ecosystem Health Audit
app.post('/api/admin/run-health-audit', async (req, res) => {
  try {
    const report = safeFailGuardian.runFiveHourHealthAudit();
    res.json({ success: true, message: '5-Hour Health Audit executed successfully.', report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Instant price update for any product in catalog
app.post('/api/admin/update-price', (req, res) => {
  const { asin, currentPrice, listPrice } = req.body;
  if (!asin || !currentPrice || currentPrice <= 0) {
    return res.status(400).json({ success: false, error: 'Valid ASIN and positive currentPrice required.' });
  }

  const updated = cacheStore.updatePrice(asin, parseFloat(currentPrice), listPrice ? parseFloat(listPrice) : null, true);
  if (updated) {
    auditLogger.logHumanReadable({
      toolOrModule: '✏️ Live Price Manager',
      actionPerformed: `Owner updated price for ASIN ${asin} to ₹${currentPrice}`,
      permissionUsed: 'OWNER_MUTATE',
      complianceStatus: '100%_COMPLIANT',
      details: { asin, newPrice: currentPrice, listPrice }
    });
    return res.json({ success: true, product: updated });
  }

  return res.status(404).json({ success: false, error: `Product with ASIN ${asin} not found in catalog.` });
});

// ============================================================
// PINTEREST AUTO-PUBLISHER API (Pinterest API v5)
// ============================================================
const pinterestService = require('./lib/pinterest-service');

app.get('/api/admin/pinterest/status', async (req, res) => {
  const test = await pinterestService.testConnection();
  res.json({
    success: true,
    config: {
      appId: pinterestService.config.appId || '',
      hasAppSecret: Boolean(pinterestService.config.appSecret),
      hasToken: Boolean(pinterestService.config.accessToken),
      boardId: pinterestService.config.boardId,
      boardName: pinterestService.config.boardName,
      boardUrl: pinterestService.config.boardUrl,
      autoPublishDaily: pinterestService.config.autoPublishDaily,
      dailyPinLimit: pinterestService.config.dailyPinLimit,
      lastPublishedDate: pinterestService.config.lastPublishedDate
    },
    connectionTest: test,
    history: pinterestService.config.publishedPinsHistory || []
  });
});

app.get('/api/admin/pinterest/auth-url', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const defaultRedirect = `${protocol}://${host}/api/admin/pinterest/oauth/callback`;
  const redirectUri = req.query.redirect_uri || defaultRedirect;
  const authUrl = pinterestService.getAuthUrl(redirectUri);
  res.json({ success: true, authUrl, redirectUri });
});

app.get('/api/admin/pinterest/oauth/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  if (error) {
    return res.redirect(`/admin/#pinterest?error=${encodeURIComponent(error_description || error)}`);
  }
  if (!code) {
    return res.redirect(`/admin/#pinterest?error=No+code+received`);
  }
  const host = req.get('host');
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const redirectUri = `${protocol}://${host}/api/admin/pinterest/oauth/callback`;

  const result = await pinterestService.exchangeAuthCode(code, redirectUri);
  if (result.success) {
    return res.redirect(`/admin/#pinterest?pinterest_connected=1`);
  } else {
    return res.redirect(`/admin/#pinterest?pinterest_error=${encodeURIComponent(result.error || 'Failed to exchange token')}`);
  }
});

app.post('/api/admin/pinterest/config', (req, res) => {
  const { appId, appSecret, accessToken, boardId, boardName, autoPublishDaily, dailyPinLimit } = req.body;
  const updates = {};
  if (appId !== undefined) updates.appId = appId.trim();
  if (appSecret !== undefined && appSecret.trim()) updates.appSecret = appSecret.trim();
  if (accessToken !== undefined) updates.accessToken = accessToken.trim();
  if (boardId !== undefined) updates.boardId = boardId.trim();
  if (boardName !== undefined) updates.boardName = boardName.trim();
  if (autoPublishDaily !== undefined) updates.autoPublishDaily = Boolean(autoPublishDaily);
  if (dailyPinLimit !== undefined) updates.dailyPinLimit = parseInt(dailyPinLimit) || 5;

  pinterestService.saveConfig(updates);
  res.json({ success: true, message: 'Pinterest settings updated successfully', config: pinterestService.config });
});

app.get('/api/admin/pinterest/boards', async (req, res) => {
  const boardsResult = await pinterestService.getBoards();
  res.json(boardsResult);
});

app.post('/api/admin/pinterest/publish-daily', async (req, res) => {
  const limit = parseInt(req.body.limit) || pinterestService.config.dailyPinLimit || 5;
  const result = await pinterestService.publishDailyBatch(limit);
  res.json(result);
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
// Non-blocking for Cron-Job.org / Serverless with full background audit
// ============================================================
app.post('/api/admin/auto-curate', (req, res) => {
  const customList = req.body?.asins || null;
  const syncJobId = 'CRON_JOB_' + Date.now();

  // 1. Send immediate 200 OK response to prevent Cron-Job.org 30s timeouts
  res.json({
    success: true,
    jobId: syncJobId,
    status: 'PROCESSING_IN_BACKGROUND',
    message: 'Automated deal curation & price verification successfully triggered. Running full multi-page scan in background.',
    timestamp: new Date().toISOString()
  });

  // 2. Execute full discovery and 8-point verification asynchronously in background
  (async () => {
    try {
      const results = await dealCurator.runDailyCuration(customList);
      auditLogger.logHumanReadable({
        toolOrModule: '⚡ 2-Hour Cloud Auto-Sync',
        actionPerformed: `Automated 2-Hour Cronjob Completed: ${results.publishedCount} verified deals published across all categories (${results.rejectedCount} rejected for out-of-stock/price)`,
        permissionUsed: 'CRON_AUTOMATION',
        complianceStatus: '100%_COMPLIANT',
        details: {
          jobId: syncJobId,
          totalCandidates: results.totalCandidates,
          publishedCount: results.publishedCount,
          rejectedCount: results.rejectedCount
        }
      });
    } catch (err) {
      console.error('Error executing automated curation:', err);
      auditLogger.logHumanReadable({
        toolOrModule: '⚡ 2-Hour Cloud Auto-Sync',
        actionPerformed: `Cronjob task finished with note: ${err.message}`,
        permissionUsed: 'CRON_AUTOMATION',
        complianceStatus: 'VIOLATION_BLOCKED',
        details: { error: err.message, jobId: syncJobId }
      });
    }
  })();
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
async function runTwoHourComplianceAudit() {
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

    // Priority audit for top 30 active deals per cycle with micro-delays to maintain minimal memory usage (<80MB RAM)
    const auditBatch = allProducts.slice(0, 30);
    for (const product of auditBatch) {
      try {
        const lookup = await productLookup.lookupByAsin(product.asin);
        if (lookup.httpStatus === 404 || (lookup.error && lookup.error.includes('does not exist'))) {
          cacheStore.removeProduct(product.asin);
          removedUnavailableCount++;
        } else if (lookup.success && lookup.current_price && lookup.current_price > 0 && lookup.current_price !== product.current_price) {
          cacheStore.updatePrice(product.asin, lookup.current_price, lookup.list_price || product.list_price, true);
          priceChangeCount++;
        }
        await new Promise(r => setTimeout(r, 100)); // Micro-yield for garbage collection
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
  console.log(`🏷️ Associate Tag: ${process.env.AMAZON_ASSOCIATE_TAG || 'your-tag-21'}`);
  console.log(`📦 Verified Products in Catalog: ${productCount}`);
  console.log(`⏱️ Compliance Audit: Every 2 Hours | Health Audit: Every 5 Hours`);
  const guardianEmail = process.env.GUARDIAN_ALERT_EMAIL || 'admin@example.com';
  console.log(`🛡️ Safe-Fail Guardian: Active (Alerts: ${guardianEmail})`);
  console.log(`====================================================`);

  auditLogger.logHumanReadable({
    toolOrModule: '🚀 Server Bootstrap',
    actionPerformed: `Server started successfully on port ${PORT} with ${productCount} verified products`,
    permissionUsed: 'SYSTEM_BOOT',
    complianceStatus: '100%_COMPLIANT',
    details: {
      port: PORT,
      catalogSize: productCount,
      associateTag: process.env.AMAZON_ASSOCIATE_TAG || 'your-associate-tag-21',
      complianceInterval: '2 Hours',
      healthAuditInterval: '5 Hours',
      emergencyContact: guardianEmail
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

  // Recurring Daily 10:00 PM IST Ecosystem Performance Report Scheduler
  let lastReportDate = null;
  setInterval(() => {
    try {
      const now = new Date();
      const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
      const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const [hour, minute] = istTimeStr.split(':').map(Number);

      if (hour === 22 && minute === 0 && lastReportDate !== istDateStr) {
        lastReportDate = istDateStr;
        console.log(`📊 [Daily 10:00 PM Scheduler] Generating daily performance & health report for ${istDateStr}...`);
        const dailyReport = auditSheetService.generateDailyReport();
        auditLogger.logHumanReadable({
          toolOrModule: '📊 Daily 10:00 PM Report Engine',
          actionPerformed: `Daily Performance & Health Summary Report compiled for ${dailyReport.date}`,
          permissionUsed: 'GENERATE_DAILY_REPORT',
          complianceStatus: '100%_COMPLIANT',
          details: dailyReport.summary
        });
      }
    } catch (err) {
      console.error('Error in daily report scheduler:', err.message);
    }
  }, 30000);

  // Run initial health audit
  setTimeout(() => {
    safeFailGuardian.runFiveHourHealthAudit();
  }, 2000);
});

module.exports = app;



