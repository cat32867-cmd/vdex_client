// ===================== VX SETTINGS HUB =====================
(function () {
    const LS = {
        get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
        set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
    };

    const style = document.createElement('style');
    style.textContent = `
body.no-matrix #vx-bg-canvas { display: none; }
body.matte * { text-shadow: none !important; }
body.matte .channel-item.active::before, body.matte .node-avatar:hover, body.matte .strip-action:hover, body.matte #btn-scroll-down:hover, body.matte .srv-ping.connected, body.matte .ch-avatar, body.matte .msg-avatar, body.matte .msg-author:hover { box-shadow: none !important; }
body.matte .msg-bubble, body.matte .input-wrapper, body.matte .modal, body.matte .chat-header { backdrop-filter: none; -webkit-backdrop-filter: none; }
.vxs-tabs { display: flex; gap: 6px; overflow-x: auto; padding: 12px 16px 0; background: rgba(0,0,0,.2); border-bottom: 1px solid #1a1a1a; }
.vxs-tab { flex: 0 0 auto; padding: 8px 12px; font-size: 12px; font-family: var(--font-mono); color: #888; background: transparent; border: 1px solid transparent; border-bottom: none; border-radius: 8px 8px 0 0; cursor: pointer; }
.vxs-tab.active { color: var(--vx-primary); border-color: #222; background: #0d0d0d; }
.vxs-panel { display: none; padding: 16px; overflow-y: auto; }
.vxs-panel.active { display: flex; flex-direction: column; gap: 14px; }
.vxs-row { display: flex; align-items: center; gap: 10px; }
.vxs-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .5px; font-weight: bold; }
.vxs-avatar { width: 56px; height: 56px; border-radius: 14px; background-color: #161616; background-size: cover; background-position: center; border: 1px solid #333; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold; color: #888; font-family: var(--font-mono); flex-shrink: 0; }
.vxs-swatches { display: flex; gap: 8px; flex-wrap: wrap; }
.vxs-swatch { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: .2s; }
.vxs-swatch:hover, .vxs-swatch.active { border-color: #fff; transform: scale(1.1); }
.vxs-seg { display: flex; border: 1px solid #333; border-radius: 8px; overflow: hidden; }
.vxs-seg button { flex: 1; padding: 8px 12px; background: transparent; border: none; color: #888; font-family: var(--font-mono); font-size: 12px; cursor: pointer; }
.vxs-seg button.active { background: var(--vx-primary-dim); color: var(--vx-primary); }
.vxs-switch { position: relative; width: 44px; height: 24px; background: #222; border-radius: 12px; cursor: pointer; transition: .2s; flex-shrink: 0; }
.vxs-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #888; transition: .2s; }
.vxs-switch.on { background: var(--vx-primary-dim); }
.vxs-switch.on::after { left: 23px; background: var(--vx-primary); }
.vxs-note { font-size: 11px; color: #666; line-height: 1.5; }
input[type="color"].vxs-wheel { width: 44px; height: 32px; border: 1px solid #333; border-radius: 6px; background: #0d0d0d; padding: 2px; cursor: pointer; }
`;
    document.head.appendChild(style);

    function setColor(hex, save) {
        document.documentElement.style.setProperty('--vx-primary', hex);
        document.documentElement.style.setProperty('--vx-primary-dim', hex + '1A');
        if (save) LS.set('vx_custom_color', hex);
        document.querySelectorAll('.vxs-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === hex));
        const wheel = document.getElementById('vxs-wheel');
        if (wheel) wheel.value = hex;
    }
    function applyAll() {
        const c = LS.get('vx_custom_color', null);
        if (c) setColor(c, false);
        document.body.classList.toggle('no-matrix', LS.get('vx_view_bg', 'matrix') === 'plain');
        document.body.classList.toggle('matte', LS.get('vx_view_outline', 'neon') === 'matte');
    }

    const SWATCHES = ['#00ff41', '#00e5ff', '#ff003c', '#b000ff', '#ffcc00', '#ff8800'];
    let modal = null;

    function build() {
        modal = document.createElement('div');
        modal.className = 'overlay';
        modal.id = 'vxs-modal';
        modal.innerHTML = `<div class="modal" style="max-width:480px;height:82vh;">
<header class="modal-header"><h2 class="modal-title">НАСТРОЙКИ УЗЛА</h2><button class="btn-close" id="vxs-close">✕</button></header>
<div class="vxs-tabs">
<button class="vxs-tab active" data-p="profile">Профиль</button>
<button class="vxs-tab" data-p="reset">Сброс и выход</button>
<button class="vxs-tab" data-p="view">Вид</button>
<button class="vxs-tab" data-p="censor">Цензура</button>
<button class="vxs-tab" data-p="save">Сохранения</button>
</div>
<div class="modal-body" style="padding:0;flex:1;">
<div class="vxs-panel active" data-p="profile">
<div class="vxs-row"><div class="vxs-avatar" id="vxs-avatar"></div>
<div style="flex:1;display:flex;flex-direction:column;gap:8px;"><button class="btn-modal btn-cancel" id="vxs-change-avatar">Сменить иконку</button>
<div class="vxs-note">Аватар виден в чате, списке узлов и личных каналах.</div></div></div>
<input type="file" id="vxs-avatar-input" accept="image/*" hidden>
<div class="form-group"><label>Позывной</label><input class="form-input" id="vxs-nick"></div>
<div class="form-group"><label>Ваш ID</label><div class="vxs-row"><input class="form-input" id="vxs-uid" readonly><button class="btn-modal btn-cancel" id="vxs-copy-uid">Коп</button></div></div>
<div class="form-group"><label>Статус</label><div class="form-input" id="vxs-status" style="cursor:default;">обычный узел</div></div>
<div class="form-group"><label>Спец-ключ спонсора</label><div class="vxs-row"><input class="form-input" id="vxs-sponsor" placeholder="XXXX-XXXX-XXXX"><button class="btn-modal btn-submit" id="vxs-sponsor-apply">Применить</button></div>
<div class="vxs-note">Спонсорская система пока не подключена. Ключ сохранится локально и сработает после обновления.</div></div>
<button class="btn-modal btn-submit" id="vxs-save-profile">Сохранить профиль</button>
</div>
<div class="vxs-panel" data-p="reset">
<button class="btn-modal btn-cancel" id="vxs-logout">Выйти из аккаунта (данные останутся)</button>
<button class="btn-modal btn-danger" id="vxs-wipe">Удалить узел полностью</button>
<div class="vxs-note">Полное удаление стирает с этого устройства профиль, историю сообщений, реакции и настройки. Аккаунт на сервере останется — сможешь войти снова с любого устройства.</div>
</div>
<div class="vxs-panel" data-p="view">
<div class="form-group"><label>Базовая палитра</label>
<select class="form-input" id="vxs-base-theme"><option value="dark">VX Dark</option><option value="crimson">Crimson Protocol</option><option value="ocean">Deep Ocean</option></select></div>
<div class="form-group"><label>Акцентный цвет</label>
<div class="vxs-row"><input type="color" class="vxs-wheel" id="vxs-wheel"><div class="vxs-swatches" id="vxs-swatches"></div></div>
<button class="btn-modal btn-cancel" id="vxs-color-reset" style="align-self:flex-start;">Сбросить к цвету палитры</button></div>
<div class="form-group"><label>Тип фона</label>
<div class="vxs-seg" id="vxs-seg-bg"><button data-v="matrix">Matrix</button><button data-v="plain">Обычный</button></div></div>
<div class="form-group"><label>Контур</label>
<div class="vxs-seg" id="vxs-seg-outline"><button data-v="neon">Неон</button><button data-v="matte">Матовый</button></div></div>
<button class="btn-modal btn-cancel" id="vxs-custom-themes">Скачать темы из GitHub</button>
<div class="vxs-note">Кастомные темы в разработке: позже можно будет класть свои файлы тем в репозиторий vdex-data и применять их здесь в один тап.</div>
</div>
<div class="vxs-panel" data-p="censor">
<div class="vxs-row" style="justify-content:space-between;"><div><div class="vxs-label">Маскировать мат</div><div class="vxs-note">Локальная маска нецензурных слов в сообщениях на этом устройстве.</div></div><div class="vxs-switch" id="vxs-sw-prof"></div></div>
<div class="vxs-row" style="justify-content:space-between;"><div><div class="vxs-label">Блур заблокированного</div><div class="vxs-note">Сообщения с пометкой [заблокировано] размываются до тапа.</div></div><div class="vxs-switch" id="vxs-sw-blur"></div></div>
<div class="vxs-note">Основной фильтр 18+ работает на сервере и отключению не подлежит — это закон сети VX.</div>
</div>
<div class="vxs-panel" data-p="save">
<div class="vxs-note">Раздел в разработке. Здесь появится облачное сохранение профиля, ключей и настроек (GitHub или карта-ядро) и быстрый вход на новом устройстве.</div>
<button class="btn-modal btn-cancel" disabled style="opacity:.4;">Сохранить в облако</button>
<button class="btn-modal btn-cancel" disabled style="opacity:.4;">Восстановить</button>
</div>
</div></div>`;
        document.body.appendChild(modal);
        wire();
    }

    function syncUI() {
        const av = document.getElementById('vxs-avatar');
        if (VXState.user.avatar) { av.style.backgroundImage = `url(${VXState.user.avatar})`; av.innerText = ''; }
        else { av.style.backgroundImage = ''; av.innerText = (VXState.user.nickname || '?').charAt(0).toUpperCase(); }
        document.getElementById('vxs-nick').value = VXState.user.nickname || '';
        document.getElementById('vxs-uid').value = VXState.user.uid || '';
        const key = LS.get('vx_sponsor_key', '');
        document.getElementById('vxs-sponsor').value = key;
        document.getElementById('vxs-status').innerText = key ? 'спонсор (ожидает подключения системы)' : 'обычный узел';
        document.getElementById('vxs-base-theme').value = VXState.user.theme || 'dark';
        const sw = document.getElementById('vxs-swatches');
        sw.innerHTML = '';
        SWATCHES.forEach(c => {
            const s = document.createElement('div');
            s.className = 'vxs-swatch'; s.dataset.color = c; s.style.background = c;
            s.onclick = () => setColor(c, true);
            sw.appendChild(s);
        });
        const cur = LS.get('vx_custom_color', null);
        document.getElementById('vxs-wheel').value = cur || getComputedStyle(document.body).getPropertyValue('--vx-primary').trim() || '#00ff41';
        document.querySelectorAll('#vxs-seg-bg button').forEach(b => b.classList.toggle('active', b.dataset.v === LS.get('vx_view_bg', 'matrix')));
        document.querySelectorAll('#vxs-seg-outline button').forEach(b => b.classList.toggle('active', b.dataset.v === LS.get('vx_view_outline', 'neon')));
        document.getElementById('vxs-sw-prof').classList.toggle('on', LS.get('vx_censor_prof', true));
        document.getElementById('vxs-sw-blur').classList.toggle('on', LS.get('vx_censor_blur', true));
        if (cur) setColor(cur, false);
    }

    function wire() {
        modal.querySelectorAll('.vxs-tab').forEach(t => t.onclick = () => {
            modal.querySelectorAll('.vxs-tab').forEach(x => x.classList.toggle('active', x === t));
            modal.querySelectorAll('.vxs-panel').forEach(p => p.classList.toggle('active', p.dataset.p === t.dataset.p));
        });
        document.getElementById('vxs-close').onclick = () => modal.classList.remove('active');
        document.getElementById('vxs-change-avatar').onclick = () => document.getElementById('vxs-avatar-input').click();
        document.getElementById('vxs-avatar-input').addEventListener('change', (e) => {
            const f = e.target.files[0];
            if (!f || !f.type.startsWith('image/')) return;
            const r = new FileReader();
            r.onload = (ev) => { VXState.user.avatar = ev.target.result; syncUI(); };
            r.readAsDataURL(f);
        });
        document.getElementById('vxs-copy-uid').onclick = () => { navigator.clipboard?.writeText(VXState.user.uid); VXApp.UI.showToast('ID скопирован', 'info'); };
        document.getElementById('vxs-sponsor-apply').onclick = () => {
            const v = document.getElementById('vxs-sponsor').value.trim();
            LS.set('vx_sponsor_key', v);
            syncUI();
            VXApp.UI.showToast(v ? 'Ключ сохранён. Статус обновится после подключения спонсорской системы' : 'Ключ очищен', 'info');
        };
        document.getElementById('vxs-save-profile').onclick = () => {
            const newNick = document.getElementById('vxs-nick').value.trim();
            const oldNick = VXState.user.nickname;
            if (newNick.length < 2) return VXApp.UI.showToast('Ник слишком короткий', 'error');
            VXState.user.nickname = newNick;
            localStorage.setItem('vx_nick', newNick);
            if (oldNick !== newNick) VXAccounts.changeNickname(oldNick, newNick);
            if (VXState.user.avatar) { localStorage.setItem('vx_avatar', VXState.user.avatar); VXAccounts.updateAvatar(newNick, VXState.user.avatar); }
            else { localStorage.removeItem('vx_avatar'); VXAccounts.updateAvatar(newNick, null); }
            VXState.ui.avatars[VXState.user.uid] = VXState.user.avatar;
            VXApp.Network.transmit({ type: 'update_profile', nickname: newNick, avatar: VXState.user.avatar });
            VXApp.UI.showToast('Профиль обновлён', 'info');
            modal.classList.remove('active');
        };
        document.getElementById('vxs-logout').onclick = () => {
            localStorage.removeItem('vx_nick'); localStorage.removeItem('vx_uuid');
            localStorage.removeItem('vx_avatar'); localStorage.removeItem('vx_pass_hash');
            location.reload();
        };
        document.getElementById('vxs-wipe').onclick = () => {
            if (!confirm('Удалить узел ПОЛНОСТЬЮ с этого устройства? История и ключи будут стёрты.')) return;
            VXApp.Database.clearAll();
        };
        document.getElementById('vxs-base-theme').onchange = (e) => VXApp.UI.setTheme(e.target.value);
        document.getElementById('vxs-wheel').oninput = (e) => setColor(e.target.value, true);
        document.getElementById('vxs-color-reset').onclick = () => {
            localStorage.removeItem('vx_custom_color');
            document.documentElement.style.removeProperty('--vx-primary');
            document.documentElement.style.removeProperty('--vx-primary-dim');
            syncUI();
        };
        document.querySelectorAll('#vxs-seg-bg button').forEach(b => b.onclick = () => {
            LS.set('vx_view_bg', b.dataset.v);
            document.body.classList.toggle('no-matrix', b.dataset.v === 'plain');
            syncUI();
        });
        document.querySelectorAll('#vxs-seg-outline button').forEach(b => b.onclick = () => {
            LS.set('vx_view_outline', b.dataset.v);
            document.body.classList.toggle('matte', b.dataset.v === 'matte');
            syncUI();
        });
        document.getElementById('vxs-custom-themes').onclick = () => VXApp.UI.showToast('Кастомные темы: в разработке', 'warn');
        document.getElementById('vxs-sw-prof').onclick = () => { const v = !LS.get('vx_censor_prof', true); LS.set('vx_censor_prof', v); syncUI(); };
        document.getElementById('vxs-sw-blur').onclick = () => { const v = !LS.get('vx_censor_blur', true); LS.set('vx_censor_blur', v); syncUI(); };
    }

    function open() {
        if (!modal) build();
        syncUI();
        modal.classList.add('active');
    }

    // Перехват кнопки шестерёнки: старое окно настроек больше не открывается
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#btn-settings')) return;
        e.stopPropagation();
        e.preventDefault();
        open();
    }, true);

    // Цензура: пост-обработка пузырей сообщений
    const origRender = VXInterface.prototype.renderMessageHTML;
    VXInterface.prototype.renderMessageHTML = async function (data, skipSave) {
        const res = await origRender.call(this, data, skipSave);
        try {
            const el = document.getElementById('msg-' + (data.id || ''));
            const bubble = el && el.querySelector('.msg-bubble');
            if (!bubble) return res;
            if (LS.get('vx_censor_prof', true)) {
                bubble.innerHTML = bubble.innerHTML.replace(/(хуй|пизд|ебан|бляд|суч|хуе)[а-яё]*/gi, (m) => '✱'.repeat(m.length));
            }
            if (LS.get('vx_censor_blur', true) && /заблокирован|удалено/i.test(bubble.textContent)) {
                bubble.style.filter = 'blur(6px)';
                bubble.style.cursor = 'pointer';
                bubble.onclick = () => { bubble.style.filter = ''; bubble.onclick = null; };
            }
        } catch (e) {}
        return res;
    };

    applyAll();
    document.addEventListener('DOMContentLoaded', applyAll);
})();
