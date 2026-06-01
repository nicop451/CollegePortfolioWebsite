(function () {
    'use strict';

    /* ---------- Footer year ---------- */
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    /* ---------- Service worker ---------- */
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
    }

    /* ---------- Click particle effect ----------
       Spawns a small radial burst from the cursor whenever the user
       clicks an interactive element. Cheap, additive, and respects
       reduced-motion via CSS. */

    var PARTICLE_SELECTOR =
        'button, a, .filter-chip, .status-select, [data-particles]';
    var COLORS = ['#93c5fd', '#bfdbfe', '#dbeafe'];

    var prefersReduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReduced) {
        document.addEventListener('click', function (e) {
            var target = e.target && e.target.closest
                ? e.target.closest(PARTICLE_SELECTOR)
                : null;
            if (!target) return;
            if (target.disabled) return;
            emitBurst(e.clientX, e.clientY);
        }, { passive: true });
    }

    function emitBurst(x, y) {
        var count = 10;
        var frag = document.createDocumentFragment();
        var particles = [];

        for (var i = 0; i < count; i++) {
            var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
            var distance = 28 + Math.random() * 34;
            var dx = Math.cos(angle) * distance;
            var dy = Math.sin(angle) * distance;
            var size = 4 + Math.random() * 4;

            var p = document.createElement('span');
            p.className = 'click-particle';
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.background = COLORS[i % COLORS.length];
            p.style.setProperty('--dx', dx.toFixed(1) + 'px');
            p.style.setProperty('--dy', dy.toFixed(1) + 'px');
            p.style.animationDuration = (520 + Math.random() * 260) + 'ms';
            frag.appendChild(p);
            particles.push(p);
        }

        document.body.appendChild(frag);

        particles.forEach(function (p) {
            p.addEventListener('animationend', function () {
                if (p.parentNode) p.parentNode.removeChild(p);
            }, { once: true });
        });

        // Safety net in case animationend doesn't fire (tab inactive, etc.)
        setTimeout(function () {
            particles.forEach(function (p) {
                if (p.parentNode) p.parentNode.removeChild(p);
            });
        }, 1200);
    }
})();
