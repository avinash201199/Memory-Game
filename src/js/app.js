/* Improved Vault Memory Game script
   - Defensive DOM checks
   - Keyboard shortcuts: R = restart, H = hint, Esc = close modal
   - Robust audio toggle handling
   - Safeguards for missing elements (no runtime errors)
   - Minor UX tweaks (timings, focus, move-limit init)
*/
(() => {
  const uniqueImages = [
    'Agility.png','Boat.png','Citizenship.png','Hack.png',
    'Nerd-Rage.png','Nuka-Cola.png','Robotics.png','Shock.png'
  ];

  const difficulties = {
    easy:   { tiles: 12, time: 60, hideHint: false, stars: [10,16] },
    medium: { tiles: 16, time: 60, hideHint: false, stars: [12,18] },
    hard:   { tiles: 16, time: 45, hideHint: true,  stars: [10,15] }
  };

  let selectedDifficulty = 'medium';

  // DOM (defensive)
  const $ = id => document.getElementById(id);
  const deckEl = $('deck');
  const movesEl = $('moves');
  const timeEl = $('time');
  const pairsEl = $('pairs');
  const starsEl = $('star-rating');
  const restartBtn = $('restart');
  const restartBottom = $('restart-bottom');
  const hintBtn = $('hint');
  const modal = $('modalOverlay');
  const playAgainBtn = $('playAgain');
  const closeModalBtn = $('closeModal');
  const modalStats = $('modalStats');
  const modalTitle = $('modalTitle');
  const modalMessage = $('modalMessage');
  const timerBarFill = $('timerBar');
  const diffControls = $('difficultyControls');
  const openHighScoresBtn = $('openHighScores');
  const highScoresOverlay = $('highScoresOverlay');
  const highScoresContainer = $('highScoresContainer');
  const closeHighScoresBtn = $('closeHighScores');
  const moveLimitToggle = $('move-limit-toggle');
  const moveLimitDisplay = $('move-limit-display');
  const remainingMovesEl = $('remaining-moves');
  const confettiCanvas = $('confettiCanvas');
  const muteBtn = $('mute');
  const leaderboardList = $('leaderboardList');
  const exportBtn = $('exportLb');
  const shareBtn = $('shareLb');
  const clearBtn = $('clearLb');
  const playDemoBtn = $('playDemo');

  // storage keys
  const bestScoreKey = diff => `vt_best_${diff}`;
  const lbKey = diff => `vt_lb_${diff}`;
  const hsKey = 'vt_highscores_v1';

  // state
  let deck = [];
  let opened = [];
  let matched = 0;
  let moves = 0;
  let starCount = 3;
  let locked = false;
  let timerId = null;
  let timeLeft = 0;
  let timeTotal = 60;
  let started = false;
  let pairCount = Math.floor(difficulties[selectedDifficulty].tiles / 2);
  let totalTiles = pairCount * 2;
  let audioCtx = null;
  let isMuted = false;
  let moveLimitEnabled = false;
  let moveLimitMax = 0;
  let remainingMoves = 0;

  // helpers
  const exists = el => !!el;
  const shuffle = a => { for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  const formatTime = (min,sec) => String(min).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  const parseTimeToSeconds = timeStr => {
    if (typeof timeStr !== 'string' || !timeStr.includes(':')) return Infinity;
    const [m,s] = timeStr.split(':').map(n => parseInt(n,10));
    return (Number.isNaN(m) || Number.isNaN(s)) ? Infinity : m*60 + s;
  };

  // High scores (safe)
  function loadHighScores(){
    try {
      const raw = localStorage.getItem(hsKey);
      const base = { easy:{time:null,moves:null,stars:null}, medium:{time:null,moves:null,stars:null}, hard:{time:null,moves:null,stars:null} };
      if (!raw) return base;
      return Object.assign(base, JSON.parse(raw));
    } catch { return { easy:{},medium:{},hard:{} }; }
  }
  function saveHighScores(store){ try{ localStorage.setItem(hsKey, JSON.stringify(store)); }catch{} }

  function isBetterScore(prev, current){
    if (!prev) return true;
    const prevStars = prev.stars ?? -1, curStars = current.stars ?? -1;
    if (curStars > prevStars) return true;
    if (curStars < prevStars) return false;
    const prevMoves = typeof prev.moves === 'number' ? prev.moves : Infinity;
    const curMoves = typeof current.moves === 'number' ? current.moves : Infinity;
    if (curMoves < prevMoves) return true;
    if (curMoves > prevMoves) return false;
    const prevSec = parseTimeToSeconds(prev.time), curSec = parseTimeToSeconds(current.time);
    return curSec < prevSec;
  }

  function compareAndUpdateScores(difficulty, current){
    try {
      const store = loadHighScores();
      const prev = store[difficulty];
      if (isBetterScore(prev, current)) {
        store[difficulty] = { time: current.time, moves: current.moves, stars: current.stars };
        saveHighScores(store);
      }
    } catch {}
  }

  function renderHighScoresTable(){
    if (!exists(highScoresContainer)) return;
    const store = loadHighScores();
    const rows = ['easy','medium','hard'].map(diff => {
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
  function startTimer(){
    if (timerId || !exists(timeEl)) return;
    timerId = setInterval(() => {
      if (timeLeft <= 0) { stopTimer(); onTimeUp(); return; }
      timeLeft--;
      if (exists(timeEl)) timeEl.textContent = formatTime(Math.floor(timeLeft/60), timeLeft%60);
      if (exists(timerBarFill)) {
        const pct = Math.max(0, (timeLeft / timeTotal) * 100);
        timerBarFill.style.width = pct + '%';
      }
    }, 1000);
  }
  function stopTimer(){ if (timerId){ clearInterval(timerId); timerId = null; } }
  function resetTimer(){
    stopTimer();
    pairCount = Math.floor(difficulties[selectedDifficulty].tiles / 2);
    totalTiles = pairCount * 2;
    timeTotal = difficulties[selectedDifficulty].time;
    timeLeft = timeTotal;
    if (exists(timeEl)) timeEl.textContent = formatTime(Math.floor(timeLeft/60), timeLeft%60);
    if (exists(timerBarFill)) timerBarFill.style.width = '100%';
  }

  // audio
  function ensureAudio(){
    if (isMuted) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {}
  }
  function playTone(freq, dur = 0.08){
    try {
      if (isMuted) return;
      ensureAudio();
      if (!audioCtx) return;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = 0.0025 * (dur * 10);
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      setTimeout(()=>{ try{ o.stop(); o.disconnect(); g.disconnect(); }catch{} }, dur*1000);
    } catch {}
  }

  // deck building
  function buildDeck(){
    if (!exists(deckEl)) return;
    deckEl.innerHTML = '';
    const chosen = shuffle(uniqueImages.slice()).slice(0, pairCount);
    deck = shuffle(chosen.concat(chosen));
    deck.forEach((imgSrc, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-index', i);
      card.setAttribute('data-src', imgSrc);
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      const altText = imgSrc.split('.').slice(0,-1).join('.');
      card.setAttribute('aria-label', `Card: ${altText}`);
      card.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-back"><div class="logo">VT</div></div>
          <div class="card-face card-front"><img src="img/${imgSrc}" alt="${altText}"></div>
        </div>`;
      deckEl.appendChild(card);
    });
    showBestScore();
  }

  function showBestScore(){
    if (!exists(document.querySelector)) return;
    const raw = localStorage.getItem(bestScoreKey(selectedDifficulty));
    let el = $('bestScore');
    if (!el){
      const container = document.querySelector('.score-box');
      if (!container) return;
      el = document.createElement('div');
      el.id = 'bestScore';
      el.className = 'label';
      container.appendChild(el);
    }
    if (!raw) { el.textContent = 'Best: —'; return; }
    try {
      const s = JSON.parse(raw);
      el.textContent = `Best: ${s.time} / ${s.moves} moves / ${s.stars}★`;
    } catch { el.textContent = 'Best: —'; }
  }

  // leaderboard utilities
  function getLeaderboard(){ try{ return JSON.parse(localStorage.getItem(lbKey(selectedDifficulty)) || '[]'); }catch{ return []; } }
  function saveLeaderboard(list){ try{ localStorage.setItem(lbKey(selectedDifficulty), JSON.stringify(list)); }catch{} }
  function addScore(entry){
    const list = getLeaderboard();
    list.push(entry);
    list.sort((a,b) => a.moves - b.moves || a.elapsed - b.elapsed);
    const trimmed = list.slice(0,5);
    saveLeaderboard(trimmed);
    renderLeaderboard();
  }
  function renderLeaderboard(){
    if (!exists(leaderboardList)) return;
    const list = getLeaderboard();
    leaderboardList.innerHTML = '';
    if (list.length === 0) { leaderboardList.innerHTML = '<div class="muted-note">No records yet. Play and record a best!</div>'; return; }
    list.forEach((r,i) => {
      const row = document.createElement('div'); row.className = 'lb-row';
      row.innerHTML = `<div>#${i+1} ${r.time} • ${r.moves} moves</div><div>${r.stars}★</div>`;
      leaderboardList.appendChild(row);
    });
  }

  // UI updates
  function updateUI(){
    if (exists(movesEl)) movesEl.textContent = moves;
    if (exists(pairsEl)) pairsEl.textContent = `${matched} / ${totalTiles}`;
    const [threeThresh, twoThresh] = difficulties[selectedDifficulty].stars;
    starCount = (moves <= threeThresh) ? 3 : (moves <= twoThresh ? 2 : 1);
    if (exists(starsEl)) Array.from(starsEl.children).forEach((el,idx)=> el.classList.toggle('star--lost', idx+1 > starCount));
  }

  // reset
  function resetGame(){
    stopTimer();
    resetTimer();
    buildDeck();
    opened = [];
    matched = 0;
    moves = 0;
    starCount = 3;
    updateUI();
    started = false;
    if (exists(hintBtn)) hintBtn.style.display = difficulties[selectedDifficulty].hideHint ? 'none' : '';
    if (exists(deckEl)) Array.from(deckEl.querySelectorAll('.card')).forEach(c => { c.removeAttribute('aria-disabled'); c.classList.remove('matched','is-flip'); });
    locked = false;
    if (moveLimitEnabled) setMoveLimitForDifficulty(selectedDifficulty);
  }

  // move limit
  function setMoveLimitForDifficulty(diff){
    if (!moveLimitEnabled) return;
    const limits = { easy:30, medium:25, hard:20 };
    moveLimitMax = limits[diff] || 0;
    remainingMoves = Math.max(0, moveLimitMax - moves);
    if (exists(remainingMovesEl)) remainingMovesEl.textContent = remainingMoves;
    if (exists(moveLimitDisplay)) moveLimitDisplay.style.display = moveLimitEnabled ? 'block' : 'none';
  }

  // particles for match
  function createMatchParticles(card){
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    for (let i=0;i<12;i++){
      const p = document.createElement('div'); p.className = 'match-particle';
      p.style.left = centerX + 'px'; p.style.top = centerY + 'px';
      const angle = (Math.PI*2*i)/12; const distance = 60 + Math.random()*40;
      const tx = Math.cos(angle)*distance, ty = Math.sin(angle)*distance;
      p.style.setProperty('--tx', tx + 'px'); p.style.setProperty('--ty', ty + 'px');
      document.body.appendChild(p);
      setTimeout(()=>p.remove(),800);
    }
  }

  // card click handler
  function onCardClick(card){
    if (!card || locked) return;
    if (card.classList.contains('is-flip') || card.classList.contains('matched')) return;
    if (!started) { started = true; startTimer(); }
    card.classList.add('is-flip'); playTone(600,0.06);
    opened.push(card);
    if (opened.length < 2) return;
    locked = true;
    moves++;
    if (moveLimitEnabled){
      remainingMoves = moveLimitMax - moves;
      if (exists(remainingMovesEl)) remainingMovesEl.textContent = remainingMoves;
      if (remainingMoves <= 0 && matched < totalTiles){
        if (exists(deckEl)) Array.from(deckEl.querySelectorAll('.card')).forEach(c=>c.setAttribute('aria-disabled','true'));
        stopTimer(); showLoseModal('moves'); return;
      }
    }
    updateUI();
    const [a,b] = opened;
    const srcA = a.getAttribute('data-src'), srcB = b.getAttribute('data-src');
    if (srcA === srcB){
      setTimeout(()=>{
        a.classList.add('matched'); b.classList.add('matched');
        createMatchParticles(a); createMatchParticles(b);
        matched += 2; opened = [];
        playTone(980,0.12); updateUI(); locked = false; checkWin();
      }, 300);
    } else {
      setTimeout(()=>{
        if (!a.classList.contains('matched')) a.classList.remove('is-flip');
        if (!b.classList.contains('matched')) b.classList.remove('is-flip');
        opened = []; locked = false; playTone(220,0.14);
      }, 700);
    }
  }

  // events binding (guarding for missing nodes)
  if (exists(deckEl)){
    deckEl.addEventListener('click', e => {
      const card = e.target.closest('.card');
      if (card) onCardClick(card);
    });
    deckEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const c = e.target.closest('.card');
        if (c) onCardClick(c);
      }
    });
  }

  function checkWin(){
    if (matched === totalTiles){
      stopTimer(); showWinModal();
    }
  }

  // modal stat card
  function statCard(label,val){
    const n = document.createElement('div'); n.className = 'stat-card';
    n.innerHTML = `<div class="label" style="font-size:0.8rem">${label}</div><div style="font-weight:700;color:var(--vault-yellow);margin-top:6px">${val}</div>`;
    return n;
  }

  function showWinModal(){
    if (!exists(modal) || !exists(modalStats) || !exists(modalTitle) || !exists(modalMessage)) return;
    modalTitle.textContent = 'CONGRATULATIONS, Vault Dweller';
    modalMessage.textContent = 'You matched all pairs — Vault-Tec is proud.';
    modalStats.innerHTML = '';
    const elapsed = timeTotal - timeLeft;
    modalStats.appendChild(statCard('Time', formatTime(Math.floor(elapsed/60), elapsed%60)));
    modalStats.appendChild(statCard('Moves', moves));
    modalStats.appendChild(statCard('Stars', `${starCount} / 3`));
    modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false');
    playTone(1200,0.18); fireConfetti();
    // persist
    try {
      const record = { time: formatTime(Math.floor(elapsed/60), elapsed%60), moves, stars:starCount };
      const prev = JSON.parse(localStorage.getItem(bestScoreKey(selectedDifficulty)) || 'null');
      const prevBetter = prev && typeof prev.moves === 'number';
      const better = !prevBetter || (moves < prev.moves) || (moves === prev.moves && elapsed < (prev.elapsed || Infinity));
      if (better) localStorage.setItem(bestScoreKey(selectedDifficulty), JSON.stringify(Object.assign({}, record, { elapsed })));
      compareAndUpdateScores(selectedDifficulty, record);
    } catch {}
    showBestScore();
    try { addScore({ time: formatTime(Math.floor((timeTotal-timeLeft)/60), (timeTotal-timeLeft)%60), moves, stars:starCount, elapsed: timeTotal-timeLeft }); } catch {}
  }

  function showLoseModal(reason){
    if (!exists(modal) || !exists(modalStats) || !exists(modalTitle) || !exists(modalMessage)) return;
    if (reason === 'moves'){
      modalTitle.textContent = "OUT OF MOVES — Vault-Tec Regrets the Loss";
      modalMessage.textContent = 'You ran out of moves. Sharpen your memory and try again.';
    } else {
      modalTitle.textContent = "TIME'S UP — Vault-Tec Regrets the Loss";
      modalMessage.textContent = 'You ran out of time. Review your training and try again.';
    }
    modalStats.innerHTML = '';
    modalStats.appendChild(statCard('Matched', `${matched} / ${totalTiles}`));
    modalStats.appendChild(statCard('Moves', moves));
    modalStats.appendChild(statCard('Stars', `${starCount} / 3`));
    modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false');
  }

  function onTimeUp(){
    if (exists(deckEl)) Array.from(deckEl.querySelectorAll('.card')).forEach(c => c.setAttribute('aria-disabled','true'));
    showLoseModal();
  }

  // hint (safe)
  if (exists(hintBtn)) {
    hintBtn.addEventListener('click', () => {
      const nodes = exists(deckEl) ? Array.from(deckEl.querySelectorAll('.card:not(.matched):not(.is-flip)')) : [];
      if (nodes.length < 2) return;
      const grouped = {};
      nodes.forEach(n => { const s = n.getAttribute('data-src'); (grouped[s] = grouped[s] || []).push(n); });
      const key = Object.keys(grouped).find(k => grouped[k].length >= 2);
      if (!key) return;
      const [c1,c2] = grouped[key];
      c1.classList.add('is-flip'); c2.classList.add('is-flip');
      setTimeout(()=>{ if (c1 && !c1.classList.contains('matched')) c1.classList.remove('is-flip'); if (c2 && !c2.classList.contains('matched')) c2.classList.remove('is-flip'); playTone(440,0.08); }, 900);
    });
  }

  // restart handlers
  if (exists(restartBtn)) restartBtn.addEventListener('click', resetGame);
  if (exists(restartBottom)) restartBottom.addEventListener('click', resetGame);
  if (exists(playAgainBtn)) playAgainBtn.addEventListener('click', () => {
    if (exists(modal)) { modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }
    resetGame();
    if (exists(deckEl)) { const first = deckEl.querySelector('.card'); if (first) first.focus(); }
  });
  if (exists(closeModalBtn)) closeModalBtn.addEventListener('click', () => { if (exists(modal)) { modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); } });

  // mute toggle
  if (exists(muteBtn)) {
    muteBtn.addEventListener('click', async () => {
      isMuted = !isMuted;
      muteBtn.setAttribute('aria-pressed', String(isMuted));
      muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
      try {
        if (isMuted && audioCtx && audioCtx.state !== 'closed') await audioCtx.suspend();
        else if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
      } catch {}
    });
  }

  // confetti
  function fireConfetti(){
    if (!exists(confettiCanvas)) return;
    confettiCanvas.style.display = 'block';
    const ctx = confettiCanvas.getContext('2d');
    const W = confettiCanvas.width = confettiCanvas.clientWidth;
    const H = confettiCanvas.height = confettiCanvas.clientHeight;
    const pieces = [];
    for (let i=0;i<80;i++) pieces.push({ x: Math.random()*W, y: Math.random()*H-H, r: Math.random()*6+4, c: `hsl(${Math.random()*360},70%,60%)`, vx:(Math.random()-0.5)*2, vy:Math.random()*3+2, rot:Math.random()*360 });
    let t = 0;
    function frame(){
      t++; ctx.clearRect(0,0,W,H);
      pieces.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.02; p.rot+=p.vx*4;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r*0.6);
        ctx.restore();
      });
      if (t < 140) requestAnimationFrame(frame); else { ctx.clearRect(0,0,W,H); confettiCanvas.style.display = 'none'; }
    }
    requestAnimationFrame(frame);
  }

  // difficulty control
  if (!exists(diffControls)) console.warn('difficultyControls not found — difficulty buttons disabled');
  else {
    diffControls.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-diff]');
      if (!b) return;
      selectedDifficulty = b.getAttribute('data-diff') || 'medium';
      Array.from(diffControls.querySelectorAll('button[data-diff]')).forEach(btn=>btn.classList.remove('btn--active'));
      b.classList.add('btn--active');
      pairCount = Math.floor(difficulties[selectedDifficulty].tiles / 2);
      totalTiles = pairCount * 2;
      resetGame();
      renderLeaderboard();
    });
  }

  // trap focus inside modal
  function trapFocus(e){
    if (!exists(modal) || modal.style.display !== 'flex') return;
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length-1];
    if (e.key === 'Tab'){
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener('keydown', trapFocus);

  // export/share/clear leaderboard
  if (exists(exportBtn)) exportBtn.addEventListener('click', () => {
    try {
      const data = getLeaderboard();
      const blob = new Blob([JSON.stringify({ difficulty: selectedDifficulty, data }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `vault-memory-leaderboard-${selectedDifficulty}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { alert('Could not export leaderboard.'); }
  });

  if (exists(shareBtn)) shareBtn.addEventListener('click', async () => {
    try {
      const data = getLeaderboard();
      if (!data.length) return alert('No leaderboard entries to share.');
      const top = data[0];
      const text = `Vault-Tec Memory — ${selectedDifficulty.toUpperCase()} best: ${top.time}, ${top.moves} moves, ${top.stars}★`;
      await navigator.clipboard.writeText(text);
      alert('Summary copied to clipboard: ' + text);
    } catch { alert('Could not copy to clipboard.'); }
  });

  if (exists(clearBtn)) clearBtn.addEventListener('click', () => {
    if (!confirm('Clear leaderboard for ' + selectedDifficulty + '?')) return;
    localStorage.removeItem(lbKey(selectedDifficulty)); renderLeaderboard();
  });

  // high scores overlay
  if (exists(openHighScoresBtn)) openHighScoresBtn.addEventListener('click', () => {
    renderHighScoresTable();
    if (exists(highScoresOverlay)) { highScoresOverlay.style.display = 'flex'; highScoresOverlay.setAttribute('aria-hidden','false'); }
  });
  if (exists(closeHighScoresBtn)) closeHighScoresBtn.addEventListener('click', () => {
    if (exists(highScoresOverlay)) { highScoresOverlay.style.display = 'none'; highScoresOverlay.setAttribute('aria-hidden','true'); }
  });

  // in-page demo (safe)
  async function playDemo(){
    if (!exists(playDemoBtn) || !exists(deckEl)) return;
    playDemoBtn.disabled = true; locked = true;
    resetGame(); await new Promise(r=>setTimeout(r,400));
    const cards = Array.from(deckEl.querySelectorAll('.card'));
    for (let i=0;i<6 && i<cards.length;i++){
      const c = cards[Math.floor(Math.random()*cards.length)];
      c.focus(); c.click(); await new Promise(r=>setTimeout(r,350));
    }
    if (exists(hintBtn) && hintBtn.style.display !== 'none'){ hintBtn.click(); await new Promise(r=>setTimeout(r,900)); }
    const hardBtn = diffControls ? diffControls.querySelector('button[data-diff="hard"]') : null;
    const medBtn = diffControls ? diffControls.querySelector('button[data-diff="medium"]') : null;
    if (hardBtn){ hardBtn.click(); await new Promise(r=>setTimeout(r,600)); }
    if (medBtn){ medBtn.click(); await new Promise(r=>setTimeout(r,600)); }
    const mapping = {};
    Array.from(deckEl.querySelectorAll('.card')).forEach(el => { const s = el.getAttribute('data-src'); (mapping[s]=mapping[s]||[]).push(el); });
    for (const key of Object.keys(mapping)){
      const pair = mapping[key];
      if (pair.length >= 2){ pair[0].click(); await new Promise(r=>setTimeout(r,120)); pair[1].click(); await new Promise(r=>setTimeout(r,220)); }
    }
    await new Promise(r=>setTimeout(r,900));
    if (exists(playAgainBtn)) playAgainBtn.click();
    playDemoBtn.disabled = false; locked = false;
  }
  if (exists(playDemoBtn)) playDemoBtn.addEventListener('click', () => playDemo());

  // keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && exists(modal) && modal.style.display === 'flex') { modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }
    if (e.key.toLowerCase() === 'r') { resetGame(); }
    if (e.key.toLowerCase() === 'h' && exists(hintBtn) && hintBtn.style.display !== 'none') { hintBtn.click(); }
  });

  // leaderboard helpers used above (safe wrappers)
  function getLeaderboard(){ try{ return JSON.parse(localStorage.getItem(lbKey(selectedDifficulty)) || '[]'); }catch{return [];} }
  function saveLeaderboard(list){ try{ localStorage.setItem(lbKey(selectedDifficulty), JSON.stringify(list)); }catch{} }
  function renderLeaderboard(){ if (exists(leaderboardList)) { renderLeaderboardInner(); } }
  function renderLeaderboardInner(){
    const list = getLeaderboard();
    if (!exists(leaderboardList)) return;
    leaderboardList.innerHTML = '';
    if (!list.length) { leaderboardList.innerHTML = '<div class="muted-note">No records yet. Play and record a best!</div>'; return; }
    list.forEach((r,i) => {
      const row = document.createElement('div'); row.className = 'lb-row';
      row.innerHTML = `<div>#${i+1} ${r.time} • ${r.moves} moves</div><div>${r.stars}★</div>`;
      leaderboardList.appendChild(row);
    });
  }

  // init move limit toggle if present
  if (exists(moveLimitToggle)){
    moveLimitEnabled = moveLimitToggle.checked;
    moveLimitToggle.addEventListener('change', () => {
      moveLimitEnabled = moveLimitToggle.checked;
      if (exists(moveLimitDisplay)) moveLimitDisplay.style.display = moveLimitEnabled ? 'block' : 'none';
      setMoveLimitForDifficulty(selectedDifficulty);
    });
  } else {
    moveLimitEnabled = false;
  }

  // init export / share / clear already wired above

  // ensure modal close on ESC handled earlier; trap focus too

  // start
  resetGame();
  renderLeaderboard();
  renderHighScoresTable();

})();
