// app_online.js — FINAL version with SEO link injection
(function () {
    const CONTENT_FILE = 'content.json';
    const CHANNEL_HANDLE = '@KJKids';

    // UI elements
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

    let content = { videos: [], shorts: [], playlists: [] };
    let lang = 'ar';
    let currentTab = 'videos';
    let visible = 18;
    let playingList = [];
    let players = {};

    function esc(s) {
        return String(s || '').replace(/[&<>"']/g, m =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    function timeAgo(d) {
        const diff = Math.floor((Date.now() - d.getTime()) / 1000);
        if (diff < 60) return lang === 'ar' ? 'منذ لحظات' : 'moments ago';
        if (diff < 3600) return Math.floor(diff / 60) + (lang === 'ar' ? ' دقيقة' : ' min');
        if (diff < 86400) return Math.floor(diff / 3600) + (lang === 'ar' ? ' ساعة' : ' hr');
        return Math.floor(diff / 86400) + (lang === 'ar' ? ' يوم' : ' days');
    }

    function setLanguage(l) {
        lang = l;
        document.documentElement.lang = (l === 'ar') ? 'ar' : 'en';
        document.documentElement.dir = (l === 'ar') ? 'rtl' : 'ltr';
        if (langToggle) langToggle.textContent = (l === 'ar') ? 'English' : 'العربية';
        if (qInput) qInput.placeholder = (l === 'ar') ? 'ابحث عن حرف، عنوان أو وصف (مثال: الألف)' : 'Search for letter, title or description (e.g. Alif)';
        if (tabVideos) tabVideos.textContent = (l === 'ar' ? '🎬 الفيديوهات' : '🎬 Videos');
        if (tabShorts) tabShorts.textContent = (l === 'ar' ? '📱 الشورتات' : '📱 Shorts');
        if (tabPlaylists) tabPlaylists.textContent = (l === 'ar' ? '🎵 القوائم' : '🎵 Playlists');
        if (loadMoreBtn) loadMoreBtn.textContent = (l === 'ar' ? 'تحميل المزيد' : 'Load More');
        const subBtn = document.getElementById('subscribeBtn');
        if (subBtn) subBtn.textContent = (l === 'ar' ? 'اشترك' : 'Subscribe');

        // Navbar
        document.querySelectorAll('#navBar .nav-link').forEach(link => {
            const id = link.id;
            if (id === 'navVideos') link.textContent = (l === 'ar' ? 'الفيديوهات' : 'Videos');
            else if (id === 'navShorts') link.textContent = (l === 'ar' ? 'الشورتات' : 'Shorts');
            else if (id === 'navPlaylists') link.textContent = (l === 'ar' ? 'القوائم' : 'Playlists');
            else if (link.href.includes('about')) link.textContent = (l === 'ar' ? 'عن KJ Kids' : 'About');
            else if (link.href.includes('contact')) link.textContent = (l === 'ar' ? 'اتصل بنا' : 'Contact');
        });
    }

    function createCard(v, isShort) {
        const thumb = esc(v.thumb || '');
        const title = esc(v.title || v.title_en || 'KJ Kids - فيديو');
        const meta = v.published ? timeAgo(new Date(v.published)) : '';
        const embedHtml = isShort
            ? `<div class="video-responsive-9-16"><iframe class="video-iframe" loading="lazy" id="iframe-${v.videoId}" src="https://www.youtube.com/embed/${v.videoId}?enablejsapi=1&rel=0" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
            : `<div class="video-responsive-16-9"><iframe class="video-iframe" loading="lazy" id="iframe-${v.videoId}" src="https://www.youtube.com/embed/${v.videoId}?enablejsapi=1&rel=0" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
        return `
<article class="card" data-video="${v.videoId}" data-title="${esc(v.title || '')}">
  <a href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">
    <div class="thumb" style="background-image:url('${thumb}')"></div>
  </a>
  <div class="title">${lang === 'ar' ? esc(v.title) : (v.title_en ? esc(v.title_en) : esc(v.title))}</div>
  <div class="meta">${meta}</div>
  <div class="embed-wrap">${embedHtml}</div>
  <a class="backlink" href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" rel="noopener"
     style="display:inline-block;margin-top:10px;padding:8px 12px;border-radius:999px;background:linear-gradient(90deg,#ffd166,#ffb3c6);color:#5b2d3a;font-weight:800;text-decoration:none">
     ${lang === 'ar' ? 'شاهد على يوتيوب' : 'Watch on YouTube'}</a>
</article>`;
    }

    function clearGrid() { grid.innerHTML = ''; }

    function renderList(type, q = '') {
        const list = (type === 'playlists') ? content.playlists : (content[type] || []);
        const ql = q.trim().toLowerCase();
        const filtered = list.filter(item => {
            if (!ql) return true;
            const fields = [(item.title || ''), (item.title_en || ''), (item.description || '')].join(' ').toLowerCase();
            return fields.includes(ql) || (item.videoId && item.videoId.includes(ql));
        });
        clearGrid();
        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#6b7280">${lang === 'ar' ? 'لا توجد نتائج.' : 'No results found.'}</div>`;
            loadMoreBtn.style.display = 'none';
            return;
        }
        const toShow = filtered.slice(0, visible);
        toShow.forEach((v, i) => {
            const isShort = type === 'shorts';
            const div = document.createElement('div');
            div.innerHTML = (type === 'playlists')
                ? `<article class="card"><div class="thumb" style="background-image:url('${esc(v.thumb || '')}')"></div><div class="title">${esc(v.title || '')}</div><div class="meta">${v.count || 0} items</div></article>`
                : createCard(v, isShort);
            grid.appendChild(div.firstElementChild);

            // ✅ Insert Google Ad every 4 videos
            if (type !== 'playlists' && (i + 1) % 4 === 0) {
                const ad = document.createElement('div');
                ad.className = 'ad-block';
                ad.style = 'text-align:center;margin:12px 0;';
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
        loadMoreBtn.style.display = filtered.length > visible ? 'block' : 'none';
        playingList = filtered.map(i => i.videoId).filter(Boolean);
        initYouTubePlayers();
    }

    function initYouTubePlayers() {
        if (typeof YT === 'undefined' || !YT || !YT.Player) {
            setTimeout(initYouTubePlayers, 600);
            return;
        }
        document.querySelectorAll('iframe.video-iframe').forEach(iframe => {
            const id = iframe.id;
            if (!id || players[id]) return;
            players[id] = new YT.Player(id, {
                events: {
                    'onStateChange': e => {
                        if (e.data === YT.PlayerState.ENDED) {
                            const vid = id.replace('iframe-', '');
                            const idx = playingList.indexOf(vid);
                            if (idx >= 0 && idx < playingList.length - 1) {
                                const nextId = playingList[idx + 1];
                                const nextKey = 'iframe-' + nextId;
                                if (players[nextKey]) players[nextKey].playVideo();
                                else {
                                    const nf = document.getElementById(nextKey);
                                    if (nf) nf.src = `https://www.youtube.com/embed/${nextId}?enablejsapi=1&autoplay=1&rel=0`;
                                }
                            }
                        }
                    }
                }
            });
        });
    }

    async function loadContent() {
        try {
            const r = await fetch(CONTENT_FILE, { cache: 'no-cache' });
            if (!r.ok) throw new Error('Failed to load content.json');
            const j = await r.json();
            content = j;
            const stats = document.getElementById('channelStats');
            if (stats && j.channel && j.channel.subs)
                stats.textContent = (lang === 'ar')
                    ? `${Number(j.channel.subs).toLocaleString()} مشترك`
                    : `${Number(j.channel.subs).toLocaleString()} subs`;
            clearGrid();
            renderList('videos', '');
            if (loading) loading.style.display = 'none';
            injectHiddenSEOlinks(j); // ✅ Add SEO links
            
        } catch (e) {
            console.error(e);
            if (loading) loading.textContent = (lang === 'ar') ? 'تعذر تحميل المحتوى' : 'Failed to load content';
        }
    }

    // ✅ SEO helper: hidden static links for Google
    function injectHiddenSEOlinks(data) {
        const hiddenDiv = document.createElement('div');
        hiddenDiv.style.display = 'none';
        hiddenDiv.id = 'seo-links';
        const addLinks = (items, type) => {
            items.forEach(item => {
                const a = document.createElement('a');
                if (type === 'video' && item.videoId)
                    a.href = `https://www.youtube.com/watch?v=${item.videoId}`;
                else if (type === 'playlist' && item.id)
                    a.href = `https://www.youtube.com/playlist?list=${item.id}`;
                else return;
                a.textContent = item.title || item.name || 'Video';
                hiddenDiv.appendChild(a);
            });
        };
        if (data.videos) addLinks(data.videos, 'video');
        if (data.shorts) addLinks(data.shorts, 'video');
        if (data.playlists) addLinks(data.playlists, 'playlist');
        document.body.appendChild(hiddenDiv);
    }

    // Search and tab controls
    doSearchBtn.addEventListener('click', () => {
        if (doSearchBtn.textContent === '🔍') {
            renderList(currentTab, qInput.value || '');
            doSearchBtn.textContent = '✖️';
        } else {
            qInput.value = '';
            renderList(currentTab, '');
            doSearchBtn.textContent = '🔍';
        }
    });
    qInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearchBtn.click(); });
    loadMoreBtn.addEventListener('click', () => { visible += 12; renderList(currentTab, qInput.value || ''); });
    tabVideos.addEventListener('click', () => { currentTab = 'videos'; setActiveTab(tabVideos); renderList('videos', qInput.value || ''); });
    tabShorts.addEventListener('click', () => { currentTab = 'shorts'; setActiveTab(tabShorts); renderList('shorts', qInput.value || ''); });
    tabPlaylists.addEventListener('click', () => { currentTab = 'playlists'; setActiveTab(tabPlaylists); renderList('playlists', qInput.value || ''); });

    function setActiveTab(el) {
        [tabVideos, tabShorts, tabPlaylists].forEach(t => { if (t) t.classList.remove('active'); if (t) t.classList.add('inactive'); });
        if (el) el.classList.remove('inactive'); if (el) el.classList.add('active');
        visible = 12;
        qInput.value = '';
        doSearchBtn.textContent = '🔍';
    }

    langToggle.addEventListener('click', () => setLanguage(lang === 'ar' ? 'en' : 'ar'));

    // burger
    burgerBtn?.addEventListener('click', () => {
        burgerBtn.classList.toggle('open');
        navBar.classList.toggle('open');
    });
    document.querySelectorAll('.nav-bar .nav-link').forEach(link => {
        link.addEventListener('click', () => { burgerBtn.classList.remove('open'); navBar.classList.remove('open'); });
    });

    setLanguage('ar');
    loadContent();
})();
