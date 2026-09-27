# YouTube Subscriptions: skip empty pages

A userscript that stops YouTube's **Subscriptions** page from getting stuck on grey placeholder cards.

**[➜ Install](https://raw.githubusercontent.com/CaseyBlackburn/youtube-subs-skip-empty/main/youtube-subs-skip-empty.user.js)** (requires [Tampermonkey](https://www.tampermonkey.net/))

## The problem

If you use **Hide** on videos in your Subscriptions feed (to clear out ones you've watched or don't plan to watch), the feed can end up showing nothing but grey loading cards:

- YouTube's server leaves hidden videos out of the feed, so pages covering days or weeks where you've hidden everything come back **empty**.
- When YouTube's page gets an empty page, it **stops asking for more**, even though older pages still have videos you haven't hidden.

The result is a feed that looks broken, even though YouTube still has plenty of videos to show you.

## What this script does

When a "load more" comes back with fewer than 12 videos, the script keeps requesting the next page (up to 40 pages) until it has enough, then hands everything to YouTube's page as a normal response. You get YouTube's normal video cards, menus, and infinite scrolling, and **Hide** keeps working the way it always has.

It only changes Subscriptions feed requests on the desktop site (`www.youtube.com`). Everything else passes through untouched.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. **Chrome, Edge, Opera and other Chromium browsers:** open your browser's extensions page, and either turn on **Developer mode** or open Tampermonkey's **Details** and turn on **Allow User Scripts**. (Tampermonkey shows a warning if this is needed.)
3. Click **[Install](https://raw.githubusercontent.com/CaseyBlackburn/youtube-subs-skip-empty/main/youtube-subs-skip-empty.user.js)**, then click **Install** on the Tampermonkey page that opens.
4. Refresh your Subscriptions page.

To use it in private/incognito windows, also turn on **Allow in private** (or **Allow in Incognito**) for Tampermonkey.

Other userscript managers (Violentmonkey, Greasemonkey) haven't been tested.

## Updates

Tampermonkey checks for new versions automatically (by default once a day) using the script's `@updateURL`. To check right away, click the Tampermonkey toolbar icon → **Check for userscript updates**.

## Settings

Two values at the top of the script control how hard it looks:

| Setting | Default | Meaning |
|---|---|---|
| `MIN_VIDEOS` | `12` | Keep loading pages until a "load more" has at least this many videos. |
| `MAX_EXTRA_PAGES` | `40` | Give up after this many extra pages (each page covers a few days of uploads), and try again on the next scroll. |

If you edit these, turn off **Check for updates** for the script in Tampermonkey, or an update will overwrite your changes.

## What to expect

- The first load after you've hidden a lot of videos may show grey cards for a few seconds while the script works through empty pages.
- Each scroll to the bottom adds at least `MIN_VIDEOS` videos (or whatever's left).
- It can only show videos YouTube still returns. It doesn't unhide anything.

## How it works

The script wraps `window.fetch` before YouTube's code loads. When YouTube requests the next page of the Subscriptions feed (`/youtubei/v1/browse` with a continuation token for `FEsubscriptions`) and the response has fewer than `MIN_VIDEOS` videos, the script replays the request with each following continuation token, collects the videos, and returns one combined response ending with the last continuation token, so YouTube's infinite scroll picks up where it left off.

YouTube sends these requests with a gzip-compressed JSON body. The script decompresses it to read the token, and sends its own follow-up requests as plain JSON with YouTube's original headers.

## Privacy

The script only talks to YouTube, using the same requests YouTube's page makes. It doesn't collect, store, or send data anywhere else.

## Troubleshooting

- **Nothing changes:** Make sure the script is enabled in Tampermonkey and that user scripts are allowed (step 2 above), then refresh.
- **Still stuck after a while:** Open DevTools (F12) → Console and look for lines starting with `[subs-skip-empty]`. Turn on the **Verbose** log level to see them. If YouTube has changed how the feed works, please [open an issue](https://github.com/CaseyBlackburn/youtube-subs-skip-empty/issues).

## License

[MIT](LICENSE)
