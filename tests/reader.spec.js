const { test: base, expect, chromium } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const pages = require('./pages');

const root = path.join(__dirname, '..');
const files = ['manifest.json', 'background.js', 'reader.js', 'vendor/Readability.js', 'vendor/words.js'];

// Loads a copy of the extension with host access, so the background script can inject without a user click.
const test = base.extend({
  context: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novel-rsvp-'));
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.copyFileSync(path.join(root, file), path.join(dir, file));
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ ...manifest, host_permissions: ['<all_urls>'] }));
    const context = await chromium.launchPersistentContext('', { channel: 'chromium', args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`] });
    await context.route('http://novel.test/**', route => route.fulfill({ contentType: 'text/html', body: pages[new URL(route.request().url()).pathname.slice(1)] }));
    await use(context);
    await context.close();
    fs.rmSync(dir, { recursive: true, force: true });
  },
  worker: async ({ context }, use) => {
    const [existing] = context.serviceWorkers();
    await use(existing || await context.waitForEvent('serviceworker'));
  },
});

const reader = page => page.locator('#novel-rsvp-reader');
const inject = (page, worker) => worker.evaluate(url => chrome.tabs.query({}).then(tabs => openReader(tabs.find(t => t.url === url))), page.url());
async function open(page, worker) {
  await inject(page, worker);
  await expect(reader(page).locator('#progress')).toContainText('words');
}
const wordIndex = async page => Number((await reader(page).locator('#progress').textContent()).split(' / ')[0]);
const minutes = async page => Number((await reader(page).locator('#remaining').textContent()).match(/\d+/)[0]);

test('uses the known chapter container and skips navigation', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  const text = await reader(page).locator('#text').inputValue();
  expect(text).toMatch(/^Paragraph 1 begins here\./);
  expect(text).not.toContain('NAV-MARKER');
  expect(text).not.toContain('FOOTER-MARKER');
  await expect(reader(page).locator('#word')).toHaveText('Paragraph');
  await expect(reader(page).locator('#notice')).toHaveText('Main text detected. Press Start or Space to begin.');
});

test('finds the main text on an unknown layout with Readability', async ({ page, worker }) => {
  await page.goto('http://novel.test/generic');
  await open(page, worker);
  const text = await reader(page).locator('#text').inputValue();
  expect(text).toContain('Paragraph 30 begins here.');
  expect(text).not.toContain('SIDEBAR-MARKER');
  expect(text).not.toContain('COMMENT-MARKER');
  expect(text).not.toContain('NAV-MARKER');
});

test('splits text separated by line breaks into paragraphs', async ({ page, worker }) => {
  await page.goto('http://novel.test/brdiv');
  await open(page, worker);
  const text = await reader(page).locator('#text').inputValue();
  expect(text).not.toContain('SIDEBAR-MARKER');
  expect(await reader(page).locator('#paragraph option').count()).toBeGreaterThanOrEqual(25);
});

test('opens the paste box when no text is found', async ({ page, worker }) => {
  await page.goto('http://novel.test/empty');
  await inject(page, worker);
  await expect(reader(page).locator('#notice')).toContainText('No chapter text detected');
  await expect(reader(page).locator('details')).toHaveAttribute('open', '');
});

test('plays, pauses and goes back a few words on resume', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  await reader(page).locator('#speed').fill('700');
  await reader(page).locator('#play').click();
  await expect.poll(() => wordIndex(page)).toBeGreaterThan(8);
  await reader(page).locator('#play').click();
  const paused = await wordIndex(page);
  await reader(page).locator('#speed').fill('100');
  await reader(page).locator('#play').click();
  const resumed = await wordIndex(page);
  expect(resumed).toBeLessThan(paused);
  expect(resumed).toBeGreaterThanOrEqual(paused - 3);
});

test('double-clicking a word on the page starts there, highlights it and splits long words', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  const point = await page.evaluate(() => {
    const node = document.querySelector('#p3').firstChild, start = node.textContent.indexOf('incomprehensibilities');
    node.parentElement.scrollIntoView({ block: 'center' });
    const range = document.createRange(); range.setStart(node, start + 10); range.setEnd(node, start + 11);
    const rect = range.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  await page.mouse.dblclick(point.x, point.y);
  await expect(reader(page).locator('#word')).toHaveText('incompr-');
  await expect(reader(page).locator('#notice')).toHaveText('Starting from the word you double-clicked.');
  expect(await page.evaluate(() => CSS.highlights.has('novel-rsvp'))).toBe(true);
});

test('starts at the paragraph you were reading', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await page.evaluate(() => { document.querySelector('#p25').scrollIntoView({ block: 'start' }); window.scrollBy(0, 5); });
  await open(page, worker);
  await expect(reader(page).locator('#notice')).toHaveText('Starting from where you were on the page.');
  await expect(reader(page).locator('#context')).toContainText('Paragraph 25 begins');
});

test('starts at the beginning when the page is scrolled to the end of the chapter', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await page.setViewportSize({ width: 1000, height: 150 });
  await page.evaluate(() => document.querySelector('#p40').scrollIntoView({ block: 'end' }));
  await open(page, worker);
  await expect(reader(page).locator('#notice')).toHaveText('The page was scrolled to the end of the chapter, so the reader starts at the beginning.');
  expect(await wordIndex(page)).toBe(1);
});

test('starts at a selected word instead of reading only the selection', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await page.evaluate(() => { const node = document.querySelector('#p12').firstChild, range = document.createRange(); range.setStart(node, 0); range.setEnd(node, 9); getSelection().addRange(range); });
  await open(page, worker);
  await expect(reader(page).locator('#notice')).toHaveText('Starting from the word you selected.');
  await expect(reader(page).locator('#context')).toContainText('Paragraph 12 begins');
  expect(await wordIndex(page)).toBeGreaterThan(200);
});

test('restores the previous position after reopening', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  await reader(page).locator('#forward').click();
  await reader(page).locator('#forward').click();
  await page.waitForTimeout(400);
  await reader(page).locator('#close').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await open(page, worker);
  await expect(reader(page).locator('#notice')).toHaveText('Your previous reading position has been restored.');
  expect(await wordIndex(page)).toBe(21);
});

test('remaining time includes natural pauses', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  await reader(page).locator('#speed').fill('100');
  const withPauses = await minutes(page);
  await reader(page).locator('#pauses').uncheck();
  const withoutPauses = await minutes(page);
  const words = Number((await reader(page).locator('#progress').textContent()).match(/\/ (\d+)/)[1]);
  expect(withoutPauses).toBe(Math.ceil(words / 100));
  expect(withPauses).toBeGreaterThan(withoutPauses);
});

test('word timing gives rare long words more time without changing the speed', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  const host = reader(page);
  await host.locator('#speed').fill('100');
  await host.locator('#pauses').uncheck();
  const words = Number((await host.locator('#progress').textContent()).match(/\/ (\d+)/)[1]);
  for (const timing of ['off', 'strong']) {
    await host.locator('#timing').selectOption(timing);
    expect(await minutes(page)).toBe(Math.ceil(words / 100));
  }
  await host.locator('details summary').click();
  await host.locator('#text').fill('a a a a a a Nighthawks a a');
  await host.locator('#apply').click();
  // Record when each word appears, then compare how long the short word and the rare long word stayed on screen.
  await page.evaluate(() => {
    const word = document.getElementById('novel-rsvp-reader').shadowRoot.querySelector('#word');
    window.shown = [];
    new MutationObserver(() => shown.push([word.textContent, performance.now()])).observe(word, { childList: true });
  });
  await host.locator('#play').click();
  await expect.poll(() => page.evaluate(() => shown.length), { timeout: 10000 }).toBeGreaterThan(7);
  const shown = await page.evaluate(() => window.shown);
  const rare = shown.findIndex(([w]) => w === 'Nighthawks');
  const duration = i => shown[i + 1][1] - shown[i][1];
  expect(duration(rare)).toBeGreaterThan(duration(rare - 1) * 2);
});

test('focus mode, size and theme', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  const host = reader(page);
  await host.locator('#focus').click();
  expect(await host.evaluate(el => getComputedStyle(el).position)).toBe('fixed');
  await page.keyboard.press('Escape');
  expect(await host.evaluate(el => getComputedStyle(el).position)).toBe('relative');
  await host.locator('#theme').selectOption('light');
  await expect(host.locator('section')).toHaveClass('light');
  await host.locator('#size').fill('80');
  expect(await host.locator('#stage').evaluate(el => getComputedStyle(el).fontSize)).toBe('80px');
});

test('moves along with the text while staying in place on screen', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  const host = reader(page);
  const next = () => host.evaluate(el => el.nextElementSibling?.id);
  await expect.poll(next).toBe('p1');
  await page.waitForTimeout(600);
  const top = await host.evaluate(el => el.getBoundingClientRect().top);
  await host.locator('#speed').fill('700');
  await host.locator('#play').click();
  await expect.poll(next, { timeout: 15000 }).toBe('p3');
  // Keyboard focus survives the move: Space still pauses.
  await page.keyboard.press('Space');
  await expect(host.locator('#play')).toHaveText('Start');
  expect(Math.abs(await host.evaluate(el => el.getBoundingClientRect().top) - top)).toBeLessThan(2);
  await host.locator('#paragraph').selectOption({ index: 9 });
  await expect.poll(next).toBe('p10');
  await host.locator('#follow').uncheck();
  await host.locator('#paragraph').selectOption({ index: 0 });
  expect(await next()).toBe('p10');
});

test('arrow keys in the reader do not trigger the site chapter navigation', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => wordIndex(page)).toBe(11);
  await reader(page).locator('#speed').focus();
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => window.chapterKeys)).toEqual([]);
  // Outside the reader the site keeps its own shortcuts.
  await page.locator('h1').click();
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => window.chapterKeys)).toEqual(['ArrowRight']);
});

test('shows faint neighbouring words around the current word', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  const host = reader(page);
  await expect(host.locator('#next')).toHaveText('');
  await host.locator('#neighbours').check();
  await expect(host.locator('#prev')).toHaveText('');
  await expect(host.locator('#next')).toHaveText('1 begins here.');
  await host.locator('#forward').click();
  await expect(host.locator('#word')).toHaveText('did');
  await expect(host.locator('#prev')).toHaveText('spoke; the river');
  await expect(host.locator('#next')).toHaveText('all the talking.');
  const box = id => host.locator(id).evaluate(el => el.getBoundingClientRect().toJSON());
  const [prev, word, next] = [await box('#prev'), await box('#word'), await box('#next')];
  expect(prev.right).toBeLessThan(word.left);
  expect(next.left).toBeGreaterThan(word.right);
  // A new paragraph still shows the end of the previous one.
  await host.locator('#paragraph').selectOption({ index: 1 });
  await expect(host.locator('#word')).toHaveText('Paragraph');
  await expect(host.locator('#prev')).toHaveText('and smiled anyway.');
});

test('the line below highlights the current word and keeps it centred', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  const host = reader(page);
  const offset = () => host.locator('#context').evaluate(context => {
    const box = context.getBoundingClientRect(), mark = context.querySelector('mark').getBoundingClientRect();
    return Math.abs((mark.left + mark.right) / 2 - (box.left + box.right) / 2);
  });
  await expect(host.locator('#context mark')).toHaveText('Paragraph');
  expect(await offset()).toBeLessThan(2);
  await host.locator('#forward').click();
  await expect(host.locator('#context mark')).toHaveText('did');
  await expect(host.locator('#context')).toContainText('the river did all the talking.');
  expect(await offset()).toBeLessThan(2);
});

test('keeps only the 200 most recent saved positions', async ({ page, worker }) => {
  await worker.evaluate(() => chrome.storage.local.set(Object.fromEntries(Array.from({ length: 250 }, (_, i) => [`position:http://old.test/${i}`, { index: 1, signature: 'x', at: i }]))));
  await page.goto('http://novel.test/known');
  await open(page, worker);
  const count = () => worker.evaluate(() => chrome.storage.local.get(null).then(all => Object.keys(all).filter(k => k.startsWith('position:')).length));
  await expect.poll(count).toBe(200);
  expect(await worker.evaluate(() => chrome.storage.local.get('position:http://old.test/249').then(r => !!r['position:http://old.test/249']))).toBe(true);
});

test('mark quotes shows dialogue in italics with coloured quote marks', async ({ page, worker }) => {
  await page.goto('http://novel.test/dialogue');
  await open(page, worker);
  const host = reader(page), word = host.locator('#word');
  // Whether each of the first words is shown in italics, stepping one word at a time.
  const italics = [];
  for (let i = 0; i < 16; i++) {
    await host.locator('#seek').evaluate((el, i) => { el.value = i; el.dispatchEvent(new Event('input')); }, i);
    italics.push([await word.textContent(), await word.evaluate(el => getComputedStyle(el).fontStyle === 'italic')]);
  }
  expect(italics).toEqual([
    ['“Wait', true], ['here,”', true], ['Mira', false], ['said.', false], ['The', false], ['ferry', false], ['rocked.', false],
    ['He', false], ['shrugged.', false], ['"Don’t', true], ['be', true], ['long,"', true], ['he', false], ['called,', false], ['“or', true], ['the', true],
  ]);
  await host.locator('#seek').evaluate(el => { el.value = 1; el.dispatchEvent(new Event('input')); });
  await expect(word.locator('i')).toHaveText('”');
  await expect(word.locator('i')).toHaveCSS('color', await word.locator('b').evaluate(el => getComputedStyle(el).color));
  await host.locator('#quotes').uncheck();
  await expect(word).not.toHaveClass(/quote/);
  await expect(word.locator('i')).toHaveCount(0);
  await expect(word).toHaveText('here,”');
});

test('loads the next chapter into the page, or opens it and the reader there again', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  await expect(reader(page).locator('#next-chapter')).toBeDisabled();
  await page.goto('http://novel.test/chapter-1');
  await open(page, worker);
  await page.evaluate(() => { window.samePage = true; });
  await reader(page).locator('#next-chapter').click();
  await expect(reader(page).locator('#notice')).toHaveText('Next chapter loaded. Press Start or Space to begin.');
  expect(page.url()).toBe('http://novel.test/chapter-2');
  expect(await page.evaluate(() => window.samePage)).toBe(true);
  await expect(reader(page).locator('#word')).toHaveText('The');
  await expect(reader(page).locator('#text')).toHaveValue(/^The second chapter/);
  await expect(page.locator('#chr-content')).toContainText('The second chapter starts');
  // Chapter 3 has no chapter text to load in place, so the tab opens it (found by counting up the number in the
  // address) and the reader opens there again.
  await page.keyboard.press('KeyN');
  await page.waitForURL('http://novel.test/chapter-3');
  await expect(reader(page).locator('#notice')).toContainText('No chapter text detected');
});

test('the same word twice in a row blinks so it reads as two words', async ({ page, worker }) => {
  await page.goto('http://novel.test/chapter-2');
  await open(page, worker);
  const host = reader(page);
  await page.evaluate(() => {
    const word = document.getElementById('novel-rsvp-reader').shadowRoot.querySelector('#word');
    window.blinks = 0;
    new MutationObserver(() => { if (word.classList.contains('gap')) blinks++; }).observe(word, { attributes: true, attributeFilter: ['class'] });
  });
  await host.locator('#speed').fill('700');
  await host.locator('#play').click();
  await expect.poll(() => wordIndex(page), { timeout: 10000 }).toBeGreaterThan(11);
  expect(await page.evaluate(() => window.blinks)).toBe(2);
});

test('always opens outside focus mode', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  await reader(page).locator('#fullscreen').uncheck();
  await reader(page).locator('#focus').click();
  await page.waitForTimeout(400);
  await reader(page).locator('#close').click();
  await open(page, worker);
  await expect(reader(page).locator('#focus')).toHaveAttribute('aria-pressed', 'false');
});

test('dims everything but the word, by hand or after a while without the mouse', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  const host = reader(page), panel = host.locator('section');
  await host.locator('#dim').click();
  await expect(panel).toHaveClass(/dim/);
  await expect(host.locator('#dim')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(900);
  await page.mouse.move(10, 10);
  await expect(panel).not.toHaveClass(/dim/);
  // While reading, it dims after five seconds without mouse movement; pausing lights it up again.
  await host.locator('#speed').fill('100');
  await host.locator('#play').click();
  await page.waitForTimeout(4000);
  await expect(panel).not.toHaveClass(/dim/);
  await expect(panel).toHaveClass(/dim/, { timeout: 2500 });
  await page.waitForTimeout(900);
  await page.mouse.move(40, 40);
  await expect(panel).not.toHaveClass(/dim/);
  await page.keyboard.press('Space');
  await host.locator('#autodim').uncheck();
  await host.locator('#play').click();
  await page.waitForTimeout(5500);
  await expect(panel).not.toHaveClass(/dim/);
});

test('focus mode and dim go full screen, and leaving full screen leaves focus mode', async ({ page, worker }) => {
  await page.goto('http://novel.test/known');
  await open(page, worker);
  const host = reader(page), full = () => page.evaluate(() => !!document.fullscreenElement);
  await host.locator('#focus').click();
  await expect.poll(full).toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await expect(host.locator('#focus')).toHaveAttribute('aria-pressed', 'false');
  await host.locator('#dim').click();
  await expect.poll(full).toBe(true);
  await host.locator('#close').click();
  await expect.poll(full).toBe(false);
  await open(page, worker);
  await host.locator('#fullscreen').uncheck();
  await host.locator('#focus').click();
  await page.waitForTimeout(300);
  expect(await full()).toBe(false);
});
