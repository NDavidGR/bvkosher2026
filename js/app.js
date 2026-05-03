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
  document.getElementById('pdf-btn').style.display = 'flex';
  window.scrollTo(0, 0);
  if (allProducts.length === 0) loadProducts();
}

function showHomepage() {
  document.getElementById('catalog-view').style.display = 'none';
  document.getElementById('homepage').style.display = 'block';
  document.getElementById('pdf-btn').style.display = 'none';
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
  
  // Word-boundary search: matches start of any word in the field
  const matchesField = (value) => {
    if (!value) return false;
    const words = value.toLowerCase().split(/\s+/);
    return words.some(word => word.startsWith(q));
  };

  filteredProducts = allProducts.filter(p => {
    if (q && !(
      matchesField(p.name) ||
      matchesField(p.sku) ||
      matchesField(p.brand) ||
      matchesField(p.brand_short)
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
        <div class="card-sku-row">
          <span class="card-sku">${p.sku || ''}</span>
          <span class="card-pack">${p.pack_size || ''}</span>
        </div>
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

// ── PDF EXPORT ────────────────────────────────────
async function exportPDF() {
  const btn = document.getElementById('pdf-btn');
  btn.disabled = true;
  btn.innerHTML = '⏳';

  // Load jsPDF dynamically
  if (!window.jspdf) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  const COLS = 4;
  const PAGE_W = 215.9;
  const PAGE_H = 279.4;
  const MARGIN = 12;
  const CELL_W = (PAGE_W - MARGIN * 2) / COLS;
  const CELL_H = 52;
  const IMG_SIZE = 34;
  const products = filteredProducts.slice(0, 200);

  // Pre-load all images in parallel batches of 10
  btn.innerHTML = '⏳ Loading...';
  const imageCache = {};
  const withImages = products.filter(p => p.image_url);
  for (let i = 0; i < withImages.length; i += 10) {
    const batch = withImages.slice(i, i + 10);
    await Promise.all(batch.map(async p => {
      imageCache[p.sku] = await fetchImageAsBase64(p.image_url);
    }));
  } // max 200

  // Header
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, PAGE_W, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BEST VALUE FOODS — Product Catalog', MARGIN, 9.5);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${products.length} products · ${new Date().toLocaleDateString()}`, PAGE_W - MARGIN, 9.5, { align: 'right' });

  let x = MARGIN;
  let y = 20;
  let col = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    // Cell background
    doc.setFillColor(248, 248, 246);
    doc.roundedRect(x, y, CELL_W - 2, CELL_H, 2, 2, 'F');

    // Image
    if (p.image_url) {
      try {
        const imgData = imageCache[p.sku];
        if (imgData) {
          doc.addImage(imgData, 'JPEG',
            x + (CELL_W - 2 - IMG_SIZE) / 2, y + 2,
            IMG_SIZE, IMG_SIZE, undefined, 'FAST');
        } else {
          drawPlaceholder(doc, x + (CELL_W - 2 - IMG_SIZE) / 2, y + 2, IMG_SIZE);
        }
      } catch(e) {
        drawPlaceholder(doc, x + (CELL_W - 2 - IMG_SIZE) / 2, y + 2, IMG_SIZE);
      }
    } else {
      drawPlaceholder(doc, x + (CELL_W - 2 - IMG_SIZE) / 2, y + 2, IMG_SIZE);
    }

    // SKU
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 144);
    doc.text(p.sku || '', x + (CELL_W - 2) / 2, y + IMG_SIZE + 5, { align: 'center' });

    // Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(26, 26, 26);
    const name = p.name || '';
    const nameLines = doc.splitTextToSize(name, CELL_W - 6);
    doc.text(nameLines.slice(0, 2), x + (CELL_W - 2) / 2, y + IMG_SIZE + 9, { align: 'center' });

    // Brand
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 94);
    doc.text(p.brand || '', x + (CELL_W - 2) / 2, y + IMG_SIZE + 16, { align: 'center' });

    col++;
    if (col >= COLS) {
      col = 0;
      x = MARGIN;
      y += CELL_H + 3;
      if (y + CELL_H > PAGE_H - 10) {
        doc.addPage();
        y = 16;
        // Page header
        doc.setFillColor(10, 10, 10);
        doc.rect(0, 0, PAGE_W, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('BEST VALUE FOODS', MARGIN, 8);
      }
    } else {
      x += CELL_W;
    }
  }

  doc.save(`BV-Catalog-${new Date().toISOString().slice(0,10)}.pdf`);

  btn.disabled = false;
  btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> PDF`;
}

function drawPlaceholder(doc, x, y, size) {
  doc.setFillColor(224, 221, 215);
  doc.roundedRect(x, y, size, size, 2, 2, 'F');
  doc.setFillColor(180, 175, 168);
  doc.rect(x + size*0.3, y + size*0.25, size*0.4, size*0.3, 'F');
  doc.rect(x + size*0.2, y + size*0.55, size*0.6, size*0.2, 'F');
}

async function fetchImageAsBase64(url) {
  try {
    const smallUrl = url.replace('/upload/', '/upload/w_400,h_400,c_fit,f_jpg,q_90/');
    const res = await fetch(smallUrl, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch(e) {
    return null;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
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

  // PDF Export
  document.getElementById('pdf-btn').addEventListener('click', exportPDF);

  // Load more
  document.getElementById('load-more-btn').addEventListener('click', () => {
    visibleCount += PAGE_SIZE;
    renderGrid();
  });
});
