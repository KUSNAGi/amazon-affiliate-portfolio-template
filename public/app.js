/**
 * Portfolio 1 Public Showcase App Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    products: [],
    currentCategory: 'all',
    currentRatingTier: 'top_rated', // Default 4.0+ standard
    currentSort: 'discount',
    searchQuery: '',
    associateTag: 'nagireddy0e-21'
  };

  // DOM Elements
  const productsGrid = document.getElementById('productsGrid');
  const resultsCount = document.getElementById('resultsCount');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const categoryTabs = document.querySelectorAll('.cat-tab');
  const ratingPills = document.querySelectorAll('.rating-pill');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const heroTimestamp = document.getElementById('heroTimestamp');
  const footerPriceDisclaimer = document.getElementById('footerPriceDisclaimer');

  // Format INR Currency
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN').format(val);
  };

  // Generate Current IST Timestamp for Amazon Compliance
  const getISTTimestamp = () => {
    const now = new Date();
    return now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    }) + ' IST';
  };

  // Update compliance timestamps
  const updateDisclaimers = () => {
    const timeStr = getISTTimestamp();
    if (heroTimestamp) {
      heroTimestamp.innerHTML = `🕒 Price verified accurate as of <strong>${timeStr}</strong> &bull; Free Prime Delivery Eligible`;
    }
    if (footerPriceDisclaimer) {
      footerPriceDisclaimer.innerHTML = `<strong>Price & Availability Disclaimer:</strong> Product prices and availability are accurate as of <strong>${timeStr}</strong> and are subject to change. Any price and availability information displayed on Amazon.in at the time of purchase will apply.`;
    }
  };

  // Fetch Products from Backend API
  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams({
        category: state.currentCategory,
        ratingTier: state.currentRatingTier,
        sort: state.currentSort
      });

      if (state.searchQuery) {
        params.set('search', state.searchQuery);
      }

      if (state.currentCategory === 'daily_deals') {
        params.set('isDailyDeal', 'true');
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        state.products = json.data;
        if (json.associateTag) state.associateTag = json.associateTag;
        renderProducts();
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      productsGrid.innerHTML = `<div class="error-msg">Failed to load curated picks. Please refresh.</div>`;
    }
  };

  // Render Product Cards
  const renderProducts = () => {
    if (!state.products || state.products.length === 0) {
      productsGrid.style.display = 'none';
      emptyState.style.display = 'block';
      resultsCount.innerHTML = `Showing <strong>0</strong> products`;
      return;
    }

    productsGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    resultsCount.innerHTML = `Showing <strong>${state.products.length}</strong> verified products`;

    productsGrid.innerHTML = state.products.map(product => {
      const discount = product.list_price 
        ? Math.round(((product.list_price - product.current_price) / product.list_price) * 100) 
        : 0;

      const isTopTier = product.rating >= 4.0;
      const ratingBadgeClass = isTopTier ? 'top-tier' : 'value-tier';

      return `
        <article class="product-card" id="card-${product.asin}">
          <div class="card-media-wrap">
            <div class="card-badges">
              ${product.is_daily_deal ? `<span class="badge-deal">⚡ DAILY DEAL</span>` : ''}
              <span class="badge-cat">${product.category_label || 'Essential'}</span>
            </div>
            <img src="${product.image_url}" alt="${escapeHtml(product.title)}" class="card-img" loading="lazy">
          </div>

          <div class="card-body">
            <div class="card-brand">${escapeHtml(product.brand || 'Amazon Verified')}</div>
            <h3 class="card-title" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</h3>

            <div class="card-rating-wrap">
              <span class="rating-stars ${ratingBadgeClass}">
                ⭐ ${product.rating}
              </span>
              <span class="review-count">(${product.reviews_count ? Number(product.reviews_count).toLocaleString() : '500+'} reviews)</span>
            </div>

            <div class="card-pricing">
              <span class="card-curr-price">₹${formatINR(product.current_price)}</span>
              ${product.list_price ? `<span class="card-list-price">₹${formatINR(product.list_price)}</span>` : ''}
              ${discount > 0 ? `<span class="card-discount-tag">${discount}% OFF</span>` : ''}
            </div>

            <div class="card-footer-action">
              <a href="${product.affiliate_url}" target="_blank" rel="noopener noreferrer" class="card-buy-btn" id="buy-${product.asin}">
                Buy on Amazon ↗
              </a>
              <span class="ad-label">#ad</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  };

  // Helper to escape HTML strings
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Event Listeners: Category Navigation
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      categoryTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      state.currentCategory = tab.dataset.category;
      fetchProducts();
    });
  });

  // Event Listeners: Rating Tier Filter
  ratingPills.forEach(pill => {
    pill.addEventListener('click', () => {
      ratingPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.currentRatingTier = pill.dataset.rating;
      fetchProducts();
    });
  });

  // Event Listeners: Sorting
  sortSelect.addEventListener('change', (e) => {
    state.currentSort = e.target.value;
    fetchProducts();
  });

  // Event Listeners: Search with Debounce
  let searchTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value.trim();
    clearSearchBtn.style.display = query.length > 0 ? 'block' : 'none';

    searchTimer = setTimeout(() => {
      state.searchQuery = query;
      fetchProducts();
    }, 250);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    state.searchQuery = '';
    fetchProducts();
  });

  // Reset Filters
  resetFiltersBtn.addEventListener('click', () => {
    state.currentCategory = 'all';
    state.currentRatingTier = 'top_rated';
    state.currentSort = 'discount';
    state.searchQuery = '';
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';

    categoryTabs.forEach(t => {
      t.classList.toggle('active', t.dataset.category === 'all');
      t.setAttribute('aria-selected', t.dataset.category === 'all');
    });

    ratingPills.forEach(p => {
      p.classList.toggle('active', p.dataset.rating === 'top_rated');
    });

    sortSelect.value = 'discount';
    fetchProducts();
  });

  // Initialize
  updateDisclaimers();
  fetchProducts();

  // Refresh disclaimers every 5 minutes
  setInterval(updateDisclaimers, 5 * 60 * 1000);
});
