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

function pairColorClass(pairNumber) {
  if (!pairNumber) return '';
  const paletteSize = 5;
  const colorIndex = ((pairNumber - 1) % paletteSize) + 1;
  return 'pair-color-' + colorIndex;
}

function pairStrokeColor(pairNumber) {
  const colors = [
    'rgba(59, 130, 246, 0.78)',
    'rgba(147, 51, 234, 0.76)',
    'rgba(5, 150, 105, 0.76)',
    'rgba(234, 88, 12, 0.76)',
    'rgba(236, 72, 153, 0.76)'
  ];
  if (!pairNumber) return 'rgba(16, 185, 129, 0.68)';
  return colors[(pairNumber - 1) % colors.length];
}

const audioFx = {
  unlocked: false,
  initialized: false
};

function unlockAudioOnFirstInteraction() {
  if (audioFx.unlocked) return;
  audioFx.unlocked = true;
}

function initGameAudio() {
  if (audioFx.initialized) return;
  audioFx.initialized = true;

  ['pointerdown', 'touchstart', 'keydown'].forEach(function (evtName) {
    window.addEventListener(evtName, unlockAudioOnFirstInteraction, { once: true, passive: true });
  });
}

function playFeedbackSound(kind) {
  if (!audioFx.unlocked) return;
  playTone(kind);
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
    oscillator.frequency.value = kind === 'correct' ? 680 : 190;
    gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
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
  const gameArea = el('gameArea');
  const instructionEl = document.querySelector('.match-instruction');
  const activeSide = state.selectedLeft ? 'left' : (state.selectedRight ? 'right' : null);
  const pairingActive = Boolean(activeSide);
  leftList.innerHTML = '';
  rightList.innerHTML = '';
  gameArea.classList.toggle('pairing-active', pairingActive);
  gameArea.classList.toggle('pairing-left-active', activeSide === 'left');
  gameArea.classList.toggle('pairing-right-active', activeSide === 'right');

  if (instructionEl) {
    instructionEl.textContent = pairingActive
      ? 'Choose its matching item to complete the pair'
      : 'Tap one item on the left, then its match on the right';
  }

  state.leftItems.forEach(function (item, index) {
    const btn = document.createElement('button');
    btn.className = 'match-btn';
    btn.dataset.pairId = String(item.pairId);
    btn.dataset.side = 'left';
    if (state.selectedLeft === item.id) btn.classList.add('selected');
    if (state.matchedLeft.has(item.id)) btn.classList.add('correct');
    if (state.wrongFlashLeft === item.id) btn.classList.add('wrong');
    if (state.lastMatchedLeft === item.id) btn.classList.add('matched-pop');
    if (pairingActive && !state.matchedLeft.has(item.id)) {
      if (state.selectedLeft === item.id) {
        btn.classList.add('selection-anchor');
      } else if (activeSide === 'right') {
        btn.classList.add('possible-target');
      } else {
        btn.classList.add('deemphasized');
      }
    }
    btn.textContent = item.text;
    if (state.matchedLeft.has(item.id)) {
      const pairTag = document.createElement('span');
      const pairNumber = state.matchedPairOrder.get(item.pairId);
      pairTag.className = 'pair-tag ' + pairColorClass(pairNumber);
      pairTag.textContent = '#' + pairNumber;
      btn.appendChild(pairTag);
    }
    if (!state.matchedLeft.size && !state.matchedRight.size) {
      btn.style.animation = 'card-shuffle-in 280ms ease-out both';
      btn.style.animationDelay = Math.min(index * 36, 240) + 'ms';
    }
    btn.addEventListener('click', function () { selectLeft(item.id); });
    leftList.appendChild(btn);
  });

  state.rightItems.forEach(function (item, index) {
    const btn = document.createElement('button');
    btn.className = 'match-btn';
    btn.dataset.pairId = String(item.pairId);
    btn.dataset.side = 'right';
    if (state.selectedRight === item.id) btn.classList.add('selected');
    if (state.matchedRight.has(item.id)) btn.classList.add('correct');
    if (state.wrongFlashRight === item.id) btn.classList.add('wrong');
    if (state.lastMatchedRight === item.id) btn.classList.add('matched-pop');
    if (pairingActive && !state.matchedRight.has(item.id)) {
      if (state.selectedRight === item.id) {
        btn.classList.add('selection-anchor');
      } else if (activeSide === 'left') {
        btn.classList.add('possible-target');
      } else {
        btn.classList.add('deemphasized');
      }
    }
    btn.textContent = item.text;
    if (state.matchedRight.has(item.id)) {
      const pairTag = document.createElement('span');
      const pairNumber = state.matchedPairOrder.get(item.pairId);
      pairTag.className = 'pair-tag ' + pairColorClass(pairNumber);
      pairTag.textContent = '#' + pairNumber;
      btn.appendChild(pairTag);
    }
    if (!state.matchedLeft.size && !state.matchedRight.size) {
      btn.style.animation = 'card-shuffle-in 280ms ease-out both';
      btn.style.animationDelay = Math.min(index * 36, 240) + 'ms';
    }
    btn.addEventListener('click', function () { selectRight(item.id); });
    rightList.appendChild(btn);
  });

  el('matchedCount').textContent = String(state.matchedLeft.size);
  el('attemptCount').textContent = String(state.attempts);
  const totalPairs = state.leftItems.length;
  const matchedPairs = state.matchedLeft.size;
  const progress = totalPairs ? Math.round((matchedPairs / totalPairs) * 100) : 0;
  el('progressText').textContent = matchedPairs + ' / ' + totalPairs + ' matched';
  el('progressBar').style.width = progress + '%';
  drawMatchLines();
}

function drawMatchLines() {
  const svg = el('matchLines');
  const gameGrid = document.querySelector('.game-grid');
  if (!svg || !gameGrid) return;

  const rect = gameGrid.getBoundingClientRect();
  svg.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height);
  svg.innerHTML = '';

  state.matchedPairOrder.forEach(function (pairNumber, pairId) {
    const leftBtn = document.querySelector('.match-btn.correct[data-side="left"][data-pair-id="' + pairId + '"]');
    const rightBtn = document.querySelector('.match-btn.correct[data-side="right"][data-pair-id="' + pairId + '"]');
    if (!leftBtn || !rightBtn) return;

    const leftRect = leftBtn.getBoundingClientRect();
    const rightRect = rightBtn.getBoundingClientRect();
    const x1 = leftRect.right - rect.left;
    const y1 = leftRect.top - rect.top + (leftRect.height / 2);
    const x2 = rightRect.left - rect.left;
    const y2 = rightRect.top - rect.top + (rightRect.height / 2);
    const bend = Math.max(28, Math.abs(x2 - x1) * 0.28);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + (x1 + bend) + ' ' + y1 + ', ' + (x2 - bend) + ' ' + y2 + ', ' + x2 + ' ' + y2);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', pairStrokeColor(pairNumber));
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linecap', 'round');
    path.style.filter = 'drop-shadow(0 0 4px rgba(30, 41, 59, .18))';
    path.style.strokeDasharray = '8 5';
    path.style.animation = 'match-pop .45s ease-out';
    svg.appendChild(path);
  });

  const selectedId = state.selectedLeft || state.selectedRight;
  if (!selectedId) return;

  const selectedSide = state.selectedLeft ? 'left' : 'right';
  const selectedBtn = document.querySelector('.match-btn.selected[data-side="' + selectedSide + '"]');
  const targetColumn = document.querySelector(selectedSide === 'left' ? '.match-column-right .option-list' : '.match-column-left .option-list');
  if (!selectedBtn || !targetColumn) return;

  const selectedRect = selectedBtn.getBoundingClientRect();
  const targetRect = targetColumn.getBoundingClientRect();
  const x1 = selectedSide === 'left' ? (selectedRect.right - rect.left) : (selectedRect.left - rect.left);
  const y1 = selectedRect.top - rect.top + (selectedRect.height / 2);
  const x2 = selectedSide === 'left' ? (targetRect.left - rect.left) : (targetRect.right - rect.left);
  const y2 = targetRect.top - rect.top + Math.min(targetRect.height / 2, rect.height - 12);
  const bend = Math.max(22, Math.abs(x2 - x1) * 0.24);

  const previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  previewPath.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + (selectedSide === 'left' ? (x1 + bend) : (x1 - bend)) + ' ' + y1 + ', ' + (selectedSide === 'left' ? (x2 - bend) : (x2 + bend)) + ' ' + y2 + ', ' + x2 + ' ' + y2);
  previewPath.setAttribute('fill', 'none');
  previewPath.setAttribute('stroke', 'rgba(99, 102, 241, .35)');
  previewPath.setAttribute('stroke-width', '2');
  previewPath.setAttribute('stroke-dasharray', '6 8');
  previewPath.setAttribute('stroke-linecap', 'round');
  previewPath.style.animation = 'preview-dash 0.95s linear infinite';
  svg.appendChild(previewPath);
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
    playFeedbackSound('correct');
    popCorrectFeedback();
    clearMatchPopSoon();
  } else {
    state.wrongFlashLeft = left.id;
    state.wrongFlashRight = right.id;
    state.lastMatchedLeft = null;
    state.lastMatchedRight = null;
    setMessage('gameMessage', '❌ Not a match. Try again.', 'error');
    playFeedbackSound('wrong');
    clearWrongFlashSoon();
  }

  state.selectedLeft = null;
  state.selectedRight = null;
  renderGame();

  if (state.matchedLeft.size === state.leftItems.length) finishGame();
}

function popCorrectFeedback() {
  const area = el('gameArea');
  if (!area) return;
  area.classList.remove('correct-pop');
  void area.offsetWidth;
  area.classList.add('correct-pop');
  setTimeout(function () { area.classList.remove('correct-pop'); }, 280);
}

function triggerCelebration() {
  const burst = el('celebrationBurst');
  if (!burst) return;
  burst.innerHTML = '';
  const colors = ['#f59e0b', '#22c55e', '#06b6d4', '#6366f1', '#ec4899'];
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = Math.round(Math.random() * 100) + '%';
    piece.style.top = Math.round(Math.random() * 30) + '%';
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = Math.round(Math.random() * 120) + 'ms';
    burst.appendChild(piece);
  }
  setTimeout(function () { burst.innerHTML = ''; }, 1300);
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
  triggerCelebration();
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
