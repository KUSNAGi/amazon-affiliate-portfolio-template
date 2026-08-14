async function checkDealsPage() {
  try {
    const res = await fetch('https://www.amazon.in/deals?ref_=nav_cs_gb', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NKiaX-Affiliate-Validator/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9'
      }
    });
    console.log('Status:', res.status);
    const html = await res.text();
    console.log('Length:', html.length);

    // Look for ASINs in deal cards or data attributes
    const asinMatches = [...html.matchAll(/\/dp\/([A-Z0-9]{10})/g)];
    const uniqueAsins = [...new Set(asinMatches.map(m => m[1]))];
    console.log('Found DP ASINs on Deals page:', uniqueAsins.length, uniqueAsins.slice(0, 15));

    // Look for data-asin attributes
    const dataAsins = [...html.matchAll(/data-asin=["']([A-Z0-9]{10})["']/g)];
    const uniqueDataAsins = [...new Set(dataAsins.map(m => m[1]))];
    console.log('Found data-asin on Deals page:', uniqueDataAsins.length, uniqueDataAsins.slice(0, 15));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkDealsPage();
