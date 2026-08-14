/**
 * Portfolio 1 Public Showcase App Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    allProducts: [],
    displayedProducts: [],
    currentCategory: 'all',
    currentRatingTier: 'top_rated',
    currentSort: 'discount',
    searchQuery: '',
    currentSlide: 0,
    slideInterval: null
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
  const footerPriceDisclaimer = document.getElementById('footerPriceDisclaimer');

  // Carousel Elements
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.dot');
  const prevSlideBtn = document.getElementById('prevSlideBtn');
  const nextSlideBtn = document.getElementById('nextSlideBtn');
  const carouselContainer = document.getElementById('carouselContainer');

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN').format(val);
  };

  const getISTTimestamp = () => {
    const now = new Date();
    return now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    }) + ' IST';
  };

  const updateDisclaimers = () => {
    const timeStr = getISTTimestamp();
    document.querySelectorAll('.price-timestamp').forEach(el => {
      el.innerHTML = `🕒 Price verified accurate &bull; Free Prime Delivery eligible`;
    });
    if (footerPriceDisclaimer) {
      footerPriceDisclaimer.innerHTML = `<strong>Price & Availability Disclaimer:</strong> Product prices and availability are accurate as of <strong>${timeStr}</strong> and are subject to change. Any price and availability information displayed on Amazon.in at the time of purchase will apply.`;
    }
  };

  // ----------------------------------------------------
  // Hero Carousel Logic
  // ----------------------------------------------------
  const showSlide = (index) => {
    if (index >= slides.length) state.currentSlide = 0;
    else if (index < 0) state.currentSlide = slides.length - 1;
    else state.currentSlide = index;

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === state.currentSlide);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === state.currentSlide);
    });
  };

  const nextSlide = () => showSlide(state.currentSlide + 1);
  const prevSlide = () => showSlide(state.currentSlide - 1);

  const startAutoSlide = () => {
    stopAutoSlide();
    state.slideInterval = setInterval(nextSlide, 5000);
  };

  const stopAutoSlide = () => {
    if (state.slideInterval) clearInterval(state.slideInterval);
  };

  if (prevSlideBtn) prevSlideBtn.addEventListener('click', () => { prevSlide(); startAutoSlide(); });
  if (nextSlideBtn) nextSlideBtn.addEventListener('click', () => { nextSlide(); startAutoSlide(); });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.slideTo);
      showSlide(idx);
      startAutoSlide();
    });
  });

  if (carouselContainer) {
    carouselContainer.addEventListener('mouseenter', stopAutoSlide);
    carouselContainer.addEventListener('mouseleave', startAutoSlide);
  }

  // ----------------------------------------------------
  // Product Filtering & Rendering Engine
  // ----------------------------------------------------
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?category=all&ratingTier=all_acceptable');
      const json = await res.json();

      if (json.success && json.data) {
        state.allProducts = json.data;
        applyFiltersAndRender();
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      productsGrid.innerHTML = `<div class="error-msg">Failed to load curated products. Please refresh.</div>`;
    }
  };

  const applyFiltersAndRender = () => {
    let list = [...state.allProducts];

    // 1. Search Query Filter (Searches across Title, Brand, ASIN, and Category)
    if (state.searchQuery && state.searchQuery.trim() !== '') {
      const q = state.searchQuery.trim().toLowerCase();
      list = list.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.asin && p.asin.toLowerCase().includes(q)) ||
        (p.category_label && p.category_label.toLowerCase().includes(q))
      );
    } else {
      // 2. Category Filter (only if not searching)
      if (state.currentCategory === 'daily_deals') {
        list = list.filter(p => p.is_daily_deal === true);
      } else if (state.currentCategory && state.currentCategory !== 'all') {
        if (['most_purchased', 'trending', 'seasonal_essentials'].includes(state.currentCategory)) {
          list = list.filter(p => (p.tags && p.tags.includes(state.currentCategory)) || p.category === state.currentCategory);
        } else {
          list = list.filter(p => p.category === state.currentCategory);
        }
      }
    }

    // 3. Rating Tier Filter
    if (state.currentRatingTier === 'top_rated') {
      list = list.filter(p => parseFloat(p.rating) >= 4.0);
    } else if (state.currentRatingTier === 'value_picks') {
      list = list.filter(p => parseFloat(p.rating) >= 3.5 && parseFloat(p.rating) < 4.0);
    } else {
      list = list.filter(p => parseFloat(p.rating) >= 3.5);
    }

    // 4. Sorting
    if (state.currentSort === 'discount') {
      list.sort((a, b) => {
        const discA = a.list_price ? ((a.list_price - a.current_price) / a.list_price) : 0;
        const discB = b.list_price ? ((b.list_price - b.current_price) / b.list_price) : 0;
        return discB - discA;
      });
    } else if (state.currentSort === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (state.currentSort === 'price_asc') {
      list.sort((a, b) => a.current_price - b.current_price);
    } else if (state.currentSort === 'price_desc') {
      list.sort((a, b) => b.current_price - a.current_price);
    }

    state.displayedProducts = list;
    renderGrid();
  };

  const renderGrid = () => {
    if (!state.displayedProducts || state.displayedProducts.length === 0) {
      productsGrid.style.display = 'none';
      emptyState.style.display = 'block';
      resultsCount.innerHTML = `Showing <strong>0</strong> products`;
      return;
    }

    productsGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    resultsCount.innerHTML = `Showing <strong>${state.displayedProducts.length}</strong> verified products`;

    productsGrid.innerHTML = state.displayedProducts.map(product => {
      const discount = product.list_price 
        ? Math.round(((product.list_price - product.current_price) / product.list_price) * 100) 
        : 0;

      return `
        <article class="product-card" id="card-${product.asin}">
          <div class="card-media-wrap">
            <div class="card-badges">
              ${product.is_daily_deal ? `<span class="badge-deal">⚡ DAILY DEAL</span>` : ''}
              <span class="badge-cat">${product.category_label || 'Curated Essential'}</span>
            </div>
            <img src="${product.image_url}" alt="${escapeHtml(product.title)}" class="card-img" referrerpolicy="no-referrer" loading="lazy">
          </div>

          <div class="card-body">
            <div class="card-brand">${escapeHtml(product.brand || 'Verified Brand')}</div>
            <h3 class="card-title" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</h3>

            <div class="card-rating-wrap">
              <span class="rating-stars">
                ⭐ ${product.rating}
              </span>
              <span class="review-count">(${product.reviews_count ? Number(product.reviews_count).toLocaleString() : '1,000+'} ratings)</span>
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
      
      // Clear search when explicitly clicking a category
      state.searchQuery = '';
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';

      applyFiltersAndRender();
    });
  });

  // Event Listeners: Rating Tier Filter
  ratingPills.forEach(pill => {
    pill.addEventListener('click', () => {
      ratingPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.currentRatingTier = pill.dataset.rating;
      applyFiltersAndRender();
    });
  });

  // Event Listeners: Sorting
  sortSelect.addEventListener('change', (e) => {
    state.currentSort = e.target.value;
    applyFiltersAndRender();
  });

  // Event Listeners: Instant Search
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    state.searchQuery = query;
    clearSearchBtn.style.display = query.trim().length > 0 ? 'block' : 'none';
    applyFiltersAndRender();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    state.searchQuery = '';
    applyFiltersAndRender();
    searchInput.focus();
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
    applyFiltersAndRender();
  });

  // Initialize
  updateDisclaimers();
  fetchProducts();
  startAutoSlide();

  // Refresh disclaimers every 5 minutes
  setInterval(updateDisclaimers, 5 * 60 * 1000);
});
