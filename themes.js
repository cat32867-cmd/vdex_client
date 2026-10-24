// ===================== VDEX THEMES HUB =====================
(function () {
    const THEMES_URL = 'https://raw.githubusercontent.com/cat32867-cmd/vdex-data/main/themes.json';
    const LS_KEY = 'vx_custom_theme';

    const style = document.createElement('style');
    style.textContent = `
.vxt-list { display: flex; flex-direction: column; gap: 10px; }
.vxt-item { display: flex; align-items: center; gap: 10px; border: 1px solid #222; border-radius: 10px; padding: 10px 12px; background: #0d0d0d; }
.vxt-item.active { border-color: var(--vx-primary); }
.vxt-preview { display: flex; gap: 4px; }
.vxt-dot { width: 14px; height: 14px; border-radius: 50%; }
.vxt-name { flex: 1; font-family: var(--font-mono); font-size: 12px; color: #ccc; }
.vxt-author { font-size: 10px; color: #666; display: block; }
.vxt-apply { padding: 6px 12px; font-size: 11px; }
`;
    document.head.appendChild(style);

    function saved() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; } }
    const ALL_VARS = ['--vx-primary', '--vx-primary-dim', '--vx-info', '--vx-danger', '--vx-warn', '--bg-color', '--panel-color', '--border-color'];
    function applyVars(vars) { for (const k in vars) document.documentElement.style.setProperty(k, vars[k]); }
    function clearVars() { ALL_VARS.forEach(k => document.documentElement.style.removeProperty(k)); }
    function applySaved() {
        const s = saved();
        if (s && s.vars) applyVars(s.vars);
        try {
            const c = JSON.parse(localStorage.getItem('vx_custom_color') || 'null');
            if (c) {
                document.documentElement.style.setProperty('--vx-primary', c);
                document.documentElement.style.setProperty('--vx-primary-dim', c + '1A');
            }
        } catch (e) {}
    }

    let modal = null;
    function build() {
        modal = document.createElement('div');
        modal.className = 'overlay';
        modal.id = 'vxt-modal';
        modal.innerHTML = '<div class="modal" style="max-width:440px;">' +
            '<header class="modal-header"><h2 class="modal-title">ТЕМЫ ИЗ GITHUB</h2><button class="btn-close" id="vxt-close">✕</button></header>' +
            '<div class="modal-body"><div id="vxt-status" style="font-size:11px;color:#666;margin-bottom:10px;">Загрузка списка тем...</div><div class="vxt-list" id="vxt-list"></div></div>' +
            '<footer class="modal-footer"><button class="btn-modal btn-cancel" id="vxt-reset">Сбросить к базовой</button><button class="btn-modal btn-submit" id="vxt-refresh">Обновить список</button></footer></div>';
        document.body.appendChild(modal);
        document.getElementById('vxt-close').onclick = () => modal.classList.remove('active');
        document.getElementById('vxt-reset').onclick = () => {
            localStorage.removeItem(LS_KEY);
            clearVars();
            applySaved();
            VXApp.UI.showToast('Кастомная тема сброшена', 'info');
            modal.classList.remove('active');
        };
        document.getElementById('vxt-refresh').onclick = load;
    }

    async function load() {
        const status = document.getElementById('vxt-status');
        const list = document.getElementById('vxt-list');
        status.innerText = 'Загрузка списка тем...';
        list.innerHTML = '';
        try {
            const res = await fetch(THEMES_URL + '?cb=' + Date.now());
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const themes = data.themes || [];
            if (!themes.length) { status.innerText = 'В репозитории пока нет тем.'; return; }
            status.innerText = 'Доступно тем: ' + themes.length + ' · источник: vdex-data/themes.json';
            const cur = saved();
            themes.forEach(t => {
                const item = document.createElement('div');
                item.className = 'vxt-item' + (cur && cur.id === t.id ? ' active' : '');
                const prev = document.createElement('div');
                prev.className = 'vxt-preview';
                ['--vx-primary', '--vx-info', '--vx-danger'].forEach(k => {
                    const d = document.createElement('div');
                    d.className = 'vxt-dot';
                    d.style.background = (t.vars && t.vars[k]) || '#333';
                    prev.appendChild(d);
                });
                const info = document.createElement('div');
                info.className = 'vxt-name';
                info.innerHTML = (t.name || t.id) + '<span class="vxt-author">by ' + (t.author || 'unknown') + '</span>';
                const btn = document.createElement('button');
                btn.className = 'btn-modal btn-submit vxt-apply';
                btn.innerText = (cur && cur.id === t.id) ? '✓ Активна' : 'Взять';
                btn.onclick = () => {
                    localStorage.setItem(LS_KEY, JSON.stringify({ id: t.id, vars: t.vars }));
                    clearVars();
                    applyVars(t.vars);
                    applySaved();
                    VXApp.UI.showToast('Тема «' + (t.name || t.id) + '» применена', 'info');
                    modal.classList.remove('active');
                };
                item.appendChild(prev); item.appendChild(info); item.appendChild(btn);
                list.appendChild(item);
            });
        } catch (e) {
            status.innerText = 'Ошибка загрузки: ' + e.message + '. Проверь, что в vdex-data лежит themes.json';
        }
    }

    function openThemes() {
        if (!modal) build();
        modal.classList.add('active');
        load();
    }

    // Перехват кнопки «Скачать темы из GitHub» в настройках (затычка больше не нужна)
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#vxs-custom-themes')) return;
        e.stopPropagation();
        e.preventDefault();
        openThemes();
    }, true);

    applySaved();
    document.addEventListener('DOMContentLoaded', applySaved);
})();
