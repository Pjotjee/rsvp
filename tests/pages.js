// Sample pages with original filler prose, served from http://novel.test/<name> during tests.
const sentences = [
  'The lantern swayed above the ferry while Mira counted the waves, one by one.',
  'Nobody on deck spoke; the river did all the talking.',
  'Somewhere behind the fog, a bell rang twice and then fell silent.',
  'She tightened her scarf, checked the map again, and smiled anyway.',
  'The old captain claimed the current knew every secret of the valley.',
];
const paragraph = i => `Paragraph ${i} begins here. ${sentences[i % 5]} ${sentences[(i + 2) % 5]}${i === 3 ? ' Such incomprehensibilities made her laugh.' : ''}`;
const range = n => Array.from({ length: n }, (_, i) => i + 1);
const page = body => `<!doctype html><html><head><meta charset="utf-8"><title>Chapter 1</title>
<style>body{font:18px/1.6 serif;max-width:700px;margin:auto;padding:20px}p{margin:0 0 1em}</style></head><body>${body}</body></html>`;
// Like many novel sites, the arrow keys switch chapters (here they only record it).
const nav = `<nav>NAV-MARKER <a href="#">Home</a> <a href="#">Library</a> <a href="#">Latest</a></nav>
  <script>window.chapterKeys = []; document.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') chapterKeys.push(e.key); });</script>`;

module.exports = {
  known: page(`${nav}<h1>Chapter 1</h1><div id="chr-content">${range(40).map(i => `<p id="p${i}">${paragraph(i)}</p>`).join('')}</div><footer>FOOTER-MARKER</footer>`),
  generic: page(`${nav}<div class="layout"><div class="post-body"><h1>The Ferry</h1>${range(30).map(i => `<p>${paragraph(i)}</p>`).join('')}</div>
    <div class="sidebar">${range(8).map(i => `<a href="#">SIDEBAR-MARKER link ${i}</a><br>`).join('')}</div></div>
    <div class="comments"><h3>Comments</h3>${range(3).map(i => `<div class="comment">COMMENT-MARKER ${i}: nice chapter!</div>`).join('')}</div>`),
  brdiv: page(`${nav}<div class="wrap"><h2>Chapter 1</h2><div class="txt">${range(25).map(paragraph).join('<br><br>')}</div></div><div class="sidebar">SIDEBAR-MARKER <a href="#">More novels</a></div>`),
  empty: page('<p>Nothing to read here.</p>'),
};
