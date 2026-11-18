/**
 * Price Scanner – front-end logic (vanilla JS, no libraries)
 * ------------------------------------------------------------
 * - Bilingual UI (Arabic RTL / English LTR)
 * - Calls the Cloudflare Worker (/search) or uses DEMO data when WORKER_URL is empty
 * - Caches results in the browser for 6 hours to save the free API quota
 * - Renders all data with textContent (never innerHTML) to prevent XSS
 */
(function () {
  'use strict';

  const CONFIG = window.PRICE_SCANNER_CONFIG || { WORKER_URL: '' };
  const WORKER_URL = String(CONFIG.WORKER_URL || '').trim().replace(/\/$/, '');
  const DEMO = !WORKER_URL;
  const CACHE_MS = 6 * 60 * 60 * 1000;
  const REQUEST_TIMEOUT_MS = 20000;

  /* ------------------------------------------------------------ i18n */
  const T = {
    ar: {
      skip: 'تخطَّ إلى المحتوى',
      homeLabel: 'سكنر أسعار – الصفحة الرئيسية',
      brand: 'سكنر أسعار',
      docTitle: 'سكنر أسعار | قارن أسعار المنتجات في نون وأمازون وجرير والمتاجر العالمية',
      docDesc: 'سكنر أسعار يقارن لك سعر أي منتج في نون وأمازون وجرير وإكسترا والمتاجر العالمية التي تشحن للسعودية، ويعرض الأسعار بالريال السعودي مرتبة من الأرخص. مجاني وبدون تسجيل.',
      heroTitle: 'قارن الأسعار في ثوانٍ',
      heroSub: 'اكتب اسم أي منتج بالعربي أو الإنجليزي، ونقارن لك أسعاره في نون وأمازون وجرير وإكسترا والمتاجر العالمية التي تشحن للسعودية.',
      searchLabel: 'اسم المنتج',
      searchPlaceholder: 'مثال: آيفون 16 برو، PS5، سماعات سوني…',
      searchBtn: 'ابحث',
      searching: 'جارٍ البحث…',
      examples: 'جرّب:',
      demoBanner: 'وضع تجريبي: الأسعار المعروضة أمثلة توضيحية، وليست أسعاراً حقيقية.',
      sortLabel: 'الترتيب',
      sortAsc: 'الأرخص أولاً',
      sortDesc: 'الأغلى أولاً',
      sortRating: 'الأعلى تقييماً',
      storeLabel: 'المتجر',
      allStores: 'كل المتاجر',
      saudiOnly: 'متاجر سعودية فقط',
      directTitle: 'ابحث مباشرة في المتاجر',
      directSub: 'يفتح نتائج البحث داخل المتجر نفسه في نافذة جديدة.',
      footerNote: 'الأسعار تقريبية وتُحدَّث دورياً، وقد تختلف عن سعر المتجر لحظة الشراء. التحويل للريال حسب سعر الصرف اليومي.',
      sar: 'ر.س',
      resultsFor: (q) => `نتائج «${q}»`,
      meta: (n, s) => `${n} عرض من ${s} متجر`,
      fromCache: 'من الذاكرة المؤقتة',
      best: '🏆 أفضل سعر',
      save: (v) => `وفّر حتى ${v} مقارنةً بأغلى عرض`,
      goStore: 'اذهب للمتجر',
      opensNew: '(يفتح في نافذة جديدة)',
      original: (v) => `السعر الأصلي: ${v}`,
      saudiBadge: 'متجر سعودي',
      reviews: (n) => `(${n} تقييم)`,
      errShort: 'اكتب حرفين على الأقل.',
      errLong: 'اسم المنتج طويل جداً (100 حرف كحد أقصى).',
      empty: 'لم نجد عروضاً لهذا المنتج. جرّب كلمات أبسط، أو ابحث مباشرة في المتاجر بالأسفل.',
      emptyFiltered: 'لا توجد نتائج مطابقة للفلاتر المختارة.',
      errNetwork: 'تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم حاول مرة أخرى.',
      errQuota: 'وصلنا للحد اليومي من عمليات البحث المجانية. يمكنك البحث مباشرة في المتاجر بالأسفل، وسيعود البحث غداً.',
      errServer: 'حدث خطأ مؤقت أثناء جلب الأسعار. حاول مرة أخرى بعد قليل.',
      retry: 'إعادة المحاولة',
      langBtn: 'EN',
      langBtnLabel: 'Switch to English',
      demoNote: 'بيانات تجريبية',
      productImage: (t) => `صورة ${t}`,
      outlier: 'سعر أقل بكثير من غيره، تأكد أنه نفس المنتج',
    },
    en: {
      skip: 'Skip to content',
      homeLabel: 'Price Scanner – home',
      brand: 'Price Scanner',
      docTitle: 'Price Scanner | Compare prices on noon, Amazon, Jarir & global stores',
      docDesc: 'Price Scanner compares any product across noon, Amazon, Jarir, eXtra and global stores that ship to Saudi Arabia, with every price shown in SAR. Free, no sign-up.',
      heroTitle: 'Compare prices in seconds',
      heroSub: 'Type any product in English or Arabic and we compare its price on noon, Amazon, Jarir, eXtra and global stores that ship to Saudi Arabia.',
      searchLabel: 'Product name',
      searchPlaceholder: 'e.g. iPhone 16 Pro, PS5, Sony headphones…',
      searchBtn: 'Search',
      searching: 'Searching…',
      examples: 'Try:',
      demoBanner: 'Demo mode: prices shown are illustrative examples, not real prices.',
      sortLabel: 'Sort by',
      sortAsc: 'Lowest price',
      sortDesc: 'Highest price',
      sortRating: 'Top rated',
      storeLabel: 'Store',
      allStores: 'All stores',
      saudiOnly: 'Saudi stores only',
      directTitle: 'Search directly in stores',
      directSub: 'Opens the store’s own search results in a new tab.',
      footerNote: 'Prices are approximate, refreshed periodically, and may differ at checkout. SAR conversion uses the daily exchange rate.',
      sar: 'SAR',
      resultsFor: (q) => `Results for “${q}”`,
      meta: (n, s) => `${n} offers from ${s} stores`,
      fromCache: 'from cache',
      best: '🏆 Best price',
      save: (v) => `Save up to ${v} vs. the highest offer`,
      goStore: 'Go to store',
      opensNew: '(opens in a new tab)',
      original: (v) => `Original price: ${v}`,
      saudiBadge: 'Saudi store',
      reviews: (n) => `(${n} reviews)`,
      errShort: 'Type at least 2 characters.',
      errLong: 'Product name is too long (max 100 characters).',
      empty: 'No offers found. Try simpler keywords, or search directly in the stores below.',
      emptyFiltered: 'No results match the selected filters.',
      errNetwork: 'Could not reach the server. Check your connection and try again.',
      errQuota: 'We reached today’s free search limit. You can search the stores directly below; search will be back tomorrow.',
      errServer: 'A temporary error occurred while fetching prices. Please try again shortly.',
      retry: 'Try again',
      langBtn: 'ع',
      langBtnLabel: 'التبديل إلى العربية',
      demoNote: 'demo data',
      productImage: (t) => `Image of ${t}`,
      outlier: 'Much cheaper than the rest — check it is the same product',
    },
  };

  /* ------------------------------------------------- stores for direct links */
  const enc = encodeURIComponent;
  const STORES = [
    { id: 'noon', ar: 'نون', en: 'noon', color: '#f5d800',
      url: (q, l) => `https://www.noon.com/${l === 'ar' ? 'saudi-ar' : 'saudi-en'}/search/?q=${enc(q)}`,
      home: (l) => `https://www.noon.com/${l === 'ar' ? 'saudi-ar' : 'saudi-en'}/` },
    { id: 'amazon-sa', ar: 'أمازون السعودية', en: 'Amazon.sa', color: '#ff9900',
      url: (q, l) => `https://www.amazon.sa/s?k=${enc(q)}${l === 'ar' ? '&language=ar_AE' : ''}`,
      home: () => 'https://www.amazon.sa/' },
    { id: 'jarir', ar: 'جرير', en: 'Jarir', color: '#d71920',
      url: (q, l) => `https://www.jarir.com/${l === 'ar' ? 'sa-ar' : 'sa-en'}/catalogsearch/result?search=${enc(q)}`,
      home: (l) => `https://www.jarir.com/${l === 'ar' ? 'sa-ar' : 'sa-en'}/` },
    { id: 'extra', ar: 'إكسترا', en: 'eXtra', color: '#1d4ed8',
      url: (q, l) => `https://www.extra.com/${l === 'ar' ? 'ar-sa' : 'en-sa'}/search/?q=${enc(q)}`,
      home: (l) => `https://www.extra.com/${l === 'ar' ? 'ar-sa' : 'en-sa'}/` },
    { id: 'amazon-com', ar: 'أمازون العالمي', en: 'Amazon.com', color: '#232f3e',
      url: (q) => `https://www.amazon.com/s?k=${enc(q)}`,
      home: () => 'https://www.amazon.com/' },
    { id: 'aliexpress', ar: 'علي إكسبرس', en: 'AliExpress', color: '#e62e04',
      url: (q) => `https://www.aliexpress.com/wholesale?SearchText=${enc(q)}`,
      home: () => 'https://www.aliexpress.com/' },
    { id: 'ebay', ar: 'إيباي', en: 'eBay', color: '#0064d2',
      url: (q) => `https://www.ebay.com/sch/i.html?_nkw=${enc(q)}`,
      home: () => 'https://www.ebay.com/' },
    { id: 'google', ar: 'جوجل للتسوق', en: 'Google Shopping', color: '#34a853',
      url: (q, l) => `https://www.google.com/search?tbm=shop&gl=sa&hl=${l}&q=${enc(q)}`,
      home: (l) => `https://shopping.google.com/?gl=sa&hl=${l}` },
  ];

  /* ------------------------------------------------------------ state */
  const state = {
    lang: 'ar',
    query: '',
    results: [],
    cached: false,
    sort: 'price-asc',
    store: '',
    saudiOnly: false,
    lastError: null,
    loading: false,
  };

  /* ------------------------------------------------------------ DOM */
  const $ = (sel) => document.querySelector(sel);
  const el = {
    html: document.documentElement,
    form: $('#searchForm'),
    input: $('#q'),
    submit: $('#searchForm button[type="submit"]'),
    formError: $('#formError'),
    langToggle: $('#langToggle'),
    demoBanner: $('#demoBanner'),
    section: $('#resultsSection'),
    title: $('#resultsTitle'),
    meta: $('#resultsMeta'),
    sort: $('#sortSelect'),
    store: $('#storeSelect'),
    saudi: $('#saudiOnly'),
    best: $('#bestPrice'),
    status: $('#status'),
    list: $('#resultsList'),
    direct: $('.direct'),
    directLinks: $('#directLinks'),
    tpl: $('#cardTpl'),
    year: $('#year'),
    metaDesc: document.querySelector('meta[name="description"]'),
  };

  const t = (key, ...args) => {
    const v = T[state.lang][key];
    return typeof v === 'function' ? v(...args) : v;
  };

  /* ------------------------------------------------------------ storage (safe) */
  const store = {
    get(key) {
      try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* storage unavailable */ }
    },
  };

  /* ------------------------------------------------------------ formatting */
  function fmtNumber(n) {
    const locale = state.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
    const decimals = Math.round(n) === n ? 0 : 2;
    return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: 2 }).format(n);
  }
  const fmtSar = (n) => (state.lang === 'ar' ? `${fmtNumber(n)} ${t('sar')}` : `${t('sar')} ${fmtNumber(n)}`);
  const fmtOriginal = (amount, cur) => `${fmtNumber(amount)} ${cur}`;

  /* ------------------------------------------------------------ language */
  function applyLanguage() {
    const lang = state.lang;
    el.html.lang = lang;
    el.html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t('docTitle');
    if (el.metaDesc) el.metaDesc.setAttribute('content', t('docDesc'));

    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const v = T[lang][node.dataset.i18n];
      if (typeof v === 'string') node.textContent = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      node.setAttribute('placeholder', T[lang][node.dataset.i18nPlaceholder]);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((node) => {
      node.setAttribute('aria-label', T[lang][node.dataset.i18nAria]);
    });

    el.langToggle.textContent = t('langBtn');
    el.langToggle.setAttribute('aria-label', t('langBtnLabel'));
    el.langToggle.lang = lang === 'ar' ? 'en' : 'ar';

    renderDirectLinks();
    if (state.results.length || state.lastError || state.query) render();
  }

  /* ------------------------------------------------------------ direct links */
  function renderDirectLinks() {
    const q = state.query;
    const frag = document.createDocumentFragment();
    STORES.forEach((s) => {
      const a = document.createElement('a');
      a.className = 'store-link';
      a.href = q ? s.url(q, state.lang) : s.home(state.lang);
      a.target = '_blank';
      a.rel = 'noopener noreferrer nofollow';

      const dot = document.createElement('span');
      dot.className = 'store-link__dot';
      dot.style.background = s.color;
      dot.setAttribute('aria-hidden', 'true');

      const name = document.createElement('span');
      name.className = 'store-link__name';
      name.textContent = s[state.lang];

      const arrow = document.createElement('span');
      arrow.className = 'store-link__arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';

      const sr = document.createElement('span');
      sr.className = 'visually-hidden';
      sr.textContent = ` ${t('opensNew')}`;

      a.append(dot, name, arrow, sr);
      frag.append(a);
    });
    el.directLinks.replaceChildren(frag);
  }

  /* ------------------------------------------------------------ validation */
  function validate(raw) {
    const q = String(raw || '').replace(/[\u0000-\u001F\u007F<>{}\\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (q.length < 2) return { ok: false, msg: t('errShort') };
    if (q.length > 100) return { ok: false, msg: t('errLong') };
    return { ok: true, q };
  }

  function showFormError(msg) {
    el.formError.textContent = msg;
    el.formError.hidden = !msg;
    el.input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  /* ------------------------------------------------------------ search */
  async function search(rawQuery) {
    const v = validate(rawQuery);
    if (!v.ok) { showFormError(v.msg); el.input.focus(); return; }
    showFormError('');

    state.query = v.q;
    state.results = [];
    state.lastError = null;
    state.store = '';
    el.input.value = v.q;
    syncUrl(v.q);
    renderDirectLinks();
    setLoading(true);

    try {
      const cacheKey = `ps:${state.lang}:${v.q.toLowerCase()}`;
      const hit = store.get(cacheKey);
      let data;
      if (hit && Date.now() - hit.t < CACHE_MS) {
        data = { ...hit.data, cached: true };
      } else {
        data = DEMO ? await demoSearch(v.q) : await fetchWorker(v.q);
        store.set(cacheKey, { t: Date.now(), data });
      }
      state.results = Array.isArray(data.results) ? data.results : [];
      state.cached = !!data.cached;
    } catch (err) {
      state.lastError = err && err.code ? err.code : 'network';
    } finally {
      setLoading(false);
      render();
      el.title.focus({ preventScroll: true });
      el.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function fetchWorker(q) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${WORKER_URL}/search?q=${enc(q)}&lang=${state.lang}`, { signal: controller.signal });
      if (res.status === 429) throw { code: 'quota' };
      if (!res.ok) throw { code: 'server' };
      return await res.json();
    } catch (err) {
      if (err && err.code) throw err;
      throw { code: 'network' };
    } finally {
      clearTimeout(timer);
    }
  }

  function syncUrl(q) {
    try {
      const url = new URL(window.location.href);
      if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
      window.history.replaceState(null, '', url);
    } catch (_) { /* ignore (e.g. sandboxed preview) */ }
  }

  function setLoading(on) {
    state.loading = on;
    document.body.classList.add('has-results');
    el.section.hidden = false;
    el.submit.disabled = on;
    el.submit.firstElementChild.textContent = on ? t('searching') : t('searchBtn');
    el.list.setAttribute('aria-busy', on ? 'true' : 'false');
    if (!on) return;

    el.title.textContent = t('resultsFor', state.query);
    el.meta.textContent = t('searching');
    el.best.replaceChildren();
    el.status.replaceChildren();
    el.direct.classList.remove('is-highlighted');

    const frag = document.createDocumentFragment();
    for (let i = 0; i < 6; i++) {
      const li = document.createElement('li');
      li.className = 'card skeleton';
      li.setAttribute('aria-hidden', 'true');
      li.innerHTML = // static markup only, no user data
        '<div class="card__media"><div class="sk sk--img"></div></div>' +
        '<div class="card__body"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div></div>' +
        '<div class="card__price"><div class="sk sk--line sk--short" style="width:40%"></div></div>';
      frag.append(li);
    }
    el.list.replaceChildren(frag);
  }

  /* ------------------------------------------------------------ rendering */
  function getVisible() {
    let items = state.results.slice();
    if (state.saudiOnly) items = items.filter((r) => r.saudi);
    if (state.store) items = items.filter((r) => r.store === state.store);
    const byPrice = (a, b) => a.price.sar - b.price.sar;
    if (state.sort === 'price-asc') items.sort(byPrice);
    else if (state.sort === 'price-desc') items.sort((a, b) => -byPrice(a, b));
    else if (state.sort === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0) || byPrice(a, b));
    return items;
  }

  function render() {
    if (state.loading) return;
    el.title.textContent = t('resultsFor', state.query);
    el.best.replaceChildren();
    el.status.replaceChildren();
    el.list.replaceChildren();
    el.direct.classList.remove('is-highlighted');

    if (state.lastError) {
      el.meta.textContent = '';
      renderError(state.lastError);
      return;
    }

    renderStoreOptions();
    const items = getVisible();
    const storeCount = new Set(items.map((r) => r.store)).size;
    el.meta.textContent = t('meta', items.length, storeCount) +
      (state.cached ? ` · ${t('fromCache')}` : '') +
      (DEMO ? ` · ${t('demoNote')}` : '');

    if (!state.results.length) {
      el.status.append(notice('notice--empty', t('empty')));
      el.direct.classList.add('is-highlighted');
      return;
    }
    if (!items.length) {
      el.status.append(notice('notice--empty', t('emptyFiltered')));
      return;
    }

    // Results far below the median price are usually accessories (cases, chargers),
    // so they are flagged and never chosen as the "best price".
    const outliers = findOutliers(items);
    const candidates = items.filter((r) => !outliers.has(r));
    const pool = candidates.length ? candidates : items;
    const prices = pool.map((r) => r.price.sar);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const bestItem = pool.find((r) => r.price.sar === min);
    renderBest(bestItem, max - min);

    const frag = document.createDocumentFragment();
    items.forEach((r) => frag.append(renderCard(r, r === bestItem, outliers.has(r))));
    el.list.append(frag);
  }

  /** Items priced below 35% of the median (only when there are 4+ results). */
  function findOutliers(items) {
    const set = new Set();
    if (items.length < 4) return set;
    const sorted = items.map((r) => r.price.sar).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    items.forEach((r) => { if (r.price.sar < median * 0.35) set.add(r); });
    return set;
  }

  function renderStoreOptions() {
    const stores = [...new Set(state.results.map((r) => r.store))].sort((a, b) => a.localeCompare(b, state.lang));
    const frag = document.createDocumentFragment();
    const all = document.createElement('option');
    all.value = '';
    all.textContent = t('allStores');
    frag.append(all);
    stores.forEach((s) => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      frag.append(o);
    });
    el.store.replaceChildren(frag);
    el.store.value = stores.includes(state.store) ? state.store : '';
  }

  function notice(kind, text) {
    const p = document.createElement('p');
    p.className = `notice ${kind}`;
    p.textContent = text;
    return p;
  }

  function renderError(code) {
    const msg = code === 'quota' ? t('errQuota') : code === 'server' ? t('errServer') : t('errNetwork');
    const box = notice('notice--error', msg);
    if (code !== 'quota') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--outline';
      btn.style.marginTop = '12px';
      btn.style.display = 'flex';
      btn.textContent = t('retry');
      btn.addEventListener('click', () => search(state.query));
      box.append(btn);
    } else {
      el.direct.classList.add('is-highlighted');
    }
    el.status.append(box);
  }

  function imageOrPlaceholder(src, alt, className) {
    if (src) {
      const img = document.createElement('img');
      img.className = className;
      img.src = src;
      img.alt = alt;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => img.replaceWith(placeholder(className)), { once: true });
      return img;
    }
    return placeholder(className);
  }

  function placeholder(className) {
    const div = document.createElement('div');
    div.className = `img-placeholder ${className}`;
    div.setAttribute('aria-hidden', 'true');
    div.innerHTML = // static icon
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>';
    return div;
  }

  function renderBest(item, saving) {
    const box = document.createElement('article');
    box.className = 'best';
    box.setAttribute('aria-label', t('best').replace('🏆 ', ''));

    const badge = document.createElement('span');
    badge.className = 'best__badge';
    badge.textContent = t('best');

    const info = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'best__title';
    title.textContent = `${item.title} — ${item.store}`;
    const price = document.createElement('p');
    price.className = 'best__price';
    price.textContent = fmtSar(item.price.sar);
    info.append(title, price);
    if (item.price.currency !== 'SAR') {
      const orig = document.createElement('p');
      orig.className = 'muted';
      orig.textContent = t('original', fmtOriginal(item.price.amount, item.price.currency));
      info.append(orig);
    }
    if (saving >= 1) {
      const save = document.createElement('p');
      save.className = 'best__save';
      save.textContent = t('save', fmtSar(Math.round(saving)));
      info.append(save);
    }

    const actions = document.createElement('div');
    actions.className = 'best__actions';
    actions.append(storeLink(item.url, 'btn'));

    box.append(badge, imageOrPlaceholder(item.image, t('productImage', item.title), 'best__img'), info, actions);
    el.best.append(box);
  }

  function storeLink(href, className) {
    const a = document.createElement('a');
    a.className = className;
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer nofollow';
    a.textContent = `${t('goStore')} ↗`;
    const sr = document.createElement('span');
    sr.className = 'visually-hidden';
    sr.textContent = ` ${t('opensNew')}`;
    a.append(sr);
    return a;
  }

  function renderCard(r, isBest, isOutlier) {
    const node = el.tpl.content.firstElementChild.cloneNode(true);
    if (isBest) node.classList.add('card--best');
    if (isOutlier) {
      const warn = document.createElement('p');
      warn.className = 'card__warn';
      warn.textContent = `⚠ ${t('outlier')}`;
      node.querySelector('.card__body').append(warn);
    }

    // Image (fall back to placeholder)
    const media = node.querySelector('.card__media');
    media.replaceChildren(imageOrPlaceholder(r.image, t('productImage', r.title), 'card__img'));

    node.querySelector('.card__title').textContent = r.title;

    const icon = node.querySelector('.card__store-icon');
    if (r.storeIcon) icon.src = r.storeIcon; else icon.remove();
    node.querySelector('.card__store-name').textContent = r.store;
    const badge = node.querySelector('.badge--sa');
    if (r.saudi) { badge.hidden = false; badge.textContent = t('saudiBadge'); }

    const metaParts = [];
    if (r.rating) metaParts.push(`★ ${r.rating.toFixed(1)}${r.reviews ? ` ${t('reviews', fmtNumber(r.reviews))}` : ''}`);
    if (r.delivery) metaParts.push(r.delivery);
    const meta = node.querySelector('.card__meta');
    if (metaParts.length) meta.textContent = metaParts.join(' · '); else meta.remove();

    node.querySelector('.price').textContent = fmtSar(r.price.sar);
    const orig = node.querySelector('.price__orig');
    if (r.price.currency !== 'SAR') orig.textContent = t('original', fmtOriginal(r.price.amount, r.price.currency));
    else orig.remove();

    const old = node.querySelector('.price__old');
    if (r.oldPriceSar && r.oldPriceSar > r.price.sar) old.firstElementChild.textContent = fmtSar(r.oldPriceSar);
    else old.remove();

    node.querySelector('.card__cta').replaceWith(storeLink(r.url, 'btn btn--outline card__cta'));
    return node;
  }

  /* ------------------------------------------------------------ demo data */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function demoSearch(q) {
    const h = hash(q.toLowerCase());
    const base = 150 + (h % 3800);
    const rnd = (i) => ((hash(q + i) % 1000) / 1000);
    const ar = state.lang === 'ar';
    const offers = [
      { store: 'noon', f: 1.0, cur: 'SAR', saudi: true, del: ar ? 'توصيل مجاني' : 'Free delivery', s: 'noon' },
      { store: 'Amazon.sa', f: 0.97, cur: 'SAR', saudi: true, del: ar ? 'توصيل مجاني مع Prime' : 'Free delivery with Prime', s: 'amazon-sa' },
      { store: ar ? 'مكتبة جرير' : 'Jarir Bookstore', f: 1.05, cur: 'SAR', saudi: true, del: ar ? 'استلام من الفرع' : 'Store pickup', s: 'jarir' },
      { store: ar ? 'إكسترا' : 'eXtra', f: 1.03, cur: 'SAR', saudi: true, del: null, s: 'extra' },
      { store: 'Amazon.com', f: 0.9, cur: 'USD', saudi: false, del: ar ? 'شحن دولي' : 'International shipping', s: 'amazon-com' },
      { store: 'AliExpress', f: 0.78, cur: 'USD', saudi: false, del: ar ? 'شحن 10–20 يوماً' : '10–20 day shipping', s: 'aliexpress' },
      { store: 'Sharaf DG', f: 1.01, cur: 'AED', saudi: false, del: ar ? 'يشحن للسعودية' : 'Ships to KSA', s: 'google' },
    ];
    const rates = { SAR: 1, USD: 1 / 3.75, AED: 0.97933 };
    const results = offers.map((o, i) => {
      const sar = Math.round(base * (o.f + (rnd(i) - 0.5) * 0.08));
      const amount = Math.round(sar * rates[o.cur] * 100) / 100;
      const storeDef = STORES.find((s) => s.id === o.s);
      return {
        id: `demo-${i}`,
        title: `${q} ${['', '– 128GB', '(Global)', '– Original', '', '– New', ''][i]}`.trim(),
        store: o.store,
        storeIcon: null,
        url: storeDef.url(q, state.lang),
        image: null,
        price: { amount, currency: o.cur, sar },
        oldPriceSar: rnd(i + 10) > 0.6 ? Math.round(sar * 1.15) : null,
        delivery: o.del,
        rating: Math.round((3.8 + rnd(i + 20) * 1.2) * 10) / 10,
        reviews: Math.round(rnd(i + 30) * 4000),
        saudi: o.saudi,
      };
    });
    return new Promise((resolve) => setTimeout(() => resolve({ results, cached: false }), 700));
  }

  /* ------------------------------------------------------------ events */
  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    search(el.input.value);
  });

  el.input.addEventListener('input', () => { if (!el.formError.hidden) showFormError(''); });

  document.querySelectorAll('.chip[data-q]').forEach((chip) => {
    chip.addEventListener('click', () => search(chip.dataset.q));
  });

  el.sort.addEventListener('change', () => { state.sort = el.sort.value; render(); });
  el.store.addEventListener('change', () => { state.store = el.store.value; render(); });
  el.saudi.addEventListener('change', () => { state.saudiOnly = el.saudi.checked; render(); });

  el.langToggle.addEventListener('click', () => {
    state.lang = state.lang === 'ar' ? 'en' : 'ar';
    store.set('ps:lang', state.lang);
    applyLanguage();
  });

  /* ------------------------------------------------------------ init */
  function init() {
    el.year.textContent = String(new Date().getFullYear());
    el.title.tabIndex = -1;
    el.demoBanner.hidden = !DEMO;

    const savedLang = store.get('ps:lang');
    if (savedLang === 'en' || savedLang === 'ar') state.lang = savedLang;
    applyLanguage();

    // Support shared links: ?q=iphone
    let initialQ = '';
    try { initialQ = new URL(window.location.href).searchParams.get('q') || ''; } catch (_) { /* ignore */ }
    if (initialQ) search(initialQ);
  }

  init();
})();
