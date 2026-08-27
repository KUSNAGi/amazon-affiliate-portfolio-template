/**
 * Portfolio 2 — Private Admin: 1-to-1 Validator & Supervisor Logic
 * 
 * Flow: Enter ASIN → Lookup on Amazon.in → Review → Complete details → Integrity Check → Publish
 */

document.addEventListener('DOMContentLoaded', () => {
  const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  let lookupResult = null; // Stores the lookup data from Amazon.in

  // Security Authentication Elements
  const adminAuthOverlay = document.getElementById('adminAuthOverlay');
  const adminLayout = document.getElementById('adminLayout');
  const adminAuthForm = document.getElementById('adminAuthForm');
  const adminSecretInput = document.getElementById('adminSecretInput');
  const authStatusMsg = document.getElementById('authStatusMsg');
  const lockDashboardBtn = document.getElementById('lockDashboardBtn');

  let currentAdminToken = sessionStorage.getItem('affiliate_admin_token') || localStorage.getItem('affiliate_admin_token');

  const adminFetch = async (url, options = {}) => {
    options.headers = {
      ...(options.headers || {}),
      'x-admin-token': currentAdminToken || ''
    };
    const response = await fetch(url, options);
    if (response.status === 401 || response.status === 403) {
      lockDashboard();
    }
    return response;
  };

  const unlockDashboard = () => {
    if (adminAuthOverlay) adminAuthOverlay.style.display = 'none';
    if (adminLayout) adminLayout.style.display = 'grid';
    checkSystemStatus();
    loadMetrics();
    loadAuditLogs();
  };

  const lockDashboard = () => {
    currentAdminToken = null;
    sessionStorage.removeItem('affiliate_admin_token');
    localStorage.removeItem('affiliate_admin_token');
    if (adminAuthOverlay) adminAuthOverlay.style.display = 'flex';
    if (adminLayout) adminLayout.style.display = 'none';
    if (adminSecretInput) {
      adminSecretInput.value = '';
      adminSecretInput.focus();
    }
  };

  if (lockDashboardBtn) {
    lockDashboardBtn.addEventListener('click', () => {
      lockDashboard();
    });
  }

  const togglePasswordVisibilityBtn = document.getElementById('togglePasswordVisibilityBtn');
  if (togglePasswordVisibilityBtn && adminSecretInput) {
    togglePasswordVisibilityBtn.addEventListener('click', () => {
      if (adminSecretInput.type === 'password') {
        adminSecretInput.type = 'text';
        togglePasswordVisibilityBtn.textContent = '🙈';
      } else {
        adminSecretInput.type = 'password';
        togglePasswordVisibilityBtn.textContent = '👁️';
      }
    });
  }

  if (adminAuthForm) {
    adminAuthForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const enteredToken = (adminSecretInput.value || '').trim();
      if (!enteredToken) {
        if (authStatusMsg) {
          authStatusMsg.textContent = 'Please enter your Master Security Key.';
          authStatusMsg.style.display = 'block';
        }
        return;
      }

      const submitBtn = document.getElementById('adminAuthSubmitBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '🔄 Verifying Access...';
      }

      if (authStatusMsg) authStatusMsg.style.display = 'none';

      try {
        const res = await fetch('/api/admin/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: enteredToken })
        });
        const data = await res.json();

        if (data.success && data.authenticated) {
          currentAdminToken = enteredToken;
          sessionStorage.setItem('affiliate_admin_token', enteredToken);
          localStorage.setItem('affiliate_admin_token', enteredToken);
          unlockDashboard();
        } else {
          if (authStatusMsg) {
            authStatusMsg.textContent = data.error || 'Access Denied: Invalid Security Key.';
            authStatusMsg.style.display = 'block';
          }
        }
      } catch (err) {
        if (authStatusMsg) {
          authStatusMsg.textContent = 'Server verification error. Please try again.';
          authStatusMsg.style.display = 'block';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🔓 Unlock Private Portfolio 2';
        }
      }
    });
  }

  // Initial Auth Verification
  const verifyInitialAuth = async () => {
    if (currentAdminToken) {
      try {
        const res = await fetch('/api/admin/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: currentAdminToken })
        });
        const data = await res.json();
        if (data.success && data.authenticated) {
          unlockDashboard();
          return;
        }
      } catch (e) {}
    }
    lockDashboard();
  };

  verifyInitialAuth();

  // Nav
  const navItems = document.querySelectorAll('.nav-item');
  const tabs = {
    validator: document.getElementById('tabValidator'),
    catalog: document.getElementById('tabCatalog'),
    overview: document.getElementById('tabOverview'),
    audit: document.getElementById('tabAudit'),
    deltas: document.getElementById('tabDeltas'),
    pinterest: document.getElementById('tabPinterest'),
    feedback: document.getElementById('tabFeedback')
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
      if (t === 'pinterest') { pageTitle.textContent = '📌 Pinterest Auto-Publisher Engine'; pageSub.textContent = 'Manage automated daily Pin publishing directly to your Pinterest Board'; loadPinterestStatus(); }
      if (t === 'feedback') { pageTitle.textContent = '💬 Customer Reports & Feedback'; pageSub.textContent = 'Community submissions from Public Portfolio 1 for owner review'; loadFeedbacks(); }
    });
  });

  // =============================================
  // AUTOMATED CURATION (1-Click Pipeline)
  // =============================================
  const autoCurateTopBtn = document.getElementById('autoCurateTopBtn');
  if (autoCurateTopBtn) {
    autoCurateTopBtn.addEventListener('click', async () => {
      autoCurateTopBtn.disabled = true;
      autoCurateTopBtn.textContent = '🔄 Running Automated Curation...';
      try {
        const res = await adminFetch('/api/admin/auto-curate', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          const detailMsg = data.data?.publishedCount !== undefined
            ? `Verified & Published: ${data.data.publishedCount} products.`
            : `Automated curation and deal discovery started in the background!`;
          alert(`⚡ Curation Started!\n\n${detailMsg}\n\nReview the live progress and audit logs in Portfolio 2.`);
          setTimeout(() => {
            loadMetrics();
            loadCatalog();
            loadAuditLogs();
          }, 1500);
        } else {
          alert(`❌ Curation failed: ${data.error || 'Unknown error'}`);
        }
      } catch (err) {
        alert(`❌ Error: ${err.message}`);
      } finally {
        autoCurateTopBtn.disabled = false;
        autoCurateTopBtn.textContent = '⚡ 1-Click Auto-Curate Deals';
      }
    });
  }

  const runPriceSyncBtn = document.getElementById('runPriceSyncBtn');
  if (runPriceSyncBtn) {
    runPriceSyncBtn.addEventListener('click', async () => {
      runPriceSyncBtn.disabled = true;
      runPriceSyncBtn.textContent = '🔄 Running Price Sync...';
      try {
        const res = await adminFetch('/api/admin/run-price-sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert(`✅ Price Sync Complete!\n\n${data.message}`);
          loadCatalog();
          loadDeltas();
          loadAuditLogs();
        } else {
          alert(`❌ Price Sync Error: ${data.error || 'Unknown'}`);
        }
      } catch (err) {
        alert(`❌ Error: ${err.message}`);
      } finally {
        runPriceSyncBtn.disabled = false;
        runPriceSyncBtn.textContent = '🔄 2-Hour Price Sync';
      }
    });
  }

  const runHealthAuditBtn = document.getElementById('runHealthAuditBtn');
  if (runHealthAuditBtn) {
    runHealthAuditBtn.addEventListener('click', async () => {
      runHealthAuditBtn.disabled = true;
      runHealthAuditBtn.textContent = '🛡️ Running Health Audit...';
      try {
        const res = await adminFetch('/api/admin/run-health-audit', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert(`✅ 5-Hour Health Audit Complete!\n\nStatus: ${data.report?.status || 'HEALTHY'}\nCatalog Size: ${data.report?.catalogSize || 'Verified'}`);
          loadMetrics();
          loadAuditLogs();
        } else {
          alert(`❌ Health Audit Error: ${data.error || 'Unknown'}`);
        }
      } catch (err) {
        alert(`❌ Error: ${err.message}`);
      } finally {
        runHealthAuditBtn.disabled = false;
        runHealthAuditBtn.textContent = '🛡️ 5-Hour Health Audit';
      }
    });
  }

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
      const res = await adminFetch('/api/admin/lookup-product', {
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
    const linkOk = affiliateUrl.includes('amazon.in') && affiliateUrl.includes(asin) && affiliateUrl.includes('tag=');
    steps.push({ name: '1-to-1 Link & Tag Match', passed: linkOk, detail: linkOk ? `${asin} + affiliate tag verified` : 'Link mismatch' });
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
      const res = await adminFetch('/api/admin/add-product', {
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
            <td><strong>₹${new Intl.NumberFormat('en-IN').format(p.current_price)}</strong></td>
            <td>
              <div style="display:flex; gap:0.4rem; align-items:center;">
                <button class="btn btn-secondary btn-sm" onclick="editProductPrice('${p.asin}', ${p.current_price}, ${p.list_price || 0})" style="padding:0.2rem 0.5rem; font-size:0.75rem;">✏️ Edit Price</button>
                <a href="${p.affiliate_url}" target="_blank" class="btn btn-primary btn-sm" style="padding:0.2rem 0.5rem; font-size:0.75rem;">Amazon ↗</a>
              </div>
            </td>
          </tr>
        `).join('');
      } else {
        catalogEmpty.style.display = 'block';
        catalogTable.style.display = 'none';
        catalogCount.textContent = '0 products';
      }
    } catch (err) { console.error(err); }
  };

  window.editProductPrice = async (asin, currentPrice, listPrice) => {
    const newPriceStr = prompt(`Enter new live Amazon price for ASIN ${asin} (in ₹ INR):`, currentPrice);
    if (!newPriceStr) return;
    const newPrice = parseFloat(newPriceStr.trim().replace(/,/g, ''));
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('❌ Invalid price amount entered.');
      return;
    }

    try {
      const res = await adminFetch('/api/admin/update-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin, currentPrice: newPrice, listPrice: listPrice || (newPrice * 1.25) })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Price updated successfully to ₹${newPrice.toLocaleString('en-IN')}!`);
        loadCatalog();
        loadDeltas();
        loadAuditLogs();
      } else {
        alert(`❌ Error: ${data.error || 'Failed to update price'}`);
      }
    } catch (err) {
      alert(`❌ Network Error: ${err.message}`);
    }
  };

  // Safe-Fail Guardian & Health Status
  const safeFailBanner = document.getElementById('safeFailBanner');
  const safeFailTitle = document.getElementById('safeFailTitle');
  const safeFailDesc = document.getElementById('safeFailDesc');
  const resetSafeFailBtn = document.getElementById('resetSafeFailBtn');
  const systemHealthText = document.getElementById('systemHealthText');
  const lastHealthAuditTime = document.getElementById('lastHealthAuditTime');

  const checkSystemStatus = async () => {
    try {
      const res = await adminFetch('/api/admin/system-status');
      const data = await res.json();
      if (data.success && data.status) {
        const st = data.status;
        if (st.isEmergencyHalt) {
          safeFailBanner.style.display = 'flex';
          safeFailTitle.textContent = `🚨 EMERGENCY SAFE-FAIL ACTIVE: ${st.lastIncident?.reason || 'Anomaly Detected'}`;
          safeFailDesc.textContent = `Incident ID: ${st.lastIncident?.incidentId || 'N/A'} | Tool: ${st.lastIncident?.toolOrModule || 'Unknown'} | Report sent to ${st.notificationEmail}`;
          systemHealthText.textContent = 'EMERGENCY HALT';
          systemHealthText.style.color = '#ef4444';
        } else {
          safeFailBanner.style.display = 'none';
          systemHealthText.textContent = 'HEALTHY (100% COMPLIANT)';
          systemHealthText.style.color = '#10b981';
        }
        if (st.lastCheckTime) {
          lastHealthAuditTime.textContent = new Date(st.lastCheckTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        }
      }
    } catch (e) {}
  };

  if (resetSafeFailBtn) {
    resetSafeFailBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear the emergency safe-fail lock?')) return;
      try {
        const res = await adminFetch('/api/admin/safe-fail/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operator: 'Owner via Admin UI' })
        });
        const data = await res.json();
        if (data.success) {
          alert('Safe-Fail Lock cleared successfully.');
          checkSystemStatus();
          loadAuditLogs();
        }
      } catch (err) { alert(`Failed to reset: ${err.message}`); }
    });
  }

  // Metrics
  const loadMetrics = async () => {
    try {
      const res = await adminFetch('/api/admin/metrics');
      const data = await res.json();
      if (data.success && data.metrics) {
        const elTotal = document.getElementById('metricTotal') || document.getElementById('metricProducts');
        if (elTotal) elTotal.textContent = data.metrics.totalProducts;
        const elTop = document.getElementById('metricTopRated') || document.getElementById('metricRating');
        if (elTop) elTop.textContent = `${data.metrics.averageRating || 4.2} ★`;
        const elDeals = document.getElementById('metricDeals');
        if (elDeals) elDeals.textContent = data.metrics.dailyDealsCount;
      }
    } catch (err) { console.error(err); }
  };

  // =============================================
  // AUDIT TRAIL & GOOGLE SHEETS HUB
  // =============================================
  const subtabLiveLogsBtn = document.getElementById('subtabLiveLogsBtn');
  const subtabDailyReportsBtn = document.getElementById('subtabDailyReportsBtn');
  const subtabSheetsGuideBtn = document.getElementById('subtabSheetsGuideBtn');

  const viewLiveLogs = document.getElementById('viewLiveLogs');
  const viewDailyReports = document.getElementById('viewDailyReports');
  const viewSheetsGuide = document.getElementById('viewSheetsGuide');

  const auditSearchInput = document.getElementById('auditSearchInput');
  const auditToolFilter = document.getElementById('auditToolFilter');
  const auditComplianceFilter = document.getElementById('auditComplianceFilter');
  const auditLogCounter = document.getElementById('auditLogCounter');
  const generateDailyReportBtn = document.getElementById('generateDailyReportBtn');
  const downloadMasterCsvBtn = document.getElementById('downloadMasterCsvBtn');
  const downloadDailyCsvBtn = document.getElementById('downloadDailyCsvBtn');

  let allLoadedAuditLogs = [];

  // Instant Blob Download Handlers (100% Reliable across all browsers)
  if (downloadMasterCsvBtn) {
    downloadMasterCsvBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      downloadMasterCsvBtn.textContent = '⏳ Preparing Master CSV...';
      try {
        const res = await fetch('/sheets/master-ecosystem-audit.csv');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'master-ecosystem-audit.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        alert('Failed to download Master CSV: ' + err.message);
      } finally {
        downloadMasterCsvBtn.textContent = '📥 Download Master Audit (.CSV / Sheets)';
      }
    });
  }

  if (downloadDailyCsvBtn) {
    downloadDailyCsvBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      downloadDailyCsvBtn.textContent = '⏳ Preparing Daily CSV...';
      try {
        const res = await fetch('/sheets/daily-ecosystem-reports.csv');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'daily-ecosystem-reports.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        alert('Failed to download Daily CSV: ' + err.message);
      } finally {
        downloadDailyCsvBtn.textContent = '📊 Download Daily Reports (.CSV / Sheets)';
      }
    });
  }

  // Subtab switching
  if (subtabLiveLogsBtn && subtabDailyReportsBtn && subtabSheetsGuideBtn) {
    const switchSubtab = (activeBtn, activeView) => {
      [subtabLiveLogsBtn, subtabDailyReportsBtn, subtabSheetsGuideBtn].forEach(b => b.classList.remove('active'));
      [viewLiveLogs, viewDailyReports, viewSheetsGuide].forEach(v => v.style.display = 'none');
      activeBtn.classList.add('active');
      activeView.style.display = 'block';
    };

    subtabLiveLogsBtn.addEventListener('click', () => switchSubtab(subtabLiveLogsBtn, viewLiveLogs));
    subtabDailyReportsBtn.addEventListener('click', () => {
      switchSubtab(subtabDailyReportsBtn, viewDailyReports);
      loadDailyReports();
    });
    subtabSheetsGuideBtn.addEventListener('click', () => switchSubtab(subtabSheetsGuideBtn, viewSheetsGuide));
  }

  // Render filtered audit logs
  const renderAuditLogs = () => {
    const auditTableBody = document.getElementById('auditTableBody');
    if (!auditTableBody) return;

    const query = (auditSearchInput?.value || '').trim().toLowerCase();
    const toolFilter = auditToolFilter?.value || 'ALL';
    const compFilter = auditComplianceFilter?.value || 'ALL';

    const filtered = allLoadedAuditLogs.filter(log => {
      const matchQuery = !query || 
        (log.actionPerformed && log.actionPerformed.toLowerCase().includes(query)) ||
        (log.toolOrModule && log.toolOrModule.toLowerCase().includes(query)) ||
        (log.id && log.id.toLowerCase().includes(query)) ||
        (log.complianceStatus && log.complianceStatus.toLowerCase().includes(query)) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(query));

      const matchTool = toolFilter === 'ALL' || 
        (log.toolOrModule && log.toolOrModule.toLowerCase().includes(toolFilter.toLowerCase()));

      const matchComp = compFilter === 'ALL' || 
        (log.complianceStatus && log.complianceStatus === compFilter);

      return matchQuery && matchTool && matchComp;
    });

    if (auditLogCounter) {
      auditLogCounter.textContent = `Showing ${filtered.length} of ${allLoadedAuditLogs.length} master ecosystem operations`;
    }

    if (filtered.length === 0) {
      auditTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:2rem;">No matching logs found.</td></tr>`;
      return;
    }

    auditTableBody.innerHTML = filtered.map((log, idx) => {
      const timeStr = log.timestampIST || (log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '');
      const isHalt = log.complianceStatus === 'EMERGENCY_HALT';
      const isBlocked = log.complianceStatus === 'VIOLATION_BLOCKED';
      const badgeClass = isHalt ? 'audit-badge FAIL' : isBlocked ? 'audit-badge FAIL' : 'audit-badge PASS';
      const statusClass = log.status === 'FAIL' ? 'text-red' : 'text-green';
      const logId = log.id || `log-${idx}`;

      const detailsStr = JSON.stringify(log.details || {}, null, 2);
      const isBatchOrCuration = (log.toolOrModule && (log.toolOrModule.includes('Curator') || log.toolOrModule.includes('Monitor') || log.toolOrModule.includes('Sync'))) || (log.details && (log.details.items || log.details.products || log.details.publishedCount !== undefined || Object.keys(log.details).length > 3));

      if (isBatchOrCuration) {
        return `
          <tr style="${isHalt ? 'background:rgba(239,68,68,0.15);' : ''}">
            <td><code style="font-size:0.75rem;">${timeStr}</code></td>
            <td><strong>${log.toolOrModule || 'System'}</strong></td>
            <td style="max-width:280px;">${log.actionPerformed || log.eventType}</td>
            <td><small><code>${log.permissionUsed || 'STANDARD_EXECUTION'}</code></small></td>
            <td><span class="${badgeClass}">${log.complianceStatus || '100%_COMPLIANT'}</span></td>
            <td><strong class="${statusClass}">${log.status || 'SUCCESS'}</strong></td>
            <td>
              <button class="btn btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;" onclick="toggleAuditLogDrawer('${logId}')">
                📂 View Curation Log ▾
              </button>
            </td>
          </tr>
          <tr id="audit-drawer-${logId}" style="display:none; background: rgba(0,0,0,0.2);">
            <td colspan="7" style="padding: 0.75rem 1rem;">
              <pre style="margin: 0; font-family: monospace; font-size: 0.75rem; color: var(--gold-accent); max-height: 250px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;">${escapeHtml(detailsStr)}</pre>
            </td>
          </tr>
        `;
      }

      return `
        <tr style="${isHalt ? 'background:rgba(239,68,68,0.15);' : ''}">
          <td><code style="font-size:0.75rem;">${timeStr}</code></td>
          <td><strong>${log.toolOrModule || 'System'}</strong></td>
          <td style="max-width:280px;">${log.actionPerformed || log.eventType}</td>
          <td><small><code>${log.permissionUsed || 'STANDARD_EXECUTION'}</code></small></td>
          <td><span class="${badgeClass}">${log.complianceStatus || '100%_COMPLIANT'}</span></td>
          <td><strong class="${statusClass}">${log.status || 'SUCCESS'}</strong></td>
          <td><small style="color:var(--text-dim);">${JSON.stringify(log.details || {}).substring(0, 85)}...</small></td>
        </tr>
      `;
    }).join('');
  };

  window.toggleAuditLogDrawer = (logId) => {
    const drawer = document.getElementById(`audit-drawer-${logId}`);
    if (drawer) {
      drawer.style.display = drawer.style.display === 'none' ? 'table-row' : 'none';
    }
  };

  if (auditSearchInput) auditSearchInput.addEventListener('input', renderAuditLogs);
  if (auditToolFilter) auditToolFilter.addEventListener('change', renderAuditLogs);
  if (auditComplianceFilter) auditComplianceFilter.addEventListener('change', renderAuditLogs);

  // Load all master logs
  const loadAuditLogs = async () => {
    try {
      const res = await adminFetch('/api/admin/audit-logs?limit=500');
      const data = await res.json();
      if (data.success && data.logs) {
        allLoadedAuditLogs = data.logs;
        renderAuditLogs();
      }
    } catch (err) { console.error('Failed to load audit logs:', err); }
  };

  // Load daily 10:00 PM reports
  const loadDailyReports = async () => {
    const dailyReportsTableBody = document.getElementById('dailyReportsTableBody');
    if (!dailyReportsTableBody) return;

    try {
      const res = await adminFetch('/api/admin/daily-reports');
      const data = await res.json();
      if (data.success && data.reports && data.reports.length > 0) {
        dailyReportsTableBody.innerHTML = data.reports.map(r => {
          const s = r.summary || {};
          const isHealthy = r.status.includes('HEALTHY');
          return `
            <tr>
              <td><strong>${r.dateFormatted || r.date}</strong><br><small style="color:var(--text-dim);">${r.date}</small></td>
              <td><span class="audit-badge ${isHealthy ? 'PASS' : 'FAIL'}">${r.status}</span></td>
              <td><strong>${s.totalActionsRecorded || 0}</strong> operations</td>
              <td>${s.curationRuns || 0} runs</td>
              <td>${s.healthAuditsCompleted || 0} audits</td>
              <td><span class="${s.violationsBlocked > 0 ? 'text-red' : 'text-green'}">${s.violationsBlocked || 0} blocked</span></td>
              <td><strong>${s.activeCatalogProducts || 0}</strong> items</td>
              <td><small>${r.generatedAtIST || r.date}</small></td>
            </tr>
          `;
        }).join('');
      } else {
        dailyReportsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:2rem;">No daily reports generated yet. Click "Compile Today's 10:00 PM Report" above.</td></tr>`;
      }
    } catch (err) { console.error('Failed to load daily reports:', err); }
  };

  // Trigger manual daily report compilation
  if (generateDailyReportBtn) {
    generateDailyReportBtn.addEventListener('click', async () => {
      generateDailyReportBtn.disabled = true;
      generateDailyReportBtn.textContent = '⏳ Compiling...';
      try {
        const res = await adminFetch('/api/admin/daily-reports/generate', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert(`✅ Daily Performance Report Compiled Successfully for ${data.report.date}!\n\nSummary:\n- Total Operations: ${data.report.summary.totalActionsRecorded}\n- Active Products: ${data.report.summary.activeCatalogProducts}\n- Violations Blocked: ${data.report.summary.violationsBlocked}\n- Health Status: ${data.report.status}`);
          loadDailyReports();
          loadAuditLogs();
        } else {
          alert(`❌ Failed to compile report: ${data.error}`);
        }
      } catch (err) {
        alert(`❌ Error: ${err.message}`);
      } finally {
        generateDailyReportBtn.disabled = false;
        generateDailyReportBtn.textContent = "⚡ Compile Today's 10:00 PM Report";
      }
    });
  }

  // Price Deltas
  const loadDeltas = async () => {
    try {
      const res = await adminFetch('/api/admin/price-deltas');
      const data = await res.json();
      if (data.success && data.deltas) {
        document.getElementById('deltasBody').innerHTML = data.deltas.map(d => {
          const rawTime = d.timestamp || d.updated_at || d.updated_at_ist;
          let timeDisplay = '-';
          if (rawTime) {
            const dateObj = new Date(rawTime);
            timeDisplay = isNaN(dateObj.getTime())
              ? (d.updated_at_ist || String(rawTime))
              : dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });
          }

          const oldPrice = d.oldPrice !== undefined ? d.oldPrice : (d.old_price !== undefined ? d.old_price : 0);
          const newPrice = d.newPrice !== undefined ? d.newPrice : (d.new_price !== undefined ? d.new_price : 0);
          const diff = d.diff !== undefined ? d.diff : (newPrice - oldPrice);
          const pct = d.percentChange !== undefined 
            ? d.percentChange 
            : (d.percent_change !== undefined ? d.percent_change : (oldPrice ? (((newPrice - oldPrice) / oldPrice) * 100).toFixed(1) : 0));

          return `
            <tr>
              <td><code>${escapeHtml(timeDisplay)}</code></td>
              <td><strong>${escapeHtml(d.asin || '')}</strong></td>
              <td style="max-width:260px;" title="${escapeHtml(d.title || '')}">${escapeHtml(d.title ? d.title.substring(0, 35) + '...' : '-')}</td>
              <td>₹${Number(oldPrice).toLocaleString('en-IN')}</td>
              <td>₹${Number(newPrice).toLocaleString('en-IN')}</td>
              <td style="color:${diff < 0 ? '#10b981' : '#ef4444'};font-weight:700">${diff > 0 ? '+' : ''}₹${Number(diff).toLocaleString('en-IN')}</td>
              <td style="color:${diff < 0 ? '#10b981' : '#ef4444'};font-weight:700">${pct > 0 ? '+' : ''}${pct}%</td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) { console.error(err); }
  };

  // Feedbacks
  const loadFeedbacks = async () => {
    try {
      const res = await adminFetch('/api/admin/feedbacks');
      const data = await res.json();
      const feedbackEmpty = document.getElementById('feedbackEmpty');
      const feedbackTable = document.getElementById('feedbackTable');
      const feedbackBody = document.getElementById('feedbackBody');

      if (data.success && data.feedbacks && data.feedbacks.length > 0) {
        feedbackEmpty.style.display = 'none';
        feedbackTable.style.display = 'table';
        feedbackBody.innerHTML = data.feedbacks.map(f => `
          <tr>
            <td><code>${new Date(f.submittedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</code></td>
            <td><strong>${f.id}</strong></td>
            <td><span class="badge-cat">${f.category.replace('_', ' ').toUpperCase()}</span></td>
            <td>${f.asin ? `<code>${f.asin}</code>` : '-'}</td>
            <td style="max-width: 250px; word-break: break-word;">${f.message}</td>
            <td><small>${f.contact || 'Anonymous'}</small></td>
            <td><span class="audit-badge ${f.status === 'RESOLVED' ? 'PASS' : f.status === 'REVIEWED' ? 'INFO' : 'FAIL'}">${f.status}</span></td>
            <td>
              <select onchange="updateFeedbackStatus('${f.id}', this.value)" class="modal-select" style="padding:0.25rem 0.5rem;font-size:0.75rem;">
                <option value="PENDING_REVIEW" ${f.status === 'PENDING_REVIEW' ? 'selected' : ''}>Pending</option>
                <option value="REVIEWED" ${f.status === 'REVIEWED' ? 'selected' : ''}>Reviewed</option>
                <option value="RESOLVED" ${f.status === 'RESOLVED' ? 'selected' : ''}>Resolved</option>
              </select>
            </td>
          </tr>
        `).join('');
      } else {
        feedbackEmpty.style.display = 'block';
        feedbackTable.style.display = 'none';
      }
    } catch (err) { console.error('Failed to load feedbacks:', err); }
  };

  window.updateFeedbackStatus = async (id, status) => {
    try {
      const res = await adminFetch(`/api/admin/feedbacks/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        loadFeedbacks();
      }
    } catch (err) { alert(`Failed to update feedback: ${err.message}`); }
  };

  // =============================================
  // PINTEREST AUTO-PUBLISHER ENGINE & OAUTH 2.0
  // =============================================
  const pinterestTokenInput = document.getElementById('pinterestTokenInput');
  const pinterestAppIdInput = document.getElementById('pinterestAppIdInput');
  const pinterestAppSecretInput = document.getElementById('pinterestAppSecretInput');
  const pinterestRedirectUriDisplay = document.getElementById('pinterestRedirectUriDisplay');
  const copyRedirectUriBtn = document.getElementById('copyRedirectUriBtn');
  const pinterestOAuthConnectBtn = document.getElementById('pinterestOAuthConnectBtn');
  const pinterestBoardNameInput = document.getElementById('pinterestBoardNameInput');
  const pinterestBoardIdInput = document.getElementById('pinterestBoardIdInput');
  const savePinterestConfigBtn = document.getElementById('savePinterestConfigBtn');
  const fetchPinterestBoardsBtn = document.getElementById('fetchPinterestBoardsBtn');
  const publishDailyPinsBtn = document.getElementById('publishDailyPinsBtn');
  const pinterestConnBadge = document.getElementById('pinterestConnBadge');
  const pinterestLastRunText = document.getElementById('pinterestLastRunText');
  const pinterestHistoryBody = document.getElementById('pinterestHistoryBody');

  // Initialize Redirect URI display
  const currentRedirectUri = `${window.location.origin}/api/admin/pinterest/oauth/callback`;
  if (pinterestRedirectUriDisplay) {
    pinterestRedirectUriDisplay.value = currentRedirectUri;
  }

  if (copyRedirectUriBtn && pinterestRedirectUriDisplay) {
    copyRedirectUriBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pinterestRedirectUriDisplay.value);
        copyRedirectUriBtn.textContent = '✅ Copied!';
        setTimeout(() => { copyRedirectUriBtn.textContent = '📋 Copy'; }, 2000);
      } catch (e) {
        pinterestRedirectUriDisplay.select();
        document.execCommand('copy');
        copyRedirectUriBtn.textContent = '✅ Copied!';
        setTimeout(() => { copyRedirectUriBtn.textContent = '📋 Copy'; }, 2000);
      }
    });
  }

  const loadPinterestStatus = async () => {
    try {
      const res = await adminFetch('/api/admin/pinterest/status');
      const data = await res.json();

      if (data.success) {
        if (data.connectionTest?.success) {
          pinterestConnBadge.className = 'badge badge-green';
          pinterestConnBadge.textContent = `Connected (@${data.connectionTest.username})`;
        } else {
          pinterestConnBadge.className = 'badge badge-red';
          pinterestConnBadge.textContent = data.config?.hasToken ? 'Auth Failed / Needs Write Scopes' : 'No Token Configured';
        }

        if (pinterestAppIdInput && data.config?.appId) {
          pinterestAppIdInput.value = data.config.appId;
        }
        if (pinterestAppSecretInput && data.config?.hasAppSecret) {
          pinterestAppSecretInput.placeholder = '•••••••••••••••• (App Secret saved)';
        }
        if (pinterestBoardNameInput && data.config?.boardName) {
          pinterestBoardNameInput.value = data.config.boardName;
        }
        if (pinterestBoardIdInput && data.config?.boardId) {
          pinterestBoardIdInput.value = data.config.boardId;
        }
        if (pinterestLastRunText) {
          pinterestLastRunText.textContent = data.config?.lastPublishedDate 
            ? new Date(data.config.lastPublishedDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) 
            : 'Ready for initial run';
        }

        if (pinterestHistoryBody && data.history) {
          if (data.history.length === 0) {
            pinterestHistoryBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-dim); padding:2rem;">No pins published via API yet. Click "Publish Top 5 Deals Now" to publish.</td></tr>`;
          } else {
            pinterestHistoryBody.innerHTML = data.history.map(p => `
              <tr>
                <td><code>${new Date(p.publishedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</code></td>
                <td><code>${p.asin}</code></td>
                <td style="max-width: 250px; font-weight: 500;">${p.title?.substring(0, 50)}...</td>
                <td><strong>₹${p.price}</strong></td>
                <td><small><code>tag=verified</code></small></td>
                <td><a href="${p.pinterestLink}" target="_blank" style="color:var(--gold-accent); text-decoration:none;">View on Pinterest ↗</a></td>
              </tr>
            `).join('');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load Pinterest status:', err);
    }
  };

  if (pinterestOAuthConnectBtn) {
    pinterestOAuthConnectBtn.addEventListener('click', async () => {
      const appId = pinterestAppIdInput?.value.trim() || '';
      const appSecret = pinterestAppSecretInput?.value.trim();

      // If app secret is entered, save it first
      if (appSecret) {
        await adminFetch('/api/admin/pinterest/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appId, appSecret })
        });
      }

      pinterestOAuthConnectBtn.disabled = true;
      pinterestOAuthConnectBtn.textContent = 'Redirecting to Pinterest...';

      try {
        const redirectUri = `${window.location.origin}/api/admin/pinterest/oauth/callback`;
        const res = await adminFetch(`/api/admin/pinterest/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`);
        const data = await res.json();
        if (data.success && data.authUrl) {
          window.location.href = data.authUrl;
        } else {
          alert('Failed to generate Pinterest OAuth URL: ' + (data.error || 'Unknown error'));
          pinterestOAuthConnectBtn.disabled = false;
          pinterestOAuthConnectBtn.textContent = '📌 Authorize & Connect via Pinterest (1-Click OAuth)';
        }
      } catch (err) {
        alert('Error connecting to Pinterest: ' + err.message);
        pinterestOAuthConnectBtn.disabled = false;
        pinterestOAuthConnectBtn.textContent = '📌 Authorize & Connect via Pinterest (1-Click OAuth)';
      }
    });
  }

  if (savePinterestConfigBtn) {
    savePinterestConfigBtn.addEventListener('click', async () => {
      const appId = pinterestAppIdInput?.value.trim();
      const appSecret = pinterestAppSecretInput?.value.trim();
      const token = pinterestTokenInput?.value.trim();
      const boardName = pinterestBoardNameInput?.value.trim();
      const boardId = pinterestBoardIdInput?.value.trim();

      savePinterestConfigBtn.disabled = true;
      savePinterestConfigBtn.textContent = 'Saving...';
      try {
        const payload = { boardName, boardId };
        if (appId) payload.appId = appId;
        if (appSecret) payload.appSecret = appSecret;
        if (token) payload.accessToken = token;

        const res = await adminFetch('/api/admin/pinterest/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          alert('✅ Pinterest configuration saved successfully!');
          if (pinterestTokenInput) pinterestTokenInput.value = '';
          loadPinterestStatus();
        }
      } catch (e) {
        alert('Failed to save Pinterest config: ' + e.message);
      } finally {
        savePinterestConfigBtn.disabled = false;
        savePinterestConfigBtn.textContent = '💾 Save Configuration';
      }
    });
  }

  if (fetchPinterestBoardsBtn) {
    fetchPinterestBoardsBtn.addEventListener('click', async () => {
      fetchPinterestBoardsBtn.disabled = true;
      fetchPinterestBoardsBtn.textContent = 'Scanning Pinterest...';
      try {
        const res = await adminFetch('/api/admin/pinterest/boards');
        const data = await res.json();
        if (data.success && data.boards && data.boards.length > 0) {
          const match = data.boards.find(b => b.name.toLowerCase().includes('amazon') || b.name.toLowerCase().includes('deal')) || data.boards[0];
          if (match && pinterestBoardIdInput) {
            pinterestBoardIdInput.value = match.id;
            alert(`✅ Board ID Detected: "${match.name}" (ID: ${match.id})`);
          }
        } else {
          alert(`Could not fetch boards: ${data.error || 'Check access token permissions'}`);
        }
      } catch (e) {
        alert('Error fetching boards: ' + e.message);
      } finally {
        fetchPinterestBoardsBtn.disabled = false;
        fetchPinterestBoardsBtn.textContent = '🔄 Detect Board ID';
      }
    });
  }

  if (publishDailyPinsBtn) {
    publishDailyPinsBtn.addEventListener('click', async () => {
      if (!confirm('⚡ Publish the top 5 verified deals directly to your Pinterest Board now?')) return;
      publishDailyPinsBtn.disabled = true;
      publishDailyPinsBtn.textContent = '🚀 Publishing Deals to Pinterest...';
      try {
        const res = await adminFetch('/api/admin/pinterest/publish-daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 5 })
        });
        const data = await res.json();
        if (data.success) {
          alert(`🎉 Successfully published ${data.publishedCount} pins to your Pinterest Board!`);
          loadPinterestStatus();
        } else {
          alert(`Failed to publish pins: ${data.error}`);
        }
      } catch (e) {
        alert('Error publishing to Pinterest: ' + e.message);
      } finally {
        publishDailyPinsBtn.disabled = false;
        publishDailyPinsBtn.textContent = '⚡ Publish Top 5 Deals Now';
      }
    });
  }
  // =============================================
  // CHANGE PASSWORD MODAL HANDLERS
  // =============================================
  const changePasswordModal = document.getElementById('changePasswordModal');
  const changePasswordModalBtn = document.getElementById('changePasswordModalBtn');
  const closeChangePasswordModalBtn = document.getElementById('closeChangePasswordModalBtn');
  const cancelChangePasswordBtn = document.getElementById('cancelChangePasswordBtn');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const changePasswordStatus = document.getElementById('changePasswordStatus');

  if (changePasswordModalBtn && changePasswordModal) {
    changePasswordModalBtn.addEventListener('click', () => {
      changePasswordModal.style.display = 'flex';
      if (changePasswordStatus) changePasswordStatus.style.display = 'none';
      if (changePasswordForm) changePasswordForm.reset();
    });
  }

  const closeChangePasswordModal = () => {
    if (changePasswordModal) changePasswordModal.style.display = 'none';
  };

  if (closeChangePasswordModalBtn) closeChangePasswordModalBtn.addEventListener('click', closeChangePasswordModal);
  if (cancelChangePasswordBtn) cancelChangePasswordBtn.addEventListener('click', closeChangePasswordModal);

  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('currentPasswordInput').value.trim();
      const newPassword = document.getElementById('newPasswordInput').value.trim();
      const confirmNewPassword = document.getElementById('confirmNewPasswordInput').value.trim();

      if (newPassword !== confirmNewPassword) {
        changePasswordStatus.style.display = 'block';
        changePasswordStatus.style.background = 'rgba(239, 68, 68, 0.15)';
        changePasswordStatus.style.color = '#ef4444';
        changePasswordStatus.textContent = '❌ New passwords do not match.';
        return;
      }

      if (newPassword.length < 4) {
        changePasswordStatus.style.display = 'block';
        changePasswordStatus.style.background = 'rgba(239, 68, 68, 0.15)';
        changePasswordStatus.style.color = '#ef4444';
        changePasswordStatus.textContent = '❌ New password must be at least 4 characters long.';
        return;
      }

      const submitBtn = document.getElementById('submitChangePasswordBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
      }

      try {
        const res = await fetch('/api/admin/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();

        if (data.success) {
          changePasswordStatus.style.display = 'block';
          changePasswordStatus.style.background = 'rgba(16, 185, 129, 0.15)';
          changePasswordStatus.style.color = '#10b981';
          changePasswordStatus.textContent = '✅ Password updated successfully! Please re-login with your new password.';
          
          currentAdminToken = newPassword;
          sessionStorage.setItem('affiliate_admin_token', newPassword);
          localStorage.setItem('affiliate_admin_token', newPassword);

          setTimeout(() => {
            closeChangePasswordModal();
            alert('Password changed successfully. Your session is updated!');
          }, 1200);
        } else {
          changePasswordStatus.style.display = 'block';
          changePasswordStatus.style.background = 'rgba(239, 68, 68, 0.15)';
          changePasswordStatus.style.color = '#ef4444';
          changePasswordStatus.textContent = `❌ ${data.error || 'Failed to update password.'}`;
        }
      } catch (err) {
        changePasswordStatus.style.display = 'block';
        changePasswordStatus.style.background = 'rgba(239, 68, 68, 0.15)';
        changePasswordStatus.style.color = '#ef4444';
        changePasswordStatus.textContent = `❌ Server error: ${err.message}`;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save New Password';
        }
      }
    });
  }

  // Handle URL hash or query params (e.g. ?pinterest_connected=1 or #pinterest)
  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  if (urlParams.get('pinterest_connected') === '1' || hash.includes('pinterest')) {
    const pinTabBtn = document.querySelector('.nav-item[data-tab="pinterest"]');
    if (pinTabBtn) pinTabBtn.click();
    if (urlParams.get('pinterest_connected') === '1') {
      alert('🎉 Pinterest Connected Successfully via OAuth 2.0! Write permissions activated.');
      window.history.replaceState({}, document.title, window.location.pathname + '#pinterest');
    }
  }
  if (urlParams.get('pinterest_error')) {
    const pinTabBtn = document.querySelector('.nav-item[data-tab="pinterest"]');
    if (pinTabBtn) pinTabBtn.click();
    alert('❌ Pinterest OAuth Error: ' + decodeURIComponent(urlParams.get('pinterest_error')));
    window.history.replaceState({}, document.title, window.location.pathname + '#pinterest');
  }
});

