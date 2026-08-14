const ProductLookup = require('../lib/product-lookup');

async function testMultiple() {
  const asins = ['B097RJ867P', 'B0CHX1W1XY', 'B0863TXGM3'];
  for (const asin of asins) {
    console.log(`\nLooking up ${asin}...`);
    const res = await ProductLookup.lookupByAsin(asin);
    console.log('Result:', JSON.stringify(res, null, 2));
  }
}

testMultiple();
