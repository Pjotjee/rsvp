(async () => {
  const id = 'novel-rsvp-reader';
  const previous = document.getElementById(id);
  if (previous) { previous.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (window.novelRsvpOpening) return;
  window.novelRsvpOpening = true;
  const skip = 'script,style,noscript,template,nav,header,footer,button,select,textarea,input,iframe,aside,ins,svg,[hidden],[aria-hidden="true"],.ads,.advertisement';
  const blockTags = /^(P|DIV|SECTION|ARTICLE|MAIN|H[1-6]|LI|UL|OL|DL|DT|DD|BLOCKQUOTE|PRE|TABLE|TR|TD|TH|FIGURE|FIGCAPTION|HR|BR)$/;
  const maxPositions = 200;
  const clamp = (min, max, value) => Math.max(min, Math.min(max, value));
  const pageSelection = window.getSelection();
  const selection = pageSelection?.toString().trim();
  const selectionNode = selection ? pageSelection.getRangeAt(0).startContainer : null;
  const selectors = ['#chr-content', '#chapter-content', '.chr-c', '.chapter-content', '.chapter_content', '#chaptercontent', '#content .text', '.reading-content'];
  const known = selectors.flatMap(s => [...document.querySelectorAll(s)]).find(e => e.innerText.trim().length > 200);

  // Mozilla Readability works on a copy of the page; remember which live text node each copied one came from,
  // so words can still be highlighted and double-clicked on the real page.
  function readable() {
    if (typeof Readability !== 'function') return null;
    try {
      const copy = document.cloneNode(true), live = new Map();
      const original = document.createTreeWalker(document, NodeFilter.SHOW_TEXT), copied = copy.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
      while (original.nextNode() && copied.nextNode()) live.set(copied.currentNode, original.currentNode);
      const article = new Readability(copy, { serializer: el => el }).parse();
      return article && article.textContent.trim().length > 200 ? { root: article.content, live } : null;
    } catch { return null; }
  }
  // Splits an element into paragraphs of text segments. Each segment keeps its live text node (or null).
  function collect(root, live) {
    const blocks = []; let current = [];
    const flush = () => { if (current.some(s => s.text.trim())) blocks.push(current); current = []; };
    const walk = node => {
      if (node.nodeType === Node.TEXT_NODE) { current.push({ text: node.textContent, node: live ? live.get(node) || null : node }); return; }
      if (node.nodeType !== Node.ELEMENT_NODE || node.matches(skip) || (!live && getComputedStyle(node).display === 'none')) return;
      const block = blockTags.test(node.tagName);
      if (block) flush();
      node.childNodes.forEach(walk);
      if (block) flush();
    };
    walk(root); flush();
    return blocks;
  }
  const fromText = value => value.split(/\n\s*\n|\r?\n/).filter(p => p.trim()).map(p => [{ text: p, node: null }]);
  const article = !selection && !known ? readable() : null;
  const fallback = !selection && !known && !article ? [...document.querySelectorAll('article,main')].find(e => e.innerText.trim().length > 200) : null;
  const initial = selection ? fromText(selection) : known ? collect(known) : article ? collect(article.root, article.live) : fallback ? collect(fallback) : [];

  const host = document.createElement('section'); host.id = id;
  const inlineStyle = 'display:block!important;position:relative!important;z-index:2147483646!important;margin:20px auto!important;max-width:960px!important;scroll-margin-top:16px!important;';
  const focusStyle = 'display:block!important;position:fixed!important;inset:0!important;z-index:2147483646!important;margin:0!important;max-width:none!important;overflow:auto!important;';
  host.style.cssText = inlineStyle;
  const root = host.attachShadow({ mode: 'open' });
  const light = '--bg:#f7f4ea;--fg:#1d2b2b;--muted:#566663;--line:#cfd8d2;--control:#e7ece6;--control-line:#a9bab3;--control-fg:#1d2b2b;--accent:#2f6b4f;--accent-fg:#fff;--mark:#b06a12;--input:#fff;color-scheme:light;';
  root.innerHTML = `<style>
    *{box-sizing:border-box}section{--bg:#142324;--fg:#eeeedd;--muted:#b5c4bf;--line:#385052;--control:#243b3a;--control-line:#52706a;--control-fg:#f2f1e8;--accent:#b8e8ca;--accent-fg:#142324;--mark:#e8bd78;--input:#0c191a;color-scheme:dark;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:18px;padding:24px;font:15px/1.5 system-ui;box-shadow:0 12px 40px #0003}section.light{${light}}@media(prefers-color-scheme:light){section.auto{${light}}}
    section.focus{min-height:100vh;border:0;border-radius:0;box-shadow:none;display:flex;flex-direction:column}section.focus #stage{flex:1;min-height:40vh}
    header,.controls,.meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap}header{justify-content:space-between}h2{font-size:20px;margin:0}small,.meta{color:var(--muted)}.controls+.controls{margin-top:10px}button,select,textarea,input{font:inherit}button,select{border:1px solid var(--control-line);border-radius:8px;padding:9px 13px;background:var(--control);color:var(--control-fg);cursor:pointer}button:disabled{opacity:.5;cursor:default}button[aria-pressed="true"]{border-color:var(--mark)}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid var(--mark);outline-offset:3px}#play{background:var(--accent);color:var(--accent-fg);min-width:105px}
    #stage{position:relative;overflow:hidden;height:max(146px,calc(var(--size,40px)*3));display:flex;align-items:center;font:min(var(--size,40px),12vw)/1.3 ui-monospace,Consolas,monospace;margin:14px 0;border-block:1px solid var(--line)}#stage:before,#stage:after{content:'';position:absolute;left:50%;width:1px;height:13px;background:var(--mark)}#stage:before{top:0}#stage:after{bottom:0}#word{position:absolute;white-space:pre}#word b{color:var(--mark);font-weight:inherit}#prev,#next{position:absolute;white-space:pre}#prev span,#next span{font-size:.7em}#prev{opacity:.25;-webkit-mask-image:linear-gradient(to left,#000 50%,transparent);mask-image:linear-gradient(to left,#000 50%,transparent)}#next{opacity:.38;-webkit-mask-image:linear-gradient(to right,#000 50%,transparent);mask-image:linear-gradient(to right,#000 50%,transparent)}
    #context{position:relative;overflow:hidden;height:2.2em;color:var(--muted);font-size:17px;margin:14px 0;-webkit-mask-image:linear-gradient(to right,transparent,#000 15%,#000 85%,transparent);mask-image:linear-gradient(to right,transparent,#000 15%,#000 85%,transparent)}#line{position:absolute;left:50%;top:0;white-space:pre;line-height:2.2em}#line mark{background:var(--mark);color:var(--bg);border-radius:4px;padding:1px 3px}#seek{width:100%;accent-color:var(--accent)}#speed,#size{width:110px;accent-color:var(--accent)}.meta{justify-content:space-between;margin:8px 0}textarea{width:100%;min-height:130px;background:var(--input);color:var(--fg);border:1px solid var(--control-line);border-radius:8px;padding:10px;margin:10px 0}details{margin-top:16px}summary{cursor:pointer}#notice{color:var(--mark)}label{display:inline-flex;gap:7px;align-items:center}#paragraph{max-width:100%}@media(max-width:600px){section{padding:16px}.controls{gap:8px}}
    </style><section aria-label="RSVP reader"><header><div><h2>Novel RSVP</h2><small>One word. One fixed focal point. Your pace.</small></div><button id="close" aria-label="Close reader">Close ×</button></header>
    <div id="stage" aria-label="Current word"><span id="prev" aria-hidden="true"><span></span></span><span id="word"></span><span id="next" aria-hidden="true"><span></span></span></div><div class="controls"><button id="back" aria-label="Ten words back">−10</button><button id="play">Start</button><button id="forward" aria-label="Ten words forward">+10</button><label>Speed <input id="speed" type="range" min="100" max="700" step="10" value="250"><span id="wpm">250</span> wpm</label><label><input id="pauses" type="checkbox" checked> Natural pauses</label></div>
    <div class="controls"><label>Size <input id="size" type="range" min="24" max="96" step="4" value="40"></label><label>Theme <select id="theme"><option value="dark">Dark</option><option value="light">Light</option><option value="auto">System</option></select></label><label><input id="neighbours" type="checkbox"> Show neighbours</label><label><input id="follow" type="checkbox" checked> Follow text</label><button id="focus" aria-pressed="false">Focus mode</button><button id="locate">Show on page</button></div>
    <div id="context"><span id="line"></span></div><input id="seek" type="range" min="0" max="0" value="0" aria-label="Reading position"><div class="meta"><span id="progress"></span><span id="remaining"></span></div>
    <label>Start at paragraph <select id="paragraph" aria-label="Start at paragraph"></select></label><p id="notice" role="status"></p>
    <details><summary>Check text or paste your own</summary><p>This is the detected text. Edit it if menus or other text got mixed in. Applying restarts the reader.</p><textarea id="text" aria-label="Text to read" spellcheck="false"></textarea><button id="apply">Apply text</button></details><small>Space: start/pause · ←/→: 10 words · F: focus mode · Esc: leave focus mode · Double-click a word on the page to start there. Shortcuts work when the reader has focus. The reader pauses when the tab is hidden.</small></section>`;
  const $ = s => root.querySelector(s);
  const panel = $('section');
  let tokens = [], paragraphs = [], byNode = new Map(), remainingFactor = [0], text = '';
  let index = 0, timer = null, playing = false, rewind = false, warm = 0, saveTimer;
  let display = { size: 40, theme: 'dark', focus: false, follow: true, neighbours: false };
  const key = 'position:' + location.origin + location.pathname + location.search + (selection ? ':selection' : '');
  const highlights = typeof Highlight === 'function' && window.CSS?.highlights;
  const pageStyle = document.createElement('style');
  pageStyle.textContent = '::highlight(novel-rsvp){background:#e8bd78;color:#142324}';
  if (highlights) (document.head || document.documentElement).append(pageStyle);

  function signature(value) { let hash = 2166136261; for (let i=0;i<value.length;i++) hash = Math.imul(hash ^ value.charCodeAt(i),16777619); return String(hash>>>0); }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => chrome.storage.local.set({ [key]: { index, signature: signature(text), at: Date.now() }, settings: { speed: Number($('#speed').value), pauses: $('#pauses').checked, ...display } }).catch(() => {}), 250);
  }
  async function prune() {
    const all = await chrome.storage.local.get(null);
    const old = Object.keys(all).filter(k => k.startsWith('position:')).sort((a, b) => (all[b].at || 0) - (all[a].at || 0)).slice(maxPositions);
    if (old.length) await chrome.storage.local.remove(old);
  }
  // Very long words are flashed in pieces: after inner hyphens first, then in chunks of about ten letters.
  function split(word) {
    if (word.length <= 13) return [[word, 0, word.length]];
    const pieces = []; let from = 0;
    for (const m of word.matchAll(/[-–—]+/g)) { const to = m.index + m[0].length; if (m.index > from && to < word.length) { pieces.push([from, to]); from = to; } }
    pieces.push([from, word.length]);
    return pieces.flatMap(([a, b]) => {
      const count = b - a > 13 ? Math.ceil((b - a) / 10) : 1, size = Math.ceil((b - a) / count);
      return Array.from({ length: count }, (_, k) => { const s = a + k * size, e = Math.min(b, s + size); return [word.slice(s, e) + (e < b && k < count - 1 ? '-' : ''), s, e]; });
    });
  }
  // How long a word stays on screen with natural pauses, relative to the base speed.
  function factorOf(t) {
    let factor = 1;
    if (/[.!?…][”’"')\]]*$/.test(t.word)) factor = 2.3;
    else if (/[,;:—][”’"')\]]*$/.test(t.word)) factor = 1.5;
    else if (t.word.length <= 3) factor = 0.85;
    if (t.end) factor = Math.max(factor, 2.8);
    if (t.word.length > 10) factor += 0.25;
    return factor;
  }
  function build(blocks) {
    tokens = []; paragraphs = []; byNode = new Map();
    blocks.forEach(segments => {
      const starts = []; let full = '';
      segments.forEach(s => { starts.push(full.length); full += s.text; });
      const at = offset => { let i = starts.length - 1; while (i > 0 && starts[i] > offset) i--; return [segments[i].node, offset - starts[i]]; };
      const first = tokens.length, paragraph = paragraphs.length;
      for (const m of full.matchAll(/\S+/g)) split(m[0]).forEach(([word, from, to], part) => {
        const [startNode, startOffset] = at(m.index + from), [endNode, endOffset] = at(m.index + to - 1);
        const range = startNode && endNode ? [startNode, startOffset, endNode, endOffset + 1] : null;
        if (range) (byNode.get(startNode) || byNode.set(startNode, []).get(startNode)).push(tokens.length);
        tokens.push({ word, paragraph, part, range });
      });
      if (tokens.length === first) return;
      tokens[tokens.length - 1].end = true;
      paragraphs.push({ start: first, text: full.replace(/\s+/g, ' ').trim() });
    });
    tokens.forEach(t => { t.factor = factorOf(t); });
    remainingFactor = new Float64Array(tokens.length + 1);
    for (let i = tokens.length - 1; i >= 0; i--) remainingFactor[i] = remainingFactor[i + 1] + tokens[i].factor;
  }
  function load(blocks) {
    build(blocks);
    text = paragraphs.map(p => p.text).join('\n\n');
    $('#text').value = text; $('#paragraph').replaceChildren();
    paragraphs.forEach((p,i) => { const option = document.createElement('option'); option.value = p.start; option.textContent = `${i+1}. ${p.text.slice(0,65)}`; $('#paragraph').append(option); });
    index=0; $('#seek').max = Math.max(0,tokens.length-1); render();
    $('#notice').textContent = tokens.length ? (selection ? 'Selected text loaded.' : 'Main text detected. Press Start or Space to begin.') : 'No chapter text detected. Select text on the page and open again, or paste text below.';
    if (!tokens.length) $('details').open = true;
  }
  function rangeOf(token) {
    if (!token?.range || !token.range[0].isConnected) return null;
    try { const range = document.createRange(); range.setStart(token.range[0], token.range[1]); range.setEnd(token.range[2], token.range[3]); return range; } catch { return null; }
  }
  function highlight() {
    if (!highlights) return;
    const range = rangeOf(tokens[index]);
    if (range) highlights.set('novel-rsvp', new Highlight(range)); else highlights.delete('novel-rsvp');
  }
  function render() {
    const token=tokens[index]; const word=token?.word || 'Paste text'; const chars=Array.from(word);
    const focus=Math.min(chars.length-1, chars.length<=2?0:chars.length<=5?1:chars.length<=9?2:3);
    const before=document.createElement('span'); before.textContent=chars.slice(0,focus).join('');
    const center=document.createElement('b'); center.textContent=chars[focus];
    const after=document.createElement('span'); after.textContent=chars.slice(focus+1).join('');
    $('#word').replaceChildren(before,center,after);
    $('#word').style.left=`calc(50% - ${focus+0.5}ch)`;
    // Faint neighbouring words, also across paragraphs, placed around the fixed focus point.
    const near=display.neighbours&&token, words=list=>list.map(t=>t.word).join(' ');
    $('#prev span').textContent=near?words(tokens.slice(Math.max(0,index-3),index)):'';
    $('#next span').textContent=near?words(tokens.slice(index+1,index+4)):'';
    $('#prev').style.right=`calc(50% + ${focus+0.5}ch + 0.6ch)`;
    $('#next').style.left=`calc(50% + ${chars.length-focus-0.5}ch + 0.6ch)`;
    $('#seek').value=index;
    $('#progress').textContent=tokens.length?`${index+1} / ${tokens.length} words · ${Math.round((index+1)/tokens.length*100)}%`:'No text yet';
    const minutes=($('#pauses').checked?remainingFactor[index]:tokens.length-index)/Number($('#speed').value);
    $('#remaining').textContent=!tokens.length?'':minutes<1?'< 1 min remaining':`± ${Math.ceil(minutes)} min remaining`;
    // The line below slides so the highlighted current word always sits in the middle, under the focus letter.
    if(token){
      const mark=document.createElement('mark'); mark.textContent=token.word;
      $('#line').replaceChildren(words(tokens.slice(Math.max(0,index-12),index))+' ',mark,' '+words(tokens.slice(index+1,index+13)));
      $('#line').style.transform=`translateX(${-(mark.offsetLeft+mark.offsetWidth/2)}px)`;
    } else $('#line').replaceChildren();
    if(token) $('#paragraph').value=paragraphs[token.paragraph].start;
    $('#play').disabled=!tokens.length;
    $('#locate').disabled=!rangeOf(token);
    highlight();
  }
  function stop() { if(playing)rewind=true;playing=false;clearTimeout(timer);$('#play').textContent='Start';persist(); }
  // Slightly slower for the first words after (re)starting, so the eyes can settle.
  function delay() {
    const t=tokens[index]; const factor=$('#pauses').checked && t ? t.factor : 1;
    return 60000/Number($('#speed').value)*factor*(1+Math.max(0,4-warm)*0.15);
  }
  function tick() { timer=setTimeout(()=>{if(!playing)return;if(index>=tokens.length-1){stop();$('#notice').textContent='Chapter finished. You can start again or go to the next chapter.';return;}index++;warm++;if(tokens[index].paragraph!==tokens[index-1].paragraph)follow();render();if(index%10===0)persist();tick();},delay()); }
  // Resuming after a pause goes back a few words (within the paragraph) to pick up the thread.
  function toggle() {
    if(playing){stop();return;}if(!tokens.length)return;
    if(index===tokens.length-1)index=0;else if(rewind)index=Math.max(paragraphs[tokens[index].paragraph].start,index-3);
    rewind=false;warm=0;playing=true;$('#play').textContent='Pause';$('#notice').textContent='';follow();render();tick();
  }
  // Dragging the position slider does not move the reader under the mouse; it follows once the slider is released.
  function jump(n, move = true) { stop();rewind=false;index=clamp(0,tokens.length-1,n);if(move)follow();render();persist(); }
  // The block that holds the given page node; the reader is inserted just before it.
  function anchorFor(node) {
    let anchor = node;
    while (anchor.parentElement && anchor.parentElement !== document.body && getComputedStyle(anchor.parentElement).display.startsWith('inline')) anchor = anchor.parentElement;
    anchor = anchor.parentElement?.closest('p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,dd') || anchor;
    return anchor === document.body || anchor === document.documentElement || !anchor.parentElement ? null : anchor;
  }
  function place(node) { const anchor = anchorFor(node); if (anchor) anchor.before(host); else document.body.prepend(host); }
  // Moves the reader to just above the current paragraph. While it is on screen, the page is scrolled by the same
  // amount so the reader stays put and the text flows past it. Moving a node drops focus, so it is restored.
  function follow() {
    const node = tokens[index]?.range?.[0];
    if (display.focus || !display.follow || !host.isConnected || !node?.isConnected) return;
    const anchor = anchorFor(node);
    if (!anchor || host.nextSibling === anchor || anchor.contains(host)) return;
    const before = host.getBoundingClientRect(), visible = before.bottom > 0 && before.top < innerHeight;
    const active = root.activeElement;
    anchor.before(host);
    if (visible) window.scrollBy({ top: host.getBoundingClientRect().top - before.top, behavior: 'instant' });
    active?.focus({ preventScroll: true });
  }
  // The first paragraph that is still (partly) visible, so the reader starts where you are on the page.
  function visibleStart() {
    for (let p = 0; p < paragraphs.length; p++) {
      const range = rangeOf(tokens[(paragraphs[p + 1]?.start ?? tokens.length) - 1]);
      if (range && range.getBoundingClientRect().bottom > 0) return paragraphs[p].start;
    }
    return 0;
  }
  function applyDisplay() {
    panel.className = display.theme + (display.focus ? ' focus' : '');
    panel.style.setProperty('--size', display.size + 'px');
    host.style.cssText = display.focus ? focusStyle : inlineStyle;
    $('#size').value = display.size; $('#theme').value = display.theme; $('#follow').checked = display.follow; $('#neighbours').checked = display.neighbours;$('#focus').setAttribute('aria-pressed', display.focus);
  }
  function setFocus(on, scrollToReader = true) {
    display.focus = on; applyDisplay(); persist();
    if (!on && scrollToReader) host.scrollIntoView({ block: 'start' });
    $('#play').focus({ preventScroll: true });
  }
  function locate() {
    const range = rangeOf(tokens[index]); if (!range) return;
    stop(); if (display.focus) setFocus(false, false);
    window.scrollBy({ top: range.getBoundingClientRect().top - innerHeight / 3, behavior: 'smooth' });
  }
  function pick(e) {
    if (e.composedPath().includes(host)) return;
    const caret = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    const list = caret && byNode.get(caret.startContainer);
    if (!list) return;
    let found = list.findLast(i => tokens[i].range[1] <= caret.startOffset) ?? list[0];
    while (tokens[found].part > 0) found--;
    window.getSelection()?.removeAllRanges();
    jump(found, false);
    if (!display.focus) { place(tokens[found].range[0]); host.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    $('#notice').textContent = 'Starting from the word you double-clicked.';
    $('#play').focus({ preventScroll: true });
  }
  $('#play').onclick=toggle;$('#back').onclick=()=>jump(index-10);$('#forward').onclick=()=>jump(index+10);
  $('#seek').oninput=e=>jump(Number(e.target.value),false);$('#seek').onchange=follow;
  $('#neighbours').onchange=()=>{display.neighbours=$('#neighbours').checked;render();persist();};
  $('#follow').onchange=()=>{display.follow=$('#follow').checked;follow();persist();};$('#paragraph').onchange=e=>jump(Number(e.target.value));
  $('#speed').oninput=()=>{$('#wpm').textContent=$('#speed').value;render();persist();};$('#pauses').onchange=()=>{render();persist();};
  $('#size').oninput=()=>{display.size=Number($('#size').value);applyDisplay();persist();};
  $('#theme').onchange=()=>{display.theme=$('#theme').value;applyDisplay();persist();};
  $('#focus').onclick=()=>setFocus(!display.focus);$('#locate').onclick=locate;
  $('#apply').onclick=()=>{stop();load(fromText($('#text').value));persist();};
  // Keys pressed inside the reader never reach the page, so site shortcuts (like arrows for the next chapter) don't fire.
  ['keydown','keyup','keypress'].forEach(type=>root.addEventListener(type,e=>e.stopPropagation()));
  root.addEventListener('keydown',e=>{
    if(e.code==='Escape'&&display.focus){e.preventDefault();setFocus(false);return;}
    if(e.target.matches('textarea,input,select')||e.altKey||e.ctrlKey||e.metaKey)return;
    if(e.code==='Space'){e.preventDefault();toggle();}else if(e.code==='ArrowLeft'){e.preventDefault();jump(index-10);}else if(e.code==='ArrowRight'){e.preventDefault();jump(index+10);}else if(e.code==='KeyF'){e.preventDefault();setFocus(!display.focus);}
  });
  function hidden(){if(document.hidden)stop();}
  function unload(){stop();}
  $('#close').onclick=()=>{
    stop();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',unload);document.removeEventListener('dblclick',pick);
    if(highlights)highlights.delete('novel-rsvp');pageStyle.remove();host.remove();
  };

  load(initial);
  let saved = {};
  try { saved = await chrome.storage.local.get([key, 'settings']); } catch {}
  if (saved.settings) {
    const s = saved.settings;
    $('#speed').value=clamp(100,700,Number(s.speed)||250);$('#wpm').textContent=$('#speed').value;$('#pauses').checked=s.pauses!==false;
    display = { size: clamp(24,96,Number(s.size)||40), theme: ['dark','light','auto'].includes(s.theme) ? s.theme : 'dark', focus: s.focus === true, follow: s.follow !== false, neighbours: s.neighbours === true };
  }
  let notice = '';
  if (tokens.length && saved[key]?.signature === signature(text) && saved[key].index > 0) { index=clamp(0,tokens.length-1,saved[key].index); notice='Your previous reading position has been restored.'; }
  else if (!selection) { const start = visibleStart(); if (start > 0) { index = start; notice = 'Starting from where you were on the page.'; } }
  const startNode = rangeOf(tokens[index]) ? tokens[index].range[0] : selectionNode;
  if (startNode?.isConnected) place(startNode); else if (known || fallback) (known || fallback).before(host); else document.body.prepend(host);
  window.novelRsvpOpening = false;
  document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',unload);document.addEventListener('dblclick',pick);
  applyDisplay(); render(); if (notice) $('#notice').textContent = notice;
  if (!display.focus) host.scrollIntoView({ behavior:'smooth',block:'start' });
  $('#play').focus({preventScroll:true});
  prune().catch(() => {});
})();
