async function test() {
  const res = await fetch('https://www.amazon.in/dp/B0DVC8FPVJ', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-IN,en;q=0.9,en-US;q=0.8,hi;q=0.7'
    }
  });
  const html = await res.text();
  console.log('HTML length:', html.length);
  console.log('Includes Currently unavailable:', html.includes('Currently unavailable'));
  console.log('Includes Currently Unavailable:', html.includes('Currently Unavailable'));
  console.log('Includes In stock:', html.includes('In stock'));
  console.log('Includes See All Buying Options:', html.includes('See All Buying Options'));
  console.log('Includes add-to-cart-button:', html.includes('id="add-to-cart-button"'));
  console.log('Includes buy-now-button:', html.includes('id="buy-now-button"'));
  
  const availMatch = html.match(/id=["']availability["'][^>]*>([\s\S]*?)<\/div>/i);
  console.log('Availability container HTML:', availMatch ? availMatch[1].replace(/\s+/g, ' ').trim() : 'none');

  const inStock = html.includes('id="add-to-cart-button"') || html.includes('id="buy-now-button"') || (availMatch && availMatch[1].includes('In stock'));
  console.log('Calculated inStock:', inStock);
}
test().catch(console.error);
