const files = ['vendor/Readability.js', 'reader.js'];
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
