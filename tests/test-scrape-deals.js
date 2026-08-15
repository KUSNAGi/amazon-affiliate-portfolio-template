async function run() {
  const urls = [
    'https://www.amazon.in/deals?ref_=nav_cs_gb&discounts-widget=%2522%257B%255C%2522state%255C%2522%253A%257B%255C%2522refinementFilters%255C%2522%253A%257B%255C%2522reviewRating%255C%2522%253A%255B%255C%25224%255C%2522%255D%257D%257D%252C%255C%2522version%255C%2522%253A1%257D%2522',
    'https://www.amazon.in/deals?ref_=nav_cs_gb',
    'https://www.amazon.in/gp/bestsellers/kitchen',
    'https://www.amazon.in/gp/bestsellers/electronics',
    'https://www.amazon.in/gp/movers-and-shakers'
  ];

  const asins = new Set();
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9,en-US;q=0.8,hi;q=0.7'
        }
      });
      if (res.ok) {
        const html = await res.text();
        const dpMatches = [...html.matchAll(/\/dp\/([A-Z0-9]{10})/g)];
        dpMatches.forEach(m => asins.add(m[1]));
        const asinAttr = [...html.matchAll(/data-asin=["']([A-Z0-9]{10})["']/g)];
        asinAttr.forEach(m => asins.add(m[1]));
      }
    } catch (e) {}
  }

  console.log('Total live unique deal ASINs discovered across all feeds:', asins.size);
}
run().catch(console.error);
