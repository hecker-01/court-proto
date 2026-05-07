// Shared utilities: auth, state, nav, formatting

// ---- Auth ----

function getUser() {
  try { return JSON.parse(localStorage.getItem('auth_user')); }
  catch { return null; }
}
function setUser(u) { localStorage.setItem('auth_user', JSON.stringify(u)); }
function logout() { localStorage.removeItem('auth_user'); window.location.href = 'index.html'; }
function requireAuth() {
  if (!getUser()) {
    window.location.href = 'login.html?next=' + encodeURIComponent(window.location.href);
    return false;
  }
  return true;
}

// ---- Game signups ----

function getSignups() {
  try { return JSON.parse(localStorage.getItem('game_signups')) || []; } catch { return []; }
}
function saveSignups(s) { localStorage.setItem('game_signups', JSON.stringify(s)); }

function joinGame(gameId, user) {
  const s = getSignups().filter(x => !(x.gameId === gameId && x.userId === user.id));
  s.push({ gameId, userId: user.id, action: 'join' });
  saveSignups(s);
}
function leaveGame(gameId, userId) {
  const s = getSignups().filter(x => !(x.gameId === gameId && x.userId === userId));
  s.push({ gameId, userId, action: 'leave' });
  saveSignups(s);
}

function getGames() {
  const signups = getSignups();
  return GAMES.map(game => {
    const actions = {};
    signups.filter(s => s.gameId === game.id).forEach(s => actions[s.userId] = s.action);
    let parts = game.participants.filter(p => actions[p.userId] !== 'leave');
    Object.entries(actions).forEach(([uid, act]) => {
      const id = parseInt(uid);
      if (act === 'join' && !parts.find(p => p.userId === id)) {
        const u = USERS.find(u => u.id === id);
        if (u) parts.push({ userId: u.id, name: u.name, elo: u.elo });
      }
    });
    return { ...game, participants: parts };
  });
}
function getGame(id) { return getGames().find(g => g.id === parseInt(id)); }
function isInGame(game, userId) { return game.participants.some(p => p.userId === userId); }

// ---- Profile edits ----

function getUserEdits() {
  try { return JSON.parse(localStorage.getItem('user_edits')) || {}; } catch { return {}; }
}
function getMergedUser(userId) {
  const base = USERS.find(u => u.id === userId);
  if (!base) return null;
  return { ...base, ...(getUserEdits()[userId] || {}) };
}

// ---- Navigation ----

function initNav(active) {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  const items = [
    { id: 'home',        label: 'Home',        icon: 'bi-house',      href: 'index.html' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'bi-trophy',     href: 'leaderboard.html' },
    { id: 'history',     label: 'History',     icon: 'bi-graph-up',   href: 'history.html' },
    { id: 'account',     label: 'Account',     icon: 'bi-person',     href: 'account.html' },
  ];
  nav.innerHTML = `<div class="container-fluid d-flex justify-content-around py-1">
    ${items.map(i => `
      <a href="${i.href}" class="nav-bottom d-flex flex-column align-items-center ${i.id === active ? 'text-primary' : 'text-secondary'}">
        <i class="bi ${i.icon}" style="font-size:20px;line-height:1.4"></i>
        <span>${i.label}</span>
      </a>`).join('')}
  </div>`;
}

// ---- Formatting ----

function formatDate(s) {
  return new Date(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(s) {
  return new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function formatMonthYear(s) {
  return new Date(s).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function statusBadge(status) {
  const map = {
    planned:   ['bg-primary',              'Planned'],
    started:   ['bg-warning text-dark',    'In Progress'],
    ended:     ['bg-success',              'Ended'],
    processed: ['bg-secondary',            'Ended'],
  };
  const [cls, label] = map[status] || ['bg-secondary', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ---- SVG ELO chart ----

function renderEloChart(container, history, title = 'ELO History') {
  if (!history || history.length < 2) {
    container.innerHTML = `<div class="card mb-3"><div class="card-body text-muted small">No ELO history yet.</div></div>`;
    return;
  }
  const W = 500, H = 140, PX = 36, PY = 20;
  const elos = history.map(d => d.elo);
  const min = Math.min(...elos) - 40, max = Math.max(...elos) + 40;
  const tx = i => PX + (i / (history.length - 1)) * (W - PX * 2);
  const ty = e => PY + (1 - (e - min) / (max - min)) * (H - PY * 2);
  const pts = history.map((d, i) => `${tx(i)},${ty(d.elo)}`).join(' ');
  const area = `${tx(0)},${H - PY} ${pts} ${tx(history.length - 1)},${H - PY}`;
  const dots = history.map((d, i) => `<circle cx="${tx(i)}" cy="${ty(d.elo)}" r="3.5" fill="var(--bs-primary)"/>`).join('');
  const lbls = history.map((d, i) => `<text x="${tx(i)}" y="${H - 3}" text-anchor="middle" font-size="9" fill="var(--bs-secondary-color)">${d.label}</text>`).join('');
  const diff = elos[elos.length - 1] - elos[0];
  const diffStr = (diff >= 0 ? '+' : '') + diff;
  const diffColor = diff >= 0 ? 'var(--bs-success)' : 'var(--bs-danger)';
  container.innerHTML = `
    <div class="card mb-3">
      <div class="card-body pb-1">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="card-title mb-0">${title}</h6>
          <span class="fw-bold small" style="color:${diffColor}">${diffStr} ELO</span>
        </div>
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;overflow:visible">
          <defs>
            <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--bs-primary)" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="var(--bs-primary)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <polygon points="${area}" fill="url(#eg)"/>
          <polyline points="${pts}" fill="none" stroke="var(--bs-primary)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
          ${dots}${lbls}
        </svg>
      </div>
    </div>`;
}

// ---- Misc ----

function qp(name) { return new URLSearchParams(window.location.search).get(name); }
function show(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
