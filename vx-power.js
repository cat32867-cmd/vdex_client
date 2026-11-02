// ===================== VDEX POWER PACK v2 =====================
(function () {
    const LS_ST = 'vx_stickers', LS_WP = 'vx_wallpapers', LS_META = 'vx_chan_meta';
    const OWNERS = ['node_urjp669q9', 'node_ib2umt9lm'];
    const isOwner = () => OWNERS.indexOf(VXState.user.uid) !== -1 || ['owner', 'admin', 'moder'].indexOf(VXState.user.role) !== -1;
    const getSt = () => { try { return JSON.parse(localStorage.getItem(LS_ST) || '[]'); } catch (e) { return []; } };
    const saveSt = (l) => localStorage.setItem(LS_ST, JSON.stringify(l));
    const getWP = () => { try { return JSON.parse(localStorage.getItem(LS_WP) || '{}'); } catch (e) { return {}; } };
    const saveWP = (m) => localStorage.setItem(LS_WP, JSON.stringify(m));
    const getMeta = () => { try { return JSON.parse(localStorage.getItem(LS_META) || '{}'); } catch (e) { return {}; } };
    const setMeta = (m) => localStorage.setItem(LS_META, JSON.stringify(m));

    const style = document.createElement('style');
    style.textContent = `
.msg-sticker { max-width: 160px; border-radius: 12px; display: block; margin-top: 4px; }
.msg-edited { font-size: 9px; color: #666; font-style: italic; margin-left: 4px; }
#vx-stk-panel { display: none; grid-template-columns: repeat(5, 1fr); gap: 6px; padding: 8px; background: #0d0d0d; border: 1px solid #333; border-radius: 12px; margin: 0 12px 8px; }
#vx-stk-panel.active { display: grid; }
.vx-stk-slot { width: 100%; aspect-ratio: 1; border-radius: 10px; border: 1px dashed #333; background-color: #111; background-size: cover; background-position: center; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #555; font-size: 20px; }
.vx-stk-slot:hover { border-color: var(--vx-primary); }
.vxcs-tabs { display: flex; gap: 6px; margin-bottom: 12px; }
.vxcs-tabs button { flex: 1; padding: 9px 4px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #777; background: transparent; border: 1px solid #222; border-radius: 8px; cursor: pointer; }
.vxcs-tabs button.sel { color: var(--vx-primary); border-color: var(--vx-primary); background: #0d0d0d; }
.vw-grid { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
.vw-thumb { width: 64px; height: 42px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; background-color: #111; }
.vw-thumb.sel { border-color: var(--vx-primary); }
.vxcs-sec { font-size: 10px; letter-spacing: 1.5px; color: #666; text-transform: uppercase; margin: 12px 0 6px; font-family: var(--font-mono); }
.vxcs-row { display: flex; gap: 8px; align-items: center; margin: 8px 0; }
.vxcs-av { width: 56px; height: 56px; border-radius: 14px; background-color: #161616; background-size: cover; background-position: center; border: 1px solid #333; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #888; font-family: var(--font-mono); }
.vxcs-lockrow { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 10px 0; }
#vxcs-desc { width: 100%; background: #0d0d0d; border: 1px solid #333; border-radius: 8px; color: #ccc; padding: 8px; font-family: var(--font-mono); font-size: 12px; }
`;
    document.head.appendChild(style);

    // ---------- БД: правки и удаления ----------
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
    function applyEditLocal(msgId, text) {
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
        editingId = msgId;
        const input = document.getElementById('msg-input');
        input.value = bubble ? bubble.innerText.trim() : '';
        input.focus();
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
            applyEditLocal(id, txt);
            VXApp.Network.transmit({ type: 'msg_edit', msgId: id, text: txt, faction: faction });
            return;
        }
        return origCmd.call(this);
    };

    // ---------- контекстное меню сообщений ----------
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
        if (d.type === 'msg_edit') applyEditLocal(d.msgId, d.text);
        else if (d.type === 'msg_delete') removeLocal(d.msgId);
    }
    const origConnect = VXNetwork.prototype.connect;
    VXNetwork.prototype.connect = function (url) {
        const r = origConnect.call(this, url);
        if (VXState.network.socket) VXState.network.socket.addEventListener('message', onWs);
        return r;
    };

    // ---------- рендер: стикеры, пометка, канал ----------
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

    // ---------- общий файловый input (фикс бага «плюс не работает») ----------
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    let fileMode = null, fileSlot = 0;
    fileInput.addEventListener('change', () => {
        const f = fileInput.files[0];
        const mode = fileMode;
        fileInput.value = ''; fileMode = null;
        if (!f) return;
        const r = new FileReader();
        r.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas');
                let w = img.width, h = img.height;
                let MAX = 160, q = 0.8, fmt = 'image/webp';
                if (mode === 'chav') { MAX = 256; q = 0.7; fmt = 'image/jpeg'; }
                if (mode === 'wp') { MAX = 900; q = 0.5; fmt = 'image/jpeg'; }
                if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                if (h >= w && h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                const url = c.toDataURL(fmt, q);
                if (mode === 'sticker') { const l = getSt(); l[fileSlot] = url; saveSt(l); renderPanel(); }
                else if (mode === 'chav') { draftAv = url; paintChSet(); }
                else if (mode === 'wp') { const m = getWP(); m[curCh] = url; saveWP(m); applyWP(curCh); paintChSet(); }
            };
            img.src = ev.target.result;
        };
        r.readAsDataURL(f);
    });
    function pickFile(mode, slot) { fileMode = mode; fileSlot = slot || 0; fileInput.click(); }

    // ---------- стикеры: кнопка + выдвижная панель (без наложения) ----------
    function injectStkBtn() {
        const up = document.getElementById('btn-upload-file');
        const iw = document.getElementById('input-wrapper');
        if (!up || !iw || document.getElementById('vx-stk-btn')) return;
        const b = document.createElement('button');
        b.id = 'vx-stk-btn'; b.className = up.className; b.title = 'Стикеры (свои, без магазина)';
        b.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/><path d="M9 10h.01M15 10h.01"/><path d="M9 14s1.5 1.5 3 1.5 3-1.5 3-1.5"/></svg>';
        up.parentNode.insertBefore(b, up.nextSibling);
        const panel = document.createElement('div');
        panel.id = 'vx-stk-panel';
        iw.parentNode.insertBefore(panel, iw);
        b.onclick = (e) => { e.stopPropagation(); renderPanel(); panel.classList.toggle('active'); };
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#vx-stk-panel') && !e.target.closest('#vx-stk-btn')) panel.classList.remove('active');
        });
    }
    function renderPanel() {
        const panel = document.getElementById('vx-stk-panel');
        if (!panel) return;
        const list = getSt();
        panel.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const slot = document.createElement('div');
            slot.className = 'vx-stk-slot';
            if (list[i]) {
                slot.style.backgroundImage = 'url(' + list[i] + ')';
                slot.title = 'Отправить стикер (ПКМ / долгое нажатие — убрать)';
                slot.onclick = () => sendSticker(list[i]);
                slot.oncontextmenu = (ev) => { ev.preventDefault(); const l = getSt(); l.splice(i, 1); saveSt(l); renderPanel(); };
            } else {
                slot.textContent = '+';
                slot.title = 'Добавить свою картинку';
                slot.onclick = () => pickFile('sticker', i);
            }
            panel.appendChild(slot);
        }
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

    // ---------- обои ----------
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
        if (!v) { flow.style.background = ''; return; }
        if (v.indexOf('data:') === 0) flow.style.background = 'url(' + v + ') center/cover no-repeat';
        else { const cat = WP_CATALOG.find(x => x.id === v); flow.style.background = cat ? cat.css : ''; }
    }
    const origSwitch = VXInterface.prototype.switchChannel;
    VXInterface.prototype.switchChannel = async function (id) {
        const r = await origSwitch.call(this, id);
        applyWP(id);
        return r;
    };

    // ---------- НАСТРОЙКИ КАНАЛА (2 вкладки) ----------
    let chModal = null, curCh = null, draftAv = null, draftDesc = '', draftLocked = false;
    function openChSet(id) {
        curCh = id;
        const ch = VXState.ui.channels.find(c => c.id === id) || { name: id };
        const meta = getMeta()[id] || {};
        draftAv = meta.avatar || null;
        draftDesc = meta.desc || '';
        draftLocked = !!meta.locked;
        if (!chModal) {
            chModal = document.createElement('div');
            chModal.className = 'overlay'; chModal.id = 'vx-chset-modal';
            chModal.innerHTML = '<div class="modal" style="max-width:440px;">' +
                '<header class="modal-header"><h2 class="modal-title" id="vxcs-title">НАСТРОЙКИ КАНАЛА</h2><button class="btn-close" id="vxcs-close">✕</button></header>' +
                '<div class="modal-body">' +
                '<div class="vxcs-tabs"><button id="vxcs-tab-cust" class="sel">Кастомизация</button><button id="vxcs-tab-set">Настройки</button></div>' +
                '<div id="vxcs-cust"></div><div id="vxcs-set" style="display:none;"></div>' +
                '</div>' +
                '<footer class="modal-footer"><button class="btn-modal btn-submit" id="vxcs-save" style="width:100%;">Сохранить и разослать</button></footer></div>';
            document.body.appendChild(chModal);
            document.getElementById('vxcs-close').onclick = () => chModal.classList.remove('active');
            document.getElementById('vxcs-tab-cust').onclick = () => { document.getElementById('vxcs-tab-cust').classList.add('sel'); document.getElementById('vxcs-tab-set').classList.remove('sel'); document.getElementById('vxcs-cust').style.display = ''; document.getElementById('vxcs-set').style.display = 'none'; };
            document.getElementById('vxcs-tab-set').onclick = () => { document.getElementById('vxcs-tab-set').classList.add('sel'); document.getElementById('vxcs-tab-cust').classList.remove('sel'); document.getElementById('vxcs-set').style.display = ''; document.getElementById('vxcs-cust').style.display = 'none'; };
            document.getElementById('vxcs-save').onclick = saveChSet;
        }
        document.getElementById('vxcs-title').innerText = 'НАСТРОЙКИ: ' + ch.name;
        document.getElementById('vxcs-tab-cust').click();
        paintChSet();
        chModal.classList.add('active');
    }
    function paintChSet() {
        const ch = VXState.ui.channels.find(c => c.id === curCh) || {};
        const priv = !!(ch.isPrivate || String(curCh).indexOf('private_') === 0);
        const owner = isOwner();
        const cust = document.getElementById('vxcs-cust');
        const set = document.getElementById('vxcs-set');
        if (!cust || !set) return;
        const cur = getWP()[curCh] || 'w_none';
        let html = '<div class="vxcs-sec">Обои чата (личные, видны только тебе)</div><div class="vw-grid" id="vxcs-wp"></div>' +
            '<div class="vxcs-row"><button class="btn-modal btn-cancel" id="vxcs-wp-upl">Своё фото</button></div>';
        if (owner && !priv) {
            html += '<div class="vxcs-sec">Аватар канала</div>' +
                '<div class="vxcs-row"><div class="vxcs-av" id="vxcs-av">' + (draftAv ? '' : '#') + '</div>' +
                '<div style="flex:1;display:flex;flex-direction:column;gap:6px;"><button class="btn-modal btn-cancel" id="vxcs-av-upl">Загрузить</button><button class="btn-modal btn-cancel" id="vxcs-av-rm">Убрать</button></div></div>' +
                '<div class="vxcs-sec">Описание канала</div><textarea id="vxcs-desc" rows="3">' + draftDesc + '</textarea>';
        }
        cust.innerHTML = html;
        const wpGrid = document.getElementById('vxcs-wp');
        WP_CATALOG.forEach(w => {
            const t = document.createElement('div');
            t.className = 'vw-thumb' + (cur === w.id ? ' sel' : '');
            t.style.background = w.css || '#111'; t.title = w.name;
            t.onclick = () => { const m = getWP(); if (w.id === 'w_none') delete m[curCh]; else m[curCh] = w.id; saveWP(m); applyWP(curCh); paintChSet(); };
            wpGrid.appendChild(t);
        });
        document.getElementById('vxcs-wp-upl').onclick = () => pickFile('wp');
        if (owner && !priv) {
            const av = document.getElementById('vxcs-av');
            if (draftAv) { av.style.backgroundImage = 'url(' + draftAv + ')'; av.textContent = ''; }
            document.getElementById('vxcs-av-upl').onclick = () => pickFile('chav');
            document.getElementById('vxcs-av-rm').onclick = () => { draftAv = null; paintChSet(); };
        }
        let shtml = '';
        if (owner && !priv) {
            shtml += '<div class="vxcs-lockrow"><div><div class="vxs-label">Канал включён</div><div class="vxs-note">Выключенный: пишут только владельцы</div></div><div class="vxs-switch' + (draftLocked ? '' : ' on') + '" id="vxcs-lock"></div></div>';
        }
        if (!priv) shtml += '<div class="vxcs-row"><button class="btn-modal btn-cancel" id="vxcs-leave" style="width:100%;">Выйти из канала</button></div>';
        shtml += '<div class="vxcs-sec">Инфо</div><div class="vxs-note">ID: ' + curCh + '<br>Тип: ' + (priv ? 'личный чат' : 'публичный канал') + '<br>Владельцы: ' + (owner ? 'ты' : 'другой узел') + '</div>';
        set.innerHTML = shtml;
        const lock = document.getElementById('vxcs-lock');
        if (lock) lock.onclick = () => { draftLocked = !draftLocked; paintChSet(); };
        const leave = document.getElementById('vxcs-leave');
        if (leave) leave.onclick = () => { chModal.classList.remove('active'); VXApp.UI.leaveChannel(curCh); };
        document.getElementById('vxcs-save').style.display = (owner && !priv) ? '' : 'none';
    }
    function saveChSet() {
        const d = document.getElementById('vxcs-desc');
        if (d) draftDesc = d.value.trim();
        const meta = getMeta();
        meta[curCh] = Object.assign(meta[curCh] || {}, { avatar: draftAv, desc: draftDesc, locked: draftLocked });
        setMeta(meta);
        VXApp.Network.transmit({ type: 'channel_update', channelId: curCh, meta: meta[curCh] });
        VXApp.UI.renderChannels();
        const inp = document.getElementById('msg-input');
        if (inp && VXState.ui.activeChannelId === curCh) {
            const locked = draftLocked && !isOwner();
            inp.disabled = locked;
            if (locked) inp.placeholder = 'КАНАЛ ОТКЛЮЧЁН ВЛАДЕЛЬЦЕМ';
        }
        chModal.classList.remove('active');
        VXApp.UI.showToast('Настройки канала сохранены и разосланы', 'info');
    }

    // ---------- пункт в меню канала ----------
    function injectChCtx() {
        const menu = document.getElementById('channel-context-menu');
        if (!menu || menu.querySelector('#ctx-chset')) return;
        const it = document.createElement('div');
        it.className = 'ctx-item'; it.id = 'ctx-chset'; it.innerText = 'Настройки канала';
        menu.appendChild(it);
        it.addEventListener('click', (ev) => { ev.stopPropagation(); menu.style.display = 'none'; openChSet(VXApp.UI.ctxTargetChannelId); });
    }

    function init() { injectStkBtn(); injectCtx(); injectChCtx(); }
    const mo = new MutationObserver(() => { injectCtx(); injectChCtx(); });
    mo.observe(document.body, { childList: true, subtree: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
