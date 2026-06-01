(function () {
    'use strict';

    var STORAGE_KEY = 'nico.books.library.v1';
    var BOOK_SEARCH = '/api/books/search';

    var form = document.getElementById('book-search-form');
    var promptInput = document.getElementById('book-prompt');
    var searchButton = document.getElementById('search-button');
    var clearButton = document.getElementById('clear-button');
    var searchStatus = document.getElementById('search-status');
    var resultsEl = document.getElementById('results');
    var libraryEl = document.getElementById('library');
    var libraryCount = document.getElementById('library-count');
    var filterChips = document.querySelectorAll('.filter-chip');

    if (!form || !resultsEl || !libraryEl) return;

    var currentFilter = 'all';
    var library = loadLibrary();
    renderLibrary();

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var prompt = (promptInput.value || '').trim();
        if (!prompt) return;
        searchBooks(prompt);
    });

    clearButton.addEventListener('click', function () {
        promptInput.value = '';
        resultsEl.innerHTML = '';
        searchStatus.textContent = '';
        promptInput.focus();
    });

    filterChips.forEach(function (chip) {
        chip.addEventListener('click', function () {
            filterChips.forEach(function (c) {
                c.classList.remove('is-active');
                c.setAttribute('aria-selected', 'false');
            });
            chip.classList.add('is-active');
            chip.setAttribute('aria-selected', 'true');
            currentFilter = chip.dataset.filter || 'all';
            renderLibrary();
        });
    });

    /* ---------- Search (Open Library — avoids Google Books 429 rate limits) ---------- */

    function searchBooks(prompt) {
        searchButton.disabled = true;
        searchButton.classList.add('is-loading');
        searchStatus.textContent = 'Looking for books that match…';
        resultsEl.innerHTML = '';

        var query = buildQuery(prompt);
        var url = BOOK_SEARCH + '?q=' + encodeURIComponent(query) +
                  '&limit=12&fields=key,title,author_name,cover_i,first_sentence,subject,edition_key';

        fetch(url)
            .then(function (r) {
                if (r.status === 429) {
                    throw new Error('Search is busy — wait a moment and try again.');
                }
                if (!r.ok) throw new Error('Search failed (' + r.status + ')');
                return r.json();
            })
            .then(function (data) {
                var docs = (data && data.docs) || [];
                if (!docs.length) {
                    searchStatus.textContent = 'No matches found. Try rephrasing your prompt.';
                    return;
                }
                var books = docs.map(fromOpenLibrary).filter(Boolean);
                searchStatus.textContent = 'Found ' + books.length + ' books for you.';
                renderResults(books);
            })
            .catch(function (err) {
                searchStatus.textContent = 'Something went wrong: ' + err.message;
            })
            .finally(function () {
                searchButton.disabled = false;
                searchButton.classList.remove('is-loading');
            });
    }

    function buildQuery(prompt) {
        var cleaned = prompt.replace(/[\n\r"]/g, ' ').trim().slice(0, 256);
        // Strip filler words so Open Library gets useful keywords from natural prompts
        var filler = /\b(i|me|my|want|need|looking|for|books?|about|that|are|is|the|a|an|some|recommend(?:ations?)?|please|read(?:ing)?|like|feel|mood|in|or|and|with|set|find|show|give)\b/gi;
        var keywords = cleaned.replace(filler, ' ').replace(/\s+/g, ' ').trim();
        return keywords.length >= 3 ? keywords : cleaned;
    }

    function fromOpenLibrary(doc) {
        if (!doc || !doc.title) return null;

        var key = doc.key || '';
        var id = key.replace(/^\//, '').replace(/\//g, '-') || ('ol-' + doc.title.slice(0, 40));
        var cover = doc.cover_i
            ? 'https://covers.openlibrary.org/b/id/' + doc.cover_i + '-M.jpg'
            : '';

        var blurb = '';
        if (doc.first_sentence && doc.first_sentence.length) {
            blurb = doc.first_sentence[0];
        } else if (doc.subject && doc.subject.length) {
            blurb = doc.subject.slice(0, 4).join(' · ');
        }

        var editionKey = doc.edition_key && doc.edition_key[0];
        var link = editionKey
            ? 'https://openlibrary.org/books/' + editionKey
            : (key ? 'https://openlibrary.org' + key : 'https://openlibrary.org');

        return {
            id: id,
            title: doc.title,
            authors: doc.author_name || [],
            blurb: blurb,
            cover: cover,
            link: link
        };
    }

    /* ---------- Render ---------- */

    function renderResults(books) {
        resultsEl.innerHTML = '';
        books.forEach(function (book) {
            resultsEl.appendChild(makeBookCard(book, false));
        });
    }

    function renderLibrary() {
        libraryEl.innerHTML = '';
        var saved = library.slice();
        var filtered = currentFilter === 'all'
            ? saved
            : saved.filter(function (b) { return b.status === currentFilter; });

        libraryCount.textContent = String(saved.length);

        if (!filtered.length) {
            var empty = document.createElement('p');
            empty.className = 'placeholder';
            empty.id = 'library-empty';
            empty.textContent = saved.length
                ? 'No books with this status yet.'
                : 'No saved books yet. Save one from the recommendations above.';
            libraryEl.appendChild(empty);
            return;
        }

        filtered.forEach(function (book) {
            libraryEl.appendChild(makeBookCard(book, true));
        });
    }

    function makeBookCard(book, isSaved) {
        var card = document.createElement('article');
        card.className = 'book-card';
        card.dataset.bookId = book.id;

        var coverWrap = document.createElement('div');
        coverWrap.className = 'book-cover';
        if (book.cover) {
            var img = document.createElement('img');
            img.src = book.cover;
            img.alt = 'Cover of ' + book.title;
            img.loading = 'lazy';
            coverWrap.appendChild(img);
        } else {
            coverWrap.classList.add('book-cover-empty');
            coverWrap.textContent = initials(book.title);
        }

        var body = document.createElement('div');
        body.className = 'book-body';

        var title = document.createElement('h3');
        title.className = 'book-title';
        title.textContent = book.title;

        var author = document.createElement('p');
        author.className = 'book-author';
        author.textContent = book.authors && book.authors.length
            ? book.authors.join(', ')
            : 'Unknown author';

        var blurb = document.createElement('p');
        blurb.className = 'book-blurb';
        blurb.textContent = shortBlurb(book.blurb);

        body.appendChild(title);
        body.appendChild(author);
        body.appendChild(blurb);

        var actions = document.createElement('div');
        actions.className = 'book-actions';

        var saved = findInLibrary(book.id);
        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn-small ' + (saved ? 'btn-ghost is-saved' : 'btn-primary');
        saveBtn.textContent = saved ? 'Saved' : 'Save';
        saveBtn.addEventListener('click', function () {
            toggleSave(book, saveBtn, card);
        });

        var statusSelect = document.createElement('select');
        statusSelect.className = 'status-select';
        statusSelect.setAttribute('aria-label', 'Reading status');
        [
            { v: 'want', l: 'Want to Read' },
            { v: 'reading', l: 'Reading' },
            { v: 'read', l: 'Read' }
        ].forEach(function (opt) {
            var o = document.createElement('option');
            o.value = opt.v;
            o.textContent = opt.l;
            statusSelect.appendChild(o);
        });
        statusSelect.value = (saved && saved.status) || 'want';
        statusSelect.disabled = !saved;
        statusSelect.addEventListener('change', function () {
            updateStatus(book.id, statusSelect.value);
        });

        actions.appendChild(saveBtn);
        actions.appendChild(statusSelect);

        if (isSaved) {
            var removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn-small btn-danger';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', function () {
                removeFromLibrary(book.id);
            });
            actions.appendChild(removeBtn);
        }

        body.appendChild(actions);
        card.appendChild(coverWrap);
        card.appendChild(body);
        return card;
    }

    function shortBlurb(text) {
        if (!text) return 'No description available.';
        var clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean.length <= 180) return clean;
        return clean.slice(0, 180).replace(/\s+\S*$/, '') + '…';
    }

    function initials(title) {
        return (title || '?').trim().slice(0, 2).toUpperCase();
    }

    /* ---------- Library state ---------- */

    function loadLibrary() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function saveLibrary() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
        } catch (e) { /* quota or disabled */ }
    }

    function findInLibrary(id) {
        for (var i = 0; i < library.length; i++) {
            if (library[i].id === id) return library[i];
        }
        return null;
    }

    function toggleSave(book, saveBtn, card) {
        var existing = findInLibrary(book.id);
        if (existing) {
            removeFromLibrary(book.id);
            saveBtn.textContent = 'Save';
            saveBtn.classList.remove('btn-ghost', 'is-saved');
            saveBtn.classList.add('btn-primary');
            var select = card.querySelector('.status-select');
            if (select) select.disabled = true;
        } else {
            library.push({
                id: book.id,
                title: book.title,
                authors: book.authors,
                blurb: book.blurb,
                cover: book.cover,
                link: book.link,
                status: 'want',
                addedAt: Date.now()
            });
            saveLibrary();
            saveBtn.textContent = 'Saved';
            saveBtn.classList.add('btn-ghost', 'is-saved');
            saveBtn.classList.remove('btn-primary');
            var sel = card.querySelector('.status-select');
            if (sel) {
                sel.disabled = false;
                sel.value = 'want';
            }
            renderLibrary();
        }
    }

    function updateStatus(id, status) {
        var entry = findInLibrary(id);
        if (!entry) return;
        entry.status = status;
        saveLibrary();
        renderLibrary();
    }

    function removeFromLibrary(id) {
        library = library.filter(function (b) { return b.id !== id; });
        saveLibrary();
        renderLibrary();
        var openCard = resultsEl.querySelector('[data-book-id="' + cssEscape(id) + '"]');
        if (openCard) {
            var btn = openCard.querySelector('button');
            var sel = openCard.querySelector('.status-select');
            if (btn) {
                btn.textContent = 'Save';
                btn.classList.remove('btn-ghost', 'is-saved');
                btn.classList.add('btn-primary');
            }
            if (sel) sel.disabled = true;
        }
    }

    function cssEscape(s) {
        if (window.CSS && CSS.escape) return CSS.escape(s);
        return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    }
})();
