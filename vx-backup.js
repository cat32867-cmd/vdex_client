// ===================== VDEX BACKUP & RESTORE v2 =====================
(function () {
    function loadQr(cb) {
        const urls = [
            'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
            'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js',
            'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'
        ];
        let i = 0;
        const next = () => {
            if (i >= urls.length) { cb(false); return; }
            const s = document.createElement('script');
            s.src = urls[i++];
            s.onload = () => cb(true);
            s.onerror = next;
            document.head.appendChild(s);
        };
        next();
    }

    const style = document.createElement('style');
    style.textContent = `
.vxb-key { width: 100%; min-height: 80px; background: #0d0d0d; border: 1px solid #333; border-radius: 8px; color: #ccc; padding: 8px; font-family: var(--font-mono); font-size: 11px; }
.vxb-qr { display: flex; justify-content: center; padding: 10px 0; background: #fff; border-radius: 8px; margin: 10px 0; }
#vxb-scanvideo { width: 100%; max-height: 220px; background: #000; border-radius: 8px; display: none; margin: 8px 0; }
.vxb-mode { display: flex; flex-direction: column; gap: 8px; margin: 10px 0; }
.vxb-modebtn { text-align: left; padding: 12px; border-radius: 10px; border: 1px solid #333; background: #0d0d0d; color: #aaa; cursor: pointer; font-family: var(--font-mono); font-size: 11px; line-height: 1.5; }
.vxb-modebtn b { color: var(--vx-primary); display: block; margin-bottom: 4px; font-size: 12px; }
.vxb-modebtn.sel { border-color: var(--vx-primary); color: #ccc; }
.vxb-section { display: none; }
.vxb-section.active { display: block; }
.vxb-gap { height: 8px; }
`;
    document.head.appendChild(style);

    // ---------- фикс сессии (не стираемся при рассинхроне) ----------
    function sessionFix() {
        const nick = localStorage.getItem('vx_nick');
        const uid = localStorage.getItem('vx_uuid');
        const hash = localStorage.getItem('vx_pass_hash');
        if (!nick || !uid || !hash) return;
        let accounts = {};
        try { accounts = JSON.parse(localStorage.getItem('vx_accounts') || '{}'); } catch (e) {}
        if (!accounts[nick] || accounts[nick].uid !== uid) {
            accounts[nick] = Object.assign(accounts[nick] || {}, { passwordHash: hash, uid: uid, avatar: localStorage.getItem('vx_avatar'), createdAt: Date.now() });
            localStorage.setItem('vx_accounts', JSON.stringify(accounts));
        }
    }
    sessionFix();
    const origInit = VXApp.init;
    VXApp.init = async function () { sessionFix(); return origInit.call(this); };

    // ---------- пакет данных ----------
    function collectData() {
        const g = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
        return {
            card: g('vx_my_profile'),
            channels: g('vx_channels'),
            theme: localStorage.getItem('vx_theme') || null,
            customTheme: g('vx_custom_theme')
        };
    }
    function applyData(d) {
        if (!d) return 0;
        let n = 0;
        if (d.card) { localStorage.setItem('vx_my_profile', JSON.stringify(d.card)); n++; }
        if (d.channels) {
            localStorage.setItem('vx_channels', JSON.stringify(d.channels));
            try { VXState.ui.channels = [...VXConfig.DEFAULT_CHANNELS, ...d.channels]; VXApp.UI.renderChannels(); } catch (e) {}
            n++;
        }
        if (d.theme) { localStorage.setItem('vx_theme', d.theme); try { VXApp.UI.setTheme(d.theme); } catch (e) {} n++; }
        if (d.customTheme) { localStorage.setItem('vx_custom_theme', JSON.stringify(d.customTheme)); n++; }
        return n;
    }

    // ---------- ключи ----------
    function makeKey() {
        const obj = { v: 2, nick: VXState.user.nickname, uid: VXState.user.uid, hash: localStorage.getItem('vx_pass_hash'), data: collectData() };
        return 'VXKEY:' + btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    }
    function parseKey(code) {
        try {
            const json = JSON.parse(decodeURIComponent(escape(atob(String(code).replace('VXKEY:', '').trim()))));
            if (!json || (!json.hash && !json.data)) throw 0;
            return json;
        } catch (e) { return null; }
    }
    function applyFull(json) {
        if (!json.nick || !json.uid || !json.hash) return false;
        localStorage.setItem('vx_nick', json.nick);
        localStorage.setItem('vx_uuid', json.uid);
        localStorage.setItem('vx_pass_hash', json.hash);
        applyData(json.data);
        let accounts = {};
        try { accounts = JSON.parse(localStorage.getItem('vx_accounts') || '{}'); } catch (e) {}
        accounts[json.nick] = { passwordHash: json.hash, uid: json.uid, avatar: (accounts[json.nick] && accounts[json.nick].avatar) || null, createdAt: Date.now() };
        localStorage.setItem('vx_accounts', JSON.stringify(accounts));
        location.reload();
        return true;
    }

    // ---------- окно ключа ----------
    let keyModal = null;
    function showKey() {
        if (!keyModal) {
            keyModal = document.createElement('div');
            keyModal.className = 'overlay'; keyModal.id = 'vxb-keymodal';
            keyModal.innerHTML = '<div class="modal" style="max-width:420px;"><header class="modal-header"><h2 class="modal-title">СПЕЦ-КЛЮЧ УЗЛА v2</h2><button class="btn-close" id="vxb-kclose">✕</button></header><div class="modal-body"><textarea class="vxb-key" id="vxb-keytext" readonly></textarea><div class="vxb-qr" id="vxb-qr"></div><div class="vxs-note">Ключ v2 = вход (ник, ID, хэш) + данные (карточка, каналы, темы). QR сканируется в режиме «с входом».</div></div><footer class="modal-footer"><button class="btn-modal btn-cancel" id="vxb-kcopy">Копировать</button><button class="btn-modal btn-cancel" id="vxb-kdl">Скачать .txt</button></footer></div>';
            document.body.appendChild(keyModal);
            document.getElementById('vxb-kclose').onclick = () => keyModal.classList.remove('active');
            document.getElementById('vxb-kcopy').onclick = () => { navigator.clipboard?.writeText(document.getElementById('vxb-keytext').value); VXApp.UI.showToast('Ключ скопирован', 'info'); };
            document.getElementById('vxb-kdl').onclick = () => {
                const a = document.createElement('a');
                a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(document.getElementById('vxb-keytext').value);
                a.download = 'vdex_key_' + VXState.user.nickname + '.txt';
                a.click();
            };
        }
        const key = makeKey();
        document.getElementById('vxb-keytext').value = key;
        const qrBox = document.getElementById('vxb-qr');
        qrBox.innerHTML = '<span style="color:#333;font-size:10px;">Загрузка QR...</span>';
        loadQr((ok) => {
            if (!ok || !window.qrcode) { qrBox.innerHTML = '<span style="color:#333;font-size:10px;">QR-библиотека не загрузилась — используй копирование или файл</span>'; return; }
            try {
                const qr = window.qrcode(0, 'M');
                qr.addData(key); qr.make();
                qrBox.innerHTML = qr.createImgTag(4, 8);
            } catch (e) { qrBox.innerHTML = '<span style="color:#333;font-size:10px;">Ключ слишком длинный для QR</span>'; }
        });
        keyModal.classList.add('active');
    }

    // ---------- окно восстановления: два режима ----------
    let restModal = null, scanStream = null;
    function stopScan() {
        if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
        const v = document.getElementById('vxb-scanvideo');
        if (v) { v.srcObject = null; v.style.display = 'none'; }
    }
    function showRestore() {
        if (!restModal) {
            restModal = document.createElement('div');
            restModal.className = 'overlay'; restModal.id = 'vxb-restmodal';
            restModal.innerHTML = '<div class="modal" style="max-width:440px;"><header class="modal-header"><h2 class="modal-title">ВОССТАНОВЛЕНИЕ УЗЛА</h2><button class="btn-close" id="vxb-rclose">✕</button></header><div class="modal-body">' +
                '<div class="vxb-mode">' +
                '<button class="vxb-modebtn sel" id="vxb-m-qr"><b>QR-КОД · перенос С ВХОДОМ</b>Наведи камеру на QR другого устройства — узел войдёт в аккаунт и заберёт все данные</button>' +
                '<button class="vxb-modebtn" id="vxb-m-key"><b>VXKEY · перенос ДАННЫХ БЕЗ входа</b>Вставь ключ — карточка, каналы и темы переедут на текущий узел, аккаунт не сменится</button>' +
                '</div>' +
                '<div class="vxb-section active" id="vxb-sec-qr">' +
                '<video id="vxb-scanvideo" playsinline></video>' +
                '<button class="btn-modal btn-submit" id="vxb-startscan" style="width:100%;">Включить камеру и сканировать</button>' +
                '<div class="vxb-gap"></div>' +
                '<div class="vxs-note">Камера не сканирует? Вставь ключ вручную ниже — это тоже перенос С ВХОДОМ.</div>' +
                '<textarea class="vxb-key" id="vxb-qrpaste" placeholder="VXKEY:..."></textarea>' +
                '<button class="btn-modal btn-submit" id="vxb-qrpaste-ok" style="width:100%;">Вставить и войти с данными</button>' +
                '</div>' +
                '<div class="vxb-section" id="vxb-sec-key">' +
                '<textarea class="vxb-key" id="vxb-keydata" placeholder="VXKEY:..."></textarea>' +
                '<div class="vxb-gap"></div>' +
                '<button class="btn-modal btn-cancel" id="vxb-keyfile" style="width:100%;margin-bottom:8px;">Открыть файл .txt</button>' +
                '<button class="btn-modal btn-submit" id="vxb-key-ok" style="width:100%;">Перенести данные (БЕЗ входа)</button>' +
                '<input type="file" id="vxb-file" hidden accept=".txt,text/plain">' +
                '</div>' +
                '</div></div>';
            document.body.appendChild(restModal);
            document.getElementById('vxb-rclose').onclick = () => { stopScan(); restModal.classList.remove('active'); };
            const mQr = document.getElementById('vxb-m-qr'), mKey = document.getElementById('vxb-m-key');
            const sQr = document.getElementById('vxb-sec-qr'), sKey = document.getElementById('vxb-sec-key');
            mQr.onclick = () => { mQr.classList.add('sel'); mKey.classList.remove('sel'); sQr.classList.add('active'); sKey.classList.remove('active'); };
            mKey.onclick = () => { mKey.classList.add('sel'); mQr.classList.remove('sel'); sKey.classList.add('active'); sQr.classList.remove('active'); stopScan(); };
            document.getElementById('vxb-startscan').onclick = startScan;
            document.getElementById('vxb-qrpaste-ok').onclick = () => {
                const json = parseKey(document.getElementById('vxb-qrpaste').value);
                if (!json) return VXApp.UI.showToast('Ключ побит или не похож на VXKEY', 'error');
                if (!applyFull(json)) VXApp.UI.showToast('В ключе нет данных входа (ник/ID/хэш)', 'error');
            };
            document.getElementById('vxb-keyfile').onclick = () => document.getElementById('vxb-file').click();
            document.getElementById('vxb-file').addEventListener('change', (e) => {
                const f = e.target.files[0]; if (!f) return;
                const r = new FileReader();
                r.onload = (ev) => { document.getElementById('vxb-keydata').value = String(ev.target.result).trim(); };
                r.readAsText(f);
            });
            document.getElementById('vxb-key-ok').onclick = () => {
                const json = parseKey(document.getElementById('vxb-keydata').value);
                if (!json) return VXApp.UI.showToast('Ключ побит или не похож на VXKEY', 'error');
                if (!json.data) return VXApp.UI.showToast('Ключ старого формата v1: в нём только вход. Используй режим QR со входом', 'warn');
                const n = applyData(json.data);
                VXApp.UI.showToast('Перенесено блоков данных: ' + n + '. Вход НЕ выполнялся', 'info');
            };
        }
        restModal.classList.add('active');
    }
    async function startScan() {
        if (!('BarcodeDetector' in window)) { VXApp.UI.showToast('Браузер не умеет сканировать QR — вставь ключ вручную ниже', 'warn'); return; }
        try {
            scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        } catch (e) { VXApp.UI.showToast('Нет доступа к камере', 'error'); return; }
        const v = document.getElementById('vxb-scanvideo');
        v.srcObject = scanStream; v.style.display = 'block';
        const det = new BarcodeDetector({ formats: ['qr_code'] });
        const tick = async () => {
            if (!scanStream) return;
            try {
                const codes = await det.detect(v);
                if (codes.length) {
                    const val = codes[0].rawValue;
                    stopScan();
                    const json = parseKey(val);
                    if (!json) { VXApp.UI.showToast('В QR не ключ VXKEY', 'error'); return; }
                    if (!applyFull(json)) VXApp.UI.showToast('В ключе нет данных входа', 'error');
                    return;
                }
            } catch (e) {}
            setTimeout(tick, 400);
        };
        tick();
    }

    // ---------- кнопки в вкладке «Сохранения» ----------
    let attached = false;
    function attach() {
        if (attached) return;
        const panel = document.querySelector('#vxs-modal .vxs-panel[data-p="save"]');
        if (!panel) return;
        const btns = panel.querySelectorAll('button');
        if (btns.length < 2) return;
        attached = true;
        const saveB = btns[0], restB = btns[1];
        saveB.disabled = false; restB.disabled = false;
        saveB.style.opacity = '1'; restB.style.opacity = '1';
        saveB.innerText = 'Создать спец-ключ v2';
        restB.innerText = 'Восстановить (QR / VXKEY)';
        saveB.onclick = showKey;
        restB.onclick = showRestore;
        const note = panel.querySelector('.vxs-note');
        if (note) note.innerText = 'Ключ v2 содержит вход (ник, ID, хэш) и данные (карточка, каналы, темы). QR-режим переносит всё со входом; режим VXKEY переносит только данные без смены аккаунта.';
    }
    const mo = new MutationObserver(() => attach());
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(attach, 1500);
})();
