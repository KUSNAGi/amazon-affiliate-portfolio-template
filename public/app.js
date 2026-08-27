/**
 * Affiliate Hub — Amazon Multi-Category Storefront Controller
 * Features: Multi-Category Widgets, Dedicated Books Section, Department Filters,
 * Search, Wishlist (Save-for-Later), Medium-Length Pagination / Load More, Smooth Scroll
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let allProducts = [];
  let currentCategory = 'all';
  let currentDepartment = 'all';
  let currentRatingTier = 'all_acceptable';
  let currentSort = 'discount';
  let searchQuery = '';
  let visibleCount = 24;
  const PAGE_SIZE = 24;
  let wishlist = JSON.parse(localStorage.getItem('affiliate_wishlist') || '[]');

  // DOM Elements
  const productsGrid = document.getElementById('productsGrid');
  const resultsCount = document.getElementById('resultsCount');
  const emptyState = document.getElementById('emptyState');
  const loadMoreWrap = document.getElementById('loadMoreWrap');
  const loadMoreInfo = document.getElementById('loadMoreInfo');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const booksGrid = document.getElementById('booksGrid');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchCategorySelect = document.getElementById('searchCategorySelect');
  const searchSuggestionsBox = document.getElementById('searchSuggestionsBox');
  const searchSubmitBtn = document.getElementById('searchSubmitBtn');
  const sortSelect = document.getElementById('sortSelect');
  const departmentPills = document.querySelectorAll('.dept-pill');
  const ratingPills = document.querySelectorAll('.rating-pill');
  const subNavItems = document.querySelectorAll('.sub-nav-item');

  // Wishlist Elements
  const openWishlistBtn = document.getElementById('openWishlistBtn');
  const wishlistOverlay = document.getElementById('wishlistOverlay');
  const closeWishlistBtn = document.getElementById('closeWishlistBtn');
  const wishlistCountBadge = document.getElementById('wishlistCountBadge');
  const drawerWishlistCount = document.getElementById('drawerWishlistCount');
  const wishlistItemsList = document.getElementById('wishlistItemsList');
  const wishlistEmptyState = document.getElementById('wishlistEmptyState');
  const wishlistDrawerFooter = document.getElementById('wishlistDrawerFooter');
  const clearAllWishlistBtn = document.getElementById('clearAllWishlistBtn');

  // Feedback Elements
  const openFeedbackBtn = document.getElementById('openFeedbackBtn');
  const feedbackModal = document.getElementById('feedbackModal');
  const closeFeedbackBtn = document.getElementById('closeFeedbackBtn');
  const cancelFeedbackBtn = document.getElementById('cancelFeedbackBtn');
  const feedbackForm = document.getElementById('feedbackForm');
  const feedbackStatus = document.getElementById('feedbackStatus');

  // Dynamic Timestamp for Amazon Compliance
  const updateLiveTimestamp = () => {
    const badge = document.getElementById('liveTimestampBadge');
    if (badge) {
      const now = new Date();
      const options = { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'Asia/Kolkata',
        hour12: true 
      };
      badge.textContent = now.toLocaleString('en-IN', options);
    }
  };

  // Live Countdown Clock to Next 2-Hour Cron Cycle
  const startCountdownTimer = () => {
    const clockEl = document.getElementById('countdownClock');
    if (!clockEl) return;

    const updateClock = () => {
      const now = new Date();
      const nextCycle = new Date(now);
      const currentHour = now.getHours();
      const nextHour = currentHour % 2 === 0 ? currentHour + 2 : currentHour + 1;
      nextCycle.setHours(nextHour, 0, 0, 0);

      const diffMs = nextCycle - now;
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60)).toString().padStart(2, '0');
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000).toString().padStart(2, '0');
        clockEl.textContent = `${hours}:${minutes}:${seconds}`;
      }
    };

    updateClock();
    setInterval(updateClock, 1000);
  };

  // =============================================
  // 1. INITIALIZE & FETCH CATALOG
  // =============================================
  const fetchProducts = async () => {
    try {
      updateLiveTimestamp();
      startCountdownTimer();
      if (resultsCount) resultsCount.textContent = 'Loading verified Amazon products...';
      const res = await fetch('/api/products');
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        allProducts = data.data;
        renderFeaturedWidgets();
        renderDedicatedBooksSection();
        renderProducts();
      } else {
        showEmptyState('Unable to load products. Please check back shortly.');
      }
    } catch (err) {
      console.error('Error fetching catalog:', err);
      showEmptyState('Network error loading verified products.');
    }
  };

  // =============================================
  // 2. RENDER 2x2 FEATURED CATEGORY WIDGETS
  // =============================================
  const renderFeaturedWidgets = () => {
    const getByAsinsOrFilter = (targetAsins, filterFn) => {
      const found = [];
      for (const asin of targetAsins) {
        const item = allProducts.find(p => p.asin === asin);
        if (item) found.push(item);
      }
      if (found.length < 4) {
        const remaining = allProducts.filter(p => filterFn(p) && !found.some(f => f.asin === p.asin));
        found.push(...remaining.slice(0, 4 - found.length));
      }
      return found.slice(0, 4);
    };

    // 1. Mobiles
    const mobiles = getByAsinsOrFilter(
      ['B00SAMPLE02'],
      p => {
        const text = (p.title + ' ' + (p.brand || '') + ' ' + (p.category_label || '')).toLowerCase();
        return text.includes('phone') || text.includes('galaxy') || text.includes('5g') || text.includes('oneplus') || text.includes('redmi') || text.includes('realme') || text.includes('mobile');
      }
    );
    renderWidgetGrid('widgetGridMobiles', mobiles);

    // 2. Electronics & Audio
    const audio = getByAsinsOrFilter(
      ['B00SAMPLE01'],
      p => {
        const text = (p.title + ' ' + (p.brand || '') + ' ' + (p.category_label || '')).toLowerCase();
        return text.includes('earbud') || text.includes('headphone') || text.includes('bluetooth') || text.includes('speaker') || text.includes('audio');
      }
    );
    renderWidgetGrid('widgetGridElectronics', audio);

    // 3. Home & Kitchen
    const homeKitchen = getByAsinsOrFilter(
      ['B00SAMPLE03', 'B00SAMPLE05'],
      p => {
        const text = (p.title + ' ' + (p.brand || '') + ' ' + (p.category_label || '')).toLowerCase();
        return text.includes('fryer') || text.includes('cooker') || text.includes('vacuum') || text.includes('kettle') || text.includes('bottle') || text.includes('kitchen') || text.includes('cleaner') || p.category === 'home_kitchen' || p.category === 'kitchen_needs' || p.category === 'home_needs';
      }
    );
    renderWidgetGrid('widgetGridHomeKitchen', homeKitchen);
  };

  const renderWidgetGrid = (containerId, items) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = '<div class="widget-cell-loading">Exploring top Amazon recommendations...</div>';
      return;
    }

    container.innerHTML = items.map(p => {
      const discPercent = p.list_price && p.list_price > p.current_price
        ? Math.round(((p.list_price - p.current_price) / p.list_price) * 100)
        : null;

      return `
        <a href="${escapeHtml(p.affiliate_url)}" target="_blank" rel="noopener noreferrer" class="widget-cell" title="${escapeHtml(p.title)}">
          <div class="widget-cell-img-wrap">
            <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.onerror=null;this.src='https://m.media-amazon.com/images/I/71UWSHSZRnL._SX679_.jpg'">
          </div>
          <div class="widget-cell-title">${escapeHtml(p.title)}</div>
          <div class="widget-cell-price">
            ₹${(p.current_price || 0).toLocaleString('en-IN')}
            ${discPercent ? `<span class="discount-pill" style="font-size:0.65rem; margin-left:3px;">${discPercent}% off</span>` : ''}
          </div>
        </a>
      `;
    }).join('');
  };

  // =============================================
  // 3. RENDER DEDICATED BOOKS & KINDLE SECTION
  // =============================================
  const renderDedicatedBooksSection = () => {
    if (!booksGrid) return;
    const isBookProduct = (p) => {
      if (p.category === 'kindle_books' || p.category_label === 'Kindle & Print Books') return true;
      const t = (p.title || '').toLowerCase();
      if (t.includes('vivobook') || t.includes('omnibook') || t.includes('macbook') || t.includes('chromebook') || t.includes('sleeve') || t.includes('laptop')) {
        return false;
      }
      return t.includes('kindle') || t.includes('paperback') || t.includes('hardcover') || t.includes('atomic habits') || t.includes('psychology of money') || t.includes('ikigai') || t.includes('rich dad poor dad') || t.includes('novel');
    };

    let books = allProducts.filter(isBookProduct).slice(0, 6);
    if (books.length === 0) {
      books = [
        {
          asin: 'B00SAMPLE1',
          title: 'Sample Bestselling Book (Paperback Edition)',
          brand: 'Demo Publishing',
          current_price: 482,
          list_price: 899,
          rating: 4.6,
          reviews_count: 84200,
          image_url: 'https://m.media-amazon.com/images/I/817HaeblezL._SY522_.jpg',
          affiliate_url: 'https://www.amazon.in/dp/B00SAMPLE1?tag=your-tag-21'
        },
        {
          asin: 'B00SAMPLE2',
          title: 'Sample Personal Finance Guide (Timeless Lessons)',
          brand: 'Demo Books',
          current_price: 289,
          list_price: 399,
          rating: 4.6,
          reviews_count: 58900,
          image_url: 'https://m.media-amazon.com/images/I/71XEsXS5RlL._SY522_.jpg',
          affiliate_url: 'https://www.amazon.in/dp/B00SAMPLE2?tag=your-tag-21'
        },
        {
          asin: 'B00SAMPLE3',
          title: 'Sample Business Growth Guide (Anniversary Edition)',
          brand: 'Demo Publishing',
          current_price: 356,
          list_price: 599,
          rating: 4.6,
          reviews_count: 94100,
          image_url: 'https://m.media-amazon.com/images/I/71HJj3XmheL._SY522_.jpg',
          affiliate_url: 'https://www.amazon.in/dp/B00SAMPLE3?tag=your-tag-21'
        },
        {
          asin: 'B00SAMPLE4',
          title: 'Sample Self Improvement & Mindset Handbook',
          brand: 'Demo Reads',
          current_price: 79,
          list_price: 300,
          rating: 4.5,
          reviews_count: 72000,
          image_url: 'https://m.media-amazon.com/images/I/61g-2qsaLyL._SY522_.jpg',
          affiliate_url: 'https://www.amazon.in/dp/B00SAMPLE4?tag=your-tag-21'
        },
        {
          asin: 'B00SAMPLE5',
          title: 'Sample Classic Success Philosophy',
          brand: 'Demo Publishing',
          current_price: 112,
          list_price: 150,
          rating: 4.5,
          reviews_count: 46000,
          image_url: 'https://m.media-amazon.com/images/I/61FhJphSdSL._SY522_.jpg',
          affiliate_url: 'https://www.amazon.in/dp/B00SAMPLE5?tag=your-tag-21'
        },
        {
          asin: 'B00SAMPLE6',
          title: 'Sample All-New E-Reader with Glare-Free Display',
          brand: 'Demo Brands',
          current_price: 16999,
          list_price: 21999,
          rating: 4.6,
          reviews_count: 7800,
          image_url: 'https://m.media-amazon.com/images/I/71TqfspCXlL._SY879_.jpg',
          affiliate_url: 'https://www.amazon.in/dp/B00SAMPLE6?tag=your-tag-21'
        }
      ];
    }

    booksGrid.innerHTML = books.map(b => {
      const isSaved = wishlist.some(item => item.asin === b.asin);
      const discPercent = b.list_price && b.list_price > b.current_price
        ? Math.round(((b.list_price - b.current_price) / b.list_price) * 100)
        : null;

      return `
        <div class="book-card" data-asin="${escapeHtml(b.asin)}">
          <button class="card-save-btn ${isSaved ? 'saved' : ''}" data-asin="${escapeHtml(b.asin)}" title="${isSaved ? 'Remove from Saved' : 'Save for Later'}" aria-label="Save for later">
            ${isSaved ? '❤️' : '🤍'}
          </button>
          <div class="book-img-wrap">
            <img src="${escapeHtml(b.image_url)}" alt="${escapeHtml(b.title)}" loading="lazy" onerror="this.onerror=null;this.src='https://m.media-amazon.com/images/I/71UWSHSZRnL._SX679_.jpg'">
          </div>
          <div class="book-tag">📖 ${escapeHtml(b.brand || 'Bestseller')}</div>
          <h3 class="book-title" title="${escapeHtml(b.title)}">${escapeHtml(b.title)}</h3>
          
          <div class="card-rating-row">
            <span class="stars-rating">${renderStarRating(b.rating || 4.5)}</span>
            <span class="rating-num">${b.rating || 4.5}</span>
            <span class="reviews-count">(${b.reviews_count ? b.reviews_count.toLocaleString('en-IN') : '10k+'})</span>
          </div>

          <div class="card-price-row">
            ${discPercent ? `<span class="discount-pill">${discPercent}% off</span>` : ''}
            <span class="current-price">₹${(b.current_price || 0).toLocaleString('en-IN')}</span>
            ${b.list_price && b.list_price > b.current_price ? `<span class="list-price">₹${(b.list_price || 0).toLocaleString('en-IN')}</span>` : ''}
          </div>

          <a href="${escapeHtml(b.affiliate_url)}" target="_blank" rel="noopener noreferrer" class="card-buy-btn">
            Buy on Amazon ↗
          </a>
        </div>
      `;
    }).join('');
  };

  // =============================================
  // 4. RENDER TODAY'S BIG DEALS (PAGINATED)
  // =============================================
  const renderProducts = (isAppend = false) => {
    let filtered = [...allProducts];

    // Category filter
    if (currentCategory && currentCategory !== 'all') {
      const cat = currentCategory.toLowerCase();
      filtered = filtered.filter(p => {
        const text = (p.title + ' ' + (p.brand || '') + ' ' + (p.category_label || '') + ' ' + (p.category || '')).toLowerCase();
        if (cat === 'mobiles') return text.includes('phone') || text.includes('galaxy') || text.includes('5g') || text.includes('oneplus') || text.includes('redmi') || text.includes('realme') || text.includes('mobile');
        if (cat === 'electronics_gadgets') return text.includes('earbud') || text.includes('headphone') || text.includes('airdopes') || text.includes('rockerz') || text.includes('bluetooth') || text.includes('speaker') || text.includes('audio') || p.category === 'gadgets_electronics';
        if (cat === 'kitchen_needs') return text.includes('cooker') || text.includes('fryer') || text.includes('kitchen') || text.includes('kettle') || text.includes('bottle') || text.includes('blender') || p.category === 'home_kitchen';
        if (cat === 'home_needs') return text.includes('vacuum') || text.includes('cleaner') || text.includes('home') || text.includes('decor') || text.includes('mop') || text.includes('purifier');
        if (cat === 'womens_fashion') return text.includes('women') || text.includes('saree') || text.includes('kurti') || text.includes('dress') || text.includes('jewelry') || text.includes('beauty') || text.includes('lipstick');
        if (cat === 'amazon_brands') return text.includes('solimo') || text.includes('amazon basics') || text.includes('fire tv') || text.includes('echo');
        if (cat === 'gift_cards') return text.includes('card') || text.includes('voucher') || text.includes('gift');
        if (cat === 'kindle_books') return text.includes('book') || text.includes('novel') || text.includes('paperback') || text.includes('kindle');
        if (cat === 'daily_deals') return p.is_daily_deal === true;
        return p.category === cat;
      });
    }

    // Department Quick filter
    if (currentDepartment && currentDepartment !== 'all') {
      if (currentDepartment === 'trending') {
        filtered = filtered.filter(p => p.rating >= 4.0 && (p.reviews_count > 500 || (p.list_price && (p.list_price - p.current_price)/p.list_price >= 0.3)));
      } else if (currentDepartment === 'most_loved') {
        filtered = filtered.filter(p => p.rating >= 4.2);
      } else if (currentDepartment === 'lightning_deals') {
        filtered = filtered.filter(p => p.list_price && ((p.list_price - p.current_price) / p.list_price) >= 0.35);
      }
    }

    // Rating filter
    if (currentRatingTier === 'top_rated') {
      filtered = filtered.filter(p => parseFloat(p.rating) >= 4.0);
    } else if (currentRatingTier === 'value_picks') {
      filtered = filtered.filter(p => parseFloat(p.rating) >= 3.5 && parseFloat(p.rating) < 4.0);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.asin && p.asin.toLowerCase().includes(q)) ||
        (p.category_label && p.category_label.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (currentSort === 'discount') {
      filtered.sort((a, b) => {
        const discA = a.list_price ? ((a.list_price - a.current_price) / a.list_price) : 0;
        const discB = b.list_price ? ((b.list_price - b.current_price) / b.list_price) : 0;
        return discB - discA;
      });
    } else if (currentSort === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (currentSort === 'price_asc') {
      filtered.sort((a, b) => a.current_price - b.current_price);
    } else if (currentSort === 'price_desc') {
      filtered.sort((a, b) => b.current_price - a.current_price);
    }

    const totalCount = filtered.length;

    // Render Count
    if (resultsCount) {
      resultsCount.innerHTML = `Showing <strong>${Math.min(visibleCount, totalCount)}</strong> of <strong>${totalCount}</strong> verified Amazon deals`;
    }

    if (totalCount === 0) {
      if (productsGrid) productsGrid.style.display = 'none';
      if (loadMoreWrap) loadMoreWrap.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (productsGrid) {
      productsGrid.style.display = 'grid';
      const itemsToRender = filtered.slice(0, visibleCount);
      productsGrid.innerHTML = itemsToRender.map(p => renderProductCard(p)).join('');
    }

    // Pagination / Load More UI
    if (loadMoreWrap) {
      if (visibleCount < totalCount) {
        loadMoreWrap.style.display = 'flex';
        if (loadMoreInfo) loadMoreInfo.textContent = `Showing ${Math.min(visibleCount, totalCount)} of ${totalCount} products`;
      } else {
        loadMoreWrap.style.display = 'none';
      }
    }

    attachCardEventListeners();
  };

  // Helper to render single Amazon card
  const renderProductCard = (p) => {
    const isSaved = wishlist.some(item => item.asin === p.asin);
    const discPercent = p.list_price && p.list_price > p.current_price
      ? Math.round(((p.list_price - p.current_price) / p.list_price) * 100)
      : null;

    const starsHtml = renderStarRating(p.rating || 4.0);

    return `
      <div class="product-card" data-asin="${escapeHtml(p.asin)}">
        <!-- Save for Later (Wishlist) Button -->
        <button class="card-save-btn ${isSaved ? 'saved' : ''}" data-asin="${escapeHtml(p.asin)}" title="${isSaved ? 'Remove from Saved' : 'Save for Later'}" aria-label="Save for later">
          ${isSaved ? '❤️' : '🤍'}
        </button>

        <!-- Deal Badge -->
        ${discPercent && discPercent >= 20 ? `<span class="deal-tag-badge">⚡ ${discPercent}% OFF</span>` : ''}

        <!-- Product Image -->
        <div class="card-img-wrap">
          <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.onerror=null;this.src='https://m.media-amazon.com/images/I/71UWSHSZRnL._SX679_.jpg'">
        </div>

        <div class="card-content-wrap">
          <!-- Brand -->
          <div class="card-brand-tag">${escapeHtml(p.brand || 'Amazon')}</div>

          <!-- Title -->
          <h3 class="card-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</h3>

          <!-- Star Rating & Review Count -->
          <div class="card-rating-row">
            <span class="stars-rating">${starsHtml}</span>
            <span class="rating-num">${p.rating}</span>
            <span class="reviews-count">(${p.reviews_count ? p.reviews_count.toLocaleString('en-IN') : '100+'})</span>
          </div>

          <!-- Live Amazon Buybox Price & Discount -->
          <div class="card-price-row">
            ${discPercent ? `<span class="discount-pill">${discPercent}% off</span>` : ''}
            <span class="current-price">₹${(p.current_price || 0).toLocaleString('en-IN')}</span>
            ${p.list_price && p.list_price > p.current_price ? `<span class="list-price">₹${(p.list_price || 0).toLocaleString('en-IN')}</span>` : ''}
          </div>

          <div class="prime-delivery-tag">
            <span>✓ Prime & FREE Delivery</span>
          </div>

          <div class="card-verify-row">
            <span class="card-verify-badge">🛡️ Verified Live on Amazon.in</span>
          </div>
        </div>

        <!-- Direct Amazon Affiliate Buy Button & 1-Click Share Bar -->
        <div class="card-action-bar">
          <a href="${escapeHtml(p.affiliate_url)}" target="_blank" rel="noopener noreferrer" class="card-buy-btn">
            View Deal ↗
          </a>
          <button class="card-share-btn" data-asin="${escapeHtml(p.asin)}" data-title="${escapeHtml(p.title)}" data-price="${(p.current_price || 0).toLocaleString('en-IN')}" data-url="${escapeHtml(p.affiliate_url)}" title="Share Deal on WhatsApp" aria-label="Share Deal">
            💬 Share
          </button>
        </div>
      </div>
    `;
  };

  const renderStarRating = (rating) => {
    const full = Math.floor(rating);
    const half = (rating - full) >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  };

  const showEmptyState = (message) => {
    if (resultsCount) resultsCount.textContent = '0 verified products';
    if (productsGrid) productsGrid.style.display = 'none';
    if (loadMoreWrap) loadMoreWrap.style.display = 'none';
    if (emptyState) {
      emptyState.style.display = 'block';
      const p = emptyState.querySelector('p');
      if (p) p.textContent = message;
    }
  };

  // Load More Button Handler
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      visibleCount += PAGE_SIZE;
      renderProducts(true);
    });
  }

  // =============================================
  // 5. WISHLIST & 1-CLICK SHARE ENGINE
  // =============================================
  const attachCardEventListeners = () => {
    // Save for Later Buttons
    document.querySelectorAll('.card-save-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const asin = btn.getAttribute('data-asin');
        toggleWishlistItem(asin);
      });
    });

    // 1-Click Deal Share Buttons (WhatsApp / Web Share API)
    document.querySelectorAll('.card-share-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const title = btn.getAttribute('data-title');
        const price = btn.getAttribute('data-price');
        const url = btn.getAttribute('data-url');
        const shareText = `🔥 Check out this Amazon Deal: ${title} for only ₹${price} on Amazon India!\n👉 ${url} #ad #AmazonDeals`;

        if (navigator.share) {
          navigator.share({
            title: title,
            text: shareText,
            url: url
          }).catch(() => {});
        } else {
          const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        }
      });
    });
  };

  const toggleWishlistItem = (asin) => {
    const product = allProducts.find(p => p.asin === asin);
    if (!product) return;

    const existingIndex = wishlist.findIndex(item => item.asin === asin);
    if (existingIndex > -1) {
      wishlist.splice(existingIndex, 1);
    } else {
      wishlist.push({
        asin: product.asin,
        title: product.title,
        brand: product.brand,
        current_price: product.current_price,
        image_url: product.image_url,
        affiliate_url: product.affiliate_url,
        saved_at: new Date().toISOString()
      });
    }

    localStorage.setItem('affiliate_wishlist', JSON.stringify(wishlist));
    updateWishlistUI();
    renderProducts();
    renderDedicatedBooksSection();
  };

  const updateWishlistUI = () => {
    const count = wishlist.length;
    if (wishlistCountBadge) wishlistCountBadge.textContent = count;
    if (drawerWishlistCount) drawerWishlistCount.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;

    if (count === 0) {
      if (wishlistEmptyState) wishlistEmptyState.style.display = 'block';
      if (wishlistItemsList) wishlistItemsList.innerHTML = '';
      if (wishlistDrawerFooter) wishlistDrawerFooter.style.display = 'none';
      return;
    }

    if (wishlistEmptyState) wishlistEmptyState.style.display = 'none';
    if (wishlistDrawerFooter) wishlistDrawerFooter.style.display = 'flex';

    if (wishlistItemsList) {
      wishlistItemsList.innerHTML = wishlist.map(item => `
        <div class="wishlist-item-card">
          <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="wishlist-item-img" onerror="this.onerror=null;this.src='https://m.media-amazon.com/images/I/71UWSHSZRnL._SX679_.jpg'">
          <div class="wishlist-item-info">
            <h4 class="wishlist-item-title">${escapeHtml(item.title)}</h4>
            <div class="wishlist-item-price">₹${item.current_price ? Number(item.current_price).toLocaleString('en-IN') : '0'}</div>
          </div>
          <div class="wishlist-item-actions">
            <a href="${escapeHtml(item.affiliate_url)}" target="_blank" rel="noopener noreferrer" class="wishlist-buy-link">
              Buy Now ↗
            </a>
            <button class="wishlist-remove-btn" onclick="removeFromWishlist('${escapeHtml(item.asin)}')">Remove</button>
          </div>
        </div>
      `).join('');
    }
  };

  window.removeFromWishlist = (asin) => {
    wishlist = wishlist.filter(i => i.asin !== asin);
    localStorage.setItem('affiliate_wishlist', JSON.stringify(wishlist));
    updateWishlistUI();
    renderProducts();
    renderDedicatedBooksSection();
  };

  // Wishlist Drawer Toggles
  if (openWishlistBtn) {
    openWishlistBtn.addEventListener('click', () => {
      updateWishlistUI();
      if (wishlistOverlay) wishlistOverlay.style.display = 'flex';
    });
  }

  if (closeWishlistBtn) {
    closeWishlistBtn.addEventListener('click', () => {
      if (wishlistOverlay) wishlistOverlay.style.display = 'none';
    });
  }

  if (wishlistOverlay) {
    wishlistOverlay.addEventListener('click', (e) => {
      if (e.target === wishlistOverlay) wishlistOverlay.style.display = 'none';
    });
  }

  if (clearAllWishlistBtn) {
    clearAllWishlistBtn.addEventListener('click', () => {
      if (!confirm('Clear all saved items?')) return;
      wishlist = [];
      localStorage.setItem('affiliate_wishlist', JSON.stringify(wishlist));
      updateWishlistUI();
      renderProducts();
      renderDedicatedBooksSection();
    });
  }

  // =============================================
  // 6. SEARCH & LIVE AUTOCOMPLETE ENGINE
  // =============================================
  const renderSearchSuggestions = (query) => {
    if (!searchSuggestionsBox) return;
    const cleanQuery = (query || '').trim().toLowerCase();

    if (!cleanQuery) {
      searchSuggestionsBox.style.display = 'none';
      searchSuggestionsBox.innerHTML = '';
      return;
    }

    const selectedDept = searchCategorySelect ? searchCategorySelect.value : 'all';

    let matches = allProducts.filter(p => {
      const text = `${p.title} ${p.brand || ''} ${p.category_label || ''} ${p.asin || ''}`.toLowerCase();
      if (!text.includes(cleanQuery)) return false;
      if (selectedDept !== 'all') {
        const cat = selectedDept.toLowerCase();
        const pText = (p.title + ' ' + (p.brand || '') + ' ' + (p.category_label || '') + ' ' + (p.category || '')).toLowerCase();
        if (cat === 'mobiles' && !(pText.includes('phone') || pText.includes('galaxy') || pText.includes('5g') || pText.includes('oneplus') || pText.includes('redmi') || pText.includes('realme') || pText.includes('mobile'))) return false;
        if (cat === 'electronics_gadgets' && !(pText.includes('earbud') || pText.includes('headphone') || pText.includes('airdopes') || pText.includes('rockerz') || pText.includes('bluetooth') || pText.includes('speaker') || pText.includes('audio') || p.category === 'gadgets_electronics')) return false;
        if (cat === 'kindle_books' && !(pText.includes('kindle') || pText.includes('paperback') || pText.includes('hardcover') || p.category === 'kindle_books')) return false;
        if (cat === 'kitchen_needs' && !(pText.includes('cooker') || pText.includes('fryer') || pText.includes('kitchen') || pText.includes('kettle') || pText.includes('bottle') || pText.includes('blender') || p.category === 'home_kitchen')) return false;
      }
      return true;
    }).slice(0, 6);

    if (matches.length === 0) {
      searchSuggestionsBox.innerHTML = `
        <div style="padding: 0.85rem 1rem; color: #64748b; font-size: 0.85rem; text-align: center;">
          No matching products found for "<strong>${escapeHtml(query)}</strong>"
        </div>
      `;
      searchSuggestionsBox.style.display = 'block';
      return;
    }

    searchSuggestionsBox.innerHTML = matches.map(p => {
      const discPercent = p.list_price && p.list_price > p.current_price
        ? Math.round(((p.list_price - p.current_price) / p.list_price) * 100)
        : null;

      return `
        <div class="suggestion-item" data-asin="${escapeHtml(p.asin)}" data-title="${escapeHtml(p.title)}">
          <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" class="suggestion-thumb" onerror="this.onerror=null;this.src='https://m.media-amazon.com/images/I/71UWSHSZRnL._SX679_.jpg'">
          <div class="suggestion-info">
            <div class="suggestion-title">${escapeHtml(p.title)}</div>
            <div class="suggestion-meta">
              <span class="suggestion-price">₹${(p.current_price || 0).toLocaleString('en-IN')}</span>
              ${discPercent ? `<span class="discount-pill" style="font-size:0.65rem;">${discPercent}% off</span>` : ''}
              <span class="suggestion-category">${escapeHtml(p.category_label || p.brand || 'Amazon')}</span>
            </div>
          </div>
        </div>
      `;
    }).join('') + `
      <div class="suggestion-view-all" id="suggestionViewAll">
        🔍 View all matching results for "${escapeHtml(query)}" ➔
      </div>
    `;

    searchSuggestionsBox.style.display = 'block';

    // Click handler on individual suggestion
    searchSuggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        const title = item.getAttribute('data-title');
        if (searchInput) searchInput.value = title;
        searchQuery = title;
        visibleCount = PAGE_SIZE;
        searchSuggestionsBox.style.display = 'none';
        if (clearSearchBtn) clearSearchBtn.style.display = 'block';
        renderProducts();
        scrollToSection('todaysDealsSection');
      });
    });

    const viewAllBtn = document.getElementById('suggestionViewAll');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        executeSearch();
      });
    }
  };

  const executeSearch = () => {
    if (!searchInput) return;
    searchQuery = searchInput.value.trim();
    visibleCount = PAGE_SIZE;
    if (searchSuggestionsBox) searchSuggestionsBox.style.display = 'none';
    if (clearSearchBtn) clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    renderProducts();
    scrollToSection('todaysDealsSection');
  };

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      visibleCount = PAGE_SIZE;
      if (clearSearchBtn) clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      renderSearchSuggestions(searchQuery);
      renderProducts();
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) {
        renderSearchSuggestions(searchInput.value.trim());
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSearch();
      } else if (e.key === 'Escape') {
        if (searchSuggestionsBox) searchSuggestionsBox.style.display = 'none';
      }
    });
  }

  if (searchSubmitBtn) {
    searchSubmitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      executeSearch();
    });
  }

  // Click outside to hide search suggestions
  document.addEventListener('click', (e) => {
    if (searchSuggestionsBox && !searchSuggestionsBox.contains(e.target) && e.target !== searchInput) {
      searchSuggestionsBox.style.display = 'none';
    }
  });

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchQuery = '';
      visibleCount = PAGE_SIZE;
      if (searchInput) searchInput.value = '';
      if (searchSuggestionsBox) {
        searchSuggestionsBox.style.display = 'none';
        searchSuggestionsBox.innerHTML = '';
      }
      clearSearchBtn.style.display = 'none';
      renderProducts();
    });
  }

  if (searchCategorySelect) {
    searchCategorySelect.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      visibleCount = PAGE_SIZE;
      updateActiveNavAndPills(currentCategory);
      renderProducts();
      scrollToSection('todaysDealsSection');
    });
  }

  // Department quick filter pills
  departmentPills.forEach(pill => {
    pill.addEventListener('click', () => {
      departmentPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      visibleCount = PAGE_SIZE;

      if (pill.dataset.dept) {
        currentDepartment = pill.dataset.dept;
        currentCategory = 'all';
      } else if (pill.dataset.cat) {
        currentCategory = pill.dataset.cat;
        currentDepartment = 'all';
      }
      renderProducts();
      scrollToSection('todaysDealsSection');
    });
  });

  // Rating Filter Pills
  ratingPills.forEach(pill => {
    pill.addEventListener('click', () => {
      ratingPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentRatingTier = pill.dataset.rating;
      visibleCount = PAGE_SIZE;
      renderProducts();
    });
  });

  // Sort Selector
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      visibleCount = PAGE_SIZE;
      renderProducts();
    });
  }

  // Sub-nav Items with Smooth Scroll
  subNavItems.forEach(item => {
    const href = item.getAttribute('href');
    if (href && href.startsWith('#')) {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        subNavItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const cat = item.dataset.category;
        const targetId = href.substring(1);

        if (cat) {
          currentCategory = cat;
          currentDepartment = 'all';
          visibleCount = PAGE_SIZE;
          updateDepartmentPillActive(cat);
          renderProducts();
        }

        scrollToSection(targetId);
      });
    }
  });

  const scrollToSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  window.filterByCategory = (cat) => {
    currentCategory = cat;
    currentDepartment = 'all';
    visibleCount = PAGE_SIZE;
    updateDepartmentPillActive(cat);
    renderProducts();
    scrollToSection('todaysDealsSection');
  };

  window.resetAllFilters = () => {
    currentCategory = 'all';
    currentDepartment = 'all';
    currentRatingTier = 'all_acceptable';
    currentSort = 'discount';
    searchQuery = '';
    visibleCount = PAGE_SIZE;
    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    if (searchCategorySelect) searchCategorySelect.value = 'all';
    if (sortSelect) sortSelect.value = 'discount';

    departmentPills.forEach(p => p.classList.toggle('active', p.dataset.dept === 'all'));
    ratingPills.forEach(p => p.classList.toggle('active', p.dataset.rating === 'all_acceptable'));
    renderProducts();
  };

  const updateDepartmentPillActive = (cat) => {
    departmentPills.forEach(p => {
      if (p.dataset.cat === cat || (cat === 'all' && p.dataset.dept === 'all')) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  };

  const updateActiveNavAndPills = (cat) => {
    updateDepartmentPillActive(cat);
  };

  // =============================================
  // 7. CUSTOMER FEEDBACK MODAL (Zero Public Gmail)
  // =============================================
  if (openFeedbackBtn && feedbackModal) {
    openFeedbackBtn.addEventListener('click', () => {
      feedbackModal.style.display = 'flex';
      if (feedbackStatus) feedbackStatus.style.display = 'none';
    });
  }

  const closeFeedback = () => {
    if (feedbackModal) feedbackModal.style.display = 'none';
  };

  if (closeFeedbackBtn) closeFeedbackBtn.addEventListener('click', closeFeedback);
  if (cancelFeedbackBtn) cancelFeedbackBtn.addEventListener('click', closeFeedback);

  if (feedbackModal) {
    feedbackModal.addEventListener('click', (e) => {
      if (e.target === feedbackModal) closeFeedback();
    });
  }

  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const category = document.getElementById('feedbackCategory').value;
      const asin = document.getElementById('feedbackAsin').value.trim();
      const message = document.getElementById('feedbackMessage').value.trim();
      const contact = document.getElementById('feedbackContact').value.trim();

      const submitBtn = document.getElementById('submitFeedbackBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, asin, message, contact })
        });
        const data = await res.json();

        if (data.success) {
          if (feedbackStatus) {
            feedbackStatus.style.display = 'block';
            feedbackStatus.style.background = 'rgba(16, 185, 129, 0.15)';
            feedbackStatus.style.color = '#059669';
            feedbackStatus.textContent = '✅ Thank you! Your report has been submitted to the supervisor dashboard.';
          }
          setTimeout(() => {
            closeFeedback();
            feedbackForm.reset();
          }, 1500);
        }
      } catch (err) {
        if (feedbackStatus) {
          feedbackStatus.style.display = 'block';
          feedbackStatus.style.background = 'rgba(239, 68, 68, 0.15)';
          feedbackStatus.style.color = '#dc2626';
          feedbackStatus.textContent = '❌ Failed to submit feedback. Please try again.';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Feedback ↗';
        }
      }
    });
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial Load
  updateWishlistUI();
  fetchProducts();
});
