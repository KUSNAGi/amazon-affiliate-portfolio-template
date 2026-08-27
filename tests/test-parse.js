async function testParse() {
  const res = await fetch('https://www.amazon.in/dp/B00SAMPLE1', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-IN,en;q=0.9'
    }
  });
  const html = await res.text();
  console.log('HTML Length:', html.length);
  
  // Rating match
  const ratingMatch = html.match(/class=["']a-icon-alt["']>([0-9.]+)\s*out of 5/i) || html.match(/([0-9.]+)\s*out of 5 stars/i);
  console.log('Rating:', ratingMatch ? ratingMatch[1] : 'none');
  
  // Reviews count
  const reviewsMatch = html.match(/id=["']acrCustomerReviewText["'][^>]*>([\d,]+)/i);
  console.log('Reviews:', reviewsMatch ? reviewsMatch[1] : 'none');
  
  // Price match
  const priceMatch = html.match(/class=["']a-price-whole["']>([\d,]+)/i) || html.match(/class=["']a-offscreen["']>[₹\s]*([\d,]+(?:\.\d+)?)/i);
  console.log('Price:', priceMatch ? priceMatch[1] : 'none');
  
  // Brand match
  const brandMatch = html.match(/id=["']bylineInfo["'][^>]*>[\s\S]*?(?:Visit the\s+|Brand:\s*)?([^<]+)/i);
  console.log('Brand:', brandMatch ? brandMatch[1].trim() : 'none');
}
testParse();
