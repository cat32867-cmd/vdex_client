// ===================== VDEX THEMES HUB v2 =====================
(function () {
    const THEMES_URL = 'https://raw.githubusercontent.com/cat32867-cmd/vdex-data/main/themes.json';
    const LS_ACTIVE = 'vx_custom_theme';
    const LS_MY = 'vx_my_themes';

    const style = document.createElement('style');
    style.textContent = `
#vxt-bg { position: fixed; inset: 0; z-index: -2; background-size: cover; background-position: center; pointer-events: none; }
#vxt-fx { position: fixed; inset: 0; z-index: 9990; pointer-events: none; }
body.fx-cyberpunk #vxt-fx { background: repeating-linear-gradient(0deg, rgba(0,255,255,.05) 0 1px, transparent 1px 3px), linear-gradient(180deg, rgba(255,0,128,.10), transparent 35%, rgba(0,255,255,.10)); mix-blend-mode: screen; }
body.fx-cyberpunk .msg-bubble, body.fx-cyberpunk .channel-item, body.fx-cyberpunk .member-name { text-shadow: 1px 0 rgba(255,0,128,.35), -1px 0 rgba(0,255,255,.35); }
body.fx-glitchcore #vxt-fx { background: repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 2px, transparent 2px 5px); animation: vxtFlicker 3s infinite; }
body.fx-glitchcore .chat-header, body.fx-glitchcore .channels-panel, body.fx-glitchcore .msg-wrapper.mine { animation: vxtGlitch 5s infinite; }
body.fx-vhs #vxt-fx { background: repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 1px, transparent 1px 2px), radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.55)); animation: vxtFlicker 1.6s infinite; }
body.fx-noise #vxt-fx { opacity: .08; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>"); animation: vxtNoise .35s steps(3) infinite; }
@keyframes vxtGlitch { 0%,91%,100% { transform: none; clip-path: none; filter: none; } 92% { transform: translateX(-4px) skewX(-3deg); clip-path: inset(5% 0 55% 0); filter: hue-rotate(90deg); } 94% { transform: translateX(4px); clip-path: inset(45% 0 25% 0); } 96% { clip-path: inset(75% 0 5% 0); transform: none; } }
@keyframes vxtFlicker { 0%,100% { opacity: .7; } 45% { opacity: .95; } 47% { opacity: .35; } 49% { opacity: .85; } }
@keyframes vxtNoise { to { background-position: 90px 40px; } }
.vxt-list { display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; }
.vxt-item { display: flex; align-items: center; gap: 10px; border: 1px solid #222; border-radius: 10px; padding: 8px 10px; background: #0d0d0d; }
.vxt-item.active { border-color: var(--vx-primary); }
.vxt-preview { display: flex; gap: 3px; }
.vxt-dot { width: 12px; height: 12px; border-radius: 50%; }
.vxt-name { flex: 1; font-family: var(--font-mono); font-size: 12px; color: #ccc; }
.vxt-author { font-size: 10px; color: #666; display: block; }
.vxt-apply { padding: 5px 10px; font-size: 11px; }
.vxt-sec { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin: 12px 0 6px; }
.vxt-fxseg { display: flex; flex-wrap: wrap; gap: 6px; }
.vxt-fxseg button { padding: 6px 10px; font-size: 11px; font-family: var(--font-mono); background: transparent; border: 1px solid #333; border-radius: 6px; color: #888; cursor: pointer; }
.vxt-fxseg button.active { border-color: var(--vx-primary); color: var(--vx-primary); }
`;
    document.head.appendChild(style);

    // ---------- состояние ----------
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

    // ---------- окно списка тем ----------
    let modal = null;
    function buildModal() {
        modal = document.createElement('div');
        modal.className = 'overlay'; modal.id = 'vxt-modal';
        modal.innerHTML = '<div class="modal" style="max-width:460px;">' +
            '<header class="modal-header"><h2 class="modal-title">ТЕМЫ VDEX</h2><button class="btn-close" id="vxt-close">✕</button></header>' +
            '<div class="modal-body">' +
            '<div class="vxt-sec">Сообщество (GitHub)</div><div id="vxt-status" style="font-size:11px;color:#666;margin-bottom:6px;">Загрузка...</div><div class="vxt-list" id="vxt-list"></div>' +
            '<div class="vxt-sec">Мои темы</div><div class="vxt-list" id="vxt-mylist"></div>' +
            '</div>' +
            '<footer class="modal-footer">' +
            '<button class="btn-modal btn-cancel" id="vxt-reset">Сброс</button>' +
            '<button class="btn-modal btn-cancel" id="vxt-import">Импорт кода</button>' +
            '<button class="btn-modal btn-submit" id="vxt-create">Создать тему</button>' +
            '</footer></div>';
        document.body.appendChild(modal);
        document.getElementById('vxt-close').onclick = () => modal.classList.remove('active');
        document.getElementById('vxt-reset').onclick = () => { localStorage.removeItem(LS_ACTIVE); clearTheme(); applyTheme(null); VXApp.UI.showToast('Тема сброшена к базовой', 'info'); renderMy(); };
        document.getElementById('vxt-import').onclick = () => {
            const code = prompt('Вставь код темы (JSON):');
            if (!code) return;
            try {
                const t = JSON.parse(code);
                if (!t.name) throw new Error('нет имени');
                t.id = 'imp_' + Date.now();
                const my = getMy(); my.push(t); setMy(my);
                VXApp.UI.showToast('Тема «' + t.name + '» импортирована', 'info');
                renderMy();
            } catch (e) { VXApp.UI.showToast('Не похоже на код темы', 'error'); }
        };
        document.getElementById('vxt-create').onclick = openBuilder;
    }

    function itemRow(t, isMy) {
        const cur = getActive();
        const row = document.createElement('div');
        row.className = 'vxt-item' + (cur && cur.id === t.id ? ' active' : '');
        const prev = document.createElement('div'); prev.className = 'vxt-preview';
        ['--vx-primary', '--vx-info', '--vx-danger'].forEach(k => {
            const d = document.createElement('div'); d.className = 'vxt-dot';
            d.style.background = (t.vars && t.vars[k]) || '#333'; prev.appendChild(d);
        });
        const name = document.createElement('div'); name.className = 'vxt-name';
        name.innerHTML = (t.name || t.id) + '<span class="vxt-author">' + (t.effect && t.effect !== 'none' ? t.effect + ' · ' : '') + 'by ' + (t.author || 'unknown') + '</span>';
        const btn = document.createElement('button'); btn.className = 'btn-modal btn-submit vxt-apply'; btn.innerText = 'Взять';
        btn.onclick = () => { localStorage.setItem(LS_ACTIVE, JSON.stringify(t)); applyTheme(t); VXApp.UI.showToast('Тема «' + t.name + '» применена', 'info'); modal.classList.remove('active'); };
        row.appendChild(prev); row.appendChild(name);
        if (isMy) {
            const exp = document.createElement('button'); exp.className = 'btn-modal btn-cancel vxt-apply'; exp.innerText = 'Код';
            exp.onclick = () => {
                const copy = { name: t.name, author: t.author, vars: t.vars, effect: t.effect, bgOpacity: t.bgOpacity, bg: (t.bg && t.bg.indexOf('data:') !== 0) ? t.bg : undefined };
                navigator.clipboard?.writeText(JSON.stringify(copy));
                VXApp.UI.showToast('Код темы скопирован (фото не входит — оно тяжёлое)', 'info');
            };
            const del = document.createElement('button'); del.className = 'btn-modal btn-danger vxt-apply'; del.innerText = '✕';
            del.onclick = () => { setMy(getMy().filter(x => x.id !== t.id)); renderMy(); };
            row.appendChild(exp); row.appendChild(del);
        }
        row.appendChild(btn);
        return row;
    }

    function renderMy() {
        const box = document.getElementById('vxt-mylist');
        if (!box) return;
        box.innerHTML = '';
        const my = getMy();
        if (!my.length) { box.innerHTML = '<div style="font-size:11px;color:#555;">Пока пусто. Нажми «Создать тему».</div>'; return; }
        my.forEach(t => box.appendChild(itemRow(t, true)));
    }

    async function loadCommunity() {
        const status = document.getElementById('vxt-status');
        const list = document.getElementById('vxt-list');
        list.innerHTML = '';
        try {
            const res = await fetch(THEMES_URL + '?cb=' + Date.now());
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const themes = data.themes || [];
            status.innerText = themes.length ? ('Тем в сети: ' + themes.length) : 'В репозитории пока нет тем.';
            themes.forEach(t => list.appendChild(itemRow(t, false)));
        } catch (e) { status.innerText = 'GitHub недоступен: ' + e.message; }
    }

    // ---------- конструктор темы ----------
    let builder = null, draft = { name: '', vars: {}, bg: null, bgOpacity: 0.35, effect: 'none' };
    function buildBuilder() {
        builder = document.createElement('div');
        builder.className = 'overlay'; builder.id = 'vxt-builder';
        builder.innerHTML = '<div class="modal" style="max-width:460px;">' +
            '<header class="modal-header"><h2 class="modal-title">КОНСТРУКТОР ТЕМЫ</h2><button class="btn-close" id="vxb-close">✕</button></header>' +
            '<div class="modal-body">' +
            '<div class="form-group"><label>Название темы</label><input class="form-input" id="vxb-name" placeholder="напр. NEON RAIN"></div>' +
            '<div class="vxt-sec">Фон</div>' +
            '<div class="vxs-row"><button class="btn-modal btn-cancel" id="vxb-photo">Фото с устройства</button><button class="btn-modal btn-cancel" id="vxb-nophoto">Убрать фото</button></div>' +
            '<input type="file" id="vxb-file" accept="image/*" hidden>' +
            '<div class="form-group"><label>Прозрачность фона: <span id="vxb-opv">0.35</span></label><input type="range" id="vxb-op" min="0.05" max="1" step="0.05" value="0.35" style="width:100%;"></div>' +
            '<div class="vxt-sec">Эффект</div>' +
            '<div class="vxt-fxseg" id="vxb-fx">' +
            '<button data-v="none" class="active">нет</button><button data-v="cyberpunk">cyberpunk</button><button data-v="glitchcore">glitchcore</button><button data-v="vhs">vhs</button><button data-v="noise">зерно</button></div>' +
            '<div class="vxt-sec">Акцентный цвет</div>' +
            '<div class="vxs-row"><input type="color" id="vxb-color" value="#00ff41" style="width:44px;height:32px;border:1px solid #333;border-radius:6px;background:#0d0d0d;padding:2px;cursor:pointer;"></div>' +
            '</div>' +
            '<footer class="modal-footer">' +
            '<button class="btn-modal btn-cancel" id="vxb-preview">Предпросмотр</button>' +
            '<button class="btn-modal btn-submit" id="vxb-save">Сохранить тему</button>' +
            '</footer></div>';
        document.body.appendChild(builder);
        document.getElementById('vxb-close').onclick = () => { builder.classList.remove('active'); applyTheme(getActive()); };
        document.getElementById('vxb-photo').onclick = () => document.getElementById('vxb-file').click();
        document.getElementById('vxb-file').addEventListener('change', e => {
            const f = e.target.files[0];
            if (f) fileToBg(f, d => { draft.bg = d; VXApp.UI.showToast('Фото сжато и готово', 'info'); });
        });
        document.getElementById('vxb-nophoto').onclick = () => { draft.bg = null; };
        document.getElementById('vxb-op').oninput = e => { draft.bgOpacity = parseFloat(e.target.value); document.getElementById('vxb-opv').innerText = draft.bgOpacity; };
        document.querySelectorAll('#vxb-fx button').forEach(b => b.onclick = () => {
            draft.effect = b.dataset.v;
            document.querySelectorAll('#vxb-fx button').forEach(x => x.classList.toggle('active', x === b));
        });
        document.getElementById('vxb-color').oninput = e => { draft.vars = { '--vx-primary': e.target.value, '--vx-primary-dim': e.target.value + '1a' }; };
        document.getElementById('vxb-preview').onclick = () => { draft.name = document.getElementById('vxb-name').value || 'DRAFT'; applyTheme(draft); };
        document.getElementById('vxb-save').onclick = () => {
            const name = document.getElementById('vxb-name').value.trim();
            if (!name) return VXApp.UI.showToast('Дай теме имя', 'warn');
            draft.name = name; draft.author = VXState.user.nickname || 'anon'; draft.id = 'my_' + Date.now();
            const my = getMy(); my.push(JSON.parse(JSON.stringify(draft))); setMy(my);
            localStorage.setItem(LS_ACTIVE, JSON.stringify(draft));
            applyTheme(draft);
            builder.classList.remove('active');
            VXApp.UI.showToast('Тема «' + name + '» сохранена и включена', 'info');
            renderMy();
        };
    }
    function openBuilder() {
        if (!builder) buildBuilder();
        builder.classList.add('active');
    }

    function openThemes() {
        if (!modal) buildModal();
        modal.classList.add('active');
        renderMy();
        loadCommunity();
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#vxs-custom-themes')) return;
        e.stopPropagation(); e.preventDefault();
        openThemes();
    }, true);

    applyTheme(getActive());
    document.addEventListener('DOMContentLoaded', () => applyTheme(getActive()));
})();
