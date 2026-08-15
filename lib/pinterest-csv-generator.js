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

function generatePinterestCsv(boardName = 'Best Deals on Amazon') {
  const products = cacheStore.getAllProducts().filter(p => p.in_stock && p.current_price > 0);
  
  const headers = ['Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords'];
  const rows = [headers.join(',')];

  for (const p of products) {
    const brand = p.brand ? p.brand.trim() : 'Amazon Choice';
    const priceStr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p.current_price);
    const discountStr = p.list_price && p.list_price > p.current_price 
      ? ` (${Math.round((p.list_price - p.current_price) / p.list_price * 100)}% OFF)`
      : '';

    // 1. Title (Clean & Catchy)
    let title = `${p.title || 'Amazon Deal'} - ${priceStr}${discountStr}`;
    if (title.length > 95) {
      title = title.substring(0, 92) + '...';
    }

    // 2. Media URL (Direct high-res Amazon CDN image)
    const mediaUrl = p.image_url || '';

    // 3. Pinterest Board
    const board = boardName;

    // 4. Thumbnail
    const thumbnail = '';

    // 5. Description (Engaging, authentic, with #ad)
    const categoryName = p.category_label || (p.category === 'gadgets_electronics' ? 'Electronics' : p.category === 'home_kitchen' ? 'Home & Kitchen' : 'Lifestyle');
    const desc = `${p.title} | Now only ${priceStr}${discountStr} on Amazon India! Rated ${p.rating}★ (${p.reviews_count || 100}+ reviews). Handpicked ${categoryName} deal. Tap to buy on Amazon! #ad #AmazonDeals #BestDeals #TodayDeals #${brand.replace(/[^a-zA-Z0-9]/g, '')}`;

    // 6. 1-to-1 Canonical Affiliate Link
    const link = p.affiliate_url || `https://www.amazon.in/dp/${p.asin}?tag=nagireddy0e-21`;

    // 7. Publish date (leave empty for bulk creation)
    const publishDate = '';

    // 8. Keywords
    const keywords = `Amazon Deals, ${categoryName}, ${brand}, Today Deals, Online Shopping`;

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
  }

  const csvContent = rows.join('\n');
  
  // Save to root directory
  const rootCsvPath = path.join(__dirname, '..', 'pinterest-bulk-pins.csv');
  fs.writeFileSync(rootCsvPath, csvContent, 'utf8');

  // Save to public downloads directory
  const downloadsDir = path.join(__dirname, '..', 'public', 'downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }
  const publicCsvPath = path.join(downloadsDir, 'pinterest-bulk-pins.csv');
  fs.writeFileSync(publicCsvPath, csvContent, 'utf8');

  console.log(`✅ Generated Pinterest CSV with ${products.length} pins for board "${boardName}" at:`);
  console.log(` - ${rootCsvPath}`);
  console.log(` - ${publicCsvPath}`);

  return { csvContent, count: products.length, rootCsvPath, publicCsvPath };
}

module.exports = { generatePinterestCsv };

if (require.main === module) {
  generatePinterestCsv('Best Deals on Amazon');
}
