/* =========================================================
   Nicholas Pietronuto — Portfolio

   Video strategy:
     Phase 1 — preloadIO (rootMargin 1400px): attach src + call load()
               so the browser starts buffering well before the video
               enters view.
     Phase 2 — playIO (rootMargin 100px, threshold 0.01): call play()
               once the video is about to enter / is entering view.
               Pause when it leaves.

   Fixes vs. previous version:
     • v.load() is now called synchronously (not via rAF), so the
       browser actually starts fetching before tryPlay() is called.
     • data-attached flag is used instead of checking v.src (more
       reliable — v.src always returns an absolute URL string).
     • tryPlay() retries on canplay for non-permission errors
       (AbortError = "not loaded yet" on mobile; was silently dropped).
     • playIO safety-net path waits for canplay before playing, so
       we never call play() on an empty buffer.
     • visibilitychange handler resumes in-view videos when the user
       returns to the tab (important on mobile).
     • muted + playsinline re-asserted in JS (belt-and-suspenders for
       browsers that reset these programmatically).
   ========================================================= */

(function () {
    'use strict';

    /* ---------- Footer year ---------- */
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    /* ---------- Sticky header ---------- */
    var header = document.querySelector('.site-header');
    if (header) {
        var onScroll = function () {
            header.classList.toggle('is-scrolled', window.scrollY > 8);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    var hasIO = 'IntersectionObserver' in window;

    /* ---------- Reveal-on-scroll ---------- */
    var revealEls = document.querySelectorAll('.reveal');
    if (hasIO && revealEls.length) {
        var revealIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealIO.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach(function (el) { revealIO.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }

    /* ---------- Video helpers ---------- */
    var videos = Array.prototype.slice.call(document.querySelectorAll('video[data-src]'));

    /**
     * Attach the video source and begin buffering.
     * Safe to call multiple times — guarded by data-attached flag.
     */
    function attachSource(v) {
        if (v.dataset.attached) return;
        v.dataset.attached = '1';
        v.preload = 'auto';
        v.muted = true;                         // re-assert for autoplay policy
        v.setAttribute('playsinline', '');      // belt+suspenders for iOS
        v.src = v.dataset.src;
        v.load();                               // synchronous — must happen before play()
    }

    /**
     * Attempt playback. If it fails for a reason other than browser
     * autoplay policy (NotAllowedError), retry once canplay fires —
     * this handles the AbortError mobile browsers throw when play()
     * is called before enough data has buffered.
     */
    function tryPlay(v) {
        v.muted = true;                         // re-assert before every play() call
        var p = v.play();
        if (p && typeof p.catch === 'function') {
            p.catch(function (err) {
                // NotAllowedError = blocked by browser policy; nothing we can do.
                if (err && err.name === 'NotAllowedError') return;
                // Anything else (AbortError etc.) = data not ready yet; retry.
                v.addEventListener('canplay', function handler() {
                    v.removeEventListener('canplay', handler);
                    v.muted = true;
                    v.play().catch(function () {});
                }, { once: true });
            });
        }
    }

    if (hasIO && videos.length) {
        /* Phase 1 — start network fetch well before the video is visible */
        var preloadIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    attachSource(entry.target);
                    preloadIO.unobserve(entry.target);
                }
            });
        }, { rootMargin: '1400px 0px', threshold: 0 });

        /* Phase 2 — play/pause as the video enters/leaves the viewport */
        var playIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var v = entry.target;
                if (entry.isIntersecting) {
                    if (!v.dataset.attached) {
                        /*
                         * User jumped here directly (anchor link etc.) before
                         * preloadIO had a chance to fire. Attach source now,
                         * then wait for canplay so we never call play() on an
                         * empty buffer — the main mobile-reliability fix.
                         */
                        attachSource(v);
                        v.addEventListener('canplay', function handler() {
                            v.removeEventListener('canplay', handler);
                            tryPlay(v);
                        }, { once: true });
                    } else {
                        tryPlay(v);
                    }
                } else {
                    if (!v.paused) v.pause();
                }
            });
        }, { rootMargin: '100px 0px', threshold: 0.01 });

        videos.forEach(function (v) {
            preloadIO.observe(v);
            playIO.observe(v);
        });

    } else {
        /* No IntersectionObserver — load and play everything up front */
        videos.forEach(function (v) {
            attachSource(v);
            tryPlay(v);
        });
    }

    /* ---------- Tab visibility — resume in-view videos on return ---------- */
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        videos.forEach(function (v) {
            if (!v.dataset.attached) return;
            var r = v.getBoundingClientRect();
            if (r.bottom > 0 && r.top < window.innerHeight && v.paused) {
                tryPlay(v);
            }
        });
    });

    /* ---------- Lightbox ---------- */
    var lightbox = document.getElementById('lightbox');
    if (lightbox) {
        var stage = lightbox.querySelector('.lightbox-stage');
        var closeBtn = lightbox.querySelector('.lightbox-close');
        var pausedSourceVideo = null;

        function openLightbox(media) {
            stage.innerHTML = '';
            var enlarged;
            if (media.tagName === 'VIDEO') {
                enlarged = document.createElement('video');
                enlarged.src = media.currentSrc || media.src || media.dataset.src || '';
                enlarged.controls = true;
                enlarged.autoplay = true;
                enlarged.loop = true;
                enlarged.muted = media.muted;
                enlarged.setAttribute('playsinline', '');
                if (!isNaN(media.currentTime) && media.currentTime > 0) {
                    enlarged.currentTime = media.currentTime;
                }
                if (!media.paused) {
                    media.pause();
                    pausedSourceVideo = media;
                }
            } else {
                enlarged = document.createElement('img');
                enlarged.src = media.currentSrc || media.src;
                enlarged.alt = media.alt || '';
            }
            stage.appendChild(enlarged);
            lightbox.classList.add('is-open');
            lightbox.setAttribute('aria-hidden', 'false');
            document.body.classList.add('lightbox-open');
            requestAnimationFrame(function () { closeBtn.focus(); });
        }

        function closeLightbox() {
            if (!lightbox.classList.contains('is-open')) return;
            lightbox.classList.remove('is-open');
            lightbox.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('lightbox-open');
            if (pausedSourceVideo) {
                tryPlay(pausedSourceVideo);
                pausedSourceVideo = null;
            }
            setTimeout(function () { stage.innerHTML = ''; }, 260);
        }

        document.querySelectorAll('.project-media .media').forEach(function (el) {
            el.addEventListener('click', function () { openLightbox(el); });
        });

        closeBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', function (e) {
            if (e.target === lightbox) closeLightbox();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeLightbox();
        });
    }
})();
