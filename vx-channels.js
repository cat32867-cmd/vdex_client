// ===================== VDEX CHANNELS v2 (исправленный) =====================
(function () {
    const LS_META = 'vx_chan_meta';
    const OWNERS = ['node_urjp669q9', 'node_ib2umt9lm'];
    const isOwner = () => OWNERS.indexOf(VXState.user.uid) !== -1 || ['owner', 'admin', 'moder'].indexOf(VXState.user.role) !== -1;
    const getMeta = () => { try { return JSON.parse(localStorage.getItem(LS_META) || '{}'); } catch (e) { return {}; } };
    const setMeta = (m) => localStorage.setItem(LS_META, JSON.stringify(m));

    // маркер правильного состояния span — защита от циклов перерисовки
    const keyOf = (url, letter, isGroup) => url ? ('u:' + url.length + ':' + url.slice(-24)) : (isGroup ? 'g:' + letter : 'p:' + letter);

    function spanFor(ch) {
        const isPriv = !!(ch.isPrivate || String(ch.id).indexOf('private_') === 0);
        if (isPriv) {
            // ЛИЧКА: аватарка только из живого кэша, групповая логика сюда не лезет
            const url = VXState.ui.avatars[ch.targetUid] || null;
            const letter = (ch.name || '').replace('@', '').charAt(0).toUpperCase() || '?';
            return { url: url, letter: letter, isGroup: false };
        }
        // ГРУППА: аватарка из общей меты, иначе решётка
        const m = getMeta()[ch.id];
        return { url: (m && m.avatar) ? m.avatar : null, letter: '#', isGroup: true };
    }
    function spanHtml(d, k) {
        if (d.url) return '<span class="ch-avatar" data-vxch="' + k + '" style="background-image:url(' + d.url + ')"></span>';
        if (d.isGroup) return '<span class="ch-hash" data-vxch="' + k + '">#</span>';
        return '<span class="ch-avatar" data-vxch="' + k + '">' + d.letter + '</span>';
    }

    let busy = false;
    function decorate() {
        if (busy) return;
        busy = true;
        try {
            const byName = {};
            (VXState.ui.channels || []).forEach(ch => { byName[ch.name] = ch; });
            document.querySelectorAll('.channel-wrapper').forEach(w => {
                const nameEl = w.querySelector('.ch-name');
                if (!nameEl) return;
                const ch = byName[nameEl.textContent];
                if (!ch) return;
                const d = spanFor(ch);
                const k = keyOf(d.url, d.letter, d.isGroup);
                const item = w.querySelector('.channel-item') || w;
                const old = item.querySelector('.ch-avatar, .ch-hash');
                if (old && old.dataset && old.dataset.vxch === k) return; // уже правильно — НЕ трогаем
                const html = spanHtml(d, k);
                if (old) old.outerHTML = html;
                else item.insertAdjacentHTML('afterbegin', html);
            });
        } catch (e) {}
        busy = false;
    }
    let t = null;
    const schedule = () => { clearTimeout(t); t = setTimeout(decorate, 60); };

    // финальный проход после ЛЮБОЙ перерисовки списка (вкладки, бейджи, всё)
    const origRender = VXInterface.prototype.renderChannels;
    VXInterface.prototype.renderChannels = function () {
        const r = origRender.call(this);
        schedule();
        return r;
    };
    // аватарки личек приезжают из members_list — список освежаем сразу
    const origMembers = VXInterface.prototype.updateMembersList;
    VXInterface.prototype.updateMembersList = function (m) {
        const r = origMembers.call(this, m);
        schedule();
        return r;
    };
    // замок канала: ввод блокируется у не-владельцев
    function refreshInput() {
        const inp = document.getElementById('msg-input');
        if (!inp) return;
        const m = getMeta()[VXState.ui.activeChannelId];
        const locked = !!(m && m.locked) && !isOwner();
        inp.disabled = locked;
        if (locked) inp.placeholder = 'КАНАЛ ОТКЛЮЧЁН ВЛАДЕЛЬЦЕМ';
    }
    const origSwitch = VXInterface.prototype.switchChannel;
    VXInterface.prototype.switchChannel = async function (id) {
        const r = await origSwitch.call(this, id);
        refreshInput();
        schedule();
        return r;
    };
    // страховка от поздних перерисовок других модулей (табы КАНАЛЫ/ЧАТЫ)
    const mo = new MutationObserver(() => schedule());
    const watch = () => {
        const c = document.getElementById('channel-list-container');
        if (c) { mo.observe(c, { childList: true, subtree: true }); return true; }
        return false;
    };
    if (!watch()) setTimeout(watch, 1000);

    // ---------- СИНХРОНИЗАЦИЯ МЕТЫ ГРУПП МЕЖДУ УЗЛАМИ ----------
    function onWs(ev) {
        let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
        if (!d) return;
        if (d.type === 'channel_update' && d.channelId && d.meta) {
            const m = getMeta();
            m[d.channelId] = Object.assign(m[d.channelId] || {}, d.meta);
            setMeta(m);
            schedule(); refreshInput();
        } else if (d.type === 'channel_meta_req') {
            const m = getMeta();
            if (Object.keys(m).length) {
                setTimeout(() => VXApp.Network.transmit({ type: 'channel_meta_sync', metas: m }), 300 + Math.random() * 1200);
            }
        } else if (d.type === 'channel_meta_sync' && d.metas) {
            const m = getMeta();
            let changed = false;
            Object.keys(d.metas).forEach(id => { m[id] = Object.assign(m[id] || {}, d.metas[id]); changed = true; });
            if (changed) { setMeta(m); schedule(); refreshInput(); }
        }
    }
    const origConnect = VXNetwork.prototype.connect;
    VXNetwork.prototype.connect = function (url) {
        const r = origConnect.call(this, url);
        const s = VXState.network.socket;
        if (s) {
            s.addEventListener('message', onWs);
            // новичок спросил — сеть ответила: авы групп доезжают до запоздавших
            s.addEventListener('open', () => setTimeout(() => VXApp.Network.transmit({ type: 'channel_meta_req' }), 2500));
        }
        return r;
    };

    setTimeout(() => { decorate(); refreshInput(); }, 800);
})();
