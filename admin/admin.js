/**
 * Portfolio 2 Private Admin & Supervisor Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanels = {
    overview: document.getElementById('tabOverview'),
    audit: document.getElementById('tabAudit'),
    deltas: document.getElementById('tabDeltas'),
    validator: document.getElementById('tabValidator'),
    addProduct: document.getElementById('tabAddProduct')
  };

  const pageTitle = document.getElementById('pageTitle');
  const syncNowBtn = document.getElementById('syncNowBtn');

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

  // Audit Log Elements
  const auditLogStream = document.getElementById('auditLogStream');
  const logFilterBtns = document.querySelectorAll('.log-filter-btn');

  // Deltas Elements
  const deltasTableBody = document.getElementById('deltasTableBody');

  // Validator Elements
  const valAsinInput = document.getElementById('valAsinInput');
  const valUrlInput = document.getElementById('valUrlInput');
  const validateBtn = document.getElementById('validateBtn');
  const validationResult = document.getElementById('validationResult');

  // Add Product Form
  const addProductForm = document.getElementById('addProductForm');
  const addProductResult = document.getElementById('addProductResult');

  // Tab Switching
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

      if (targetTab === 'overview') pageTitle.textContent = 'System Overview & Live Health';
      if (targetTab === 'audit') { pageTitle.textContent = 'Live Audit Trail'; loadAuditLogs(); }
      if (targetTab === 'deltas') { pageTitle.textContent = 'Price Delta Movement History'; loadPriceDeltas(); }
      if (targetTab === 'validator') pageTitle.textContent = '1-to-1 Link & ASIN Validator';
      if (targetTab === 'addProduct') pageTitle.textContent = 'Add Curated Product';
    });
  });

  // Fetch Metrics & Products
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

  // Populate ASIN Selector for Simulator
  const populateAsinSelector = async () => {
    try {
      const res = await fetch('/api/products?category=all&ratingTier=all_acceptable');
      const data = await res.json();
      if (data.success && data.data) {
        simAsinSelect.innerHTML = data.data.map(p => `
          <option value="${p.asin}">${p.asin} - ${p.brand}: ${p.title.substr(0, 45)}... (₹${p.current_price})</option>
        `).join('');
      }
    } catch (err) {
      console.error('Failed to load ASIN list:', err);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async (filterType = null) => {
    try {
      let url = '/api/admin/audit-logs?limit=50';
      if (filterType && filterType !== 'all') {
        url += `&type=${filterType}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.logs) {
        if (data.logs.length === 0) {
          auditLogStream.innerHTML = `<div class="empty-log">No logs found for this filter.</div>`;
          return;
        }

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

  // Log Filter Buttons
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
        if (data.deltas.length === 0) {
          deltasTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No price deltas recorded yet. Run a simulator test or sync to generate movements.</td></tr>`;
          return;
        }

        deltasTableBody.innerHTML = data.deltas.map(d => {
          const time = new Date(d.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
          const isDrop = d.diff < 0;
          const diffColor = isDrop ? 'var(--col-emerald)' : 'var(--col-red)';

          return `
            <tr>
              <td><code>${time}</code></td>
              <td><strong>${d.asin}</strong></td>
              <td>${d.title ? d.title.substr(0, 40) + '...' : 'Product'}</td>
              <td>₹${new Intl.NumberFormat('en-IN').format(d.oldPrice)}</td>
              <td><strong>₹${new Intl.NumberFormat('en-IN').format(d.newPrice)}</strong></td>
              <td style="color: ${diffColor}; font-weight: 700;">${d.diff > 0 ? '+' : ''}₹${d.diff}</td>
              <td style="color: ${diffColor}; font-weight: 700;">${d.percentChange}%</td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('Failed to load deltas:', err);
    }
  };

  // Run Manual 24h Sync
  syncNowBtn.addEventListener('click', async () => {
    syncNowBtn.disabled = true;
    syncNowBtn.innerHTML = `⏳ Running Sync...`;

    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert(`✅ 24h Sync Completed! Verified & audited ${json.processed} products.`);
        loadMetrics();
        loadAuditLogs();
        populateAsinSelector();
      }
    } catch (err) {
      alert('❌ Sync failed: ' + err.message);
    } finally {
      syncNowBtn.disabled = false;
      syncNowBtn.innerHTML = `<span class="sync-icon">🔄</span> Run 24h Sync Audit`;
    }
  });

  // Price Change Simulator
  simPriceBtn.addEventListener('click', async () => {
    const asin = simAsinSelect.value;
    const newPrice = simNewPrice.value;

    if (!asin || !newPrice) {
      alert('Please select an ASIN and enter a valid test price.');
      return;
    }

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
        simResult.textContent = `✅ Price updated successfully for ${asin} to ₹${newPrice}. Delta recorded and visible in Audit Log!`;
        loadMetrics();
        populateAsinSelector();
      } else {
        simResult.style.color = 'var(--col-red)';
        simResult.textContent = `❌ Error: ${data.error}`;
      }
    } catch (err) {
      simResult.style.display = 'block';
      simResult.style.color = 'var(--col-red)';
      simResult.textContent = `❌ Error: ${err.message}`;
    }
  });

  // 1-to-1 Validator Tool
  validateBtn.addEventListener('click', async () => {
    const asin = valAsinInput.value.trim();
    const url = valUrlInput.value.trim();

    if (!asin || !url) {
      alert('Please provide both ASIN and Affiliate URL.');
      return;
    }

    try {
      const res = await fetch('/api/admin/verify-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin, url })
      });
      const data = await res.json();

      validationResult.style.display = 'block';
      if (data.success && data.result.valid) {
        validationResult.style.color = 'var(--col-emerald)';
        validationResult.textContent = `✅ VERIFIED: Valid 1-to-1 Match for ASIN ${asin} with Associate Tag '${data.result.tag}'. Destination is safe & compliant.`;
      } else {
        validationResult.style.color = 'var(--col-red)';
        validationResult.textContent = `❌ VALIDATION FAILED: ${data.result.reason}`;
      }
    } catch (err) {
      validationResult.style.display = 'block';
      validationResult.style.color = 'var(--col-red)';
      validationResult.textContent = `❌ Error: ${err.message}`;
    }
  });

  // Add Product Form Submit
  addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productPayload = {
      asin: document.getElementById('pAsin').value.trim().toUpperCase(),
      brand: document.getElementById('pBrand').value.trim(),
      title: document.getElementById('pTitle').value.trim(),
      category: document.getElementById('pCategory').value,
      category_label: document.getElementById('pCategory').options[document.getElementById('pCategory').selectedIndex].text,
      rating: parseFloat(document.getElementById('pRating').value),
      current_price: parseFloat(document.getElementById('pCurrentPrice').value),
      list_price: document.getElementById('pListPrice').value ? parseFloat(document.getElementById('pListPrice').value) : null,
      currency: 'INR',
      image_url: document.getElementById('pImage').value.trim(),
      affiliate_url: document.getElementById('pAffUrl').value.trim(),
      is_daily_deal: document.getElementById('pIsDailyDeal').checked,
      in_stock: true,
      tags: [document.getElementById('pCategory').value]
    };

    try {
      const res = await fetch('/api/admin/add-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload)
      });
      const data = await res.json();

      addProductResult.style.display = 'block';
      if (data.success) {
        addProductResult.style.color = 'var(--col-emerald)';
        addProductResult.textContent = `✅ PRODUCT APPROVED & ADDED: ${productPayload.asin} is now live in Public Portfolio 1!`;
        addProductForm.reset();
        loadMetrics();
        populateAsinSelector();
      } else {
        addProductResult.style.color = 'var(--col-red)';
        addProductResult.textContent = `❌ REJECTED BY GOVERNANCE ENGINE:\n` + (data.errors ? data.errors.join('\n') : data.error);
      }
    } catch (err) {
      addProductResult.style.display = 'block';
      addProductResult.style.color = 'var(--col-red)';
      addProductResult.textContent = `❌ Error: ${err.message}`;
    }
  });

  // Auto-fill Affiliate URL helper when typing ASIN in Add Product form
  document.getElementById('pAsin').addEventListener('input', (e) => {
    const asinVal = e.target.value.trim().toUpperCase();
    if (asinVal.length === 10) {
      document.getElementById('pAffUrl').value = `https://www.amazon.in/dp/${asinVal}?tag=nagireddy0e-21`;
    }
  });

  // Initial Data Load
  loadMetrics();
  populateAsinSelector();
  loadAuditLogs();
});
