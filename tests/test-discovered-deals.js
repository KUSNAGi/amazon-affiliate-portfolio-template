const ProductLookup = require('../lib/product-lookup');

async function testDiscoveredDeals() {
  const asins = ['B089GM5Q7Z', 'B08947GQCM', 'B0CPSLYDRD', 'B0BTD4S4XF', 'B00F159RIK'];
  for (const asin of asins) {
    console.log(`\n--- Looking up ${asin} from Today's Deals ---`);
    const res = await ProductLookup.lookupByAsin(asin);
    console.log({
      asin: res.asin,
      title: res.title,
      category: res.category_label,
      rating: res.rating,
      price: res.current_price,
      list_price: res.list_price,
      affiliate_url: res.affiliate_url,
      has_image: Boolean(res.image_url)
    });
  }
}

testDiscoveredDeals();
