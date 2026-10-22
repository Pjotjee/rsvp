# Novel RSVP

A browser extension for reading web novels word by word (RSVP: Rapid Serial Visual Presentation) in a calm reader panel on the page.

## Installing on your laptop

1. Clone or download this repository to a permanent folder.
2. Open Chrome and type `chrome://extensions` in the address bar. In Brave, use `brave://extensions`.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the folder containing `manifest.json`.
5. Optionally pin Novel RSVP via the puzzle piece next to the address bar.
6. Open a chapter page and click the Novel RSVP icon, or press **Alt+R**. The reader opens immediately.

You can change the shortcut at `chrome://extensions/shortcuts`. If the extension cannot run on a page (for example browser settings), the icon shows a **!** badge; hover over it for details.

## Reading

Start at 200–250 words per minute and adjust to your preference. As a rough guide for silent reading:

| Speed | WPM | |
|---|---|---|
| Average | 180–280 | Most adults |
| Fluent | 280–400 | Experienced readers, easy text |
| Fast | 400–600 | Well-practised readers; comprehension starts to drop |

- Start/Pause and the −10/+10 buttons control reading. The slider moves you through the chapter.
- The reader starts at the paragraph you were looking at. You can also pick a paragraph from the list, or **double-click any word on the page** to start from there.
- With **Follow text** on (the default), the reader moves down the page with each new paragraph while staying in the same spot on your screen: text you've read ends up above it, the next text sits right below it.
- The current word is highlighted in the page text. **Show on page** pauses and scrolls to it, so you can switch to normal reading.
- After a pause, playback goes back a few words and starts slightly slower, so you can pick up the thread again.
- The focus letter stays in the center. Natural pauses give punctuation and paragraph breaks extra time and short words a little less. Very long words are shown in pieces.
- **Show neighbours** shows the three previous and next words faintly around the current word, which can make RSVP easier while you get used to it.
- **Focus mode** fills the window with the reader. **Size** and **Theme** (dark, light or system) change how it looks. These settings are remembered.
- Click inside the reader to use the keyboard shortcuts: space (start/pause), left/right arrows (10 words), F (focus mode) and Esc (leave focus mode). In input fields the keys keep their normal function.
- Switching to another tab pauses reading.
- After reloading or coming back, click the extension again; it restores your position if the text has not changed. Playback always starts manually.

## If the text is not detected correctly

Open **Check text or paste your own**. You can edit the text there. Alternatively, close the reader, select the text you want on the web page and open it again. A selection of more than about 200 characters is read instead of the detected text; a shorter selection, like a single word, only marks where to start.

Detection first tries common chapter containers, including `.chr-c` and `#chr-content`. On other websites it uses [Mozilla Readability](https://github.com/mozilla/readability) (the engine behind Firefox Reader View) to find the main text. The extension does not fetch next chapters. Open the next chapter yourself and click the extension again.

## Privacy

The extension sends no text and contains no external services or analytics. Only the position, a text fingerprint, the page URL as a storage key and your display settings are kept in local extension storage. Only the 200 most recently read pages are kept. Chapter text is not stored. Access to the page is only requested when you click the extension. Removing the extension deletes its storage.

## Development

The extension itself needs no build step. Node.js is only needed for the tests and for updating Readability.

```
npm install
npx playwright install chromium
npm test
```

The tests load the extension in Chromium and run it against sample pages in [tests/pages.js](tests/pages.js).

`vendor/Readability.js` is a copy of `@mozilla/readability` (Apache License 2.0, see `vendor/Readability.LICENSE.md`). To update it, change the version in `package.json`, run `npm install`, then `npm run vendor`.

## Status

This is a locally installable prototype for laptop use, not a published store version. The code targets Chrome and Brave with Manifest V3. Websites may change their markup, so detection on a specific site can break.

Installation method: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked
