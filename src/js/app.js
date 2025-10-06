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
  let timerId = null;
  let timeLeft = 0;
  let timeTotal = 60;
  let started = false;
  let pairCount = Math.floor(difficulties[selectedDifficulty].tiles / 2);
  let totalTiles = pairCount * 2;

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
      li.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-back"><div class="logo">VT</div></div>
          <div class="card-face card-front"><img src="img/${imgSrc}" alt=""></div>
        </div>`;
      deckEl.appendChild(li);
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
    Array.from(deckEl.querySelectorAll('.card')).forEach(c => c.removeAttribute('aria-disabled'));
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

  function onCardClick(card){
    if(card.classList.contains('is-flip') || card.classList.contains('matched')) return;
    if(!started){ started = true; startTimer(); }
    card.classList.add('is-flip');
    opened.push(card);
    if(opened.length === 2){
      moves++;
      updateUI();
      const [a,b] = opened;
      const srcA = a.getAttribute('data-src'), srcB = b.getAttribute('data-src');
      if(srcA === srcB){
        a.classList.add('matched'); b.classList.add('matched');
        // Trigger particle effects on match
        createMatchParticles(a);
        createMatchParticles(b);
        matched += 2;
        opened = [];
        updateUI();
        checkWin();
      } else {
        setTimeout(()=>{ a.classList.remove('is-flip'); b.classList.remove('is-flip'); opened = []; }, 700);
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
    setTimeout(()=>{ c1.classList.remove('is-flip'); c2.classList.remove('is-flip'); }, 900);
  });

  // restart & modal handlers
  restartBtn.addEventListener('click', resetGame);
  restartBottom.addEventListener('click', resetGame);
  playAgainBtn.addEventListener('click', ()=>{
    modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); resetGame();
  });
  closeModalBtn.addEventListener('click', ()=>{ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); });

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
  });

  // init
  resetGame();

  // accessibility: close modal on ESC
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && modal.style.display === 'flex'){ modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }
  });
})();