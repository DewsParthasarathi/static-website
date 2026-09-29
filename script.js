(() => {
  'use strict';

  const STORAGE_KEY = 'ledgerly.invoices.v1';
  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    inbox: '<path d="M3 13h5l1 3h6l1-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
  };

  const SEED = [
    ['INV-1001', 'Northwind Studio', 'accounts@northwind.example', 4200, '2026-10-12', 'Pending', 'Brand refresh, phase 2'],
    ['INV-1002', 'Halden & Co', 'billing@halden.example', 1850.5, '2026-09-10', 'Overdue', 'Monthly retainer'],
    ['INV-1003', 'Marlow Foods', 'finance@marlow.example', 9600, '2026-09-01', 'Paid', 'Packaging design'],
    ['INV-1004', 'Kite Analytics', 'ap@kite.example', 3125, '2026-10-30', 'Pending', ''],
    ['INV-1005', 'Orchid Dental', 'office@orchid.example', 780, '2026-09-05', 'Overdue', 'Website maintenance'],
    ['INV-1006', 'Pinewood Labs', 'pay@pinewood.example', 15400, '2026-08-28', 'Paid', 'Research portal build'],
    ['INV-1007', 'Sable Legal', 'admin@sable.example', 2240, '2026-11-08', 'Pending', 'Quarterly audit']
  ].map(([number, client, email, amount, due, status, notes], i) => ({ id: 'seed' + i, number, client, email, amount, due, status, notes }));

  const state = { invoices: [], search: '', status: 'all', sort: 'due-asc', editingId: null, deleteId: null, saving: false, lastFocus: null };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };

  /* ---------- Icons ---------- */
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONS[name] || '';
    return svg;
  }
  const renderIcons = (root = document) => $$('[data-icon]', root).forEach(n => { n.replaceWith(icon(n.dataset.icon)); });

  /* ---------- Storage ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : null;
      state.invoices = Array.isArray(data) ? data : structuredClone(SEED);
    } catch { state.invoices = structuredClone(SEED); }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.invoices)); return true; }
    catch { toast('Could not save to browser storage.', 'error'); return false; }
  }

  /* ---------- Toasts ---------- */
  function toast(message, type = 'success') {
    const t = el('div', 'toast ' + type, message);
    t.setAttribute('role', type === 'error' ? 'alert' : 'status');
    $('#toasts').append(t);
    setTimeout(() => t.remove(), 3500);
  }

  /* ---------- Data view ---------- */
  function visibleInvoices() {
    const q = state.search.trim().toLowerCase();
    const [key, dir] = state.sort.split('-');
    const list = state.invoices.filter(i =>
      (state.status === 'all' || i.status === state.status) &&
      (!q || i.client.toLowerCase().includes(q) || i.number.toLowerCase().includes(q)));
    list.sort((a, b) => {
      const av = key === 'amount' ? a.amount : (a[key] || '').toString().toLowerCase();
      const bv = key === 'amount' ? b.amount : (b[key] || '').toString().toLowerCase();
      return (av > bv ? 1 : av < bv ? -1 : 0) * (dir === 'desc' ? -1 : 1);
    });
    return list;
  }

  function renderCards() {
    const sum = s => state.invoices.filter(i => s === 'all' || i.status === s);
    const total = list => list.reduce((t, i) => t + i.amount, 0);
    const defs = [['total', 'Total billed', 'all'], ['paid', 'Collected', 'Paid'], ['pending', 'Awaiting payment', 'Pending'], ['overdue', 'Overdue', 'Overdue']];
    const box = $('#summaryCards'); box.replaceChildren();
    defs.forEach(([cls, label, s]) => {
      const list = sum(s), c = el('article', 'card ' + cls);
      c.append(el('div', 'card-label', label), el('div', 'card-value', money(total(list))), el('div', 'card-sub', list.length + (list.length === 1 ? ' invoice' : ' invoices')));
      box.append(c);
    });
  }

  function renderTable() {
    const rows = visibleInvoices(), body = $('#tableBody');
    body.replaceChildren();
    rows.forEach(inv => {
      const tr = el('tr');
      const cc = el('td', 'client-cell'); cc.append(el('strong', '', inv.client), el('small', '', inv.email));
      const st = el('td'); st.append(el('span', 'badge ' + inv.status, inv.status));
      const ac = el('td'); const wrap = el('div', 'row-actions');
      [['eye', 'View', 'view'], ['edit', 'Edit', 'edit'], ['trash', 'Delete', 'delete danger']].forEach(([ic, label, act]) => {
        const b = el('button', 'icon-btn ' + act.split(' ').slice(1).join(' '));
        b.type = 'button'; b.dataset.action = act.split(' ')[0]; b.dataset.id = inv.id;
        b.setAttribute('aria-label', `${label} ${inv.number}`); b.title = label; b.append(icon(ic)); wrap.append(b);
      });
      ac.append(wrap);
      tr.append(el('td', '', inv.number), cc, el('td', 'amount', money(inv.amount)), el('td', '', fmtDate(inv.due)), st, ac);
      body.append(tr);
    });
    $('#emptyState').hidden = rows.length > 0;
    $('#tableWrap').hidden = rows.length === 0;
    $('#countLabel').textContent = `Showing ${rows.length} of ${state.invoices.length} invoices`;
    $$('.sort-btn').forEach(b => {
      const [k, d] = state.sort.split('-');
      b.dataset.dir = (b.dataset.sort === k || (b.dataset.sort === 'due' && k === 'due')) ? d : '';
    });
  }

  function renderNotifications() {
    const overdue = state.invoices.filter(i => i.status === 'Overdue');
    const ul = $('#notifList'); ul.replaceChildren();
    if (!overdue.length) ul.append(el('li', '', 'You are all caught up.'));
    overdue.forEach(i => { const li = el('li', '', `${i.number} is overdue`); li.append(el('small', '', `${i.client}, ${money(i.amount)}`)); ul.append(li); });
    $('#notifDot').hidden = overdue.length === 0;
  }

  function render() { renderCards(); renderTable(); renderNotifications(); }

  /* ---------- Modals ---------- */
  function openModal(id) {
    state.lastFocus = document.activeElement;
    const m = $(id); m.hidden = false;
    const target = $('input,select,textarea,button:not([data-close])', m) || $('button', m);
    setTimeout(() => target && target.focus(), 0);
  }
  function closeModals() {
    $$('.modal-backdrop').forEach(m => { m.hidden = true; });
    state.deleteId = null;
    if (state.lastFocus && document.contains(state.lastFocus)) state.lastFocus.focus();
  }
  function trapFocus(e) {
    const open = $$('.modal-backdrop').find(m => !m.hidden);
    if (!open || e.key !== 'Tab') return;
    const f = $$('button,input,select,textarea,[href]', open).filter(n => !n.disabled);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Form ---------- */
  const form = $('#invoiceForm');
  const rules = {
    client: v => v.trim().length < 2 ? 'Enter a client name with at least 2 characters.' : '',
    email: v => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'Enter a valid email address, like name@company.com.' : '',
    amount: v => !(parseFloat(v) > 0) || parseFloat(v) > 10000000 ? 'Enter an amount greater than 0 and up to 10,000,000.' : '',
    due: v => !v || isNaN(new Date(v)) ? 'Choose a due date.' : ''
  };
  function validate() {
    let ok = true;
    Object.keys(rules).forEach(name => {
      const input = form.elements[name], msg = rules[name](input.value);
      $('#e' + name[0].toUpperCase() + name.slice(1)).textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg) ok = false;
    });
    if (!ok) form.querySelector('[aria-invalid="true"]').focus();
    return ok;
  }
  function openForm(id) {
    state.editingId = id || null;
    form.reset();
    $$('.error', form).forEach(e => { e.textContent = ''; });
    $$('[aria-invalid]', form).forEach(i => i.removeAttribute('aria-invalid'));
    const inv = id && state.invoices.find(i => i.id === id);
    $('#formTitle').textContent = inv ? 'Edit ' + inv.number : 'New invoice';
    if (inv) Object.keys(rules).concat(['status', 'notes']).forEach(k => { form.elements[k].value = inv[k] ?? ''; });
    openModal('#formModal');
  }
  function nextNumber() {
    const max = state.invoices.reduce((m, i) => Math.max(m, parseInt(i.number.replace(/\D/g, ''), 10) || 0), 1000);
    return 'INV-' + (max + 1);
  }
  function submitForm(e) {
    e.preventDefault();
    if (state.saving || !validate()) return;
    state.saving = true;
    const btn = $('#saveBtn'); btn.disabled = true; btn.textContent = 'Saving...';
    setTimeout(() => {
      const d = Object.fromEntries(new FormData(form));
      const rec = { client: d.client.trim(), email: d.email.trim(), amount: Math.round(parseFloat(d.amount) * 100) / 100, due: d.due, status: d.status, notes: d.notes.trim() };
      const existing = state.editingId && state.invoices.find(i => i.id === state.editingId);
      if (existing) Object.assign(existing, rec);
      else state.invoices.push({ id: 'id' + Date.now(), number: nextNumber(), ...rec });
      if (save()) toast(existing ? 'Invoice updated.' : 'Invoice created.');
      state.saving = false; btn.disabled = false; btn.textContent = 'Save invoice';
      closeModals(); render();
    }, 350);
  }

  function viewInvoice(id) {
    const inv = state.invoices.find(i => i.id === id); if (!inv) return;
    $('#viewTitle').textContent = inv.number;
    const dl = $('#viewBody'); dl.replaceChildren();
    [['Client', inv.client], ['Email', inv.email], ['Amount', money(inv.amount)], ['Due', fmtDate(inv.due)], ['Status', inv.status], ['Notes', inv.notes || 'None']]
      .forEach(([k, v]) => dl.append(el('dt', '', k), el('dd', '', v)));
    openModal('#viewModal');
  }
  function askDelete(id) {
    const inv = state.invoices.find(i => i.id === id); if (!inv) return;
    state.deleteId = id;
    $('#confirmText').textContent = `${inv.number} for ${inv.client} (${money(inv.amount)}) will be removed. This cannot be undone.`;
    openModal('#confirmModal');
  }
  function confirmDelete() {
    const id = state.deleteId; if (!id) return;
    state.invoices = state.invoices.filter(i => i.id !== id);
    if (save()) toast('Invoice deleted.');
    closeModals(); render();
  }

  /* ---------- Dropdowns, nav, misc ---------- */
  function closeDropdowns(except) {
    $$('.dropdown').forEach(d => {
      if (d === except) return;
      $('.dropdown-menu', d).hidden = true; $('[data-dropdown-toggle]', d).setAttribute('aria-expanded', 'false');
    });
  }
  function setView(btn) {
    $$('.nav-item').forEach(n => n.classList.toggle('is-active', n === btn));
    $('#pageTitle').textContent = btn.dataset.title;
    state.status = btn.dataset.view; $('#statusFilter').value = state.status;
    closeSidebar(); renderTable();
  }
  function setSidebar(open) {
    $('#sidebar').classList.toggle('is-open', open); $('#scrim').hidden = !open;
    $('#menuBtn').setAttribute('aria-expanded', String(open));
  }
  const closeSidebar = () => setSidebar(false);

  function exportCsv() {
    const esc = v => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = [['Invoice', 'Client', 'Email', 'Amount', 'Due', 'Status', 'Notes']].concat(visibleInvoices().map(i => [i.number, i.client, i.email, i.amount, i.due, i.status, i.notes]));
    const url = URL.createObjectURL(new Blob([rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv' }));
    const a = el('a'); a.href = url; a.download = 'invoices.csv'; a.click(); URL.revokeObjectURL(url);
    toast('CSV exported.');
  }
  function clearFilters() {
    state.search = ''; state.status = 'all';
    $('#searchInput').value = ''; $('#statusFilter').value = 'all';
    setView($('.nav-item[data-view="all"]'));
  }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  /* ---------- Events ---------- */
  function bind() {
    $$('.nav-item').forEach(b => b.addEventListener('click', () => setView(b)));
    $('#menuBtn').addEventListener('click', () => setSidebar(true));
    $('#scrim').addEventListener('click', closeSidebar);
    $('#searchInput').addEventListener('input', debounce(e => { state.search = e.target.value; renderTable(); }, 150));
    $('#statusFilter').addEventListener('change', e => {
      state.status = e.target.value;
      const match = $(`.nav-item[data-view="${state.status}"]`);
      $$('.nav-item').forEach(n => n.classList.toggle('is-active', n === match));
      $('#pageTitle').textContent = match ? match.dataset.title : 'Invoices';
      renderTable();
    });
    $('#sortSelect').addEventListener('change', e => { state.sort = e.target.value; renderTable(); });
    $$('.sort-btn').forEach(b => b.addEventListener('click', () => {
      const [k, d] = state.sort.split('-'), key = b.dataset.sort;
      state.sort = key + '-' + (k === key && d === 'asc' ? 'desc' : 'asc');
      $('#sortSelect').value = [...$('#sortSelect').options].some(o => o.value === state.sort) ? state.sort : $('#sortSelect').value;
      renderTable();
    }));
    $('#addBtn').addEventListener('click', () => openForm());
    $('#clearBtn').addEventListener('click', clearFilters);
    $('#tableBody').addEventListener('click', e => {
      const b = e.target.closest('button[data-action]'); if (!b) return;
      ({ view: viewInvoice, edit: openForm, delete: askDelete })[b.dataset.action](b.dataset.id);
    });
    form.addEventListener('submit', submitForm);
    form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true' && !rules[e.target.name]?.(e.target.value)) validate(); });
    $('#confirmDelete').addEventListener('click', confirmDelete);
    $$('.modal-backdrop').forEach(m => m.addEventListener('mousedown', e => { if (e.target === m) closeModals(); }));
    $$('[data-close]').forEach(b => b.addEventListener('click', closeModals));
    $$('[data-dropdown-toggle]').forEach(b => b.addEventListener('click', () => {
      const d = b.closest('.dropdown'), menu = $('.dropdown-menu', d), open = menu.hidden;
      closeDropdowns(d); menu.hidden = !open; b.setAttribute('aria-expanded', String(open));
    }));
    document.addEventListener('click', e => { if (!e.target.closest('.dropdown')) closeDropdowns(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeModals(); closeDropdowns(); closeSidebar(); }
      trapFocus(e);
    });
    $('#exportBtn').addEventListener('click', () => { closeDropdowns(); exportCsv(); });
    $('#resetBtn').addEventListener('click', () => { closeDropdowns(); state.invoices = structuredClone(SEED); save(); render(); toast('Demo data restored.'); });
  }

  function init() {
    renderIcons(); load(); bind();
    $('#year').textContent = new Date().getFullYear();
    setTimeout(() => { $('#loadingState').hidden = true; render(); }, 450);
    $('#tableWrap').hidden = true;
  }
  init();
})();
