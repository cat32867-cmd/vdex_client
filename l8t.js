// ===================== L8T CIPHER =====================
// Авторское шифрование личных сообщений VX.
// Кодовое слово до 6 символов, AES-GCM (WebCrypto), только текст, только лички.
(function () {
    const PREFIX = 'L8T:';
    const SALT = 'l8t::vx::2025';

    const style = document.createElement('style');
    style.textContent = '.btn-l8t{width:40px;height:40px;background:transparent;border:none;color:#555;cursor:pointer;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-bottom:2px;transition:all .2s;}.btn-l8t:hover{color:var(--vx-primary);background:#1a1a1a;}.btn-l8t.on{color:var(--vx-primary);filter:drop-shadow(0 0 6px var(--vx-primary));}.btn-l8t.dim{opacity:.35;}.btn-l8t .icon{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}';
    document.head.appendChild(style);

    const L8T = {
        keys: JSON.parse(localStorage.getItem('vx_l8t_keys') || '{}'),
        save() { localStorage.setItem('vx_l8t_keys', JSON.stringify(this.keys)); },
        get(id) { return this.keys[id] || null; },
        set(id, w) { this.keys[id] = w; this.save(); },
        del(id) { delete this.keys[id]; this.save(); },
        async key(word) {
            const enc = new TextEncoder();
            const mat = await crypto.subtle.importKey('raw', enc.encode(word), 'PBKDF2', false, ['deriveBits']);
            const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(SALT), iterations: 50000, hash: 'SHA-256' }, mat, 256);
            return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
        },
        async encrypt(text, word) {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const key = await this.key(word);
            const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(text));
            const out = new Uint8Array(iv.length + buf.byteLength);
            out.set(iv, 0);
            out.set(new Uint8Array(buf), iv.length);
            let bin = '';
            out.forEach(function (b) { bin += String.fromCharCode(b); });
            return PREFIX + btoa(bin);
        },
        async decrypt(cipher, word) {
            try {
                const raw = Uint8Array.from(atob(cipher.slice(PREFIX.length)), function (c) { return c.charCodeAt(0); });
                const key = await this.key(word);
                const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12));
                return new TextDecoder().decode(plain);
            } catch (e) { return null; }
        }
    };
    window.L8T = L8T;

    function ch() { return VXState.ui.channels.find(function (c) { return c.id === VXState.ui.activeChannelId; }) || null; }

    function updateBtn() {
        const btn = document.getElementById('btn-l8t');
        if (!btn) return;
        const c = ch();
        const priv = !!(c && c.isPrivate);
        const word = priv ? L8T.get(c.id) : null;
        btn.classList.toggle('on', !!word);
        btn.classList.toggle('dim', !priv);
    }

    function openModal() {
        const c = ch();
        if (!c || !c.isPrivate) { VXApp.UI.showToast('L8T работает только в личных сообщениях', 'warn'); return; }
        let m = document.getElementById('l8t-modal');
        if (!m) {
            m = document.createElement('div');
            m.id = 'l8t-modal';
            m.className = 'overlay';
            m.innerHTML = '<div class="modal"><header class="modal-header"><h2 class="modal-title">L8T ШИФРОВАНИЕ</h2><button class="btn-close" id="l8t-close">✕</button></header><div class="modal-body"><p style="color:#888;font-size:12px;line-height:1.5;">Кодовое слово: до 6 символов, буквы и цифры. Введи ОДИНАКОВОЕ слово у себя и у собеседника — после этого личку не сможет прочитать ни сервер, ни кто-либо по пути. Шифруется только текст.</p><div class="form-group"><label>Кодовое слово</label><input class="form-input" id="l8t-input" type="text" maxlength="6" placeholder="напр. kot22"></div><div id="l8t-status" style="font-size:12px;color:#888;"></div></div><footer class="modal-footer"><button class="btn-modal btn-danger" id="l8t-off">Выключить</button><button class="btn-modal btn-submit" id="l8t-save">Сохранить</button></footer></div>';
            document.body.appendChild(m);
            document.getElementById('l8t-close').onclick = function () { m.classList.remove('active'); };
            document.getElementById('l8t-save').onclick = function () {
                const w = document.getElementById('l8t-input').value.trim().toLowerCase();
                if (!w || w.length > 6 || /[^0-9a-zа-яё]/i.test(w)) { document.getElementById('l8t-status').innerText = 'Нужно 1–6 символов: буквы или цифры'; return; }
                L8T.set(c.id, w);
                updateBtn();
                VXApp.UI.showToast('L8T включён для ' + c.name, 'info');
                m.classList.remove('active');
            };
            document.getElementById('l8t-off').onclick = function () {
                L8T.del(c.id);
                updateBtn();
                VXApp.UI.showToast('L8T выключен для ' + c.name, 'info');
                m.classList.remove('active');
            };
        }
        const cur = L8T.get(c.id);
        document.getElementById('l8t-input').value = cur || '';
        document.getElementById('l8t-status').innerText = cur ? ('Активное слово: ' + cur) : 'Сейчас выключено';
        m.classList.add('active');
    }

    function buildUI() {
        const wrapper = document.getElementById('input-wrapper');
        if (!wrapper || document.getElementById('btn-l8t')) return;
        const btn = document.createElement('button');
        btn.id = 'btn-l8t';
        btn.className = 'btn-l8t';
        btn.type = 'button';
        btn.title = 'L8T шифрование лички';
        btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
        btn.onclick = openModal;
        const send = document.getElementById('btn-send-msg');
        wrapper.insertBefore(btn, send);
        updateBtn();
    }

    // ----- Отправка: шифруем текст в личке -----
    const origTransmit = VXNetwork.prototype.transmit;
    VXNetwork.prototype.transmit = function (obj) {
        if (obj && obj.type === 'private_message' && typeof obj.text === 'string' && obj.text && !obj.audio && !obj.image && !obj.l8t) {
            const word = L8T.get(obj.faction);
            if (word) {
                obj.l8t = true;
                const self = this;
                L8T.encrypt(obj.text, word).then(function (cipher) {
                    obj.text = cipher;
                    origTransmit.call(self, obj);
                });
                return;
            }
        }
        return origTransmit.call(this, obj);
    };

    // ----- Приём/рендер: расшифровываем и вешаем замок -----
    const origRender = VXInterface.prototype.renderMessageHTML;
    VXInterface.prototype.renderMessageHTML = async function (data, skipSave) {
        if (data && data.l8t && typeof data.text === 'string' && data.text.indexOf(PREFIX) === 0) {
            const word = L8T.get(data.faction);
            if (word) {
                const plain = await L8T.decrypt(data.text, word);
                data.text = (plain === null) ? '[L8T: неверное кодовое слово]' : plain;
            } else {
                data.text = '[L8T: зашифровано. Нажми замок и введи кодовое слово]';
            }
        }
        const res = await origRender.call(this, data, skipSave);
        if (data && data.l8t) {
            const el = document.getElementById('msg-' + data.id);
            const meta = el && el.querySelector('.msg-meta');
            if (meta && !meta.querySelector('.e2ee-lock')) {
                meta.insertAdjacentHTML('afterbegin', '<span class="e2ee-lock" title="L8T">🔒</span>');
            }
        }
        return res;
    };

    // ----- Обновление замка при смене канала -----
    const origSwitch = VXInterface.prototype.switchChannel;
    VXInterface.prototype.switchChannel = async function (id) {
        const r = await origSwitch.call(this, id);
        updateBtn();
        return r;
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI);
    else buildUI();
})();
