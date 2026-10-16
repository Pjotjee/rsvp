(async () => {
  const id = 'novel-rsvp-reader';
  const previous = document.getElementById(id);
  if (previous) { previous.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const selection = window.getSelection()?.toString().trim();
  const selectors = ['#chr-content', '#chapter-content', '.chr-c', '.chapter-content', '.chapter_content', '#chaptercontent', '#content .text', '.reading-content'];
  const candidates = selectors.flatMap(s => [...document.querySelectorAll(s)]).filter(e => e.innerText.trim().length > 200);
  // Fallback for unknown sites: score blocks by the amount of prose they contain and pick the densest one.
  function findMainText() {
    const scores = new Map();
    const credit = (el, points) => { if (el && el !== document.documentElement) scores.set(el, (scores.get(el) || 0) + points); };
    document.body.querySelectorAll('p,div,td,pre,section').forEach(el => {
      if (el.closest('nav,header,footer,aside,form,[hidden],[aria-hidden="true"]') || !el.getClientRects().length) return;
      if (el.tagName === 'P') {
        const length = el.textContent.trim().length;
        if (length < 25) return;
        credit(el.parentElement, length); credit(el.parentElement?.parentElement, length / 2);
      } else {
        // Many novel sites put text directly in a div, separated by <br>.
        const length = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).reduce((sum, n) => sum + n.textContent.trim().length, 0);
        if (length < 25) return;
        credit(el, length); credit(el.parentElement, length / 2);
      }
    });
    const unlikely = /comment|sidebar|footer|header|nav|menu|related|share|social|promo|widget|breadcrumb|recommend|\bads?\b/i;
    let best = null, bestScore = 300;
    scores.forEach((score, el) => {
      const total = el.textContent.length || 1;
      const linked = [...el.querySelectorAll('a')].reduce((sum, a) => sum + a.textContent.length, 0);
      score *= 1 - Math.min(1, linked / total);
      if (unlikely.test(el.id + ' ' + el.className)) score *= 0.3;
      if (score > bestScore) { best = el; bestScore = score; }
    });
    return best;
  }
  const source = candidates[0] || findMainText() || [...document.querySelectorAll('article,main')].find(e => e.innerText.trim().length > 200);
  function extract(element) {
    const copy = element.cloneNode(true);
    copy.querySelectorAll('script,style,nav,header,footer,button,select,textarea,input,iframe,aside,ins,[hidden],.ads,.advertisement').forEach(e => e.remove());
    copy.querySelectorAll('p,div,br,h1,h2,h3,h4').forEach(e => { e.append('\n\n'); });
    return copy.textContent.trim();
  }
  let text = selection || (source ? extract(source) : '');
  const host = document.createElement('section'); host.id = id;
  host.style.cssText = 'display:block!important;position:relative!important;z-index:2147483646!important;margin:20px auto!important;max-width:960px!important;scroll-margin-top:16px!important;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host{color-scheme:dark}*{box-sizing:border-box}section{background:#142324;color:#eeeedd;border:1px solid #385052;border-radius:18px;padding:24px;font:15px/1.5 system-ui;box-shadow:0 12px 40px #0003}header,.controls,.meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap}header{justify-content:space-between}h2{font-size:20px;margin:0}small,.meta{color:#b5c4bf}button,select,textarea,input{font:inherit}button,select{border:1px solid #52706a;border-radius:8px;padding:9px 13px;background:#243b3a;color:#f2f1e8;cursor:pointer}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #e8bd78;outline-offset:3px}#play{background:#b8e8ca;color:#142324;min-width:105px}#stage{position:relative;overflow:hidden;height:146px;display:flex;align-items:center;font:clamp(24px,5vw,44px)/1.3 ui-monospace,Consolas,monospace;margin:14px 0;border-block:1px solid #385052}#stage:before,#stage:after{content:'';position:absolute;left:50%;width:1px;height:13px;background:#e8bd78}#stage:before{top:0}#stage:after{bottom:0}#word{position:absolute;white-space:pre}#word b{color:#e8bd78;font-weight:inherit}#context{min-height:3em;color:#bdccc6;font-size:14px;margin:14px 0}#seek{width:100%;accent-color:#b8e8ca}#speed{width:110px;accent-color:#b8e8ca}.meta{justify-content:space-between;margin:8px 0}textarea{width:100%;min-height:130px;background:#0c191a;color:#eeeedd;border:1px solid #52706a;border-radius:8px;padding:10px;margin:10px 0}details{margin-top:16px}summary{cursor:pointer}#notice{color:#e8bd78}label{display:inline-flex;gap:7px;align-items:center}#paragraph{max-width:100%}@media(max-width:600px){section{padding:16px}.controls{gap:8px}}
    </style><section aria-label="RSVP reader"><header><div><h2>Novel RSVP</h2><small>One word. One fixed focal point. Your pace.</small></div><button id="close" aria-label="Close reader">Close ×</button></header>
    <div id="stage" aria-label="Current word"><span id="word"></span></div><div class="controls"><button id="back" aria-label="Ten words back">−10</button><button id="play">Start</button><button id="forward" aria-label="Ten words forward">+10</button><label>Speed <input id="speed" type="range" min="100" max="700" step="10" value="250"><span id="wpm">250</span> wpm</label><label><input id="pauses" type="checkbox" checked> Natural pauses</label></div>
    <p id="context"></p><input id="seek" type="range" min="0" max="0" value="0" aria-label="Reading position"><div class="meta"><span id="progress"></span><span id="remaining"></span></div>
    <label>Start at paragraph <select id="paragraph" aria-label="Start at paragraph"></select></label><p id="notice" role="status"></p>
    <details><summary>Check text or paste your own</summary><p>This is the detected text. Edit it if menus or other text got mixed in. Applying restarts the reader.</p><textarea id="text" aria-label="Text to read" spellcheck="false"></textarea><button id="apply">Apply text</button></details><small>Space: start/pause · ←/→: 10 words · Shortcuts work when the reader has focus. The reader pauses when the tab is hidden.</small></section>`;
  if (source && !selection) source.before(host); else document.body.prepend(host);
  const $ = s => root.querySelector(s);
  let tokens = [], paragraphs = [], index = 0, timer = null, playing = false, destroyed = false;
  let saveTimer;
  const key = 'position:' + location.origin + location.pathname + location.search + (selection ? ':selection' : '');
  function signature(value) { let hash = 2166136261; for (let i=0;i<value.length;i++) hash = Math.imul(hash ^ value.charCodeAt(i),16777619); return String(hash>>>0); }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => chrome.storage.local.set({ [key]: { index, signature: signature(text) }, settings: { speed: Number($('#speed').value), pauses: $('#pauses').checked } }).catch(() => {}), 250);
  }
  function load(value) {
    text = value.trim(); tokens = []; paragraphs = [];
    text.split(/\n\s*\n|\r?\n/).map(p => p.trim()).filter(Boolean).forEach(p => {
      const start = tokens.length; const words = p.split(/\s+/);
      paragraphs.push({ start, text: p });
      words.forEach((word, j) => tokens.push({ word, paragraph: paragraphs.length-1, end: j===words.length-1 }));
    });
    $('#text').value = text; $('#paragraph').replaceChildren();
    paragraphs.forEach((p,i) => { const option = document.createElement('option'); option.value = p.start; option.textContent = `${i+1}. ${p.text.slice(0,65)}`; $('#paragraph').append(option); });
    index=0; $('#seek').max = Math.max(0,tokens.length-1); render();
    $('#notice').textContent = tokens.length ? (selection ? 'Selected text loaded.' : 'Main text detected. Press Start or Space to begin.') : 'No chapter text detected. Select text on the page and open again, or paste text below.';
    if (!tokens.length) $('details').open = true;
  }
  function render() {
    const token=tokens[index]; const word=token?.word || 'Paste text'; const chars=Array.from(word);
    const focus=Math.min(chars.length-1, chars.length<=2?0:chars.length<=5?1:chars.length<=9?2:3);
    const before=document.createElement('span'); before.textContent=chars.slice(0,focus).join('');
    const center=document.createElement('b'); center.textContent=chars[focus];
    const after=document.createElement('span'); after.textContent=chars.slice(focus+1).join('');
    $('#word').replaceChildren(before,center,after);
    $('#word').style.left=`calc(50% - ${focus+0.5}ch)`;
    $('#seek').value=index;
    $('#progress').textContent=tokens.length?`${index+1} / ${tokens.length} words · ${Math.round((index+1)/tokens.length*100)}%`:'No text yet';
    $('#remaining').textContent=`± ${Math.ceil((tokens.length-index)/Number($('#speed').value))} min remaining`;
    $('#context').textContent=token ? tokens.slice(Math.max(paragraphs[token.paragraph].start,index-7),Math.min(tokens.length,index+9)).map(t=>t.word).join(' ') : '';
    if(token) $('#paragraph').value=paragraphs[token.paragraph].start;
    $('#play').disabled=!tokens.length;
  }
  function stop() { playing=false;clearTimeout(timer);$('#play').textContent='Start';persist(); }
  function delay() {
    const t=tokens[index]; let factor=1;
    if($('#pauses').checked && t) {
      if(/[.!?…][”’"')\]]*$/.test(t.word)) factor=2.3;
      else if(/[,;:—][”’"')\]]*$/.test(t.word)) factor=1.5;
      if(t.end) factor=Math.max(factor,2.8);
      if(t.word.length>10) factor+=0.25;
    }
    return 60000/Number($('#speed').value)*factor;
  }
  function tick() { timer=setTimeout(()=>{if(!playing)return;if(index>=tokens.length-1){stop();$('#notice').textContent='Chapter finished. You can start again or go to the next chapter.';return;}index++;render();if(index%10===0)persist();tick();},delay()); }
  function toggle() { if(playing){stop();return;}if(!tokens.length)return;if(index===tokens.length-1)index=0;playing=true;$('#play').textContent='Pause';$('#notice').textContent='';render();tick(); }
  function jump(n) { stop();index=Math.max(0,Math.min(tokens.length-1,n));render();persist(); }
  $('#play').onclick=toggle;$('#back').onclick=()=>jump(index-10);$('#forward').onclick=()=>jump(index+10);
  $('#seek').oninput=e=>jump(Number(e.target.value));$('#paragraph').onchange=e=>jump(Number(e.target.value));
  $('#speed').oninput=()=>{$('#wpm').textContent=$('#speed').value;render();persist();};$('#pauses').onchange=persist;
  $('#apply').onclick=()=>{stop();load($('#text').value);persist();};
  root.addEventListener('keydown',e=>{if(e.target.matches('textarea,input,select')||e.altKey||e.ctrlKey||e.metaKey)return;if(e.code==='Space'){e.preventDefault();toggle();}else if(e.code==='ArrowLeft'){e.preventDefault();jump(index-10);}else if(e.code==='ArrowRight'){e.preventDefault();jump(index+10);}});
  function hidden(){if(document.hidden)stop();}
  function unload(){stop();}
  document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',unload);
  $('#close').onclick=()=>{stop();destroyed=true;document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',unload);host.remove();};
  load(text);
  try {
    const saved=await chrome.storage.local.get([key,'settings']);
    if(destroyed)return;
    if(saved.settings){$('#speed').value=Math.max(100,Math.min(700,Number(saved.settings.speed)||250));$('#wpm').textContent=$('#speed').value;$('#pauses').checked=saved.settings.pauses!==false;}
    if(saved[key]?.signature===signature(text)){index=Math.max(0,Math.min(tokens.length-1,saved[key].index||0));if(index>0)$('#notice').textContent='Your previous reading position has been restored.';}
    render();
  } catch {}
  host.scrollIntoView({ behavior:'smooth',block:'start' });$('#play').focus({preventScroll:true});
})();
