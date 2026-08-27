const ProductLookup = require('../lib/product-lookup');

async function testDiscoveredDeals() {
  const asins = ['B00SAMPLE1', 'B00SAMPLE2', 'B00SAMPLE3'];
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
