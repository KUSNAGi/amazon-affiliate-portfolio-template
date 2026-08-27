const cacheStore = require('./cache-store');

const RSS_TEMPLATES = [
  (title, priceStr, discountStr, rating, reviews, brand) => 
    `⚡ Top Deal: ${title} | Now only ${priceStr}${discountStr} on Amazon India! Rated ${rating}★ (${reviews}+ reviews). Tap to view on Amazon! #ad #AmazonDeals #BestDeals #${brand}`,
  (title, priceStr, discountStr, rating, reviews, brand) => 
    `🔥 Bestseller: ${title}. Grab yours for ${priceStr}${discountStr} on Amazon India (${rating}★ rating). Tap to buy! #ad #AmazonFinds #MustHave #${brand}`,
  (title, priceStr, discountStr, rating, reviews, brand) => 
    `📉 Price Drop: ${title} is on sale for ${priceStr}${discountStr} on Amazon. Top rated at ${rating}★. Tap to shop! #ad #PriceDrop #DealsOfTheDay #${brand}`,
  (title, priceStr, discountStr, rating, reviews, brand) => 
    `✨ Handpicked Pick: ${title} | Available now for ${priceStr}${discountStr} on Amazon India (${rating}★). #ad #SmartShopping #${brand}`
];

function generatePinterestRssFeed(boardName = 'Best Deals on Amazon') {
  const products = cacheStore.getFilteredProducts({ sort: 'rating' }).slice(0, 50);
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
  const now = new Date().toUTCString();

  const itemsXml = products.map((p, idx) => {
    const rawTitle = (p.title || 'Amazon Deal').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const priceStr = `₹${p.current_price}`;
    const discountStr = p.list_price && p.list_price > p.current_price 
      ? ` (${Math.round((p.list_price - p.current_price) / p.list_price * 100)}% OFF)`
      : '';
    const brandClean = (p.brand || 'AmazonDeals').replace(/[^a-zA-Z0-9]/g, '') || 'AmazonDeals';
    const rating = p.rating || 4.3;
    const reviews = p.reviews_count || 500;

    const templateFn = RSS_TEMPLATES[idx % RSS_TEMPLATES.length];
    const desc = templateFn(rawTitle, priceStr, discountStr, rating, reviews, brandClean);

    const link = `${siteUrl}/deal/${p.asin}`;
    const imageUrl = (p.image_url || '').replace(/&/g, '&amp;');
    const pubDate = p.last_verified ? new Date(p.last_verified).toUTCString() : now;

    return `    <item>
      <title>${rawTitle} - ${priceStr}${discountStr}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${siteUrl}/deal/${p.asin}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${desc}]]></description>
      <enclosure url="${imageUrl}" type="image/jpeg" length="0" />
      <media:content url="${imageUrl}" medium="image" xmlns:media="http://search.yahoo.com/mrss/" />
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Curated Deals Hub — Best Deals on Amazon</title>
    <link>${siteUrl}</link>
    <description>Handpicked, high-rated daily deals from Amazon.in with verified pricing.</description>
    <language>en-IN</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteUrl}/api/feed/pinterest-deals.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;
}

module.exports = { generatePinterestRssFeed };
