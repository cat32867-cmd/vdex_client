// ===================== VDEX PRESENCE FIX =====================
(function () {
    const HEARTBEAT = 10000;
    const FRESH = HEARTBEAT * 4 + 5000;
    let lastServer = [];

    const cache = () => (VXState.ui.presenceCache = VXState.ui.presenceCache || {});
    const myUid = () => VXState.user.uid;

    function touch(uid, nick, avatar, online) {
        if (!uid) return null;
        const c = cache();
        const existed = !!c[uid];
        const e = c[uid] || (c[uid] = { uid: uid, nickname: nick || uid, avatar: null, online: false, serverOnline: false, last: 0, role: 'user' });
        if (nick) e.nickname = nick;
        if (avatar) e.avatar = avatar;
        if (online) e.last = Date.now();
        return existed ? e : null;
    }
    const isFresh = (e) => Date.now() - e.last < FRESH;
    function merged() {
        return Object.values(cache()).map(e => ({
            uid: e.uid, nickname: e.nickname, avatar: e.avatar, role: e.role,
            online: e.serverOnline || isFresh(e)
        }));
    }
    function refresh() { if (VXApp.UI) VXApp.UI.updateMembersList(lastServer); }

    // серверный список = база, презенс = свежесть
    const origMembers = VXInterface.prototype.updateMembersList;
    VXInterface.prototype.updateMembersList = function (members) {
        lastServer = members || [];
        lastServer.forEach(m => {
            const e = touch(m.uid, m.nickname, m.avatar, m.online);
            if (e) { e.role = m.role || e.role; e.serverOnline = !!m.online; if (m.online) e.last = Date.now(); }
            else { const n = cache()[m.uid]; n.role = m.role || 'user'; n.serverOnline = !!m.online; if (m.online) n.last = Date.now(); }
        });
        return origMembers.call(this, merged());
    };

    // сердцебиение: объявляем о себе
    let lastAvatarSent = null;
    setInterval(() => {
        const s = VXState.network.socket;
        if (!s || s.readyState !== WebSocket.OPEN || !myUid()) return;
        touch(myUid(), VXState.user.nickname, VXState.user.avatar, true);
        cache()[myUid()].serverOnline = true;
        const pkt = { type: 'presence', uid: myUid(), nick: VXState.user.nickname };
        if (VXState.user.avatar !== lastAvatarSent) { pkt.avatar = VXState.user.avatar; lastAvatarSent = VXState.user.avatar; }
        s.send(JSON.stringify(pkt));
    }, HEARTBEAT);

    // чистим протухших
    setInterval(() => {
        let changed = false;
        Object.values(cache()).forEach(e => {
            const was = e.serverOnline || isFresh(e);
            if (was && !isFresh(e)) { e.serverOnline = false; changed = true; }
        });
        if (changed) refresh();
    }, 30000);

    // слушаем чужие сердцебиения
    function onWs(ev) {
        let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
        if (!d || d.type !== 'presence' || d.uid === myUid()) return;
        const known = touch(d.uid, d.nick, d.avatar, true);
        if (!known) refresh();
    }
    const origConnect = VXNetwork.prototype.connect;
    VXNetwork.prototype.connect = function (url) {
        const r = origConnect.call(this, url);
        if (VXState.network.socket) VXState.network.socket.addEventListener('message', onWs);
        return r;
    };

    // список чинится сам, когда от кого-то пришло сообщение
    const origRenderMsg = VXInterface.prototype.renderMessageHTML;
    VXInterface.prototype.renderMessageHTML = async function (data, skipSave) {
        const res = await origRenderMsg.call(this, data, skipSave);
        try {
            if (data && data.uid && data.uid !== myUid()) {
                const known = touch(data.uid, data.nickname, data.avatar || undefined, true);
                if (!known) refresh();
            }
        } catch (e) {}
        return res;
    };
})();
