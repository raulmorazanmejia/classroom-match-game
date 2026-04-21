const SUPABASE_URL = 'https://cpouyxzsnmoiskxhrcut.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7y7O2Q93oG9iRqSlNAudXA_L1gbvzra';
const GLOBAL_TEACHER_PASSWORD = 'intel123';
const BASE_URL = 'https://classroom-match-game.vercel.app';

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];
const BASE_URL_OBJ = new URL(BASE_URL);
const IS_LOCAL = LOCAL_HOSTS.includes(window.location.hostname);
const IS_PRODUCTION_HOST = window.location.origin === BASE_URL_OBJ.origin;

if (!IS_LOCAL && !IS_PRODUCTION_HOST) {
  const redirectUrl = BASE_URL_OBJ.origin + BASE_URL_OBJ.pathname + window.location.search + window.location.hash;
  window.location.replace(redirectUrl);
}

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const state = {
  activityId: null,
  activity: null,
  studentName: '',
  leftItems: [],
  rightItems: [],
  selectedLeft: null,
  selectedRight: null,
  matchedLeft: new Set(),
  matchedRight: new Set(),
  attempts: 0,
  startTs: null,
  timerInt: null,
  resultsRows: [],
  wrongFlashLeft: null,
  wrongFlashRight: null
};

function el(id) { return document.getElementById(id); }
function isLoggedIn() { return sessionStorage.getItem('teacherLoggedIn') === '1'; }
function setLoggedIn(name) {
  sessionStorage.setItem('teacherLoggedIn', '1');
  sessionStorage.setItem('teacherName', name || 'Teacher');
}
function clearLogin() {
  sessionStorage.removeItem('teacherLoggedIn');
  sessionStorage.removeItem('teacherName');
}
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function setMessage(id, html, kind) {
  const klass = kind ? 'notice ' + kind : '';
  el(id).innerHTML = html ? '<div class="' + klass + '">' + html + '</div>' : '';
}
function appUrlFor(view, id) {
  const url = new URL(BASE_URL);
  url.searchParams.set('view', view);
  if (id) url.searchParams.set('id', id);
  return url.toString();
}
function slugRoute() {
  const url = new URL(window.location.href);
  return { view: url.searchParams.get('view') || '', id: url.searchParams.get('id') };
}
function goRoute(view, id) {
  const target = appUrlFor(view, id);
  if (IS_LOCAL) {
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    if (id) url.searchParams.set('id', id);
    else url.searchParams.delete('id');
    history.pushState({}, '', url);
    initRoute();
    return;
  }
  if (window.location.href !== target) window.location.assign(target);
  else initRoute();
}
function logout() { clearLogin(); goRoute('login'); }

window.addEventListener('popstate', initRoute);

function createNavLink(text, handler) {
  const a = document.createElement('a');
  a.href = '#';
  a.textContent = text;
  a.className = 'nav-link';
  a.addEventListener('click', function (evt) { evt.preventDefault(); handler(); });
  return a;
}

function renderNav() {
  const nav = el('nav');
  nav.innerHTML = '';
  const view = slugRoute().view;
  if (view === 'play') return;
  if (!isLoggedIn()) {
    nav.appendChild(createNavLink('Login', function () { goRoute('login'); }));
    return;
  }
  nav.appendChild(createNavLink('Dashboard', function () { goRoute('dashboard'); }));
  nav.appendChild(createNavLink('Create', function () { goRoute('create'); }));
  nav.appendChild(createNavLink('Log Out', function () { logout(); }));
}

function showOnly(idToShow) {
  ['loginView', 'dashboardView', 'createView', 'playView', 'resultsView'].forEach(function (sectionId) {
    el(sectionId).classList.add('hidden');
  });
  el(idToShow).classList.remove('hidden');
}

function handleLogin() {
  const name = el('loginName').value.trim();
  const pass = el('loginPassword').value.trim();
  if (!name) return setMessage('loginMessage', 'Enter your name.', 'error');
  if (pass !== GLOBAL_TEACHER_PASSWORD) return setMessage('loginMessage', 'Incorrect password.', 'error');
  setLoggedIn(name);
  setMessage('loginMessage', '', '');
  goRoute('dashboard');
}

async function loadResults() {
  try {
    setMessage('resultsMessage', 'Loading results...', 'warning');
    if (!state.activityId) throw new Error('Missing activity id.');

    const activityResult = await client.from('activities').select('id, title, created_at').eq('id', state.activityId).single();
    if (activityResult.error || !activityResult.data) throw new Error('Could not load activity.');

    const rowsResult = await client
      .from('submissions')
      .select('student_name, score, total, attempts, duration_seconds, created_at')
      .eq('activity_id', state.activityId)
      .order('created_at', { ascending: false });

    if (rowsResult.error) throw rowsResult.error;

    state.resultsRows = rowsResult.data || [];
    el('resultsTitle').textContent = 'Results: ' + activityResult.data.title;
    el('resultsMeta').textContent = 'Activity created: ' + new Date(activityResult.data.created_at).toLocaleString();

    const tbody = el('resultsTable').querySelector('tbody');
    tbody.innerHTML = '';

    state.resultsRows.forEach(function (row) {
      const tr = document.createElement('tr');
      [row.student_name, row.score, row.total, row.attempts, row.duration_seconds, new Date(row.created_at).toLocaleString()].forEach(function (value) {
        const td = document.createElement('td');
        td.textContent = String(value);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    el('resultsTable').classList.remove('hidden');
    setMessage('resultsMessage', state.resultsRows.length + ' submission(s) loaded.', 'success');
  } catch (err) {
    el('resultsTable').classList.add('hidden');
    setMessage('resultsMessage', escapeHtml(err.message || 'Could not load results.'), 'error');
  }
}

function csvSafe(value) {
  const text = String(value || '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) return '"' + text.replaceAll('"', '""') + '"';
  return text;
}

function downloadCsv() {
  if (!state.resultsRows.length) return setMessage('resultsMessage', 'No results loaded yet.', 'error');
  const lines = [['Name', 'Score', 'Total', 'Attempts', 'DurationSeconds', 'CompletedAt'].join(',')];
  state.resultsRows.forEach(function (row) {
    lines.push([
      csvSafe(row.student_name),
      row.score,
      row.total,
      row.attempts,
      row.duration_seconds,
      csvSafe(new Date(row.created_at).toLocaleString())
    ].join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'match-results.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function bindBaseEvents() {
  el('loginBtn').addEventListener('click', handleLogin);
  el('createFromDashboardBtn').addEventListener('click', function () { goRoute('create'); });
  el('refreshDashboardBtn').addEventListener('click', loadDashboard);
  el('generateLinksBtn').addEventListener('click', createActivity);
  el('loadDemoBtn').addEventListener('click', loadDemo);
  el('backToDashboardBtn').addEventListener('click', function () { goRoute('dashboard'); });
  el('startGameBtn').addEventListener('click', startGame);
  el('resultsBackBtn').addEventListener('click', function () { goRoute('dashboard'); });
  el('downloadCsvBtn').addEventListener('click', downloadCsv);
  el('closeFinishBtn').addEventListener('click', closeFinishOverlay);
  el('playAgainBtn').addEventListener('click', playAgain);
}

async function initRoute() {
  const routeInfo = slugRoute();
  const view = routeInfo.view;
  const id = routeInfo.id;

  state.activityId = id || null;
  renderNav();

  if (view === 'play' && id) {
    showOnly('playView');
    closeFinishOverlay();
    el('studentGate').classList.remove('hidden');
    el('gameArea').classList.add('hidden');
    el('studentName').value = '';
    resetGameState();
    await loadActivityForPlay(id);
    return;
  }

  if (!isLoggedIn()) {
    showOnly('loginView');
    return;
  }

  if (view === 'create') {
    showOnly('createView');
    el('teacherName').value = sessionStorage.getItem('teacherName') || '';
    return;
  }

  if (view === 'results' && id) {
    showOnly('resultsView');
    el('resultsTitle').textContent = 'Results';
    el('resultsMeta').textContent = '';
    el('resultsTable').classList.add('hidden');
    setMessage('resultsMessage', '', '');
    await loadResults();
    return;
  }

  showOnly('dashboardView');
  await loadDashboard();
}

window.addEventListener('DOMContentLoaded', function () {
  bindBaseEvents();
  initRoute();
});
