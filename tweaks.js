// ===================== VDEX TWEAKS v2 =====================
(function () {
    // ---------- стили панели слежения ----------
    const style = document.createElement('style');
    style.textContent = `
#netmon { border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,.25); padding: 8px 20px; display: flex; flex-direction: column; gap: 4px; font-family: var(--font-mono); font-size: 10px; color: #888; }
.nm-row { display: flex; justify-content: space-between; gap: 10px; }
.nm-label { color: #555; letter-spacing: 1px; }
`;
    document.head.appendChild(style);

    // ---------- ребрендинг: VDEX + Xal v1 ----------
    const MAP = [
        [/VX_DATACENTER/g, 'VDEX'],
        [/VX_AI_ASSISTANT/g, 'Xal v1'],
        [/VX Neural Core v1\.0/g, 'Xal v1'],
        [/VX(?=[_ ])/g, 'VDEX']
    ];
    function fixText(str) {
        let out = str;
        for (const [re, to] of MAP) out = out.replace(re, to);
        return out;
    }
    const BRAND_SELECTORS = '.srv-title, .auth-subtitle, .modal-title, .ai-welcome h3, .rp-header, .channels-header';
    function rebrand() {
        document.querySelectorAll(BRAND_SELECTORS).forEach(el => {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
            let n;
            while ((n = walker.nextNode())) {
                if (!n.nodeValue) continue;
                const fixed = fixText(n.nodeValue);
                if (fixed !== n.nodeValue) n.nodeValue = fixed;
            }
        });
        document.title = fixText(document.title);
    }

    // ---------- сетевые события в тосты, не в чат ----------
    const NET_RE = /КООРДИНАТ СЕРВЕРА|ПОДКЛЮЧЕНИЕ К УЗЛУ|HANDSHAKE|ПОТЕРЯ СВЯЗИ|СБОЙ ПОЛУЧЕНИЯ|ИСТОЧНИКИ МАЯКА|ПЕРЕЗАПУСК/;
    const origAppend = VXInterface.prototype.appendSystem;
    VXInterface.prototype.appendSystem = function (text) {
        if (NET_RE.test(text)) {
            const bad = /ПОТЕРЯ|СБОЙ|ИСТОЧНИКИ/.test(text);
            VXApp.UI.showToast(text, bad ? 'warn' : 'info');
            return;
        }
        return origAppend.call(this, text);
    };

    // ---------- слежение за сервером (панель под статусом) ----------
    const origStatus = VXInterface.prototype.setNetworkStatus;
    VXInterface.prototype.setNetworkStatus = function (isOnline) {
        VXState.network.connectedAt = isOnline ? Date.now() : null;
        return origStatus.call(this, isOnline);
    };
    const origHd = VXNetwork.prototype.handleDisconnect;
    VXNetwork.prototype.handleDisconnect = function () {
        VXState.network.reconnects = (VStateReconnects() + 1);
        function VStateReconnects() { return VXState.network.reconnects || 0; }
        return origHd.call(this);
    };
    function buildNetMon() {
        const bar = document.querySelector('.server-status-bar');
        if (!bar || document.getElementById('netmon')) return;
        const mon = document.createElement('div');
        mon.id = 'netmon';
        mon.innerHTML = '<div class="nm-row"><span class="nm-label">СЛЕЖЕНИЕ ЗА СЕРВЕРОМ</span><span id="nm-state">—</span></div>' +
            '<div class="nm-row"><span class="nm-label">АПТАЙМ</span><span id="nm-uptime">--:--</span></div>' +
            '<div class="nm-row"><span class="nm-label">РЕКОННЕКТЫ</span><span id="nm-reconnects">0</span></div>' +
            '<div class="nm-row"><span class="nm-label">ОЧЕРЕДЬ ОТПРАВКИ</span><span id="nm-outbox">0</span></div>';
        bar.parentNode.insertBefore(mon, bar.nextSibling);
        setInterval(() => {
            const st = document.getElementById('nm-state');
            if (!st) return;
            const on = VXState.network.isConnected;
            st.textContent = on ? 'ОНЛАЙН' : 'ОБРЫВ';
            st.style.color = on ? 'var(--vx-primary)' : 'var(--vx-danger)';
            const up = document.getElementById('nm-uptime');
            if (VXState.network.connectedAt) {
                const s = Math.floor((Date.now() - VXState.network.connectedAt) / 1000);
                up.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
            } else up.textContent = '--:--';
            document.getElementById('nm-reconnects').textContent = VXState.network.reconnects || 0;
            document.getElementById('nm-outbox').textContent = (VXState.network.outbox || []).length;
        }, 1000);
    }

    // ---------- ИИ теперь зовут Xal v1 ----------
    const origAsk = VXLocalAI.prototype.ask;
    VXLocalAI.prototype.ask = function (prompt) {
        return origAsk.call(this, 'Ты — Xal v1, встроенный ИИ-ассистент мессенджера VDEX. Если спрашивают, как тебя зовут, отвечай: Xal v1.\n' + prompt);
    };

    // ---------- ребрендинг после открытия окон и рендера ИИ ----------
    const origOpen = VXInterface.prototype.openModal;
    VXInterface.prototype.openModal = function (id) {
        const r = origOpen.call(this, id);
        setTimeout(rebrand, 0);
        return r;
    };
    const origHist = VXAIInterface.prototype.renderHistory;
    VXAIInterface.prototype.renderHistory = function () {
        const r = origHist.call(this);
        rebrand();
        return r;
    };

    function init() { rebrand(); buildNetMon(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
