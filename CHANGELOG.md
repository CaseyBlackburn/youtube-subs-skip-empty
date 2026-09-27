# Changelog

Bump `@version` in `youtube-subs-skip-empty.user.js` with every change you want Tampermonkey to pick up; it only updates when the version number increases.

## 1.0.0 — 2026-09-27

- First release: keeps loading the Subscriptions feed past empty pages (up to 40 extra pages per "load more", until at least 12 videos).
- Supports Tampermonkey automatic updates via `@updateURL` / `@downloadURL`.
