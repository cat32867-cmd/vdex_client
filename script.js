// ====================== VX CORE ======================
const VX_KERNEL_REGISTRY = {
    "SYS_MODULES": [
        { id: "mod_net", status: "active", memory: "12kb", version: "v2.4" },
        { id: "mod_crypto", status: "active", memory: "45kb", version: "v1.1" },
        { id: "mod_webrtc", status: "standby", memory: "8kb", version: "v1.0" },
        { id: "mod_ui", status: "active", memory: "128kb", version: "v3.0" },
        { id: "mod_storage", status: "active", memory: "16kb", version: "v2.1" },
        { id: "mod_auth", status: "active", memory: "4kb", version: "v1.5" },
        { id: "mod_render", status: "active", memory: "256kb", version: "v4.2" },
        { id: "mod_audio", status: "standby", memory: "32kb", version: "v1.8" },
        { id: "mod_ai", status: "active", memory: "900mb", version: "v1.0" }
    ],
    "ERR_CODES": {
        "0x00": "SUCCESS", "0x01": "ERR_NET_DISCONNECT", "0x02": "ERR_AUTH_FAIL",
        "0x03": "ERR_CRYPTO_KEY", "0x04": "ERR_DB_LOCKED", "0x05": "ERR_MEM_FULL",
        "0x06": "ERR_TIMEOUT", "0x07": "ERR_WEBRTC_ICE", "0x08": "ERR_WEBRTC_SDP"
    }
};

const VXConfig = {
    API_BEACON: 'https://api.github.com/repos/cat32867-cmd/vdex-data/contents/server.txt',
    DB_NAME: 'VX_DataStore',
    DB_VERSION: 1,
    DEFAULT_CHANNELS: [
        { id: 'GLOBAL', name: 'GLOBAL_NET', desc: 'Глобальный поток VX', isDefault: true },
        { id: 'DEV_NULL', name: 'DEV_NULL', desc: 'Разработка и багрепорты', isDefault: true }
    ],
    MAX_IMAGE_WIDTH: 1080,
    IMAGE_QUALITY: 0.7,
    // ВПИШИ СЮДА СВОЙ node ID — включится шестерёнка модерации.
    // Свой ID виден в настройках (⚙️) в поле "Ваш ID".
    LOCAL_ADMINS: []
};

const VXState = {
    user: {
        nickname: localStorage.getItem('vx_nick') || null,
        uid: localStorage.getItem('vx_uuid') || ('node_' + Math.random().toString(36).substr(2, 9)),
        theme: localStorage.getItem('vx_theme') || 'dark',
        avatar: localStorage.getItem('vx_avatar') || null,
        role: 'user'
    },
    network: { socket: null, isConnected: false, isReconnecting: false, peerConnections: {} },
    ui: { activeChannelId: 'GLOBAL', channels: [], unread: {} },
    crypto: { keyPair: null }
};

// ========== МОДУЛЬ УПРАВЛЕНИЯ АККАУНТАМИ ==========
const VXAccounts = {
    storageKey: 'vx_accounts',
    getAll() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : {};
    },
    saveAll(accounts) {
        localStorage.setItem(this.storageKey, JSON.stringify(accounts));
    },
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode('vx_salt_2024:' + password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    async verify(nickname, password) {
        const accounts = this.getAll();
        const acc = accounts[nickname];
        if (!acc) return false;
        const hash = await this.hashPassword(password);
        return acc.passwordHash === hash;
    },
    async register(nickname, password, uid = null) {
        const accounts = this.getAll();
        if (accounts[nickname]) {
            return { success: false, error: 'Позывной уже занят' };
        }
        const newUid = uid || ('node_' + Math.random().toString(36).substr(2, 9));
        const passwordHash = await this.hashPassword(password);
        accounts[nickname] = { passwordHash, uid: newUid, avatar: null, createdAt: Date.now() };
        this.saveAll(accounts);
        return { success: true, uid: newUid };
    },
    getUid(nickname) {
        const accounts = this.getAll();
        return accounts[nickname]?.uid || null;
    },
    deleteAccount(nickname) {
        const accounts = this.getAll();
        delete accounts[nickname];
        this.saveAll(accounts);
    },
    updateAvatar(nickname, avatarData) {
        const accounts = this.getAll();
        if (accounts[nickname]) {
            accounts[nickname].avatar = avatarData;
            this.saveAll(accounts);
            return true;
        }
        return false;
    },
    changeNickname(oldNick, newNick) {
        const accounts = this.getAll();
        if (!accounts[oldNick] || accounts[newNick]) return false;
        accounts[newNick] = { ...accounts[oldNick] };
        delete accounts[oldNick];
        this.saveAll(accounts);
        return true;
    }
};

// ========== ИИ-МОДУЛЬ ==========
class VXLocalAI {
    constructor() {
        this.model = null;
        this.generator = null;
        this.isReady = false;
        this.isLoading = false;
        this.history = JSON.parse(localStorage.getItem('vx_ai_history') || '[]');
    }
    async init() {
        if (this.isReady || this.isLoading) return;
        this.isLoading = true;
        this.updateStatus('loading');
        try {
            const transformers = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.16.0');
            const { pipeline, env } = transformers;
            env.allowLocalModels = false;
            this.generator = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat', {
                progress_callback: (progress) => {
                    if (progress.status === 'progress' && progress.file?.includes('model')) {
                        console.log(`Загрузка модели: ${Math.round(progress.progress || 0)}%`);
                    }
                }
            });
            this.isReady = true;
            this.isLoading = false;
            this.updateStatus('ready');
            VXApp.UI.appendSystem("ИИ-МОДУЛЬ АКТИВЕН.");
        } catch (error) {
            console.error('AI init error:', error);
            this.isLoading = false;
            this.updateStatus('error');
            VXApp.UI.appendSystem(`ОШИБКА ИИ: ${error.message}`);
        }
    }
    updateStatus(status) {
        const statusEl = document.getElementById('ai-status');
        if (!statusEl) return;
        statusEl.className = 'ai-status';
        if (status === 'ready') { statusEl.classList.add('ready'); statusEl.textContent = 'ONLINE'; }
        else if (status === 'loading') { statusEl.classList.add('loading'); statusEl.textContent = 'ЗАГРУЗКА...'; }
        else if (status === 'error') { statusEl.textContent = 'ERROR'; }
        else { statusEl.textContent = 'OFFLINE'; }
    }
    async ask(prompt) {
        if (!this.isReady) {
            if (!this.isLoading) await this.init();
            return "ИИ-модуль загружается, подождите...";
        }
        const formattedPrompt = `<|system|>\nТы полезный ИИ-ассистент, встроенный в мессенджер Vdex. Отвечай кратко, по делу. Можешь использовать markdown.\n<|user|>\n${prompt}\n<|assistant|>\n`;
        try {
            const output = await this.generator(formattedPrompt, {
                max_new_tokens: 300, temperature: 0.7, do_sample: true, top_k: 50
            });
            const fullText = output[0].generated_text;
            const response = (fullText.split('<|assistant|>\n')[1] || fullText).trim();
            this.history.push({ role: 'user', content: prompt, time: Date.now() });
            this.history.push({ role: 'assistant', content: response, time: Date.now() });
            if (this.history.length > 50) this.history = this.history.slice(-50);
            localStorage.setItem('vx_ai_history', JSON.stringify(this.history));
            return response;
        } catch (error) {
            console.error('AI generation error:', error);
            return `СБОЙ ГЕНЕРАЦИИ: ${error.message}`;
        }
    }
    clearHistory() {
        this.history = [];
        localStorage.removeItem('vx_ai_history');
    }
    getHistory() { return this.history; }
}

class VXIndexedDB {
    constructor() { this.db = null; }
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(VXConfig.DB_NAME, VXConfig.DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('messages')) {
                    const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
                    msgStore.createIndex('channelId', 'channelId', { unique: false });
                    msgStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                if (!db.objectStoreNames.contains('channels')) {
                    db.createObjectStore('channels', { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            request.onerror = (e) => reject(e);
        });
    }
    async saveMessage(msg) {
        if (!msg.id) msg.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        if (!msg.timestamp) msg.timestamp = Date.now();
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve();
            const tx = this.db.transaction(['messages'], 'readwrite');
            const request = tx.objectStore('messages').put(msg);
            request.onsuccess = () => resolve(msg);
            request.onerror = (e) => reject(e);
        });
    }
    async getMessages(channelId, limit = 100) {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve([]);
            const tx = this.db.transaction(['messages'], 'readonly');
            const request = tx.objectStore('messages').index('channelId').getAll(IDBKeyRange.only(channelId));
            request.onsuccess = () => {
                let msgs = request.result;
                msgs.sort((a, b) => a.timestamp - b.timestamp);
                if (msgs.length > limit) msgs = msgs.slice(msgs.length - limit);
                resolve(msgs);
            };
            request.onerror = (e) => reject(e);
        });
    }
    async clearAll() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(['messages', 'channels'], 'readwrite');
            tx.objectStore('messages').clear();
            tx.objectStore('channels').clear();
            tx.oncomplete = () => {
                localStorage.clear();
                sessionStorage.clear();
                alert("Память узла отформатирована. Перезагрузка...");
                location.reload();
            };
        });
    }
}

class VXCrypto {
    static async encrypt(text) { return btoa(unescape(encodeURIComponent(text))); }
    static async decrypt(base64Str) {
        try { return decodeURIComponent(escape(atob(base64Str))); }
        catch (e) { return base64Str; }
    }
}

class VXWebRTCManager {
    constructor() {
        this.localStream = null;
        this.peerConnection = null;
        this.targetNode = null;
        this.pendingOffer = null;
        this.config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    }
    async setupLocalMedia() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.localStream = stream;
            const localVideo = document.getElementById('local-video');
            if (localVideo) localVideo.srcObject = stream;
            return true;
        } catch (error) {
            console.error('getUserMedia error:', error);
            VXApp.UI.showToast("Нет доступа к камере или микрофону", "error");
            return false;
        }
    }
    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.config);
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }
        this.peerConnection.ontrack = (event) => {
            document.getElementById('remote-video-wrapper').style.display = 'block';
            document.getElementById('remote-video').srcObject = event.streams[0];
        };
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                VXApp.Network.transmit({ type: "webrtc_ice", targetUid: this.targetNode, candidate: event.candidate });
            }
        };
        this.peerConnection.oniceconnectionstatechange = () => {
            if (this.peerConnection.iceConnectionState === 'disconnected' ||
                this.peerConnection.iceConnectionState === 'failed') {
                this.endCall();
            }
        };
    }
    async initiateCall() {
        const target = document.getElementById('search-node-id').value.trim();
        if (!target) return VXApp.UI.showToast("Введите ID узла", "warn");
        this.targetNode = target;
        VXApp.UI.closeModal('modal-search-user');
        const mediaOk = await this.setupLocalMedia();
        if (!mediaOk) return;
        document.getElementById('webrtc-container').classList.add('active');
        document.getElementById('remote-video-label').innerText = `ВЫЗОВ: ${target}...`;
        this.createPeerConnection();
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        VXApp.Network.transmit({
            type: "call_offer", targetUid: this.targetNode,
            callerUid: VXState.user.uid, callerNick: VXState.user.nickname, sdp: offer
        });
        VXApp.UI.showToast(`Вызов отправлен узлу ${target}`, "info");
    }
    async handleIncomingOffer(data) {
        this.targetNode = data.callerUid;
        this.pendingOffer = data.sdp;
        document.getElementById('inc-call-caller').innerText = `${data.callerNick} (${data.callerUid})`;
        VXApp.UI.openModal('modal-incoming-call');
    }
    async acceptCall() {
        VXApp.UI.closeModal('modal-incoming-call');
        const mediaOk = await this.setupLocalMedia();
        if (!mediaOk) {
            VXApp.Network.transmit({ type: "call_reject", targetUid: this.targetNode });
            return;
        }
        document.getElementById('webrtc-container').classList.add('active');
        document.getElementById('remote-video-label').innerText = `СОЕДИНЕНО С ${this.targetNode}`;
        this.createPeerConnection();
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        VXApp.Network.transmit({ type: "call_answer", targetUid: this.targetNode, sdp: answer });
        this.pendingOffer = null;
    }
    async handleAnswer(data) {
        if (!this.peerConnection) return;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        document.getElementById('remote-video-label').innerText = `СОЕДИНЕНО С ${this.targetNode}`;
    }
    rejectCall() {
        VXApp.UI.closeModal('modal-incoming-call');
        if (this.targetNode) {
            VXApp.Network.transmit({ type: "call_reject", targetUid: this.targetNode });
            this.targetNode = null;
        }
        this.pendingOffer = null;
    }
    endCall() {
        if (this.peerConnection) { this.peerConnection.close(); this.peerConnection = null; }
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }
        document.getElementById('webrtc-container').classList.remove('active');
        document.getElementById('remote-video-wrapper').style.display = 'none';
        document.getElementById('local-video').srcObject = null;
        document.getElementById('remote-video').srcObject = null;
        if (this.targetNode) {
            VXApp.Network.transmit({ type: "call_end", targetUid: this.targetNode });
            this.targetNode = null;
        }
        VXApp.UI.showToast("Звонок завершён", "info");
    }
    handleRemoteHangup() {
        VXApp.UI.showToast("Собеседник завершил звонок", "warn");
        this.endCall();
    }
}

class VXSearchManager {
    executeSearch() {
        const uid = document.getElementById('search-node-id').value.trim();
        if (!uid) return VXApp.UI.showToast("Введите ID узла", "warn");
        VXApp.UI.showToast(`Поиск узла ${uid}...`, "info");
        VXApp.Network.transmit({ type: "search_user", targetUid: uid });
    }
    handleSearchResult(data) {
        const resultDiv = document.getElementById('search-result');
        const nickEl = document.getElementById('found-user-nick');
        const idEl = document.getElementById('found-user-id');
        if (data.found) {
            nickEl.innerText = data.nickname || data.uid;
            idEl.innerText = data.uid;
            resultDiv.style.display = 'block';
            document.getElementById('search-node-id').value = data.uid;
        } else {
            resultDiv.style.display = 'none';
            VXApp.UI.showToast("Узел не найден", "error");
        }
    }
    inviteToCurrent() {
        const target = document.getElementById('search-node-id').value.trim();
        if (!target) return VXApp.UI.showToast("Сначала найдите узел", "warn");
        VXApp.UI.showToast(`Приглашение отправлено узлу ${target}`, "info");
        VXApp.Network.transmit({
            type: "invite_to_channel", targetUid: target,
            channelId: VXState.ui.activeChannelId, fromNick: VXState.user.nickname
        });
        VXApp.UI.closeModal('modal-search-user');
    }
}

// ========== ИИ-ИНТЕРФЕЙС ==========
class VXAIInterface {
    constructor() {
        this.chatContainer = document.getElementById('ai-chat-container');
        this.input = document.getElementById('ai-input');
        this.sendBtn = document.getElementById('btn-send-ai');
        this.clearBtn = document.getElementById('btn-clear-ai-chat');
        this.isOpen = false;
        this.initListeners();
    }
    initListeners() {
        this.sendBtn.addEventListener('click', () => this.sendQuery());
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendQuery(); }
        });
        this.input.addEventListener('input', () => {
            this.input.style.height = 'auto';
            this.input.style.height = Math.min(this.input.scrollHeight, 120) + 'px';
        });
        this.clearBtn.addEventListener('click', () => this.clearChat());
        this.initPromptListeners();
    }
    initPromptListeners() {
        document.querySelectorAll('.ai-prompt-chip').forEach(chip => {
            chip.onclick = () => {
                this.input.value = chip.dataset.prompt;
                this.sendQuery();
            };
        });
    }
    async open() {
        VXApp.UI.openModal('modal-ai');
        this.isOpen = true;
        this.renderHistory();
        if (!VXApp.AI.isReady && !VXApp.AI.isLoading) { await VXApp.AI.init(); }
        setTimeout(() => this.input.focus(), 300);
    }
    close() {
        VXApp.UI.closeModal('modal-ai');
        this.isOpen = false;
    }
    renderHistory() {
        const history = VXApp.AI.getHistory();
        const welcome = this.chatContainer.querySelector('.ai-welcome');
        if (history.length === 0) {
            if (!welcome) {
                this.chatContainer.innerHTML = `
                    <div class="ai-welcome">
                        <div class="ai-welcome-icon"><svg class="icon" style="width:64px;height:64px;" viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="11" rx="2"/><path d="M12 9V5"/><circle cx="12" cy="4" r="1"/><path d="M9 14v1"/><path d="M15 14v1"/><path d="M2 13h2"/><path d="M20 13h2"/></svg></div>
                        <h3>VX Neural Core v1.0</h3>
                        <p>Локальная нейросеть Qwen1.5-0.5B. Работает прямо в браузере без отправки данных на сервер.</p>
                        <div class="ai-quick-prompts">
                            <button class="ai-prompt-chip" data-prompt="Объясни, как работает WebRTC">Как работает WebRTC?</button>
                            <button class="ai-prompt-chip" data-prompt="Напиши простой шифр на JS">Простой шифр</button>
                            <button class="ai-prompt-chip" data-prompt="Помоги оптимизировать JavaScript код">Оптимизация JS</button>
                            <button class="ai-prompt-chip" data-prompt="Расскажи про end-to-end шифрование">E2E шифрование</button>
                        </div>
                    </div>
                `;
                this.initPromptListeners();
            }
            return;
        }
        if (welcome) welcome.remove();
        this.chatContainer.innerHTML = '';
        history.forEach(msg => { this.appendMessage(msg.role, msg.content, false); });
        this.scrollToBottom();
    }
    appendMessage(role, content, animate = true) {
        const welcome = this.chatContainer.querySelector('.ai-welcome');
        if (welcome) welcome.remove();
        const msgEl = document.createElement('div');
        msgEl.className = `ai-message ${role}`;
        if (!animate) msgEl.style.animation = 'none';
        const avatarSvg = role === 'user'
            ? '<svg class="icon sm" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
            : '<svg class="icon sm" viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="11" rx="2"/><path d="M12 9V5"/><circle cx="12" cy="4" r="1"/><path d="M9 14v1"/><path d="M15 14v1"/><path d="M2 13h2"/><path d="M20 13h2"/></svg>';
        msgEl.innerHTML = `
            <div class="ai-avatar">${avatarSvg}</div>
            <div class="ai-bubble">${this.formatMessage(content)}</div>
        `;
        this.chatContainer.appendChild(msgEl);
        if (animate) this.scrollToBottom();
    }
    formatMessage(text) {
        let formatted = text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/_(.+?)_/g, '<em>$1</em>');
        return formatted;
    }
    showThinking() {
        const msgEl = document.createElement('div');
        msgEl.className = 'ai-message assistant';
        msgEl.id = 'ai-thinking';
        msgEl.innerHTML = `
            <div class="ai-avatar"><svg class="icon sm" viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="11" rx="2"/><path d="M12 9V5"/><circle cx="12" cy="4" r="1"/><path d="M9 14v1"/><path d="M15 14v1"/><path d="M2 13h2"/><path d="M20 13h2"/></svg></div>
            <div class="ai-bubble"><div class="ai-thinking"><span></span><span></span><span></span></div></div>
        `;
        this.chatContainer.appendChild(msgEl);
        this.scrollToBottom();
    }
    removeThinking() {
        const thinking = document.getElementById('ai-thinking');
        if (thinking) thinking.remove();
    }
    async sendQuery() {
        const query = this.input.value.trim();
        if (!query) return;
        this.input.value = '';
        this.input.style.height = 'auto';
        this.appendMessage('user', query);
        this.showThinking();
        this.sendBtn.disabled = true;
        try {
            const response = await VXApp.AI.ask(query);
            this.removeThinking();
            this.appendMessage('assistant', response);
        } catch (error) {
            this.removeThinking();
            this.appendMessage('assistant', `Ошибка: ${error.message}`);
        } finally {
            this.sendBtn.disabled = false;
            this.input.focus();
        }
    }
    clearChat() {
        if (!confirm('Очистить историю диалога с ИИ?')) return;
        VXApp.AI.clearHistory();
        this.renderHistory();
        VXApp.UI.showToast('История очищена', 'info');
    }
    scrollToBottom() {
        requestAnimationFrame(() => { this.chatContainer.scrollTop = this.chatContainer.scrollHeight; });
    }
}

class VXInterface {
    constructor() {
        this.els = {
            flow: document.getElementById('chat-flow'),
            input: document.getElementById('msg-input'),
            btnSend: document.getElementById('btn-send-msg'),
            chList: document.getElementById('channel-list-container'),
            ctxMenu: document.getElementById('context-menu'),
            chCtxMenu: document.getElementById('channel-context-menu'),
            inputWrapper: document.getElementById('input-wrapper')
        };
        this.ctxTargetMsgId = null;
        this.ctxTargetChannelId = null;
        this.authMode = 'login';
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isSending = false;
        this.lastDateStr = null;
        this.adminTarget = null;
        this.initListeners();
        this.initVoiceRecorder();
    }
    initVoiceRecorder() {
        const voiceBtn = document.getElementById('btn-voice-record');
        if (!voiceBtn) return;
        voiceBtn.addEventListener('click', async () => {
            if (!this.isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    this.mediaRecorder = new MediaRecorder(stream);
                    this.audioChunks = [];
                    this.mediaRecorder.ondataavailable = e => this.audioChunks.push(e.data);
                    this.mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                        this.sendVoiceMessage(audioBlob);
                        stream.getTracks().forEach(t => t.stop());
                        voiceBtn.classList.remove('recording');
                    };
                    this.mediaRecorder.start();
                    this.isRecording = true;
                    voiceBtn.classList.add('recording');
                    this.showToast("Запись голосового сообщения...", "info");
                } catch (e) {
                    this.showToast("Нет доступа к микрофону", "error");
                }
            } else {
                if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                    this.mediaRecorder.stop();
                }
                this.isRecording = false;
                voiceBtn.classList.remove('recording');
                this.showToast("Запись остановлена", "info");
            }
        });
    }
    async sendVoiceMessage(audioBlob) {
        if (this.isSending) return;
        this.isSending = true;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const base64 = reader.result.split(',')[1];
                const currentChannel = VXState.ui.channels.find(c => c.id === VXState.ui.activeChannelId);
                const isPrivate = currentChannel?.isPrivate || false;
                const msgData = {
                    id: Date.now().toString(),
                    type: isPrivate ? "private_message" : "voice_message",
                    uid: VXState.user.uid,
                    nickname: VXState.user.nickname,
                    audio: base64,
                    mimeType: 'audio/webm',
                    faction: VXState.ui.activeChannelId,
                    time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                    timestamp: Date.now()
                };
                if (isPrivate) msgData.targetUid = currentChannel.targetUid;
                VXApp.Network.transmit(msgData);
                this.renderMessageHTML(msgData, false);
            } catch (e) {
                console.error('Voice send error:', e);
                this.showToast('Ошибка отправки голосового', 'error');
            } finally {
                this.isSending = false;
            }
        };
        reader.onerror = () => {
            this.showToast("Ошибка чтения аудио", "error");
            this.isSending = false;
        };
        reader.readAsDataURL(audioBlob);
    }
    initListeners() {
        this.els.input.addEventListener('focus', () => {
            this.els.inputWrapper.classList.add('focused');
            if (window.innerWidth <= 850 && document.body.classList.contains('menu-open')) {
                this.toggleMobileMenu();
            }
        });
        this.els.input.addEventListener('blur', () => {
            this.els.inputWrapper.classList.remove('focused');
        });
        this.els.input.addEventListener('input', () => {
            this.els.input.style.height = '40px';
            this.els.input.style.height = (this.els.input.scrollHeight) + 'px';
            if (this.els.input.value.trim().length > 0) this.els.btnSend.classList.add('active');
            else this.els.btnSend.classList.remove('active');
        });
        this.els.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleCommandOrMessage(); }
        });
        this.els.btnSend.addEventListener('click', () => this.handleCommandOrMessage());
        document.getElementById('btn-upload-file').addEventListener('click', () => document.getElementById('hidden-file-input').click());
        document.getElementById('hidden-file-input').addEventListener('change', (e) => VXApp.Media.handle(e));
        document.getElementById('btn-settings').addEventListener('click', () => {
            document.getElementById('settings-uid').value = VXState.user.uid;
            document.getElementById('settings-theme').value = VXState.user.theme;
            this.openModal('modal-settings');
        });
        document.getElementById('btn-clear-db').addEventListener('click', () => VXApp.Database.clearAll());
        document.getElementById('btn-logout').addEventListener('click', () => {
            localStorage.removeItem('vx_nick');
            localStorage.removeItem('vx_uuid');
            localStorage.removeItem('vx_avatar');
            localStorage.removeItem('vx_pass_hash');
            delete VXState._pendingHash;
            location.reload();
        });
        document.getElementById('btn-search-user').addEventListener('click', () => this.openModal('modal-search-user'));
        document.getElementById('btn-global-call').addEventListener('click', () => this.openModal('modal-search-user'));
        document.getElementById('btn-execute-search').addEventListener('click', () => VXApp.SearchManager.executeSearch());
        document.getElementById('btn-start-call').addEventListener('click', () => VXApp.WebRTC.initiateCall());
        document.getElementById('btn-invite-to-channel').addEventListener('click', () => VXApp.SearchManager.inviteToCurrent());
        // === КНОПКА ОТКРЫТИЯ ИИ ===
        document.getElementById('btn-call-ai').addEventListener('click', () => {
            if (VXApp.AIInterface) { VXApp.AIInterface.open(); }
        });
        document.getElementById('btn-create-group').addEventListener('click', () => this.openModal('modal-create-group'));
        document.getElementById('btn-confirm-create').addEventListener('click', () => {
            const n = document.getElementById('new-group-name').value.trim().toUpperCase().replace(/\s+/g, '_');
            const d = document.getElementById('new-group-desc').value.trim();
            if (n.length > 2) {
                const newCh = { id: n, name: n, desc: d || 'Custom Segment' };
                VXState.ui.channels.push(newCh);
                localStorage.setItem('vx_channels', JSON.stringify(VXState.ui.channels.filter(c => !c.isDefault)));
                this.closeModal('modal-create-group');
                this.switchChannel(n);
                document.getElementById('new-group-name').value = '';
            } else {
                this.showToast("Имя группы слишком короткое", "error");
            }
        });
        document.getElementById('btn-toggle-rp').addEventListener('click', () => this.toggleRightPanel());
        document.getElementById('btn-close-rp').addEventListener('click', () => this.toggleRightPanel());
        document.getElementById('btn-menu-toggle').addEventListener('click', () => this.toggleMobileMenu());
        document.getElementById('mobile-overlay').addEventListener('click', () => this.closeAllSidebars());
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#context-menu') && !e.target.closest('.msg-wrapper')) {
                this.els.ctxMenu.style.display = 'none';
            }
            if (!e.target.closest('#channel-context-menu') && !e.target.closest('.channel-wrapper')) {
                this.els.chCtxMenu.style.display = 'none';
            }
            if (!e.target.closest('#admin-menu') && !e.target.closest('.msg-gear')) {
                document.getElementById('admin-menu').style.display = 'none';
            }
        });
        let micOn = true, camOn = true;
        document.getElementById('btn-toggle-mic').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            if (!VXApp.WebRTC.localStream) return;
            micOn = !micOn;
            VXApp.WebRTC.localStream.getAudioTracks().forEach(t => t.enabled = micOn);
            btn.classList.toggle('muted', !micOn);
        });
        document.getElementById('btn-toggle-cam').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            if (!VXApp.WebRTC.localStream) return;
            camOn = !camOn;
            VXApp.WebRTC.localStream.getVideoTracks().forEach(t => t.enabled = camOn);
            btn.classList.toggle('muted', !camOn);
        });
        document.getElementById('btn-end-call').addEventListener('click', () => VXApp.WebRTC.endCall());
        document.getElementById('btn-accept-call').addEventListener('click', () => VXApp.WebRTC.acceptCall());
        document.getElementById('btn-reject-call').addEventListener('click', () => VXApp.WebRTC.rejectCall());
        document.getElementById('btn-profile').addEventListener('click', () => {
            const nickInput = document.getElementById('profile-nick');
            nickInput.value = VXState.user.nickname;
            const avatarDiv = document.getElementById('profile-avatar');
            if (VXState.user.avatar) {
                avatarDiv.style.backgroundImage = `url(${VXState.user.avatar})`;
                avatarDiv.innerText = '';
            } else {
                avatarDiv.style.backgroundImage = '';
                avatarDiv.innerText = VXState.user.nickname.charAt(0).toUpperCase();
            }
            this.openModal('modal-profile');
        });
        document.getElementById('btn-change-avatar').addEventListener('click', () => {
            document.getElementById('profile-avatar-input').click();
        });
        document.getElementById('profile-avatar-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const b64 = ev.target.result;
                    document.getElementById('profile-avatar').style.backgroundImage = `url(${b64})`;
                    document.getElementById('profile-avatar').innerText = '';
                    VXState.user.avatar = b64;
                };
                reader.readAsDataURL(file);
            }
        });
        document.getElementById('btn-save-profile').addEventListener('click', () => {
            const newNick = document.getElementById('profile-nick').value.trim();
            const oldNick = VXState.user.nickname;
            if (newNick.length >= 2) {
                VXState.user.nickname = newNick;
                localStorage.setItem('vx_nick', newNick);
                if (oldNick !== newNick) { VXAccounts.changeNickname(oldNick, newNick); }
                if (VXState.user.avatar) {
                    localStorage.setItem('vx_avatar', VXState.user.avatar);
                    VXAccounts.updateAvatar(newNick, VXState.user.avatar);
                    document.getElementById('btn-profile').style.backgroundImage = `url(${VXState.user.avatar})`;
                    document.getElementById('btn-profile').innerText = '';
                } else {
                    localStorage.removeItem('vx_avatar');
                    VXAccounts.updateAvatar(newNick, null);
                    document.getElementById('btn-profile').style.backgroundImage = '';
                    document.getElementById('btn-profile').innerText = newNick.charAt(0).toUpperCase();
                }
                this.showToast("Профиль обновлён", "info");
                this.closeModal('modal-profile');
                VXApp.Network.transmit({ type: "update_profile", nickname: newNick, avatar: VXState.user.avatar });
            } else {
                this.showToast("Ник слишком короткий", "error");
            }
        });
        document.getElementById('context-menu').addEventListener('click', (e) => {
            const action = e.target.closest('.ctx-item');
            if (!action) return;
            if (action.id === 'ctx-delete' && this.ctxTargetMsgId) {
                const el = document.getElementById(this.ctxTargetMsgId);
                if (el) el.remove();
                this.showToast("Удалено локально", "info");
            } else if (action.id === 'ctx-copy') {
                const msgEl = document.getElementById(this.ctxTargetMsgId);
                if (msgEl) {
                    const bubble = msgEl.querySelector('.msg-bubble');
                    if (bubble) {
                        navigator.clipboard?.writeText(bubble.innerText);
                        this.showToast("Текст скопирован", "info");
                    }
                }
            } else if (action.id === 'ctx-reply') {
                document.getElementById('msg-input').focus();
            }
            document.getElementById('context-menu').style.display = 'none';
        });
        this.els.chCtxMenu.addEventListener('click', (e) => {
            const action = e.target.closest('.ctx-item');
            if (!action) return;
            if (action.id === 'ctx-leave-channel' && this.ctxTargetChannelId) {
                this.leaveChannel(this.ctxTargetChannelId);
            }
            this.els.chCtxMenu.style.display = 'none';
        });
        // ===== КНОПКА "ВНИЗ" =====
        const scrollBtn = document.getElementById('btn-scroll-down');
        if (scrollBtn) {
            this.els.flow.addEventListener('scroll', () => {
                const gap = this.els.flow.scrollHeight - this.els.flow.scrollTop - this.els.flow.clientHeight;
                scrollBtn.classList.toggle('show', gap > 300);
            }, { passive: true });
            scrollBtn.addEventListener('click', () => { this.els.flow.scrollTop = this.els.flow.scrollHeight; });
        }
        // ===== АДМИН-ШЕСТЕРЁНКА =====
        this.els.flow.addEventListener('click', (e) => {
            const gear = e.target.closest('.msg-gear');
            if (!gear) return;
            e.stopPropagation();
            this.adminTarget = { uid: gear.dataset.uid, nick: gear.dataset.nick };
            const menu = document.getElementById('admin-menu');
            menu.style.display = 'flex';
            const r = gear.getBoundingClientRect();
            let x = Math.min(r.left, window.innerWidth - 200);
            let y = r.bottom + 6;
            if (y + 130 > window.innerHeight) y = r.top - 135;
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
        });
        document.getElementById('admin-menu').addEventListener('click', (e) => {
            const item = e.target.closest('.ctx-item');
            if (!item || !this.adminTarget) return;
            const { uid, nick } = this.adminTarget;
            if (item.id === 'adm-ban') {
                VXApp.Network.transmit({ type: 'admin_action', action: 'ban', targetUid: uid, by: VXState.user.uid });
                this.showToast(`Запрос на BAN: ${nick}`, 'warn');
            } else if (item.id === 'adm-kick') {
                VXApp.Network.transmit({ type: 'admin_action', action: 'kick', targetUid: uid, by: VXState.user.uid });
                this.showToast(`Кик: ${nick}`, 'warn');
            } else if (item.id === 'adm-copy') {
                navigator.clipboard?.writeText(uid);
                this.showToast('ID скопирован', 'info');
            }
            document.getElementById('admin-menu').style.display = 'none';
        });
        // Свайп для мобильных
        let touchStartX = 0, touchStartY = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        document.addEventListener('touchend', (e) => {
            if (window.innerWidth > 850) return;
            if (document.body.classList.contains('menu-open')) return;
            const dx = e.changedTouches[0].screenX - touchStartX;
            const dy = e.changedTouches[0].screenY - touchStartY;
            if (dx > 70 && Math.abs(dx) > Math.abs(dy)) { this.toggleMobileMenu(); }
        }, { passive: true });
        const donateBtn = document.getElementById('btn-donate');
        if (donateBtn) {
            donateBtn.addEventListener('click', () => {
                window.open('https://boosty.to/virtual_xray_official/about', '_blank');
            });
        }
        // === АУТЕНТИФИКАЦИЯ ===
        const modeLoginBtn = document.getElementById('auth-mode-login');
        const modeRegBtn = document.getElementById('auth-mode-register');
        const authTitle = document.getElementById('auth-mode-title');
        const submitBtn = document.getElementById('btn-auth-submit');
        const nickInput = document.getElementById('auth-nick-input');
        const passInput = document.getElementById('auth-pass-input');
        modeLoginBtn.addEventListener('click', () => {
            this.authMode = 'login';
            modeLoginBtn.classList.add('active');
            modeRegBtn.classList.remove('active');
            authTitle.innerText = 'ИДЕНТИФИКАЦИЯ УЗЛА';
            submitBtn.innerText = 'ВОЙТИ';
        });
        modeRegBtn.addEventListener('click', () => {
            this.authMode = 'register';
            modeRegBtn.classList.add('active');
            modeLoginBtn.classList.remove('active');
            authTitle.innerText = 'РЕГИСТРАЦИЯ НОВОГО УЗЛА';
            submitBtn.innerText = 'СОЗДАТЬ';
        });
        const handleAuth = async () => {
            const nick = nickInput.value.trim();
            const pass = passInput.value;
            if (nick.length < 2) { this.showToast("Позывной слишком короткий", "error"); return; }
            if (pass.length < 4) { this.showToast("Пароль должен быть не менее 4 символов", "error"); return; }
            if (this.authMode === 'register') {
                const result = await VXAccounts.register(nick, pass);
                if (result.success) {
                    VXState.user.nickname = nick;
                    VXState.user.uid = result.uid;
                    localStorage.setItem('vx_nick', nick);
                    localStorage.setItem('vx_uuid', result.uid);
                    const hash = await VXAccounts.hashPassword(pass);
                    localStorage.setItem('vx_pass_hash', hash);
                    VXState._pendingHash = hash;
                    VXState._pendingAuthType = 'registration';
                    this.showToast("Узел успешно зарегистрирован", "info");
                    VXApp.startSequence();
                } else {
                    this.showToast(result.error, "error");
                }
            } else {
                const hash = await VXAccounts.hashPassword(pass);
                const uid = VXAccounts.getUid(nick) || ('node_' + Math.random().toString(36).substr(2, 9));
                VXState.user.nickname = nick;
                VXState.user.uid = uid;
                VXState._pendingHash = hash;
                VXState._pendingAuthType = 'login';
                this.showToast("Отправка запроса на сервер...", "info");
                VXApp.startSequence();
            }
        };
        submitBtn.addEventListener('click', handleAuth);
        passInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAuth(); } });
        nickInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); passInput.focus(); } });
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    showNotification(title, body, icon = null) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(title, { body, icon, silent: false });
        }
    }
    async boot() {
        document.getElementById('modal-auth').classList.remove('active');
        document.getElementById('node-id-display').innerText = VXState.user.uid.toUpperCase();
        if (VXState.user.avatar) {
            document.getElementById('btn-profile').style.backgroundImage = `url(${VXState.user.avatar})`;
            document.getElementById('btn-profile').innerText = '';
        } else {
            document.getElementById('btn-profile').innerText = VXState.user.nickname.charAt(0).toUpperCase();
        }
        this.setTheme(VXState.user.theme);
        const savedChannels = JSON.parse(localStorage.getItem('vx_channels') || '[]');
        VXState.ui.channels = [...VXConfig.DEFAULT_CHANNELS, ...savedChannels];
        this.renderChannels();
        await this.switchChannel(VXState.ui.activeChannelId);
    }
    setTheme(themeName) {
        document.body.setAttribute('data-theme', themeName);
        localStorage.setItem('vx_theme', themeName);
        VXState.user.theme = themeName;
        const sel = document.getElementById('settings-theme');
        if (sel) sel.value = themeName;
    }
    renderChannels() {
        this.els.chList.innerHTML = '';
        VXState.ui.channels.forEach(ch => {
            const wrapper = document.createElement('div');
            wrapper.className = 'channel-wrapper';
            wrapper.dataset.channelId = ch.id;
            wrapper.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.ctxTargetChannelId = ch.id;
                this.els.chCtxMenu.style.display = 'flex';
                const menuW = 180, menuH = 50;
                let x = e.pageX, y = e.pageY;
                if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 10;
                if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 10;
                this.els.chCtxMenu.style.left = `${x}px`;
                this.els.chCtxMenu.style.top = `${y}px`;
            });
            let pressTimer;
            wrapper.addEventListener('touchstart', (e) => {
                pressTimer = setTimeout(() => {
                    const touch = e.touches[0];
                    this.ctxTargetChannelId = ch.id;
                    this.els.chCtxMenu.style.display = 'flex';
                    this.els.chCtxMenu.style.left = `${touch.clientX}px`;
                    this.els.chCtxMenu.style.top = `${touch.clientY}px`;
                }, 500);
            });
            wrapper.addEventListener('touchend', () => clearTimeout(pressTimer));
            wrapper.addEventListener('touchmove', () => clearTimeout(pressTimer));
            const unreadCount = VXState.ui.unread[ch.id] || 0;
            const badgeHtml = unreadCount > 0 ? `<div class="ch-badge has-unread">${unreadCount}</div>` : '';
            const div = document.createElement('div');
            div.className = `channel-item ${ch.id === VXState.ui.activeChannelId ? 'active' : ''}`;
            div.onclick = () => { this.switchChannel(ch.id); if (window.innerWidth <= 850) this.closeAllSidebars(); };
            div.innerHTML = `<span class="ch-hash">#</span><span class="ch-name">${ch.name}</span>${badgeHtml}`;
            wrapper.appendChild(div);
            this.els.chList.appendChild(wrapper);
        });
    }
    leaveChannel(channelId) {
        if (channelId === 'GLOBAL' || channelId === 'DEV_NULL') {
            this.showToast('Системные каналы нельзя покинуть', 'warn');
            return;
        }
        VXState.ui.channels = VXState.ui.channels.filter(c => c.id !== channelId);
        const customChannels = VXState.ui.channels.filter(c => !c.isDefault);
        localStorage.setItem('vx_channels', JSON.stringify(customChannels));
        if (VXState.ui.activeChannelId === channelId) { this.switchChannel('GLOBAL'); }
        else { this.renderChannels(); }
        this.showToast(`Вы покинули канал #${channelId}`, 'info');
    }
    openPrivateChat(targetUid, targetNick) {
        const channelId = `private_${targetUid}`;
        if (!VXState.ui.channels.find(c => c.id === channelId)) {
            VXState.ui.channels.push({
                id: channelId, name: `@${targetNick}`,
                desc: `Личный диалог с ${targetNick}`, isPrivate: true, targetUid: targetUid
            });
            localStorage.setItem('vx_channels', JSON.stringify(VXState.ui.channels.filter(c => !c.isDefault)));
        }
        this.switchChannel(channelId);
        this.closeAllSidebars();
    }
    async switchChannel(id) {
        VXState.ui.activeChannelId = id;
        VXState.ui.unread[id] = 0;
        const ch = VXState.ui.channels.find(c => c.id === id) || { name: id, desc: 'Unknown' };
        document.getElementById('current-ch-name').innerText = ch.name;
        document.getElementById('current-ch-desc').innerText = ch.desc;
        document.getElementById('rp-desc').innerText = ch.desc;
        this.els.input.placeholder = (window.innerWidth <= 850 ? `#${ch.name}... ` : `Трансляция в #${ch.name}... `) + '(/help)';
        this.renderChannels();
        this.els.flow.innerHTML = '';
        this.lastDateStr = null;
        this.appendSystem(`ПЕРЕХОД В СЕГМЕНТ [${ch.name}]`);
        const msgs = await VXApp.Database.getMessages(id);
        if (msgs.length > 0) {
            this.appendSystem(`ВОССТАНОВЛЕНИЕ ДАННЫХ ИЗ ИНДЕКСА (${msgs.length})`);
            for (let msg of msgs) { await this.renderMessageHTML(msg, true); }
        }
    }
    async renderMessageHTML(data, skipSave = false) {
        if (!skipSave) {
            data.channelId = data.faction;
            await VXApp.Database.saveMessage(data);
        }
        if (data.faction !== VXState.ui.activeChannelId) {
            if (!VXState.ui.unread[data.faction]) VXState.ui.unread[data.faction] = 0;
            VXState.ui.unread[data.faction]++;
            this.renderChannels();
            if (document.hidden && data.uid !== VXState.user.uid) {
                const ch = VXState.ui.channels.find(c => c.id === data.faction);
                const title = ch ? ch.name : data.faction;
                this.showNotification(`Новое сообщение в ${title}`, `${data.nickname}: ${data.text || '[Голосовое]'}`);
            }
            return;
        }
        const isMine = data.uid === VXState.user.uid;
        const timeStr = data.time || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        let decryptedText = data.text;
        if (data.isEncrypted) { decryptedText = await VXCrypto.decrypt(data.text); }
        const wrap = document.createElement('div');
        wrap.className = `msg-wrapper ${isMine ? 'mine' : ''}`;
        wrap.id = `msg-${data.id || Date.now()}`;
        wrap.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.ctxTargetMsgId = wrap.id;
            this.els.ctxMenu.style.display = 'flex';
            const menuW = 180, menuH = 120;
            let x = e.pageX, y = e.pageY;
            if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 10;
            if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 10;
            this.els.ctxMenu.style.left = `${x}px`;
            this.els.ctxMenu.style.top = `${y}px`;
        });
        let mediaHtml = '';
        if (data.image) {
            mediaHtml = `<img src="${data.image}" class="msg-image" onclick="VXApp.UI.viewImage(this.src)" alt="Прикреплённое изображение">`;
        } else if (data.audio) {
            const audioUrl = `data:${data.mimeType || 'audio/webm'};base64,${data.audio}`;
            mediaHtml = `<audio class="msg-audio" controls src="${audioUrl}"></audio>`;
        }
        let safeText = decryptedText ? decryptedText.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
        safeText = safeText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--vx-info);text-decoration:none;">$1</a>');
        const lockIcon = data.isEncrypted ? `<span class="e2ee-lock" title="Шифрование AES">🔒</span>` : '';
        const gearHtml = (VXApp.isAdmin() && !isMine) ? `<svg class="msg-gear" data-uid="${data.uid || ''}" data-nick="${(data.nickname || '').replace(/"/g, '&quot;')}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>` : '';
        // ===== РАЗДЕЛИТЕЛЬ ДАТ =====
        const msgDate = new Date(data.timestamp || Date.now());
        const dateKey = msgDate.toDateString();
        if (this.lastDateStr !== dateKey) {
            this.lastDateStr = dateKey;
            const divider = document.createElement('div');
            divider.className = 'date-divider';
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 864e5).toDateString();
            divider.textContent = dateKey === today ? 'СЕГОДНЯ' : (dateKey === yesterday ? 'ВЧЕРА' : msgDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }).toUpperCase());
            this.els.flow.appendChild(divider);
        }
        wrap.innerHTML = `
            <div class="msg-meta">
                ${lockIcon}
                <span class="msg-author" onclick="document.getElementById('search-node-id').value='${data.uid || ''}'; VXApp.UI.openModal('modal-search-user');">${data.nickname}</span>${gearHtml}
                <span class="msg-time">${timeStr}</span>
                ${isMine ? '<span class="msg-status read">✓✓</span>' : ''}
            </div>
            <div class="msg-bubble">${safeText}${mediaHtml}</div>
        `;
        this.els.flow.appendChild(wrap);
        this.scrollToBottom();
    }
    appendSystem(text) {
        const wrap = document.createElement('div');
        wrap.className = `msg-wrapper system`;
        wrap.innerHTML = `<div class="msg-system-text">${text}</div>`;
        this.els.flow.appendChild(wrap);
        this.scrollToBottom();
    }
    async handleCommandOrMessage() {
        if (this.isSending) return;
        const txt = this.els.input.value.trim();
        if (!txt) return;
        if (txt.startsWith('/')) {
            const cmd = txt.split(' ')[0].toLowerCase();
            if (cmd === '/clear') {
                this.els.flow.innerHTML = '';
                this.lastDateStr = null;
                this.appendSystem('UI_CACHE_CLEARED');
            } else if (cmd === '/theme') {
                const parts = txt.split(' ');
                if (parts[1]) this.setTheme(parts[1]);
                else this.appendSystem('Доступно: /theme dark | crimson | ocean');
            } else if (cmd === '/help') {
                this.appendSystem('КОМАНДЫ: /clear, /theme [name], /ai [запрос], /help');
            } else if (cmd === '/ai') {
                const prompt = txt.substring(4).trim();
                if (VXApp.AIInterface) {
                    VXApp.AIInterface.open();
                    if (prompt) {
                        setTimeout(() => {
                            document.getElementById('ai-input').value = prompt;
                            VXApp.AIInterface.sendQuery();
                        }, 500);
                    }
                }
            } else {
                this.appendSystem(`UNKNOWN COMMAND: ${cmd}`);
            }
            this.els.input.value = '';
            this.els.input.style.height = '40px';
            this.els.btnSend.classList.remove('active');
            return;
        }
        this.isSending = true;
        this.els.btnSend.classList.remove('active');
        try {
            const currentChannel = VXState.ui.channels.find(c => c.id === VXState.ui.activeChannelId);
            const isPrivate = currentChannel?.isPrivate || false;
            const msgData = {
                id: Date.now().toString(),
                type: isPrivate ? "private_message" : "chat",
                uid: VXState.user.uid,
                nickname: VXState.user.nickname,
                text: txt,
                isEncrypted: false,
                faction: VXState.ui.activeChannelId,
                time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };
            if (isPrivate) msgData.targetUid = currentChannel.targetUid;
            VXApp.Network.transmit(msgData);
            await this.renderMessageHTML(msgData, false);
            this.els.input.value = '';
            this.els.input.style.height = '40px';
        } catch (e) {
            console.error('Send error:', e);
            this.showToast('Ошибка отправки', 'error');
        } finally {
            this.isSending = false;
            if (window.innerWidth > 850) this.els.input.focus();
        }
    }
    scrollToBottom() {
        setTimeout(() => { this.els.flow.scrollTop = this.els.flow.scrollHeight; }, 50);
    }
    toggleMobileMenu() {
        if (document.body.classList.contains('menu-open')) {
            document.body.classList.remove('menu-open');
            if (window.innerWidth <= 850) document.getElementById('mobile-overlay').style.display = 'none';
        } else {
            if (document.body.classList.contains('rp-open')) {
                document.body.classList.remove('rp-open');
                document.getElementById('right-panel').classList.remove('open');
            }
            document.body.classList.add('menu-open');
            if (window.innerWidth <= 850) document.getElementById('mobile-overlay').style.display = 'block';
        }
    }
    toggleRightPanel() {
        const rightPanel = document.getElementById('right-panel');
        if (document.body.classList.contains('rp-open')) {
            document.body.classList.remove('rp-open');
            rightPanel.classList.remove('open');
        } else {
            if (document.body.classList.contains('menu-open')) {
                document.body.classList.remove('menu-open');
                if (window.innerWidth <= 850) document.getElementById('mobile-overlay').style.display = 'none';
            }
            document.body.classList.add('rp-open');
            rightPanel.classList.add('open');
        }
    }
    closeAllSidebars(event) {
        if (event) event.preventDefault();
        document.body.classList.remove('menu-open', 'rp-open');
        const rightPanel = document.getElementById('right-panel');
        if (rightPanel) rightPanel.classList.remove('open');
        if (window.innerWidth <= 850) document.getElementById('mobile-overlay').style.display = 'none';
    }
    updateMembersList(members) {
        const container = document.getElementById('rp-members-list');
        const countSpan = document.getElementById('rp-member-count');
        if (!container) return;
        container.innerHTML = '';
        if (members && members.length) {
            countSpan.innerText = members.length;
            members.forEach(m => {
                const div = document.createElement('div');
                div.className = 'member-item';
                div.onclick = () => {
                    document.getElementById('search-node-id').value = m.uid;
                    this.openModal('modal-search-user');
                };
                const avatar = document.createElement('div');
                avatar.className = 'member-avatar';
                if (m.avatar) avatar.style.backgroundImage = `url(${m.avatar})`;
                else avatar.innerText = (m.nickname || '?').charAt(0).toUpperCase();
                const dot = document.createElement('div');
                dot.className = 'member-dot';
                if (m.online === false) dot.style.backgroundColor = 'var(--vx-danger)';
                avatar.appendChild(dot);
                const info = document.createElement('div');
                info.className = 'member-info';
                info.innerHTML = `<div class="member-name">${m.nickname || m.uid}</div><div class="member-role">${m.role || 'участник'}</div>`;
                div.appendChild(avatar);
                div.appendChild(info);
                const dmBtn = document.createElement('button');
                dmBtn.className = 'btn-modal btn-cancel';
                dmBtn.style.marginLeft = 'auto';
                dmBtn.style.padding = '4px 8px';
                dmBtn.innerHTML = '<svg class="icon sm" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
                dmBtn.title = 'Написать в личку';
                dmBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.openPrivateChat(m.uid, m.nickname);
                };
                div.appendChild(dmBtn);
                container.appendChild(div);
            });
        } else {
            countSpan.innerText = '0';
            container.innerHTML = '<div style="color:#666; text-align:center;">Нет активных узлов</div>';
        }
    }
    setNetworkStatus(isOnline) {
        const dot = document.getElementById('status-indicator');
        const ping = document.getElementById('ping-dot');
        const statusText = document.getElementById('server-status-text');
        if (ping) { ping.className = isOnline ? 'srv-ping connected' : 'srv-ping'; }
        if (dot) { dot.className = isOnline ? 'online-dot' : 'online-dot offline'; }
        if (statusText) { statusText.innerText = isOnline ? 'В СЕТИ' : 'ОБРЫВ СВЯЗИ'; }
    }
    openModal(id) { document.getElementById(id).classList.add('active'); }
    closeModal(id) { document.getElementById(id).classList.remove('active'); }
    viewImage(src) { document.getElementById('full-image').src = src; this.openModal('image-viewer'); }
    showToast(msg, type = 'info') {
        const c = document.getElementById('toast-container'), t = document.createElement('div');
        t.className = `toast ${type}`;
        let icon = '';
        if (type === 'info') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        if (type === 'error') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        if (type === 'warn') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        t.innerHTML = `${icon} <span>${msg}</span>`;
        c.appendChild(t);
        setTimeout(() => { t.style.animation = 'toastOut 0.3s forwards'; setTimeout(() => t.remove(), 300); }, 3000);
    }
}

class VXMedia {
    handle(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.type.startsWith('image/')) {
            VXApp.UI.appendSystem(`ШИФРОВАНИЕ ИЗОБРАЖЕНИЯ: ${file.name}`);
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (w > VXConfig.MAX_IMAGE_WIDTH) {
                        h = Math.round((h * VXConfig.MAX_IMAGE_WIDTH) / w); w = VXConfig.MAX_IMAGE_WIDTH;
                    }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    const b64 = canvas.toDataURL('image/jpeg', VXConfig.IMAGE_QUALITY);
                    const msgData = {
                        id: Date.now().toString(), type: "chat", uid: VXState.user.uid, nickname: VXState.user.nickname,
                        text: "[ФОТО_ДАННЫЕ_ПРИКРЕПЛЕНЫ]", isEncrypted: false, faction: VXState.ui.activeChannelId, image: b64,
                        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), timestamp: Date.now()
                    };
                    VXApp.Network.transmit(msgData); VXApp.UI.renderMessageHTML(msgData, false);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else { VXApp.UI.showToast(`Передача ${file.name} не поддерживается (пока)`, 'warn'); }
        event.target.value = '';
    }
}

class VXNetwork {
    async fetchBeacon() {
        VXApp.UI.appendSystem("ЗАПРОС КООРДИНАТ СЕРВЕРА...");
        try {
            const res = await fetch(VXConfig.API_BEACON, {
                headers: { 'Accept': 'application/vnd.github.v3.raw' }
            });
            if (!res.ok) throw new Error("HTTP " + res.status);
            let wsUrl = (await res.text()).trim();
            if (!wsUrl.startsWith('ws')) wsUrl = 'wss://' + wsUrl;
            this.connect(wsUrl);
        } catch (e) {
            VXApp.UI.appendSystem(`СБОЙ ПОЛУЧЕНИЯ IP: ${e.message}. ПОВТОР...`);
            setTimeout(() => this.fetchBeacon(), 5000);
        }
    }
    connect(url) {
        VXApp.UI.appendSystem(`ПОДКЛЮЧЕНИЕ К УЗЛУ: ${url}...`);
        try {
            VXState.network.socket = new WebSocket(url);
        } catch (err) {
            this.handleDisconnect(); return;
        }
        VXState.network.socket.onopen = () => {
            VXState.network.isConnected = true;
            setTimeout(() => VXApp.UI.setNetworkStatus(true), 10);
            VXApp.UI.showToast("Связь установлена", "info");
            VXApp.UI.appendSystem("HANDSHAKE УСПЕШЕН.");
            const passwordHash = VXState._pendingHash || localStorage.getItem('vx_pass_hash');
            const authType = VXState._pendingAuthType || 'login';
            delete VXState._pendingHash;
            delete VXState._pendingAuthType;
            this.transmit({
                type: authType,
                uid: VXState.user.uid,
                nickname: VXState.user.nickname,
                avatar: VXState.user.avatar,
                password: passwordHash
            });
        };
        VXState.network.socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === "call_offer" && data.targetUid === VXState.user.uid) {
                    VXApp.WebRTC.handleIncomingOffer(data);
                } else if (data.type === "call_answer" && data.targetUid === VXState.user.uid) {
                    VXApp.WebRTC.handleAnswer(data);
                } else if (data.type === "call_reject" && data.targetUid === VXState.user.uid) {
                    VXApp.UI.showToast("Абонент отклонил вызов", "warn");
                    VXApp.WebRTC.endCall();
                } else if (data.type === "call_end" && data.targetUid === VXState.user.uid) {
                    VXApp.WebRTC.handleRemoteHangup();
                } else if (data.type === "webrtc_ice" && data.targetUid === VXState.user.uid && VXApp.WebRTC.peerConnection) {
                    VXApp.WebRTC.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                } else if (data.type === "search_result") {
                    VXApp.SearchManager.handleSearchResult(data);
                } else if (data.type === "invite_to_channel") {
                    const channelId = data.channelId;
                    const fromNick = data.fromNick || 'Узел';
                    VXApp.UI.showToast(`${fromNick} приглашает вас в канал #${channelId}`, "info");
                    if (!VXState.ui.channels.find(c => c.id === channelId)) {
                        VXState.ui.channels.push({ id: channelId, name: channelId, desc: 'Приглашённый канал' });
                        localStorage.setItem('vx_channels', JSON.stringify(VXState.ui.channels.filter(c => !c.isDefault)));
                        VXApp.UI.renderChannels();
                    }
                } else if (data.type === "chat" || data.type === "voice_message") {
                    if (document.getElementById(`msg-${data.id}`)) return;
                    if (!data.time) data.time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    VXApp.UI.renderMessageHTML(data, false);
                } else if (data.type === "private_message") {
                    if (document.getElementById(`msg-${data.id}`)) return;
                    const senderUid = data.senderUid || data.uid;
                    const privateChannelId = `private_${senderUid}`;
                    if (!VXState.ui.channels.find(c => c.id === privateChannelId)) {
                        const senderNick = data.senderNick || data.nickname || senderUid;
                        VXState.ui.channels.push({
                            id: privateChannelId, name: `@${senderNick}`,
                            desc: `Личный диалог с ${senderNick}`, isPrivate: true, targetUid: senderUid
                        });
                        localStorage.setItem('vx_channels', JSON.stringify(VXState.ui.channels.filter(c => !c.isDefault)));
                        VXApp.UI.renderChannels();
                    }
                    data.faction = privateChannelId;
                    if (!data.time) data.time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    VXApp.UI.renderMessageHTML(data, false);
                } else if (data.type === "auth_error") {
                    VXApp.UI.appendSystem(`[AUTH ERROR] ${data.text}`);
                    VXApp.UI.showToast(data.text, "error");
                    VXApp.UI.openModal('modal-auth');
                    localStorage.removeItem('vx_nick');
                    localStorage.removeItem('vx_uuid');
                    localStorage.removeItem('vx_pass_hash');
                } else if (data.type === "login_success") {
                    VXApp.UI.appendSystem(`[SERVER] ${data.text}`);
                    VXState.user.uid = data.uid;
                    VXState.user.nickname = data.nickname;
                    VXState.user.role = data.role || 'user';
                    if (data.avatar) VXState.user.avatar = data.avatar;
                    localStorage.setItem('vx_uuid', data.uid);
                    localStorage.setItem('vx_nick', data.nickname);
                    if (data.avatar) localStorage.setItem('vx_avatar', data.avatar);
                    const accounts = VXAccounts.getAll();
                    accounts[data.nickname] = {
                        passwordHash: VXState._pendingHash || localStorage.getItem('vx_pass_hash'),
                        uid: data.uid, avatar: data.avatar, createdAt: Date.now()
                    };
                    VXAccounts.saveAll(accounts);
                    const nodeIdDisplay = document.getElementById('node-id-display');
                    if (nodeIdDisplay) nodeIdDisplay.innerText = data.uid.toUpperCase();
                } else if (data.type === "system") {
                    VXApp.UI.appendSystem(`[SERVER] ${data.text}`);
                } else if (data.type === "members_list") {
                    VXApp.UI.updateMembersList(data.members);
                } else if (data.type === "profile_updated") {
                    VXApp.UI.showToast("Профиль обновлён", "info");
                }
            } catch (err) {
                VXApp.UI.appendSystem(`SERVER: ${e.data}`);
            }
        };
        VXState.network.socket.onclose = () => this.handleDisconnect();
        VXState.network.socket.onerror = () => this.handleDisconnect();
    }
    handleDisconnect() {
        if (!VXState.network.isConnected && VXState.network.isReconnecting) return;
        VXState.network.isConnected = false;
        VXState.network.isReconnecting = true;
        VXApp.UI.setNetworkStatus(false);
        VXApp.UI.appendSystem("КРИТИЧЕСКАЯ ОШИБКА: ПОТЕРЯ СВЯЗИ. ПЕРЕЗАПУСК...");
        setTimeout(() => {
            VXState.network.isReconnecting = false;
            this.fetchBeacon();
        }, 4000);
    }
    transmit(obj) {
        if (VXState.network.socket && VXState.network.socket.readyState === WebSocket.OPEN) {
            VXState.network.socket.send(JSON.stringify(obj));
        } else {
            VXApp.UI.showToast("Нет сети", "error");
        }
    }
}

class VXCanvasBG {
    constructor() {
        this.canvas = document.getElementById('vx-bg-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*'.split('');
        this.fontSize = 14;
        this.columns = [];
        this.drops = [];
        this.init();
    }
    init() { this.resize(); window.addEventListener('resize', () => this.resize()); this.loop(); }
    resize() {
        this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight;
        this.columns = Math.floor(this.canvas.width / this.fontSize); this.drops = [];
        for (let x = 0; x < this.columns; x++) this.drops[x] = 1;
    }
    draw() {
        const style = getComputedStyle(document.body);
        const primaryColor = style.getPropertyValue('--vx-primary').trim() || '#0F0';
        this.ctx.fillStyle = `rgba(0, 0, 0, 0.05)`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = primaryColor; this.ctx.font = this.fontSize + 'px monospace';
        for (let i = 0; i < this.drops.length; i++) {
            const text = this.letters[Math.floor(Math.random() * this.letters.length)];
            this.ctx.fillText(text, i * this.fontSize, this.drops[i] * this.fontSize);
            if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) { this.drops[i] = 0; }
            this.drops[i]++;
        }
    }
    loop() { this.draw(); setTimeout(() => requestAnimationFrame(() => this.loop()), 50); }
}

const VXApp = {
    Database: new VXIndexedDB(),
    UI: null,
    AIInterface: null,
    Media: new VXMedia(),
    Network: new VXNetwork(),
    WebRTC: new VXWebRTCManager(),
    SearchManager: new VXSearchManager(),
    AI: new VXLocalAI(),
    Effects: null,
    isAdmin() {
        return ['owner', 'admin', 'moder'].includes(VXState.user.role)
            || (VXConfig.LOCAL_ADMINS || []).includes(VXState.user.uid);
    },
    async init() {
        await this.Database.init();
        this.UI = new VXInterface();
        this.AIInterface = new VXAIInterface();
        this.Effects = new VXCanvasBG();
        const savedNick = localStorage.getItem('vx_nick');
        const savedUid = localStorage.getItem('vx_uuid');
        const savedPassHash = localStorage.getItem('vx_pass_hash');
        if (savedNick && savedUid && savedPassHash) {
            const accounts = VXAccounts.getAll();
            if (accounts[savedNick] && accounts[savedNick].uid === savedUid) {
                VXState.user.nickname = savedNick;
                VXState.user.uid = savedUid;
                if (accounts[savedNick].avatar) { VXState.user.avatar = accounts[savedNick].avatar; }
                VXState._pendingHash = localStorage.getItem('vx_pass_hash');
                VXState._pendingAuthType = 'login';
                await this.startSequence();
                return;
            } else {
                localStorage.removeItem('vx_nick');
                localStorage.removeItem('vx_uuid');
                localStorage.removeItem('vx_pass_hash');
                localStorage.removeItem('vx_avatar');
            }
        }
        document.getElementById('modal-auth').classList.add('active');
    },
    async startSequence() {
        document.getElementById('modal-auth').classList.remove('active');
        await this.UI.boot();
        this.Network.fetchBeacon();
    }
};

window.addEventListener('DOMContentLoaded', () => VXApp.init());
