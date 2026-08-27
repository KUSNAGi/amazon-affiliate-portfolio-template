const ProductLookup = require('../lib/product-lookup');

async function testMultiple() {
  const asins = ['B00SAMPLE1', 'B00SAMPLE2', 'B00SAMPLE3'];
  for (const asin of asins) {
    console.log(`\nLooking up ${asin}...`);
    const res = await ProductLookup.lookupByAsin(asin);
    console.log('Result:', JSON.stringify(res, null, 2));
  }
}

testMultiple();
