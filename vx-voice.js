// ===================== VDEX VOICE CHANNELS =====================
(function () {
    const ICE = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
        ],
        iceCandidatePoolSize: 8
    };
    const DEFAULT_ROOMS = ['VOICE_LOUNGE', 'DEV_TALK'];
    const VC = { room: null, pcs: {}, senders: {}, remote: {}, roster: {}, local: null, camStream: null, screenStream: null, micOn: true, camOn: false, screenOn: false };

    const style = document.createElement('style');
    style.textContent = `
.vc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; padding: 4px 0 10px; }
.vc-tile { position: relative; aspect-ratio: 4/3; background: #111; border: 1px solid #222; border-radius: 10px; overflow: hidden; }
.vc-tile video { width: 100%; height: 100%; object-fit: cover; }
.vc-nick { position: absolute; bottom: 4px; left: 6px; font-size: 10px; font-family: var(--font-mono); color: #fff; text-shadow: 0 0 4px #000; }
.vc-badges { position: absolute; top: 4px; right: 6px; display: flex; gap: 4px; }
.vc-flag { font-size: 8px; font-family: var(--font-mono); padding: 2px 5px; border-radius: 6px; background: rgba(0,0,0,.6); color: var(--vx-danger); border: 1px solid var(--vx-danger); }
.vc-flag.ok { color: var(--vx-primary); border-color: var(--vx-primary); }
.vc-controls { display: flex; gap: 10px; justify-content: center; padding: 10px 0 4px; }
.vc-btn { width: 46px; height: 46px; border-radius: 50%; border: 1px solid #333; background: #161616; color: #ccc; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.vc-btn.on { color: var(--vx-primary); border-color: var(--vx-primary); box-shadow: 0 0 10px var(--vx-primary-dim); }
.vc-btn.danger { color: var(--vx-danger); border-color: var(--vx-danger); }
.vc-btn .icon { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.vc-room { display: flex; align-items: center; gap: 10px; border: 1px solid #222; border-radius: 10px; padding: 10px 12px; background: #0d0d0d; margin-bottom: 8px; }
.vc-room .vc-rname { flex: 1; font-family: var(--font-mono); font-size: 12px; color: #ccc; }
`;
    document.head.appendChild(style);

    const myUid = () => VXState.user.uid;
    const getRooms = () => { try { return DEFAULT_ROOMS.concat(JSON.parse(localStorage.getItem('vx_vc_rooms') || '[]')); } catch (e) { return DEFAULT_ROOMS.slice(); } };
    const bc = (obj) => { obj.vc = VC.room; obj.from = myUid(); VXApp.Network.transmit(obj); };

    // ---------- соединения ----------
    function currentVideoTrack() {
        if (VC.screenOn && VC.screenStream) return VC.screenStream.getVideoTracks()[0];
        if (VC.camOn && VC.camStream) return VC.camStream.getVideoTracks()[0];
        return null;
    }
    function pushVideoTrack() {
        const tr = currentVideoTrack();
        Object.values(VC.senders).forEach(s => { try { s.replaceTrack(tr); } catch (e) {} });
    }
    function createPC(uid) {
        const pc = new RTCPeerConnection(ICE);
        VC.pcs[uid] = pc;
        if (VC.local) VC.local.getTracks().forEach(t => pc.addTrack(t, VC.local));
        VC.senders[uid] = pc.addTransceiver('video', { direction: 'sendrecv' }).sender;
        pc.onicecandidate = ev => { if (ev.candidate) bc({ type: 'vc_ice', to: uid, candidate: ev.candidate }); };
        pc.ontrack = ev => {
            if (!VC.remote[uid]) {
                VC.remote[uid] = new MediaStream();
                const a = document.createElement('audio');
                a.autoplay = true; a.id = 'vc-audio-' + uid; a.srcObject = VC.remote[uid];
                document.body.appendChild(a);
            }
            VC.remote[uid].addTrack(ev.track);
            renderTiles();
        };
        pc.oniceconnectionstatechange = () => {
            const s = pc.iceConnectionState;
            if (VC.roster[uid]) {
                VC.roster[uid].conn = (s === 'connected' || s === 'completed') ? 'ok' : (s === 'failed' ? 'fail' : 'wait');
                if (s === 'failed' && !(VC.restarts = VC.restarts || {})[uid]) {
                    VC.restarts[uid] = true;
                    try { pc.restartIce(); } catch (e) {}
                    setTimeout(() => { VC.restarts[uid] = false; }, 5000);
                }
            }
            renderTiles();
        };
        return pc;
    }
    function removePeer(uid) {
        if (VC.pcs[uid]) { VC.pcs[uid].close(); delete VC.pcs[uid]; delete VC.senders[uid]; }
        if (VC.remote[uid]) { delete VC.remote[uid]; const a = document.getElementById('vc-audio-' + uid); if (a) a.remove(); }
        delete VC.roster[uid];
        renderTiles();
    }

    function join(room) {
        if (VC.room) leave(true);
        navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
            VC.local = stream; VC.room = room;
            VC.micOn = true; VC.camOn = false; VC.screenOn = false;
            VC.roster = {}; VC.roster[myUid()] = { nick: VXState.user.nickname, mic: true, cam: false, screen: false };
            renderStageOrList();
            bc({ type: 'vc_join', nick: VXState.user.nickname });
            bc({ type: 'vc_roster_req', nick: VXState.user.nickname });
            VXApp.UI.showToast('Голосовой канал ' + room + ' открыт', 'info');
        }).catch(e => VXApp.UI.showToast('Нет доступа к микрофону: ' + e.message, 'error'));
    }
    function leave(silent) {
        if (!VC.room) return;
        if (!silent) bc({ type: 'vc_leave' });
        Object.keys(VC.pcs).forEach(uid => removePeer(uid));
        if (VC.local) VC.local.getTracks().forEach(t => t.stop());
        if (VC.camStream) VC.camStream.getTracks().forEach(t => t.stop());
        if (VC.screenStream) VC.screenStream.getTracks().forEach(t => t.stop());
        VC.local = VC.camStream = VC.screenStream = null;
        VC.room = null; VC.roster = {};
        renderStageOrList();
    }

    // ---------- сигнализация ----------
    async function onJoin(d) {
        VC.roster[d.from] = { nick: d.nick, mic: true, cam: false, screen: false };
        renderTiles();
        const pc = createPC(d.from);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        bc({ type: 'vc_offer', to: d.from, sdp: offer });
    }
    async function onOffer(d) {
        if (d.to !== myUid()) return;
        let pc = VC.pcs[d.from];
        if (!pc) pc = createPC(d.from);
        if (pc.signalingState !== 'stable') { try { await pc.setLocalDescription({ type: 'rollback' }); } catch (e) {} }
        await pc.setRemoteDescription(new RTCSessionDescription(d.sdp));
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        bc({ type: 'vc_answer', to: d.from, sdp: ans });
    }
    async function onAnswer(d) {
        if (d.to !== myUid()) return;
        const pc = VC.pcs[d.from];
        if (!pc || pc.signalingState === 'stable') return;
        await pc.setRemoteDescription(new RTCSessionDescription(d.sdp));
    }
    async function onIce(d) {
        if (d.to !== myUid() || !VC.pcs[d.from]) return;
        try { await VC.pcs[d.from].addIceCandidate(new RTCIceCandidate(d.candidate)); } catch (e) {}
    }
    function onState(d) {
        if (!VC.roster[d.from]) VC.roster[d.from] = { nick: d.nick || d.from, mic: true, cam: false, screen: false };
        VC.roster[d.from].mic = d.mic; VC.roster[d.from].cam = d.cam; VC.roster[d.from].screen = d.screen;
        if (d.nick) VC.roster[d.from].nick = d.nick;
        renderTiles();
    }
    function onWs(e) {
        let d; try { d = JSON.parse(e.data); } catch (err) { return; }
        if (!d || !d.type || d.type.indexOf('vc_') !== 0) return;
        if (!VC.room || d.vc !== VC.room || d.from === myUid()) return;
        if (d.type === 'vc_join') onJoin(d);
        else if (d.type === 'vc_offer') onOffer(d);
        else if (d.type === 'vc_answer') onAnswer(d);
        else if (d.type === 'vc_ice') onIce(d);
        else if (d.type === 'vc_leave') removePeer(d.from);
        else if (d.type === 'vc_state') onState(d);
        else if (d.type === 'vc_roster_req') bc({ type: 'vc_state', nick: VXState.user.nickname, mic: VC.micOn, cam: VC.camOn, screen: VC.screenOn });
    }
    const origConnect = VXNetwork.prototype.connect;
    VXNetwork.prototype.connect = function (url) {
        const r = origConnect.call(this, url);
        if (VXState.network.socket) VXState.network.socket.addEventListener('message', onWs);
        return r;
    };

    // ---------- управление ----------
    function setMic(on) {
        VC.micOn = on;
        if (VC.local) VC.local.getAudioTracks().forEach(t => t.enabled = on);
        bc({ type: 'vc_state', nick: VXState.user.nickname, mic: on, cam: VC.camOn, screen: VC.screenOn });
        renderTiles(); syncControls();
    }
    async function setCam(on) {
        if (on && !VC.camStream) {
            try { VC.camStream = await navigator.mediaDevices.getUserMedia({ video: true }); } catch (e) { VXApp.UI.showToast('Нет доступа к камере', 'error'); return; }
        }
        if (VC.camStream) VC.camStream.getVideoTracks().forEach(t => t.enabled = on);
        VC.camOn = on;
        pushVideoTrack();
        bc({ type: 'vc_state', nick: VXState.user.nickname, mic: VC.micOn, cam: on, screen: VC.screenOn });
        renderTiles(); syncControls();
    }
    async function setScreen(on) {
        if (on) {
            try {
                VC.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                VC.screenStream.getVideoTracks()[0].onended = () => setScreen(false);
            } catch (e) { return; }
            VC.screenOn = true;
        } else {
            if (VC.screenStream) VC.screenStream.getTracks().forEach(t => t.stop());
            VC.screenStream = null; VC.screenOn = false;
        }
        pushVideoTrack();
        bc({ type: 'vc_state', nick: VXState.user.nickname, mic: VC.micOn, cam: VC.camOn, screen: VC.screenOn });
        renderTiles(); syncControls();
    }

    // ---------- интерфейс ----------
    let modal = null;
    function build() {
        modal = document.createElement('div');
        modal.className = 'overlay'; modal.id = 'vc-modal';
        modal.innerHTML = '<div class="modal" style="max-width:520px;height:80vh;">' +
            '<header class="modal-header"><h2 class="modal-title" id="vc-title">ГОЛОСОВЫЕ КАНАЛЫ</h2><button class="btn-close" id="vc-close">✕</button></header>' +
            '<div class="modal-body" id="vc-body"></div></div>';
        document.body.appendChild(modal);
        document.getElementById('vc-close').onclick = () => modal.classList.remove('active');
    }
    function renderStageOrList() {
        if (!modal) return;
        const body = document.getElementById('vc-body');
        const title = document.getElementById('vc-title');
        if (!VC.room) {
            title.innerText = 'ГОЛОСОВЫЕ КАНАЛЫ';
            body.innerHTML = '';
            getRooms().forEach(r => {
                const row = document.createElement('div');
                row.className = 'vc-room';
                row.innerHTML = '<div class="vc-rname">🔊 ' + r + '</div>';
                const b = document.createElement('button');
                b.className = 'btn-modal btn-submit'; b.innerText = 'Войти';
                b.onclick = () => join(r);
                row.appendChild(b);
                body.appendChild(row);
            });
            const add = document.createElement('button');
            add.className = 'btn-modal btn-cancel'; add.innerText = '+ Создать комнату';
            add.onclick = () => {
                const n = prompt('Название комнаты (латиница, без пробелов):');
                if (!n) return;
                const id = n.trim().toUpperCase().replace(/\s+/g, '_');
                if (!id || getRooms().includes(id)) return;
                const custom = JSON.parse(localStorage.getItem('vx_vc_rooms') || '[]');
                custom.push(id); localStorage.setItem('vx_vc_rooms', JSON.stringify(custom));
                renderStageOrList();
            };
            body.appendChild(add);
            return;
        }
        title.innerText = 'ГОЛОС: ' + VC.room;
        body.innerHTML = '<div class="vc-grid" id="vc-grid"></div>' +
            '<div class="vc-controls">' +
            '<button class="vc-btn on" id="vc-mic" title="Микрофон"><svg class="icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg></button>' +
            '<button class="vc-btn" id="vc-cam" title="Камера (по умолчанию выкл)"><svg class="icon" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></button>' +
            '<button class="vc-btn" id="vc-screen" title="Демонстрация экрана"><svg class="icon" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></button>' +
            '<button class="vc-btn danger" id="vc-leave" title="Выйти"><svg class="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>' +
            '</div>';
        document.getElementById('vc-mic').onclick = () => setMic(!VC.micOn);
        document.getElementById('vc-cam').onclick = () => setCam(!VC.camOn);
        document.getElementById('vc-screen').onclick = () => setScreen(!VC.screenOn);
        document.getElementById('vc-leave').onclick = () => leave(false);
        renderTiles(); syncControls();
    }
    function syncControls() {
        const m = document.getElementById('vc-mic'), c = document.getElementById('vc-cam'), s = document.getElementById('vc-screen');
        if (!m) return;
        m.classList.toggle('on', VC.micOn);
        c.classList.toggle('on', VC.camOn);
        s.classList.toggle('on', VC.screenOn);
    }
    function renderTiles() {
        const grid = document.getElementById('vc-grid');
        if (!grid) return;
        grid.innerHTML = '';
        Object.keys(VC.roster).forEach(uid => {
            const r = VC.roster[uid];
            const tile = document.createElement('div');
            tile.className = 'vc-tile';
            const showVideo = uid === myUid() ? (VC.camOn || VC.screenOn) : (r.cam || r.screen);
            if (showVideo) {
                let vid = document.getElementById('vc-vid-' + uid);
                if (!vid) { vid = document.createElement('video'); vid.id = 'vc-vid-' + uid; vid.autoplay = true; vid.playsInline = true; vid.muted = (uid === myUid()); }
                if (uid === myUid()) vid.srcObject = (VC.screenOn && VC.screenStream) ? VC.screenStream : VC.camStream;
                else if (VC.remote[uid]) vid.srcObject = VC.remote[uid];
                tile.appendChild(vid);
            } else {
                const ph = document.createElement('div');
                ph.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:26px;color:#555;';
                ph.textContent = (r.nick || '?').charAt(0).toUpperCase();
                tile.appendChild(ph);
            }
            const badges = document.createElement('div'); badges.className = 'vc-badges';
            if (!r.mic) badges.innerHTML += '<span class="vc-flag">MIC OFF</span>';
            if (r.screen) badges.innerHTML += '<span class="vc-flag ok">SCREEN</span>';
            if (uid !== myUid() && r.conn === 'wait') badges.innerHTML += '<span class="vc-flag">LINK...</span>';
            if (uid !== myUid() && r.conn === 'fail') badges.innerHTML += '<span class="vc-flag">NO LINK</span>';
            const nick = document.createElement('div'); nick.className = 'vc-nick';
            nick.textContent = r.nick + (uid === myUid() ? ' (ты)' : '');
            tile.appendChild(badges); tile.appendChild(nick);
            grid.appendChild(tile);
        });
    }
    function openVC() {
        if (!modal) build();
        modal.classList.add('active');
        renderStageOrList();
    }

    function injectStripBtn() {
        const anchor = document.getElementById('btn-global-call');
        if (!anchor || document.getElementById('btn-voice-channels')) return;
        const btn = document.createElement('button');
        btn.id = 'btn-voice-channels';
        btn.className = 'strip-action';
        btn.title = 'Голосовые каналы';
        btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>';
        btn.onclick = openVC;
        anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectStripBtn);
    else injectStripBtn();
})();
