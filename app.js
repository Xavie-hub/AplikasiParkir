/* ParkirKu - prototype frontend untuk SPK Pengembangan Aplikasi Parkir.
 * Penyimpanan browser dipakai agar aplikasi dapat langsung dicoba tanpa backend.
 * Saat dipindahkan ke server, fungsi repository di bagian state dapat diganti API.
 */

const STORAGE_KEY = 'parkirku-state-v1';
const SESSION_KEY = 'parkirku-session-v1';
const API_BASE = window.PARKIRKU_API || '/backend/api.php';

const ROLE_LABELS = {
  admin: 'Administrator',
  petugas: 'Petugas Loket',
  owner: 'Owner'
};

const VIEW_LABELS = {
  dashboard: 'Ringkasan',
  loket: 'Loket Tiket',
  kendaraan: 'Kendaraan',
  tarif: 'Tarif Parkir',
  area: 'Area Parkir',
  users: 'Pengguna',
  laporan: 'Rekap Transaksi',
  aktivitas: 'Log Aktivitas'
};

const VEHICLE_BRANDS = {
  motor: ['Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Ducati', 'Aprilia', 'Vespa', 'Piaggio', 'Moto Guzzi', 'MV Agusta', 'Benelli', 'BMW Motorrad', 'Horex', 'MZ', 'Harley-Davidson', 'Indian Motorcycle', 'Buell', 'Triumph', 'Norton', 'Royal Enfield', 'BSA', 'CCM', 'KTM', 'Husqvarna', 'GasGas', 'CFMoto', 'QJMotor', 'Zontes', 'Loncin', 'Voge', 'Yadea', 'NIU', 'Kymco', 'SYM', 'TVS', 'Bajaj', 'Hero', 'Ather', 'Ultraviolette'],
  mobil: ['Toyota', 'Honda', 'Mitsubishi', 'Suzuki', 'Nissan', 'Mazda', 'Subaru', 'Daihatsu', 'Isuzu', 'Lexus', 'Infiniti', 'Acura', 'Mercedes-Benz', 'BMW', 'Audi', 'Volkswagen', 'Porsche', 'Opel', 'Maybach', 'Smart', 'Alpina', 'Ford', 'Chevrolet', 'Jeep', 'Tesla', 'Cadillac', 'Dodge', 'Chrysler', 'GMC', 'Buick', 'Lincoln', 'RAM', 'Rivian', 'Lucid', 'Hyundai', 'Kia', 'Genesis', 'KGM (SsangYong)', 'Ferrari', 'Lamborghini', 'Maserati', 'Fiat', 'Alfa Romeo', 'Lancia', 'Pagani', 'Jaguar', 'Land Rover', 'Bentley', 'Rolls-Royce', 'Aston Martin', 'McLaren', 'MINI', 'Lotus', 'MG', 'Vauxhall', 'Peugeot', 'Renault', 'Citroën', 'DS Automobiles', 'Bugatti']
};

const ACCESS = {
  admin: ['dashboard', 'loket', 'kendaraan', 'tarif', 'area', 'users', 'laporan', 'aktivitas'],
  petugas: ['dashboard', 'loket', 'kendaraan'],
  owner: ['dashboard', 'loket', 'kendaraan', 'tarif', 'area', 'users', 'laporan', 'aktivitas']
};

const app = {
  state: null,
  currentUser: null,
  backendEnabled: false,
  activeView: 'dashboard',
  editing: { user: null, tariff: null, area: null, vehicle: null },
  reportFilters: { from: dateInputValue(-6), to: dateInputValue(0) },
  reportData: null
};

document.addEventListener('DOMContentLoaded', () => { void init(); });

async function init() {
  app.backendEnabled = await detectBackend();
  if (app.backendEnabled) {
    app.state = await loadBackendState();
    try {
      app.currentUser = mapUser(await apiRequest('/auth/me'));
    } catch (error) {
      app.currentUser = null;
    }
  } else {
    app.state = loadState();
    const sessionUsername = localStorage.getItem(SESSION_KEY);
    app.currentUser = app.state.users.find((user) => user.username === sessionUsername) || null;
  }
  bindGlobalEvents();
  if (app.currentUser) showApp();
  else showLogin();
}

async function detectBackend() {
  try {
    await apiRequest('/health');
    return true;
  } catch (error) {
    return false;
  }
}

async function apiRequest(path, options = {}) {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (options.body && typeof options.body !== 'string') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.success !== true) {
    throw new Error((payload && payload.message) || `Request API gagal (${response.status})`);
  }
  return payload.data;
}

async function loadBackendState() {
  const read = (path) => apiRequest(path).catch(() => []);
  const [users, tariffs, areas, vehicles, transactions, logs] = await Promise.all([
    read('/users'), read('/tariffs'), read('/areas'), read('/vehicles'), read('/transactions?status=all'), read('/logs')
  ]);
  return {
    users: users.map(mapUser),
    tariffs: tariffs.map(mapTariff),
    areas: areas.map(mapArea),
    vehicles: vehicles.map(mapVehicle),
    tickets: transactions.map(mapTransaction),
    logs: logs.map(mapLog)
  };
}

async function refreshBackendState() {
  if (!app.backendEnabled) return;
  app.state = await loadBackendState();
}

function mapUser(user) {
  return { ...user, id: String(user.id), lastLogin: user.lastLogin ?? user.last_login_at ?? null, createdAt: user.createdAt ?? user.created_at ?? null };
}

function mapTariff(tariff) {
  return { ...tariff, id: String(tariff.id), vehicleType: tariff.vehicleType ?? tariff.vehicle_type, rate: Number(tariff.rate ?? tariff.rate_per_hour ?? 0), updatedAt: tariff.updatedAt ?? tariff.updated_at ?? null };
}

function mapArea(area) {
  return { ...area, id: String(area.id), capacity: Number(area.capacity) };
}

function mapVehicle(vehicle) {
  return { ...vehicle, id: String(vehicle.id), plate: vehicle.plate ?? vehicle.plate_number, owner: vehicle.owner ?? vehicle.owner_name, type: vehicle.type ?? vehicle.vehicle_type, isParked: Boolean(Number(vehicle.is_parked)) };
}

function mapTransaction(ticket) {
  return { ...ticket, id: String(ticket.id), code: ticket.code ?? ticket.ticket_code, vehicleId: ticket.vehicleId ?? (ticket.vehicle_id === null ? '' : String(ticket.vehicle_id)), plate: ticket.plate ?? ticket.plate_number, vehicleType: ticket.vehicleType ?? ticket.vehicle_type, brand: ticket.brand ?? ticket.vehicle_brand ?? '', areaId: String(ticket.areaId ?? ticket.area_id), rate: Number(ticket.rate ?? ticket.rate_per_hour ?? 0), entryAt: ticket.entryAt ?? ticket.entry_at, exitAt: ticket.exitAt ?? ticket.exit_at, durationHours: ticket.durationHours ?? ticket.duration_hours, total: Number(ticket.total ?? ticket.total_amount ?? 0), createdBy: ticket.createdBy ?? ticket.created_by };
}

function brandOptions(vehicleType, selected = '') {
  const brands = VEHICLE_BRANDS[vehicleType] || [];
  return `<option value="">Pilih merek kendaraan</option>${brands.map((brand) => `<option value="${escapeHtml(brand)}" ${brand === selected ? 'selected' : ''}>${escapeHtml(brand)}</option>`).join('')}`;
}

function mapLog(log) {
  return { ...log, id: String(log.id), createdAt: log.createdAt ?? log.created_at, userName: log.userName ?? log.user_name, action: log.action ?? log.action_name, module: log.module ?? log.module_name };
}

function bindGlobalEvents() {
  document.querySelector('#login-form').addEventListener('submit', handleLogin);
  document.querySelectorAll('[data-demo-login]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector('#login-username').value = button.dataset.demoLogin;
      document.querySelector('#login-password').value = `${button.dataset.demoLogin}123`;
      document.querySelector('#login-form').requestSubmit();
    });
  });
  document.querySelector('[data-toggle-password]').addEventListener('click', (event) => {
    const input = document.querySelector('#login-password');
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    event.currentTarget.textContent = visible ? 'Lihat' : 'Sembunyikan';
  });
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('submit', handleDocumentSubmit);
  document.addEventListener('change', (event) => {
    if (event.target.id === 'active-ticket-select') {
      const referenceInput = document.querySelector('#exit-reference');
      if (referenceInput) referenceInput.value = event.target.value;
      return;
    }
    if (event.target.id === 'vehicle-type') {
      const brandInput = document.querySelector('#vehicle-brand');
      if (brandInput) {
        brandInput.innerHTML = brandOptions(event.target.value);
        brandInput.required = ['motor', 'mobil'].includes(event.target.value);
      }
      return;
    }
    if (event.target.id !== 'vehicle-select') return;
    const vehicle = findById(app.state.vehicles, event.target.value);
    if (!vehicle) return;
    const plateInput = document.querySelector('#plate-input');
    const typeInput = document.querySelector('#vehicle-type');
    if (plateInput) plateInput.value = vehicle.plate;
    if (typeInput) typeInput.value = vehicle.type;
    const brandInput = document.querySelector('#vehicle-brand');
    if (brandInput) {
      brandInput.innerHTML = brandOptions(vehicle.type, vehicle.brand || '');
      brandInput.value = vehicle.brand || '';
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
  window.addEventListener('hashchange', routeFromLocation);
  window.addEventListener('popstate', routeFromLocation);
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const username = String(form.get('username')).trim().toLowerCase();
  const password = String(form.get('password'));
  if (app.backendEnabled) {
    try {
      app.currentUser = mapUser(await apiRequest('/auth/login', { method: 'POST', body: { username, password } }));
      await refreshBackendState();
      showApp();
      showToast(`Selamat datang, ${app.currentUser.name.split(' ')[0]}!`, 'success');
    } catch (error) {
      showToast(error.message || 'Username atau password tidak sesuai.', 'error');
    }
    return;
  }
  const user = app.state.users.find((item) => item.username.toLowerCase() === username && item.password === password && item.status === 'aktif');
  if (!user) {
    showToast('Username atau password tidak sesuai.', 'error');
    return;
  }
  user.lastLogin = new Date().toISOString();
  saveState();
  app.currentUser = user;
  localStorage.setItem(SESSION_KEY, user.username);
  addLog('Login ke sistem', `Akun ${user.username} berhasil masuk`, 'login');
  saveState();
  showApp();
  showToast(`Selamat datang, ${user.name.split(' ')[0]}!`, 'success');
}

function showLogin() {
  document.querySelector('#login-screen').classList.remove('hidden');
  document.querySelector('#app-screen').classList.add('hidden');
}

function showApp() {
  document.querySelector('#login-screen').classList.add('hidden');
  document.querySelector('#app-screen').classList.remove('hidden');
  const requestedView = getViewFromLocation();
  // Activity diagram: setelah login valid, semua role masuk ke dashboard
  // sesuai role. Petugas tetap dapat membuka Loket Tiket dari menu utama.
  app.activeView = canAccess(requestedView) ? requestedView : 'dashboard';
  setRoute(app.activeView, true);
  refreshShell();
  render();
  if (app.activeView === 'laporan') void refreshReportData();
}

async function logout() {
  if (app.backendEnabled) {
    try { await apiRequest('/auth/logout', { method: 'POST' }); } catch (error) { /* session lokal tetap dibersihkan */ }
  } else {
    if (app.currentUser) { addLog('Logout dari sistem', `Akun ${app.currentUser.username} keluar`, 'logout'); saveState(); }
    localStorage.removeItem(SESSION_KEY);
  }
  app.currentUser = null;
  app.activeView = 'dashboard';
  window.history.replaceState(null, '', `${location.pathname}${location.search}`);
  closeModal();
  showLogin();
  document.querySelector('#login-form').reset();
  showToast('Anda telah keluar dari sistem.', 'success');
}

function refreshShell() {
  if (!app.currentUser) return;
  const initials = getInitials(app.currentUser.name);
  const role = ROLE_LABELS[app.currentUser.role];
  document.querySelector('#sidebar-avatar').textContent = initials;
  document.querySelector('#topbar-avatar').textContent = initials;
  document.querySelector('#sidebar-name').textContent = app.currentUser.name;
  document.querySelector('#topbar-name').textContent = app.currentUser.name;
  document.querySelector('#sidebar-role').textContent = role;
  document.querySelector('#topbar-role').textContent = role;
  document.querySelector('#current-date').textContent = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
  const hasFullAccess = ['admin', 'owner'].includes(app.currentUser.role);
  document.querySelectorAll('.admin-only').forEach((element) => element.classList.toggle('hidden', !hasFullAccess));
  document.querySelectorAll('.admin-access').forEach((element) => element.classList.toggle('hidden', !hasFullAccess));
  document.querySelectorAll('.owner-access').forEach((element) => element.classList.toggle('hidden', !['admin', 'owner'].includes(app.currentUser.role)));
}

function render() {
  if (!app.currentUser) return;
  if (!canAccess(app.activeView)) app.activeView = 'dashboard';
  document.querySelector('#breadcrumb-current').textContent = VIEW_LABELS[app.activeView];
  document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item.dataset.view === app.activeView));
  const root = document.querySelector('#app-root');
  const views = { dashboard: renderDashboard, loket: renderLoket, kendaraan: renderVehicles, tarif: renderTariffs, area: renderAreas, users: renderUsers, laporan: renderReports, aktivitas: renderActivities };
  document.title = `ParkirKu | ${VIEW_LABELS[app.activeView]}`;
  root.classList.remove('page-enter');
  root.innerHTML = views[app.activeView]();
  requestAnimationFrame(() => root.classList.add('page-enter'));
  document.querySelector('#sidebar').classList.remove('open');
}

function getViewFromLocation() {
  const view = location.hash.replace('#', '').trim();
  return VIEW_LABELS[view] ? view : 'dashboard';
}

function setRoute(view, replace = false) {
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ view }, '', `#${view}`);
}

function navigateTo(view) {
  if (!canAccess(view)) {
    showToast('Menu ini tidak tersedia untuk peran Anda.', 'error');
    return;
  }
  if (view === app.activeView && getViewFromLocation() === view) return;
  app.activeView = view;
  setRoute(view);
  render();
  if (view === 'laporan') void refreshReportData();
}

function routeFromLocation() {
  if (!app.currentUser) return;
  const view = getViewFromLocation();
  if (!canAccess(view)) {
    setRoute('dashboard', true);
    app.activeView = 'dashboard';
  } else {
    app.activeView = view;
  }
  render();
  if (app.activeView === 'laporan') void refreshReportData();
}

function handleDocumentClick(event) {
  const navItem = event.target.closest('[data-view]');
  if (navItem && !navItem.classList.contains('hidden')) {
    const view = navItem.dataset.view;
    if (!canAccess(view)) {
      showToast('Menu ini tidak tersedia untuk peran Anda.', 'error');
      return;
    }
    navigateTo(view);
    return;
  }
  if (event.target.closest('[data-logout]')) {
    logout();
    return;
  }
  if (event.target.closest('[data-open-sidebar]')) {
    document.querySelector('#sidebar').classList.add('open');
    return;
  }
  if (event.target.closest('[data-close-sidebar]')) {
    document.querySelector('#sidebar').classList.remove('open');
    return;
  }
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  handleAction(actionElement.dataset.action, actionElement);
}

function handleDocumentSubmit(event) {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  const formType = form.dataset.form;
  const handlers = { ticket: submitTicket, 'exit-ticket': submitExitTicket, vehicle: submitVehicle, tariff: submitTariff, area: submitArea, user: submitUser, report: submitReportFilters };
  if (handlers[formType]) handlers[formType](new FormData(form));
}

function handleAction(action, element) {
  const id = element.dataset.id;
  if (action === 'new-ticket') {
    navigateTo('loket');
    document.querySelector('#plate-input')?.focus();
  }
  if (action === 'new-vehicle') {
    openManagementModal('vehicle', 'new');
  }
  if (action === 'edit-user') openManagementModal('user', id);
  if (action === 'edit-tariff') openManagementModal('tariff', id);
  if (action === 'edit-area') openManagementModal('area', id);
  if (action === 'edit-vehicle') openManagementModal('vehicle', id);
  if (action === 'cancel-edit') { app.editing[element.dataset.type] = null; closeModal(); }
  if (action === 'delete-user') deleteRecord('users', id, 'pengguna');
  if (action === 'delete-tariff') deleteRecord('tariffs', id, 'tarif');
  if (action === 'delete-area') deleteRecord('areas', id, 'area');
  if (action === 'delete-vehicle') deleteRecord('vehicles', id, 'kendaraan');
  if (action === 'complete-ticket') completeTicket(id);
  if (action === 'view-ticket' || action === 'print-ticket') {
    const ticket = findById(app.state.tickets, id);
    if (ticket) showReceiptModal(ticket, action === 'print-ticket');
  }
  if (action === 'print-modal') {
    const ticket = findById(app.state.tickets, id);
    if (ticket) printTicket(ticket);
  }
  if (action === 'close-modal') closeModal();
  if (action === 'export-report') exportReport();
}

function openManagementModal(type, id = 'new') {
  const collections = { user: 'users', tariff: 'tariffs', area: 'areas', vehicle: 'vehicles' };
  const renderers = { user: userForm, tariff: tariffForm, area: areaForm, vehicle: vehicleForm };
  const titles = { user: id === 'new' ? 'Tambah pengguna' : 'Edit pengguna', tariff: id === 'new' ? 'Tambah tarif' : 'Edit tarif', area: id === 'new' ? 'Tambah area parkir' : 'Edit area parkir', vehicle: id === 'new' ? 'Tambah kendaraan' : 'Edit kendaraan' };
  if (!collections[type]) return;
  const record = id === 'new' ? { id: 'new' } : findById(app.state[collections[type]], id);
  if (!record) return;
  app.editing[type] = record;
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop"><div class="modal management-modal" role="dialog" aria-modal="true" aria-label="${titles[type]}"><div class="modal-header"><h3>${titles[type]}</h3><button class="modal-close" data-action="close-modal" aria-label="Tutup">×</button></div><div class="modal-content management-modal-content">${renderers[type](id === 'new' ? null : record)}</div></div></div>`;
  setTimeout(() => document.querySelector('.management-modal input:not([type="hidden"])')?.focus(), 50);
}

function canAccess(view) {
  return Boolean(app.currentUser && ACCESS[app.currentUser.role]?.includes(view));
}

/* Views */
function renderDashboard() {
  const activeTickets = app.state.tickets.filter((ticket) => ticket.status === 'aktif');
  const completedTickets = app.state.tickets.filter((ticket) => ticket.status === 'selesai');
  const today = dateInputValue(0);
  const todayTickets = app.state.tickets.filter((ticket) => localDateKey(new Date(ticket.entryAt)) === today);
  const revenue = completedTickets.reduce((sum, ticket) => sum + Number(ticket.total || 0), 0);
  const occupied = activeTickets.length;
  const capacity = app.state.areas.reduce((sum, area) => sum + Number(area.capacity), 0);
  const recent = [...app.state.tickets].sort(sortByDate).slice(0, 5);
  const canSeeStats = app.currentUser.role === 'admin' || app.currentUser.role === 'owner';
  return `
    <div class="welcome-banner">
      <p class="eyebrow">${greeting()}, ${escapeHtml(app.currentUser.name.split(' ')[0])}</p>
      <h1>${app.currentUser.role === 'petugas' ? 'Loket siap melayani hari ini.' : 'Semua area parkir dalam kendali.'}</h1>
      <p>${canSeeStats ? 'Pantau aktivitas operasional, kapasitas area, dan performa transaksi dari ringkasan ini.' : 'Gunakan menu Loket Tiket untuk mencatat kendaraan masuk dan mencetak tiket parkir.'}</p>
    </div>
    <div class="grid grid-4 dashboard-kpis">
      ${kpiCard('Kendaraan aktif', occupied, `${capacity ? Math.round((occupied / capacity) * 100) : 0}% dari kapasitas`, '▱', '')}
      ${kpiCard('Transaksi hari ini', todayTickets.length, 'tiket tercatat hari ini', '▣', 'yellow')}
      ${canSeeStats ? kpiCard('Pendapatan selesai', formatCurrency(revenue), `${completedTickets.length} transaksi selesai`, '◈', 'blue') : kpiCard('Area tersedia', Math.max(capacity - occupied, 0), 'slot masih kosong', '▦', 'blue')}
      ${canSeeStats ? kpiCard('Total kendaraan', app.state.vehicles.length, 'data kendaraan terdaftar', '♧', 'red') : kpiCard('Tiket aktif', activeTickets.length, 'perlu dipantau', '◷', 'red')}
    </div>
    <div class="grid grid-2 dashboard-lower">
      <section class="card chart-card">
        <div class="card-header"><div><h3>Aktivitas transaksi</h3><p>Jumlah kendaraan masuk dalam 7 hari terakhir</p></div><div class="legend"><span><i></i>Masuk</span><span><i class="secondary"></i>Selesai</span></div></div>
        ${renderChart()}
      </section>
      <section class="card occupancy-card">
        <div class="card-header"><div><h3>Okupansi area</h3><p>Perbarui otomatis dari tiket aktif</p></div><span class="live-count"><i></i>Live</span></div>
        <div class="card-body">${renderOccupancy()}</div>
      </section>
    </div>
    <section class="card" style="margin-top:18px">
      <div class="card-header"><div><h3>Transaksi terbaru</h3><p>Aktivitas loket terakhir yang tercatat</p></div><button class="button button-ghost button-small" data-view="${canAccess('laporan') ? 'laporan' : 'loket'}">Lihat semua&nbsp; →</button></div>
      ${renderTicketTable(recent, { compact: true })}
    </section>
    <section style="margin-top:18px"><div class="card-header" style="padding:0 0 12px;border:0"><div><h3 style="margin:0;color:var(--navy);font:700 14px 'Manrope',sans-serif">Akses cepat</h3></div></div><div class="quick-actions">
      <button class="quick-action" data-action="new-ticket"><span>▣</span><span>Terbitkan tiket baru</span><b>→</b></button>
      ${app.currentUser.role === 'admin' ? '<button class="quick-action" data-view="kendaraan"><span>＋</span><span>Tambah kendaraan</span><b>→</b></button>' : ''}
      ${canAccess('laporan') ? '<button class="quick-action" data-view="laporan"><span>▤</span><span>Buka rekap transaksi</span><b>→</b></button>' : '<button class="quick-action" data-view="kendaraan"><span>▱</span><span>Cari kendaraan</span><b>→</b></button>'}
    </div></section>
  `;
}

function renderLoket() {
  const activeTickets = [...app.state.tickets].filter((ticket) => ticket.status === 'aktif').sort(sortByDate);
  const activeTicketOptions = activeTickets.map((ticket) => `<option value="${escapeHtml(ticket.code)}">${escapeHtml(ticket.code)} · ${escapeHtml(ticket.plate)} · ${typeLabel(ticket.vehicleType)}</option>`).join('');
  const areas = app.state.areas.map((area) => {
    const occupied = getAreaOccupied(area.id);
    const disabled = occupied >= area.capacity ? 'disabled' : '';
    return `<option value="${area.id}" ${disabled}>${escapeHtml(area.name)} · ${Math.max(area.capacity - occupied, 0)} slot tersedia</option>`;
  }).join('');
  const vehicleOptions = app.state.vehicles.filter((vehicle) => !app.state.tickets.some((ticket) => ticket.vehicleId === vehicle.id && ticket.status === 'aktif')).map((vehicle) => `<option value="${vehicle.id}">${escapeHtml(vehicle.plate)} · ${escapeHtml(vehicle.owner)}</option>`).join('');
  return `
    <div class="page-heading"><div><p class="eyebrow">OPERASIONAL LOKET</p><h1>Loket tiket parkir</h1><p>Catat kendaraan masuk, terbitkan tiket, dan selesaikan transaksi.</p></div><div class="heading-actions"><span class="role-pill">${ROLE_LABELS[app.currentUser.role]}</span></div></div>
    <div class="counter-layout">
      <section class="counter-form">
        <p class="eyebrow">TIKET BARU</p><h2>Terbitkan tiket</h2><p>Isi data kendaraan untuk membuat tiket masuk dan mencetak bukti parkir.</p>
        <form data-form="ticket" class="form-grid">
          <div class="form-group full"><label for="vehicle-select">Kendaraan terdaftar (opsional)</label><select id="vehicle-select" name="vehicleId"><option value="">Pilih kendaraan atau isi plat manual</option>${vehicleOptions}</select></div>
          <div class="form-group full"><label for="vehicle-brand">Merek kendaraan *</label><select id="vehicle-brand" name="vehicleBrand" required>${brandOptions('motor')}</select></div>
          <div class="form-group"><label for="plate-input">Nomor polisi *</label><input id="plate-input" name="plate" placeholder="Contoh: B 1234 ABC" required /></div>
          <div class="form-group"><label for="vehicle-type">Jenis kendaraan *</label><select id="vehicle-type" name="vehicleType" required>${typeOptions()}</select></div>
          <div class="form-group full"><label for="area-select">Area parkir *</label><select id="area-select" name="areaId" required><option value="">Pilih area parkir</option>${areas}</select></div>
          <div class="form-actions"><button class="button button-primary" type="submit">Simpan & cetak tiket <span>→</span></button></div>
        </form>
        <div class="counter-divider"></div>
        <p class="eyebrow exit-eyebrow">KENDARAAN KELUAR</p><h3 class="exit-title">Checkout kendaraan</h3><p class="exit-description">Masukkan kode tiket atau nomor polisi untuk menghitung biaya dan mencetak struk keluar.</p>
        <form data-form="exit-ticket" class="form-grid">
          <div class="form-group full"><label for="active-ticket-select">Pilih kendaraan yang sedang parkir</label><select id="active-ticket-select"><option value="">Pilih tiket aktif dari daftar</option>${activeTicketOptions}</select></div>
          <div class="form-group full"><label for="exit-reference">Kode tiket / nomor polisi *</label><input id="exit-reference" name="reference" placeholder="PK-20261112-0001 atau B 1234 ABC" required /></div>
          <div class="form-actions"><button class="button button-exit" type="submit">Proses kendaraan keluar <span>→</span></button></div>
        </form>
        <div class="counter-tip"><span>✦</span><div><strong>Tips petugas</strong>Nomor polisi akan otomatis diubah menjadi huruf kapital. Pastikan area yang dipilih masih tersedia.</div></div>
      </section>
      <section class="card"><div class="ticket-summary"><div><strong>Kendaraan sedang parkir</strong><small>Pilih Checkout untuk kendaraan keluar</small></div><span class="role-pill">${activeTickets.length} aktif</span></div>${renderTicketTable(activeTickets, { active: true })}</section>
    </div>
  `;
}

function renderVehicles() {
  const isAdmin = ['admin', 'owner'].includes(app.currentUser.role);
  const query = document.querySelector('#vehicle-search')?.value || '';
  const vehicles = app.state.vehicles.filter((vehicle) => `${vehicle.plate} ${vehicle.owner} ${vehicle.phone}`.toLowerCase().includes(query.toLowerCase()));
  return `
    <div class="page-heading"><div><p class="eyebrow">DATA MASTER</p><h1>Data kendaraan</h1><p>${isAdmin ? 'Kelola data kendaraan pelanggan yang sering menggunakan area parkir.' : 'Lihat kendaraan terdaftar dan status parkir terkini.'}</p></div>${isAdmin ? '<button class="button button-primary" data-action="new-vehicle">＋ Tambah kendaraan</button>' : ''}</div>
    <section class="card"><div class="toolbar"><div class="toolbar-left"><span class="inline-badge"><i></i>${vehicles.length} kendaraan terdaftar</span></div><div class="toolbar-right"><div class="search-box"><span>⌕</span><input id="vehicle-search" type="search" placeholder="Cari plat atau nama..." value="${escapeHtml(query)}" oninput="filterVehicles(this.value)" /></div></div></div>${vehicleTable(vehicles, isAdmin)}</section>
  `;
}

function renderTariffs() {
  return `
    <div class="page-heading"><div><p class="eyebrow">DATA MASTER</p><h1>Tarif parkir</h1><p>Atur tarif per jam yang digunakan saat transaksi checkout.</p></div><button class="button button-primary" data-action="edit-tariff" data-id="new">＋ Tambah tarif</button></div>
    <section class="card">${tariffTable()}</section>
  `;
}

function renderAreas() {
  return `
    <div class="page-heading"><div><p class="eyebrow">DATA MASTER</p><h1>Area parkir</h1><p>Kelola lokasi, kapasitas, dan status operasional area.</p></div><button class="button button-primary" data-action="edit-area" data-id="new">＋ Tambah area</button></div>
    <section class="card">${areaTable()}</section>
  `;
}

function renderUsers() {
  return `
    <div class="page-heading"><div><p class="eyebrow">AKSES SISTEM</p><h1>Pengguna & peran</h1><p>Atur akun yang dapat mengakses aplikasi sesuai tugasnya.</p></div><button class="button button-primary" data-action="edit-user" data-id="new">＋ Tambah pengguna</button></div>
    <section class="card">${userTable()}</section>
  `;
}

function renderReports() {
  const from = app.reportFilters.from;
  const to = app.reportFilters.to;
  const source = app.backendEnabled && app.reportData ? app.reportData.transactions : app.state.tickets;
  const filtered = source.filter((ticket) => localDateKey(new Date(ticket.entryAt)) >= from && localDateKey(new Date(ticket.entryAt)) <= to).sort(sortByDate);
  const completed = filtered.filter((ticket) => ticket.status === 'selesai');
  const revenue = completed.reduce((sum, ticket) => sum + Number(ticket.total || 0), 0);
  return `
    <div class="page-heading"><div><p class="eyebrow">ANALITIK & REKAP</p><h1>Rekap transaksi</h1><p>Filter transaksi berdasarkan periode yang dibutuhkan owner.</p></div><button class="button button-secondary" data-action="export-report">↓ Export CSV</button></div>
    <section class="card report-summary"><div class="card-body"><form class="report-toolbar" data-form="report"><div class="form-group"><label for="report-from">Dari tanggal</label><input id="report-from" name="from" type="date" value="${from}" required /></div><div class="form-group"><label for="report-to">Sampai tanggal</label><input id="report-to" name="to" type="date" value="${to}" required /></div><button class="button button-primary" type="submit">Terapkan filter</button><div style="margin-left:auto"><span class="report-total">${formatCurrency(revenue)}</span><span class="report-total-label">pendapatan periode terpilih</span></div></form></div></section>
    <div class="grid grid-3" style="margin-bottom:18px">${kpiCard('Total transaksi', filtered.length, `${from} s/d ${to}`, '▤', '')}${kpiCard('Selesai', completed.length, `${filtered.length ? Math.round((completed.length / filtered.length) * 100) : 0}% dari transaksi`, '✓', 'blue')}${kpiCard('Masih aktif', filtered.filter((ticket) => ticket.status === 'aktif').length, 'kendaraan belum checkout', '◷', 'yellow')}</div>
    <section class="card"><div class="card-header"><div><h3>Detail transaksi</h3><p>${filtered.length} data ditemukan pada periode terpilih</p></div><span class="role-pill">Owner view</span></div>${renderTicketTable(filtered, { report: true })}</section>
  `;
}

function renderActivities() {
  const logs = [...app.state.logs].sort(sortByDate);
  return `
    <div class="page-heading"><div><p class="eyebrow">AUDIT TRAIL</p><h1>Log aktivitas</h1><p>Riwayat tindakan penting yang dilakukan pengguna di dalam aplikasi.</p></div><span class="role-pill">Admin only</span></div>
    <section class="card"><div class="toolbar"><div class="toolbar-left"><span class="inline-badge"><i></i>${logs.length} aktivitas tercatat</span></div><div class="toolbar-right"><span class="filter-label">Data tersimpan lokal</span></div></div><div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aktivitas</th><th>Detail</th><th>Modul</th></tr></thead><tbody>${logs.length ? logs.map((log) => `<tr><td class="mono">${formatDateTime(log.createdAt)}</td><td><span class="primary-text">${escapeHtml(log.userName)}</span><span class="secondary-text">${escapeHtml(ROLE_LABELS[log.role] || log.role)}</span></td><td class="primary-text">${escapeHtml(log.action)}</td><td>${escapeHtml(log.detail)}</td><td><span class="type-pill">${escapeHtml(log.module)}</span></td></tr>`).join('') : emptyRow(5, 'Belum ada aktivitas')}</tbody></table></div></section>
  `;
}

/* Tables and forms */
function renderTicketTable(tickets, options = {}) {
  if (!tickets.length) return `<div class="empty-state"><strong>Belum ada transaksi</strong>Data tiket akan muncul setelah petugas menerbitkan tiket.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Kode tiket</th><th>Kendaraan</th><th>Area</th><th>Masuk</th><th>Status</th>${options.report ? '<th>Total</th>' : ''}<th>Aksi</th></tr></thead><tbody>${tickets.map((ticket) => { const area = getArea(ticket.areaId); const isActive = ticket.status === 'aktif'; return `<tr><td><span class="ticket-code">${escapeHtml(ticket.code)}</span><span class="secondary-text">${ticket.id}</span></td><td><span class="primary-text">${escapeHtml(ticket.plate)}</span><span class="secondary-text">${typeLabel(ticket.vehicleType)}</span></td><td>${escapeHtml(area?.name || '-')}</td><td>${formatDateTime(ticket.entryAt)}</td><td><span class="status-pill ${isActive ? 'active' : 'closed'}">${isActive ? 'Aktif' : 'Selesai'}</span></td>${options.report ? `<td class="primary-text">${isActive ? '-' : formatCurrency(ticket.total)}</td>` : ''}<td><div class="ticket-actions">${options.active && isActive ? `<button class="button button-secondary" data-action="complete-ticket" data-id="${ticket.id}">Checkout</button>` : ''}<button class="icon-action" data-action="view-ticket" data-id="${ticket.id}" title="Lihat tiket">⌕</button><button class="icon-action" data-action="print-ticket" data-id="${ticket.id}" title="Cetak tiket">▣</button></div></td></tr>`; }).join('')}</tbody></table></div>`;
}

function vehicleTable(vehicles, isAdmin) {
  return `<div class="table-wrap"><table><thead><tr><th>Nomor polisi</th><th>Pemilik</th><th>Kontak</th><th>Jenis</th><th>Status</th>${isAdmin ? '<th>Aksi</th>' : ''}</tr></thead><tbody>${vehicles.length ? vehicles.map((vehicle) => { const parked = app.state.tickets.some((ticket) => ticket.vehicleId === vehicle.id && ticket.status === 'aktif'); return `<tr><td class="primary-text mono">${escapeHtml(vehicle.plate)}</td><td>${escapeHtml(vehicle.owner)}</td><td>${escapeHtml(vehicle.phone || '-')}</td><td><span class="type-pill">${typeLabel(vehicle.type)}</span></td><td><span class="status-pill ${parked ? 'active' : 'closed'}">${parked ? 'Sedang parkir' : 'Tidak parkir'}</span></td>${isAdmin ? `<td><div class="action-row"><button class="icon-action" data-action="edit-vehicle" data-id="${vehicle.id}" title="Edit">✎</button><button class="icon-action delete" data-action="delete-vehicle" data-id="${vehicle.id}" title="Hapus">×</button></div></td>` : ''}</tr>`; }).join('') : emptyRow(isAdmin ? 6 : 5, 'Belum ada kendaraan')}</tbody></table></div>`;
}

function tariffTable() {
  return `<div class="table-wrap"><table><thead><tr><th>Nama tarif</th><th>Jenis kendaraan</th><th>Tarif / jam</th><th>Status</th><th>Diperbarui</th><th>Aksi</th></tr></thead><tbody>${app.state.tariffs.map((tariff) => `<tr><td class="primary-text">${escapeHtml(tariff.name)}</td><td><span class="type-pill">${typeLabel(tariff.vehicleType)}</span></td><td class="primary-text">${formatCurrency(tariff.rate)}</td><td><span class="status-pill active">${tariff.status === 'aktif' ? 'Aktif' : 'Nonaktif'}</span></td><td>${formatDateTime(tariff.updatedAt)}</td><td><div class="action-row"><button class="icon-action" data-action="edit-tariff" data-id="${tariff.id}" title="Edit">✎</button><button class="icon-action delete" data-action="delete-tariff" data-id="${tariff.id}" title="Hapus">×</button></div></td></tr>`).join('')}</tbody></table></div>`;
}

function areaTable() {
  return `<div class="table-wrap"><table><thead><tr><th>Nama area</th><th>Kode</th><th>Kapasitas</th><th>Terisi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${app.state.areas.map((area) => { const occupied = getAreaOccupied(area.id); return `<tr><td class="primary-text">${escapeHtml(area.name)}</td><td class="mono">${escapeHtml(area.code)}</td><td>${area.capacity} slot</td><td><span class="primary-text">${occupied}</span> / ${area.capacity}</td><td><span class="status-pill ${area.status === 'aktif' ? 'active' : 'danger'}">${area.status === 'aktif' ? 'Operasional' : 'Ditutup'}</span></td><td><div class="action-row"><button class="icon-action" data-action="edit-area" data-id="${area.id}" title="Edit">✎</button><button class="icon-action delete" data-action="delete-area" data-id="${area.id}" title="Hapus">×</button></div></td></tr>`; }).join('')}</tbody></table></div>`;
}

function userTable() {
  return `<div class="table-wrap"><table><thead><tr><th>Nama pengguna</th><th>Username</th><th>Peran</th><th>Status</th><th>Terakhir login</th><th>Aksi</th></tr></thead><tbody>${app.state.users.map((user) => `<tr><td><span class="primary-text">${escapeHtml(user.name)}</span><span class="secondary-text">${escapeHtml(user.email || '-')}</span></td><td class="mono">${escapeHtml(user.username)}</td><td><span class="role-pill">${escapeHtml(ROLE_LABELS[user.role])}</span></td><td><span class="status-pill ${user.status === 'aktif' ? 'active' : 'danger'}">${user.status === 'aktif' ? 'Aktif' : 'Nonaktif'}</span></td><td>${user.lastLogin ? formatDateTime(user.lastLogin) : '-'}</td><td><div class="action-row"><button class="icon-action" data-action="edit-user" data-id="${user.id}" title="Edit">✎</button><button class="icon-action delete" data-action="delete-user" data-id="${user.id}" title="Hapus">×</button></div></td></tr>`).join('')}</tbody></table></div>`;
}

function vehicleForm(vehicle) {
  return `<section class="card form-card"><h3>${vehicle ? 'Edit kendaraan' : 'Tambah kendaraan'}</h3><p class="subheading">Data ini dapat dipilih kembali oleh petugas saat menerbitkan tiket.</p><form data-form="vehicle" class="form-grid three"><input type="hidden" name="id" value="${vehicle?.id || ''}" /><div class="form-group"><label>Nomor polisi *</label><input id="vehicle-plate" name="plate" value="${escapeHtml(vehicle?.plate || '')}" placeholder="B 1234 ABC" required /></div><div class="form-group"><label>Nama pemilik *</label><input name="owner" value="${escapeHtml(vehicle?.owner || '')}" placeholder="Nama pemilik" required /></div><div class="form-group"><label>Jenis kendaraan *</label><select name="type">${typeOptions(vehicle?.type)}</select></div><div class="form-group"><label>No. telepon</label><input name="phone" value="${escapeHtml(vehicle?.phone || '')}" placeholder="08xxxxxxxxxx" /></div><div class="form-actions"><button type="button" class="button button-ghost" data-action="cancel-edit" data-type="vehicle">Batal</button><button class="button button-primary" type="submit">${vehicle ? 'Simpan perubahan' : 'Simpan kendaraan'}</button></div></form></section>`;
}

function tariffForm(tariff) {
  return `<section class="card form-card"><h3>${tariff ? 'Edit tarif' : 'Tambah tarif'}</h3><p class="subheading">Tarif berlaku per jam dan digunakan saat checkout kendaraan.</p><form data-form="tariff" class="form-grid"><input type="hidden" name="id" value="${tariff?.id || ''}" /><div class="form-group"><label>Nama tarif *</label><input name="name" value="${escapeHtml(tariff?.name || '')}" placeholder="Tarif Mobil Reguler" required /></div><div class="form-group"><label>Jenis kendaraan *</label><select name="vehicleType">${typeOptions(tariff?.vehicleType)}</select></div><div class="form-group"><label>Tarif per jam (Rp) *</label><input name="rate" type="number" min="0" value="${tariff?.rate || ''}" placeholder="5000" required /></div><div class="form-group"><label>Status</label><select name="status"><option value="aktif" ${tariff?.status !== 'nonaktif' ? 'selected' : ''}>Aktif</option><option value="nonaktif" ${tariff?.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option></select></div><div class="form-actions"><button type="button" class="button button-ghost" data-action="cancel-edit" data-type="tariff">Batal</button><button class="button button-primary" type="submit">${tariff ? 'Simpan perubahan' : 'Simpan tarif'}</button></div></form></section>`;
}

function areaForm(area) {
  return `<section class="card form-card"><h3>${area ? 'Edit area parkir' : 'Tambah area parkir'}</h3><p class="subheading">Kapasitas area akan dipakai untuk menghitung okupansi loket.</p><form data-form="area" class="form-grid"><input type="hidden" name="id" value="${area?.id || ''}" /><div class="form-group"><label>Nama area *</label><input name="name" value="${escapeHtml(area?.name || '')}" placeholder="Area Motor Timur" required /></div><div class="form-group"><label>Kode area *</label><input name="code" value="${escapeHtml(area?.code || '')}" placeholder="A-02" required /></div><div class="form-group"><label>Kapasitas slot *</label><input name="capacity" type="number" min="1" value="${area?.capacity || ''}" placeholder="50" required /></div><div class="form-group"><label>Status</label><select name="status"><option value="aktif" ${area?.status !== 'nonaktif' ? 'selected' : ''}>Operasional</option><option value="nonaktif" ${area?.status === 'nonaktif' ? 'selected' : ''}>Ditutup</option></select></div><div class="form-actions"><button type="button" class="button button-ghost" data-action="cancel-edit" data-type="area">Batal</button><button class="button button-primary" type="submit">${area ? 'Simpan perubahan' : 'Simpan area'}</button></div></form></section>`;
}

function userForm(user) {
  return `<section class="card form-card"><h3>${user ? 'Edit pengguna' : 'Tambah pengguna'}</h3><p class="subheading">Berikan akses sesuai tanggung jawab operasional pengguna.</p><form data-form="user" class="form-grid"><input type="hidden" name="id" value="${user?.id || ''}" /><div class="form-group"><label>Nama lengkap *</label><input name="name" value="${escapeHtml(user?.name || '')}" placeholder="Nama lengkap" required /></div><div class="form-group"><label>Email</label><input name="email" type="email" value="${escapeHtml(user?.email || '')}" placeholder="nama@contoh.com" /></div><div class="form-group"><label>Username *</label><input name="username" value="${escapeHtml(user?.username || '')}" placeholder="username" required /></div><div class="form-group"><label>Password ${user ? '(kosongkan jika tidak diubah)' : '*'}</label><input name="password" type="password" ${user ? '' : 'required'} placeholder="Minimal 6 karakter" /></div><div class="form-group"><label>Peran *</label><select name="role"><option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option><option value="petugas" ${user?.role === 'petugas' ? 'selected' : ''}>Petugas</option><option value="owner" ${user?.role === 'owner' ? 'selected' : ''}>Owner</option></select></div><div class="form-group"><label>Status</label><select name="status"><option value="aktif" ${user?.status !== 'nonaktif' ? 'selected' : ''}>Aktif</option><option value="nonaktif" ${user?.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option></select></div><div class="form-actions"><button type="button" class="button button-ghost" data-action="cancel-edit" data-type="user">Batal</button><button class="button button-primary" type="submit">${user ? 'Simpan perubahan' : 'Simpan pengguna'}</button></div></form></section>`;
}

/* Form handlers */
async function submitTicket(data) {
  const plate = String(data.get('plate') || '').trim().toUpperCase();
  const vehicleType = String(data.get('vehicleType'));
  const vehicleBrand = String(data.get('vehicleBrand') || '').trim();
  const areaId = String(data.get('areaId'));
  const vehicleId = String(data.get('vehicleId') || '');
  if (plate.length < 3 || !areaId || (['motor', 'mobil'].includes(vehicleType) && !vehicleBrand)) { showToast('Merek, nomor polisi, dan area parkir wajib diisi.', 'error'); return; }
  if (app.backendEnabled) {
    try {
      const result = await apiRequest('/transactions', { method: 'POST', body: { plate_number: plate, vehicle_type: vehicleType, vehicle_brand: vehicleBrand, area_id: Number(areaId), vehicle_id: vehicleId ? Number(vehicleId) : null } });
      const ticket = mapTransaction(result);
      app.state.tickets.unshift(ticket);
      render();
      showReceiptModal(ticket);
      showToast(`Tiket ${ticket.code} berhasil dibuat.`, 'success');
    } catch (error) {
      showToast(error.message || 'Tiket gagal dibuat.', 'error');
    }
    return;
  }
  if (app.state.tickets.some((ticket) => ticket.plate === plate && ticket.status === 'aktif')) { showToast('Kendaraan ini masih memiliki tiket aktif.', 'error'); return; }
  const area = getArea(areaId);
  if (!area || area.status !== 'aktif' || getAreaOccupied(areaId) >= area.capacity) { showToast('Area parkir sudah penuh atau tidak aktif.', 'error'); return; }
  const matchedVehicle = vehicleId ? findById(app.state.vehicles, vehicleId) : app.state.vehicles.find((vehicle) => vehicle.plate === plate);
  const ticket = {
    id: makeId('TKT'),
    code: nextTicketCode(),
    plate,
    vehicleId: matchedVehicle?.id || '',
    vehicleType,
    brand: vehicleBrand,
    areaId,
    entryAt: new Date().toISOString(),
    exitAt: null,
    status: 'aktif',
    rate: getRate(vehicleType),
    total: 0,
    createdBy: app.currentUser.username
  };
  app.state.tickets.push(ticket);
  if (!matchedVehicle) app.state.vehicles.push({ id: makeId('VEH'), plate, owner: 'Pelanggan umum', type: vehicleType, brand: vehicleBrand, phone: '', createdAt: new Date().toISOString() });
  addLog('Menerbitkan tiket parkir', `${ticket.code} untuk ${plate} di ${area.name}`, 'loket');
  saveState();
  render();
  showReceiptModal(ticket);
  showToast(`Tiket ${ticket.code} berhasil dibuat.`, 'success');
}

function submitExitTicket(data) {
  const reference = String(data.get('reference') || '').trim().toUpperCase();
  const normalizedPlate = reference.replace(/\s+/g, '');
  const ticket = app.state.tickets.find((item) => item.status === 'aktif' && (item.code.toUpperCase() === reference || item.plate.toUpperCase().replace(/\s+/g, '') === normalizedPlate));
  if (!ticket) {
    showToast('Tiket aktif tidak ditemukan. Periksa kode tiket atau nomor polisi.', 'error');
    return;
  }
  completeTicket(ticket.id);
}

async function submitVehicle(data) {
  const id = String(data.get('id') || '');
  const plate = String(data.get('plate') || '').trim().toUpperCase();
  const owner = String(data.get('owner') || '').trim();
  if (!plate || !owner) { showToast('Nomor polisi dan nama pemilik wajib diisi.', 'error'); return; }
  if (app.backendEnabled) {
    try {
      const payload = { plate_number: plate, owner_name: owner, phone: String(data.get('phone') || '').trim(), vehicle_type: String(data.get('type')) };
      await apiRequest(id ? `/vehicles/${id}` : '/vehicles', { method: id ? 'PATCH' : 'POST', body: payload });
      await refreshBackendState();
      app.editing.vehicle = null;
      closeModal(); render();
      showToast(id ? 'Data kendaraan diperbarui.' : 'Kendaraan berhasil ditambahkan.', 'success');
    } catch (error) { showToast(error.message || 'Data kendaraan gagal disimpan.', 'error'); }
    return;
  }
  if (app.state.vehicles.some((vehicle) => vehicle.plate === plate && vehicle.id !== id)) { showToast('Nomor polisi sudah terdaftar.', 'error'); return; }
  const record = { id: id || makeId('VEH'), plate, owner, type: String(data.get('type')), phone: String(data.get('phone') || '').trim(), createdAt: new Date().toISOString() };
  upsert(app.state.vehicles, record);
  addLog(id ? 'Mengubah data kendaraan' : 'Menambah data kendaraan', `${plate} - ${owner}`, 'kendaraan');
  app.editing.vehicle = null;
  saveState(); closeModal(); render(); showToast(id ? 'Data kendaraan diperbarui.' : 'Kendaraan berhasil ditambahkan.', 'success');
}

async function submitTariff(data) {
  const id = String(data.get('id') || '');
  const record = { id: id || makeId('TRF'), name: String(data.get('name')).trim(), vehicleType: String(data.get('vehicleType')), rate: Number(data.get('rate')), status: String(data.get('status')), updatedAt: new Date().toISOString() };
  if (!record.name || !record.rate) { showToast('Nama dan tarif wajib diisi.', 'error'); return; }
  if (app.backendEnabled) {
    try {
      const payload = { name: record.name, vehicle_type: record.vehicleType, rate_per_hour: record.rate, status: record.status };
      await apiRequest(id ? `/tariffs/${id}` : '/tariffs', { method: id ? 'PATCH' : 'POST', body: payload });
      await refreshBackendState();
      app.editing.tariff = null;
      closeModal(); render();
      showToast(id ? 'Tarif diperbarui.' : 'Tarif baru berhasil ditambahkan.', 'success');
    } catch (error) { showToast(error.message || 'Tarif gagal disimpan.', 'error'); }
    return;
  }
  upsert(app.state.tariffs, record); app.editing.tariff = null; addLog(id ? 'Mengubah tarif parkir' : 'Menambah tarif parkir', `${record.name} sebesar ${formatCurrency(record.rate)}/jam`, 'tarif'); saveState(); closeModal(); render(); showToast(id ? 'Tarif diperbarui.' : 'Tarif baru berhasil ditambahkan.', 'success');
}

async function submitArea(data) {
  const id = String(data.get('id') || '');
  const record = { id: id || makeId('ARE'), name: String(data.get('name')).trim(), code: String(data.get('code')).trim().toUpperCase(), capacity: Number(data.get('capacity')), status: String(data.get('status')) };
  if (!record.name || !record.code || !record.capacity) { showToast('Nama, kode, dan kapasitas area wajib diisi.', 'error'); return; }
  if (app.backendEnabled) {
    try {
      const payload = { name: record.name, code: record.code, capacity: record.capacity, status: record.status };
      await apiRequest(id ? `/areas/${id}` : '/areas', { method: id ? 'PATCH' : 'POST', body: payload });
      await refreshBackendState();
      app.editing.area = null;
      closeModal(); render();
      showToast(id ? 'Area diperbarui.' : 'Area baru berhasil ditambahkan.', 'success');
    } catch (error) { showToast(error.message || 'Area gagal disimpan.', 'error'); }
    return;
  }
  upsert(app.state.areas, record); app.editing.area = null; addLog(id ? 'Mengubah area parkir' : 'Menambah area parkir', `${record.name} (${record.capacity} slot)`, 'area'); saveState(); closeModal(); render(); showToast(id ? 'Area diperbarui.' : 'Area baru berhasil ditambahkan.', 'success');
}

async function submitUser(data) {
  const id = String(data.get('id') || '');
  const username = String(data.get('username')).trim().toLowerCase();
  const password = String(data.get('password') || '');
  if (app.state.users.some((user) => user.username === username && user.id !== id)) { showToast('Username sudah digunakan.', 'error'); return; }
  if (!id && password.length < 6) { showToast('Password pengguna minimal 6 karakter.', 'error'); return; }
  const existing = id ? findById(app.state.users, id) : null;
  const record = { id: id || makeId('USR'), name: String(data.get('name')).trim(), email: String(data.get('email') || '').trim(), username, password: password || existing?.password, role: String(data.get('role')), status: String(data.get('status')), lastLogin: existing?.lastLogin || null, createdAt: existing?.createdAt || new Date().toISOString() };
  if (!record.name || !record.username) { showToast('Nama dan username wajib diisi.', 'error'); return; }
  if (app.backendEnabled) {
    try {
      const payload = { name: record.name, email: record.email, username: record.username, role: record.role, status: record.status };
      if (password) payload.password = password;
      await apiRequest(id ? `/users/${id}` : '/users', { method: id ? 'PATCH' : 'POST', body: payload });
      await refreshBackendState();
      app.editing.user = null;
      closeModal(); render();
      showToast(id ? 'Data pengguna diperbarui.' : 'Pengguna baru berhasil ditambahkan.', 'success');
    } catch (error) { showToast(error.message || 'Pengguna gagal disimpan.', 'error'); }
    return;
  }
  upsert(app.state.users, record); app.editing.user = null; addLog(id ? 'Mengubah pengguna' : 'Menambah pengguna', `${record.name} (${ROLE_LABELS[record.role]})`, 'pengguna'); saveState(); closeModal(); render(); showToast(id ? 'Data pengguna diperbarui.' : 'Pengguna baru berhasil ditambahkan.', 'success');
}

async function submitReportFilters(data) {
  const from = String(data.get('from')); const to = String(data.get('to'));
  if (from > to) { showToast('Tanggal mulai tidak boleh melewati tanggal akhir.', 'error'); return; }
  app.reportFilters = { from, to }; render();
  await refreshReportData();
}

async function refreshReportData() {
  if (!app.backendEnabled || !app.currentUser || !canAccess('laporan')) return;
  const { from, to } = app.reportFilters;
  try {
    const report = await apiRequest(`/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    app.reportData = { ...report, transactions: (report.transactions || []).map(mapTransaction) };
    if (app.activeView === 'laporan') render();
  } catch (error) {
    showToast(error.message || 'Laporan gagal dimuat.', 'error');
  }
}

async function completeTicket(id) {
  const ticket = findById(app.state.tickets, id);
  if (!ticket || ticket.status !== 'aktif') return;
  if (!window.confirm(`Checkout kendaraan ${ticket.plate}?`)) return;
  if (app.backendEnabled) {
    try {
      const result = await apiRequest(`/transactions/${id}/checkout`, { method: 'POST' });
      const completed = mapTransaction(result);
      const index = app.state.tickets.findIndex((item) => item.id === String(id));
      if (index >= 0) app.state.tickets[index] = completed;
      render();
      showReceiptModal(completed);
      showToast(`Transaksi ${completed.code} selesai.`, 'success');
    } catch (error) {
      showToast(error.message || 'Checkout gagal diproses.', 'error');
    }
    return;
  }
  const exitAt = new Date();
  const hours = Math.max(1, Math.ceil((exitAt.getTime() - new Date(ticket.entryAt).getTime()) / 3600000));
  ticket.exitAt = exitAt.toISOString();
  ticket.durationHours = hours;
  ticket.total = hours * Number(ticket.rate || getRate(ticket.vehicleType));
  ticket.status = 'selesai';
  addLog('Menyelesaikan transaksi', `${ticket.code} - ${ticket.plate}, total ${formatCurrency(ticket.total)}`, 'transaksi');
  saveState(); render(); showReceiptModal(ticket); showToast(`Transaksi ${ticket.code} selesai.`, 'success');
}

async function deleteRecord(collection, id, label) {
  const record = findById(app.state[collection], id);
  if (!record) return;
  if (collection === 'areas' && getAreaOccupied(id) > 0) { showToast('Area yang masih terisi tidak dapat dihapus.', 'error'); return; }
  if (collection === 'users' && record.id === app.currentUser.id) { showToast('Akun yang sedang digunakan tidak dapat dihapus.', 'error'); return; }
  if (!window.confirm(`Hapus ${label} "${record.name || record.plate || record.username}"?`)) return;
  if (app.backendEnabled) {
    const endpoints = { users: 'users', tariffs: 'tariffs', areas: 'areas', vehicles: 'vehicles' };
    try {
      await apiRequest(`/${endpoints[collection]}/${id}`, { method: 'DELETE' });
      await refreshBackendState();
      render();
      showToast(`${label[0].toUpperCase() + label.slice(1)} berhasil dihapus.`, 'success');
    } catch (error) { showToast(error.message || `${label} gagal dihapus.`, 'error'); }
    return;
  }
  app.state[collection] = app.state[collection].filter((item) => item.id !== id);
  addLog(`Menghapus ${label}`, record.name || record.plate || record.username, collection);
  saveState(); render(); showToast(`${label[0].toUpperCase() + label.slice(1)} berhasil dihapus.`, 'success');
}

/* Receipt and report output */
function showReceiptModal(ticket, autoPrint = false) {
  const area = getArea(ticket.areaId);
  const content = receiptContent(ticket, area);
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="Tiket parkir"><div class="modal-header"><h3>${ticket.status === 'selesai' ? 'Struk transaksi' : 'Tiket parkir berhasil dibuat'}</h3><button class="modal-close" data-action="close-modal" aria-label="Tutup">×</button></div><div class="modal-content"><div class="receipt-preview">${content}</div><div class="modal-actions"><button class="button button-ghost" data-action="close-modal">Tutup</button><button class="button button-primary" data-action="print-modal" data-id="${ticket.id}">▣ Cetak sekarang</button></div></div></div></div>`;
  if (autoPrint) setTimeout(() => printTicket(ticket), 150);
}

function receiptContent(ticket, area) {
  const completed = ticket.status === 'selesai';
  return `<div class="receipt-brand"><div class="brand-mark"><span>PK</span></div><div><strong>ParkirKu</strong><small>Sistem Loket Parkir</small></div></div><div class="receipt-title"><strong>${completed ? 'STRUK PARKIR' : 'TIKET PARKIR'}</strong><small>${completed ? 'Bukti transaksi kendaraan' : 'Simpan tiket ini dengan baik'}</small></div><div class="receipt-code">${escapeHtml(ticket.code)}</div><div class="receipt-row"><span>Nomor polisi</span><strong>${escapeHtml(ticket.plate)}</strong></div><div class="receipt-row"><span>Jenis kendaraan</span><strong>${typeLabel(ticket.vehicleType)}</strong></div><div class="receipt-row"><span>Area parkir</span><strong>${escapeHtml(area?.name || '-')}</strong></div><div class="receipt-row"><span>Waktu masuk</span><strong>${formatDateTime(ticket.entryAt)}</strong></div>${completed ? `<div class="receipt-row"><span>Waktu keluar</span><strong>${formatDateTime(ticket.exitAt)}</strong></div><div class="receipt-row"><span>Durasi</span><strong>${ticket.durationHours || 1} jam</strong></div><div class="receipt-row" style="padding-top:12px;margin-top:6px;border-top:1px dashed #c9d5d7"><span>Total bayar</span><strong style="color:#087c6c;font-weight:700;font-size:12px">${formatCurrency(ticket.total)}</strong></div>` : `<div class="receipt-row"><span>Tarif dasar</span><strong>${formatCurrency(ticket.rate)} / jam</strong></div>`}<div class="receipt-note">Terima kasih telah menggunakan layanan ParkirKu.<br/>Tiket ini dibuat secara digital pada ${formatDateTime(ticket.entryAt)}.</div>`;
}

function printTicket(ticket) {
  const area = getArea(ticket.areaId);
  document.querySelector('#print-surface').innerHTML = `<div class="print-receipt">${receiptContent(ticket, area)}</div>`;
  window.print();
  setTimeout(() => { document.querySelector('#print-surface').innerHTML = ''; }, 1200);
}

async function exportReport() {
  const { from, to } = app.reportFilters;
  let rows = app.state.tickets.filter((ticket) => localDateKey(new Date(ticket.entryAt)) >= from && localDateKey(new Date(ticket.entryAt)) <= to);
  if (app.backendEnabled) {
    try {
      const report = await apiRequest(`/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      rows = (report.transactions || []).map(mapTransaction);
    } catch (error) { showToast(error.message || 'Rekap gagal diekspor.', 'error'); return; }
  }
  const header = ['Kode Tiket', 'Nomor Polisi', 'Jenis', 'Area', 'Waktu Masuk', 'Waktu Keluar', 'Status', 'Total'];
  const csv = [header, ...rows.map((ticket) => [ticket.code, ticket.plate, typeLabel(ticket.vehicleType), getArea(ticket.areaId)?.name || '-', formatDateTime(ticket.entryAt), ticket.exitAt ? formatDateTime(ticket.exitAt) : '-', ticket.status, ticket.total || 0])].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `rekap-parkir-${from}-${to}.csv`; link.click(); URL.revokeObjectURL(link.href);
  showToast('Rekap berhasil diekspor ke CSV.', 'success');
}

/* Small render helpers */
function kpiCard(label, value, meta, icon, tone) { return `<article class="card kpi-card ${tone}"><div class="kpi-label"><span>${label}</span><span class="kpi-icon">${icon}</span></div><strong class="kpi-value">${value}</strong><small class="kpi-meta">${meta}</small></article>`; }

function renderChart() {
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); return date; });
  const values = days.map((day) => { const key = localDateKey(day); return { masuk: app.state.tickets.filter((ticket) => localDateKey(new Date(ticket.entryAt)) === key).length, selesai: app.state.tickets.filter((ticket) => ticket.exitAt && localDateKey(new Date(ticket.exitAt)) === key).length, label: day.toLocaleDateString('id-ID', { weekday: 'short' }).slice(0, 3) }; });
  const max = Math.max(4, ...values.map((value) => Math.max(value.masuk, value.selesai)));
  return `<div class="chart-area"><div class="chart-grid"><span></span><span></span><span></span><span></span></div><div class="chart-bars">${values.map((value) => `<div class="chart-bar-group"><span class="chart-bar" style="height:${Math.max(4, (value.masuk / max) * 100)}%" title="${value.masuk} masuk"></span><span class="chart-bar secondary" style="height:${Math.max(4, (value.selesai / max) * 100)}%" title="${value.selesai} selesai"></span></div>`).join('')}</div><div class="chart-labels">${values.map((value) => `<span>${value.label}</span>`).join('')}</div></div>`;
}

function renderOccupancy() {
  if (!app.state.areas.length) return '<div class="empty-state">Belum ada area parkir.</div>';
  return app.state.areas.map((area) => { const occupied = getAreaOccupied(area.id); const percent = area.capacity ? Math.min(100, Math.round((occupied / area.capacity) * 100)) : 0; return `<div class="occupancy-item"><div><div class="occupancy-name">${escapeHtml(area.name)}</div><div class="occupancy-meta">${escapeHtml(area.code)} · kapasitas ${area.capacity}</div></div><span class="occupancy-value">${occupied}/${area.capacity}</span><div class="progress ${percent > 80 ? 'warn' : ''}"><span style="width:${percent}%"></span></div></div>`; }).join('');
}

function typeOptions(selected = '') { return [['motor', 'Motor'], ['mobil', 'Mobil'], ['truk', 'Truk / Bus']].map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join(''); }
function typeLabel(type) { return { motor: 'Motor', mobil: 'Mobil', truk: 'Truk / Bus' }[type] || type || '-'; }
function emptyRow(columns, text) { return `<tr><td colspan="${columns}"><div class="empty-state"><strong>${text}</strong>Belum ada data untuk ditampilkan.</div></td></tr>`; }

/* State and data */
function loadState() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (saved?.users && saved?.tickets) return saved; } catch (error) { console.warn('State tidak dapat dibaca', error); }
  const state = seedState(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return state;
}

function seedState() {
  const now = new Date();
  const at = (dayOffset, hour, minute = 0) => { const date = new Date(now); date.setHours(hour, minute, 0, 0); date.setDate(date.getDate() + dayOffset); return date.toISOString(); };
  const users = [
    { id: 'USR-001', name: 'Admin Sistem', email: 'admin@parkirku.test', username: 'admin', password: 'admin123', role: 'admin', status: 'aktif', lastLogin: at(0, 8, 12), createdAt: at(-30, 9) },
    { id: 'USR-002', name: 'Siti Petugas', email: 'petugas@parkirku.test', username: 'petugas', password: 'petugas123', role: 'petugas', status: 'aktif', lastLogin: at(-1, 17, 22), createdAt: at(-24, 9) },
    { id: 'USR-003', name: 'Budi Owner', email: 'owner@parkirku.test', username: 'owner', password: 'owner123', role: 'owner', status: 'aktif', lastLogin: at(-2, 8, 5), createdAt: at(-20, 9) }
  ];
  const areas = [{ id: 'ARE-001', name: 'Area Motor Utama', code: 'A-01', capacity: 80, status: 'aktif' }, { id: 'ARE-002', name: 'Area Mobil Gedung', code: 'B-01', capacity: 50, status: 'aktif' }, { id: 'ARE-003', name: 'Area VIP', code: 'C-01', capacity: 20, status: 'aktif' }];
  const tariffs = [{ id: 'TRF-001', name: 'Tarif Motor Reguler', vehicleType: 'motor', rate: 3000, status: 'aktif', updatedAt: at(-3, 10) }, { id: 'TRF-002', name: 'Tarif Mobil Reguler', vehicleType: 'mobil', rate: 5000, status: 'aktif', updatedAt: at(-3, 10) }, { id: 'TRF-003', name: 'Tarif Truk / Bus', vehicleType: 'truk', rate: 8000, status: 'aktif', updatedAt: at(-3, 10) }];
  const vehicles = [{ id: 'VEH-001', plate: 'B 1234 ABC', owner: 'Andi Pratama', type: 'mobil', phone: '081234567890', createdAt: at(-20, 10) }, { id: 'VEH-002', plate: 'D 88 KLM', owner: 'Nina Larasati', type: 'motor', phone: '082233445566', createdAt: at(-18, 10) }, { id: 'VEH-003', plate: 'B 9090 XYZ', owner: 'Raka Wijaya', type: 'mobil', phone: '085677889900', createdAt: at(-12, 10) }];
  const tickets = [
    { id: 'TKT-1004', code: `PK-${dateInputValue(0).replaceAll('-', '')}-0004`, plate: 'D 88 KLM', vehicleId: 'VEH-002', vehicleType: 'motor', areaId: 'ARE-001', entryAt: at(0, 8, 36), exitAt: null, status: 'aktif', rate: 3000, total: 0, createdBy: 'petugas' },
    { id: 'TKT-1003', code: `PK-${dateInputValue(0).replaceAll('-', '')}-0003`, plate: 'B 9090 XYZ', vehicleId: 'VEH-003', vehicleType: 'mobil', areaId: 'ARE-002', entryAt: at(0, 7, 54), exitAt: at(0, 9, 27), status: 'selesai', rate: 5000, total: 10000, durationHours: 2, createdBy: 'petugas' },
    { id: 'TKT-1002', code: `PK-${dateInputValue(-1).replaceAll('-', '')}-0002`, plate: 'B 1234 ABC', vehicleId: 'VEH-001', vehicleType: 'mobil', areaId: 'ARE-002', entryAt: at(-1, 9, 14), exitAt: at(-1, 13, 2), status: 'selesai', rate: 5000, total: 20000, durationHours: 4, createdBy: 'petugas' }
  ];
  const logs = [{ id: 'LOG-001', createdAt: at(0, 8, 36), userName: 'Siti Petugas', role: 'petugas', action: 'Menerbitkan tiket parkir', detail: 'PK-20261022-0004 untuk D 88 KLM di Area Motor Utama', module: 'loket' }, { id: 'LOG-002', createdAt: at(-1, 13, 2), userName: 'Siti Petugas', role: 'petugas', action: 'Menyelesaikan transaksi', detail: 'PK-20261021-0002 - B 1234 ABC, total Rp20.000', module: 'transaksi' }, { id: 'LOG-003', createdAt: at(-2, 8, 5), userName: 'Budi Owner', role: 'owner', action: 'Login ke sistem', detail: 'Akun owner berhasil masuk', module: 'login' }];
  return { users, tariffs, areas, vehicles, tickets, logs };
}

function saveState() { if (!app.backendEnabled) localStorage.setItem(STORAGE_KEY, JSON.stringify(app.state)); }
function addLog(action, detail, module) { if (app.backendEnabled || !app.state || !app.currentUser) return; app.state.logs.push({ id: makeId('LOG'), createdAt: new Date().toISOString(), userName: app.currentUser.name, role: app.currentUser.role, action, detail, module }); }
function getArea(id) { return app.state.areas.find((area) => area.id === id); }
function getAreaOccupied(id) { return app.state.tickets.filter((ticket) => ticket.areaId === id && ticket.status === 'aktif').length; }
function getRate(type) { return app.state.tariffs.find((tariff) => tariff.vehicleType === type && tariff.status === 'aktif')?.rate || 0; }
function findById(list, id) { return list.find((item) => item.id === id); }
function upsert(list, record) { const index = list.findIndex((item) => item.id === record.id); if (index === -1) list.push(record); else list[index] = { ...list[index], ...record }; }
function makeId(prefix) { return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`; }
function nextTicketCode() { const date = dateInputValue(0).replaceAll('-', ''); const count = app.state.tickets.filter((ticket) => ticket.code.includes(date)).length + 1; return `PK-${date}-${String(count).padStart(4, '0')}`; }
function sortByDate(a, b) { return new Date(b.createdAt || b.entryAt) - new Date(a.createdAt || a.entryAt); }
function getInitials(name) { return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
function greeting() { const hour = new Date().getHours(); return hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam'; }
function dateInputValue(offset) { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + offset); return localDateKey(date); }
function localDateKey(date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
function formatDateTime(value) { if (!value) return '-'; return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)).replace('.', ':'); }
function formatCurrency(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0)).replace('IDR', 'Rp'); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function showToast(message, type = 'success') { const root = document.querySelector('#toast-root'); const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '!'}</span><span>${escapeHtml(message)}</span>`; root.appendChild(toast); setTimeout(() => toast.remove(), 3600); }
function closeModal() { document.querySelector('#modal-root').innerHTML = ''; }

/* Used by the inline search field without rebuilding the form. */
function filterVehicles(value) {
  const table = document.querySelector('#vehicle-search')?.closest('.card');
  if (!table) return;
  const rows = app.state.vehicles.filter((vehicle) => `${vehicle.plate} ${vehicle.owner} ${vehicle.phone}`.toLowerCase().includes(value.toLowerCase()));
  const tableBody = table.querySelector('tbody');
  if (tableBody) tableBody.innerHTML = rows.length ? rows.map((vehicle) => { const parked = app.state.tickets.some((ticket) => ticket.vehicleId === vehicle.id && ticket.status === 'aktif'); return `<tr><td class="primary-text mono">${escapeHtml(vehicle.plate)}</td><td>${escapeHtml(vehicle.owner)}</td><td>${escapeHtml(vehicle.phone || '-')}</td><td><span class="type-pill">${typeLabel(vehicle.type)}</span></td><td><span class="status-pill ${parked ? 'active' : 'closed'}">${parked ? 'Sedang parkir' : 'Tidak parkir'}</span></td>${app.currentUser.role === 'admin' ? `<td><div class="action-row"><button class="icon-action" data-action="edit-vehicle" data-id="${vehicle.id}" title="Edit">✎</button><button class="icon-action delete" data-action="delete-vehicle" data-id="${vehicle.id}" title="Hapus">×</button></div></td>` : ''}</tr>`; }).join('') : emptyRow(app.currentUser.role === 'admin' ? 6 : 5, 'Kendaraan tidak ditemukan');
}
