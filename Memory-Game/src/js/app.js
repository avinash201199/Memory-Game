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
    'Agility.png','Boat.png','Citizenship.png','Hack.png',
    'Nerd-Rage.png','Nuka-Cola.png','Robotics.png','Shock.png'
  ];

  const difficulties = {
    easy:   { tiles: 12, time: 60, hideHint: false, stars: [10, 16] },   // 3 stars <=10 moves, 2 <=16 else 1
    medium: { tiles: 16, time: 60, hideHint: false, stars: [12, 18] },
    hard:   { tiles: 16, time: 45, hideHint: true,  stars: [10, 15] }
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
  const leaderboardList = document.getElementById('leaderboardList');
  const exportBtn = document.getElementById('exportLb');
  const shareBtn = document.getElementById('shareLb');
  const clearBtn = document.getElementById('clearLb');
  let audioCtx = null;
  let isMuted = false;

  // util
  function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a }
  function formatTime(min, sec){ return (min).toString().padStart(2,'0') + ':' + (sec).toString().padStart(2,'0') }

  // timer
  function startTimer(){
    if(timerId) return;
    timerId = setInterval(()=> {
      if(timeLeft <= 0){ stopTimer(); onTimeUp(); return; }
      timeLeft--;
      timeEl.textContent = formatTime(Math.floor(timeLeft/60), timeLeft%60);
      const pct = Math.max(0, (timeLeft / timeTotal) * 100);
      timerBarFill.style.width = pct + '%';
    }, 1000);
  }
  function stopTimer(){ if(timerId){ clearInterval(timerId); timerId = null } }
  function resetTimer(){
    stopTimer();
    pairCount = Math.floor(difficulties[selectedDifficulty].tiles / 2);
    totalTiles = pairCount * 2;
    timeTotal = difficulties[selectedDifficulty].time;
    timeLeft = timeTotal;
    timeEl.textContent = formatTime(Math.floor(timeLeft/60), timeLeft%60);
    timerBarFill.style.width = '100%';
  }

  // audio helpers (small tones using WebAudio)
  function ensureAudio(){
    if(isMuted) return;
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  function playTone(freq, dur=0.08){
    try{
      if(isMuted) return;
      ensureAudio();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = 0.0025 * (dur*10);
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      setTimeout(()=>{ o.stop(); o.disconnect(); g.disconnect(); }, dur*1000);
    }catch(e){ /* ignore audio errors */ }
  }

  // deck
  function buildDeck(){
    deckEl.innerHTML = '';
    const chosen = shuffle(uniqueImages.slice()).slice(0, pairCount);
    deck = shuffle(chosen.concat(chosen));
    deck.forEach((imgSrc, i) => {
      const li = document.createElement('div');
      li.className = 'card';
      li.setAttribute('data-index', i);
      li.setAttribute('data-src', imgSrc);
      li.setAttribute('role','button');
      li.setAttribute('tabindex','0');
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

  function showBestScore(){
    const raw = localStorage.getItem(bestScoreKey(selectedDifficulty));
    // create or update a small element in the panel
    let el = document.getElementById('bestScore');
    if(!el){
      el = document.createElement('div');
      el.id = 'bestScore';
      el.className = 'label';
      const container = document.querySelector('.score-box');
      container.appendChild(el);
    }
    if(!raw){ el.textContent = 'Best: —'; return; }
    try{
      const s = JSON.parse(raw);
      el.textContent = `Best: ${s.time} / ${s.moves} moves / ${s.stars}★`;
    }catch(e){ el.textContent = 'Best: —'; }
  }

  // leaderboard helpers (top 5)
  function getLeaderboard(){
    try{ return JSON.parse(localStorage.getItem(lbKey(selectedDifficulty)) || '[]'); }catch(e){ return []; }
  }
  function saveLeaderboard(list){ localStorage.setItem(lbKey(selectedDifficulty), JSON.stringify(list)); }
  function addScore(entry){
    const list = getLeaderboard();
    list.push(entry);
    // sort by moves asc, then time asc (elapsed seconds)
    list.sort((a,b)=> a.moves - b.moves || a.elapsed - b.elapsed);
    const trimmed = list.slice(0,5);
    saveLeaderboard(trimmed);
    renderLeaderboard();
  }
  function renderLeaderboard(){
    const list = getLeaderboard();
    if(!leaderboardList) return;
    leaderboardList.innerHTML = '';
    if(list.length === 0){ leaderboardList.innerHTML = '<div class="muted-note">No records yet. Play and record a best!</div>'; return; }
    list.forEach((r, i)=>{
      const row = document.createElement('div'); row.className = 'lb-row';
      row.innerHTML = `<div>#${i+1} ${r.time} • ${r.moves} moves</div><div>${r.stars}★</div>`;
      leaderboardList.appendChild(row);
    });
  }

  function updateUI(){
    movesEl.textContent = moves;
    pairsEl.textContent = `${matched} / ${totalTiles}`;
    // star logic per difficulty thresholds
    const [threeThresh, twoThresh] = difficulties[selectedDifficulty].stars;
    if(moves <= threeThresh) starCount = 3;
    else if(moves <= twoThresh) starCount = 2;
    else starCount = 1;
    Array.from(starsEl.children).forEach((el, idx) => {
      el.classList.toggle('star--lost', idx+1 > starCount);
    });
  }

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
    // enable hint based on difficulty
    hintBtn.style.display = difficulties[selectedDifficulty].hideHint ? 'none' : '';
    // ensure cards are interactive
    Array.from(deckEl.querySelectorAll('.card')).forEach(c => { c.removeAttribute('aria-disabled'); c.classList.remove('matched','is-flip'); });
    locked = false;
  }

  // card interactions
  deckEl.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if(!card) return;
    onCardClick(card);
  });

  deckEl.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' '){
      const c = e.target.closest('.card');
      if(c) onCardClick(c);
    }
  });

  function onCardClick(card){
    if(locked) return;
    if(card.classList.contains('is-flip') || card.classList.contains('matched')) return;
    if(!started){ started = true; startTimer(); }
    card.classList.add('is-flip');
    playTone(600, 0.06);
    opened.push(card);
    if(opened.length === 2){
      // prevent more interactions while resolving
      locked = true;
      moves++;
      updateUI();
      const [a,b] = opened;
      const srcA = a.getAttribute('data-src'), srcB = b.getAttribute('data-src');
      if(srcA === srcB){
        a.classList.add('matched'); b.classList.add('matched');
        matched += 2;
        opened = [];
        playTone(980, 0.12);
        updateUI();
        locked = false;
        checkWin();
      } else {
        setTimeout(()=>{ a.classList.remove('is-flip'); b.classList.remove('is-flip'); opened = []; locked = false; playTone(220,0.14); }, 700);
      }
    }
  }

  function checkWin(){
    if(matched === totalTiles){
      stopTimer();
      showWinModal();
    }
  }

  // modal variants
  function statCard(label, val){
    const n = document.createElement('div'); n.className = 'stat-card';
    n.innerHTML = `<div class="label" style="font-size:0.8rem">${label}</div><div style="font-weight:700;color:var(--vault-yellow);margin-top:6px">${val}</div>`;
    return n;
  }

  function showWinModal(){
    modalTitle.textContent = 'CONGRATULATIONS, Vault Dweller';
    modalMessage.textContent = 'You matched all pairs — Vault‑Tec is proud.';
    modalStats.innerHTML = '';
    const elapsed = timeTotal - timeLeft;
    modalStats.appendChild(statCard('Time', formatTime(Math.floor(elapsed/60), elapsed%60)));
    modalStats.appendChild(statCard('Moves', moves));
    modalStats.appendChild(statCard('Stars', `${starCount} / 3`));
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden','false');
    // play win tone and confetti
    playTone(1200,0.18);
    fireConfetti();
    // persist best score
    try{
      const prev = JSON.parse(localStorage.getItem(bestScoreKey(selectedDifficulty)) || 'null');
      const record = { time: formatTime(Math.floor(elapsed/60), elapsed%60), moves, stars: starCount };
      const better = !prev || (moves < prev.moves) || (moves === prev.moves && elapsed < (prev.elapsed||Infinity));
      if(better) localStorage.setItem(bestScoreKey(selectedDifficulty), JSON.stringify(Object.assign({}, record, { elapsed })));
    }catch(e){/* ignore */}
    showBestScore();
    // add to leaderboard
    try{
      addScore({ time: formatTime(Math.floor(elapsed/60), elapsed%60), moves, stars: starCount, elapsed });
    }catch(e){}
  }

  function showLoseModal(){
    modalTitle.textContent = "TIME'S UP — Vault‑Tec Regrets the Loss";
    modalMessage.textContent = 'You ran out of time. Review your training and try again.';
    modalStats.innerHTML = '';
    modalStats.appendChild(statCard('Matched', `${matched} / ${totalTiles}`));
    modalStats.appendChild(statCard('Moves', moves));
    modalStats.appendChild(statCard('Stars', `${starCount} / 3`));
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden','false');
  }

  function onTimeUp(){
    // disable further card clicks
    Array.from(deckEl.querySelectorAll('.card')).forEach(c => c.setAttribute('aria-disabled','true'));
    showLoseModal();
  }

  // hint
  hintBtn.addEventListener('click', ()=>{
    const nodes = Array.from(deckEl.querySelectorAll('.card:not(.matched):not(.is-flip)'));
    if(nodes.length < 2) return;
    const grouped = {};
    nodes.forEach(n=>{ const s = n.getAttribute('data-src'); (grouped[s] = grouped[s]||[]).push(n) });
    const key = Object.keys(grouped).find(k=>grouped[k].length >= 2);
    if(!key) return;
    const [c1,c2] = grouped[key];
    c1.classList.add('is-flip'); c2.classList.add('is-flip');
    setTimeout(()=>{ c1.classList.remove('is-flip'); c2.classList.remove('is-flip'); playTone(440,0.08); }, 900);
  });

  // restart & modal handlers
  restartBtn.addEventListener('click', resetGame);
  restartBottom.addEventListener('click', resetGame);
  playAgainBtn.addEventListener('click', ()=>{
    modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); resetGame();
    // return focus to deck
    const first = deckEl.querySelector('.card'); if(first) first.focus();
  });
  closeModalBtn.addEventListener('click', ()=>{ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); });

  // mute toggle
  muteBtn.addEventListener('click', ()=>{
    isMuted = !isMuted;
    muteBtn.setAttribute('aria-pressed', String(isMuted));
    muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    if(isMuted && audioCtx && audioCtx.state !== 'closed'){
      try{ audioCtx.suspend(); }catch(e){}
    } else if(audioCtx){ try{ audioCtx.resume(); }catch(e){} }
  });

  // confetti implementation (small)
  function fireConfetti(){
    if(!confettiCanvas) return;
    confettiCanvas.style.display = 'block';
    const ctx = confettiCanvas.getContext('2d');
    const W = confettiCanvas.width = confettiCanvas.clientWidth;
    const H = confettiCanvas.height = confettiCanvas.clientHeight;
    const pieces = [];
    for(let i=0;i<80;i++){ pieces.push({x:Math.random()*W,y:Math.random()*H- H, r: Math.random()*6+4, c: `hsl(${Math.random()*360},70%,60%)`, vx:(Math.random()-0.5)*2, vy: Math.random()*3+2, rot:Math.random()*360}); }
    let t=0;
    function frame(){
      t++; ctx.clearRect(0,0,W,H);
      pieces.forEach(p=>{
        p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.rot += p.vx*4;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.6);
        ctx.restore();
      });
      if(t < 140) requestAnimationFrame(frame); else { ctx.clearRect(0,0,W,H); confettiCanvas.style.display='none'; }
    }
    requestAnimationFrame(frame);
  }

  // difficulty control
  diffControls.addEventListener('click', (e)=>{
    const b = e.target.closest('button[data-diff]');
    if(!b) return;
    selectedDifficulty = b.getAttribute('data-diff');
    Array.from(diffControls.querySelectorAll('button[data-diff]')).forEach(btn=>btn.classList.remove('btn--active'));
    b.classList.add('btn--active');
    // apply and reset
    pairCount = Math.floor(difficulties[selectedDifficulty].tiles / 2);
    totalTiles = pairCount * 2;
    resetGame();
    renderLeaderboard();
  });

  // modal accessibility: trap focus inside modal when open
  function trapFocus(e){
    if(modal.style.display !== 'flex') return;
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if(!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length-1];
    if(e.key === 'Tab'){
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener('keydown', trapFocus);

  // export/share/clear leaderboard
  if(exportBtn) exportBtn.addEventListener('click', ()=>{
    const data = getLeaderboard();
    const blob = new Blob([JSON.stringify({ difficulty: selectedDifficulty, data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `vault-memory-leaderboard-${selectedDifficulty}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
  if(shareBtn) shareBtn.addEventListener('click', async ()=>{
    const data = getLeaderboard();
    if(data.length === 0) return alert('No leaderboard entries to share.');
    const top = data[0];
    const text = `Vault‑Tec Memory — ${selectedDifficulty.toUpperCase()} best: ${top.time}, ${top.moves} moves, ${top.stars}★`;
    try{
      await navigator.clipboard.writeText(text);
      alert('Summary copied to clipboard: ' + text);
    }catch(e){ alert('Could not copy to clipboard.'); }
  });
  if(clearBtn) clearBtn.addEventListener('click', ()=>{
    if(!confirm('Clear leaderboard for ' + selectedDifficulty + '?')) return;
    localStorage.removeItem(lbKey(selectedDifficulty)); renderLeaderboard();
  });

  // init
  resetGame();
  renderLeaderboard();

  // accessibility: close modal on ESC
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && modal.style.display === 'flex'){ modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }
  });
})();