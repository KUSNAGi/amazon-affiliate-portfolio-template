const crypto = require('crypto');

/**
 * Amazon Product Advertising API (PA-API v5) / Creator API Client
 * Implements AWS Signature Version 4 signing for Amazon.in endpoints.
 */
class AmazonCreatorAPI {
  constructor(config = {}) {
    this.accessKey = config.accessKey || process.env.AMAZON_ACCESS_KEY || '';
    this.secretKey = config.secretKey || process.env.AMAZON_SECRET_KEY || '';
    this.partnerTag = config.partnerTag || process.env.AMAZON_ASSOCIATE_TAG || 'nagireddy0e-21';
    this.host = config.host || process.env.AMAZON_HOST || 'webservices.amazon.in';
    this.region = config.region || process.env.AMAZON_REGION || 'eu-west-1';
    this.service = 'ProductAdvertisingAPI';
    this.marketplace = config.marketplace || process.env.AMAZON_MARKETPLACE || 'www.amazon.in';
  }

  isConfigured() {
    return Boolean(this.accessKey && this.secretKey && this.partnerTag);
  }

  _sha256(data) {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  _hmac(key, data) {
    return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
  }

  _getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = this._hmac('AWS4' + key, dateStamp);
    const kRegion = this._hmac(kDate, regionName);
    const kService = this._hmac(kRegion, serviceName);
    const kSigning = this._hmac(kService, 'aws4_request');
    return kSigning;
  }

  async _sendRequest(targetOperation, payload) {
    if (!this.isConfigured()) {
      return {
        isMock: true,
        success: false,
        error: 'Creator API credentials (Access Key / Secret Key) are not yet set in .env. Running in Curated Local Bridge mode.'
      };
    }

    const endpoint = `https://${this.host}/paapi5/${targetOperation.toLowerCase()}`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substr(0, 8);
    const requestPayload = JSON.stringify(payload);

    const canonicalUri = `/paapi5/${targetOperation.toLowerCase()}`;
    const canonicalQueryString = '';
    const canonicalHeaders = 
      `content-encoding:amz-1.0\n` +
      `content-type:application/json; charset=utf-8\n` +
      `host:${this.host}\n` +
      `x-amz-date:${amzDate}\n` +
      `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${targetOperation}\n`;
    
    const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
    const payloadHash = this._sha256(requestPayload);

    const canonicalRequest = 
      `POST\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    const stringToSign = 
      `${algorithm}\n${amzDate}\n${credentialScope}\n${this._sha256(canonicalRequest)}`;

    const signingKey = this._getSignatureKey(this.secretKey, dateStamp, this.region, this.service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

    const authorizationHeader = 
      `${algorithm} Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers = {
      'content-type': 'application/json; charset=utf-8',
      'content-encoding': 'amz-1.0',
      'x-amz-date': amzDate,
      'x-amz-target': `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${targetOperation}`,
      'Authorization': authorizationHeader,
      'Host': this.host
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: requestPayload
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: data.Errors ? data.Errors[0]?.Message : response.statusText,
          raw: data
        };
      }

      return {
        success: true,
        data: data
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Fetch items by ASIN list (up to 10 ASINs per call)
   */
  async getItems(itemIds, resources = [
    'ItemInfo.Title',
    'ItemInfo.Features',
    'ItemInfo.ProductInfo',
    'ItemInfo.Classifications',
    'Images.Primary.Large',
    'Images.Primary.Medium',
    'Offers.Listings.Price',
    'Offers.Listings.SavingBasis',
    'Offers.Listings.Availability.Message',
    'CustomerReviews.StarRating',
    'CustomerReviews.Count'
  ]) {
    const payload = {
      ItemIds: Array.isArray(itemIds) ? itemIds : [itemIds],
      ItemIdType: 'ASIN',
      Marketplace: this.marketplace,
      PartnerTag: this.partnerTag,
      PartnerType: 'Associates',
      Resources: resources
    };

    return await this._sendRequest('GetItems', payload);
  }

  /**
   * Search for products by keyword or category
   */
  async searchItems(keywords, searchIndex = 'All', itemCount = 10) {
    const payload = {
      Keywords: keywords,
      SearchIndex: searchIndex,
      ItemCount: Math.min(itemCount, 10),
      Marketplace: this.marketplace,
      PartnerTag: this.partnerTag,
      PartnerType: 'Associates',
      Resources: [
        'ItemInfo.Title',
        'ItemInfo.Classifications',
        'Images.Primary.Large',
        'Offers.Listings.Price',
        'CustomerReviews.StarRating',
        'CustomerReviews.Count'
      ]
    };

    return await this._sendRequest('SearchItems', payload);
  }
}

module.exports = AmazonCreatorAPI;
