/**
 * Portfolio 2 — Private Admin: 1-to-1 Validator & Supervisor Logic
 * 
 * Flow: Enter ASIN → Lookup on Amazon.in → Review → Complete details → Integrity Check → Publish
 */

document.addEventListener('DOMContentLoaded', () => {
  let lookupResult = null; // Stores the lookup data from Amazon.in

  // Nav
  const navItems = document.querySelectorAll('.nav-item');
  const tabs = {
    validator: document.getElementById('tabValidator'),
    catalog: document.getElementById('tabCatalog'),
    overview: document.getElementById('tabOverview'),
    audit: document.getElementById('tabAudit'),
    deltas: document.getElementById('tabDeltas')
  };
  const pageTitle = document.getElementById('pageTitle');
  const pageSub = document.getElementById('pageSub');

  // Validator Step 1
  const lookupAsin = document.getElementById('lookupAsin');
  const lookupBtn = document.getElementById('lookupBtn');
  const lookupStatus = document.getElementById('lookupStatus');

  // Validator Step 2
  const reviewPanel = document.getElementById('reviewPanel');
  const previewImage = document.getElementById('previewImage');
  const previewAsin = document.getElementById('previewAsin');
  const previewTitle = document.getElementById('previewTitle');
  const previewAffLink = document.getElementById('previewAffLink');
  const previewSource = document.getElementById('previewSource');

  const addBrand = document.getElementById('addBrand');
  const addCategory = document.getElementById('addCategory');
  const addRating = document.getElementById('addRating');
  const addReviews = document.getElementById('addReviews');
  const addPrice = document.getElementById('addPrice');
  const addListPrice = document.getElementById('addListPrice');
  const addDailyDeal = document.getElementById('addDailyDeal');
  const runIntegrityBtn = document.getElementById('runIntegrityBtn');

  // Validator Step 3
  const integrityPanel = document.getElementById('integrityPanel');
  const integrityBadge = document.getElementById('integrityBadge');
  const integritySteps = document.getElementById('integritySteps');
  const publishActions = document.getElementById('publishActions');
  const publishBtn = document.getElementById('publishBtn');

  // Catalog
  const catalogEmpty = document.getElementById('catalogEmpty');
  const catalogTable = document.getElementById('catalogTable');
  const catalogBody = document.getElementById('catalogBody');
  const catalogCount = document.getElementById('catalogCount');

  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const t = item.dataset.tab;
      Object.keys(tabs).forEach(k => { if (tabs[k]) tabs[k].classList.toggle('active', k === t); });

      if (t === 'validator') { pageTitle.textContent = '🛡️ 1-to-1 Product & ASIN Validator'; pageSub.textContent = 'Enter an ASIN → System looks it up on Amazon.in → You review → Confirm to publish'; }
      if (t === 'catalog') { pageTitle.textContent = '📦 Verified Catalog'; pageSub.textContent = 'All products that passed the 1-to-1 Validator and are live in Portfolio 1'; loadCatalog(); }
      if (t === 'overview') { pageTitle.textContent = '📊 System Overview'; pageSub.textContent = 'Live metrics and health status'; loadMetrics(); }
      if (t === 'audit') { pageTitle.textContent = '📜 Audit Trail'; pageSub.textContent = 'Complete log of all system actions'; loadAuditLogs(); }
      if (t === 'deltas') { pageTitle.textContent = '📉 Price Deltas'; pageSub.textContent = 'Historical price change records'; loadDeltas(); }
    });
  });

  // =============================================
  // STEP 1: ASIN Lookup on Amazon.in
  // =============================================
  lookupBtn.addEventListener('click', async () => {
    const asin = lookupAsin.value.trim().toUpperCase();

    if (!asin || asin.length !== 10) {
      lookupStatus.style.display = 'block';
      lookupStatus.className = 'lookup-status status-error';
      lookupStatus.textContent = '❌ Please enter a valid 10-character ASIN.';
      return;
    }

    // Reset previous state
    lookupResult = null;
    reviewPanel.style.display = 'none';
    integrityPanel.style.display = 'none';

    lookupBtn.disabled = true;
    lookupBtn.textContent = '🔄 Looking up on Amazon.in...';
    lookupStatus.style.display = 'block';
    lookupStatus.className = 'lookup-status status-loading';
    lookupStatus.textContent = `Looking up ASIN ${asin} on real Amazon.in product page...`;

    try {
      const res = await fetch('/api/admin/lookup-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin })
      });
      const data = await res.json();

      if (data.success) {
        lookupResult = data;
        lookupStatus.className = 'lookup-status status-success';
        lookupStatus.textContent = `✅ Product found on Amazon.in! Review the details below.`;

        // Populate Step 2
        previewAsin.textContent = `ASIN: ${data.asin}`;
        previewTitle.textContent = data.title;
        previewAffLink.href = data.affiliate_url;
        previewAffLink.textContent = data.affiliate_url;
        previewSource.textContent = `Source: ${data.source} | Looked up: ${new Date(data.looked_up_at).toLocaleString('en-IN')}`;

        if (data.image_url) {
          previewImage.src = data.image_url;
          previewImage.style.display = 'block';
        } else {
          previewImage.style.display = 'none';
        }

        reviewPanel.style.display = 'block';
        reviewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        lookupStatus.className = 'lookup-status status-error';
        lookupStatus.textContent = `❌ LOOKUP FAILED: ${data.error}`;
      }
    } catch (err) {
      lookupStatus.className = 'lookup-status status-error';
      lookupStatus.textContent = `❌ Network error: ${err.message}`;
    } finally {
      lookupBtn.disabled = false;
      lookupBtn.textContent = '🔍 Look Up on Amazon.in';
    }
  });

  // Allow Enter key to trigger lookup
  lookupAsin.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); lookupBtn.click(); }
  });

  // =============================================
  // STEP 2 → 3: Run Integrity Check
  // =============================================
  runIntegrityBtn.addEventListener('click', () => {
    if (!lookupResult) {
      alert('You must look up a product first (Step 1).');
      return;
    }

    const rating = parseFloat(addRating.value);
    const price = parseFloat(addPrice.value);
    const brand = addBrand.value.trim();

    if (!brand) { alert('Brand name is required.'); return; }
    if (isNaN(rating) || rating < 3.5) { alert('Rating must be at least 3.5.'); return; }
    if (isNaN(price) || price <= 0) { alert('A valid current price is required.'); return; }

    const asin = lookupResult.asin;
    const affiliateUrl = lookupResult.affiliate_url;
    const imageUrl = lookupResult.image_url;
    const title = lookupResult.title;

    // Run the 8-point sequential check
    const steps = [];
    let allPass = true;

    // 1. ASIN
    const asinOk = /^[A-Z0-9]{10}$/.test(asin);
    steps.push({ name: 'ASIN Format', passed: asinOk, detail: asinOk ? `Valid: ${asin}` : 'Invalid format' });
    if (!asinOk) allPass = false;

    // 2. Affiliate link
    const linkOk = affiliateUrl.includes('amazon.in') && affiliateUrl.includes(asin) && affiliateUrl.includes('tag=nagireddy0e-21');
    steps.push({ name: '1-to-1 Link & Tag Match', passed: linkOk, detail: linkOk ? `${asin} + tag=nagireddy0e-21 verified` : 'Link mismatch' });
    if (!linkOk) allPass = false;

    // 3. Title
    const titleOk = title && title.length >= 5;
    steps.push({ name: 'Product Title (from Amazon.in)', passed: titleOk, detail: titleOk ? title.substring(0, 50) + '...' : 'Missing or too short' });
    if (!titleOk) allPass = false;

    // 4. Brand
    const brandOk = brand.length >= 2;
    steps.push({ name: 'Brand Verification', passed: brandOk, detail: brandOk ? brand : 'Missing' });
    if (!brandOk) allPass = false;

    // 5. Rating gate
    const ratingOk = rating >= 3.5;
    steps.push({ name: 'Rating Gate (≥ 3.5)', passed: ratingOk, detail: ratingOk ? `${rating} ⭐ (${rating >= 4.0 ? 'Top Rated' : 'Value Pick'})` : `${rating} below 3.5 cutoff` });
    if (!ratingOk) allPass = false;

    // 6. Image
    const imgOk = imageUrl && imageUrl.startsWith('https://') && (imageUrl.includes('media-amazon.com') || imageUrl.includes('images-amazon.com'));
    steps.push({ name: 'Amazon CDN Image', passed: Boolean(imgOk), detail: imgOk ? 'Valid HTTPS Amazon CDN URL' : 'Invalid or missing image' });
    if (!imgOk) allPass = false;

    // 7. Price
    const priceOk = price > 0;
    steps.push({ name: 'Price (₹ INR)', passed: priceOk, detail: priceOk ? `₹${new Intl.NumberFormat('en-IN').format(price)}` : 'Invalid' });
    if (!priceOk) allPass = false;

    // 8. Lookup verified
    steps.push({ name: 'Amazon.in Lookup Verified', passed: true, detail: `Looked up at ${lookupResult.looked_up_at}` });

    // Render result
    integrityPanel.style.display = 'block';
    integrityBadge.textContent = allPass ? '100% PASS' : 'INTEGRITY FAIL';
    integrityBadge.className = `audit-badge ${allPass ? 'PASS' : 'FAIL'}`;

    integritySteps.innerHTML = steps.map((s, i) => `
      <div class="audit-step-row">
        <div class="step-info">
          <span class="step-status-icon">${s.passed ? '✅' : '❌'}</span>
          <strong>Step ${i + 1}: ${s.name}</strong>
        </div>
        <span class="step-detail">${s.detail}</span>
      </div>
    `).join('');

    publishActions.style.display = allPass ? 'block' : 'none';
    integrityPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // =============================================
  // STEP 3: Publish to Portfolio 1
  // =============================================
  publishBtn.addEventListener('click', async () => {
    if (!lookupResult) return;

    const categorySelect = addCategory;
    const categoryLabel = categorySelect.options[categorySelect.selectedIndex].text;

    const productData = {
      asin: lookupResult.asin,
      title: lookupResult.title,
      brand: addBrand.value.trim(),
      category: addCategory.value,
      category_label: categoryLabel,
      is_daily_deal: addDailyDeal.checked,
      current_price: parseFloat(addPrice.value),
      list_price: addListPrice.value ? parseFloat(addListPrice.value) : null,
      currency: 'INR',
      rating: parseFloat(addRating.value),
      reviews_count: addReviews.value ? parseInt(addReviews.value) : null,
      image_url: lookupResult.image_url,
      affiliate_url: lookupResult.affiliate_url,
      in_stock: true,
      tags: [addCategory.value],
      last_verified: new Date().toISOString(),
      lookup_verified: true
    };

    publishBtn.disabled = true;
    publishBtn.textContent = 'Publishing...';

    try {
      const res = await fetch('/api/admin/add-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      const data = await res.json();

      if (data.success) {
        alert(`✅ Published! ${lookupResult.asin} is now live in Public Portfolio 1.`);
        // Reset the entire form
        lookupResult = null;
        lookupAsin.value = '';
        lookupStatus.style.display = 'none';
        reviewPanel.style.display = 'none';
        integrityPanel.style.display = 'none';
        addBrand.value = '';
        addRating.value = '';
        addReviews.value = '';
        addPrice.value = '';
        addListPrice.value = '';
        addDailyDeal.checked = false;
      } else {
        alert(`❌ Blocked: ${data.errors ? data.errors.join(', ') : data.error}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = '✅ Publish to Public Portfolio 1';
    }
  });

  // =============================================
  // Catalog Tab
  // =============================================
  const loadCatalog = async () => {
    try {
      const res = await fetch('/api/products?category=all&ratingTier=all_acceptable');
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        catalogEmpty.style.display = 'none';
        catalogTable.style.display = 'table';
        catalogCount.textContent = `${data.data.length} product${data.data.length > 1 ? 's' : ''}`;
        catalogBody.innerHTML = data.data.map(p => `
          <tr>
            <td><img src="${p.image_url}" alt="${p.title}" style="width:50px;height:50px;object-fit:contain;border-radius:4px;" referrerpolicy="no-referrer"></td>
            <td><code>${p.asin}</code></td>
            <td title="${p.title}">${p.title.substring(0, 40)}...</td>
            <td>${p.category_label || p.category}</td>
            <td>⭐ ${p.rating}</td>
            <td>₹${new Intl.NumberFormat('en-IN').format(p.current_price)}</td>
            <td><span class="audit-badge PASS">VERIFIED</span></td>
          </tr>
        `).join('');
      } else {
        catalogEmpty.style.display = 'block';
        catalogTable.style.display = 'none';
        catalogCount.textContent = '0 products';
      }
    } catch (err) { console.error(err); }
  };

  // Metrics
  const loadMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      if (data.success && data.metrics) {
        document.getElementById('metricTotal').textContent = data.metrics.totalProducts;
        document.getElementById('metricTopRated').textContent = data.metrics.topRatedCount;
        document.getElementById('metricValuePicks').textContent = data.metrics.valuePicksCount;
        document.getElementById('metricDeals').textContent = data.metrics.dailyDealsCount;
      }
    } catch (err) { console.error(err); }
  };

  // Audit Logs
  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs?limit=50');
      const data = await res.json();
      if (data.success && data.logs) {
        document.getElementById('auditLogStream').innerHTML = data.logs.map(log => `
          <div class="log-entry">
            <div class="log-left">
              <span class="log-badge ${log.status}">${log.status}</span>
              <div>
                <div class="log-type">${log.eventType}</div>
                <div class="log-details">${JSON.stringify(log.details).substring(0, 120)}...</div>
              </div>
            </div>
            <div class="log-time">${new Date(log.timestamp).toLocaleTimeString('en-IN')}</div>
          </div>
        `).join('');
      }
    } catch (err) { console.error(err); }
  };

  // Price Deltas
  const loadDeltas = async () => {
    try {
      const res = await fetch('/api/admin/price-deltas');
      const data = await res.json();
      if (data.success && data.deltas) {
        document.getElementById('deltasBody').innerHTML = data.deltas.map(d => `
          <tr>
            <td><code>${new Date(d.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</code></td>
            <td>${d.asin}</td>
            <td>${d.title ? d.title.substring(0, 35) + '...' : '-'}</td>
            <td>₹${d.oldPrice}</td>
            <td>₹${d.newPrice}</td>
            <td style="color:${d.diff < 0 ? '#10b981' : '#ef4444'};font-weight:700">${d.diff > 0 ? '+' : ''}₹${d.diff}</td>
            <td style="color:${d.diff < 0 ? '#10b981' : '#ef4444'};font-weight:700">${d.percentChange}%</td>
          </tr>
        `).join('');
      }
    } catch (err) { console.error(err); }
  };

  // Init
  loadMetrics();
});
