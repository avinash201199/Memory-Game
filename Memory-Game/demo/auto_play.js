(async ()=>{
  const puppeteer = require('puppeteer');
  const path = require('path');
  const serveUrl = 'http://localhost:8081/index.html';

  const browser = await puppeteer.launch({ headless: false, defaultViewport: {width:1280, height:800}, args:['--start-maximized']});
  const [page] = await browser.pages();
  await page.goto(serveUrl);
  await page.waitForTimeout(1200);

  // play a few flips
  for(let i=0;i<6;i++){
    const cards = await page.$$('.card');
    if(cards.length < 2) break;
    await cards[Math.floor(Math.random()*cards.length)].click();
    await page.waitForTimeout(350);
  }

  // toggle hint
  try{ await page.click('#hint'); }catch(e){}
  await page.waitForTimeout(900);

  // change difficulty
  try{ await page.click('button[data-diff="hard"]'); }catch(e){}
  await page.waitForTimeout(800);

  // restart
  try{ await page.click('#restart-bottom'); }catch(e){}
  await page.waitForTimeout(800);

  // show modal by forcing a win if we can (flip all matching pairs quickly)
  // this is best-effort and non-blocking
  try{
    const imgs = await page.$$eval('.card', els => els.map(e => e.getAttribute('data-src')));
    const pairs = {};
    imgs.forEach((s, idx) => { (pairs[s]=pairs[s]||[]).push(idx) });
    for(const k in pairs){ const p = pairs[k]; if(p.length>=2){ await page.click(`.card[data-index="${p[0]}"]`); await page.waitForTimeout(80); await page.click(`.card[data-index="${p[1]}"]`); await page.waitForTimeout(120); } }
  }catch(e){}

  await page.waitForTimeout(1200);
  // leave the browser open a bit so ffmpeg grabs it
  await page.waitForTimeout(3500);
  await browser.close();
})();
