// ===================== VDEX THEMES HUB v4 (магазин + топ + избранное) =====================
(function () {
    const OFFICIAL_URL = 'https://raw.githubusercontent.com/cat32867-cmd/vdex-data/main/themes.json';
    const LS_ACTIVE = 'vx_custom_theme';
    const LS_MY = 'vx_my_themes';
    const LS_DOWN = 'vx_th_down';
    const LS_FAV = 'vx_th_favs';
    const LS_LIKE = 'vx_th_mylikes';

    const style = document.createElement('style');
    style.textContent = `
#vxt-bg{position:fixed;inset:0;z-index:-2;background-size:cover;background-position:center;pointer-events:none;}
#vxt-fx{position:fixed;inset:0;z-index:9990;pointer-events:none;}
body.fx-cyberpunk #vxt-fx{background:repeating-linear-gradient(0deg,rgba(0,255,255,.05) 0 1px,transparent 1px 3px),linear-gradient(180deg,rgba(255,0,128,.10),transparent 35%,rgba(0,255,255,.10));mix-blend-mode:screen;}
body.fx-cyberpunk .msg-bubble,body.fx-cyberpunk .channel-item,body.fx-cyberpunk .member-name{text-shadow:1px 0 rgba(255,0,128,.35),-1px 0 rgba(0,255,255,.35);}
body.fx-glitchcore #vxt-fx{background:repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0 2px,transparent 2px 5px);animation:vxtFlicker 3s infinite;}
body.fx-glitchcore .chat-header,body.fx-glitchcore .channels-panel,body.fx-glitchcore .msg-wrapper.mine{animation:vxtGlitch 5s infinite;}
body.fx-vhs #vxt-fx{background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 1px,transparent 1px 2px),radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.55));animation:vxtFlicker 1.6s infinite;}
body.fx-noise #vxt-fx{opacity:.08;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>");animation:vxtNoise .35s steps(3) infinite;}
@keyframes vxtGlitch{0%,91%,100%{transform:none;clip-path:none;filter:none;}92%{transform:translateX(-4px) skewX(-3deg);clip-path:inset(5% 0 55% 0);filter:hue-rotate(90deg);}94%{transform:translateX(4px);clip-path:inset(45% 0 25% 0);}96%{clip-path:inset(75% 0 5% 0);transform:none;}}
@keyframes vxtFlicker{0%,100%{opacity:.7;}45%{opacity:.95;}47%{opacity:.35;}49%{opacity:.85;}}
@keyframes vxtNoise{to{background-position:90px 40px;}}
.vxt-head{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #1a1a1a;position:relative;}
.vxt-burger{background:none;border:1px solid #333;border-radius:8px;color:var(--vx-primary);font-size:16px;padding:4px 10px;cursor:pointer;}
.vxt-title{flex:1;font-family:var(--font-mono);font-size:14px;letter-spacing:2px;color:#ccc;}
.vxt-menu{display:none;position:absolute;top:46px;left:12px;background:#141414;border:1px solid #2a2a2a;border-radius:10px;z-index:60;min-width:180px;overflow:hidden;}
.vxt-menu.open{display:block;}
.vxt-menu div{padding:10px 14px;font-family:var(--font-mono);font-size:12px;color:#bbb;cursor:pointer;border-bottom:1px solid #1c1c1c;}
.vxt-menu div:last-child{border-bottom:none;}
.vxt-menu div:hover{color:var(--vx-primary);}
.vxt-panel{padding:12px 14px 16px;overflow-y:auto;flex:1;}
.vxt-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;}
.vxt-chips{display:flex;gap:6px;flex-wrap:wrap;}
.vxt-chip{padding:4px 10px;font-size:10px;font-family:var(--font-mono);border:1px solid #333;border-radius:12px;color:#888;cursor:pointer;background:transparent;}
.vxt-chip.active{border-color:var(--vx-primary);color:var(--vx-primary);}
.vxt-search{flex:1;min-width:140px;background:#0d0d0d;border:1px solid #333;border-radius:8px;color:#ccc;padding:6px 10px;font-family:var(--font-mono);font-size:12px;}
.vxt-list{display:flex;flex-direction:column;gap:8px;}
.vxt-item{border:1px solid #222;border-radius:10px;padding:8px 10px;background:#0d0d0d;cursor:pointer;}
.vxt-item.active{border-color:var(--vx-primary);}
.vxt-row{display:flex;align-items:center;gap:10px;}
.vxt-preview{display:flex;gap:3px;}
.vxt-dot{width:12px;height:12px;border-radius:50%;}
.vxt-name{flex:1;font-family:var(--font-mono);font-size:12px;color:#ccc;}
.vxt-author{font-size:10px;color:#666;display:block;}
.vxt-badge{font-size:9px;padding:2px 6px;border:1px solid #333;border-radius:8px;color:#888;font-family:var(--font-mono);}
.vxt-badge.top{color:var(--vx-warn,#ffcc00);border-color:var(--vx-warn,#ffcc00);}
.vxt-badge.heart{color:#ff5d7a;border-color:#ff5d7a55;}
.vxt-sec{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin:10px 0 6px;}
.vxt-empty{font-size:11px;color:#555;padding:8px;}
.vxt-desc{color:#c8c8d8;font-size:12px;white-space:pre-wrap;border:1px solid #222;border-radius:8px;padding:10px;background:#0a0a0a;min-height:48px;margin:8px 0;}
.vxt-bigrow{display:flex;gap:8px;margin:10px 0;}
.vxt-bigrow button{flex:1;padding:10px;border-radius:8px;cursor:pointer;font-family:var(--font-mono);font-size:13px;background:#101014;}
.vxt-like{border:1px solid #ff5d7a66;color:#ff5d7a;}
.vxt-fav{border:1px solid #ffd75e66;color:#ffd75e;}
.vxt-bar{display:flex;gap:8px;border-top:1px solid #1c1c1c;padding-top:10px;margin-top:10px;flex-wrap:wrap;}
.vxt-bar button{padding:10px 12px;border-radius:8px;cursor:pointer;font-family:var(--font-mono);font-size:12px;}
.vxt-dl{flex:2;border:1px solid #0ff66;background:#06161a;color:#0ff;font-weight:700;}
.vxt-share{flex:1;border:1px solid #33334466;background:#101018;color:#aab;}
.vxt-del{flex:1;border:1px solid #55222266;background:#160a0a;color:#f66;}
.vxt-fxseg{display:flex;flex-wrap:wrap;gap:6px;}
.vxt-fxseg button{padding:6px 10px;font-size:11px;font-family:var(--font-mono);background:transparent;border:1px solid #333;border-radius:6px;color:#888;cursor:pointer;}
.vxt-fxseg button.active{border-color:var(--vx-primary);color:var(--vx-primary);}
`;
    document.head.appendChild(style);

    // ---------- хранилища ----------
    const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
    const wr = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    const getActive = () => rd(LS_ACTIVE, null);
    const getMy = () => rd(LS_MY, []);
    const setMy = a => wr(LS_MY, a);
    const getDown = () => rd(LS_DOWN, {});
    const getFavs = () => rd(LS_FAV, []);
    const getLikes = () => rd(LS_LIKE, []);

    // ---------- применение тем ----------
    const ALL_VARS = ['--vx-primary', '--vx-primary-dim', '--vx-info', '--vx-danger', '--vx-warn', '--bg-color', '--panel-color', '--border-color'];
    function clearTheme() {
        ALL_VARS.forEach(k => document.documentElement.style.removeProperty(k));
        const bg = document.getElementById('vxt-bg'); if (bg) bg.remove();
        const fx = document.getElementById('vxt-fx'); if (fx) fx.remove();
        const raw = document.getElementById('vxt-raw'); if (raw) raw.remove();
        ['fx-cyberpunk', 'fx-glitchcore', 'fx-vhs', 'fx-noise'].forEach(c => document.body.classList.remove(c));
    }
    function applyTheme(t) {
        clearTheme();
        if (!t) return;
        if (t.vars) for (const k in t.vars) document.documentElement.style.setProperty(k, t.vars[k]);
        if (t.rawCss) { const s = document.createElement('style'); s.id = 'vxt-raw'; s.textContent = t.rawCss; document.head.appendChild(s); }
        if (t.bg) {
            const d = document.createElement('div');
            d.id = 'vxt-bg';
            d.style.backgroundImage = 'url(' + t.bg + ')';
            d.style.opacity = (t.bgOpacity != null ? t.bgOpacity : 0.35);
            document.body.appendChild(d);
        }
        if (t.effect && t.effect !== 'none') {
            document.body.classList.add('fx-' + t.effect);
            const o = document.createElement('div'); o.id = 'vxt-fx'; document.body.appendChild(o);
        }
        try {
            const c = JSON.parse(localStorage.getItem('vx_custom_color') || 'null');
            if (c) { document.documentElement.style.setProperty('--vx-primary', c); document.documentElement.style.setProperty('--vx-primary-dim', c + '1A'); }
        } catch (e) {}
    }
    function hydrate(t) {
        if (!t) return null;
        if (t.vars || t.rawCss) return t;
        if (t.css && t.css.charAt(0) === '{') { try { return Object.assign({}, t, JSON.parse(t.css)); } catch (e) { return t; } }
        if (t.css) return Object.assign({}, t, { rawCss: t.css });
        return t;
    }
    function fileToBg(file, cb) {
        const r = new FileReader();
        r.onload = e => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas');
                let w = img.width, h = img.height; const MAX = 1000;
                if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                cb(c.toDataURL('image/jpeg', 0.6));
            };
            img.src = e.target.result;
        };
        r.readAsDataURL(file);
    }

    // ---------- состояние витрины ----------
    let official = null, catalog = [], stats = {};
    let view = { mode: 'top', tag: null, detail: null, q: '' };
    let menuOpen = false, pendingDl = null, pendingShare = null;
    const likeCount = id => (stats[id] != null ? stats[id] : 0);
    const inCatalog = id => catalog.some(x => x.id === id);

    function findTheme(id) {
        let t = getMy().find(x => x.id === id); if (t) return { t: t, src: 'my' };
        t = getDown()[id]; if (t) return { t: t, src: 'down' };
        const m = catalog.find(x => x.id === id); if (m) return { t: m, src: 'com' };
        t = (official || []).find(x => x.id === id); if (t) return { t: t, src: 'off' };
        return null;
    }
    const tagsOf = t => (t.tags && t.tags.length) ? t.tags : (t.style ? [t.style] : []);

    // ---------- сеть ----------
    function onWs(ev) {
        let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
        if (!d) return;
        if (d.type === 'theme_catalog') { catalog = d.themes || []; render(); }
        else if (d.type === 'theme_stats') { stats = d.stats || {}; render(); }
        else if (d.type === 'theme_full' && d.theme) {
            const dn = getDown(); dn[d.theme.id] = d.theme; wr(LS_DOWN, dn);
            if (pendingShare === d.theme.id) { pendingShare = null; shareCopy(d.theme); }
            if (pendingDl === d.theme.id) { pendingDl = null; VXApp.UI.showToast('Скачано: ' + d.theme.name, 'info'); }
            render();
        }
    }
    const origConnect = VXNetwork.prototype.connect;
    VXNetwork.prototype.connect = function (url) {
        const r = origConnect.call(this, url);
        const s = VXState.network.socket;
        if (s) {
            s.addEventListener('message', onWs);
            s.addEventListener('open', () => setTimeout(() => {
                VXApp.Network.transmit({ type: 'theme_catalog_req' });
                VXApp.Network.transmit({ type: 'theme_stats_req' });
            }, 2500));
        }
        return r;
    };

    // ---------- рендер ----------
    function dotsHtml(t) {
        const v = t.vars || {};
        return '<div class="vxt-preview">' + ['--vx-primary', '--vx-info', '--vx-danger'].map(k => '<div class="vxt-dot" style="background:' + (v[k] || '#333') + '"></div>').join('') + '</div>';
    }
    function cardHtml(t, topIdx) {
        const id = t.id, act = getActive();
        const fav = getFavs().indexOf(id) !== -1, dl = !!getDown()[id];
        let badges = '';
        if (topIdx >= 0 && topIdx < 3) badges += '<span class="vxt-badge top">TOP ' + (topIdx + 1) + '</span> ';
        tagsOf(t).slice(0, 2).forEach(g => { badges += '<span class="vxt-badge">' + g + '</span> '; });
        if (inCatalog(id)) badges += '<span class="vxt-badge heart">❤ ' + likeCount(id) + '</span>';
        return '<div class="vxt-item' + (act && act.id === id ? ' active' : '') + '" data-act="open" data-id="' + id + '">' +
            '<div class="vxt-row">' + dotsHtml(t) +
            '<div class="vxt-name">' + (t.name || id) + badges +
            '<span class="vxt-author">by ' + (t.authorNick || t.author || 'unknown') + (fav ? ' · ★' : '') + (dl ? ' · ⬇' : '') + '</span></div></div></div>';
    }
    function poolTop() {
        let list = catalog.slice();
        if (view.q) { const q = view.q.toLowerCase(); list = list.filter(t => ((t.name || '') + ' ' + (t.authorNick || '')).toLowerCase().indexOf(q) !== -1); }
        list.sort((a, b) => likeCount(b.id) - likeCount(a.id));
        return list;
    }
    function tagCloud() {
        const m = {};
        catalog.forEach(t => tagsOf(t).forEach(g => { m[g] = (m[g] || 0) + 1; }));
        (official || []).forEach(t => tagsOf(t).forEach(g => { m[g] = (m[g] || 0) + 1; }));
        return Object.keys(m).map(g => ({ g: g, n: m[g] })).sort((a, b) => b.n - a.n);
    }
    function detailHtml(t, src) {
        const id = t.id, fav = getFavs().indexOf(id) !== -1;
        const liked = getLikes().indexOf(id) !== -1, dl = !!getDown()[id];
        const applied = getActive() && getActive().id === id;
        const canLike = inCatalog(id);
        let bar = '';
        if (src === 'com' && !dl) bar += '<button class="vxt-dl" data-act="dl" data-id="' + id + '">скачать</button>';
        else bar += '<button class="vxt-dl" data-act="use" data-id="' + id + '">' + (applied ? '✓ применена' : 'использовать') + '</button>';
        bar += '<button class="vxt-share" data-act="share" data-id="' + id + '">поделиться</button>';
        if (dl) bar += '<button class="vxt-del" data-act="del" data-id="' + id + '">удалить</button>';
        let extra = '';
        if (src === 'com' && t.authorUid === VXState.user.uid) extra = '<button class="vxt-del" style="width:100%;margin-top:8px;" data-act="netdel" data-id="' + id + '">✕ удалить из сети (ты автор)</button>';
        if (src === 'my') extra = '<button class="vxt-share" style="width:100%;margin-top:8px;" data-act="pub" data-id="' + id + '">Опубликовать в сети</button>';
        return '<div style="padding:2px 2px 8px;">' +
            '<div data-act="back" style="color:#888;font-size:12px;cursor:pointer;margin-bottom:8px;">‹ назад</div>' +
            '<div style="font-size:16px;font-weight:800;color:#e8e8f0;letter-spacing:1px;font-family:var(--font-mono);">' + (t.name || id) + '</div>' +
            '<div style="color:#8888a0;font-size:11px;margin:4px 0 8px;font-family:var(--font-mono);">автор: ' + (t.authorNick || t.author || 'unknown') + (canLike ? ' · ❤ ' + likeCount(id) : '') + '</div>' +
            (tagsOf(t).length ? '<div class="vxt-chips" style="margin-bottom:8px;">' + tagsOf(t).map(g => '<span class="vxt-badge">#' + g + '</span>').join(' ') + '</div>' : '') +
            '<div class="vxt-desc">' + (t.desc || 'без описания') + '</div>' +
            '<div class="vxt-bigrow">' +
            (canLike ? '<button class="vxt-like" data-act="like" data-id="' + id + '">' + (liked ? '❤ лайкнут' : '🤍 лайк') + '</button>' : '') +
            '<button class="vxt-fav" data-act="fav" data-id="' + id + '">' + (fav ? '★ в избранном' : '☆ в избранное') + '</button>' +
            '</div>' +
            '<div class="vxt-bar">' + bar + '</div>' + extra + '</div>';
    }
    const TITLES = { top: '🏆 ТОП ТЕМ', my: '👤 МОИ ТЕМЫ', fav: '★ ИЗБРАННОЕ', filter: '🔎 ФИЛЬТР', official: 'ОТ VDEX' };
    function bodyHtml() {
        if (view.detail) { const f = findTheme(view.detail); return f ? detailHtml(f.t, f.src) : '<div class="vxt-empty">тема не найдена</div>'; }
        if (view.mode === 'top') {
            const list = poolTop();
            return '<div class="vxt-tools"><input class="vxt-search" id="vxt-q" placeholder="поиск: имя или автор..." value="' + view.q + '"></div>' +
                (list.length ? '<div class="vxt-list">' + list.map((t, i) => cardHtml(t, i)).join('') + '</div>' : '<div class="vxt-empty">В сети пока нет тем. Опубликуй свою кнопкой ＋</div>');
        }
        if (view.mode === 'my') {
            const mine = catalog.filter(t => t.authorUid === VXState.user.uid);
            const loc = getMy();
            let h = '<div class="vxt-sec">в сети (мой ник)</div>';
            h += mine.length ? '<div class="vxt-list">' + mine.map(t => cardHtml(t, -1)).join('') + '</div>' : '<div class="vxt-empty">пока не опубликовано ни одной</div>';
            h += '<div class="vxt-sec">локальные</div>';
            h += loc.length ? '<div class="vxt-list">' + loc.map(t => cardHtml(t, -1)).join('') + '</div>' : '<div class="vxt-empty">создай конструктором ＋</div>';
            return h;
        }
        if (view.mode === 'fav') {
            const favs = getFavs();
            const items = favs.map(id => findTheme(id)).filter(Boolean);
            return items.length ? '<div class="vxt-list">' + items.map(f => cardHtml(f.t, -1)).join('') + '</div>' : '<div class="vxt-empty">Избранное пусто. Ставь ★ на темах.</div>';
        }
        if (view.mode === 'filter') {
            if (!view.tag) {
                const cloud = tagCloud();
                return cloud.length ? cloud.map(x => '<div class="vxt-item" data-act="tag" data-tag="' + x.g + '"><div class="vxt-row" style="justify-content:space-between;"><span class="vxt-name">#' + x.g + '</span><span class="vxt-badge">' + x.n + ' тем</span></div></div>').join('') : '<div class="vxt-empty">хештегов пока нет</div>';
            }
            const all = catalog.concat(official || []);
            const list = all.filter(t => tagsOf(t).indexOf(view.tag) !== -1);
            return '<div data-act="untag" style="color:#888;font-size:12px;cursor:pointer;margin-bottom:8px;">‹ все хештеги</div>' +
                (list.length ? '<div class="vxt-list">' + list.map(t => cardHtml(t, -1)).join('') + '</div>' : '<div class="vxt-empty">пусто</div>');
        }
        // official
        const list = (official || []).filter(t => !view.tag || tagsOf(t).indexOf(view.tag) !== -1);
        if (!official) return '<div class="vxt-empty">Загрузка...</div>';
        const cloud = tagCloud().filter(x => (official || []).some(t => tagsOf(t).indexOf(x.g) !== -1));
        return '<div class="vxt-chips" style="margin-bottom:10px;">' + cloud.map(x => '<button class="vxt-chip' + (view.tag === x.g ? ' active' : '') + '" data-act="offtag" data-tag="' + x.g + '">#' + x.g + '</button>').join('') + '</div>' +
            (list.length ? '<div class="vxt-list">' + list.map(t => cardHtml(t, -1)).join('') + '</div>' : '<div class="vxt-empty">Тем с таким стилем пока нет.</div>');
    }
    let modal = null;
    function render() {
        if (!modal || !modal.classList.contains('active')) return;
        modal.querySelector('#vxt-title').textContent = view.detail ? 'ТЕМА' : TITLES[view.mode];
        modal.querySelector('#vxt-menu').classList.toggle('open', menuOpen);
        modal.querySelector('#vxt-body').innerHTML = bodyHtml();
        const q = modal.querySelector('#vxt-q');
        if (q) q.oninput = e => { view.q = e.target.value.trim(); render(); };
    }
    function buildModal() {
        modal = document.createElement('div');
        modal.className = 'overlay'; modal.id = 'vxt-modal';
        modal.innerHTML = '<div class="modal" style="max-width:480px;height:84vh;">' +
            '<div class="vxt-head">' +
            '<button class="vxt-burger" data-act="menu">☰</button>' +
            '<span id="vxt-title" class="vxt-title"></span>' +
            '<button class="vxt-burger" data-act="create">＋</button>' +
            '<button class="vxt-burger" data-act="close">✕</button>' +
            '<div class="vxt-menu" id="vxt-menu">' +
            '<div data-act="mode" data-mode="top">🏆 Топ</div>' +
            '<div data-act="mode" data-mode="my">👤 Мои</div>' +
            '<div data-act="mode" data-mode="fav">★ Избранное</div>' +
            '<div data-act="mode" data-mode="filter">🔎 Фильтр</div>' +
            '<div data-act="mode" data-mode="official">От VDEX</div>' +
            '<div data-act="import">Импорт кода</div>' +
            '</div></div>' +
            '<div class="vxt-panel" id="vxt-body"></div>' +
            '<footer class="modal-footer"><button class="btn-modal btn-cancel" data-act="reset">Сброс</button><button class="btn-modal btn-submit" data-act="create">Создать тему</button></footer></div>';
        document.body.appendChild(modal);
    }
    async function openThemes() {
        if (!modal) buildModal();
        modal.classList.add('active');
        view = { mode: 'top', tag: null, detail: null, q: '' };
        official = null;
        render();
        try {
            const r = await fetch(OFFICIAL_URL + '?cb=' + Date.now());
            official = r.ok ? ((await r.json()).themes || []) : [];
        } catch (e) { official = []; }
        VXApp.Network.transmit({ type: 'theme_catalog_req' });
        VXApp.Network.transmit({ type: 'theme_stats_req' });
        render();
    }

    // ---------- действия ----------
    function shareCopy(t) {
        const code = JSON.stringify({ name: t.name, author: t.authorNick || t.author || VXState.user.nickname, style: t.style || (t.tags || [])[0] || 'custom', desc: t.desc, effect: t.effect, bgOpacity: t.bgOpacity, bg: (t.bg && t.bg.indexOf('data:') !== 0) ? t.bg : undefined, vars: t.vars });
        navigator.clipboard?.writeText(code);
        VXApp.UI.showToast('Код темы скопирован — друг вставит через ☰ → Импорт', 'info');
    }
    document.addEventListener('click', e => {
        const el = e.target.closest('[data-act]');
        if (!el || !modal || !modal.contains(el)) return;
        const act = el.dataset.act, id = el.dataset.id;
        if (act === 'close') { modal.classList.remove('active'); return; }
        if (act === 'menu') { menuOpen = !menuOpen; render(); return; }
        if (act === 'mode') { view = { mode: el.dataset.mode, tag: null, detail: null, q: '' }; menuOpen = false; render(); return; }
        if (act === 'create') { menuOpen = false; openBuilder(); return; }
        if (act === 'reset') { localStorage.removeItem(LS_ACTIVE); applyTheme(null); VXApp.UI.showToast('Тема сброшена к базовой', 'info'); return; }
        if (act === 'import') {
            const code = prompt('Вставь код темы (JSON):');
            if (code) {
                try {
                    const t = JSON.parse(code);
                    if (!t.name) throw new Error('x');
                    t.id = 'imp_' + Date.now();
                    const my = getMy(); my.push(t); setMy(my);
                    VXApp.UI.showToast('Тема «' + t.name + '» добавлена в «Мои»', 'info');
                    view = { mode: 'my', tag: null, detail: null, q: '' }; render();
                } catch (err) { VXApp.UI.showToast('Не похоже на код темы', 'error'); }
            }
            menuOpen = false; render(); return;
        }
        if (act === 'open') { view.detail = id; render(); return; }
        if (act === 'back') { view.detail = null; render(); return; }
        if (act === 'tag') { view = { mode: 'filter', tag: el.dataset.tag, detail: null, q: '' }; render(); return; }
        if (act === 'untag') { view.tag = null; render(); return; }
        if (act === 'offtag') { view.tag = (view.tag === el.dataset.tag ? null : el.dataset.tag); render(); return; }
        if (act === 'like') {
            const my = getLikes(); const on = my.indexOf(id) === -1;
            if (on) my.push(id); else my.splice(my.indexOf(id), 1);
            wr(LS_LIKE, my);
            VXApp.Network.transmit({ type: 'theme_like', themeId: id, on: on });
            render(); return;
        }
        if (act === 'fav') {
            const f = getFavs();
            if (f.indexOf(id) === -1) f.push(id); else f.splice(f.indexOf(id), 1);
            wr(LS_FAV, f); render(); return;
        }
        if (act === 'dl') { pendingDl = id; VXApp.Network.transmit({ type: 'theme_get', themeId: id }); VXApp.UI.showToast('Скачиваю...', 'info'); return; }
        if (act === 'use') {
            const f = findTheme(id); if (!f) return;
            const full = hydrate(f.t);
            localStorage.setItem(LS_ACTIVE, JSON.stringify(full));
            applyTheme(full);
            VXApp.UI.showToast('Тема «' + full.name + '» применена', 'info');
            render(); return;
        }
        if (act === 'del') {
            const dn = getDown(); delete dn[id]; wr(LS_DOWN, dn);
            const a = getActive(); if (a && a.id === id) { localStorage.removeItem(LS_ACTIVE); applyTheme(null); }
            VXApp.UI.showToast('Локальная копия удалена', 'info'); render(); return;
        }
        if (act === 'netdel') { VXApp.Network.transmit({ type: 'theme_delete', themeId: id }); view.detail = null; render(); return; }
        if (act === 'share') {
            const f = findTheme(id);
            if (f && (f.src === 'my' || f.src === 'down' || f.src === 'off')) shareCopy(f.t);
            else { pendingShare = id; VXApp.Network.transmit({ type: 'theme_get', themeId: id }); }
            return;
        }
        if (act === 'pub') {
            const t = getMy().find(x => x.id === id); if (!t) return;
            VXApp.Network.transmit({
                type: 'theme_publish',
                theme: {
                    id: t.id, name: t.name, desc: t.desc || '',
                    tags: (t.tags && t.tags.length) ? t.tags : [t.style || 'custom'],
                    css: JSON.stringify({ vars: t.vars || {}, bg: (t.bg && t.bg.indexOf('data:') !== 0) ? t.bg : undefined, bgOpacity: t.bgOpacity, effect: t.effect })
                }
            });
            VXApp.UI.showToast('Тема ушла в сеть (фото не переносится — лимит размера)', 'info');
            view = { mode: 'my', tag: null, detail: null, q: '' }; render(); return;
        }
    });

    // ---------- конструктор ----------
    let builder = null;
    let draft = { name: '', style: '', desc: '', vars: {}, bg: null, bgOpacity: 0.35, effect: 'none' };
    function openBuilder() {
        if (!builder) {
            builder = document.createElement('div');
            builder.className = 'overlay'; builder.id = 'vxt-builder';
            builder.innerHTML = '<div class="modal" style="max-width:460px;">' +
                '<header class="modal-header"><h2 class="modal-title">КОНСТРУКТОР ТЕМЫ</h2><button class="btn-close" id="vxb-close">✕</button></header>' +
                '<div class="modal-body">' +
                '<div class="form-group"><label>Название</label><input class="form-input" id="vxb-name" placeholder="напр. NEON RAIN"></div>' +
                '<div class="form-group"><label>Стиль / хештег</label><input class="form-input" id="vxb-style" placeholder="напр. hyperpunk"></div>' +
                '<div class="form-group"><label>Описание</label><input class="form-input" id="vxb-desc" placeholder="пара слов о теме"></div>' +
                '<div class="vxt-sec">Фон</div>' +
                '<div class="vxt-row"><button class="btn-modal btn-cancel" id="vxb-photo" style="padding:6px 10px;font-size:11px;">Фото с устройства</button><button class="btn-modal btn-cancel" id="vxb-nophoto" style="padding:6px 10px;font-size:11px;">Убрать фото</button></div>' +
                '<input type="file" id="vxb-file" accept="image/*" hidden>' +
                '<div class="form-group"><label>Прозрачность фона: <span id="vxb-opv">0.35</span></label><input type="range" id="vxb-op" min="0.05" max="1" step="0.05" value="0.35" style="width:100%;"></div>' +
                '<div class="vxt-sec">Эффект</div>' +
                '<div class="vxt-fxseg" id="vxb-fx"><button data-v="none" class="active">нет</button><button data-v="cyberpunk">cyberpunk</button><button data-v="glitchcore">glitchcore</button><button data-v="vhs">vhs</button><button data-v="noise">зерно</button></div>' +
                '<div class="vxt-sec">Акцентный цвет</div>' +
                '<input type="color" id="vxb-color" value="#00ff41" style="width:44px;height:32px;border:1px solid #333;border-radius:6px;background:#0d0d0d;padding:2px;cursor:pointer;">' +
                '</div>' +
                '<footer class="modal-footer"><button class="btn-modal btn-cancel" id="vxb-preview">Предпросмотр</button><button class="btn-modal btn-submit" id="vxb-save">Сохранить</button></footer></div>';
            document.body.appendChild(builder);
            document.getElementById('vxb-close').onclick = () => { builder.classList.remove('active'); applyTheme(getActive()); };
            document.getElementById('vxb-photo').onclick = () => document.getElementById('vxb-file').click();
            document.getElementById('vxb-file').addEventListener('change', e => { const f = e.target.files[0]; if (f) fileToBg(f, d => { draft.bg = d; VXApp.UI.showToast('Фото готово', 'info'); }); });
            document.getElementById('vxb-nophoto').onclick = () => { draft.bg = null; };
            document.getElementById('vxb-op').oninput = e => { draft.bgOpacity = parseFloat(e.target.value); document.getElementById('vxb-opv').innerText = draft.bgOpacity; };
            builder.querySelectorAll('#vxb-fx button').forEach(b => b.onclick = () => { draft.effect = b.dataset.v; builder.querySelectorAll('#vxb-fx button').forEach(x => x.classList.toggle('active', x === b)); });
            document.getElementById('vxb-color').oninput = e => { draft.vars = { '--vx-primary': e.target.value, '--vx-primary-dim': e.target.value + '1a' }; };
            document.getElementById('vxb-preview').onclick = () => { draft.name = document.getElementById('vxb-name').value || 'DRAFT'; applyTheme(draft); };
            document.getElementById('vxb-save').onclick = () => {
                const name = document.getElementById('vxb-name').value.trim();
                if (!name) return VXApp.UI.showToast('Дай теме имя', 'warn');
                draft.name = name;
                draft.style = (document.getElementById('vxb-style').value.trim() || 'custom').toLowerCase();
                draft.desc = document.getElementById('vxb-desc').value.trim();
                draft.author = VXState.user.nickname || 'anon';
                draft.id = 'my_' + Date.now();
                const my = getMy(); my.push(JSON.parse(JSON.stringify(draft))); setMy(my);
                localStorage.setItem(LS_ACTIVE, JSON.stringify(draft));
                applyTheme(draft);
                builder.classList.remove('active');
                VXApp.UI.showToast('Тема «' + name + '» сохранена. Опубликуй её из «Мои»', 'info');
                render();
            };
        }
        builder.classList.add('active');
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#vxs-custom-themes')) return;
        e.stopPropagation(); e.preventDefault();
        openThemes();
    }, true);
    applyTheme(getActive());
    document.addEventListener('DOMContentLoaded', () => applyTheme(getActive()));
})();
