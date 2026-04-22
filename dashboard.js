function loadDemo() {
  const savedName = sessionStorage.getItem('teacherName') || 'Raul';
  el('teacherName').value = savedName;
  el('activityTitle').value = 'Passive Voice Match';
  el('pairsInput').value = [
    'destroyed, was destroyed by the tornado',
    'stolen | was stolen last night',
    'repaired, is being repaired now',
    'painted, was painted by students',
    'broken, was broken by the wind'
  ].join('\n');
}

function parsePairs(text) {
  const lines = text.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
  const parsed = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parserPatterns = [
      { label: 'arrow (->)', regex: /\s*->\s*/g },
      { label: 'pipe (|)', regex: /\s*\|\s*/g },
      { label: 'tab', regex: /\t/g },
      { label: 'comma', regex: /\s*,\s*/g }
    ];

    let parts = null;
    for (let j = 0; j < parserPatterns.length; j++) {
      const candidate = line.split(parserPatterns[j].regex).map(function (part) { return part.trim(); });
      if (candidate.length === 2) {
        parts = candidate;
        break;
      }
    }

    if (!parts) {
      throw new Error('Line ' + (i + 1) + ' must include exactly one separator (comma, pipe, tab, or ->).');
    }

    const left = parts[0];
    const right = parts[1];
    if (!left || !right) {
      throw new Error('Line ' + (i + 1) + ' needs text on both sides of the separator.');
    }
    parsed.push({ left: left, right: right });
  }

  if (parsed.length < 2) throw new Error('Please add at least 2 pairs.');
  return parsed;
}

async function copyToClipboard(text, okMessageId) {
  try {
    await navigator.clipboard.writeText(text);
    setMessage(okMessageId, 'Copied to clipboard.', 'success');
  } catch (err) {
    setMessage(okMessageId, 'Copy failed. You can copy manually.', 'warning');
  }
}

function buildActionLink(text, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'secondary';
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

function makeQrNode(url) {
  const box = document.createElement('div');
  box.className = 'qr-box hidden';
  const img = document.createElement('img');
  img.alt = 'QR code for student link';
  img.loading = 'lazy';
  img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent(url);
  box.appendChild(img);
  return box;
}

async function duplicateActivity(activityId) {
  try {
    const source = await client.from('activities').select('title, teacher_name, pairs').eq('id', activityId).single();
    if (source.error || !source.data) throw new Error('Could not load activity to duplicate.');

    const created = await client.from('activities').insert([
      {
        title: source.data.title + ' (Copy)',
        teacher_name: source.data.teacher_name,
        teacher_password: GLOBAL_TEACHER_PASSWORD,
        pairs: source.data.pairs
      }
    ]);

    if (created.error) throw created.error;
    setMessage('dashboardMessage', 'Activity duplicated.', 'success');
    await loadDashboard();
  } catch (err) {
    setMessage('dashboardMessage', escapeHtml(err.message || 'Could not duplicate activity.'), 'error');
  }
}

async function deleteActivity(activityId) {
  const confirmed = window.confirm('Delete this activity and all linked submissions?');
  if (!confirmed) return;

  try {
    const delSubmissions = await client.from('submissions').delete().eq('activity_id', activityId);
    if (delSubmissions.error) throw delSubmissions.error;

    const delActivity = await client.from('activities').delete().eq('id', activityId);
    if (delActivity.error) throw delActivity.error;

    setMessage('dashboardMessage', 'Activity deleted.', 'success');
    await loadDashboard();
  } catch (err) {
    setMessage('dashboardMessage', escapeHtml(err.message || 'Could not delete activity.'), 'error');
  }
}

async function loadDashboard() {
  if (!isLoggedIn()) {
    goRoute('login');
    return;
  }

  setMessage('dashboardMessage', 'Loading activities...', 'warning');

  const result = await client
    .from('activities')
    .select('id, title, created_at')
    .order('created_at', { ascending: false });

  if (result.error) {
    setMessage('dashboardMessage', escapeHtml(result.error.message || 'Could not load activities.'), 'error');
    el('dashboardTable').classList.add('hidden');
    return;
  }

  const rows = result.data || [];
  const tbody = el('dashboardTable').querySelector('tbody');
  tbody.innerHTML = '';

  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    const studentLink = appUrlFor('play', row.id);
    const resultsLink = appUrlFor('results', row.id);

    const tdTitle = document.createElement('td');
    tdTitle.textContent = row.title;

    const tdCreated = document.createElement('td');
    tdCreated.textContent = new Date(row.created_at).toLocaleString();

    const tdLinks = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'action-links';

    actions.appendChild(buildActionLink('Open Results', function () { goRoute('results', row.id); }));
    actions.appendChild(buildActionLink('Open Student Link', function () { window.open(studentLink, '_blank', 'noopener,noreferrer'); }));
    actions.appendChild(buildActionLink('Copy Student Link', function () { copyToClipboard(studentLink, 'dashboardMessage'); }));
    actions.appendChild(buildActionLink('Copy Results Link', function () { copyToClipboard(resultsLink, 'dashboardMessage'); }));
    actions.appendChild(buildActionLink('Duplicate', function () { duplicateActivity(row.id); }));

    const deleteBtn = buildActionLink('Delete', function () { deleteActivity(row.id); });
    deleteBtn.classList.add('danger');
    deleteBtn.classList.remove('secondary');
    actions.appendChild(deleteBtn);

    const qrBtn = buildActionLink('QR', function () {
      qrBox.classList.toggle('hidden');
    });
    actions.appendChild(qrBtn);

    const qrBox = makeQrNode(studentLink);
    tdLinks.appendChild(actions);
    tdLinks.appendChild(qrBox);

    tr.appendChild(tdTitle);
    tr.appendChild(tdCreated);
    tr.appendChild(tdLinks);
    tbody.appendChild(tr);
  });

  el('dashboardTable').classList.remove('hidden');
  setMessage('dashboardMessage', rows.length + ' activit' + (rows.length === 1 ? 'y' : 'ies') + ' loaded.', 'success');
}

async function createActivity() {
  try {
    setMessage('createMessage', 'Saving activity...', 'warning');

    const teacherName = el('teacherName').value.trim();
    const title = el('activityTitle').value.trim();
    const pairsRaw = el('pairsInput').value;

    if (!teacherName) throw new Error('Enter your name.');
    if (!title) throw new Error('Enter an activity title.');

    const pairs = parsePairs(pairsRaw);

    const result = await client
      .from('activities')
      .insert([
        {
          title: title,
          teacher_name: teacherName,
          teacher_password: GLOBAL_TEACHER_PASSWORD,
          pairs: pairs
        }
      ])
      .select()
      .single();

    if (result.error) throw result.error;

    const activity = result.data;
    const studentLink = appUrlFor('play', activity.id);
    const resultsLink = appUrlFor('results', activity.id);

    setMessage(
      'createMessage',
      'Activity created.<br><br>' +
        '<strong>Student Link:</strong><br>' +
        '<a href="' + studentLink + '" target="_blank" rel="noopener noreferrer">' + studentLink + '</a><br><br>' +
        '<strong>Results Link:</strong><br>' +
        '<a href="' + resultsLink + '" target="_blank" rel="noopener noreferrer">' + resultsLink + '</a><br><br>' +
        '<button id="copyStudentFromCreate" class="secondary" type="button">Copy Student Link</button> ' +
        '<button id="copyResultsFromCreate" class="secondary" type="button">Copy Results Link</button>' +
        '<div class="qr-box"><img alt="QR code for student link" src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent(studentLink) + '" /></div>',
      'success'
    );

    const copyStudentBtn = el('copyStudentFromCreate');
    const copyResultsBtn = el('copyResultsFromCreate');
    if (copyStudentBtn) copyStudentBtn.addEventListener('click', function () { copyToClipboard(studentLink, 'createMessage'); });
    if (copyResultsBtn) copyResultsBtn.addEventListener('click', function () { copyToClipboard(resultsLink, 'createMessage'); });
  } catch (err) {
    setMessage('createMessage', escapeHtml(err.message || 'Could not create activity.'), 'error');
  }
}
