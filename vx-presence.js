// ===================== VDEX PRESENCE v2 =====================
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
        const e = c[uid] || (c[uid] = { uid: uid, nickname: nick || uid, avatar: null, serverOnline: false, last: 0, role: 'user', wasFresh: false });
        if (nick) e.nickname = nick;
        if (avatar) e.avatar = avatar;
        if (online) e.last = Date.now();
        return existed ? e : null;
    }
    const isFresh = (e) => Date.now() - e.last < FRESH;
    const merged = () => Object.values(cache()).map(e => ({
        uid: e.uid, nickname: e.nickname, avatar: e.avatar, role: e.role,
        online: e.serverOnline || isFresh(e)
    }));
    const refresh = () => { if (VXApp.UI) VXApp.UI.updateMembersList(lastServer); };

    // СПИСОК СЕРВЕРА = ИСТИНА: serverOnline меняет ТОЛЬКО сервер
    const origMembers = VXInterface.prototype.updateMembersList;
    VXInterface.prototype.updateMembersList = function (members) {
        lastServer = members || [];
        lastServer.forEach(m => {
            touch(m.uid, m.nickname, m.avatar, m.online);
            const e = cache()[m.uid];
            if (!e) return;
            e.role = m.role || e.role;
            e.serverOnline = !!m.online;
            if (m.online) e.last = Date.now();
        });
        return origMembers.call(this, merged());
    };

    // сердцебиение: только ДОБАВЛЯЕТ свежесть, ничего не снимает
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

    // протухают ТОЛЬКО «презенс-призраки» (кого сервер онлайном не считает)
    setInterval(() => {
        let changed = false;
        Object.values(cache()).forEach(e => {
            const fresh = isFresh(e);
            if (e.wasFresh && !fresh && !e.serverOnline) changed = true;
            e.wasFresh = fresh;
        });
        if (changed) refresh();
    }, 15000);

    function onWs(ev) {
        let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
        if (!d) return;
        if (d.type === 'presence' && d.uid !== myUid()) {
            const known = touch(d.uid, d.nick, d.avatar, true);
            if (!known) refresh();
        }
    }
    const origConnect = VXNetwork.prototype.connect;
    VXNetwork.prototype.connect = function (url) {
        const r = origConnect.call(this, url);
        if (VXState.network.socket) VXState.network.socket.addEventListener('message', onWs);
        return r;
    };

    // любое сообщение от юзера = доказательство, что он онлайн
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
