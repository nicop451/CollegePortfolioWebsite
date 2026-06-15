# Agent Workflow — Nicholas Pietronuto Portfolio

**Read this file at the start of every user prompt and again before sending the final response.**

---

## Hosting (GitHub Pages only)

This site is a static portfolio published via **GitHub Pages** — not Fly.io.

- Repo: `https://github.com/nicop451/CollegePortfolioWebsite`
- Live URL: **https://nicholaspietronuto.com** (via `CNAME` file)
- Source branch: `main` (root)

After site changes: commit and push to `main`. GitHub Pages rebuilds automatically.

---

## Project layout

| Active (published) | Archived (not served) |
|--------------------|------------------------|
| `index.html`, `styles.css`, `script.js`, `Assets/`, `experimental.html`, `CNAME` | `_storage/` — dashboard app, Fly deploy files, backups |

---

## Portfolio notes

- Vanilla HTML/CSS/JS — no build step
- Videos use two-phase IntersectionObserver lazy loading in `script.js`
- Asset paths use forward slashes (`Assets/Images/...`)

---

## End-of-task checklist

- [ ] Read this file again
- [ ] Changes committed and pushed to `main` if site files changed
- [ ] User told to verify at nicholaspietronuto.com
