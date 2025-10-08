/* Lightweight game script implementing:
   - Easy: 60s, 12 tiles (6 pairs)
   - Medium: 60s, 16 tiles (8 pairs)
   - Hard: 45s, 16 tiles (8 pairs) with hint disabled
   - per-difficulty star thresholds
   - countdown progress bar
   - distinct Win / Lose modal layouts
*/
(() => {
  const uniqueImages = [
    'Agility.png', 'Boat.png', 'Citizenship.png', 'Hack.png',
    'Nerd-Rage.png', 'Nuka-Cola.png', 'Robotics.png', 'Shock.png'
  ];

  const difficulties = {
    easy: { tiles: 12, time: 60, hideHint: false, stars: [10, 16] },   // 3 stars <=10 moves, 2 <=16 else 1
    medium: { tiles: 16, time: 60, hideHint: false, stars: [12, 18] },
    hard: { tiles: 16, time: 45, hideHint: true, stars: [10, 15] }
  };

  let selectedDifficulty = 'medium';

  // DOM
  const deckEl = document.getElementById('deck');
  const movesEl = document.getElementById('moves');
  const timeEl = document.getElementById('time');
  const pairsEl = document.getElementById('pairs');
  const starsEl = document.getElementById('star-rating');
  const restartBtn = document.getElementById('restart');
  const restartBottom = document.getElementById('restart-bottom');
  const hintBtn = document.getElementById('hint');
  const modal = document.getElementById('modalOverlay');
  const playAgainBtn = document.getElementById('playAgain');
  const closeModalBtn = document.getElementById('closeModal');
  const modalStats = document.getElementById('modalStats');
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const timerBarFill = document.getElementById('timerBar');
  const diffControls = document.getElementById('difficultyControls');
  const openHighScoresBtn = document.getElementById('openHighScores');
  const highScoresOverlay = document.getElementById('highScoresOverlay');
  const highScoresContainer = document.getElementById('highScoresContainer');
  const closeHighScoresBtn = document.getElementById('closeHighScores');

  // state
  let deck = [];
  let opened = [];
  let matched = 0;
  let moves = 0;
  let starCount = 3;
  let locked = false; // prevents interactions while resolving
  let timerId = null;
  let timeLeft = 0;
  let timeTotal = 60;
  let started = false;
  let pairCount = Math.floor(difficulties[selectedDifficulty].tiles / 2);
  let totalTiles = pairCount * 2;
  const confettiCanvas = document.getElementById('confettiCanvas');
  const muteBtn = document.getElementById('mute');
  const bestScoreKey = (diff) => `vt_best_${diff}`;
  const lbKey = (diff) => `vt_lb_${diff}`;
  const hsKey = 'vt_highscores_v1';
  const leaderboardList = document.getElementById('leaderboardList');
  const exportBtn = document.getElementById('exportLb');
  const shareBtn = document.getElementById('shareLb');
  const clearBtn = document.getElementById('clearLb');
  const playDemoBtn = document.getElementById('playDemo');
  let audioCtx = null;
  let isMuted = false;

  // util
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a }
  function formatTime(min, sec) { return (min).toString().padStart(2, '0') + ':' + (sec).toString().padStart(2, '0') }
  function parseTimeToSeconds(timeStr) {
    // expects MM:SS
    if (typeof timeStr !== 'string' || !timeStr.includes(':')) return Infinity;
    const [m, s] = timeStr.split(':').map(n => parseInt(n, 10));
    if (Number.isNaN(m) || Number.isNaN(s)) return Infinity;
    return m * 60 + s;
  }

  // High score store helpers
  function loadHighScores() {
    try {
      const raw = localStorage.getItem(hsKey);
      const base = { easy: { time: null, moves: null, stars: null }, medium: { time: null, moves: null, stars: null }, hard: { time: null, moves: null, stars: null } };
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      return Object.assign(base, parsed);
    } catch (e) {
      return { easy: { time: null, moves: null, stars: null }, medium: { time: null, moves: null, stars: null }, hard: { time: null, moves: null, stars: null } };
    }
  }
  function saveHighScores(store) { localStorage.setItem(hsKey, JSON.stringify(store)); }

  function isBetterScore(prev, current) {
    // prev/current like {time:'MM:SS'|null, moves:number|null, stars:number|null}
    if (!prev) return true;
    // Better if higher stars, or fewer moves at same stars, or faster time at same stars and moves
    const prevStars = prev.stars ?? -1;
    const curStars = current.stars ?? -1;
    if (curStars > prevStars) return true;
    if (curStars < prevStars) return false;
    const prevMoves = (typeof prev.moves === 'number') ? prev.moves : Infinity;
    const curMoves = (typeof current.moves === 'number') ? current.moves : Infinity;
    if (curMoves < prevMoves) return true;
    if (curMoves > prevMoves) return false;
    const prevSec = parseTimeToSeconds(prev.time);
    const curSec = parseTimeToSeconds(current.time);
    return curSec < prevSec;
  }

  function compareAndUpdateScores(difficulty, current) {
    const store = loadHighScores();
    const prev = store[difficulty];
    if (isBetterScore(prev, current)) {
      store[difficulty] = { time: current.time, moves: current.moves, stars: current.stars };
      saveHighScores(store);
    }
  }

  function renderHighScoresTable() {
    if (!highScoresContainer) return;
    const store = loadHighScores();
    const rows = ['easy', 'medium', 'hard'].map(diff => {
      const d = store[diff] || {};
      const t = d.time || '—';
      const m = (typeof d.moves === 'number') ? d.moves : '—';
      const s = (typeof d.stars === 'number') ? d.stars : '—';
      return `<tr><td style="text-transform:capitalize">${diff}</td><td>${t}</td><td>${m}</td><td>${s}★</td></tr>`;
    }).join('');
    highScoresContainer.innerHTML = `
      <div class="stat-card" style="width:100%;overflow:auto">
        <table style="width:100%;border-collapse:separate;border-spacing:0 8px">
          <thead>
            <tr>
              <th style="text-align:left">Difficulty</th>
              <th style="text-align:left">Best Time</th>
              <th style="text-align:left">Best Moves</th>
              <th style="text-align:left">Best Stars</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // timer
  function startTimer() {
    if (timerId) return;
    timerId = setInterval(() => {
      if (timeLeft <= 0) { stopTimer(); onTimeUp(); return; }
      timeLeft--;
      timeEl.textContent = formatTime(Math.floor(timeLeft / 60), timeLeft % 60);
      const pct = Math.max(0, (timeLeft / timeTotal) * 100);
      timerBarFill.style.width = pct + '%';
    }, 1000);
  }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null } }
  function resetTimer() {
    stopTimer();
    pairCount = Math.floor(difficulties[selectedDifficulty].tiles / 2);
    totalTiles = pairCount * 2;
    timeTotal = difficulties[selectedDifficulty].time;
    timeLeft = timeTotal;
    timeEl.textContent = formatTime(Math.floor(timeLeft / 60), timeLeft % 60);
    timerBarFill.style.width = '100%';
  }

  // audio helpers (small tones using WebAudio)
  function ensureAudio() {
    if (isMuted) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  function playTone(freq, dur = 0.08) {
    try {
      if (isMuted) return;
      ensureAudio();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = 0.0025 * (dur * 10);
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      setTimeout(() => { o.stop(); o.disconnect(); g.disconnect(); }, dur * 1000);
    } catch (e) { /* ignore audio errors */ }
  }

  // deck
  function buildDeck() {
    deckEl.innerHTML = '';
    const chosen = shuffle(uniqueImages.slice()).slice(0, pairCount);
    deck = shuffle(chosen.concat(chosen));
    deck.forEach((imgSrc, i) => {
      const li = document.createElement('div');
      li.className = 'card';
      li.setAttribute('data-index', i);
      li.setAttribute('data-src', imgSrc);
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      const altText = imgSrc.split('.').slice(0, -1).join('.');
      // provide a descriptive alt and aria-label for better accessibility
      li.setAttribute('aria-label', `Card: ${altText}`);
      li.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-back"><div class="logo">VT</div></div>
          <div class="card-face card-front"><img src="img/${imgSrc}" alt="${altText}"></div>
        </div>`;
      deckEl.appendChild(li);
    });
    // show best score for selected difficulty if present
    showBestScore();
  }

  function showBestScore() {
    const raw = localStorage.getItem(bestScoreKey(selectedDifficulty));
    // create or update a small element in the panel
    let el = document.getElementById('bestScore');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bestScore';
      el.className = 'label';
      const container = document.querySelector('.score-box');
      container.appendChild(el);
    }
    if (!raw) { el.textContent = 'Best: —'; return; }
    try {
      const s = JSON.parse(raw);
      el.textContent = `Best: ${s.time} / ${s.moves} moves / ${s.stars}★`;
    } catch (e) { el.textContent = 'Best: —'; }
  }

  // leaderboard helpers (top 5)
  function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem(lbKey(selectedDifficulty)) || '[]'); } catch (e) { return []; }
  }
  function saveLeaderboard(list) { localStorage.setItem(lbKey(selectedDifficulty), JSON.stringify(list)); }
  function addScore(entry) {
    const list = getLeaderboard();
    list.push(entry);
    // sort by moves asc, then time asc (elapsed seconds)
    list.sort((a, b) => a.moves - b.moves || a.elapsed - b.elapsed);
    const trimmed = list.slice(0, 5);
    saveLeaderboard(trimmed);
    renderLeaderboard();
  }
  function renderLeaderboard() {
    const list = getLeaderboard();
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '';
    if (list.length === 0) { leaderboardList.innerHTML = '<div class="muted-note">No records yet. Play and record a best!</div>'; return; }
    list.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'lb-row';
      row.innerHTML = `<div>#${i + 1} ${r.time} • ${r.moves} moves</div><div>${r.stars}★</div>`;
      leaderboardList.appendChild(row);
    });
  }

  function updateUI() {
    movesEl.textContent = moves;
    pairsEl.textContent = `${matched} / ${totalTiles}`;
    // star logic per difficulty thresholds
    const [threeThresh, twoThresh] = difficulties[selectedDifficulty].stars;
    if (moves <= threeThresh) starCount = 3;
    else if (moves <= twoThresh) starCount = 2;
    else starCount = 1;
    Array.from(starsEl.children).forEach((el, idx) => {
      el.classList.toggle('star--lost', idx + 1 > starCount);
    });
  }

  function resetGame() {
    stopTimer();
    resetTimer();
    buildDeck();
    opened = [];
    matched = 0;
    moves = 0;
    starCount = 3;
    updateUI();
    started = false;
    // enable hint based on difficulty
    hintBtn.style.display = difficulties[selectedDifficulty].hideHint ? 'none' : '';
    // ensure cards are interactive
    Array.from(deckEl.querySelectorAll('.card')).forEach(c => { c.removeAttribute('aria-disabled'); c.classList.remove('matched', 'is-flip'); });
    locked = false;
  }

  // card interactions
  deckEl.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    onCardClick(card);
  });

  deckEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const c = e.target.closest('.card');
      if (c) onCardClick(c);
    }
  });


  function createMatchParticles(card) {
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;


    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      particle.className = 'match-particle';
      particle.style.left = centerX + 'px';
      particle.style.top = centerY + 'px';

      const angle = (Math.PI * 2 * i) / 12;
      const distance = 60 + Math.random() * 40;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;

      particle.style.setProperty('--tx', tx + 'px');
      particle.style.setProperty('--ty', ty + 'px');

      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 800);
    }
  }

  function onCardClick(card) {
    // Prevent interaction while resolving a pair
    if (locked) return;

    // Ignore clicks on already flipped or matched cards
    if (card.classList.contains('is-flip') || card.classList.contains('matched')) return;

    // Start timer if first click
    if (!started) { started = true; startTimer(); }

    // Flip this card
    card.classList.add('is-flip');
    playTone(600, 0.06);
    opened.push(card);

    // Only act when 2 cards are open
    if (opened.length < 2) return;

    // From now, lock board until resolved
    locked = true;
    moves++;
    updateUI();

    const [a, b] = opened;
    const srcA = a.getAttribute('data-src');
    const srcB = b.getAttribute('data-src');

    if (srcA === srcB) {
      // Wait a short delay to let both cards finish flipping
      setTimeout(() => {
        a.classList.add('matched');
        b.classList.add('matched');
        createMatchParticles(a);
        createMatchParticles(b);
        matched += 2;
        opened = [];
        playTone(980, 0.12);
        updateUI();
        locked = false;
        checkWin();
      }, 300); // ← wait for the flip transition to complete
    }

    else {
      // ❌ Not match — flip back after delay safely
      setTimeout(() => {
        // double-check they are still unmatched (guard against mid-reset)
        if (!a.classList.contains('matched')) a.classList.remove('is-flip');
        if (!b.classList.contains('matched')) b.classList.remove('is-flip');
        opened = [];
        locked = false;
        playTone(220, 0.14);
      }, 700);
    }
  }


  function checkWin() {
    if (matched === totalTiles) {
      stopTimer();
      showWinModal();
    }
  }

  // modal variants
  function statCard(label, val) {
    const n = document.createElement('div'); n.className = 'stat-card';
    n.innerHTML = `<div class="label" style="font-size:0.8rem">${label}</div><div style="font-weight:700;color:var(--vault-yellow);margin-top:6px">${val}</div>`;
    return n;
  }

  function showWinModal() {
    modalTitle.textContent = 'CONGRATULATIONS, Vault Dweller';
    modalMessage.textContent = 'You matched all pairs — Vault‑Tec is proud.';
    modalStats.innerHTML = '';
    const elapsed = timeTotal - timeLeft;
    modalStats.appendChild(statCard('Time', formatTime(Math.floor(elapsed / 60), elapsed % 60)));
    modalStats.appendChild(statCard('Moves', moves));
    modalStats.appendChild(statCard('Stars', `${starCount} / 3`));
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    // play win tone and confetti
    playTone(1200, 0.18);
    fireConfetti();
    // persist best score (legacy single best display)
    try {
      const record = { time: formatTime(Math.floor(elapsed / 60), elapsed % 60), moves, stars: starCount };
      const prev = JSON.parse(localStorage.getItem(bestScoreKey(selectedDifficulty)) || 'null');
      const better = !prev || (moves < prev.moves) || (moves === prev.moves && elapsed < (prev.elapsed || Infinity));
      if (better) localStorage.setItem(bestScoreKey(selectedDifficulty), JSON.stringify(Object.assign({}, record, { elapsed })));
      // new: persistent highs per difficulty
      compareAndUpdateScores(selectedDifficulty, record);
    } catch (e) {/* ignore */ }
    showBestScore();
    // add to leaderboard
    try {
      addScore({ time: formatTime(Math.floor(elapsed / 60), elapsed % 60), moves, stars: starCount, elapsed });
    } catch (e) { }
  }

  function showLoseModal() {
    modalTitle.textContent = "TIME'S UP — Vault‑Tec Regrets the Loss";
    modalMessage.textContent = 'You ran out of time. Review your training and try again.';
    modalStats.innerHTML = '';
    modalStats.appendChild(statCard('Matched', `${matched} / ${totalTiles}`));
    modalStats.appendChild(statCard('Moves', moves));
    modalStats.appendChild(statCard('Stars', `${starCount} / 3`));
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  }

  function onTimeUp() {
    // disable further card clicks
    Array.from(deckEl.querySelectorAll('.card')).forEach(c => c.setAttribute('aria-disabled', 'true'));
    showLoseModal();
  }

  // hint
  hintBtn.addEventListener('click', () => {
    const nodes = Array.from(deckEl.querySelectorAll('.card:not(.matched):not(.is-flip)'));
    if (nodes.length < 2) return;
    const grouped = {};
    nodes.forEach(n => { const s = n.getAttribute('data-src'); (grouped[s] = grouped[s] || []).push(n) });
    const key = Object.keys(grouped).find(k => grouped[k].length >= 2);
    if (!key) return;
    const [c1, c2] = grouped[key];
    c1.classList.add('is-flip'); c2.classList.add('is-flip');
    setTimeout(() => { c1.classList.remove('is-flip'); c2.classList.remove('is-flip'); playTone(440, 0.08); }, 900);
  });

  // restart & modal handlers
  restartBtn.addEventListener('click', resetGame);
  restartBottom.addEventListener('click', resetGame);
  playAgainBtn.addEventListener('click', () => {
    modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); resetGame();
    // return focus to deck
    const first = deckEl.querySelector('.card'); if (first) first.focus();
  });
  closeModalBtn.addEventListener('click', () => { modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); });

  // mute toggle
  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    muteBtn.setAttribute('aria-pressed', String(isMuted));
    muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    if (isMuted && audioCtx && audioCtx.state !== 'closed') {
      try { audioCtx.suspend(); } catch (e) { }
    } else if (audioCtx) { try { audioCtx.resume(); } catch (e) { } }
  });

  // confetti implementation (small)
  function fireConfetti() {
    if (!confettiCanvas) return;
    confettiCanvas.style.display = 'block';
    const ctx = confettiCanvas.getContext('2d');
    const W = confettiCanvas.width = confettiCanvas.clientWidth;
    const H = confettiCanvas.height = confettiCanvas.clientHeight;
    const pieces = [];
    for (let i = 0; i < 80; i++) { pieces.push({ x: Math.random() * W, y: Math.random() * H - H, r: Math.random() * 6 + 4, c: `hsl(${Math.random() * 360},70%,60%)`, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 3 + 2, rot: Math.random() * 360 }); }
    let t = 0;
    function frame() {
      t++; ctx.clearRect(0, 0, W, H);
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.rot += p.vx * 4;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      });
      if (t < 140) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, W, H); confettiCanvas.style.display = 'none'; }
    }
    requestAnimationFrame(frame);
  }

  // difficulty control
  // defensive: ensure the DOM node exists before attaching handlers
  if (!diffControls) { console.warn('difficultyControls element not found — difficulty buttons will not work'); }
  else {
    console.log('difficultyControls found — wiring difficulty buttons');
    diffControls.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-diff]');
      if (!b) return;
      selectedDifficulty = b.getAttribute('data-diff');
      Array.from(diffControls.querySelectorAll('button[data-diff]')).forEach(btn => btn.classList.remove('btn--active'));
      b.classList.add('btn--active');
      // apply and reset
      pairCount = Math.floor(difficulties[selectedDifficulty].tiles / 2);
      totalTiles = pairCount * 2;
      resetGame();
      renderLeaderboard();
    });
  }

  // modal accessibility: trap focus inside modal when open
  function trapFocus(e) {
    if (modal.style.display !== 'flex') return;
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener('keydown', trapFocus);

  // export/share/clear leaderboard
  if (exportBtn) exportBtn.addEventListener('click', () => {
    const data = getLeaderboard();
    const blob = new Blob([JSON.stringify({ difficulty: selectedDifficulty, data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `vault-memory-leaderboard-${selectedDifficulty}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
  if (shareBtn) shareBtn.addEventListener('click', async () => {
    const data = getLeaderboard();
    if (data.length === 0) return alert('No leaderboard entries to share.');
    const top = data[0];
    const text = `Vault‑Tec Memory — ${selectedDifficulty.toUpperCase()} best: ${top.time}, ${top.moves} moves, ${top.stars}★`;
    try {
      await navigator.clipboard.writeText(text);
      alert('Summary copied to clipboard: ' + text);
    } catch (e) { alert('Could not copy to clipboard.'); }
  });
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (!confirm('Clear leaderboard for ' + selectedDifficulty + '?')) return;
    localStorage.removeItem(lbKey(selectedDifficulty)); renderLeaderboard();
  });

  // High Scores modal wiring
  if (openHighScoresBtn) {
    openHighScoresBtn.addEventListener('click', () => {
      renderHighScoresTable();
      if (highScoresOverlay) { highScoresOverlay.style.display = 'flex'; highScoresOverlay.setAttribute('aria-hidden', 'false'); }
    });
  }
  if (closeHighScoresBtn) {
    closeHighScoresBtn.addEventListener('click', () => {
      if (highScoresOverlay) { highScoresOverlay.style.display = 'none'; highScoresOverlay.setAttribute('aria-hidden', 'true'); }
    });
  }

  // in-page demo playback (no external recording needed)
  async function playDemo() {
    if (!playDemoBtn) return;
    playDemoBtn.disabled = true; locked = true;
    resetGame(); // start fresh
    await new Promise(r => setTimeout(r, 400));
    // flip a handful of random cards
    const cards = Array.from(deckEl.querySelectorAll('.card'));
    for (let i = 0; i < 6 && i < cards.length; i++) {
      const c = cards[Math.floor(Math.random() * cards.length)];
      c.focus(); c.click(); await new Promise(r => setTimeout(r, 350));
    }
    // use hint if available
    if (hintBtn.style.display !== 'none') { hintBtn.click(); await new Promise(r => setTimeout(r, 900)); }
    // change difficulty to hard then back to medium to show UI
    const hardBtn = diffControls.querySelector('button[data-diff="hard"]');
    const medBtn = diffControls.querySelector('button[data-diff="medium"]');
    if (hardBtn) { hardBtn.click(); await new Promise(r => setTimeout(r, 600)); }
    if (medBtn) { medBtn.click(); await new Promise(r => setTimeout(r, 600)); }

    // quickly match all pairs by clicking known pairs
    const mapping = {};
    Array.from(deckEl.querySelectorAll('.card')).forEach((el) => { const s = el.getAttribute('data-src'); (mapping[s] = mapping[s] || []).push(el); });
    for (const key of Object.keys(mapping)) {
      const pair = mapping[key];
      if (pair.length >= 2) { pair[0].click(); await new Promise(r => setTimeout(r, 120)); pair[1].click(); await new Promise(r => setTimeout(r, 220)); }
    }
    // small pause to show win modal/confetti
    await new Promise(r => setTimeout(r, 900));
    // close modal and reset
    if (playAgainBtn) playAgainBtn.click();
    playDemoBtn.disabled = false; locked = false;
  }
  if (playDemoBtn) playDemoBtn.addEventListener('click', () => { playDemo(); });

  // init
  resetGame();
  renderLeaderboard();

  // accessibility: close modal on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') { modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); }
  });
})();