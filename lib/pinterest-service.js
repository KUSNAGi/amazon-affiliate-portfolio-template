const fs = require('fs');
const path = require('path');
const auditLogger = require('./audit-logger');
const cacheStore = require('./cache-store');

const PINTEREST_CONFIG_FILE = path.join(__dirname, '..', 'data', 'pinterest-config.json');

class PinterestService {
  constructor() {
    this.config = this._loadConfig();
  }

  _loadConfig() {
    try {
      if (fs.existsSync(PINTEREST_CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(PINTEREST_CONFIG_FILE, 'utf8'));
      }
    } catch (e) {}
    return {
      appId: process.env.PINTEREST_APP_ID || '',
      appSecret: process.env.PINTEREST_APP_SECRET || '',
      accessToken: process.env.PINTEREST_ACCESS_TOKEN || '',
      refreshToken: '',
      boardId: '',
      boardName: 'Best Deals on Amazon',
      boardUrl: 'https://www.pinterest.com/your-brand/best-deals-on-amazon/',
      autoPublishDaily: false,
      dailyPinLimit: 5,
      lastPublishedDate: null,
      publishedPinsHistory: []
    };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      fs.writeFileSync(PINTEREST_CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save Pinterest config:', e.message);
    }
  }

  /**
   * Generate Pinterest OAuth 2.0 authorization URL
   */
  getAuthUrl(redirectUri) {
    const appId = this.config.appId || process.env.PINTEREST_APP_ID || '';
    const scopes = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read';
    return `https://www.pinterest.com/oauth/?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
  }

  /**
   * Exchange OAuth 2.0 code for Access Token & Refresh Token
   */
  async exchangeAuthCode(code, redirectUri, appSecret = this.config.appSecret) {
    const appId = this.config.appId || process.env.PINTEREST_APP_ID || '';
    const secret = appSecret || this.config.appSecret;

    if (!appId || !secret) {
      return { success: false, error: 'Missing Pinterest App ID or App Secret Key.' };
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${appId}:${secret}`).toString('base64');
      const bodyParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code.trim(),
        redirect_uri: redirectUri.trim()
      });

      const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
      });

      const data = await res.json();
      if (res.ok && data.access_token) {
        this.saveConfig({
          accessToken: data.access_token,
          refreshToken: data.refresh_token || this.config.refreshToken || '',
          appSecret: secret
        });

        // Test connection immediately to cache username
        const testRes = await this.testConnection(data.access_token);
        
        // Auto-discover boards
        const boardsRes = await this.getBoards(data.access_token);
        let matchedBoard = null;
        if (boardsRes.success && boardsRes.boards) {
          matchedBoard = boardsRes.boards.find(b => 
            b.name.toLowerCase() === (this.config.boardName || 'best deals on amazon').toLowerCase()
          ) || boardsRes.boards[0];
          if (matchedBoard) {
            this.saveConfig({ boardId: matchedBoard.id, boardName: matchedBoard.name });
          }
        }

        auditLogger.log('PINTEREST_OAUTH_CONNECTED', {
          username: testRes.username,
          boardId: this.config.boardId,
          boardName: this.config.boardName
        }, 'SUCCESS');

        return {
          success: true,
          accessToken: data.access_token,
          user: testRes,
          board: matchedBoard
        };
      } else {
        return {
          success: false,
          status: res.status,
          error: data.message || data.error_description || JSON.stringify(data)
        };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Test current access token against Pinterest API v5
   */
  async testConnection(token = this.config.accessToken) {
    if (!token) return { success: false, error: 'No access token configured.' };

    try {
      const res = await fetch('https://api.pinterest.com/v5/user_account', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok && data.username) {
        return {
          success: true,
          username: data.username,
          accountType: data.account_type,
          profileImage: data.profile_image
        };
      } else {
        return {
          success: false,
          status: res.status,
          error: data.message || 'Authentication failed. Ensure token is generated with pins:write and boards:read scopes.'
        };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch all user boards to find or verify the target board ID
   */
  async getBoards(token = this.config.accessToken) {
    try {
      const res = await fetch('https://api.pinterest.com/v5/boards', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        return { success: true, boards: data.items };
      }
      return { success: false, error: data.message || 'Failed to fetch boards.' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Publish a single verified deal to Pinterest
   */
  async publishPin(product, boardId = this.config.boardId, token = this.config.accessToken) {
    if (!token) throw new Error('Missing Pinterest Access Token');
    if (!boardId) throw new Error('Missing target Board ID');

    // Build Pinterest-compliant payload
    const title = (product.title || '').substring(0, 95);
    const discount = product.list_price && product.list_price > product.current_price
      ? Math.round(((product.list_price - product.current_price) / product.list_price) * 100)
      : null;

    const discountText = discount ? ` (${discount}% OFF)` : '';
    const ratingText = product.rating ? ` Rated ${product.rating}★` : '';
    const description = `${title} | Now only ₹${product.current_price}${discountText} on Amazon India!${ratingText}. Tap to view deal on Amazon! #ad #AmazonDeals #TodayDeals`;

    const payload = {
      board_id: boardId,
      title: title,
      description: description.substring(0, 490),
      link: product.affiliate_url,
      media_source: {
        source_type: 'image_url',
        url: product.image_url
      }
    };

    const res = await fetch('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok && data.id) {
      const pinRecord = {
        pinId: data.id,
        asin: product.asin,
        title: product.title,
        price: product.current_price,
        affiliate_url: product.affiliate_url,
        publishedAt: new Date().toISOString(),
        pinterestLink: `https://www.pinterest.com/pin/${data.id}/`
      };

      this.config.publishedPinsHistory = [pinRecord, ...(this.config.publishedPinsHistory || [])].slice(0, 100);
      this.saveConfig(this.config);

      auditLogger.log('PINTEREST_PIN_PUBLISHED', {
        pinId: data.id,
        asin: product.asin,
        title: product.title,
        price: product.current_price
      }, 'SUCCESS');

      return { success: true, pin: pinRecord };
    } else {
      const isTrialPending = res.status === 403 || (data.message && String(data.message).includes('Trial access'));
      auditLogger.log('PINTEREST_PUBLISHER_STATUS', {
        asin: product.asin,
        status: res.status,
        note: isTrialPending
          ? 'Pinterest REST API pending Standard Access approval; claimed domain RSS feed is actively publishing.'
          : (data.message || 'Failed to create pin')
      }, isTrialPending ? 'INFO' : 'FAIL');

      return {
        success: false,
        status: res.status,
        pendingStandardAccess: isTrialPending,
        error: isTrialPending
          ? 'Pinterest Standard Access upgrade is pending approval. Claimed domain RSS feed auto-publisher is active.'
          : (data.message || 'Failed to create pin')
      };
    }
  }

  /**
   * Publish daily batch of top verified deals
   */
  async publishDailyBatch(limit = 5) {
    const products = cacheStore.getFilteredProducts({ sort: 'rating' });
    if (!products || products.length === 0) {
      return { success: false, error: 'No verified products available in catalog' };
    }

    // Filter out already published ASINs in recent history
    const publishedAsins = new Set((this.config.publishedPinsHistory || []).map(p => p.asin));
    const candidates = products.filter(p => !publishedAsins.has(p.asin)).slice(0, limit);

    const results = [];
    for (const prod of (candidates.length ? candidates : products.slice(0, limit))) {
      try {
        const res = await this.publishPin(prod);
        results.push(res);
        // Throttle 2s between pin creations
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        results.push({ success: false, asin: prod.asin, error: err.message });
      }
    }

    this.config.lastPublishedDate = new Date().toISOString();
    this.saveConfig(this.config);
    return { success: true, publishedCount: results.filter(r => r.success).length, results };
  }
}

module.exports = new PinterestService();
