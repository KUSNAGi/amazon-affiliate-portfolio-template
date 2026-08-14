/**
 * Portfolio 1 Public Showcase — Renders ONLY verified products
 */

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    allProducts: [],
    displayedProducts: [],
    currentCategory: 'all',
    currentRatingTier: 'all_acceptable',
    currentSort: 'discount',
    searchQuery: '',
    currentSlide: 0,
    slideInterval: null
  };

  const productsGrid = document.getElementById('productsGrid');
  const resultsCount = document.getElementById('resultsCount');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const categoryTabs = document.querySelectorAll('.cat-tab');
  const ratingPills = document.querySelectorAll('.rating-pill');
  const heroWelcome = document.getElementById('heroWelcome');
  const carouselContainer = document.getElementById('carouselContainer');
  const carouselTrack = document.getElementById('carouselTrack');
  const carouselDots = document.getElementById('carouselDots');
  const prevSlideBtn = document.getElementById('prevSlideBtn');
  const nextSlideBtn = document.getElementById('nextSlideBtn');

  const formatINR = (val) => new Intl.NumberFormat('en-IN').format(val);

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Carousel
  const showSlide = (index) => {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return;
    if (index >= slides.length) state.currentSlide = 0;
    else if (index < 0) state.currentSlide = slides.length - 1;
    else state.currentSlide = index;
    slides.forEach((s, i) => s.classList.toggle('active', i === state.currentSlide));
    dots.forEach((d, i) => d.classList.toggle('active', i === state.currentSlide));
  };
  const nextSlide = () => showSlide(state.currentSlide + 1);
  const prevSlide = () => showSlide(state.currentSlide - 1);
  const startAutoSlide = () => { stopAutoSlide(); state.slideInterval = setInterval(nextSlide, 5000); };
  const stopAutoSlide = () => { if (state.slideInterval) clearInterval(state.slideInterval); };

  if (prevSlideBtn) prevSlideBtn.addEventListener('click', () => { prevSlide(); startAutoSlide(); });
  if (nextSlideBtn) nextSlideBtn.addEventListener('click', () => { nextSlide(); startAutoSlide(); });

  // Build hero carousel from featured verified products
  const buildHeroCarousel = () => {
    const featured = state.allProducts.filter(p => p.is_daily_deal || p.rating >= 4.5).slice(0, 4);

    if (featured.length === 0) {
      heroWelcome.style.display = 'block';
      carouselContainer.style.display = 'none';
      return;
    }

    heroWelcome.style.display = 'none';
    carouselContainer.style.display = 'block';

    carouselTrack.innerHTML = featured.map((p, i) => {
      const discount = p.list_price ? Math.round(((p.list_price - p.current_price) / p.list_price) * 100) : 0;
      return `
        <div class="carousel-slide ${i === 0 ? 'active' : ''}" data-slide="${i}">
          <div class="hero-card">
            <div class="hero-content">
              <div class="hero-badges">
                <span class="deal-pill">${p.is_daily_deal ? '⚡ DAILY DEAL' : '⭐ TOP RATED'}</span>
              </div>
              <h2 class="hero-title">${escapeHtml(p.title)}</h2>
              <div class="hero-price-wrap">
                <div class="price-main"><span class="curr-symbol">₹</span><span class="price-val">${formatINR(p.current_price)}</span></div>
                ${p.list_price ? `<div class="mrp-wrap"><span class="mrp-label">M.R.P:</span><span class="mrp-val">₹${formatINR(p.list_price)}</span></div>` : ''}
                ${discount > 0 ? `<span class="savings-badge">${discount}% OFF</span>` : ''}
              </div>
              <div class="hero-actions">
                <a href="${p.affiliate_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Buy on Amazon.in ↗</a>
                <span class="hero-ad-tag">#ad</span>
              </div>
            </div>
            <div class="hero-image-wrap">
              <img src="${p.image_url}" alt="${escapeHtml(p.title)}" class="hero-img" referrerpolicy="no-referrer" loading="eager">
            </div>
          </div>
        </div>
      `;
    }).join('');

    carouselDots.innerHTML = featured.map((_, i) => `
      <button class="dot ${i === 0 ? 'active' : ''}" data-slide-to="${i}" aria-label="Slide ${i + 1}"></button>
    `).join('');

    // Re-bind dot clicks
    document.querySelectorAll('.dot').forEach(dot => {
      dot.addEventListener('click', () => { showSlide(parseInt(dot.dataset.slideTo)); startAutoSlide(); });
    });

    startAutoSlide();
  };

  // Fetch & Render
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?category=all&ratingTier=all_acceptable');
      const json = await res.json();
      if (json.success && json.data) {
        state.allProducts = json.data;
        buildHeroCarousel();
        applyFiltersAndRender();
      } else {
        showEmpty();
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      showEmpty();
    }
  };

  const showEmpty = () => {
    productsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    resultsCount.innerHTML = 'Showing <strong>0</strong> products';
  };

  const applyFiltersAndRender = () => {
    let list = [...state.allProducts];

    if (state.searchQuery && state.searchQuery.trim() !== '') {
      const q = state.searchQuery.trim().toLowerCase();
      list = list.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.asin && p.asin.toLowerCase().includes(q)) ||
        (p.category_label && p.category_label.toLowerCase().includes(q))
      );
    } else {
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

    if (state.currentRatingTier === 'top_rated') {
      list = list.filter(p => parseFloat(p.rating) >= 4.0);
    } else if (state.currentRatingTier === 'value_picks') {
      list = list.filter(p => parseFloat(p.rating) >= 3.5 && parseFloat(p.rating) < 4.0);
    } else {
      list = list.filter(p => parseFloat(p.rating) >= 3.5);
    }

    if (state.currentSort === 'discount') {
      list.sort((a, b) => {
        const dA = a.list_price ? ((a.list_price - a.current_price) / a.list_price) : 0;
        const dB = b.list_price ? ((b.list_price - b.current_price) / b.list_price) : 0;
        return dB - dA;
      });
    } else if (state.currentSort === 'rating') { list.sort((a, b) => b.rating - a.rating); }
    else if (state.currentSort === 'price_asc') { list.sort((a, b) => a.current_price - b.current_price); }
    else if (state.currentSort === 'price_desc') { list.sort((a, b) => b.current_price - a.current_price); }

    state.displayedProducts = list;
    renderGrid();
  };

  const renderGrid = () => {
    if (!state.displayedProducts || state.displayedProducts.length === 0) {
      showEmpty();
      return;
    }

    productsGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    resultsCount.innerHTML = `Showing <strong>${state.displayedProducts.length}</strong> verified products`;

    productsGrid.innerHTML = state.displayedProducts.map(p => {
      const discount = p.list_price ? Math.round(((p.list_price - p.current_price) / p.list_price) * 100) : 0;
      return `
        <article class="product-card" id="card-${p.asin}">
          <div class="card-media-wrap">
            <div class="card-badges">
              ${p.is_daily_deal ? '<span class="badge-deal">⚡ DAILY DEAL</span>' : ''}
              <span class="badge-cat">${p.category_label || 'Curated'}</span>
            </div>
            <img src="${p.image_url}" alt="${escapeHtml(p.title)}" class="card-img" referrerpolicy="no-referrer" loading="lazy">
          </div>
          <div class="card-body">
            <div class="card-brand">${escapeHtml(p.brand || '')}</div>
            <h3 class="card-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</h3>
            <div class="card-rating-wrap">
              <span class="rating-stars">⭐ ${p.rating}</span>
              ${p.reviews_count ? `<span class="review-count">(${Number(p.reviews_count).toLocaleString()} ratings)</span>` : ''}
            </div>
            <div class="card-pricing">
              <span class="card-curr-price">₹${formatINR(p.current_price)}</span>
              ${p.list_price ? `<span class="card-list-price">₹${formatINR(p.list_price)}</span>` : ''}
              ${discount > 0 ? `<span class="card-discount-tag">${discount}% OFF</span>` : ''}
            </div>
            <div class="card-footer-action">
              <a href="${p.affiliate_url}" target="_blank" rel="noopener noreferrer" class="card-buy-btn">Buy on Amazon ↗</a>
              <span class="ad-label">#ad</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  };

  // Event Listeners
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      categoryTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active'); tab.setAttribute('aria-selected', 'true');
      state.currentCategory = tab.dataset.category;
      state.searchQuery = ''; searchInput.value = ''; clearSearchBtn.style.display = 'none';
      applyFiltersAndRender();
    });
  });

  ratingPills.forEach(pill => {
    pill.addEventListener('click', () => {
      ratingPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.currentRatingTier = pill.dataset.rating;
      applyFiltersAndRender();
    });
  });

  sortSelect.addEventListener('change', (e) => { state.currentSort = e.target.value; applyFiltersAndRender(); });

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    clearSearchBtn.style.display = e.target.value.trim().length > 0 ? 'block' : 'none';
    applyFiltersAndRender();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = ''; clearSearchBtn.style.display = 'none'; state.searchQuery = '';
    applyFiltersAndRender(); searchInput.focus();
  });

  // Feedback Modal Controls
  const feedbackModal = document.getElementById('feedbackModal');
  const openFeedbackBtn = document.getElementById('openFeedbackBtn');
  const closeFeedbackBtn = document.getElementById('closeFeedbackBtn');
  const cancelFeedbackBtn = document.getElementById('cancelFeedbackBtn');
  const feedbackForm = document.getElementById('feedbackForm');
  const feedbackStatus = document.getElementById('feedbackStatus');
  const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');

  if (openFeedbackBtn && feedbackModal) {
    openFeedbackBtn.addEventListener('click', () => {
      feedbackModal.style.display = 'flex';
      feedbackStatus.style.display = 'none';
      feedbackForm.reset();
    });

    const closeModal = () => { feedbackModal.style.display = 'none'; };
    if (closeFeedbackBtn) closeFeedbackBtn.addEventListener('click', closeModal);
    if (cancelFeedbackBtn) cancelFeedbackBtn.addEventListener('click', closeModal);
    feedbackModal.addEventListener('click', (e) => {
      if (e.target === feedbackModal) closeModal();
    });

    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitFeedbackBtn.disabled = true;
      submitFeedbackBtn.textContent = 'Submitting...';

      const payload = {
        category: document.getElementById('feedbackCategory').value,
        asin: document.getElementById('feedbackAsin').value.trim(),
        message: document.getElementById('feedbackMessage').value.trim(),
        contact: document.getElementById('feedbackContact').value.trim()
      };

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          feedbackStatus.className = 'feedback-status status-success';
          feedbackStatus.textContent = '✅ Thank you! Your feedback has been received and logged for review.';
          feedbackStatus.style.display = 'block';
          feedbackForm.reset();
          setTimeout(() => { closeModal(); }, 2500);
        } else {
          feedbackStatus.className = 'feedback-status status-error';
          feedbackStatus.textContent = `❌ ${data.error || 'Failed to submit feedback.'}`;
          feedbackStatus.style.display = 'block';
        }
      } catch (err) {
        feedbackStatus.className = 'feedback-status status-error';
        feedbackStatus.textContent = `❌ Network error: ${err.message}`;
        feedbackStatus.style.display = 'block';
      } finally {
        submitFeedbackBtn.disabled = false;
        submitFeedbackBtn.textContent = 'Submit Feedback ↗';
      }
    });
  }

  fetchProducts();
});

