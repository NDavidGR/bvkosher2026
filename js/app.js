/* ═══════════════════════════════════════════════
   BEST VALUE KOSHER CATALOG — app.js
   ═══════════════════════════════════════════════ */

const SUPABASE_URL = 'https://kvyapficqpytntggnzto.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2eWFwZmljcXB5dG50Z2duenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjY1MDMsImV4cCI6MjA5MjgwMjUwM30.VhUxEm2gDsgjVszzA-mxiyHB2TbYQQacITNixZC5dhU';

const PAGE_SIZE = 50;

let allProducts = [];
let filteredProducts = [];
let visibleCount = PAGE_SIZE;

let filters = {
  search: '',
  category: '',
  brand: '',
  storage: [],
  seasonArr: [],
  classArr: [],
  isNew: false,
  brandArr: []
};

// ── HOMEPAGE / CATALOG TOGGLE ─────────────────────
function showCatalog() {
  document.getElementById('homepage').style.display = 'none';
  document.getElementById('catalog-view').style.display = 'block';
  window.scrollTo(0, 0);
  if (allProducts.length === 0) loadProducts();
}

function showHomepage() {
  document.getElementById('catalog-view').style.display = 'none';
  document.getElementById('homepage').style.display = 'block';
  closeSidebar();
  window.scrollTo(0, 0);
}

function showAboutUs() {
  document.getElementById('catalog-view').style.display = 'none';
  document.getElementById('homepage').style.display = 'block';
  closeSidebar();
  setTimeout(() => {
    document.getElementById('home-about-us').scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

// ── CATEGORY EMOJI MAP ────────────────────────────
const CATEGORY_EMOJI = {
  'beef': '🥩', 'chicken': '🍗', 'dairy': '🧀', 'fish': '🐟',
  'bread': '🍞', 'deli': '🥪', 'frozen': '❄️', 'produce': '🥦',
  'beverage': '🥤', 'snack': '🍿', 'bakery': '🥐', 'dessert': '🍰',
  'lamb': '🍖', 'turkey': '🦃', 'veal': '🥩', 'pasta': '🍝',
  'soup': '🍲', 'sauce': '🫙', 'oil': '🫒', 'juice': '🧃',
  'coffee': '☕', 'tea': '🍵', 'candy': '🍬', 'cookie': '🍪',
  'cake': '🎂', 'cheese': '🧀', 'yogurt': '🥛', 'egg': '🥚',
};

function getCategoryEmoji(category) {
  if (!category) return '📦';
  const lower = category.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return '📦';
}

// ── FETCH ALL PRODUCTS ────────────────────────────
async function loadProducts() {
  try {
    let all = [];
    let from = 0;
    const batch = 1000;
    while (true) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/products?select=*&active=eq.true&order=image_url.desc.nullslast,name.asc&limit=${batch}&offset=${from}`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const data = await res.json();
      if (!data.length) break;
      all = all.concat(data);
      if (data.length < batch) break;
      from += batch;
    }
    allProducts = all;
    buildSidebar();
    buildBrandFilterList();
    applyFilters();
    document.getElementById('loading').style.display = 'none';
  } catch (e) {
    document.getElementById('loading').innerHTML = '<div style="color:#e53e3e">Error loading products. Check your connection.</div>';
    console.error(e);
  }
}

// ── BUILD SIDEBAR ─────────────────────────────────
function buildSidebar() {
  const cats = [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();
  document.getElementById('acc-cat-body').innerHTML = cats.map(c =>
    `<button class="accordion-item" onclick="filterByCategory('${c.replace(/'/g,"\\'")}'); closeSidebar()">${getCategoryEmoji(c)} ${c}</button>`
  ).join('');

  const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort();
  document.getElementById('acc-brand-body').innerHTML = brands.map(b =>
    `<button class="accordion-item" onclick="filterByBrand('${b.replace(/'/g,"\\'")}'); closeSidebar()">${b}</button>`
  ).join('');
}

function buildBrandFilterList() {
  const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort();
  document.getElementById('brand-filter-list').innerHTML = brands.map(b =>
    `<label class="filter-option"><input type="checkbox" name="brand-filter" value="${b.replace(/"/g,'&quot;')}"><span>${b}</span></label>`
  ).join('');
}

function setupAccordion(headerId, bodyId, arrowId) {
  document.getElementById(headerId).addEventListener('click', () => {
    const body = document.getElementById(bodyId);
    const arrow = document.getElementById(arrowId);
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    arrow.classList.toggle('open', !isOpen);
  });
}

// ── FILTERING ─────────────────────────────────────
function applyFilters() {
  const q = filters.search.toLowerCase().trim();
  filteredProducts = allProducts.filter(p => {
    if (q && !(
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.brand_short || '').toLowerCase().includes(q)
    )) return false;
    if (filters.category && p.category !== filters.category) return false;
    if (filters.brand && p.brand !== filters.brand) return false;
    if (filters.storage.length && !filters.storage.includes(p.storage_type)) return false;
    if (filters.seasonArr.length) {
      if (!filters.seasonArr.includes(p.season)) return false;
    } else {
      // By default hide Passover products
      if (p.season === 'Passover') return false;
    }
    if (filters.classArr.length && !filters.classArr.includes(p.class)) return false;
    if (filters.brandArr.length && !filters.brandArr.includes(p.brand)) return false;
    if (filters.isNew && !p.is_new) return false;
    return true;
  });
  visibleCount = PAGE_SIZE;
  renderGrid();
  renderActiveTags();
  updateResultsBar();
}

function filterByCategory(cat) { filters.category = cat; filters.brand = ''; applyFilters(); }
function filterByBrand(brand)   { filters.brand = brand; filters.category = ''; applyFilters(); }
function filterBySeason(season) { filters.seasonArr = [season]; applyFilters(); }
function filterByNew()          { filters.isNew = true; applyFilters(); }

function clearAllFilters() {
  filters = { search: '', category: '', brand: '', storage: [], seasonArr: [], classArr: [], isNew: false, brandArr: [] };
  document.getElementById('search-input').value = '';
  document.querySelectorAll('#filter-drawer input[type=checkbox]').forEach(cb => cb.checked = false);
  applyFilters();
}

// ── RENDER GRID ───────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('product-grid');
  const empty = document.getElementById('empty-state');
  const loadWrap = document.getElementById('load-more-wrap');

  if (filteredProducts.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    loadWrap.style.display = 'none';
    return;
  }
  empty.style.display = 'none';

  const visible = filteredProducts.slice(0, visibleCount);
  grid.innerHTML = visible.map(p => renderCard(p)).join('');

  loadWrap.style.display = visibleCount < filteredProducts.length ? 'block' : 'none';
}

function renderCard(p) {
  const emoji = getCategoryEmoji(p.category);
  const storageMap = { 'Frozen': ['badge-frozen','❄️'], 'Cooler': ['badge-cooler','🧊'] };
  const seasonMap  = { 'Passover': ['badge-passover','🎉'] };
  const classMap   = { 'Food Service': ['badge-fs','🍽️'] };

  const badges = [
    storageMap[p.storage_type] ? `<span class="badge ${storageMap[p.storage_type][0]}">${storageMap[p.storage_type][1]}</span>` : '',
    seasonMap[p.season]        ? `<span class="badge ${seasonMap[p.season][0]}">${seasonMap[p.season][1]}</span>` : '',
    classMap[p.class]          ? `<span class="badge ${classMap[p.class][0]}">${classMap[p.class][1]}</span>` : '',
    p.is_new                   ? `<span class="badge badge-new">🆕</span>` : '',
  ].filter(Boolean).join('');

  const imgHtml = p.image_url
    ? `<img src="${p.image_url}" alt="${(p.name||'').replace(/"/g,'')}" loading="lazy"
         onerror="this.parentElement.innerHTML='<div class=card-img-placeholder>${emoji}</div>'">`
    : `<div class="card-img-placeholder">${emoji}</div>`;

  return `
    <div class="product-card" data-sku="${p.sku}">
      <div class="card-img-wrap">${imgHtml}</div>
      ${badges ? `<div class="card-badges-row">${badges}</div>` : ''}
      <div class="card-body">
        <div class="card-sku">${p.sku || ''}</div>
        <div class="card-name">${p.name || ''}</div>
        <div class="card-brand">${p.brand || ''}</div>
      </div>
    </div>`;
}

function updateResultsBar() {
  const n = filteredProducts.length;
  document.getElementById('results-bar').textContent =
    `${n.toLocaleString()} product${n !== 1 ? 's' : ''} found`;
}

// ── ACTIVE FILTER TAGS ────────────────────────────
function renderActiveTags() {
  const container = document.getElementById('active-filters');
  const main = document.getElementById('main');
  const tags = [];

  const storageEmoji = { 'Frozen': '❄️', 'Cooler': '🧊', 'Dry': '📦' };
  const seasonEmoji  = { 'Passover': '🎉', 'Regular': '🗓️' };
  const classEmoji   = { 'Retail': '🛒', 'Food Service': '🍽️' };

  if (filters.isNew)      tags.push({ label: '🆕 New Products', clear: () => { filters.isNew = false; applyFilters(); } });
  if (filters.category)   tags.push({ label: `📦 ${filters.category}`,  clear: () => { filters.category = ''; applyFilters(); } });
  if (filters.brand)      tags.push({ label: `🏷️ ${filters.brand}`,     clear: () => { filters.brand = '';    applyFilters(); } });
  filters.storage.forEach(s =>   tags.push({ label: `${storageEmoji[s]||'📦'} ${s}`, clear: () => { filters.storage  = filters.storage.filter(x=>x!==s);  applyFilters(); } }));
  filters.seasonArr.forEach(s => tags.push({ label: `${seasonEmoji[s]||'🗓️'} ${s}`, clear: () => { filters.seasonArr= filters.seasonArr.filter(x=>x!==s); applyFilters(); } }));
  filters.classArr.forEach(s =>  tags.push({ label: `${classEmoji[s]||'🛒'} ${s}`,  clear: () => { filters.classArr = filters.classArr.filter(x=>x!==s);  applyFilters(); } }));
  filters.brandArr.forEach(s =>  tags.push({ label: `🏷️ ${s}`, clear: () => { filters.brandArr = filters.brandArr.filter(x=>x!==s); applyFilters(); } }));

  window._tagClears = tags.map(t => t.clear);

  if (tags.length) {
    container.innerHTML = tags.map((t, i) =>
      `<div class="filter-tag">${t.label}<button onclick="window._tagClears[${i}]()">×</button></div>`
    ).join('');
    container.classList.add('visible');
    main.classList.add('has-filters');
  } else {
    container.innerHTML = '';
    container.classList.remove('visible');
    main.classList.remove('has-filters');
  }
}

// ── MODAL ─────────────────────────────────────────
let currentModalIndex = -1;

function openModal(sku) {
  const idx = filteredProducts.findIndex(x => x.sku === sku);
  if (idx === -1) return;
  currentModalIndex = idx;
  renderModal(filteredProducts[idx]);
}

function renderModal(p, direction = null) {
  const emoji = getCategoryEmoji(p.category);
  const imgWrap = document.getElementById('modal-img-wrap');
  const modalBody = document.getElementById('modal-body');

  // Slide animation
  if (direction) {
    modalBody.classList.remove('slide-left', 'slide-right');
    void modalBody.offsetWidth;
    modalBody.classList.add(direction === 'next' ? 'slide-right' : 'slide-left');
  }

  if (p.image_url) {
    imgWrap.innerHTML = `<img src="${p.image_url}" alt="${(p.name||'').replace(/"/g,'')}"
      onclick="openLightbox('${p.image_url}')"
      onerror="this.parentElement.innerHTML='<div class=modal-emoji>${emoji}</div>'">`;
  } else {
    imgWrap.innerHTML = `<div class="modal-emoji">${emoji}</div>`;
  }

  document.getElementById('modal-brand').textContent = p.brand || '';
  document.getElementById('modal-name').textContent  = p.name  || '';
  document.getElementById('modal-sku-header').textContent = p.sku ? `SKU: ${p.sku}` : '';

  // Nav buttons
  document.getElementById('modal-prev-btn').disabled = currentModalIndex === 0;
  document.getElementById('modal-next-btn').disabled = currentModalIndex === filteredProducts.length - 1;

  const badgeMap = {
    storage: { 'Frozen': 'frozen ❄️ Frozen', 'Cooler': 'cooler 🧊 Cooler', 'Dry': 'dry 📦 Dry' },
    season:  { 'Passover': 'passover 🎉 Passover', 'Regular': 'regular 🗓️ Regular' },
    class:   { 'Retail': 'retail 🛒 Retail', 'Food Service': 'fs 🍽️ Food Service' },
  };
  const makeBadge = (map, val) => {
    if (!val || !map[val]) return '';
    const [cls, ...label] = map[val].split(' ');
    return `<span class="modal-badge ${cls}">${label.join(' ')}</span>`;
  };
  document.getElementById('modal-badges').innerHTML =
    makeBadge(badgeMap.storage, p.storage_type) +
    makeBadge(badgeMap.season, p.season) +
    makeBadge(badgeMap.class, p.class) +
    (p.is_new ? '<span class="modal-badge new">🆕 New</span>' : '');

  document.getElementById('modal-info').innerHTML = `
    <div class="modal-info-row"><span class="label">SKU</span><span class="value">${p.sku||'—'}</span></div>
    <div class="modal-info-row"><span class="label">UPC</span><span class="value">${p.upc||'—'}</span></div>
    <div class="modal-info-row"><span class="label">Category</span><span class="value">${p.category||'—'}</span></div>
    <div class="modal-info-row"><span class="label">Brand</span><span class="value">${p.brand||'—'}</span></div>
    <div class="modal-info-row"><span class="label">Pack Size</span><span class="value">${p.pack_size||'—'}</span></div>
    <div class="modal-info-row"><span class="label">Storage</span><span class="value">${p.storage_type||'—'}</span></div>
    <div class="modal-info-row"><span class="label">Class</span><span class="value">${p.class||'—'}</span></div>
    <div class="modal-info-row"><span class="label">Season</span><span class="value">${p.season||'—'}</span></div>
    ${p.description ? `<div class="modal-info-row" style="flex-direction:column;gap:8px"><span class="label">Description</span><span class="value" style="text-align:left;font-weight:400">${p.description}</span></div>` : ''}
  `;

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('product-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('modal-body').scrollTop = 0;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('product-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lightbox-img').src = '';
}

// ── SIDEBAR ───────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── FILTER DRAWER ─────────────────────────────────
function openFilterDrawer() {
  document.getElementById('filter-drawer').classList.add('open');
  document.getElementById('filter-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeFilterDrawer() {
  document.getElementById('filter-drawer').classList.remove('open');
  document.getElementById('filter-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── EVENT LISTENERS ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Brand filter accordion
  document.getElementById('brand-filter-header').addEventListener('click', () => {
    const body = document.getElementById('brand-filter-body');
    const arrow = document.querySelector('.filter-acc-arrow');
    body.classList.toggle('open');
    arrow.classList.toggle('open');
  });

  // Product card clicks - event delegation
  document.getElementById('product-grid').addEventListener('click', e => {
    const card = e.target.closest('.product-card');
    if (card) openModal(card.dataset.sku);
  });

  // Homepage
  document.getElementById('enter-catalog-btn').addEventListener('click', showCatalog);
  document.getElementById('home-btn').addEventListener('click', showHomepage);

  // Sidebar
  document.getElementById('menu-btn').addEventListener('click', openSidebar);
  document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

  // Accordions
  setupAccordion('acc-cat-header', 'acc-cat-body', 'acc-cat-arrow');
  setupAccordion('acc-brand-header', 'acc-brand-body', 'acc-brand-arrow');

  // Filter drawer
  document.getElementById('filter-btn').addEventListener('click', openFilterDrawer);
  document.getElementById('filter-drawer-close').addEventListener('click', closeFilterDrawer);
  document.getElementById('filter-overlay').addEventListener('click', closeFilterDrawer);

  document.getElementById('clear-filters-btn').addEventListener('click', () => {
    document.querySelectorAll('#filter-drawer input[type=checkbox]').forEach(cb => cb.checked = false);
  });

  document.getElementById('apply-filters-btn').addEventListener('click', () => {
    filters.storage   = [...document.querySelectorAll('input[name=storage]:checked')].map(cb => cb.value);
    filters.seasonArr = [...document.querySelectorAll('input[name=season]:checked')].map(cb => cb.value);
    filters.classArr  = [...document.querySelectorAll('input[name=class]:checked')].map(cb => cb.value);
    filters.brandArr  = [...document.querySelectorAll('input[name="brand-filter"]:checked')].map(cb => cb.value);
    const newChecked  = document.querySelector('input[name=special][value=new]');
    filters.isNew     = newChecked ? newChecked.checked : false;
    applyFilters();
    closeFilterDrawer();
  });

  // Lightbox
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox').addEventListener('click', e => {
    if (e.target === document.getElementById('lightbox') || e.target === document.getElementById('lightbox-img')) {
      closeLightbox();
    }
  });

  // Modal nav
  document.getElementById('modal-back-btn').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', closeModal);
  document.getElementById('modal-prev-btn').addEventListener('click', () => {
    if (currentModalIndex > 0) {
      currentModalIndex--;
      renderModal(filteredProducts[currentModalIndex], 'prev');
    }
  });
  document.getElementById('modal-next-btn').addEventListener('click', () => {
    if (currentModalIndex < filteredProducts.length - 1) {
      currentModalIndex++;
      renderModal(filteredProducts[currentModalIndex], 'next');
    }
  });

  // Swipe support on modal
  let touchStartX = 0;
  document.getElementById('product-modal').addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  document.getElementById('product-modal').addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentModalIndex < filteredProducts.length - 1) {
        currentModalIndex++;
        renderModal(filteredProducts[currentModalIndex], 'next');
      } else if (diff < 0 && currentModalIndex > 0) {
        currentModalIndex--;
        renderModal(filteredProducts[currentModalIndex], 'prev');
      }
    }
  }, { passive: true });

  // Search
  let searchTimeout;
  document.getElementById('search-input').addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filters.search = e.target.value;
      applyFilters();
    }, 200);
  });

  // Load more
  document.getElementById('load-more-btn').addEventListener('click', () => {
    visibleCount += PAGE_SIZE;
    renderGrid();
  });
});
