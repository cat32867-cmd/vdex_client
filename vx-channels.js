// ===================== VDEX CHANNELS CONTROL =====================
(function () {
    const OWNERS = ['node_urjp669q9', 'node_ib2umt9lm'];
    const LS_META = 'vx_chan_meta';
    const getMeta = () => { try { return JSON.parse(localStorage.getItem(LS_META) || '{}'); } catch (e) { return {}; } };
    const setMeta = (m) => localStorage.setItem(LS_META, JSON.stringify(m));
    const isOwner = () => OWNERS.indexOf(VXState.user.uid) !== -1 || ['owner', 'admin', 'moder'].indexOf(VXState.user.role) !== -1;
    const metaFor = (id) => getMeta()[id] || {};
    const isPub = (ch) => !(ch.isPrivate || ch.id.startsWith('private_'));

    const style = document.createElement('style');
    style.textContent = `
.vxc-head { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
.vxc-av { width: 64px; height: 64px; border-radius: 14px; background-color: #161616; background-size: cover; background-position: center; border: 1px solid #333; display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 24px; color: #888; flex-shrink: 0; }
.vxc-members { max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #aaa; font-family: var(--font-mono); }
.vxc-lockrow { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.vxc-lockflag { font-size: 10px; margin-left: 4px; }
`;
    document.head.appendChild(style);

    function bcUpdate(id) {
        VXApp.Network.transmit({ type: 'channel_update', channelId: id, meta: getMeta()[id] || null });
    }
    function refreshInputState() {
        const m = metaFor(VXState.ui.activeChannelId);
        const inp = document.getElementById('msg-input');
        if (!inp) return;
        const locked = !!m.locked && !isOwner();
        inp.disabled = locked;
        if (locked) inp.placeholder = 'КАНАЛ ОТКЛЮЧЁН ВЛАДЕЛЬЦЕМ';
    }
    function decorateList() {
        const items = document.querySelectorAll('#channel-list-container .channel-item');
        const chans = VXState.ui.channels.filter(c => isPub(c));
        const privs = VXState.ui.channels.filter(c => !isPub(c));
        const order = chans.concat(privs);
        const meta = getMeta();
        items.forEach((el, i) => {
            const ch = order[i];
            if (!ch || !isPub(ch)) return;
            const m = meta[ch.id] || {};
            const icon = el.querySelector('.ch-hash, .ch-avatar');
            if (!icon) return;
            if (m.avatar) { icon.className = 'ch-avatar'; icon.style.backgroundImage = 'url(' + m.avatar + ')'; icon.textContent = ''; }
            else { icon.className = 'ch-hash'; icon.style.backgroundImage = ''; icon.textContent = '#'; }
            icon.style.cursor = 'pointer';
            icon.onclick = (ev) => { ev.stopPropagation(); openManage(ch.id); };
            let lf = el.querySelector('.vxc-lockflag');
            if (m.locked && !lf) { lf = document.createElement('span'); lf.className = 'vxc-lockflag'; lf.textContent = '🔒'; const nm = el.querySelector('.ch-name'); if (nm) nm.after(lf); }
            if (!m.locked && lf) lf.remove();
        });
    }

    const origRenderCh = VXInterface.prototype.renderChannels;
    VXInterface.prototype.renderChannels = function () {
        const r = origRenderCh.call(this);
        setTimeout(decorateList, 0);
        return r;
    };
    const origSwitch = VXInterface.prototype.switchChannel;
    VXInterface.prototype.switchChannel = async function (id) {
        const r = await origSwitch.call(this, id);
        const m = metaFor(id);
        if (m.desc) {
            const rp = document.getElementById('rp-desc');
            const cd = document.getElementById('current-ch-desc');
            if (rp) rp.innerText = m.desc;
            if (cd) cd.innerText = m.desc;
        }
        refreshInputState();
        return r;
    };
    const origCmd = VXInterface.prototype.handleCommandOrMessage;
    VXInterface.prototype.handleCommandOrMessage = async function () {
        const m = metaFor(VXState.ui.activeChannelId);
        if (m.locked && !isOwner()) { VXApp.UI.showToast('Канал отключён: писать может только владелец', 'warn'); return; }
        return origCmd.call(this);
    };

    // ---------- окно управления каналом ----------
    let modal = null, curId = null, draftAv = null;
    function buildModal() {
        modal = document.createElement('div');
        modal.className = 'overlay'; modal.id = 'vxc-modal';
        modal.innerHTML = '<div class="modal" style="max-width:460px;">' +
            '<header class="modal-header"><h2 class="modal-title" id="vxc-title">КАНАЛ</h2><button class="btn-close" id="vxc-close">✕</button></header>' +
            '<div class="modal-body">' +
            '<div class="vxc-head"><div class="vxc-av" id="vxc-av">#</div><div style="flex:1;display:flex;flex-direction:column;gap:6px;"><button class="btn-modal btn-cancel" id="vxc-chav">Сменить картинку</button><button class="btn-modal btn-cancel" id="vxc-rmav">Убрать картинку</button></div></div>' +
            '<input type="file" id="vxc-file" accept="image/*" hidden>' +
            '<div class="form-group"><label>Описание канала</label><textarea class="form-input" id="vxc-desc" rows="3" placeholder="Что это за сегмент..."></textarea></div>' +
            '<div class="vxc-lockrow"><div><div class="vxs-label">Канал включён</div><div class="vxs-note">Выключенный: пишут только владельцы</div></div><div class="vxs-switch on" id="vxc-lock"></div></div>' +
            '<div class="vxt-sec">Участники (в сети)</div><div class="vxc-members" id="vxc-members"></div>' +
            '</div>' +
            '<footer class="modal-footer"><button class="btn-modal btn-cancel" id="vxc-cancel">Закрыть</button><button class="btn-modal btn-submit" id="vxc-save">Сохранить</button></footer></div>';
        document.body.appendChild(modal);
        document.getElementById('vxc-close').onclick = () => modal.classList.remove('active');
        document.getElementById('vxc-cancel').onclick = () => modal.classList.remove('active');
        document.getElementById('vxc-chav').onclick = () => document.getElementById('vxc-file').click();
        document.getElementById('vxc-rmav').onclick = () => { draftAv = null; paintAv(); };
        document.getElementById('vxc-file').addEventListener('change', (e) => {
            const f = e.target.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const c = document.createElement('canvas');
                    let w = img.width, h = img.height; const MAX = 256;
                    if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                    c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    draftAv = c.toDataURL('image/jpeg', 0.7);
                    paintAv();
                };
                img.src = ev.target.result;
            };
            r.readAsDataURL(f);
        });
        document.getElementById('vxc-lock').onclick = () => {
            if (!isOwner()) return VXApp.UI.showToast('Только владелец может отключать канал', 'warn');
            document.getElementById('vxc-lock').classList.toggle('on');
        };
        document.getElementById('vxc-save').onclick = () => {
            if (!isOwner()) return VXApp.UI.showToast('У тебя нет прав на этот канал', 'error');
            const meta = getMeta();
            meta[curId] = {
                avatar: draftAv,
                desc: document.getElementById('vxc-desc').value.trim(),
                locked: !document.getElementById('vxc-lock').classList.contains('on')
            };
            setMeta(meta);
            bcUpdate(curId);
            decorateList();
            VXApp.UI.renderChannels();
            refreshInputState();
            modal.classList.remove('active');
            VXApp.UI.showToast('Канал обновлён и разослан сети', 'info');
        };
    }
    function paintAv() {
        const av = document.getElementById('vxc-av');
        if (draftAv) { av.style.backgroundImage = 'url(' + draftAv + ')'; av.textContent = ''; }
        else { av.style.backgroundImage = ''; av.textContent = '#'; }
    }
    function openManage(id) {
        curId = id;
        if (!modal) buildModal();
        const m = metaFor(id);
        draftAv = m.avatar || null;
        document.getElementById('vxc-title').innerText = 'КАНАЛ: ' + id;
        document.getElementById('vxc-desc').value = m.desc || '';
        document.getElementById('vxc-lock').classList.toggle('on', !m.locked);
        paintAv();
        const box = document.getElementById('vxc-members');
        const cache = VXState.ui.membersCache || [];
        const online = cache.filter(x => x.online);
        box.innerHTML = online.length ? online.map(x => '<div>• ' + (x.nickname || x.uid) + '</div>').join('') : '<div>Никого в сети</div>';
        const canEdit = isOwner();
        document.getElementById('vxc-save').style.display = canEdit ? '' : 'none';
        document.getElementById('vxc-chav').style.display = canEdit ? '' : 'none';
        document.getElementById('vxc-rmav').style.display = canEdit ? '' : 'none';
        modal.classList.add('active');
    }

    // ---------- приём обновлений и рассылка своих при входе ----------
    function onWs(ev) {
        let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
        if (!d || d.type !== 'channel_update' || !d.channelId) return;
        const meta = getMeta();
        if (d.meta) meta[d.channelId] = d.meta; else delete meta[d.channelId];
        setMeta(meta);
        decorateList();
        VXApp.UI.renderChannels();
        if (d.channelId === VXState.ui.activeChannelId) {
            const m = metaFor(d.channelId);
            const rp = document.getElementById('rp-desc');
            if (rp && m.desc) rp.innerText = m.desc;
            refreshInputState();
        }
    }
    const origConnect = VXNetwork.prototype.connect;
    VXNetwork.prototype.connect = function (url) {
        const r = origConnect.call(this, url);
        const sock = VXState.network.socket;
        if (sock) {
            sock.addEventListener('message', onWs);
            sock.addEventListener('open', () => {
                if (!isOwner()) return;
                const meta = getMeta();
                Object.keys(meta).forEach(id => bcUpdate(id));
            });
        }
        return r;
    };
})();
