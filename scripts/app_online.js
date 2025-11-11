// app_online.js — FINAL consolidated build
// - reads content.json
// - supports indexOnline.html + letter pages (alif.html etc.)
// - language persistence & layout flip
// - dropdown translation & reorder inside setLanguage()
// - SEO thumb grid injection (small images)
// - Google ads insertion every 4 items
// - autoplay next video + auto-scroll into view
// - search toggle (🔍 / ✖️), loadMore scroll-up behavior
(function () {
    const CONTENT_FILE = 'content.json';

    // UI elements (may be absent on letter pages)
    const grid = document.getElementById('grid');
    const loading = document.getElementById('loading');
    const qInput = document.getElementById('q');
    const doSearchBtn = document.getElementById('doSearch');
    const loadMoreBtn = document.getElementById('loadMore');
    const tabVideos = document.getElementById('tabVideos');
    const tabShorts = document.getElementById('tabShorts');
    const tabPlaylists = document.getElementById('tabPlaylists');
    const langToggle = document.getElementById('langToggle');
    const burgerBtn = document.getElementById('burgerBtn');
    const navBar = document.getElementById('navBar');
    const seoThumbs = document.getElementById('seo-thumbs');
    const about = document.getElementById('about');
    const contact = document.getElementById('contact');

    let content = { videos: [], shorts: [], playlists: [], letters: {} };
    let contentShortsSet = new Set();
    let lang = localStorage.getItem('kjkids_lang') || 'ar';
    let currentTab = 'videos';
    let visible = 12;
    let playingList = [];
    let players = {};
    let isLetterPage = false;
    let currentLetterKey = null;

    // small helpers
    function esc(s) { return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
    function timeAgo(d) {
        const diff = Math.floor((Date.now() - d.getTime()) / 1000);
        if (diff < 60) return lang === 'ar' ? 'منذ لحظات' : 'moments ago';
        if (diff < 3600) return Math.floor(diff / 60) + (lang === 'ar' ? ' دقيقة' : ' min');
        if (diff < 86400) return Math.floor(diff / 3600) + (lang === 'ar' ? ' ساعة' : ' hr');
        return Math.floor(diff / 86400) + (lang === 'ar' ? ' يوم' : ' days');
    }

    // Flip language, translate navbar/dropdown and reorder items (all inside setLanguage)
    function setLanguage(l) {
        lang = l;
        localStorage.setItem('kjkids_lang', l);
        document.documentElement.lang = (l === 'ar') ? 'ar' : 'en';
        document.documentElement.dir = (l === 'ar') ? 'rtl' : 'ltr';

        // also update body class to allow CSS direction sensitive styling
        document.body.classList.toggle('rtl', l === 'ar');
        document.body.classList.toggle('ltr', l !== 'ar');

        // update basic UI strings
        if (langToggle) langToggle.textContent = (l === 'ar' ? 'English' : 'العربية');
        if (doSearchBtn) doSearchBtn.textContent = '🔍';
        if (loadMoreBtn) loadMoreBtn.textContent = (l === 'ar' ? 'تحميل المزيد' : 'Load More');
        if (about) about.textContent = (l === 'ar' ? 'من نحن' : 'About');
        if (contact) contact.textContent = (l === 'ar' ? 'اتصل بنا' : 'Contact');
        const sub = document.getElementById('subscribeBtn');
        if (sub) sub.textContent = (l === 'ar' ? 'اشترك' : 'Subscribe');
        if (tabVideos) tabVideos.textContent = (l === 'ar' ? '🎬 الفيديوهات' : '🎬 Videos');
        if (tabShorts) tabShorts.textContent = (l === 'ar' ? '📱 الشورتات' : '📱 Shorts');
        if (tabPlaylists) tabPlaylists.textContent = (l === 'ar' ? '🎵 القوائم' : '🎵 Playlists');
        if (qInput) qInput.placeholder = (l === 'ar' ? 'ابحث عن حرف، عنوان أو وصف (مثال: الألف)' : 'Search for letter, title or description (e.g. Alif)');

        // dropdown / lessons translation + reorder
        const dropdownContainer = document.querySelector('.nav-dropdown');
        const dropdownBtn = dropdownContainer ? dropdownContainer.querySelector('.dropdown-btn') : null;
        const dropdownContent = dropdownContainer ? dropdownContainer.querySelector('.dropdown-content') : null;
        const aboutLink = document.querySelector('a[href="about.html"]');
        const contactLink = document.querySelector('a[href="contact.html"]');

        // letters list - same order always, but text changes
        const letters = [
            ['الألف', 'Alif'], ['الباء', 'Baa'], ['التاء', 'Taa'], ['الثاء', 'Thaa'],
            ['الجيم', 'Jeem'], ['الحاء', 'Haa'], ['الخاء', 'Khaa'], ['الدال', 'Daal'],
            ['الذال', 'Thaal'], ['الراء', 'Raa'], ['الزاي', 'Zaay'], ['السين', 'Seen'],
            ['الشين', 'Sheen'], ['الصاد', 'Saad'], ['الضاد', 'Daad'], ['الطاء', '6aa'],
            ['الظاء', 'Thaa2'], ['العين', 'Ain'], ['الغين', 'Ghain'], ['الفاء', 'Faa'],
            ['القاف', 'Qaaf'], ['الكاف', 'Kaaf'], ['اللام', 'Laam'], ['الميم', 'Meem'],
            ['النون', 'Noon'], ['الهاء', 'Haa2'], ['الواو', 'Waaw'], ['الياء', 'Yaa']
        ];

        if (dropdownBtn) dropdownBtn.textContent = (l === 'ar' ? 'الدروس' : 'Lessons');

        // rebuild dropdown content if exists
        if (dropdownContent) {
            // clean and re-add items preserving links to letter pages
            dropdownContent.innerHTML = '';
            letters.forEach((pair) => {
                const el = document.createElement('a');
                const id = pair[1].toLowerCase();
                el.href = `${id}.html`;
                el.textContent = (l === 'ar' ? pair[0] : pair[1]);
                el.className = 'lesson-link';
                dropdownContent.appendChild(el);
            });
        }

        // reorder nav: keep Lessons first, then About, Contact (both Arabic and English use the same order here).
        if (navBar) {
            // find existing nodes
            const nodes = [];
            if (dropdownContainer) nodes.push(dropdownContainer);
            if (aboutLink) nodes.push(aboutLink);
            if (contactLink) nodes.push(contactLink);

            // clear nav and re-append in desired order
            // but keep any other nav items (safety) after these three
            const other = Array.from(navBar.children).filter(c => !nodes.includes(c));
            navBar.innerHTML = '';
            nodes.forEach(n => navBar.appendChild(n));
            other.forEach(o => navBar.appendChild(o));
        }

        // update letter header if on letter page
        updateLetterHeader();
    }

    // create a card; always uses 16:9 for normal videos and 9:16 for shorts
    function createCard(v, isShort) {
        const thumb = esc(v.thumb || '');
        const title = esc(v.title || v.title_en || 'KJ Kids');
        const meta = v.published ? timeAgo(new Date(v.published)) : '';
        // use shortDesc if present for concise description
        const desc = esc(v.shortDesc || v.description || '');
        const embedHtml = isShort
            ? `<div class="video-responsive-9-16"><iframe class="video-iframe" loading="lazy" id="iframe-${v.videoId}" src="https://www.youtube.com/embed/${v.videoId}?enablejsapi=1&rel=0" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
            : `<div class="video-responsive-16-9"><iframe class="video-iframe" loading="lazy" id="iframe-${v.videoId}" src="https://www.youtube.com/embed/${v.videoId}?enablejsapi=1&rel=0" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;

        return `
<article class="card" data-video="${v.videoId}">
  <a href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" rel="noopener"><div class="thumb" style="background-image:url('${thumb}')"></div></a>
  <div class="title">${lang === 'ar' ? esc(v.title) : (v.title_en ? esc(v.title_en) : esc(v.title))}</div>
  <div class="meta">${meta}</div>
  <div class="desc">${desc}</div>
  <div class="embed-wrap">${embedHtml}</div>
  <a class="backlink" href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" rel="noopener"
     style="display:inline-block;margin-top:10px;padding:8px 12px;border-radius:999px;background:linear-gradient(90deg,#ffd166,#ffb3c6);color:#5b2d3a;font-weight:800;text-decoration:none">
     ${lang === 'ar' ? 'شاهد على يوتيوب' : 'Watch on YouTube'}
  </a>
</article>`;
    }

    function clearGrid() { if (!grid) return; grid.innerHTML = ''; }

    // Short detection: #shorts in title/description OR content.shorts set OR v.shortFlag === true
    function isShortRecord(v, requestedType) {
        if (requestedType === 'shorts') return true;
        if (v.shortFlag === true) return true;
        const t = (v.title || '').toLowerCase();
        const d = (v.description || '').toLowerCase();
        if (t.includes('#shorts') || d.includes('#shorts')) return true;
        if (contentShortsSet.has(v.videoId)) return true;
        return false;
    }

    // render list (videos/shorts/playlists). On letter pages, use content.letters mapping.
    function renderList(type, q = '') {
        if (!grid) return;
        const ql = (q || '').trim().toLowerCase();
        let list = [];
        if (isLetterPage && currentLetterKey && content.letters && content.letters[currentLetterKey]) {
            const ids = new Set(content.letters[currentLetterKey].videos || []);
            list = (content.videos || []).filter(v => ids.has(v.videoId));
        } else {
            list = (type === 'playlists') ? (content.playlists || []) : (content[type] || []);
        }

        const filtered = list.filter(item => {
            if (!ql) return true;
            const fields = [(item.title || ''), (item.title_en || ''), (item.description || '')].join(' ').toLowerCase();
            return fields.includes(ql) || (item.videoId && item.videoId.includes(ql));
        });

        clearGrid();

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#6b7280">${lang === 'ar' ? 'لا توجد نتائج.' : 'No results found.'}</div>`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        const toShow = filtered.slice(0, visible);
        let counter = 0;

        toShow.forEach((v, i) => {
            const isShort = ((v.title && v.title.toLowerCase().includes('#shorts')) ||
                (v.description && v.description.toLowerCase().includes('#shorts'))) ||
                (v.shortFlag === true) ||
                ((!isLetterPage && type === 'shorts'));

            // Add video card
            const div = document.createElement('div');
            div.innerHTML = (type === 'playlists')
                ? `<article class="card"><div class="thumb" style="background-image:url('${esc(v.thumb || '')}')"></div><div class="title">${esc(v.title || '')}</div><div class="meta">${v.count || 0} items</div></article>`
                : createCard(v, isShort);
            grid.appendChild(div.firstElementChild);
            counter++;

            // After every 4 videos, insert an ad cell (not full width)
            if (counter % 4 === 0) {
                const ad = document.createElement('div');
                ad.className = 'card ad-cell';
                ad.innerHTML = `
                <ins class="adsbygoogle"
                     style="display:block"
                     data-ad-client="ca-pub-4745925598643944"
                     data-ad-slot="1234567890"
                     data-ad-format="auto"
                     data-full-width-responsive="true"></ins>`;
                grid.appendChild(ad);
                try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { }
            }
        });

        if (loadMoreBtn) loadMoreBtn.style.display = (filtered.length > visible) ? 'block' : 'none';

        playingList = filtered.map(i => i.videoId).filter(Boolean);
        initYouTubePlayers();
    }


    // init youtube players and autoplay next + scroll into view
    function initYouTubePlayers() {
        if (typeof YT === 'undefined' || !YT || !YT.Player) {
            setTimeout(initYouTubePlayers, 600);
            return;
        }
        document.querySelectorAll('iframe.video-iframe').forEach(iframe => {
            const id = iframe.id;
            if (!id || players[id]) return;
            try {
                players[id] = new YT.Player(id, {
                    events: {
                        'onStateChange': function (e) {
                            if (e.data === YT.PlayerState.ENDED) {
                                const vid = id.replace('iframe-', '');
                                const idx = playingList.indexOf(vid);
                                if (idx >= 0 && idx < playingList.length - 1) {
                                    const nextId = playingList[idx + 1];
                                    const nextKey = 'iframe-' + nextId;
                                    const nextEl = document.getElementById(nextKey);
                                    if (nextEl) {
                                        // scroll into view a little before playing
                                        nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        setTimeout(() => {
                                            try {
                                                if (players[nextKey]) players[nextKey].playVideo();
                                                else nextEl.src = `https://www.youtube.com/embed/${nextId}?enablejsapi=1&autoplay=1&rel=0`;
                                            } catch (err) { }
                                        }, 600);
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (err) { }
        });
    }

    //function detectLetterPage() {
    //    const p = (location.pathname || '').split('/').pop() || '';
    //    const m = p.match(/^([a-z0-9_+-]+)\.html$/i);
    //    return m ? m[1].toLowerCase() : null;
    //}

    function detectLetterPage() {
        const p = (location.pathname || '').split('/').pop() || '';

        // Remove .html extension and any trailing slashes
        const pageName = p.replace(/\.html$/i, '').replace(/\/$/, '');

        // Return the page name if it's not empty and not the index page
        return pageName && pageName !== 'index' ? pageName.toLowerCase() : null;
    }

    // letter header management
    let letterHeaderEl = null;
    function createLetterHeaderElement() {
        if (!grid) return;
        letterHeaderEl = document.getElementById('letter-header') || document.createElement('div');
        letterHeaderEl.id = 'letter-header';
        letterHeaderEl.className = 'letter-header';
        // insert before grid
        grid.parentNode.insertBefore(letterHeaderEl, grid);
    }
    function updateLetterHeader() {
        if (!isLetterPage) return;
        if (!letterHeaderEl) createLetterHeaderElement();
        const L = content.letters[currentLetterKey];
        if (!L) {
            letterHeaderEl.innerHTML = (lang === 'ar' ? '<h2>لا توجد صفحة</h2>' : '<h2>Not found</h2>');
            return;
        }
        // show letter with tashkeel forms and small intro (these are provided by content.json's intro_ar/intro_en)
        const title = (lang === 'ar' ? (L.ar || '') : (L.en || ''));
        const intro = (lang === 'ar' ? (L.intro_ar || '') : (L.intro_en || ''));
        // optional extra fields in content.json like initial/middle/final forms (if present)
        const formsHtml = (L.forms ? `<div class="letter-forms">${esc(L.forms)}</div>` : '');
        letterHeaderEl.innerHTML = `<h1 style="margin:0 0 6px">${esc(title)}</h1><p style="margin:0 0 8px;color:#374151">${esc(intro)}</p>${formsHtml}`;
    }

    // SEO thumbnails (small images grid) injection
    function injectSeoThumbs() {
        if (!seoThumbs || !content || !content.videos) return;
        seoThumbs.innerHTML = '';
        // create small images, many per row (CSS controls size)
        content.videos.forEach(v => {
            const a = document.createElement('a');
            a.href = `https://www.youtube.com/watch?v=${v.videoId}`;
            a.target = '_blank';
            a.rel = 'noopener';
            a.title = v.title || '';
            a.className = 'seo-thumb-link';
            const img = document.createElement('img');
            img.src = v.thumb || '';
            img.alt = v.title || '';
            a.appendChild(img);
            seoThumbs.appendChild(a);
        });
    }

    // Load content.json and init UI
    async function loadContent() {
        try {
            const r = await fetch(CONTENT_FILE, { cache: 'no-cache' });
            if (!r.ok) throw new Error('Failed to load content.json');
            content = await r.json();

            // build a set of shorts ids if content.shorts exists
            contentShortsSet = new Set((content.shorts || []).map(s => s.videoId));

            // channel stats
            const stats = document.getElementById('channelStats');
            if (stats && content.channel && content.channel.subs) stats.textContent = (lang === 'ar' ? `${Number(content.channel.subs).toLocaleString()} مشترك` : `${Number(content.channel.subs).toLocaleString()} subs`);

            const letterKey = detectLetterPage();
            if (letterKey && content.letters && content.letters[letterKey]) {
                isLetterPage = true;
                currentLetterKey = letterKey;
                // hide tabs (if present)
                document.querySelectorAll('.tabs').forEach(el => el.style.display = 'none');
                updateLetterHeader();
                clearGrid();
                renderList('videos', '');
            } else {
                isLetterPage = false;
                currentLetterKey = null;
                document.querySelectorAll('.tabs').forEach(el => el.style.display = '');
                clearGrid();
                renderList('videos', '');
            }

            if (loading) loading.style.display = 'none';
            injectSeoThumbs();
            addFloatingButton(); // ✅ Add floating button
        } catch (err) {
            console.error(err);
            if (loading) loading.textContent = (lang === 'ar' ? 'تعذر تحميل المحتوى' : 'Failed to load content');
        }
    }


    // ✅ Add floating button for better UX
    function addFloatingButton() {
        const floatingDiv = document.createElement('div');
        floatingDiv.className = 'floating-elements';
        floatingDiv.innerHTML = `
            <div class="floating-btn" id="scrollToTop">🔝</div>
        `;
        document.body.appendChild(floatingDiv);

        document.getElementById('scrollToTop').addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    // --- EVENTS ---

    // Search button toggles between search and clear (🔍 / ✖️)
    doSearchBtn && doSearchBtn.addEventListener('click', () => {
        if (doSearchBtn.textContent === '🔍') {
            renderList(currentTab, qInput.value || '');
            doSearchBtn.textContent = '✖️';
        } else {
            qInput.value = '';
            renderList(currentTab, '');
            doSearchBtn.textContent = '🔍';
        }
    });
    qInput && qInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearchBtn && doSearchBtn.click(); });

    // Load more: increase visible, re-render and scroll up a bit so user sees newly loaded items
    loadMoreBtn && loadMoreBtn.addEventListener('click', () => {
        visible += 12;
        renderList(currentTab, qInput.value || '');
        // scroll up slightly so new items are visible
        window.scrollBy({ top: -220, behavior: 'smooth' });
    });

    // Tabs
    tabVideos && tabVideos.addEventListener('click', () => { currentTab = 'videos'; setActiveTab(tabVideos); renderList('videos'); });
    tabShorts && tabShorts.addEventListener('click', () => { currentTab = 'shorts'; setActiveTab(tabShorts); renderList('shorts'); });
    tabPlaylists && tabPlaylists.addEventListener('click', () => { currentTab = 'playlists'; setActiveTab(tabPlaylists); renderList('playlists'); });

    function setActiveTab(el) {
        [tabVideos, tabShorts, tabPlaylists].forEach(t => { if (t) t.classList.remove('active'); if (t) t.classList.add('inactive'); });
        if (el) el.classList.remove('inactive'), el.classList.add('active');
        visible = 18;
        if (qInput) qInput.value = '';
        if (doSearchBtn) doSearchBtn.textContent = '🔍';
        if (!isLetterPage) renderList(currentTab, '');
    }

    // language toggle
    langToggle && langToggle.addEventListener('click', () => setLanguage(lang === 'ar' ? 'en' : 'ar'));

    // burger open/close for mobile
    if (burgerBtn) {
        burgerBtn.addEventListener('click', () => {
            navBar.classList.toggle('open');
            // when opening on mobile ensure dropdowns are closed initially
            document.querySelectorAll('.dropdown-content.show').forEach(d => d.classList.remove('show'));
        });
    }

    // dropdown toggles (for mobile)
    document.querySelectorAll('.dropdown-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const c = btn.nextElementSibling;
            if (!c) return;
            c.classList.toggle('show');
            btn.setAttribute('aria-expanded', c.classList.contains('show'));
        });
    });

    // close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!navBar) return;
        if (!navBar.contains(e.target)) {
            document.querySelectorAll('.dropdown-content.show').forEach(d => d.classList.remove('show'));
        }
    });

    // init
    setLanguage(lang);
    loadContent();

    // expose helpers for debugging
    window._KJ = { loadContent, renderList, setLanguage };

})();
