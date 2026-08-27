/**
 * Amazon Creators API v3.x Client (OAuth 2.0 Login with Amazon)
 * Supports Creators API client credentials authentication and PA-API catalog resolution.
 */
class AmazonCreatorAPI {
  constructor(config = {}) {
    this.clientId = config.clientId || process.env.AMAZON_CLIENT_ID || '';
    this.clientSecret = config.clientSecret || process.env.AMAZON_CLIENT_SECRET || '';
    this.partnerTag = config.partnerTag || process.env.AMAZON_ASSOCIATE_TAG || 'your-tag-21';
    this.region = config.region || process.env.AMAZON_REGION || 'eu'; // 'eu' for India/UK/EU
    this.marketplace = config.marketplace || process.env.AMAZON_MARKETPLACE || 'www.amazon.in';
    
    this.tokenEndpoint = this.region === 'eu' 
      ? 'https://api.amazon.co.uk/auth/o2/token' 
      : 'https://api.amazon.com/auth/o2/token';
      
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret && this.partnerTag);
  }

  /**
   * Request or reuse OAuth2 Access Token
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.isConfigured()) {
      throw new Error('Creators API credentials (Client ID or Client Secret) are missing.');
    }

    try {
      const payload = {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'creatorsapi::default'
      };

      const res = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error_description || data.error || 'Failed to authenticate with Amazon OAuth');
      }

      this.accessToken = data.access_token;
      // Expire 60 seconds early to avoid race conditions
      const expiresInSec = (data.expires_in || 3600) - 60;
      this.tokenExpiry = new Date(Date.now() + expiresInSec * 1000);

      return this.accessToken;
    } catch (err) {
      // Fallback attempt to NA endpoint if EU endpoint failed
      if (this.tokenEndpoint.includes('.co.uk')) {
        try {
          const resNA = await fetch('https://api.amazon.com/auth/o2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grant_type: 'client_credentials',
              client_id: this.clientId,
              client_secret: this.clientSecret,
              scope: 'creatorsapi::default'
            })
          });
          const dataNA = await resNA.json();
          if (resNA.ok) {
            this.accessToken = dataNA.access_token;
            this.tokenExpiry = new Date(Date.now() + ((dataNA.expires_in || 3600) - 60) * 1000);
            return this.accessToken;
          }
        } catch (e) {
          // ignore fallback
        }
      }
      throw err;
    }
  }

  /**
   * Fetch item details by ASIN
   */
  async getItems(asins) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Creators API not configured.' };
    }

    try {
      const token = await this.getAccessToken();
      const asinList = Array.isArray(asins) ? asins : [asins];

      const endpoint = `https://webservices.amazon.in/paapi5/getitems`;
      const body = {
        ItemIds: asinList,
        ItemIdType: 'ASIN',
        Marketplace: this.marketplace,
        PartnerTag: this.partnerTag,
        PartnerType: 'Associates',
        Resources: [
          'ItemInfo.Title',
          'ItemInfo.Features',
          'ItemInfo.ProductInfo',
          'ItemInfo.Classifications',
          'Images.Primary.Large',
          'Offers.Listings.Price',
          'CustomerReviews.StarRating',
          'CustomerReviews.Count'
        ]
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
          'Host': 'webservices.amazon.in'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.Errors?.[0]?.Message || res.statusText, raw: data };
      }

      return { success: true, data: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = AmazonCreatorAPI;
