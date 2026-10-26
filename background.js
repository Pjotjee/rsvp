const files = ['vendor/Readability.js', 'vendor/words.js', 'reader.js'];
const title = 'Open Novel RSVP (Alt+R)';

// Clicking the toolbar icon (or pressing Alt+R) opens the reader straight away.
async function openReader(tab) {
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    await chrome.action.setTitle({ tabId: tab.id, title });
  } catch {
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#e8bd78' });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    await chrome.action.setTitle({ tabId: tab.id, title: 'Novel RSVP cannot run on this page. Open a regular web page with chapter text and try again. Browser settings and some built-in pages are not supported.' });
  }
}

chrome.action.onClicked.addListener(openReader);

// After "Next chapter" the reader asks to be opened again; that happens as soon as the new page has loaded.
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!message?.reopen || !sender.tab) return;
  chrome.storage.session.set({ ['reopen:' + sender.tab.id]: Date.now() }).then(() => reply(true));
  return true;
});
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== 'complete') return;
  const name = 'reopen:' + tabId, pending = (await chrome.storage.session.get(name))[name];
  if (!pending) return;
  await chrome.storage.session.remove(name);
  if (Date.now() - pending < 60000) openReader({ id: tabId });
});
