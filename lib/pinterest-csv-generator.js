const fs = require('fs');
const path = require('path');
const cacheStore = require('./cache-store');

function escapeCsvField(field) {
  if (field === null || field === undefined) return '';
  const str = String(field).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// 6 Diverse Algorithmic Copy Templates to Prevent Pinterest Spam Throttling
const COPY_TEMPLATES = [
  // Template 1: Deal Highlight & Savings Focus
  (p, priceStr, discountStr, categoryName, brandClean) => ({
    titlePrefix: '⚡ Top Deal: ',
    desc: `Looking for top savings? ${p.title} is now available for ${priceStr}${discountStr} on Amazon India! Rated ${p.rating}★ (${p.reviews_count || 500}+ verified ratings). Tap to grab this deal on Amazon! #ad #AmazonDeals #BestDeals #${brandClean} #OnlineShopping`,
    keywords: `Amazon Deals, ${categoryName}, ${brandClean}, Top Offers, Deals India`
  }),
  // Template 2: Top-Rated Customer Favorite
  (p, priceStr, discountStr, categoryName, brandClean) => ({
    titlePrefix: '🔥 Bestseller: ',
    desc: `Customer favorite in ${categoryName}: ${p.title}. Score yours for ${priceStr}${discountStr} on Amazon India. Rated ${p.rating}★ with ${p.reviews_count || 1000}+ reviews. Tap to view on Amazon! #ad #AmazonFinds #MustHave #${brandClean} #AmazonIndia`,
    keywords: `Best ${categoryName}, ${brandClean}, Amazon Finds, Top Rated, Online Deals`
  }),
  // Template 3: Limited-Time Price Drop Alert
  (p, priceStr, discountStr, categoryName, brandClean) => ({
    titlePrefix: '📉 Price Drop: ',
    desc: `Price Drop Alert! ${p.title} is on sale for only ${priceStr}${discountStr} on Amazon India. Highly rated at ${p.rating}★. Check out this ${categoryName} deal today! #ad #PriceDrop #DealsOfTheDay #${brandClean} #ShoppingDeals`,
    keywords: `Price Drop, ${categoryName}, ${brandClean}, Bargains, Amazon Sale`
  }),
  // Template 4: Expert Handpicked Recommendation
  (p, priceStr, discountStr, categoryName, brandClean) => ({
    titlePrefix: '✨ Handpicked: ',
    desc: `Handpicked recommendation: ${p.title} | Now ${priceStr}${discountStr} on Amazon. Verified quality, ${p.rating}★ rating, and fast delivery. Tap to shop on Amazon! #ad #SmartShopping #${brandClean} #AmazonFavorites #BestBuys`,
    keywords: `Smart Shopping, ${categoryName}, ${brandClean}, Handpicked Deals, Best Buys`
  }),
  // Template 5: Must-Have Upgrade
  (p, priceStr, discountStr, categoryName, brandClean) => ({
    titlePrefix: '🌟 Upgrade: ',
    desc: `Upgrade your daily routine with ${p.title}! Available on Amazon India for ${priceStr}${discountStr} (${p.rating}★ rating). Don't miss out, tap to explore! #ad #AmazonShopping #${brandClean} #QualityPicks #DealAlert`,
    keywords: `Amazon Shopping, ${categoryName}, ${brandClean}, Top Picks, Deal Alert`
  }),
  // Template 6: Trending Daily Pick
  (p, priceStr, discountStr, categoryName, brandClean) => ({
    titlePrefix: '🎯 Daily Pick: ',
    desc: `Today's top ${categoryName} pick: ${p.title} at ${priceStr}${discountStr} on Amazon India. Trusted by thousands (${p.rating}★). Tap to buy on Amazon now! #ad #DailyDeals #${brandClean} #AmazonIndia #BestDeals`,
    keywords: `Daily Deals, ${categoryName}, ${brandClean}, Trending Products, Buy Online`
  })
];

function generatePinterestCsv(boardName = 'Best Deals on Amazon') {
  const products = cacheStore.getAllProducts().filter(p => p.in_stock && p.current_price > 0);
  
  const headers = ['Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords'];
  const rows = [headers.join(',')];

  products.forEach((p, idx) => {
    const brand = p.brand ? p.brand.trim() : 'Amazon Choice';
    const brandClean = brand.replace(/[^a-zA-Z0-9]/g, '') || 'AmazonDeals';
    const priceStr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p.current_price);
    const discountStr = p.list_price && p.list_price > p.current_price 
      ? ` (${Math.round((p.list_price - p.current_price) / p.list_price * 100)}% OFF)`
      : '';
    const categoryName = p.category_label || (p.category === 'gadgets_electronics' ? 'Electronics' : p.category === 'home_kitchen' ? 'Home & Kitchen' : 'Lifestyle');

    // Cycle through copy templates deterministically to ensure unique varied copy
    const templateFn = COPY_TEMPLATES[idx % COPY_TEMPLATES.length];
    const { titlePrefix, desc, keywords } = templateFn(p, priceStr, discountStr, categoryName, brandClean);

    // 1. Title (Clean, Catchy, Prefixed)
    let title = `${titlePrefix}${p.title || 'Amazon Deal'} - ${priceStr}${discountStr}`;
    if (title.length > 98) {
      title = title.substring(0, 95) + '...';
    }

    // 2. Media URL (Direct high-res Amazon CDN image)
    const mediaUrl = p.image_url || '';

    // 3. Pinterest Board
    const board = boardName;

    // 4. Thumbnail
    const thumbnail = '';

    // 6. 1-to-1 Canonical Affiliate Link
    const link = p.affiliate_url || `https://www.amazon.in/dp/${p.asin}?tag=${process.env.AMAZON_ASSOCIATE_TAG || 'your-tag-21'}`;

    // 7. Publish date
    const publishDate = '';

    rows.push([
      escapeCsvField(title),
      escapeCsvField(mediaUrl),
      escapeCsvField(board),
      escapeCsvField(thumbnail),
      escapeCsvField(desc),
      escapeCsvField(link),
      escapeCsvField(publishDate),
      escapeCsvField(keywords)
    ].join(','));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  
  // Safe disk write (skipped gracefully on read-only serverless environments)
  try {
    const rootCsvPath = path.join(__dirname, '..', 'pinterest-bulk-pins.csv');
    fs.writeFileSync(rootCsvPath, csvContent, 'utf8');

    const downloadsDir = path.join(__dirname, '..', 'public', 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    const publicCsvPath = path.join(downloadsDir, 'pinterest-bulk-pins.csv');
    fs.writeFileSync(publicCsvPath, csvContent, 'utf8');
  } catch (e) {
    // Read-only filesystem on Vercel lambda — ignore write error
  }

  return { csvContent, count: products.length };
}

module.exports = { generatePinterestCsv };

if (require.main === module) {
  generatePinterestCsv('Best Deals on Amazon');
}
