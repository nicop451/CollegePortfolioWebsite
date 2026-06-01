# Personal Engineering Portfolio — Technical Write-up

**Nicholas Pietronuto**
[npietro@umich.edu](mailto:npietro@umich.edu) · [github.com/nicop451](https://github.com/nicop451) · [linkedin.com/in/nicholas-pietronuto](https://www.linkedin.com/in/nicholas-pietronuto/)

---

## Overview

A hand-coded personal portfolio website showcasing engineering and software projects — built entirely from scratch with vanilla HTML, CSS, and JavaScript. No frameworks, no build tools, no dependencies beyond a Google Font and MathJax for equation rendering.

**Live stack:** `index.html` + `styles.css` + `script.js` — three files, fully self-contained.

---

## Goals

- Load fast and stay fast, even with multiple looping videos on the page
- Work reliably on mobile (iOS Safari, Android Chrome) without any polyfill libraries
- Present work cleanly — the design should not compete with the projects themselves
- Be maintainable: a single developer should be able to read and edit the entire codebase in an hour

---

## Technical Architecture

### Media Gallery — Justified Flexbox with Dynamic Aspect Ratios

Rather than a fixed-column grid, project media uses a **justified flexbox row** where each item's `flex-grow` is set to its exact pixel aspect ratio via a CSS custom property. This means any combination of portrait, landscape, or square media tiles naturally fills the full row width without cropping or letterboxing.

```css
.project-media {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: clamp(0.6rem, 1.2vw, 1rem);
}

.media {
    /* flex-grow proportional to width/height ratio → justified row */
    flex-grow: var(--ar, 1);
    flex-basis: 0;
    min-width: clamp(200px, 24vw, 280px);
    aspect-ratio: var(--ar, 16 / 10);
    object-fit: cover;
}
```

Each `<img>` and `<video>` in the HTML carries the aspect ratio as an inline variable:

```html
<img class="media" style="--ar: 1.4138;" src="..." />
<video class="media" style="--ar: 0.5624;" data-src="..." />
```

On mobile (`< 640px`) each tile becomes full-width automatically — no JavaScript needed.

---

### Two-Phase Video Loading

The biggest performance challenge: the page has **10 looping videos** totalling several hundred megabytes. Naively loading them all on page load would make the page unusable on a phone.

The solution is a two-phase `IntersectionObserver` system:

**Phase 1 — Preload (1400px ahead of viewport)**
When a video is 1400px below the fold, the browser starts fetching the file in the background. By the time the user scrolls to it (~several seconds of reading), most of the video is already buffered.

**Phase 2 — Play (100px ahead of viewport)**
When the video is about to enter view, `play()` is called. Because Phase 1 already buffered the data, playback starts instantly.

```javascript
// Phase 1 — start network fetch well before the video is visible
var preloadIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (entry.isIntersecting) {
            attachSource(entry.target);   // sets src + calls load()
            preloadIO.unobserve(entry.target);
        }
    });
}, { rootMargin: '1400px 0px', threshold: 0 });

// Phase 2 — play/pause as the video enters/leaves the viewport
var playIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
            tryPlay(v);
        } else {
            if (!v.paused) v.pause();
        }
    });
}, { rootMargin: '100px 0px', threshold: 0.01 });
```

---

### Mobile Video Reliability — Bugs Found and Fixed

Getting autoplay right across iOS Safari, Android Chrome, and desktop browsers required fixing several non-obvious bugs:

**Bug 1 — `load()` deferred past `play()`**
The original code wrapped `v.load()` in `requestAnimationFrame()`. This meant `play()` was called on the *next synchronous turn* before `load()` had actually started — triggering an `AbortError` on mobile browsers that are strict about call ordering.

```javascript
// Before (broken on mobile):
requestAnimationFrame(function () { v.load(); });
// ... then play() called immediately after in another code path

// After (fixed):
v.src = v.dataset.src;
v.load();   // synchronous — must happen before play()
```

**Bug 2 — Silent error swallowing**
The `play()` promise rejection handler caught all errors identically and did nothing. `AbortError` (not loaded yet) and `NotAllowedError` (browser policy) need different responses:

```javascript
function tryPlay(v) {
    v.muted = true;   // re-assert before every call
    var p = v.play();
    if (p && typeof p.catch === 'function') {
        p.catch(function (err) {
            if (err && err.name === 'NotAllowedError') return; // policy block — can't retry
            // AbortError etc. — data not ready yet; retry once canplay fires
            v.addEventListener('canplay', function handler() {
                v.removeEventListener('canplay', handler);
                v.muted = true;
                v.play().catch(function () {});
            }, { once: true });
        });
    }
}
```

**Bug 3 — Safety-net path played before any data was buffered**
When a user arrives via anchor link (`#work`), multiple videos enter the viewport simultaneously before the preload observer can fire. The original code called `play()` immediately on a video with no buffered data. Fixed by waiting for `canplay` in this path:

```javascript
if (!v.dataset.attached) {
    attachSource(v);
    v.addEventListener('canplay', function handler() {
        v.removeEventListener('canplay', handler);
        tryPlay(v);
    }, { once: true });
} else {
    tryPlay(v);
}
```

**Bug 4 — No tab-visibility recovery**
Switching apps on mobile pauses videos. A `visibilitychange` listener resumes in-viewport videos when the user returns:

```javascript
document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    videos.forEach(function (v) {
        var r = v.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight && v.paused) tryPlay(v);
    });
});
```

---

### Lightbox

Clicking any project media opens a centered overlay with a blurred backdrop. Videos resume from their current timestamp for continuity. The original tile is paused while the lightbox is open and resumes on close.

The overlay is implemented with a single `<div id="lightbox">` injected once into the HTML — media is cloned into it dynamically, keeping the DOM small:

```javascript
function openLightbox(media) {
    stage.innerHTML = '';
    var enlarged;
    if (media.tagName === 'VIDEO') {
        enlarged = document.createElement('video');
        enlarged.src = media.currentSrc || media.src;
        enlarged.currentTime = media.currentTime;   // resume from same point
        enlarged.autoplay = true; enlarged.loop = true; enlarged.muted = media.muted;
        media.pause(); pausedSourceVideo = media;
    } else {
        enlarged = document.createElement('img');
        enlarged.src = media.currentSrc || media.src;
    }
    stage.appendChild(enlarged);
    lightbox.classList.add('is-open');
}
```

---

### CSS Design System

All visual constants live in a single `:root` block as CSS custom properties — colors, type scales, spacing, shadows, and easing curves. Changing the entire look of the site is a single block edit.

```css
:root {
    --bg:      #faf8f5;    /* warm off-white */
    --ink:     #111318;    /* near-black */
    --accent:  #2563eb;    /* single blue accent — used everywhere */
    --rule:    #e2ddd8;    /* warm hairline */

    --sans: 'Inter', system-ui, sans-serif;
    --mono: 'JetBrains Mono', Menlo, monospace;

    --shadow-lg: 0 2px 4px rgba(0,0,0,0.06), 0 20px 48px rgba(0,0,0,0.12);
    --ease: cubic-bezier(0.22, 0.61, 0.36, 1);
}
```

Fluid sizing throughout uses `clamp()` so the layout scales smoothly between mobile and wide desktop without any breakpoint jumps:

```css
font-size: clamp(2.4rem, 6vw, 4.75rem);
padding-block: clamp(1.75rem, 4vw, 3rem);
gap: clamp(0.6rem, 1.2vw, 1rem);
```

---

## Projects Showcased

| Project | Key disciplines |
|---|---|
| **HorizonNet** | Machine learning / computer vision |
| **Petrol-Powered Go-Kart** | Mechanical design, welding, fabrication |
| **FIRST Robotics — Shooter Arm** | CAD (Onshape), CNC, systems integration |
| **3D-Printable Prosthetic Hand** | Compliant mechanism design, 3D printing |
| **GPU-Accelerated Path Tracer** | CUDA/GPU programming, physically-based rendering |
| **Deal Finder AI** | Web scraping, LLM integration, Python |
| **Mandelbrot Fractal Plotter** | GPU compute, parallel algorithms |
| **3D Modelling for Future Fest** | Paid commercial 3D work (Blender) |
| **Physics Simulations** | Verlet integration, N-body, cloth simulation |

---

## What Was Intentionally Left Out

- **No framework** — React, Vue, etc. would have added a build step and hundreds of KB of JavaScript for a site that has no state management needs
- **No CSS preprocessor** — Custom properties handle variables natively; nesting is clean enough without Sass
- **No bundler** — Three files load in the right order via `<script defer>` and `<link rel="stylesheet">`; a bundler would add complexity without benefit
- **No lazy-loading library** — The two-phase `IntersectionObserver` approach was written from scratch specifically for this use case and is ~80 lines

---

*Built and iterated with the help of Cursor AI coding agent.*
