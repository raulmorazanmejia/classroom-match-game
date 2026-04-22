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
  const paletteSize = 6;
  const colorIndex = ((pairNumber - 1) % paletteSize) + 1;
  return 'pair-color-' + colorIndex;
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
  state.answerOptions = [];
  state.promptItems = [];
  state.selectedOptionId = null;
  state.assignedByPrompt = new Map();
  state.assignedPromptByOption = new Map();
  state.assignmentCount = 0;
  state.attempts = 0;
  state.startTs = null;
  state.feedbackByPrompt = new Map();
  state.feedbackVisible = false;
  state.isSubmitted = false;

  if (state.timerInt) clearInterval(state.timerInt);
  state.timerInt = null;

  el('matchedCount').textContent = '0';
  el('attemptCount').textContent = '0';
  el('timer').textContent = '0';
  el('progressBar').style.width = '0%';
  el('progressText').textContent = '0 / 0 assigned';
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

  state.promptItems = state.activity.pairs.map(function (pair, index) {
    return { id: 'P' + index, pairId: index, promptText: pair.left };
  });

  state.answerOptions = shuffle(state.activity.pairs.map(function (pair, index) {
    return { id: 'O' + index, pairId: index, answerText: pair.right };
  }));

  state.startTs = Date.now();
  state.timerInt = setInterval(function () {
    el('timer').textContent = String(Math.floor((Date.now() - state.startTs) / 1000));
  }, 1000);

  renderGame();
}

function assignSelectedOptionToPrompt(promptId) {
  if (!state.selectedOptionId) {
    setMessage('gameMessage', 'Select an answer from the bank first, then tap a slot.', 'warning');
    return;
  }

  const selectedOptionId = state.selectedOptionId;
  const previousPromptForOption = state.assignedPromptByOption.get(selectedOptionId);
  if (previousPromptForOption && previousPromptForOption !== promptId) {
    state.assignedByPrompt.delete(previousPromptForOption);
  }

  const previousOptionForPrompt = state.assignedByPrompt.get(promptId);
  if (previousOptionForPrompt && previousOptionForPrompt !== selectedOptionId) {
    state.assignedPromptByOption.delete(previousOptionForPrompt);
  }

  state.assignedByPrompt.set(promptId, selectedOptionId);
  state.assignedPromptByOption.set(selectedOptionId, promptId);
  state.assignmentCount += 1;
  state.isSubmitted = false;
  state.feedbackVisible = false;
  state.feedbackByPrompt.clear();

  const assignedCount = state.assignedByPrompt.size;
  setMessage('gameMessage', 'Assigned ' + assignedCount + ' of ' + state.promptItems.length + '. Tap Submit when ready.', 'warning');
  renderGame();
}

function submitAssignments() {
  if (state.assignedByPrompt.size < state.promptItems.length) {
    setMessage('gameMessage', 'Fill every slot before submitting.', 'error');
    return;
  }

  state.attempts += 1;
  state.feedbackVisible = true;
  state.isSubmitted = true;
  state.feedbackByPrompt.clear();

  let correctCount = 0;
  state.promptItems.forEach(function (prompt) {
    const assignedOptionId = state.assignedByPrompt.get(prompt.id);
    const assignedOption = state.answerOptions.find(function (option) { return option.id === assignedOptionId; });
    const isCorrect = Boolean(assignedOption && assignedOption.pairId === prompt.pairId);
    state.feedbackByPrompt.set(prompt.id, isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) correctCount += 1;
  });

  if (correctCount === state.promptItems.length) {
    setMessage('gameMessage', '✅ Perfect! All answers are correct.', 'success');
    playFeedbackSound('correct');
    finishGame();
  } else {
    setMessage('gameMessage', '❌ ' + correctCount + '/' + state.promptItems.length + ' correct. Adjust and submit again.', 'error');
    playFeedbackSound('wrong');
  }

  renderGame();
}

function renderGame() {
  const bank = el('answerBank');
  const promptList = el('promptList');
  bank.innerHTML = '';
  promptList.innerHTML = '';

  state.answerOptions.forEach(function (option, index) {
    const pill = document.createElement('button');
    pill.className = 'answer-pill ' + pairColorClass(option.pairId + 1);
    pill.type = 'button';
    pill.textContent = option.answerText;
    pill.dataset.optionId = option.id;

    const isAssigned = state.assignedPromptByOption.has(option.id);
    const assignedPromptId = state.assignedPromptByOption.get(option.id);

    if (isAssigned) {
      pill.classList.add('assigned');
      const number = state.promptItems.findIndex(function (prompt) { return prompt.id === assignedPromptId; }) + 1;
      pill.setAttribute('aria-label', option.answerText + ' assigned to prompt ' + number);
    }

    if (state.selectedOptionId === option.id) {
      pill.classList.add('selected');
    }

    pill.addEventListener('click', function () {
      state.selectedOptionId = state.selectedOptionId === option.id ? null : option.id;
      renderGame();
    });

    bank.appendChild(pill);
  });

  state.promptItems.forEach(function (prompt, index) {
    const row = document.createElement('div');
    row.className = 'prompt-row';

    const slot = document.createElement('button');
    slot.className = 'target-slot';
    slot.type = 'button';

    const assignedOptionId = state.assignedByPrompt.get(prompt.id);
    const assignedOption = state.answerOptions.find(function (option) { return option.id === assignedOptionId; });

    if (assignedOption) {
      slot.textContent = assignedOption.answerText;
      slot.classList.add('filled', pairColorClass(assignedOption.pairId + 1));
    } else {
      slot.textContent = 'Tap to place answer';
      slot.classList.add('empty');
    }

    if (state.feedbackVisible) {
      const feedbackClass = state.feedbackByPrompt.get(prompt.id);
      if (feedbackClass === 'correct') slot.classList.add('feedback-correct');
      if (feedbackClass === 'incorrect') slot.classList.add('feedback-incorrect');
    }

    slot.addEventListener('click', function () {
      assignSelectedOptionToPrompt(prompt.id);
    });

    const promptText = document.createElement('div');
    promptText.className = 'prompt-text';
    promptText.textContent = (index + 1) + '. ' + prompt.promptText;

    row.appendChild(slot);
    row.appendChild(promptText);
    promptList.appendChild(row);
  });

  const total = state.promptItems.length;
  const assigned = state.assignedByPrompt.size;
  const percent = total ? Math.round((assigned / total) * 100) : 0;

  el('matchedCount').textContent = String(assigned);
  el('attemptCount').textContent = String(state.attempts);
  el('progressText').textContent = assigned + ' / ' + total + ' assigned';
  el('progressBar').style.width = percent + '%';
}

async function finishGame() {
  if (state.timerInt) clearInterval(state.timerInt);

  const duration = Math.floor((Date.now() - state.startTs) / 1000);
  const total = state.promptItems.length;
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
  el('finishDetails').innerHTML = 'Submits: <strong>' + state.attempts + '</strong> · Time: <strong>' + duration + 's</strong>';
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
