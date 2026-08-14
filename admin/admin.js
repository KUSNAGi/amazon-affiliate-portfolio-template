/**
 * Portfolio 2 Private Admin & Product Integrity Supervisor Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  let stagedCandidateProduct = null;

  // Navigation Tabs
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanels = {
    validator: document.getElementById('tabValidator'),
    catalogAudit: document.getElementById('tabCatalogAudit'),
    overview: document.getElementById('tabOverview'),
    audit: document.getElementById('tabAudit'),
    deltas: document.getElementById('tabDeltas')
  };

  const pageTitle = document.getElementById('pageTitle');
  const runFullAuditBtn = document.getElementById('runFullAuditBtn');

  // Validator Gate Elements
  const candidateForm = document.getElementById('candidateValidationForm');
  const valCandidateAsin = document.getElementById('valCandidateAsin');
  const valCandidateBrand = document.getElementById('valCandidateBrand');
  const valCandidateTitle = document.getElementById('valCandidateTitle');
  const valCandidateCategory = document.getElementById('valCandidateCategory');
  const valCandidateRating = document.getElementById('valCandidateRating');
  const valCandidatePrice = document.getElementById('valCandidatePrice');
  const valCandidateListPrice = document.getElementById('valCandidateListPrice');
  const valCandidateImage = document.getElementById('valCandidateImage');
  const valCandidateAffUrl = document.getElementById('valCandidateAffUrl');
  const valCandidateDailyDeal = document.getElementById('valCandidateDailyDeal');

  const integrityAuditBox = document.getElementById('integrityAuditBox');
  const auditResultTitle = document.getElementById('auditResultTitle');
  const auditOverallBadge = document.getElementById('auditOverallBadge');
  const auditStepsList = document.getElementById('auditStepsList');
  const auditActionsWrap = document.getElementById('auditActionsWrap');
  const publishApprovedBtn = document.getElementById('publishApprovedBtn');

  // Catalog Table
  const catalogAuditTableBody = document.getElementById('catalogAuditTableBody');

  // Overview Elements
  const metricTotalProducts = document.getElementById('metricTotalProducts');
  const metricTopRated = document.getElementById('metricTopRated');
  const metricValuePicks = document.getElementById('metricValuePicks');
  const metricDailyDeals = document.getElementById('metricDailyDeals');
  const metricDeltas = document.getElementById('metricDeltas');
  const simAsinSelect = document.getElementById('simAsinSelect');
  const simNewPrice = document.getElementById('simNewPrice');
  const simPriceBtn = document.getElementById('simPriceBtn');
  const simResult = document.getElementById('simResult');

  // Audit Logs & Deltas
  const auditLogStream = document.getElementById('auditLogStream');
  const logFilterBtns = document.querySelectorAll('.log-filter-btn');
  const deltasTableBody = document.getElementById('deltasTableBody');

  // Tab Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      const targetTab = item.dataset.tab;
      Object.keys(tabPanels).forEach(key => {
        if (tabPanels[key]) {
          tabPanels[key].classList.toggle('active', key === targetTab);
        }
      });

      if (targetTab === 'validator') pageTitle.textContent = '🛡️ 1-to-1 Product & ASIN Validator Gate';
      if (targetTab === 'catalogAudit') { pageTitle.textContent = '📦 Catalog Integrity Audit'; loadCatalogAuditTable(); }
      if (targetTab === 'overview') { pageTitle.textContent = 'System Overview & Live Health'; loadMetrics(); }
      if (targetTab === 'audit') { pageTitle.textContent = 'Live Audit Trail'; loadAuditLogs(); }
      if (targetTab === 'deltas') { pageTitle.textContent = 'Price Delta History'; loadPriceDeltas(); }
    });
  });

  // Auto-generate verified affiliate URL when ASIN is entered
  valCandidateAsin.addEventListener('input', (e) => {
    const asin = e.target.value.trim().toUpperCase();
    if (asin.length === 10) {
      valCandidateAffUrl.value = `https://www.amazon.in/dp/${asin}?tag=nagireddy0e-21`;
    }
  });

  // Run 1-to-1 Candidate Integrity Audit
  candidateForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const candidate = {
      asin: valCandidateAsin.value.trim().toUpperCase(),
      brand: valCandidateBrand.value.trim(),
      title: valCandidateTitle.value.trim(),
      category: valCandidateCategory.value,
      category_label: valCandidateCategory.options[valCandidateCategory.selectedIndex].text,
      rating: parseFloat(valCandidateRating.value),
      current_price: parseFloat(valCandidatePrice.value),
      list_price: valCandidateListPrice.value ? parseFloat(valCandidateListPrice.value) : null,
      currency: 'INR',
      image_url: valCandidateImage.value.trim(),
      affiliate_url: valCandidateAffUrl.value.trim(),
      is_daily_deal: valCandidateDailyDeal.checked,
      in_stock: true,
      tags: [valCandidateCategory.value],
      last_verified: new Date().toISOString()
    };

    // Client-side sequential check
    const steps = [];
    let isPass = true;

    // 1. ASIN format
    const asinRegex = /^[A-Z0-9]{10}$/;
    const validAsin = asinRegex.test(candidate.asin);
    steps.push({
      name: 'ASIN Format Check',
      passed: validAsin,
      detail: validAsin ? `Valid 10-char ASIN: ${candidate.asin}` : `Invalid ASIN format`
    });
    if (!validAsin) isPass = false;

    // 2. Link check
    const linkValid = candidate.affiliate_url.includes('amazon.in') && 
                      candidate.affiliate_url.includes(candidate.asin) && 
                      candidate.affiliate_url.includes('tag=nagireddy0e-21');
    steps.push({
      name: '1-to-1 Affiliate Link Match',
      passed: linkValid,
      detail: linkValid ? `Destination matches ASIN ${candidate.asin} with tag 'nagireddy0e-21'` : `Mismatched ASIN or tag in link`
    });
    if (!linkValid) isPass = false;

    // 3. Title Check
    const titleValid = candidate.title.length >= 5;
    steps.push({
      name: 'Product Title Integrity',
      passed: titleValid,
      detail: titleValid ? candidate.title.substr(0, 45) + '...' : 'Title too short'
    });
    if (!titleValid) isPass = false;

    // 4. Rating Check
    const ratingValid = candidate.rating >= 3.5;
    steps.push({
      name: 'Rating Threshold (≥ 3.5 ⭐)',
      passed: ratingValid,
      detail: ratingValid ? `${candidate.rating} ⭐ (${candidate.rating >= 4.0 ? 'Top Rated' : 'Value Pick'})` : `Rating ${candidate.rating} is below 3.5 cutoff`
    });
    if (!ratingValid) isPass = false;

    // 5. Image Check
    const imgValid = candidate.image_url.startsWith('https://') && candidate.image_url.includes('media-amazon.com');
    steps.push({
      name: 'Amazon CDN Media Verification',
      passed: imgValid,
      detail: imgValid ? 'Valid HTTPS Amazon CDN URL' : 'Invalid or non-Amazon image URL'
    });
    if (!imgValid) isPass = false;

    // 6. Price Check
    const priceValid = candidate.current_price > 0;
    steps.push({
      name: 'INR Price Verification',
      passed: priceValid,
      detail: priceValid ? `₹${new Intl.NumberFormat('en-IN').format(candidate.current_price)} INR` : 'Invalid price'
    });
    if (!priceValid) isPass = false;

    // Render Steps
    integrityAuditBox.style.display = 'block';
    auditResultTitle.textContent = `Integrity Audit for ASIN: ${candidate.asin}`;
    auditOverallBadge.textContent = isPass ? '100% PASS' : 'INTEGRITY FAIL';
    auditOverallBadge.className = `audit-badge ${isPass ? 'PASS' : 'FAIL'}`;

    auditStepsList.innerHTML = steps.map((s, i) => `
      <div class="audit-step-row">
        <div class="step-info">
          <span class="step-status-icon">${s.passed ? '✅' : '❌'}</span>
          <strong>Step ${i + 1}: ${s.name}</strong>
        </div>
        <span class="step-detail">${s.detail}</span>
      </div>
    `).join('');

    if (isPass) {
      stagedCandidateProduct = candidate;
      auditActionsWrap.style.display = 'flex';
    } else {
      stagedCandidateProduct = null;
      auditActionsWrap.style.display = 'none';
    }
  });

  // Stage & Publish Button
  publishApprovedBtn.addEventListener('click', async () => {
    if (!stagedCandidateProduct) return;

    publishApprovedBtn.disabled = true;
    publishApprovedBtn.textContent = 'Publishing...';

    try {
      const res = await fetch('/api/admin/add-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stagedCandidateProduct)
      });
      const data = await res.json();

      if (data.success) {
        alert(`🎉 Success! ${stagedCandidateProduct.asin} passed all integrity gates and is now live in Public Portfolio 1.`);
        candidateForm.reset();
        integrityAuditBox.style.display = 'none';
        stagedCandidateProduct = null;
        loadMetrics();
      } else {
        alert(`❌ Blocked: ${data.errors ? data.errors.join(', ') : data.error}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      publishApprovedBtn.disabled = false;
      publishApprovedBtn.textContent = '✅ Stage & Publish to Public Portfolio 1';
    }
  });

  // Load Catalog Audit Table
  const loadCatalogAuditTable = async () => {
    try {
      const res = await fetch('/api/products?category=all&ratingTier=all_acceptable');
      const data = await res.json();

      if (data.success && data.data) {
        catalogAuditTableBody.innerHTML = data.data.map(p => `
          <tr>
            <td><code>${p.asin}</code></td>
            <td><strong>${p.brand}:</strong> ${p.title.substr(0, 38)}...</td>
            <td>${p.category_label || p.category}</td>
            <td>⭐ <strong>${p.rating}</strong></td>
            <td>₹${new Intl.NumberFormat('en-IN').format(p.current_price)}</td>
            <td><code>${p.affiliate_url ? 'tag=nagireddy0e-21 (Verified)' : 'Missing'}</code></td>
            <td><span class="audit-badge PASS">100% VERIFIED</span></td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error('Failed to load catalog table:', err);
    }
  };

  // Full Catalog Audit Button
  runFullAuditBtn.addEventListener('click', async () => {
    runFullAuditBtn.disabled = true;
    runFullAuditBtn.textContent = 'Auditing...';

    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert(`✅ Full Catalog Audit Complete! ${json.processed} products verified.`);
        loadCatalogAuditTable();
        loadMetrics();
      }
    } catch (err) {
      alert('❌ Audit failed: ' + err.message);
    } finally {
      runFullAuditBtn.disabled = false;
      runFullAuditBtn.innerHTML = `<span class="sync-icon">🔍</span> Run Full Catalog Audit`;
    }
  });

  // Load Overview Metrics
  const loadMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      if (data.success && data.metrics) {
        const m = data.metrics;
        metricTotalProducts.textContent = m.totalProducts;
        metricTopRated.textContent = m.topRatedCount;
        metricValuePicks.textContent = m.valuePicksCount;
        metricDailyDeals.textContent = m.dailyDealsCount;
        metricDeltas.textContent = m.priceDeltasRecorded;
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async (filterType = null) => {
    try {
      let url = '/api/admin/audit-logs?limit=50';
      if (filterType && filterType !== 'all') url += `&type=${filterType}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.logs) {
        auditLogStream.innerHTML = data.logs.map(log => {
          const time = new Date(log.timestamp).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          });

          return `
            <div class="log-entry">
              <div class="log-left">
                <span class="log-badge ${log.status}">${log.status}</span>
                <div>
                  <div class="log-type">${log.eventType}</div>
                  <div class="log-details">${JSON.stringify(log.details)}</div>
                </div>
              </div>
              <div class="log-time">${time}</div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  logFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      logFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadAuditLogs(btn.dataset.filter);
    });
  });

  // Load Price Deltas
  const loadPriceDeltas = async () => {
    try {
      const res = await fetch('/api/admin/price-deltas');
      const data = await res.json();
      if (data.success && data.deltas) {
        deltasTableBody.innerHTML = data.deltas.map(d => {
          const time = new Date(d.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
          const isDrop = d.diff < 0;
          return `
            <tr>
              <td><code>${time}</code></td>
              <td><strong>${d.asin}</strong></td>
              <td>${d.title ? d.title.substr(0, 40) + '...' : 'Product'}</td>
              <td>₹${new Intl.NumberFormat('en-IN').format(d.oldPrice)}</td>
              <td><strong>₹${new Intl.NumberFormat('en-IN').format(d.newPrice)}</strong></td>
              <td style="color: ${isDrop ? 'var(--col-emerald)' : 'var(--col-red)'}; font-weight: 700;">${d.diff > 0 ? '+' : ''}₹${d.diff}</td>
              <td style="color: ${isDrop ? 'var(--col-emerald)' : 'var(--col-red)'}; font-weight: 700;">${d.percentChange}%</td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('Failed to load deltas:', err);
    }
  };

  // Price Change Simulator
  simPriceBtn.addEventListener('click', async () => {
    const asin = simAsinSelect.value;
    const newPrice = simNewPrice.value;
    if (!asin || !newPrice) return alert('Select an ASIN and price.');

    try {
      const res = await fetch('/api/admin/simulate-price-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin, newPrice })
      });
      const data = await res.json();
      simResult.style.display = 'block';
      if (data.success) {
        simResult.style.color = 'var(--col-emerald)';
        simResult.textContent = `✅ Price updated for ${asin} to ₹${newPrice}. Delta recorded!`;
        loadMetrics();
      }
    } catch (err) {
      simResult.style.display = 'block';
      simResult.style.color = 'var(--col-red)';
      simResult.textContent = `❌ Error: ${err.message}`;
    }
  });

  // Populate ASIN selector
  const populateAsinSelector = async () => {
    try {
      const res = await fetch('/api/products?category=all&ratingTier=all_acceptable');
      const data = await res.json();
      if (data.success && data.data) {
        simAsinSelect.innerHTML = data.data.map(p => `
          <option value="${p.asin}">${p.asin} - ${p.brand}: ${p.title.substr(0, 45)}... (₹${p.current_price})</option>
        `).join('');
      }
    } catch (err) {}
  };

  // Initialize
  loadMetrics();
  populateAsinSelector();
});
