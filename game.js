function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function playTone(kind) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.value = kind === 'correct' ? 660 : 220;
    gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (kind === 'correct' ? 0.18 : 0.22));
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + (kind === 'correct' ? 0.18 : 0.22));
  } catch (e) {}
}

async function loadActivityForPlay(id) {
  setMessage('studentGateMessage', 'Loading activity...', 'warning');
  const result = await client.from('activities').select('id, title, pairs').eq('id', id).single();

  if (result.error || !result.data) {
    el('playTitle').textContent = 'Activity not found';
    setMessage('studentGateMessage', 'Could not load this activity.', 'error');
    return;
  }

  state.activity = result.data;
  state.activityId = result.data.id;
  el('playTitle').textContent = result.data.title;
  setMessage('studentGateMessage', '', '');
}

function resetGameState() {
  state.leftItems = [];
  state.rightItems = [];
  state.selectedLeft = null;
  state.selectedRight = null;
  state.matchedLeft = new Set();
  state.matchedRight = new Set();
  state.attempts = 0;
  state.startTs = null;
  state.wrongFlashLeft = null;
  state.wrongFlashRight = null;
  state.lastMatchedLeft = null;
  state.lastMatchedRight = null;
  state.matchedPairOrder = new Map();

  if (state.timerInt) clearInterval(state.timerInt);
  state.timerInt = null;

  el('matchedCount').textContent = '0';
  el('attemptCount').textContent = '0';
  el('timer').textContent = '0';
  el('progressBar').style.width = '0%';
  el('progressText').textContent = '0 / 0 matched';
  setMessage('gameMessage', '', '');
}

function startGame() {
  const studentName = el('studentName').value.trim();
  if (!studentName) return setMessage('studentGateMessage', 'Please enter your name.', 'error');
  if (!state.activity || !state.activity.pairs) return setMessage('studentGateMessage', 'This activity is not loaded correctly.', 'error');

  state.studentName = studentName;
  resetGameState();

  el('studentGate').classList.add('hidden');
  el('gameArea').classList.remove('hidden');

  state.leftItems = shuffle(state.activity.pairs.map(function (pair, index) { return { id: 'L' + index, pairId: index, text: pair.left }; }));
  state.rightItems = shuffle(state.activity.pairs.map(function (pair, index) { return { id: 'R' + index, pairId: index, text: pair.right }; }));

  state.startTs = Date.now();
  state.timerInt = setInterval(function () {
    el('timer').textContent = String(Math.floor((Date.now() - state.startTs) / 1000));
  }, 1000);

  renderGame();
}

function renderGame() {
  const leftList = el('leftList');
  const rightList = el('rightList');
  leftList.innerHTML = '';
  rightList.innerHTML = '';

  state.leftItems.forEach(function (item) {
    const btn = document.createElement('button');
    btn.className = 'match-btn';
    if (state.selectedLeft === item.id) btn.classList.add('selected');
    if (state.matchedLeft.has(item.id)) btn.classList.add('correct');
    if (state.wrongFlashLeft === item.id) btn.classList.add('wrong');
    if (state.lastMatchedLeft === item.id) btn.classList.add('matched-pop');
    btn.textContent = item.text;
    if (state.matchedLeft.has(item.id)) {
      const pairTag = document.createElement('span');
      pairTag.className = 'pair-tag';
      pairTag.textContent = '#' + state.matchedPairOrder.get(item.pairId);
      btn.appendChild(pairTag);
    }
    btn.addEventListener('click', function () { selectLeft(item.id); });
    leftList.appendChild(btn);
  });

  state.rightItems.forEach(function (item) {
    const btn = document.createElement('button');
    btn.className = 'match-btn';
    if (state.selectedRight === item.id) btn.classList.add('selected');
    if (state.matchedRight.has(item.id)) btn.classList.add('correct');
    if (state.wrongFlashRight === item.id) btn.classList.add('wrong');
    if (state.lastMatchedRight === item.id) btn.classList.add('matched-pop');
    btn.textContent = item.text;
    if (state.matchedRight.has(item.id)) {
      const pairTag = document.createElement('span');
      pairTag.className = 'pair-tag';
      pairTag.textContent = '#' + state.matchedPairOrder.get(item.pairId);
      btn.appendChild(pairTag);
    }
    btn.addEventListener('click', function () { selectRight(item.id); });
    rightList.appendChild(btn);
  });

  el('matchedCount').textContent = String(state.matchedLeft.size);
  el('attemptCount').textContent = String(state.attempts);
  el('progressText').textContent = state.matchedLeft.size + ' / ' + state.leftItems.length + ' matched';
  const progress = state.leftItems.length ? Math.round((state.matchedLeft.size / state.leftItems.length) * 100) : 0;
  el('progressBar').style.width = progress + '%';
}

function selectLeft(id) {
  if (state.matchedLeft.has(id)) return;
  state.selectedLeft = id;
  renderGame();
  maybeCheckMatch();
}

function selectRight(id) {
  if (state.matchedRight.has(id)) return;
  state.selectedRight = id;
  renderGame();
  maybeCheckMatch();
}

function clearWrongFlashSoon() {
  setTimeout(function () {
    state.wrongFlashLeft = null;
    state.wrongFlashRight = null;
    renderGame();
  }, 420);
}

function clearMatchPopSoon() {
  setTimeout(function () {
    state.lastMatchedLeft = null;
    state.lastMatchedRight = null;
    renderGame();
  }, 320);
}

function maybeCheckMatch() {
  if (!state.selectedLeft || !state.selectedRight) return;
  const left = state.leftItems.find(function (item) { return item.id === state.selectedLeft; });
  const right = state.rightItems.find(function (item) { return item.id === state.selectedRight; });

  state.attempts += 1;

  if (left.pairId === right.pairId) {
    const matchNumber = state.matchedPairOrder.size + 1;
    state.matchedPairOrder.set(left.pairId, matchNumber);
    state.matchedLeft.add(left.id);
    state.matchedRight.add(right.id);
    state.wrongFlashLeft = null;
    state.wrongFlashRight = null;
    state.lastMatchedLeft = left.id;
    state.lastMatchedRight = right.id;
    setMessage('gameMessage', '✅ Correct match!', 'success');
    playTone('correct');
    clearMatchPopSoon();
  } else {
    state.wrongFlashLeft = left.id;
    state.wrongFlashRight = right.id;
    state.lastMatchedLeft = null;
    state.lastMatchedRight = null;
    setMessage('gameMessage', '❌ Not a match. Try again.', 'error');
    playTone('wrong');
    clearWrongFlashSoon();
  }

  state.selectedLeft = null;
  state.selectedRight = null;
  renderGame();

  if (state.matchedLeft.size === state.leftItems.length) finishGame();
}

async function finishGame() {
  if (state.timerInt) clearInterval(state.timerInt);

  const duration = Math.floor((Date.now() - state.startTs) / 1000);
  const total = state.leftItems.length;
  const score = total;

  setMessage('gameMessage', 'Finished. Saving your result...', 'warning');

  const result = await client.from('submissions').insert([
    {
      activity_id: state.activityId,
      student_name: state.studentName,
      score: score,
      total: total,
      attempts: state.attempts,
      duration_seconds: duration
    }
  ]);

  if (result.error) {
    setMessage('gameMessage', 'You finished, but the result could not be saved.', 'error');
    return;
  }

  setMessage('gameMessage', 'Done. Your result was saved.', 'success');
  el('finishScore').textContent = score + '/' + total;
  el('finishDetails').innerHTML = 'Attempts: <strong>' + state.attempts + '</strong> · Time: <strong>' + duration + 's</strong>';
  el('finishOverlay').classList.remove('hidden');
}

function closeFinishOverlay() { el('finishOverlay').classList.add('hidden'); }

function playAgain() {
  closeFinishOverlay();
  el('studentGate').classList.remove('hidden');
  el('gameArea').classList.add('hidden');
  el('studentName').value = state.studentName;
  resetGameState();
}
