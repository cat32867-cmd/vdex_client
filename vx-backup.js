// ===================== VDEX BACKUP & RESTORE =====================
(function () {
    const qrLib = document.createElement('script');
    qrLib.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
    document.head.appendChild(qrLib);

    const style = document.createElement('style');
    style.textContent = `
.vxb-key { width: 100%; min-height: 90px; background: #0d0d0d; border: 1px solid #333; border-radius: 8px; color: #ccc; padding: 8px; font-family: var(--font-mono); font-size: 11px; }
.vxb-qr { display: flex; justify-content: center; padding: 10px 0; background: #fff; border-radius: 8px; margin: 10px 0; }
.vxb-qr img { image-rendering: pixelated; }
#vxb-scanvideo { width: 100%; max-height: 220px; background: #000; border-radius: 8px; display: none; margin: 8px 0; }
`;
    document.head.appendChild(style);

    // ---------- фикс вылета аккаунта после перезагрузки ----------
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

    // ---------- ключ восстановления ----------
    function makeKey() {
        const obj = { v: 1, nick: VXState.user.nickname, uid: VXState.user.uid, hash: localStorage.getItem('vx_pass_hash'), avatar: localStorage.getItem('vx_avatar') || null };
        return 'VXKEY:' + btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    }
    function applyKey(code) {
        try {
            const json = JSON.parse(decodeURIComponent(escape(atob(code.replace('VXKEY:', '').trim()))));
            if (!json.nick || !json.uid || !json.hash) throw 0;
            localStorage.setItem('vx_nick', json.nick);
            localStorage.setItem('vx_uuid', json.uid);
            localStorage.setItem('vx_pass_hash', json.hash);
            if (json.avatar) localStorage.setItem('vx_avatar', json.avatar);
            let accounts = {};
            try { accounts = JSON.parse(localStorage.getItem('vx_accounts') || '{}'); } catch (e) {}
            accounts[json.nick] = { passwordHash: json.hash, uid: json.uid, avatar: json.avatar, createdAt: Date.now() };
            localStorage.setItem('vx_accounts', JSON.stringify(accounts));
            location.reload();
            return true;
        } catch (e) { return false; }
    }

    let keyModal = null, restModal = null;
    function showKey() {
        if (!keyModal) {
            keyModal = document.createElement('div');
            keyModal.className = 'overlay'; keyModal.id = 'vxb-keymodal';
            keyModal.innerHTML = '<div class="modal" style="max-width:420px;"><header class="modal-header"><h2 class="modal-title">СПЕЦ-КЛЮЧ УЗЛА</h2><button class="btn-close" id="vxb-kclose">✕</button></header><div class="modal-body"><textarea class="vxb-key" id="vxb-keytext" readonly></textarea><div class="vxb-qr" id="vxb-qr"></div><div class="vxs-note">Ключ = ник + ID + хэш пароля. Храни безопасно: кто владеет ключом, тот войдёт в твой узел.</div></div><footer class="modal-footer"><button class="btn-modal btn-cancel" id="vxb-kcopy">Копировать</button><button class="btn-modal btn-cancel" id="vxb-kdl">Скачать .txt</button></footer></div>';
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
        qrBox.innerHTML = '';
        if (window.qrcode) {
            try {
                const qr = window.qrcode(0, 'M');
                qr.addData(key); qr.make();
                qrBox.innerHTML = qr.createImgTag(4, 8);
            } catch (e) { qrBox.innerHTML = '<span style="color:#333;font-size:10px;">QR недоступен</span>'; }
        }
        keyModal.classList.add('active');
    }
    function showRestore() {
        if (!restModal) {
            restModal = document.createElement('div');
            restModal.className = 'overlay'; restModal.id = 'vxb-restmodal';
            restModal.innerHTML = '<div class="modal" style="max-width:420px;"><header class="modal-header"><h2 class="modal-title">ВОССТАНОВЛЕНИЕ УЗЛА</h2><button class="btn-close" id="vxb-rclose">✕</button></header><div class="modal-body"><textarea class="vxb-key" id="vxb-resttext" placeholder="Вставь спец-ключ VXKEY:..."></textarea><video id="vxb-scanvideo" playsinline></video><div class="vxs-note">Вставь ключ, открой файл или отсканируй QR с другого устройства.</div></div><footer class="modal-footer"><button class="btn-modal btn-cancel" id="vxb-rfile">Открыть файл</button><button class="btn-modal btn-cancel" id="vxb-rscan">Скан QR</button><button class="btn-modal btn-submit" id="vxb-rok">Войти</button></footer><input type="file" id="vxb-file" accept=".txt,text/plain" hidden></div>';
            document.body.appendChild(restModal);
            document.getElementById('vxb-rclose').onclick = stopScan;
            document.getElementById('vxb-rok').onclick = () => { if (!applyKey(document.getElementById('vxb-resttext').value)) VXApp.UI.showToast('Ключ побит или не похож на VXKEY', 'error'); };
            document.getElementById('vxb-rfile').onclick = () => document.getElementById('vxb-file').click();
            document.getElementById('vxb-file').addEventListener('change', (e) => {
                const f = e.target.files[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = (ev) => { document.getElementById('vxb-resttext').value = String(ev.target.result).trim(); };
                r.readAsText(f);
            });
            document.getElementById('vxb-rscan').onclick = startScan;
        }
        restModal.classList.add('active');
    }
    let scanStream = null;
    function stopScan() {
        if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
        const v = document.getElementById('vxb-scanvideo');
        if (v) { v.srcObject = null; v.style.display = 'none'; }
        if (restModal) restModal.classList.remove('active');
    }
    async function startScan() {
        if (!('BarcodeDetector' in window)) { VXApp.UI.showToast('Браузер не умеет сканировать — вставь ключ руками', 'warn'); return; }
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
                    if (!applyKey(val)) VXApp.UI.showToast('В QR не ключ VXKEY', 'error');
                    return;
                }
            } catch (e) {}
            setTimeout(tick, 400);
        };
        tick();
    }

    // ---------- подключаем кнопки в вкладку «Сохранения» ----------
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
        saveB.innerText = 'Создать спец-ключ';
        restB.innerText = 'Восстановить (ключ/QR)';
        saveB.onclick = showKey;
        restB.onclick = showRestore;
        const note = panel.querySelector('.vxs-note');
        if (note) note.innerText = 'Спец-ключ содержит ник, ID и хэш пароля: перенеси его на новое устройство или сохрани в облако вручную. Запись прямо в GitHub потребует токен — прикрутим позже.';
    }
    const mo = new MutationObserver(() => attach());
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(attach, 1500);
})();
