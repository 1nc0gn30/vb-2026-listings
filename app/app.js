const state = {
  businesses: [],
  filtered: [],
};

const els = {
  search: document.querySelector('#search'),
  monthFilter: document.querySelector('#monthFilter'),
  categoryFilter: document.querySelector('#categoryFilter'),
  scoreFilter: document.querySelector('#scoreFilter'),
  resetBtn: document.querySelector('#resetBtn'),
  cards: document.querySelector('#cards'),
  resultCount: document.querySelector('#resultCount'),
  categoryChips: document.querySelector('#categoryChips'),
  topStats: document.querySelector('#topStats'),
  cardTemplate: document.querySelector('#cardTemplate'),
};

function uniqueValues(list, key) {
  return [...new Set(list.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function createOption(value, text) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = text;
  return opt;
}

function titleForBusiness(item) {
  return item.trade_name || item.owner_name || 'Unnamed Business';
}

function businessSearchText(item) {
  return [
    item.trade_name,
    item.owner_name,
    item.category,
    item.address,
    item.city,
    item.zip,
  ].join(' ').toLowerCase();
}

function renderStats(items) {
  const total = items.length;
  const avgScore = total ? Math.round(items.reduce((sum, item) => sum + (item.lead_score || 0), 0) / total) : 0;
  const highPriority = items.filter((item) => item.lead_score >= 80).length;
  const categories = new Set(items.map((item) => item.category)).size;

  els.topStats.innerHTML = '';

  const stats = [
    ['Total leads', total],
    ['High priority (80+)', highPriority],
    ['Avg lead score', avgScore],
    ['Active categories', categories],
  ];

  stats.forEach(([label, value]) => {
    const dl = document.createElement('dl');
    dl.className = 'stat';
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = String(value);
    dl.append(dt, dd);
    els.topStats.appendChild(dl);
  });
}

function renderCategoryChips(items) {
  const counts = new Map();
  items.forEach((item) => {
    counts.set(item.category, (counts.get(item.category) || 0) + 1);
  });

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  els.categoryChips.innerHTML = '';

  sorted.forEach(([category, count]) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = `${category} (${count})`;
    chip.addEventListener('click', () => {
      els.categoryFilter.value = category;
      applyFilters();
    });
    els.categoryChips.appendChild(chip);
  });
}

function renderCards(items) {
  els.cards.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No results match your filters.';
    els.cards.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    const node = els.cardTemplate.content.cloneNode(true);
    const card = node.querySelector('.lead-card');
    card.style.animationDelay = `${Math.min(index * 14, 220)}ms`;

    node.querySelector('.category').textContent = item.category;
    node.querySelector('.score').textContent = `Lead Score ${item.lead_score}`;
    node.querySelector('.trade').textContent = titleForBusiness(item);
    node.querySelector('.owner').textContent = `Owner: ${item.owner_name || 'N/A'}`;
    node.querySelector('.meta').textContent = `${item.month} | ${item.city}, ${item.state} ${item.zip} | ${item.telephone || 'No phone listed'}`;

    const painList = node.querySelector('.pain-points');
    item.pain_points.forEach((point) => {
      const li = document.createElement('li');
      li.textContent = point;
      painList.appendChild(li);
    });

    const ideaList = node.querySelector('.ideas');
    item.website_ideas.forEach((idea) => {
      const li = document.createElement('li');
      li.textContent = idea;
      ideaList.appendChild(li);
    });

    node.querySelector('.why').textContent = `Why they likely need a website: ${item.why_need_website}`;
    node.querySelector('.sources').innerHTML = `Source: <a href="${item.source_pdf}">PDF</a> | <a href="${item.source_xlsx}">XLSX</a> | Confidence ${item.confidence}%`;

    fragment.appendChild(node);
  });

  els.cards.appendChild(fragment);
}

function applyFilters() {
  const search = els.search.value.trim().toLowerCase();
  const month = els.monthFilter.value;
  const category = els.categoryFilter.value;
  const scoreThreshold = els.scoreFilter.value === 'all' ? null : Number(els.scoreFilter.value);

  state.filtered = state.businesses.filter((item) => {
    if (search && !businessSearchText(item).includes(search)) return false;
    if (month !== 'all' && item.month !== month) return false;
    if (category !== 'all' && item.category !== category) return false;
    if (scoreThreshold !== null && item.lead_score < scoreThreshold) return false;
    return true;
  });

  state.filtered.sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0));

  els.resultCount.textContent = `Showing ${state.filtered.length} of ${state.businesses.length} businesses`;
  renderCards(state.filtered);
  renderStats(state.filtered);
  renderCategoryChips(state.filtered);
}

function bindEvents() {
  [els.search, els.monthFilter, els.categoryFilter, els.scoreFilter].forEach((el) => {
    el.addEventListener('input', applyFilters);
    el.addEventListener('change', applyFilters);
  });

  els.resetBtn.addEventListener('click', () => {
    els.search.value = '';
    els.monthFilter.value = 'all';
    els.categoryFilter.value = 'all';
    els.scoreFilter.value = 'all';
    applyFilters();
  });
}

function hydrateFilterOptions() {
  uniqueValues(state.businesses, 'month').forEach((month) => {
    els.monthFilter.appendChild(createOption(month, month));
  });

  uniqueValues(state.businesses, 'category').forEach((category) => {
    els.categoryFilter.appendChild(createOption(category, category));
  });
}

async function init() {
  try {
    const response = await fetch('./data/businesses-enriched.json');
    if (!response.ok) {
      throw new Error(`Failed to load dataset (${response.status})`);
    }

    const payload = await response.json();
    state.businesses = payload.businesses || [];

    hydrateFilterOptions();
    bindEvents();
    applyFilters();
  } catch (error) {
    els.cards.innerHTML = `<p class="muted">Could not load data: ${error.message}</p>`;
  }
}

init();
