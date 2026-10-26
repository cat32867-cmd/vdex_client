// ===================== VDEX POWER PACK: стикеры / обои / правка+удаление =====================
(function () {
    const LS_ST = 'vx_stickers', LS_WP = 'vx_wallpapers';
    const getSt = () => { try { return JSON.parse(localStorage.getItem(LS_ST) || '[]'); } catch (e) { return []; } };
    const saveSt = (l) => localStorage.setItem(LS_ST, JSON.stringify(l));
    const getWP = () => { try { return JSON.parse(localStorage.getItem(LS_WP) || '{}'); } catch (e) { return {}; } };
    const saveWP = (m) => localStorage.setItem(LS_WP, JSON.stringify(m));

    const style = document.createElement('style');
    style.textContent = `
.msg-sticker { max-width: 160px; border-radius: 12px; display: block; margin-top: 4px; }
.msg-edited { font-size: 9px; color: #666; font-style: italic; margin-left: 4px; }
#vx-stk-panel { position: fixed; bottom: 96px; right: 16px; z-index: 70; background: #0d0d0d; border: 1px solid #333; border-radius: 12px; padding: 8px; display: none; grid-template-columns: repeat(5, 56px); gap: 6px; }
#vx-stk-panel.active { display: grid; }
.vx-stk-slot { width: 56px; height: 56px; border-radius: 10px; border: 1px dashed #333; background-color: #111; background-size: cover; background-position: center; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #555; font-size: 20px; }
.vx-stk-slot:hover { border-color: var(--vx-primary); }
#vx-wall-modal .vw-grid { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
.vw-thumb { width: 72px; height: 48px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; background-color: #111; }
.vw-thumb.sel { border-color: var(--vx-primary); }
`;
    document.head.appendChild(style);

    // ---------- БД: точечные правки и удаление ----------
    function dbPatch(id, patch) {
        const db = VXApp.Database.db; if (!db) return;
        try {
            const tx = db.transaction(['messages'], 'readwrite');
            const rq = tx.objectStore('messages').get(id);
            rq.onsuccess = () => { const m = rq.result; if (!m) return; Object.assign(m, patch); tx.objectStore('messages').put(m); };
        } catch (e) {}
    }
    function dbDel(id) {
        const db = VXApp.Database.db; if (!db) return;
        try { db.transaction(['messages'], 'readwrite').objectStore('messages').delete(id); } catch (e) {}
    }

    // ---------- правка / удаление у обоих ----------
    let editingId = null;
    function esc(t) { return t.replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function linkify(t) { return esc(t).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--vx-info);text-decoration:none;">$1</a>'); }
    function applyEditLocal(msgId, text, faction) {
        dbPatch(msgId, { text: text, edited: true });
        const wrap = document.getElementById('msg-' + msgId) || document.getElementById(msgId);
        if (!wrap) return;
        const bubble = wrap.querySelector('.msg-bubble');
        if (bubble) {
            const stk = bubble.querySelector('.msg-sticker');
            const rq = bubble.querySelector('.reply-quote');
            bubble.innerHTML = (rq ? rq.outerHTML : '') + linkify(text) + (stk ? stk.outerHTML : '');
        }
        const meta = wrap.querySelector('.msg-meta');
        if (meta && !meta.querySelector('.msg-edited')) {
            const s = document.createElement('span'); s.className = 'msg-edited'; s.textContent = '(изменено)';
            meta.insertBefore(s, meta.querySelector('.msg-time'));
        }
    }
    function removeLocal(msgId) {
        const w = document.getElementById('msg-' + msgId) || document.getElementById(msgId);
        if (w) w.remove();
        dbDel(msgId);
    }
    function startEdit(msgId) {
        const wrap = document.getElementById(msgId);
        if (!wrap) return;
        const bubble = wrap.querySelector('.msg-bubble');
        let txt = bubble ? bubble.innerText.trim() : '';
        const stk = bubble ? bubble.querySelector('.msg-sticker') : null;
        if (stk && txt === '') txt = '';
        editingId = msgId;
        const input = document.getElementById('msg-input');
        input.value = txt; input.focus();
        VXApp.UI.showToast('Правка: Enter заменит сообщение у всех, Esc — отмена', 'info');
    }
    function delAll(msgId) {
        const wrap = document.getElementById(msgId);
        const faction = (wrap && wrap.dataset.ch) || VXState.ui.activeChannelId;
        removeLocal(msgId);
        VXApp.Network.transmit({ type: 'msg_delete', msgId: msgId, faction: faction });
        VXApp.UI.showToast('Удалено у всех', 'info');
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editingId) {
            editingId = null;
            const input = document.getElementById('msg-input');
            input.value = ''; input.style.height = '40px';
            VXApp.UI.showToast('Правка отменена', 'info');
        }
    });
    const origCmd = VXInterface.prototype.handleCommandOrMessage;
    VXInterface.prototype.handleCommandOrMessage = async function () {
        if (editingId) {
            const txt = this.els.input.value.trim();
            const id = editingId; editingId = null;
            this.els.input.value = ''; this.els.input.style.height = '40px'; this.els.btnSend.classList.remove('active');
            if (!txt) return;
            const wrap = document.getElementById(id);
            const faction = (wrap && wrap.dataset.ch) || VXState.ui.activeChannelId;
            applyEditLocal(id, txt, faction);
            VXApp.Network.transmit({ type: 'msg_edit', msgId: id, text: txt, faction: faction });
            return;
        }
        return origCmd.call(this);
    };

    // ---------- пункты в контекстном меню ----------
    function injectCtx() {
        const menu = document.getElementById('context-menu');
        if (!menu || menu.querySelector('#ctx-edit')) return;
        const e1 = document.createElement('div'); e1.className = 'ctx-item'; e1.id = 'ctx-edit'; e1.innerText = 'Изменить';
        const e2 = document.createElement('div'); e2.className = 'ctx-item'; e2.id = 'ctx-delall'; e2.innerText = 'Удалить у всех';
        menu.appendChild(e1); menu.appendChild(e2);
        e1.addEventListener('click', (ev) => { ev.stopPropagation(); menu.style.display = 'none'; startEdit(VXApp.UI.ctxTargetMsgId); });
        e2.addEventListener('click', (ev) => { ev.stopPropagation(); menu.style.display = 'none'; delAll(VXApp.UI.ctxTargetMsgId); });
    }
    document.addEventListener('contextmenu', (e) => {
        const wrap = e.target.closest('.msg-wrapper');
        setTimeout(() => {
            injectCtx();
            const menu = document.getElementById('context-menu');
            if (!menu) return;
            const mine = !!(wrap && wrap.classList.contains('mine'));
            const ed = menu.querySelector('#ctx-edit'), dl = menu.querySelector('#ctx-delall');
            if (ed) ed.style.display = mine ? '' : 'none';
            if (dl) dl.style.display = mine ? '' : 'none';
        }, 0);
    }, true);

    // ---------- сеть: приём правок и удалений ----------
    function onWs(ev) {
        let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
        if (!d) return;
        if (d.type === 'msg_edit') applyEditLocal(d.msgId, d.text, d.faction);
        else if (d.type === 'msg_delete') removeLocal(d.msgId);
    }
    const origConnect = VXNetwork.prototype.connect;
    VXNetwork.prototype.connect = function (url) {
        const r = origConnect.call(this, url);
        if (VXState.network.socket) VXState.network.socket.addEventListener('message', onWs);
        return r;
    };

    // ---------- рендер: стикеры, пометка, канал в dataset ----------
    const origRender = VXInterface.prototype.renderMessageHTML;
    VXInterface.prototype.renderMessageHTML = async function (data, skipSave) {
        const res = await origRender.call(this, data, skipSave);
        try {
            const wrap = document.getElementById('msg-' + (data.id || ''));
            if (!wrap) return res;
            wrap.dataset.ch = data.faction || '';
            if (data.sticker && !wrap.querySelector('.msg-sticker')) {
                const img = document.createElement('img');
                img.className = 'msg-sticker'; img.src = data.sticker;
                const bubble = wrap.querySelector('.msg-bubble');
                (bubble || wrap).appendChild(img);
            }
            if (data.edited && !wrap.querySelector('.msg-edited')) {
                const meta = wrap.querySelector('.msg-meta');
                if (meta) {
                    const s = document.createElement('span'); s.className = 'msg-edited'; s.textContent = '(изменено)';
                    meta.insertBefore(s, meta.querySelector('.msg-time'));
                }
            }
        } catch (e) {}
        return res;
    };

    // ---------- стикеры: кнопка, панель, отправка ----------
    function injectStkBtn() {
        const up = document.getElementById('btn-upload-file');
        if (!up || document.getElementById('vx-stk-btn')) return;
        const b = document.createElement('button');
        b.id = 'vx-stk-btn'; b.className = up.className; b.title = 'Стикеры (свои, без магазина)';
        b.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/><path d="M9 10h.01M15 10h.01"/><path d="M9 14s1.5 1.5 3 1.5 3-1.5 3-1.5"/></svg>';
        up.parentNode.insertBefore(b, up.nextSibling);
        const panel = document.createElement('div'); panel.id = 'vx-stk-panel'; document.body.appendChild(panel);
        b.onclick = (e) => { e.stopPropagation(); renderPanel(); panel.classList.toggle('active'); };
        document.addEventListener('click', (e) => { if (!e.target.closest('#vx-stk-panel') && !e.target.closest('#vx-stk-btn')) panel.classList.remove('active'); });
    }
    function renderPanel() {
        const panel = document.getElementById('vx-stk-panel');
        const list = getSt();
        panel.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const slot = document.createElement('div');
            slot.className = 'vx-stk-slot';
            if (list[i]) {
                slot.style.backgroundImage = 'url(' + list[i] + ')';
                slot.title = 'Отправить стикер (ПКМ — убрать из набора)';
                slot.onclick = () => sendSticker(list[i]);
                slot.oncontextmenu = (ev) => { ev.preventDefault(); const l = getSt(); l.splice(i, 1); saveSt(l); renderPanel(); };
            } else {
                slot.textContent = '+';
                slot.title = 'Добавить свою картинку';
                slot.onclick = () => pickSticker(i);
            }
            panel.appendChild(slot);
        }
    }
    function pickSticker(i) {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => {
            const f = inp.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const c = document.createElement('canvas');
                    let w = img.width, h = img.height; const MAX = 160;
                    if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                    if (h > w && h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
                    c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    const list = getSt(); list[i] = c.toDataURL('image/webp', 0.8); saveSt(list); renderPanel();
                };
                img.src = ev.target.result;
            };
            r.readAsDataURL(f);
        };
        inp.click();
    }
    function sendSticker(url) {
        const ch = VXState.ui.channels.find(c => c.id === VXState.ui.activeChannelId);
        const msgData = {
            id: Date.now().toString(),
            type: (ch && ch.isPrivate) ? 'private_message' : 'chat',
            uid: VXState.user.uid, nickname: VXState.user.nickname,
            text: '', isEncrypted: false, faction: VXState.ui.activeChannelId, sticker: url,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), timestamp: Date.now()
        };
        if (ch && ch.isPrivate) msgData.targetUid = ch.targetUid;
        VXApp.Network.transmit(msgData);
        VXApp.UI.renderMessageHTML(msgData, false);
        document.getElementById('vx-stk-panel').classList.remove('active');
    }

    // ---------- обои на каждый чат ----------
    const WP_CATALOG = [
        { id: 'w_none', name: 'Нет', css: '' },
        { id: 'w_grid', name: 'Сетка', css: 'repeating-linear-gradient(90deg,rgba(0,255,255,.06) 0 1px,transparent 1px 40px),repeating-linear-gradient(0deg,rgba(255,0,200,.06) 0 1px,transparent 1px 40px)' },
        { id: 'w_matrix', name: 'Матрица', css: 'repeating-linear-gradient(90deg,rgba(0,255,65,.08) 0 1px,transparent 1px 18px)' },
        { id: 'w_synth', name: 'Синтвейв', css: 'linear-gradient(180deg,rgba(18,0,43,.65),rgba(255,41,119,.25))' },
        { id: 'w_void', name: 'Пустота', css: 'radial-gradient(circle at 50% 20%,rgba(255,255,255,.05),transparent 60%)' },
        { id: 'w_noise', name: 'Шум', css: 'repeating-conic-gradient(rgba(255,255,255,.03) 0% 25%, transparent 0% 50%)' }
    ];
    function applyWP(chId) {
        const flow = document.getElementById('chat-flow');
        if (!flow) return;
        const v = getWP()[chId];
        if (!v) { flow.style.background = ''; flow.style.backgroundSize = ''; return; }
        if (v.indexOf('data:') === 0) { flow.style.background = 'url(' + v + ') center/cover no-repeat'; }
        else { const cat = WP_CATALOG.find(x => x.id === v); flow.style.background = cat ? cat.css : ''; flow.style.backgroundSize = 'auto'; }
    }
    const origSwitch = VXInterface.prototype.switchChannel;
    VXInterface.prototype.switchChannel = async function (id) {
        const r = await origSwitch.call(this, id);
        applyWP(id);
        return r;
    };
    function injectChCtx() {
        const menu = document.getElementById('channel-context-menu');
        if (!menu || menu.querySelector('#ctx-wall')) return;
        const it = document.createElement('div'); it.className = 'ctx-item'; it.id = 'ctx-wall'; it.innerText = 'Обои чата';
        menu.appendChild(it);
        it.addEventListener('click', (ev) => { ev.stopPropagation(); menu.style.display = 'none'; openWall(VXApp.UI.ctxTargetChannelId); });
    }
    let wallModal = null, wallCh = null;
    function openWall(chId) {
        wallCh = chId;
        if (!wallModal) {
            wallModal = document.createElement('div');
            wallModal.className = 'overlay'; wallModal.id = 'vx-wall-modal';
            wallModal.innerHTML = '<div class="modal" style="max-width:420px;"><header class="modal-header"><h2 class="modal-title">ОБОИ ЧАТА</h2><button class="btn-close" id="vw-close">✕</button></header><div class="modal-body"><div class="vxs-note">Обои личные: хранятся только на этом узле и никуда не отправляются.</div><div class="vw-grid" id="vw-grid"></div><div class="vxp-actions"><button class="btn-modal btn-cancel" id="vw-upl">Своё фото</button><button class="btn-modal btn-cancel" id="vw-rm">Убрать</button></div></div></div>';
            document.body.appendChild(wallModal);
            document.getElementById('vw-close').onclick = () => wallModal.classList.remove('active');
            document.getElementById('vw-rm').onclick = () => { const m = getWP(); delete m[wallCh]; saveWP(m); applyWP(wallCh); wallModal.classList.remove('active'); };
            document.getElementById('vw-upl').onclick = () => {
                const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
                inp.onchange = () => {
                    const f = inp.files[0]; if (!f) return;
                    const r = new FileReader();
                    r.onload = (ev) => {
                        const img = new Image();
                        img.onload = () => {
                            const c = document.createElement('canvas');
                            let w = img.width, h = img.height; const MAX = 900;
                            if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                            c.width = w; c.height = h;
                            c.getContext('2d').drawImage(img, 0, 0, w, h);
                            const m = getWP(); m[wallCh] = c.toDataURL('image/jpeg', 0.5); saveWP(m); applyWP(wallCh);
                            wallModal.classList.remove('active');
                        };
                        img.src = ev.target.result;
                    };
                    r.readAsDataURL(f);
                };
                inp.click();
            };
        }
        const grid = document.getElementById('vw-grid');
        grid.innerHTML = '';
        const cur = getWP()[wallCh] || 'w_none';
        WP_CATALOG.forEach(w => {
            const t = document.createElement('div');
            t.className = 'vw-thumb' + (cur === w.id ? ' sel' : '');
            t.style.background = w.css || '#111';
            t.title = w.name;
            t.onclick = () => { const m = getWP(); if (w.id === 'w_none') delete m[wallCh]; else m[wallCh] = w.id; saveWP(m); applyWP(wallCh); openWall(wallCh); };
            grid.appendChild(t);
        });
        wallModal.classList.add('active');
    }

    // ---------- старт ----------
    function init() { injectStkBtn(); injectCtx(); injectChCtx(); }
    const mo = new MutationObserver(() => { injectCtx(); injectChCtx(); });
    mo.observe(document.body, { childList: true, subtree: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
