// ===================== VDEX FAST CONNECT =====================
(function () {
    const LS_URL = 'vx_ws_cache';
    const origFetch = VXNetwork.prototype.fetchBeacon;
    VXNetwork.prototype.fetchBeacon = async function () {
        const cached = localStorage.getItem(LS_URL);
        if (cached && !this._triedCache) {
            this._triedCache = true;
            VXApp.UI.appendSystem('БЫСТРОЕ ПОДКЛЮЧЕНИЕ ПО СОХРАНЁННОМУ АДРЕСУ...');
            this.connect(cached);
            setTimeout(() => {
                fetch(VXConfig.API_BEACON + '?cb=' + Date.now())
                    .then(r => r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)))
                    .then(t => {
                        let u = t.trim();
                        if (!u.startsWith('ws')) u = 'wss://' + u;
                        if (u !== cached) localStorage.setItem(LS_URL, u);
                    })
                    .catch(() => {});
            }, 2000);
            return;
        }
        return origFetch.call(this);
    };
    const origConnect = VXNetwork.prototype.connect;
    VXNetwork.prototype.connect = function (url) {
        const r = origConnect.call(this, url);
        const sock = VXState.network.socket;
        if (sock) {
            sock.addEventListener('open', () => {
                localStorage.setItem(LS_URL, url);
                this._triedCache = false;
            });
            // если сокет завис в CONNECTING — убиваем через 8 сек и идём по маяку
            setTimeout(() => {
                if (sock.readyState === WebSocket.CONNECTING && VXState.network.socket === sock) {
                    VXApp.UI.appendSystem('СОЕДИНЕНИЕ ЗАВИСЛО — ПЕРЕЗАПРОС КООРДИНАТ...');
                    try { sock.close(); } catch (e) {}
                }
            }, 8000);
        }
        return r;
    };
})();
