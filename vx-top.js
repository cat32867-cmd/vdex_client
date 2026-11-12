// ===================== VDEX THEMES STORE v2 =====================
(function () {
    const LS_LOCAL = 'vx_th_local', LS_FAV = 'vx_th_favs', LS_MY = 'vx_th_mylikes', LS_APPLIED = 'vx_th_applied';
    let catalog = [], stats = {}, view = { mode: 'top', tag: null, detail: null }, menuOpen = false;
    let pendingDl = null, pendingShare = null;

    const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
    const wr = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    const local = () => rd(LS_LOCAL, {});
    const favs = () => rd(LS_FAV, []);
    const myLikes = () => rd(LS_MY, []);
    const me = () => VXState.user || {};
    const likeCount = id => (stats[id] != null ? stats[id] : ((catalog.find(t => t.id === id) || {}).likes || []).length);

    function toast(text) {
        const t = document.createElement('div');
        t.textContent = text;
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#111;border:1px solid #0ff66;color:#0ff;padding:8px 16px;border-radius:8px;z-index:10001;font-size:13px;';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2500);
    }
    function applyTheme(id) {
        const th = local()[id];
        let st = document.getElementById('vx-theme-css');
        if (!th) { if (st) st.remove(); localStorage.removeItem(LS_APPLIED); return; }
        if (!st) { st = document.createElement('style'); st.id = 'vx-theme-css'; document.head.appendChild(st); }
        st.textContent = th.css || '';
        wr(LS_APPLIED, id);
        toast('Тема применена: ' + th.name);
    }
    setTimeout(() => { const id = rd(LS_APPLIED, null); if (id && local()[id]) applyTheme(id); }, 1500);

    const enc = obj => 'VDEXTHEME1:' + btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    const dec = s => JSON.parse(decodeURIComponent(escape(atob(String(s).replace('VDEXTHEME1:', '')))));

    // ---------- выборка под режим ----------
    function themesFor() {
        let list = catalog.slice();
        if (view.mode === 'mine') list = list.filter(t => t.authorUid === me().uid);
        if (view.mode === 'fav') list = list.filter(t => favs().indexOf(t.id) !== -1);
        if (view.mode === 'tag') list = list.filter(t => (t.tags || []).indexOf(view.tag) !== -1);
        list.sort((a, b) => likeCount(b.id) - likeCount(a.id) || a.name.localeCompare(b.name));
        return list;
    }
    function tagCloud() {
        const m = {};
        catalog.forEach(t => (t.tags || []).forEach(g => { m[g] = (m[g] || 0) + 1; }));
        return Object.keys(m).map(g => ({ g: g, n: m[g] })).sort((a, b) => b.n - a.n);
    }

    // ---------- рендер ----------
    const S = 'style="';
    function cardHtml(t) {
        const f = favs().indexOf(t.id) !== -1, dl = !!local()[t.id], ap = rd(LS_APPLIED, null) === t.id;
        return '<div class="vxst-card" data-act="open" data-id="' + t.id + '" ' + S + 'border:1px solid #2a2a35;border-radius:10px;padding:10px;margin:8px 12px;background:#0d0d13;cursor:pointer;">' +
            '<div ' + S + 'display:flex;justify-content:space-between;align-items:center;"><b ' + S + 'color:#e8e8f0;letter-spacing:1px;">' + t.name + '</b>' +
            '<span ' + S + 'color:#ff5d7a;font-size:12px;">❤ ' + likeCount(t.id) + '</span></div>' +
            '<div ' + S + 'color:#8888a0;font-size:12px;margin-top:2px;">автор: ' + (t.authorNick || '?') +
            (f ? ' · ★' : '') + (dl ? (ap ? ' · ⬇ применена' : ' · ⬇ скачана') : '') + '</div>' +
            ((t.tags || []).length ? '<div ' + S + 'margin-top:4px;font-size:11px;color:#0ff99;">' + t.tags.map(g => '#' + g).join(' ') + '</div>' : '') +
            '</div>';
    }
    function listHtml() {
        const list = themesFor();
        if (!list.length) return '<div ' + S + 'color:#666;text-align:center;padding:30px;">пусто</div>';
        return list.map(cardHtml).join('');
    }
    function filterHtml() {
        const cloud = tagCloud();
        if (!cloud.length) return '<div ' + S + 'color:#666;text-align:center;padding:30px;">хештегов пока нет</div>';
        return cloud.map(x => '<div data-act="tag" data-tag="' + x.g + '" ' + S + 'display:flex;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #1c1c26;cursor:pointer;"><span ' + S + 'color:#0ff;">#' + x.g + '</span><span ' + S + 'color:#888;">' + x.n + ' тем</span></div>').join('');
    }
    function detailHtml(t) {
        const f = favs().indexOf(t.id) !== -1, liked = myLikes().indexOf(t.id) !== -1;
        const dl = !!local()[t.id], ap = rd(LS_APPLIED, null) === t.id, mine = t.authorUid === me().uid;
        return '<div ' + S + 'padding:14px 16px;">' +
            '<div ' + S + 'font-size:18px;font-weight:800;color:#e8e8f0;letter-spacing:1px;">' + t.name + '</div>' +
            '<div ' + S + 'color:#8888a0;font-size:12px;margin:4px 0 10px;">автор: ' + (t.authorNick || '?') + ' · ❤ ' + likeCount(t.id) + '</div>' +
            ((t.tags || []).length ? '<div ' + S + 'margin-bottom:8px;font-size:12px;color:#0ff99;">' + t.tags.map(g => '#' + g).join(' ') + '</div>' : '') +
            '<div ' + S + 'color:#c8c8d8;font-size:13px;white-space:pre-wrap;border:1px solid #22222c;border-radius:8px;padding:10px;background:#0a0a10;min-height:60px;">' + (t.desc || 'без описания') + '</div>' +
            '<div ' + S + 'display:flex;gap:10px;margin-top:12px;">' +
            '<button data-act="like" data-id="' + t.id + '" ' + S + 'flex:1;padding:10px;border-radius:8px;border:1px solid #ff5d7a55;background:#16101a;color:#ff5d7a;cursor:pointer;font-size:14px;">' + (liked ? '❤ лайкнут' : '🤍 лайк') + '</button>' +
            '<button data-act="fav" data-id="' + t.id + '" ' + S + 'flex:1;padding:10px;border-radius:8px;border:1px solid #ffd75e55;background:#16140a;color:#ffd75e;cursor:pointer;font-size:14px;">' + (f ? '★ в избранном' : '☆ в избранное') + '</button>' +
            '</div>' +
            '<div ' + S + 'display:flex;gap:8px;margin-top:10px;border-top:1px solid #1c1c26;padding-top:10px;">' +
            (dl
                ? '<button data-act="use" data-id="' + t.id + '" ' + S + 'flex:2;padding:10px;border-radius:8px;border:1px solid #0ff66;background:#06161a;color:#0ff;cursor:pointer;font-weight:700;">' + (ap ? '✓ применена' : 'использовать') + '</button>' +
                  '<button data-act="del" data-id="' + t.id + '" ' + S + 'flex:1;padding:10px;border-radius:8px;border:1px solid #55222266;background:#160a0a;color:#f66;cursor:pointer;">удалить</button>'
                : '<button data-act="dl" data-id="' + t.id + '" ' + S + 'flex:2;padding:10px;border-radius:8px;border:1px solid #0ff66;background:#06161a;color:#0ff;cursor:pointer;font-weight:700;">скачать</button>') +
            '<button data-act="share" data-id="' + t.id + '" ' + S + 'flex:1;padding:10px;border-radius:8px;border:1px solid #33334455;background:#101018;color:#aab;cursor:pointer;">поделиться</button>' +
            '</div>' +
            (mine ? '<button data-act="netdel" data-id="' + t.id + '" ' + S + 'width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid #552222;background:#160a0a;color:#f66;cursor:pointer;font-size:12px;">✕ удалить из сети (ты автор)</button>' : '') +
            '</div>';
    }
    function pubHtml() {
        return '<div ' + S + 'padding:14px 16px;display:flex;flex-direction:column;gap:8px;">' +
            '<input id="vxst-p-name" placeholder="Название темы" ' + S + 'background:#0a0a10;border:1px solid #2a2a35;color:#eee;border-radius:8px;padding:10px;">' +
            '<input id="vxst-p-desc" placeholder="Описание" ' + S + 'background:#0a0a10;border:1px solid #2a2a35;color:#eee;border-radius:8px;padding:10px;">' +
            '<input id="vxst-p-tags" placeholder="хештеги: cyberpunk neon dark" ' + S + 'background:#0a0a10;border:1px solid #2a2a35;color:#eee;border-radius:8px;padding:10px;">' +
            '<textarea id="vxst-p-css" placeholder="CSS темы: :root{--accent:#0ff} .message-bubble{...}" rows="6" ' + S + 'background:#0a0a10;border:1px solid #2a2a35;color:#eee;border-radius:8px;padding:10px;font-family:monospace;font-size:12px;"></textarea>' +
            '<button data-act="pub-send" ' + S + 'padding:12px;border-radius:8px;border:1px solid #0ff66;background:#06161a;color:#0ff;cursor:pointer;font-weight:800;letter-spacing:1px;">ОПУБЛИКОВАТЬ</button>' +
            '</div>';
    }
    const TITLES = { top: '🏆 ТОП ТЕМ', mine: '👤 МОИ ТЕМЫ', fav: '★ ИЗБРАННОЕ', filter: '🔎 ФИЛЬТР', tag: '🔎 #', pub: '＋ НОВАЯ ТЕМА' };
    function title() { return view.detail ? '‹ ТЕМА' : (view.mode === 'tag' ? TITLES.tag + view.tag : TITLES[view.mode]); }

    function render() {
        const ov = document.getElementById('vx-store');
        if (!ov) return;
        let body;
        if (view.mode === 'pub') body = pubHtml();
        else if (view.detail) body = detailHtml(catalog.find(t => t.id === view.detail) || { name: '?' });
        else if (view.mode === 'filter') body = filterHtml();
        else body = listHtml();
        ov.querySelector('#vxst-title').textContent = title();
        ov.querySelector('#vxst-body').innerHTML = body;
        ov.querySelector('#vxst-menu').style.display = menuOpen ? 'block' : 'none';
    }
    function openStore() {
        if (document.getElementById('vx-store')) { document.getElementById('vx-store').remove(); return; }
        const ov = document.createElement('div');
        ov.id = 'vx-store';
        ov.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9998;display:flex;align-items:center;justify-content:center;';
        ov.innerHTML = '<div ' + S + 'width:min(440px,94vw);max-height:84vh;display:flex;flex-direction:column;background:#101016;border:1px solid #0ff44;border-radius:14px;overflow:hidden;">' +
            '<div ' + S + 'display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #1c1c26;position:relative;">' +
            '<button data-act="menu" ' + S + 'background:none;border:none;color:#0ff;font-size:20px;cursor:pointer;">☰</button>' +
            '<b id="vxst-title" ' + S + 'flex:1;color:#e8e8f0;letter-spacing:2px;font-size:14px;"></b>' +
            '<button data-act="pub-open" ' + S + 'background:none;border:none;color:#7f7;font-size:18px;cursor:pointer;">＋</button>' +
            '<button data-act="close" ' + S + 'background:none;border:none;color:#888;font-size:18px;cursor:pointer;">✕</button>' +
            '<div id="vxst-menu" ' + S + 'display:none;position:absolute;top:44px;left:10px;background:#15151d;border:1px solid #2a2a35;border-radius:10px;z-index:5;min-width:160px;">' +
            ['top|🏆 Топ', 'mine|👤 Мои', 'fav|★ Избранное', 'filter|🔎 Фильтр'].map(x => '<div data-act="mode" data-mode="' + x.split('|')[0] + '" ' + S + 'padding:10px 14px;color:#c8c8d8;cursor:pointer;border-bottom:1px solid #1c1c26;">' + x.split('|')[1] + '</div>').join('') +
            '<div data-act="import" ' + S + 'padding:10px 14px;color:#888;cursor:pointer;"> Импорт кода</div>' +
            '</div></div>' +
            '<div id="vxst-body" ' + S + 'overflow-y:auto;padding-bottom:10px;"></div></div>';
        document.body.appendChild(ov);
        render();
    }

    // ---------- клики ----------
    document.addEventListener('click', e => {
        const el = e.target.closest('[data-act]');
        const ov = document.getElementById('vx-store');
        if (!el || !ov || !ov.contains(el)) return;
        const act = el.dataset.act, id = el.dataset.id;
        if (act === 'close') { ov.remove(); return; }
        if (act === 'menu') { menuOpen = !menuOpen; render(); return; }
        if (act === 'mode') { view = { mode: el.dataset.mode, tag: null, detail: null }; menuOpen = false; render(); return; }
        if (act === 'tag') { view = { mode: 'tag', tag: el.dataset.tag, detail: null }; render(); return; }
        if (act === 'open') { view.detail = id; render(); return; }
        if (act === 'pub-open') { view = { mode: 'pub', tag: null, detail: null }; menuOpen = false; render(); return; }
        if (act === 'import') {
            const code = prompt('Вставь код темы (VDEXTHEME1:...):');
            if (code) { try { const th = dec(code); const l = local(); l[th.id] = th; wr(LS_LOCAL, l); toast('Тема «' + th.name + '» импортирована'); } catch (err) { toast('Битый код темы'); } }
            menuOpen = false; render(); return;
        }
        if (act === 'like') {
            const my = myLikes(); const on = my.indexOf(id) === -1;
            if (on) my.push(id); else my.splice(my.indexOf(id), 1);
            wr(LS_MY, my);
            VXApp.Network.transmit({ type: 'theme_like', themeId: id, on: on });
            render(); return;
        }
        if (act === 'fav') {
            const f = favs();
            if (f.indexOf(id) === -1) f.push(id); else f.splice(f.indexOf(id), 1);
            wr(LS_FAV, f); render(); return;
        }
        if (act === 'dl') { pendingDl = id; VXApp.Network.transmit({ type: 'theme_get', themeId: id }); toast('Скачиваю...'); return; }
        if (act === 'use') { applyTheme(id); render(); return; }
        if (act === 'del') {
            const l = local(); delete l[id]; wr(LS_LOCAL, l);
            if (rd(LS_APPLIED, null) === id) applyTheme('__reset__');
            toast('Локальная копия удалена'); render(); return;
        }
        if (act === 'netdel') { VXApp.Network.transmit({ type: 'theme_delete', themeId: id }); view.detail = null; render(); return; }
        if (act === 'share') {
            if (local()[id]) { navigator.clipboard.writeText(enc(local()[id])); toast('Код темы скопирован — вставь другу в чат'); }
            else { pendingShare = id; VXApp.Network.transmit({ type: 'theme_get', themeId: id }); toast('Скачиваю для отправки...'); }
            return;
        }
        if (act === 'pub-send') {
            const name = ov.querySelector('#vxst-p-name').value.trim();
            const css = ov.querySelector('#vxst-p-css').value.trim();
            if (!name || !css) { toast('Нужны название и CSS'); return; }
            const th = {
                id: 'th_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                name: name,
                desc: ov.querySelector('#vxst-p-desc').value.trim(),
                tags: ov.querySelector('#vxst-p-tags').value.split(/[\s,]+/).filter(Boolean),
                css: css
            };
            VXApp.Network.transmit({ type: 'theme_publish', theme: th });
            toast('Тема ушла в сеть');
            view = { mode: 'mine', tag: null, detail: null }; render(); return;
        }
    });

    // ---------- кнопка входа и сеть ----------
    function injectButton() {
        if (document.getElementById('vx-top-btn')) return;
        const anchor = document.querySelector('.left-panel') || document.querySelector('.sidebar') || document.body;
        const btn = document.createElement('button');
        btn.id = 'vx-top-btn';
        btn.textContent = '🎨 МАГАЗИН ТЕМ';
        btn.style.cssText = 'margin:8px;padding:8px 12px;background:#111;color:#0ff;border:1px solid #0ff44;border-radius:8px;cursor:pointer;letter-spacing:1px;font-weight:700;';
        btn.onclick = openStore;
        if (anchor === document.body) btn.style.cssText += 'position:fixed;left:10px;bottom:60px;z-index:999;';
        else anchor.insertBefore(btn, anchor.firstChild);
    }
    setTimeout(injectButton, 1200);
    setInterval(injectButton, 5000);

    function onWs(ev) {
        let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
        if (!d) return;
        if (d.type === 'theme_catalog') { catalog = d.themes || []; render(); }
        else if (d.type === 'theme_stats') { stats = d.stats || {}; render(); }
        else if (d.type === 'theme_full' && d.theme) {
            const l = local(); l[d.theme.id] = d.theme; wr(LS_LOCAL, l);
            if (pendingShare === d.theme.id) { pendingShare = null; navigator.clipboard.writeText(enc(d.theme)); toast('Код темы скопирован — вставь другу в чат'); }
            if (pendingDl === d.theme.id) { pendingDl = null; toast('Скачано: ' + d.theme.name); }
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
})();
