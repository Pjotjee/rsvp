document.querySelector('#open').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['reader.js'] });
    window.close();
  } catch {
    document.querySelector('#status').textContent = 'Open a regular web page with chapter text and try again. Browser settings and some built-in pages are not supported.';
  }
});
