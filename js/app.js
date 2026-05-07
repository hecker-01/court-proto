// Shared utilities: auth, state, nav, formatting

// ---- Auth ----

function getUser() {
  try { return JSON.parse(localStorage.getItem('auth_user')); }
  catch { return null; }
}

function setUser(user) {
  localStorage.setItem('auth_user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('auth_user');
  window.location.href = 'index.html';
}

function requireAuth() {
  if (!getUser()) {
    window.location.href = 'login.html?next=' + encodeURIComponent(window.location.href);
    return false;
  }
  return true;
}

// ---- Game signups (per-user, stored globally) ----

function getSignups() {
  try { return JSON.parse(localStorage.getItem('game_signups')) || []; }
  catch { return []; }
}

function saveSignups(s) {
  localStorage.setItem('game_signups', JSON.stringify(s));
}

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

// Merge base GAMES data with stored signups
function getGames() {
  const signups = getSignups();
  return GAMES.map(game => {
    const userActions = {};
    for (const s of signups) {
      if (s.gameId === game.id) userActions[s.userId] = s.action;
    }
    let participants = game.participants.filter(p => userActions[p.userId] !== 'leave');
    for (const [uid, action] of Object.entries(userActions)) {
      const id = parseInt(uid);
      if (action === 'join' && !participants.find(p => p.userId === id)) {
        const u = USERS.find(u => u.id === id);
        if (u) participants.push({ userId: u.id, name: u.name, elo: u.elo });
      }
    }
    return { ...game, participants };
  });
}

function getGame(id) {
  return getGames().find(g => g.id === parseInt(id));
}

function isInGame(game, userId) {
  return game.participants.some(p => p.userId === userId);
}

// ---- Profile edits ----

function getUserEdits() {
  try { return JSON.parse(localStorage.getItem('user_edits')) || {}; }
  catch { return {}; }
}

function getMergedUser(userId) {
  const base = USERS.find(u => u.id === userId);
  if (!base) return null;
  const edits = getUserEdits();
  return { ...base, ...(edits[userId] || {}) };
}

// ---- Navigation ----

function initNav(active) {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  const items = [
    { id: 'home',        label: 'Home',       icon: '⌂', href: 'index.html' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆', href: 'leaderboard.html' },
    { id: 'history',     label: 'History',     icon: '📈', href: 'history.html' },
    { id: 'account',     label: 'Account',     icon: '◉', href: 'account.html' },
  ];
  nav.innerHTML = items.map(item => `
    <a href="${item.href}" class="nav-item ${item.id === active ? 'active' : ''}">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
    </a>
  `).join('');
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
  const map = { planned: ['planned','Planned'], started: ['started','In Progress'], ended: ['ended','Ended'], processed: ['processed','Ended'] };
  const [cls, label] = map[status] || ['processed', status];
  return `<span class="badge badge-${cls}">${label}</span>`;
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ---- SVG ELO chart ----

function renderEloChart(container, history, title = 'ELO History') {
  if (!history || history.length < 2) {
    container.innerHTML = `<div class="elo-chart-wrap"><p class="text-muted text-sm text-center" style="padding:20px">No history yet</p></div>`;
    return;
  }
  const W = 500, H = 140, PX = 36, PY = 20;
  const elos = history.map(d => d.elo);
  const min = Math.min(...elos) - 40;
  const max = Math.max(...elos) + 40;
  const tx = i => PX + (i / (history.length - 1)) * (W - PX * 2);
  const ty = e => PY + (1 - (e - min) / (max - min)) * (H - PY * 2);
  const pts = history.map((d, i) => `${tx(i)},${ty(d.elo)}`).join(' ');
  const area = `${tx(0)},${H - PY} ${pts} ${tx(history.length - 1)},${H - PY}`;
  const dots = history.map((d, i) => `<circle cx="${tx(i)}" cy="${ty(d.elo)}" r="3.5" fill="var(--racket)"/>`).join('');
  const lbls = history.map((d, i) => `<text x="${tx(i)}" y="${H - 4}" text-anchor="middle" font-size="9" fill="var(--asphalt-muted)" font-family="inherit">${d.label}</text>`).join('');
  const diff = elos[elos.length - 1] - elos[0];
  const diffColor = diff >= 0 ? 'var(--status-done)' : 'var(--danger)';
  const diffStr = (diff >= 0 ? '+' : '') + diff;
  container.innerHTML = `
    <div class="elo-chart-wrap">
      <div class="chart-header">
        <span class="chart-title">${title}</span>
        <span style="font-size:13px;font-weight:700;color:${diffColor}">${diffStr} ELO</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;overflow:visible">
        <defs>
          <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--racket)" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="var(--racket)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon points="${area}" fill="url(#eg)"/>
        <polyline points="${pts}" fill="none" stroke="var(--racket)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
        ${lbls}
        <text x="${PX - 4}" y="${ty(elos[elos.length-1]) + 4}" text-anchor="end" font-size="9" fill="var(--asphalt-muted)" font-family="inherit">${elos[elos.length-1]}</text>
      </svg>
    </div>`;
}

// ---- Misc helpers ----

function qp(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function show(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
