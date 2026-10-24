// ===================== VDEX THEMES HUB v3 =====================
(function () {
    const OFFICIAL_URL = 'https://raw.githubusercontent.com/cat32867-cmd/vdex-data/main/themes.json';
    const COMMUNITY_URL = 'https://raw.githubusercontent.com/cat32867-cmd/vdex-data/main/community.json';
    const LS_ACTIVE = 'vx_custom_theme';
    const LS_MY = 'vx_my_themes';

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
.vxt-tabs{display:flex;gap:6px;padding:10px 16px 0;border-bottom:1px solid #1a1a1a;background:rgba(0,0,0,.2);}
.vxt-tab{padding:8px 12px;font-family:var(--font-mono);font-size:12px;color:#888;background:transparent;border:1px solid transparent;border-bottom:none;border-radius:8px 8px 0 0;cursor:pointer;}
.vxt-tab.active{color:var(--vx-primary);border-color:#222;background:#0d0d0d;}
.vxt-panel{display:none;padding:14px 16px;overflow-y:auto;}
.vxt-panel.active{display:block;}
.vxt-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;}
.vxt-chips{display:flex;gap:6px;flex-wrap:wrap;}
.vxt-chip{padding:4px 10px;font-size:10px;font-family:var(--font-mono);border:1px solid #333;border-radius:12px;color:#888;cursor:pointer;background:transparent;}
.vxt-chip.active{border-color:var(--vx-primary);color:var(--vx-primary);}
.vxt-search{flex:1;min-width:140px;background:#0d0d0d;border:1px solid #333;border-radius:8px;color:#ccc;padding:6px 10px;font-family:var(--font-mono);font-size:12px;}
.vxt-list{display:flex;flex-direction:column;gap:8px;}
.vxt-item{border:1px solid #222;border-radius:10px;padding:8px 10px;background:#0d0d0d;}
.vxt-item.active{border-color:var(--vx-primary);}
.vxt-row{display:flex;align-items:center;gap:10px;cursor:pointer;}
.vxt-preview{display:flex;gap:3px;}
.vxt-dot{width:12px;height:12px;border-radius:50%;}
.vxt-name{flex:1;font-family:var(--font-mono);font-size:12px;color:#ccc;}
.vxt-author{font-size:10px;color:#666;display:block;}
.vxt-apply{padding:5px 10px;font-size:11px;}
.vxt-actions{display:none;gap:6px;flex-wrap:wrap;margin-top:8px;padding-top:8px;border-top:1px dashed #222;}
.vxt-item.open .vxt-actions{display:flex;}
.vxt-actions button{padding:5px 10px;font-size:10px;}
.vxt-badge{font-size:9px;padding:2px 6px;border:1px solid #333;border-radius:8px;color:#888;font-family:var(--font-mono);}
.vxt-badge.top{color:var(--vx-warn,#ffcc00);border-color:var(--vx-warn,#ffcc00);}
.vxt-sec{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin:10px 0 6px;}
.vxt-fxseg{display:flex;flex-wrap:wrap;gap:6px;}
.vxt-fxseg button{padding:6px 10px;font-size:11px;font-family:var(--font-mono);background:transparent;border:1px solid #333;border-radius:6px;color:#888;cursor:pointer;}
.vxt-fxseg button.active{border-color:var(--vx-primary);color:var(--vx-primary);}
.vxt-empty{font-size:11px;color:#555;padding:8px;}
`;
    document.head.appendChild(style);

    // ---------- состояние и применение ----------
    const getActive = () => { try { return JSON.parse(localStorage.getItem(LS_ACTIVE) || 'null'); } catch (e) { return null; } };
    const getMy = () => { try { return JSON.parse(localStorage.getItem(LS_MY) || '[]'); } catch (e) { return []; } };
    const setMy = (a) => localStorage.setItem(LS_MY, JSON.stringify(a));
    const ALL_VARS = ['--vx-primary', '--vx-primary-dim', '--vx-info', '--vx-danger', '--vx-warn', '--bg-color', '--panel-color', '--border-color'];
    function clearTheme() {
        ALL_VARS.forEach(k => document.documentElement.style.removeProperty(k));
        const bg = document.getElementById('vxt-bg'); if (bg) bg.remove();
        const fx = document.getElementById('vxt-fx'); if (fx) fx.remove();
        ['fx-cyberpunk', 'fx-glitchcore', 'fx-vhs', 'fx-noise'].forEach(c => document.body.classList.remove(c));
    }
    function applyTheme(t) {
        clearTheme();
        if (!t) return;
        if (t.vars) for (const k in t.vars) document.documentElement.style.setProperty(k, t.vars[k]);
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

    // ---------- данные ----------
    let official = null, community = null;
    const F = { offStyle: 'all', comStyle: 'all', comQuery: '', comTop: false };

    async function loadData() {
        try {
            const r1 = await fetch(OFFICIAL_URL + '?cb=' + Date.now());
            official = r1.ok ? ((await r1.json()).themes || []) : [];
        } catch (e) { official = []; }
        try {
            const r2 = await fetch(COMMUNITY_URL + '?cb=' + Date.now());
            community = r2.ok ? ((await r2.json()).themes || []) : [];
        } catch (e) { community = []; }
    }

    // ---------- элементы списка ----------
    function dots(prev, t) {
        ['--vx-primary', '--vx-info', '--vx-danger'].forEach(k => {
            const d = document.createElement('div'); d.className = 'vxt-dot';
            d.style.background = (t.vars && t.vars[k]) || '#333'; prev.appendChild(d);
        });
    }
    function remoteItem(t, isCommunity, topIdx) {
        const cur = getActive();
        const item = document.createElement('div');
        item.className = 'vxt-item' + (cur && cur.id === t.id ? ' active' : '');
        const row = document.createElement('div'); row.className = 'vxt-row';
        const prev = document.createElement('div'); prev.className = 'vxt-preview'; dots(prev, t);
        const name = document.createElement('div'); name.className = 'vxt-name';
        let badges = (t.style ? '<span class="vxt-badge">' + t.style + '</span> ' : '');
        if (isCommunity && topIdx >= 0) badges = '<span class="vxt-badge top">TOP ' + (topIdx + 1) + '</span> ' + badges;
        if (isCommunity && t.uses) badges += '<span class="vxt-badge">' + t.uses + ' исп.</span>';
        name.innerHTML = (t.name || t.id) + badges + '<span class="vxt-author">by ' + (t.author || 'unknown') + '</span>';
        const btn = document.createElement('button'); btn.className = 'btn-modal btn-submit vxt-apply'; btn.innerText = 'Взять';
        btn.onclick = (ev) => { ev.stopPropagation(); localStorage.setItem(LS_ACTIVE, JSON.stringify(t)); applyTheme(t); VXApp.UI.showToast('Тема «' + t.name + '» применена', 'info'); };
        row.appendChild(prev); row.appendChild(name); row.appendChild(btn);
        item.appendChild(row);
        return item;
    }
    function myItem(t) {
        const cur = getActive();
        const item = document.createElement('div');
        item.className = 'vxt-item' + (cur && cur.id === t.id ? ' active' : '');
        const row = document.createElement('div'); row.className = 'vxt-row';
        const prev = document.createElement('div'); prev.className = 'vxt-preview'; dots(prev, t);
        const name = document.createElement('div'); name.className = 'vxt-name';
        name.innerHTML = (t.name || t.id) + (t.style ? ' <span class="vxt-badge">' + t.style + '</span>' : '') + '<span class="vxt-author">локальная тема</span>';
        row.appendChild(prev); row.appendChild(name);
        row.onclick = () => item.classList.toggle('open');
        const act = document.createElement('div'); act.className = 'vxt-actions';
        const mk = (txt, cls, fn) => { const b = document.createElement('button'); b.className = 'btn-modal ' + cls + ' vxt-apply'; b.innerText = txt; b.onclick = fn; return b; };
        act.appendChild(mk('Применить', 'btn-submit', () => { localStorage.setItem(LS_ACTIVE, JSON.stringify(t)); applyTheme(t); VXApp.UI.showToast('Тема «' + t.name + '» применена', 'info'); }));
        act.appendChild(mk('Переименовать', 'btn-cancel', () => {
            const nn = prompt('Новое название темы:', t.name);
            if (nn && nn.trim()) { t.name = nn.trim(); setMy(getMy().map(x => x.id === t.id ? t : x)); renderMy(); }
        }));
        act.appendChild(mk('Опубликовать', 'btn-submit', () => {
            const code = JSON.stringify({ name: t.name, author: t.author || VXState.user.nickname, style: t.style || 'custom', effect: t.effect, bgOpacity: t.bgOpacity, bg: (t.bg && t.bg.indexOf('data:') !== 0) ? t.bg : undefined, vars: t.vars });
            navigator.clipboard?.writeText(code);
            VXApp.UI.showToast('Код темы скопирован. Кинь его в #DEV_NULL или владельцу — после модерации тема попадёт во вкладку «От пользователей»', 'info');
        }));
        act.appendChild(mk('Удалить', 'btn-danger', () => {
            if (!confirm('Удалить тему «' + t.name + '»?')) return;
            setMy(getMy().filter(x => x.id !== t.id));
            const a = getActive(); if (a && a.id === t.id) { localStorage.removeItem(LS_ACTIVE); applyTheme(null); }
            renderMy();
        }));
        item.appendChild(row); item.appendChild(act);
        return item;
    }

    // ---------- рендеры вкладок ----------
    function chipsFor(box, list, current, onPick) {
        box.innerHTML = '';
        const styles = ['all'];
        list.forEach(t => { if (t.style && styles.indexOf(t.style) === -1) styles.push(t.style); });
        styles.forEach(s => {
            const c = document.createElement('button');
            c.className = 'vxt-chip' + (current === s ? ' active' : '');
            c.innerText = s === 'all' ? 'все стили' : s;
            c.onclick = () => onPick(s);
            box.appendChild(c);
        });
    }
    function renderOfficial() {
        const list = document.getElementById('vxt-off-list');
        const chips = document.getElementById('vxt-off-chips');
        if (!official) { list.innerHTML = '<div class="vxt-empty">Загрузка...</div>'; return; }
        chipsFor(chips, official, F.offStyle, s => { F.offStyle = s; renderOfficial(); });
        list.innerHTML = '';
        const filtered = official.filter(t => F.offStyle === 'all' || t.style === F.offStyle);
        if (!filtered.length) { list.innerHTML = '<div class="vxt-empty">Тем с таким стилем пока нет.</div>'; return; }
        filtered.forEach(t => list.appendChild(remoteItem(t, false, -1)));
    }
    function renderMy() {
        const list = document.getElementById('vxt-my-list');
        list.innerHTML = '';
        const my = getMy();
        if (!my.length) { list.innerHTML = '<div class="vxt-empty">Пока пусто. Создай тему кнопкой внизу или импортируй код.</div>'; return; }
        my.forEach(t => list.appendChild(myItem(t)));
    }
    function renderCommunity() {
        const list = document.getElementById('vxt-com-list');
        const chips = document.getElementById('vxt-com-chips');
        if (!community) { list.innerHTML = '<div class="vxt-empty">Загрузка...</div>'; return; }
        chipsFor(chips, community, F.comStyle, s => { F.comStyle = s; renderCommunity(); });
        list.innerHTML = '';
        let pool = community.slice();
        if (F.comTop) { pool.sort((a, b) => (b.uses || 0) - (a.uses || 0)); pool = pool.slice(0, 10); }
        if (F.comStyle !== 'all') pool = pool.filter(t => t.style === F.comStyle);
        if (F.comQuery) {
            const q = F.comQuery.toLowerCase();
            pool = pool.filter(t => ((t.name || '') + ' ' + (t.author || '')).toLowerCase().indexOf(q) !== -1);
        }
        if (!pool.length) { list.innerHTML = '<div class="vxt-empty">Ничего не найдено. Сообщество пока тихое.</div>'; return; }
        const sortedForTop = community.slice().sort((a, b) => (b.uses || 0) - (a.uses || 0));
        pool.forEach(t => list.appendChild(remoteItem(t, true, sortedForTop.indexOf(t))));
    }

    // ---------- модалка ----------
    let modal = null;
    function buildModal() {
        modal = document.createElement('div');
        modal.className = 'overlay'; modal.id = 'vxt-modal';
        modal.innerHTML = '<div class="modal" style="max-width:480px;height:84vh;">' +
            '<header class="modal-header"><h2 class="modal-title">ТЕМЫ VDEX</h2><button class="btn-close" id="vxt-close">✕</button></header>' +
            '<div class="vxt-tabs">' +
            '<button class="vxt-tab active" data-p="off">От VDEX</button>' +
            '<button class="vxt-tab" data-p="my">Мои</button>' +
            '<button class="vxt-tab" data-p="com">От пользователей</button>' +
            '</div>' +
            '<div class="modal-body" style="padding:0;flex:1;">' +
            '<div class="vxt-panel active" data-p="off"><div class="vxt-tools"><div class="vxt-chips" id="vxt-off-chips"></div></div><div class="vxt-list" id="vxt-off-list"></div></div>' +
            '<div class="vxt-panel" data-p="my"><div class="vxt-tools"><button class="btn-modal btn-cancel vxt-apply" id="vxt-import">Импорт кода</button></div><div class="vxt-list" id="vxt-my-list"></div><div class="vxt-empty">Тап по теме открывает действия: применить, переименовать, опубликовать, удалить.</div></div>' +
            '<div class="vxt-panel" data-p="com"><div class="vxt-tools"><input class="vxt-search" id="vxt-com-search" placeholder="поиск: имя или автор..."><button class="vxt-chip" id="vxt-com-top">ТОП-10</button></div><div class="vxt-tools"><div class="vxt-chips" id="vxt-com-chips"></div></div><div class="vxt-list" id="vxt-com-list"></div></div>' +
            '</div>' +
            '<footer class="modal-footer"><button class="btn-modal btn-cancel" id="vxt-reset">Сброс</button><button class="btn-modal btn-submit" id="vxt-create">Создать тему</button></footer></div>';
        document.body.appendChild(modal);
        modal.querySelectorAll('.vxt-tab').forEach(tb => tb.onclick = () => {
            modal.querySelectorAll('.vxt-tab').forEach(x => x.classList.toggle('active', x === tb));
            modal.querySelectorAll('.vxt-panel').forEach(p => p.classList.toggle('active', p.dataset.p === tb.dataset.p));
        });
        document.getElementById('vxt-close').onclick = () => modal.classList.remove('active');
        document.getElementById('vxt-reset').onclick = () => { localStorage.removeItem(LS_ACTIVE); applyTheme(null); VXApp.UI.showToast('Тема сброшена к базовой', 'info'); };
        document.getElementById('vxt-create').onclick = openBuilder;
        document.getElementById('vxt-import').onclick = () => {
            const code = prompt('Вставь код темы (JSON):');
            if (!code) return;
            try {
                const t = JSON.parse(code);
                if (!t.name) throw new Error('no name');
                t.id = 'imp_' + Date.now();
                const my = getMy(); my.push(t); setMy(my);
                VXApp.UI.showToast('Тема «' + t.name + '» добавлена в «Мои»', 'info');
                renderMy();
            } catch (e) { VXApp.UI.showToast('Не похоже на код темы', 'error'); }
        };
        document.getElementById('vxt-com-search').oninput = e => { F.comQuery = e.target.value.trim(); renderCommunity(); };
        document.getElementById('vxt-com-top').onclick = e => {
            F.comTop = !F.comTop;
            e.target.classList.toggle('active', F.comTop);
            renderCommunity();
        };
    }
    async function openThemes() {
        if (!modal) buildModal();
        modal.classList.add('active');
        official = null; community = null;
        renderOfficial(); renderMy(); renderCommunity();
        await loadData();
        renderOfficial(); renderCommunity();
    }

    // ---------- конструктор ----------
    let builder = null;
    let draft = { name: '', style: '', vars: {}, bg: null, bgOpacity: 0.35, effect: 'none' };
    function openBuilder() {
        if (!builder) {
            builder = document.createElement('div');
            builder.className = 'overlay'; builder.id = 'vxt-builder';
            builder.innerHTML = '<div class="modal" style="max-width:460px;">' +
                '<header class="modal-header"><h2 class="modal-title">КОНСТРУКТОР ТЕМЫ</h2><button class="btn-close" id="vxb-close">✕</button></header>' +
                '<div class="modal-body">' +
                '<div class="form-group"><label>Название</label><input class="form-input" id="vxb-name" placeholder="напр. NEON RAIN"></div>' +
                '<div class="form-group"><label>Стиль (для фильтров)</label><input class="form-input" id="vxb-style" placeholder="напр. hyperpunk"></div>' +
                '<div class="vxt-sec">Фон</div>' +
                '<div class="vxt-row"><button class="btn-modal btn-cancel vxt-apply" id="vxb-photo">Фото с устройства</button><button class="btn-modal btn-cancel vxt-apply" id="vxb-nophoto">Убрать фото</button></div>' +
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
                draft.author = VXState.user.nickname || 'anon';
                draft.id = 'my_' + Date.now();
                const my = getMy(); my.push(JSON.parse(JSON.stringify(draft))); setMy(my);
                localStorage.setItem(LS_ACTIVE, JSON.stringify(draft));
                applyTheme(draft);
                builder.classList.remove('active');
                VXApp.UI.showToast('Тема «' + name + '» сохранена и включена', 'info');
                renderMy();
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
