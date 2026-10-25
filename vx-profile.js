// ===================== VDEX PROFILE CARD =====================
(function () {
    const LS_MY = 'vx_my_profile', LS_CACHE = 'vx_profiles', LS_MYLIKES = 'vx_my_likes';
    const myUid = () => VXState.user.uid;
    const getMy = () => { try { return JSON.parse(localStorage.getItem(LS_MY) || 'null') || { banner: 'b_grid', avatar: 'a_orb', style: 's_cyber', music: '', bio: '', theme: '', likes: [] }; } catch (e) { return { banner: 'b_grid', avatar: 'a_orb', style: 's_cyber', music: '', bio: '', theme: '', likes: [] }; } };
    const setMy = (p) => localStorage.setItem(LS_MY, JSON.stringify(p));
    const getCache = () => { try { return JSON.parse(localStorage.getItem(LS_CACHE) || '{}'); } catch (e) { return {}; } };
    const putCache = (uid, p) => { const c = getCache(); c[uid] = p; localStorage.setItem(LS_CACHE, JSON.stringify(c)); };
    const getMyLikes = () => { try { return JSON.parse(localStorage.getItem(LS_MYLIKES) || '{}'); } catch (e) { return {}; } };
    const setMyLikes = (l) => localStorage.setItem(LS_MYLIKES, JSON.stringify(l));

    const style = document.createElement('style');
    style.textContent = `
#vxp-overlay { position: fixed; inset: 0; z-index: 9995; background: #050505; overflow-y: auto; display: none; }
#vxp-overlay.active { display: block; }
.vxp-banner { height: 30vh; min-height: 160px; background-size: cover; background-position: center; position: relative; }
.vxp-close { position: absolute; top: 12px; right: 12px; width: 40px; height: 40px; border-radius: 50%; border: 1px solid #333; background: rgba(0,0,0,.6); color: #ccc; cursor: pointer; font-size: 16px; }
.vxp-head { padding: 0 20px; margin-top: -48px; position: relative; }
.vxp-av { width: 96px; height: 96px; border-radius: 50%; background-size: cover; background-position: center; border: 3px solid var(--pc-a, #0ff); box-shadow: 0 0 18px var(--pc-a, #0ff); display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 34px; color: #fff; background-color: #111; }
.vxp-name { font-family: var(--font-mono); font-size: 22px; color: #fff; margin-top: 10px; text-shadow: 0 0 8px var(--pc-a, #0ff); }
.vxp-uid { font-family: var(--font-mono); font-size: 11px; color: #666; }
.vxp-badges { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.vxp-badge { font-size: 9px; font-family: var(--font-mono); padding: 3px 8px; border-radius: 10px; border: 1px solid var(--pc-a, #0ff); color: var(--pc-a, #0ff); }
.vxp-badge.gold { border-color: #ffd166; color: #ffd166; }
.vxp-body { padding: 16px 20px 40px; }
.vxp-row { font-size: 13px; color: #bbb; margin-bottom: 10px; font-family: var(--font-mono); }
.vxp-row b { color: var(--pc-b, #fff); }
.vxp-bio { font-size: 13px; color: #ccc; line-height: 1.6; border-left: 2px solid var(--pc-a, #0ff); padding-left: 10px; margin: 12px 0; white-space: pre-wrap; }
.vxp-actions { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
.vxp-btn { padding: 10px 16px; border-radius: 10px; border: 1px solid var(--pc-a, #0ff); background: transparent; color: var(--pc-a, #0ff); font-family: var(--font-mono); font-size: 12px; cursor: pointer; }
.vxp-btn.solid { background: var(--pc-a, #0ff); color: #000; }
.vxp-btn.liked { background: #ff2965; border-color: #ff2965; color: #fff; }
.vxp-edit { display: none; padding: 10px 20px 30px; }
.vxp-edit.active { display: block; }
.vxp-edit input, .vxp-edit textarea { width: 100%; background: #0d0d0d; border: 1px solid #333; border-radius: 8px; color: #ccc; padding: 8px; font-family: var(--font-mono); font-size: 12px; margin-bottom: 10px; }
.vxp-sec { font-size: 10px; letter-spacing: 1.5px; color: #666; text-transform: uppercase; margin: 12px 0 6px; font-family: var(--font-mono); }
.vxp-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.vxp-thumb { width: 64px; height: 40px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; background-size: cover; }
.vxp-thumb.av { width: 44px; height: 44px; border-radius: 50%; }
.vxp-thumb.st { width: 44px; height: 44px; border-radius: 8px; }
.vxp-thumb.sel { border-color: #fff; box-shadow: 0 0 10px var(--pc-a, #0ff); }
`;
    document.head.appendChild(style);

    // ---------- КАТАЛОГ ----------
    const svg = (bg, inner) => 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="' + bg + '"/>' + inner + '</svg>');
    const CATALOG = {
        banners: [
            { id: 'b_grid', name: 'NEON GRID', css: 'repeating-linear-gradient(90deg,rgba(0,255,255,.25) 0 2px,transparent 2px 40px),repeating-linear-gradient(0deg,rgba(255,0,200,.25) 0 2px,transparent 2px 40px),linear-gradient(180deg,#050014,#12003a)' },
            { id: 'b_synth', name: 'SYNTH SUNSET', css: 'linear-gradient(180deg,#12002b 0%,#3d0066 45%,#ff2975 75%,#ffb347 100%)' },
            { id: 'b_glitch', name: 'GLITCHCORE', css: 'repeating-linear-gradient(0deg,rgba(255,255,255,.08) 0 3px,transparent 3px 6px),linear-gradient(120deg,#0f0018,#003316,#001a33)' },
            { id: 'b_matrix', name: 'MATRIX RAIN', css: 'repeating-linear-gradient(90deg,rgba(0,255,65,.18) 0 1px,transparent 1px 14px),linear-gradient(180deg,#000,#001a05)' },
            { id: 'b_vhs', name: 'VHS DREAM', css: 'repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0 2px,transparent 2px 4px),linear-gradient(135deg,#2b003a,#003a3a)' },
            { id: 'b_ice', name: 'DEEP ICE', css: 'linear-gradient(160deg,#02101c,#0a2a44 60%,#7dd8ff)' },
            { id: 'b_toxic', name: 'TOXIC', css: 'radial-gradient(circle at 30% 20%,rgba(180,255,0,.35),transparent 60%),linear-gradient(180deg,#0a0f05,#101a08)' },
            { id: 'b_void', name: 'VOID', css: 'linear-gradient(180deg,#000,#0a0a0a)' }
        ],
        avatars: [
            { id: 'a_orb', name: 'ORB', url: svg('#08111a', '<circle cx="50" cy="50" r="26" fill="none" stroke="#0ff" stroke-width="4"/><circle cx="50" cy="50" r="10" fill="#ff71ce"/>') },
            { id: 'a_bolt', name: 'BOLT', url: svg('#101010', '<path d="M55 15 L35 55 L48 55 L42 85 L68 42 L52 42 Z" fill="#ffd166"/>') },
            { id: 'a_hex', name: 'HEX', url: svg('#0a0014', '<polygon points="50,14 82,32 82,68 50,86 18,68 18,32" fill="none" stroke="#b4ff00" stroke-width="4"/>') },
            { id: 'a_eye', name: 'EYE', url: svg('#001a1a', '<path d="M10 50 Q50 15 90 50 Q50 85 10 50 Z" fill="none" stroke="#0ff" stroke-width="4"/><circle cx="50" cy="50" r="12" fill="#ff2965"/>') },
            { id: 'a_tri', name: 'TRI', url: svg('#140008', '<polygon points="50,18 86,80 14,80" fill="none" stroke="#ff71ce" stroke-width="5"/>') },
            { id: 'a_wave', name: 'WAVE', url: svg('#001018', '<path d="M0 60 Q25 40 50 60 T100 60" fill="none" stroke="#7dd8ff" stroke-width="5"/><path d="M0 75 Q25 55 50 75 T100 75" fill="none" stroke="#01cdfe" stroke-width="3"/>') },
            { id: 'a_skull', name: 'SKULL', url: svg('#0d0d0d', '<circle cx="50" cy="45" r="26" fill="#eee"/><rect x="38" y="38" width="8" height="10" fill="#000"/><rect x="54" y="38" width="8" height="10" fill="#000"/><rect x="42" y="70" width="16" height="12" fill="#eee"/>') },
            { id: 'a_cross', name: 'CROSS', url: svg('#100010', '<path d="M50 20 V80 M20 50 H80" stroke="#ff2965" stroke-width="8"/>') }
        ],
        styles: [
            { id: 's_cyber', name: 'CYBERPUNK', a: '#ff71ce', b: '#01cdfe' },
            { id: 's_glitch', name: 'GLITCHCORE', a: '#b4ff00', b: '#ff5500' },
            { id: 's_vhs', name: 'VHS', a: '#7dd8ff', b: '#ff6b81' },
            { id: 's_matrix', name: 'MATRIX', a: '#00ff41', b: '#008f11' },
            { id: 's_gold', name: 'SPONSOR GOLD', a: '#ffd166', b: '#ff9f1c' },
            { id: 's_void', name: 'VOID', a: '#999', b: '#555' }
        ]
    };
    const bannerCss = (id) => { const b = CATALOG.banners.find(x => x.id === id); return b ? b.css : (id && id.indexOf('url(') === 0 ? id : CATALOG.banners[0].css); };
    const avatarUrl = (id) => { const a = CATALOG.avatars.find(x => x.id === id); return a ? a.url : (id && id.indexOf('data:') === 0 ? id : CATALOG.avatars[0].url); };
    const styleOf = (id) => CATALOG.styles.find(x => x.id === id) || CATALOG.styles[0];

    // ---------- сеть ----------
    const bc = (obj) => VXApp.Network.transmit(obj);
    function bcMyCard() {
        const p = getMy();
        p.sponsor = localStorage.getItem('vx_sponsor_on') === '1' || ['owner', 'admin'].includes(VXState.user.role);
        if (!p.theme) {
            try { const t = JSON.parse(localStorage.getItem('vx_custom_theme') || 'null'); p.theme = t ? t.name : (localStorage.getItem('vx_theme') || 'dark'); } catch (e) { p.theme = localStorage.getItem('vx_theme') || 'dark'; }
        }
        setMy(p);
        bc({ type: 'profile_card', uid: myUid(), profile: p });
    }
    function onWs(ev) {
        let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
        if (!d || !d.type) return;
        if (d.type === 'profile_card' && d.uid !== myUid()) {
            putCache(d.uid, d.profile);
            if (curUid === d.uid) renderCard(d.uid);
        } else if (d.type === 'profile_req' && d.targetUid === myUid()) {
            bcMyCard();
        } else if (d.type === 'profile_like' && d.targetUid === myUid()) {
            const p = getMy(); p.likes = p.likes || [];
            p.likes = p.likes.filter(u => u !== d.fromUid);
            if (d.on) p.likes.push(d.fromUid);
            setMy(p); bcMyCard();
            if (curUid === myUid()) renderCard(myUid());
        }
    }
    const origConnect = VXNetwork.prototype.connect;
    VXNetwork.prototype.connect = function (url) {
        const r = origConnect.call(this, url);
        const sock = VXState.network.socket;
        if (sock) {
            sock.addEventListener('message', onWs);
            sock.addEventListener('open', () => setTimeout(bcMyCard, 1500));
        }
        return r;
    };

    // ---------- лайки ----------
    function toggleLike(uid) {
        const likes = getMyLikes();
        const on = !likes[uid];
        if (on) likes[uid] = 1; else delete likes[uid];
        setMyLikes(likes);
        bc({ type: 'profile_like', targetUid: uid, fromUid: myUid(), on: on });
        const c = getCache(); if (c[uid]) { c[uid].likes = (c[uid].likes || []).filter(u => u !== myUid()); if (on) c[uid].likes.push(myUid()); putCache(uid, c[uid]); }
        renderCard(uid);
        VXApp.UI.showToast(on ? 'Лайк отправлен' : 'Лайк снят', 'info');
    }

    // ---------- карточка ----------
    let overlay = null, curUid = null, editMode = false;
    function build() {
        overlay = document.createElement('div');
        overlay.id = 'vxp-overlay';
        document.body.appendChild(overlay);
    }
    function openCard(uid) {
        if (!overlay) build();
        curUid = uid; editMode = false;
        overlay.classList.add('active');
        renderCard(uid);
        if (uid !== myUid() && !getCache()[uid]) bc({ type: 'profile_req', targetUid: uid });
    }
    function renderCard(uid) {
        const mine = uid === myUid();
        const p = mine ? getMy() : (getCache()[uid] || null);
        const st = styleOf(p ? p.style : 's_cyber');
        overlay.style.setProperty('--pc-a', st.a);
        overlay.style.setProperty('--pc-b', st.b);
        const nick = mine ? VXState.user.nickname : ((VXState.ui.membersCache || []).find(m => m.uid === uid) || {}).nickname || uid;
        const likesArr = p && p.likes ? p.likes : [];
        const iLiked = !!getMyLikes()[uid];
        const banner = p ? bannerCss(p.banner) : bannerCss('b_void');
        const av = p ? avatarUrl(p.avatar) : null;
        overlay.innerHTML =
            '<div class="vxp-banner" style="background:' + banner + '"><button class="vxp-close" id="vxp-close">✕</button></div>' +
            '<div class="vxp-head"><div class="vxp-av"' + (av ? ' style="background-image:url(' + av + ')"' : '') + '>' + (av ? '' : nick.charAt(0).toUpperCase()) + '</div>' +
            '<div class="vxp-name">' + nick + '</div><div class="vxp-uid">' + uid + '</div>' +
            '<div class="vxp-badges"><span class="vxp-badge">УЗЕЛ СЕТИ</span>' + (p && p.sponsor ? '<span class="vxp-badge gold">СПОНСОР</span>' : '') + '<span class="vxp-badge">' + st.name + '</span></div></div>' +
            '<div class="vxp-body">' +
            '<div class="vxp-row">♪ любимая музыка: <b>' + (p && p.music ? p.music : 'не указана') + '</b></div>' +
            '<div class="vxp-row">◆ любимая тема: <b>' + (p && p.theme ? p.theme : 'не указана') + '</b></div>' +
            (p && p.bio ? '<div class="vxp-bio">' + p.bio + '</div>' : '<div class="vxp-bio" style="opacity:.4">описание пустое...</div>') +
            '<div class="vxp-actions">' +
            (mine ? '<button class="vxp-btn solid" id="vxp-edit">Редактировать карточку</button>' : '<button class="vxp-btn' + (iLiked ? ' liked' : '') + '" id="vxp-like">' + (iLiked ? '♥' : '♡') + ' ' + likesArr.length + '</button><button class="vxp-btn" id="vxp-dm">Написать</button>') +
            '</div></div>' +
            '<div class="vxp-edit" id="vxp-editbox"></div>';
        document.getElementById('vxp-close').onclick = () => overlay.classList.remove('active');
        const lk = document.getElementById('vxp-like'); if (lk) lk.onclick = () => toggleLike(uid);
        const dm = document.getElementById('vxp-dm'); if (dm) dm.onclick = () => { overlay.classList.remove('active'); VXApp.UI.openPrivateChat(uid, nick); };
        const ed = document.getElementById('vxp-edit'); if (ed) ed.onclick = () => { editMode = !editMode; renderEdit(uid); };
        if (editMode && mine) renderEdit(uid);
    }
    function renderEdit(uid) {
        const box = document.getElementById('vxp-editbox');
        if (!box) return;
        if (!editMode) { box.classList.remove('active'); return; }
        box.classList.add('active');
        const p = getMy();
        box.innerHTML =
            '<div class="vxp-sec">Любимая музыка</div><input id="vxp-music" placeholder="напр. darkpsy / synthwave" value="' + (p.music || '') + '">' +
            '<div class="vxp-sec">Описание</div><textarea id="vxp-bio" rows="3" placeholder="Пару слов о себе...">' + (p.bio || '') + '</textarea>' +
            '<div class="vxp-sec">Баннер из каталога</div><div class="vxp-grid" id="vxp-g-b"></div>' +
            '<div class="vxp-sec">Аватарка из каталога</div><div class="vxp-grid" id="vxp-g-a"></div>' +
            '<div class="vxp-sec">Стиль карточки</div><div class="vxp-grid" id="vxp-g-s"></div>' +
            '<div class="vxp-actions"><button class="vxp-btn" id="vxp-upl">Загрузить свою аватарку</button><button class="vxp-btn solid" id="vxp-save">Сохранить и разослать</button></div>' +
            '<input type="file" id="vxp-file" accept="image/*" hidden>';
        const gb = document.getElementById('vxp-g-b');
        CATALOG.banners.forEach(b => {
            const t = document.createElement('div');
            t.className = 'vxp-thumb' + (p.banner === b.id ? ' sel' : '');
            t.style.background = b.css; t.title = b.name;
            t.onclick = () => { p.banner = b.id; setMy(p); renderEdit(uid); };
            gb.appendChild(t);
        });
        const ga = document.getElementById('vxp-g-a');
        CATALOG.avatars.forEach(a => {
            const t = document.createElement('div');
            t.className = 'vxp-thumb av' + (p.avatar === a.id ? ' sel' : '');
            t.style.backgroundImage = 'url(' + a.url + ')'; t.title = a.name;
            t.onclick = () => { p.avatar = a.id; setMy(p); renderEdit(uid); };
            ga.appendChild(t);
        });
        const gs = document.getElementById('vxp-g-s');
        CATALOG.styles.forEach(s => {
            const t = document.createElement('div');
            t.className = 'vxp-thumb st' + (p.style === s.id ? ' sel' : '');
            t.style.background = 'linear-gradient(135deg,' + s.a + ',' + s.b + ')'; t.title = s.name;
            t.onclick = () => { p.style = s.id; setMy(p); renderEdit(uid); };
            gs.appendChild(t);
        });
        document.getElementById('vxp-upl').onclick = () => document.getElementById('vxp-file').click();
        document.getElementById('vxp-file').addEventListener('change', (e) => {
            const f = e.target.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const c = document.createElement('canvas');
                    let w = img.width, h = img.height; const MAX = 256;
                    if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                    c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
                    p.avatar = c.toDataURL('image/jpeg', 0.7); setMy(p); renderEdit(uid);
                };
                img.src = ev.target.result;
            };
            r.readAsDataURL(f);
        });
        document.getElementById('vxp-save').onclick = () => {
            p.music = document.getElementById('vxp-music').value.trim();
            p.bio = document.getElementById('vxp-bio').value.trim();
            p.theme = '';
            setMy(p);
            editMode = false;
            bcMyCard();
            renderCard(uid);
            VXApp.UI.showToast('Карточка обновлена и разослана сети', 'info');
        };
    }

    // ---------- точки входа ----------
    const origRenderMsg = VXInterface.prototype.renderMessageHTML;
    VXInterface.prototype.renderMessageHTML = async function (data, skipSave) {
        const res = await origRenderMsg.call(this, data, skipSave);
        try {
            const wrap = document.getElementById('msg-' + (data.id || ''));
            if (wrap && data.uid) wrap.dataset.uid = data.uid;
        } catch (e) {}
        return res;
    };
    const origMembers = VXInterface.prototype.updateMembersList;
    VXInterface.prototype.updateMembersList = function (members) {
        const r = origMembers.call(this, members);
        try {
            const online = (members || []).filter(m => m.online);
            const items = document.querySelectorAll('#rp-members-list .member-item');
            items.forEach((el, i) => { if (online[i]) el.dataset.uid = online[i].uid; });
        } catch (e) {}
        return r;
    };
    document.addEventListener('click', (e) => {
        const mav = e.target.closest('.msg-avatar');
        if (mav) {
            const wrap = mav.closest('.msg-wrapper');
            if (wrap && wrap.dataset.uid) { e.stopPropagation(); openCard(wrap.dataset.uid); }
            return;
        }
        const mem = e.target.closest('.member-avatar');
        if (mem) {
            const item = mem.closest('.member-item');
            if (item && item.dataset.uid) { e.stopPropagation(); e.preventDefault(); openCard(item.dataset.uid); }
            return;
        }
    }, true);
    function injectBtn() {
        const anchor = document.getElementById('btn-global-call');
        if (!anchor || document.getElementById('btn-my-card')) return;
        const btn = document.createElement('button');
        btn.id = 'btn-my-card';
        btn.className = 'strip-action';
        btn.title = 'Моя карточка профиля';
        btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M14 8h6M14 12h6M6 16h12"/></svg>';
        btn.onclick = () => openCard(myUid());
        anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectBtn);
    else injectBtn();
    setTimeout(bcMyCard, 3000);
})();
