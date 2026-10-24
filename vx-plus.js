// ===================== VDEX SOCIAL PLUS =====================
(function () {
    const style = document.createElement('style');
    style.textContent = `
.ch-section { padding: 10px 20px 4px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.5px; color: #555; text-transform: uppercase; display: flex; justify-content: space-between; }
.mention { color: var(--vx-info); font-weight: bold; }
.mention.me { color: var(--vx-warn); text-shadow: 0 0 6px var(--vx-warn); }
.msg-wrapper.mentioned .msg-bubble { border-color: var(--vx-warn) !important; }
.msg-react-btn { background: none; border: none; color: #555; cursor: pointer; padding: 0 2px; display: inline-flex; align-items: center; }
.msg-react-btn:hover { color: var(--vx-primary); }
.msg-react-btn .icon { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
#mention-popup { position: fixed; z-index: 900; background: #0d0d0d; border: 1px solid #333; border-radius: 8px; max-height: 160px; overflow-y: auto; display: none; min-width: 180px; }
#mention-popup .mp-item { display: flex; gap: 8px; align-items: center; padding: 6px 10px; cursor: pointer; font-size: 12px; color: #ccc; }
#mention-popup .mp-item:hover { background: #1a1a1a; color: var(--vx-primary); }
#search-results-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.sr-item { display: flex; align-items: center; gap: 8px; border: 1px solid #222; border-radius: 8px; padding: 6px 8px; }
.sr-item .sr-av { width: 28px; height: 28px; border-radius: 50%; background-color: #1a1a1a; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #888; font-family: var(--font-mono); flex-shrink: 0; }
.sr-item .sr-info { flex: 1; font-size: 12px; color: #ccc; font-family: var(--font-mono); }
.sr-item .sr-info span { display: block; font-size: 10px; color: #666; }
.sr-item button { padding: 4px 8px; font-size: 10px; }
.msg-anim-glitch .msg-bubble { animation: vxMsgGlitch 1.1s steps(2) infinite; text-shadow: 2px 0 rgba(255,0,60,.7), -2px 0 rgba(0,255,255,.7); }
@keyframes vxMsgGlitch { 0%,100% { transform: none; clip-path: none; } 10% { transform: translateX(-3px) skewX(-4deg); clip-path: inset(0 0 55% 0); } 20% { transform: translateX(3px); clip-path: inset(40% 0 0 0); } 30% { transform: none; clip-path: none; } 55% { transform: translateX(-2px) skewX(3deg); clip-path: inset(20% 0 30% 0); filter: hue-rotate(90deg); } 70% { transform: none; clip-path: none; filter: none; } }
.msg-anim-shake .msg-bubble { animation: vxMsgShake .5s linear infinite; }
@keyframes vxMsgShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px) rotate(-1deg); } 75% { transform: translateX(4px) rotate(1deg); } }
.msg-anim-neon .msg-bubble { animation: vxMsgNeon 1.6s ease-in-out infinite; }
@keyframes vxMsgNeon { 0%,100% { box-shadow: 0 0 4px var(--vx-primary); } 50% { box-shadow: 0 0 18px var(--vx-primary), 0 0 36px var(--vx-primary); } }
.msg-anim-vhs .msg-bubble { animation: vxMsgVhs 2s steps(3) infinite; filter: saturate(1.4) contrast(1.1); }
@keyframes vxMsgVhs { 0%,100% { transform: none; } 30% { transform: translateY(-1px); filter: saturate(1.4) contrast(1.1) blur(.4px); } 60% { transform: translateY(1px); } }
`;
    document.head.appendChild(style);

    VXState.ui.membersCache = VXState.ui.membersCache || [];

    // ---------- кэш узлов для поиска и упоминаний ----------
    const origMembers = VXInterface.prototype.updateMembersList;
    VXInterface.prototype.updateMembersList = function (members) {
        VXState.ui.membersCache = members || [];
        return origMembers.call(this, members);
    };

    // ---------- список каналов: две группы ----------
    function channelItem(self, ch) {
        const wrapper = document.createElement('div');
        wrapper.className = 'channel-wrapper';
        wrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            self.ctxTargetChannelId = ch.id;
            self.els.chCtxMenu.style.display = 'flex';
            let x = e.pageX, y = e.pageY;
            if (x + 180 > window.innerWidth) x = window.innerWidth - 190;
            if (y + 50 > window.innerHeight) y = window.innerHeight - 60;
            self.els.chCtxMenu.style.left = x + 'px';
            self.els.chCtxMenu.style.top = y + 'px';
        });
        let pressTimer;
        wrapper.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                self.ctxTargetChannelId = ch.id;
                self.els.chCtxMenu.style.display = 'flex';
                self.els.chCtxMenu.style.left = e.touches[0].clientX + 'px';
                self.els.chCtxMenu.style.top = e.touches[0].clientY + 'px';
            }, 500);
        });
        wrapper.addEventListener('touchend', () => clearTimeout(pressTimer));
        wrapper.addEventListener('touchmove', () => clearTimeout(pressTimer));
        const unread = VXState.ui.unread[ch.id] || 0;
        const isPriv = ch.isPrivate || ch.id.startsWith('private_');
        const avUrl = isPriv ? (VXState.ui.avatars[ch.targetUid] || null) : null;
        const avHtml = isPriv
            ? '<span class="ch-avatar"' + (avUrl ? ' style="background-image:url(' + avUrl + ')"' : '') + '>' + (avUrl ? '' : ch.name.replace('@', '').charAt(0).toUpperCase()) + '</span>'
            : '<span class="ch-hash">#</span>';
        const div = document.createElement('div');
        div.className = 'channel-item ' + (ch.id === VXState.ui.activeChannelId ? 'active' : '');
        div.onclick = () => { self.switchChannel(ch.id); if (window.innerWidth <= 850) self.closeAllSidebars(); };
        div.innerHTML = avHtml + '<span class="ch-name">' + ch.name + '</span>' + (unread > 0 ? '<div class="ch-badge has-unread">' + unread + '</div>' : '');
        wrapper.appendChild(div);
        return wrapper;
    }
    VXInterface.prototype.renderChannels = function () {
        this.els.chList.innerHTML = '';
        const chans = VXState.ui.channels.filter(c => !(c.isPrivate || c.id.startsWith('private_')));
        const privs = VXState.ui.channels.filter(c => c.isPrivate || c.id.startsWith('private_'));
        const header = (t, n) => { const h = document.createElement('div'); h.className = 'ch-section'; h.innerHTML = '<span>' + t + '</span><span>' + n + '</span>'; return h; };
        if (chans.length) {
            this.els.chList.appendChild(header('Каналы', chans.length));
            chans.forEach(ch => this.els.chList.appendChild(channelItem(this, ch)));
        }
        if (privs.length) {
            this.els.chList.appendChild(header('Чаты', privs.length));
            privs.forEach(ch => this.els.chList.appendChild(channelItem(this, ch)));
        }
    };

    // ---------- кнопка реакций на сообщении ----------
    function openPickerAt(btn, msgId) {
        VXApp.UI.ctxTargetMsgId = msgId;
        const picker = document.getElementById('reaction-picker');
        if (!picker) return;
        const r = btn.getBoundingClientRect();
        picker.style.left = Math.min(r.left, window.innerWidth - 260) + 'px';
        picker.style.top = (r.bottom + 6) + 'px';
        picker.classList.add('active');
    }

    // ---------- пост-обработка сообщений: упоминания, кнопка, анимации ----------
    const origRender = VXInterface.prototype.renderMessageHTML;
    VXInterface.prototype.renderMessageHTML = async function (data, skipSave) {
        const res = await origRender.call(this, data, skipSave);
        try {
            const wrap = document.getElementById('msg-' + (data.id || ''));
            if (!wrap) return res;
            if (data.anim) wrap.classList.add('msg-anim-' + data.anim);
            const bubble = wrap.querySelector('.msg-bubble');
            if (bubble) {
                const walker = document.createTreeWalker(bubble, NodeFilter.SHOW_TEXT, null);
                const nodes = [];
                let n; while ((n = walker.nextNode())) nodes.push(n);
                nodes.forEach(node => {
                    const parts = node.nodeValue.split(/(@[\wа-яёА-ЯЁ_]{2,})/g);
                    if (parts.length <= 1) return;
                    const frag = document.createDocumentFragment();
                    parts.forEach(p => {
                        if (/^@[\wа-яёА-ЯЁ_]{2,}$/.test(p)) {
                            const sp = document.createElement('span');
                            sp.className = 'mention' + (p.slice(1).toLowerCase() === (VXState.user.nickname || '').toLowerCase() ? ' me' : '');
                            sp.textContent = p;
                            frag.appendChild(sp);
                        } else frag.appendChild(document.createTextNode(p));
                    });
                    node.parentNode.replaceChild(frag, node);
                });
                if (!wrap.querySelector('.msg-react-btn')) {
                    const meta = wrap.querySelector('.msg-meta');
                    const btn = document.createElement('button');
                    btn.className = 'msg-react-btn';
                    btn.title = 'Реакции';
                    btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
                    btn.onclick = (ev) => { ev.stopPropagation(); openPickerAt(btn, wrap.id); };
                    if (meta) meta.insertBefore(btn, meta.querySelector('.msg-time'));
                }
                const fresh = Date.now() - (data.timestamp || 0) < 15000;
                if (data.uid !== VXState.user.uid && bubble.querySelector('.mention.me') && fresh) {
                    wrap.classList.add('mentioned');
                    VXApp.UI.showToast('Упоминание от ' + (data.nickname || ''), 'warn');
                } else if (data.uid !== VXState.user.uid && bubble.querySelector('.mention.me')) {
                    wrap.classList.add('mentioned');
                }
            }
        } catch (e) {}
        return res;
    };

    // ---------- поиск по нику и ID ----------
    function renderResults(results) {
        let box = document.getElementById('search-results-list');
        if (!box) {
            box = document.createElement('div');
            box.id = 'search-results-list';
            const modal = document.getElementById('modal-search-user');
            const body = modal ? modal.querySelector('.modal-body') : null;
            if (body) body.appendChild(box); else return;
        }
        box.innerHTML = '';
        if (!results.length) { box.innerHTML = '<div style="font-size:11px;color:#555;">В кэше никого не найдено.</div>'; return; }
        results.slice(0, 20).forEach(m => {
            const item = document.createElement('div');
            item.className = 'sr-item';
            const av = document.createElement('div'); av.className = 'sr-av';
            if (m.avatar) av.style.backgroundImage = 'url(' + m.avatar + ')';
            else av.innerText = (m.nickname || '?').charAt(0).toUpperCase();
            const info = document.createElement('div'); info.className = 'sr-info';
            info.innerHTML = (m.nickname || m.uid) + '<span>' + m.uid + (m.online ? ' · онлайн' : ' · офлайн') + '</span>';
            const cp = document.createElement('button'); cp.className = 'btn-modal btn-cancel'; cp.innerText = 'ID';
            cp.onclick = () => { navigator.clipboard?.writeText(m.uid); VXApp.UI.showToast('ID скопирован', 'info'); };
            const dm = document.createElement('button'); dm.className = 'btn-modal btn-submit'; dm.innerText = 'ЛС';
            dm.onclick = () => { VXApp.UI.openPrivateChat(m.uid, m.nickname); VXApp.UI.closeModal('modal-search-user'); };
            item.appendChild(av); item.appendChild(info); item.appendChild(cp); item.appendChild(dm);
            box.appendChild(item);
        });
    }
    function liveSearch() {
        const q = (document.getElementById('search-node-id').value || '').trim().toLowerCase();
        const cache = VXState.ui.membersCache || [];
        if (q.length < 2) { renderResults([]); return; }
        renderResults(cache.filter(m => (m.nickname || '').toLowerCase().includes(q) || (m.uid || '').toLowerCase().includes(q)));
    }
    const origSearch = VXSearchManager.prototype.executeSearch;
    VXSearchManager.prototype.executeSearch = function () {
        liveSearch();
        const q = (document.getElementById('search-node-id').value || '').trim().toLowerCase();
        const cache = VXState.ui.membersCache || [];
        const found = cache.some(m => (m.nickname || '').toLowerCase().includes(q) || (m.uid || '').toLowerCase().includes(q));
        if (!found && q) origSearch.call(this);
    };

    // ---------- автодополнение @ник ----------
    function initMentionPopup() {
        const input = document.getElementById('msg-input');
        if (!input) return;
        let popup = document.getElementById('mention-popup');
        if (!popup) { popup = document.createElement('div'); popup.id = 'mention-popup'; document.body.appendChild(popup); }
        input.addEventListener('input', () => {
            const val = input.value;
            const m = val.match(/@([\wа-яёА-ЯЁ_]*)$/);
            if (!m) { popup.style.display = 'none'; return; }
            const q = m[1].toLowerCase();
            const list = (VXState.ui.membersCache || []).filter(x => (x.nickname || '').toLowerCase().includes(q) && x.nickname !== VXState.user.nickname);
            if (!list.length) { popup.style.display = 'none'; return; }
            popup.innerHTML = '';
            list.slice(0, 6).forEach(u => {
                const it = document.createElement('div');
                it.className = 'mp-item';
                it.textContent = '@' + u.nickname;
                it.onclick = () => {
                    input.value = val.replace(/@[\wа-яёА-ЯЁ_]*$/, '@' + u.nickname + ' ');
                    popup.style.display = 'none';
                    input.focus();
                };
                popup.appendChild(it);
            });
            const r = input.getBoundingClientRect();
            popup.style.left = Math.max(10, Math.min(r.left, window.innerWidth - 200)) + 'px';
            popup.style.top = Math.max(10, r.top - 170) + 'px';
            popup.style.display = 'block';
        });
        document.addEventListener('click', (e) => { if (!e.target.closest('#mention-popup') && e.target !== input) popup.style.display = 'none'; });
    }

    // ---------- команда /animation ----------
    const origCmd = VXInterface.prototype.handleCommandOrMessage;
    VXInterface.prototype.handleCommandOrMessage = async function () {
        const txt = this.els.input.value.trim();
        const m = txt.match(/^\/animation\s+effect:([\w-]+)\s+([\s\S]+)$/i);
        if (!m) return origCmd.call(this);
        const effect = m[1].toLowerCase();
        if (['glitch', 'shake', 'neon', 'vhs'].indexOf(effect) === -1) {
            this.appendSystem('ЭФФЕКТЫ: glitch, shake, neon, vhs. Пример: /animation effect:glitch привет');
            this.els.input.value = '';
            return;
        }
        const ch = VXState.ui.channels.find(c => c.id === VXState.ui.activeChannelId);
        const msgData = {
            id: Date.now().toString(),
            type: (ch && ch.isPrivate) ? 'private_message' : 'chat',
            uid: VXState.user.uid, nickname: VXState.user.nickname,
            text: m[2], isEncrypted: false, faction: VXState.ui.activeChannelId, anim: effect,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        if (ch && ch.isPrivate) msgData.targetUid = ch.targetUid;
        VXApp.Network.transmit(msgData);
        await this.renderMessageHTML(msgData, false);
        this.els.input.value = '';
        this.els.input.style.height = '40px';
        this.els.btnSend.classList.remove('active');
    };

    function init() {
        initMentionPopup();
        const inp = document.getElementById('search-node-id');
        if (inp) inp.addEventListener('keyup', liveSearch);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
