# Agent Workflow — Nico Dashboard

**Read this file at the start of every user prompt and again before sending the final response.**

---

## Deploy (required)

After any change to the live app (HTML, CSS, JS, nginx, Dockerfile, fly.toml, icons, manifest, service worker):

1. Run from project root: `flyctl deploy --remote-only`
2. Confirm deploy succeeded before telling the user the work is done
3. Live app: **https://nicholaspietronuto.fly.dev/** (Fly app: `nicholaspietronuto`)

Do not skip deploy unless the user explicitly says not to deploy for that task.

---

## Project layout

| Active (deployed) | Archived (not served) |
|-------------------|------------------------|
| `index.html`, `books.html`, `styles.css`, `script.js`, `books.js`, `sw.js`, `manifest.json`, `icons/` | `_storage/` — old portfolio, assets, local dev |

Deploy stack: nginx on Fly.io (`Dockerfile`, `fly.toml`, `nginx.conf`).

---

## UI conventions

- Dark glass dashboard style (`--bg`, `--accent`, `--glass-bg`, Inter + JetBrains Mono)
- Global click particle effect lives in `script.js` — keep it on all pages
- New features: link from dashboard with `text-link` style (e.g. `books -->`)

---

## Books feature

- Search uses **Open Library** via same-origin proxy `/api/books/search` (never call Google Books or openlibrary.org directly from the browser)
- Library persisted in browser `localStorage` (`nico.books.library.v1`)

---

## End-of-task checklist

- [ ] Read this file again
- [ ] Changes match existing UI/style
- [ ] `flyctl deploy --remote-only` run if app files changed
- [ ] User told where to verify (fly.dev URL)
