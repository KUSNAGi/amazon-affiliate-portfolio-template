const fs = require('fs');
const html = fs.existsSync('tests/scratch-page.html') ? fs.readFileSync('tests/scratch-page.html', 'utf8') : '<html><title>Sample</title></html>';

// Title
const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
console.log('Title:', titleMatch ? titleMatch[1].trim() : 'none');

// Rating
const rMatch = html.match(/([0-9.]+)\s*out of 5 stars/i) || html.match(/a-star-[0-9-]+[^>]*>([0-9.]+) out of 5/i);
console.log('Rating:', rMatch ? rMatch[1] : 'none');

// Reviews
const revMatch = html.match(/id="acrCustomerReviewText"[^>]*>([\d,]+)/i) || html.match(/([\d,]+)\s*(?:global ratings|ratings)/i);
console.log('Reviews:', revMatch ? revMatch[1] : 'none');

// Price
const priceMatches = [...html.matchAll(/class="a-price-whole">([^<]+)/gi)];
console.log('Price wholes:', priceMatches.map(m => m[1]));

const offscreenPrices = [...html.matchAll(/class="a-offscreen">([^<]+)/gi)];
console.log('Offscreen prices:', offscreenPrices.slice(0, 10).map(m => m[1]));

// Brand
const brandM = html.match(/id="bylineInfo"[^>]*>[\s\S]*?(?:Visit the\s+|Brand:\s*)?([^<]+)/i)
            || html.match(/class="po-brand"[^>]*>[\s\S]*?class="po-break-word">([^<]+)/i);
console.log('Brand:', brandM ? brandM[1].trim() : 'none');
