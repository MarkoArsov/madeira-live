# Mira — Madeira Live

A single-user Progressive Web App for monitoring live webcams across Madeira and Porto Santo, with current weather at each spot. Built to feel like a premium native iOS app pinned to the home screen.

Two pages, swipeable: **Map** (Leaflet + custom pins) and **Grid** (a wall of live tiles, filtered by region).

---

## Local development

No build step. Serve the directory with any static file server.

```bash
# Python
python -m http.server 8765

# Node
npx serve .
```

Open `http://localhost:8765` in Chrome or Safari. The service worker only activates on `localhost`, `127.0.0.1`, or HTTPS.

Hard-refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`) to bypass the SW cache while iterating on `index.html`. Edits to `cameras.json` apply on the next normal refresh — the SW serves it stale-while-revalidate so the on-disk file always becomes the source within one reload.

---

## Deploy to GitHub Pages

1. Push to GitHub.
2. Repository → **Settings** → **Pages** → Source: **Deploy from a branch** → `main` → `/ (root)` → Save.
3. Wait ~30s. Open `https://<user>.github.io/<repo>/`.

That's it. The manifest, service worker, and icons all use relative paths so the app works under any sub-path.

To install on iPhone: open the URL in Safari → **Share** → **Add to Home Screen**.

---

## Editing cameras

`cameras.json` is the only data file. Each entry is one of two shapes:

```json
{ "name": "Funchal", "type": "youtube", "id": "afyrMxe0qjg", "lat": 32.65, "lng": -16.91, "region": "Funchal" }
{ "name": "Porto Moniz", "type": "iframe", "url": "https://stream.madeirawebcams.com/…", "lat": 32.86, "lng": -17.17, "region": "North Coast" }
```

| Field    | Type     | Notes |
|----------|----------|-------|
| `name`   | string   | Shown on tile overlay and detail sheet. |
| `type`   | `"youtube"` or `"iframe"` | Determines how the stream URL is built. |
| `id`     | string   | YouTube video ID. Required for `type: "youtube"`. |
| `url`    | string   | Direct embed URL. Required for `type: "iframe"`. Include `autoplay=1&mute=1` in the query string. |
| `lat`    | number   | WGS84 latitude. |
| `lng`    | number   | WGS84 longitude. |
| `region` | string   | One of: `Funchal`, `North Coast`, `South`, `Beaches`, `Porto Santo`, `East`, `Mountains`. The grid filter chips map `South Coast` → `South`; `East` and `Mountains` only appear under `All`. |

Save the file → refresh the app. No rebuild.

---

## When a stream dies

YouTube channels occasionally rotate or take down their live streams.

**For a YouTube cam:** find the channel's new live URL (e.g. `https://www.youtube.com/watch?v=NEW_ID`). Replace the entry's `"id"` with the new 11-character video ID. Reload.

**For an iframe cam:** visit `madeirawebcams.com`, find the camera's embed page, copy the iframe `src`, replace the entry's `"url"`. Reload.

If a camera is permanently gone, just delete its object from the array.

---

## Architecture (one-screen tour)

- **Single file PWA.** All CSS and JS live inline in `index.html`. Only `cameras.json` is external so it can be edited without touching code.
- **Preact + htm via CDN.** Lightweight, no build step, runtime is ~10 KB.
- **Leaflet 1.9 via CDN, lazy-loaded** on first navigation to the Map page; CartoDB Positron / DarkMatter tiles swap with the theme.
- **Grid iframes.** `IntersectionObserver` with `rootMargin: 200px` mounts iframes as tiles enter view, with a 2 s grace before unmounting. Capped at 6 simultaneous mounts (oldest non-visible evicted first) to keep iPhone battery happy.
- **Weather.** Open-Meteo `/v1/forecast`, cached in `sessionStorage` for 10 minutes, keyed by lat/lng rounded to 3 decimals. Pull-to-refresh on the grid forces a re-fetch for currently-visible cameras.
- **Service worker.** Precaches the app shell. Streams (`youtube.com`, `madeirawebcams.com`), tiles (`basemaps.cartocdn.com`, `unpkg.com`), and the weather API are never cached.
- **Single theme.** No dark mode. The app lives in one warm cream-and-forest world.

Design tokens (in `:root` of `index.html`) — *Laurisilva*:
- Surfaces: `#FFF8EC` cream / `#F4ECD8` sunken / `#FFFFFF` elevated
- Forest: `#546B41` (primary action, brand, active tab)
- Sage: `#99AD7A` (secondary)
- Sand: `#DCCCAC` (dividers, grabber)
- Ink: `#2A3A1F` (deepest forest, text)
- LIVE indicator: `#C8412A` (the only warm tone in the system, used only on live dots)
- Typography pairing: Geist for UI, Fraunces for titles and tabular weather numerals

---

## Out of scope

No accounts, favourites, sharing, push notifications, or backend. If you find yourself wanting one, you probably want a different app.
