/* =========================================================
   Nicholas Pietronuto — Portfolio
   - Two-phase video loading:
       Phase 1 — preload eagerly when ~1400px from viewport
       Phase 2 — play once the video is actually entering view
     This way the video is already buffered by the time the user
     scrolls to it, so playback starts instantly.
   - Pause videos that leave the viewport
   - Reveal-on-scroll for .reveal elements
   - Sticky header shadow when scrolled
   - Footer year stamp
   ========================================================= */

(function () {
    'use strict';

    /* ---------- Footer year ---------- */
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    /* ---------- Sticky header shadow ---------- */
    var header = document.querySelector('.site-header');
    if (header) {
        var onScroll = function () {
            if (window.scrollY > 8) header.classList.add('is-scrolled');
            else header.classList.remove('is-scrolled');
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* ---------- IntersectionObserver capability check ---------- */
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
        // Fallback: just show everything
        revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }

    /* ---------- Lazy-load and play/pause videos ---------- */
    var videos = document.querySelectorAll('video[data-src]');

    function attachSource(v) {
        if (!v.src && v.dataset.src) {
            // Switch to eager buffering as soon as we attach the source so
            // the browser starts downloading immediately, not just metadata.
            v.preload = 'auto';
            v.src = v.dataset.src;
            // Defer load() until next frame to avoid layout thrash on init
            requestAnimationFrame(function () { v.load(); });
        }
    }

    function tryPlay(v) {
        var p = v.play();
        if (p && typeof p.catch === 'function') {
            // Ignore autoplay rejections (e.g. tab in background)
            p.catch(function () { });
        }
    }

    if (hasIO && videos.length) {
        // Phase 1 — far ahead: kick off the network fetch so the video
        // is already buffered by the time the user scrolls to it.
        var preloadIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    attachSource(entry.target);
                    preloadIO.unobserve(entry.target);
                }
            });
        }, { rootMargin: '1400px 0px', threshold: 0 });

        // Phase 2 — actual viewport: start (and pause) playback.
        var playIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var v = entry.target;
                if (entry.isIntersecting) {
                    // Safety net: if preload somehow didn't fire (e.g. user
                    // jumped via anchor link), attach the source now too.
                    attachSource(v);
                    tryPlay(v);
                } else if (!v.paused) {
                    v.pause();
                }
            });
        }, { rootMargin: '100px 0px', threshold: 0.01 });

        videos.forEach(function (v) {
            preloadIO.observe(v);
            playIO.observe(v);
        });
    } else {
        // Fallback: load every video immediately
        videos.forEach(function (v) {
            if (v.dataset.src) {
                v.preload = 'auto';
                v.src = v.dataset.src;
                v.load();
                tryPlay(v);
            }
        });
    }

    /* ---------- Lightbox: click any project media to enlarge ---------- */
    var lightbox = document.getElementById('lightbox');
    if (lightbox) {
        var stage = lightbox.querySelector('.lightbox-stage');
        var closeBtn = lightbox.querySelector('.lightbox-close');
        var pausedSourceVideo = null;

        function openLightbox(media) {
            // Clear any previous content first
            stage.innerHTML = '';

            var enlarged;
            if (media.tagName === 'VIDEO') {
                enlarged = document.createElement('video');
                enlarged.src = media.currentSrc || media.src || media.dataset.src || '';
                enlarged.controls = true;
                enlarged.autoplay = true;
                enlarged.loop = true;
                enlarged.muted = media.muted;
                enlarged.playsInline = true;
                // If the source video is partway through, start the enlarged
                // copy at the same point for visual continuity.
                if (!isNaN(media.currentTime) && media.currentTime > 0) {
                    enlarged.currentTime = media.currentTime;
                }
                // Pause the original while the lightbox is showing
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
            // Move focus to the close button for keyboard users
            requestAnimationFrame(function () { closeBtn.focus(); });
        }

        function closeLightbox() {
            if (!lightbox.classList.contains('is-open')) return;
            lightbox.classList.remove('is-open');
            lightbox.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('lightbox-open');
            // Resume the original video if we paused it on open
            if (pausedSourceVideo) {
                tryPlay(pausedSourceVideo);
                pausedSourceVideo = null;
            }
            // Wait for fade-out before tearing down content (so we don't
            // see the media disappear before the overlay fades).
            setTimeout(function () {
                stage.innerHTML = '';
            }, 260);
        }

        // Bind clicks on every project-media item (this naturally excludes
        // the hero photo, which is not inside .project-media).
        var clickable = document.querySelectorAll('.project-media .media');
        clickable.forEach(function (el) {
            el.addEventListener('click', function () { openLightbox(el); });
        });

        // Close handlers
        closeBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', function (e) {
            // Click outside the stage (i.e. on the backdrop) closes
            if (e.target === lightbox) closeLightbox();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeLightbox();
        });
    }
})();
