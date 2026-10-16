# Novel RSVP — first version

A browser extension for reading web novels word by word (RSVP: Rapid Serial Visual Presentation) in a calm reader panel on the page.

## Installing on your laptop

1. Clone or download this repository to a permanent folder.
2. Open Chrome and type `chrome://extensions` in the address bar. In Brave, use `brave://extensions`.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the folder containing `manifest.json`.
5. Optionally pin Novel RSVP via the puzzle piece next to the address bar.
6. Open a chapter on FreeWebNovel. Click Novel RSVP and then **Open reader**.

## Reading

- Start at 200–250 words per minute and adjust to your preference.
- Start/Pause and the −10/+10 buttons control reading. The slider moves you through the chapter.
- You can pick a paragraph to start from.
- The focus letter stays in the center. Natural pauses give punctuation and paragraph breaks extra time.
- Click inside the reader to use the keyboard shortcuts: space and the left/right arrow keys. In input fields the keys keep their normal function.
- Switching to another tab pauses reading.
- After reloading or coming back, click the extension again; it restores your position if the text has not changed. Playback always starts manually.

## If the text is not detected correctly

Open **Check text or paste your own**. You can edit the text there. Alternatively, close the reader, select the text you want on the web page and open it again. Selected text takes priority.

Detection tries common chapter containers, including `.chr-c` and `#chr-content`. Other websites may work too, but this is not guaranteed. The extension does not fetch next chapters. Open the next chapter yourself and click the extension again.

## Privacy

The extension sends no text and contains no external services or analytics. Only the position, a text fingerprint, the page URL as a storage key and your speed setting are kept in local extension storage. Chapter text is not stored. Access to the page is only requested when you click the extension. Removing the extension deletes its storage.

## Status

This is a locally installable prototype for laptop use, not a published store version. The code targets Chrome and Brave with Manifest V3. An automated Chrome test verified text detection on a sample page, playing, pausing, choosing a paragraph, replacing text, opening twice and closing. The JavaScript syntax has also been checked. A real FreeWebNovel session and loading as an extension in your own browser still need to be tried; websites may change their markup.

Installation method: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked
