// ===================== VDEX HUB NAV =====================
(function () {
    const style = document.createElement('style');
    style.textContent = `
.vxh-nav { display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid #1a1a1a; background: rgba(5,5,5,.92); position: sticky; top: 0; z-index: 40; }
.vxh-nav button { flex: 1; padding: 9px 4px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #777; background: transparent; border: 1px solid #222; border-radius: 8px; cursor: pointer; }
.vxh-nav button.cur { color: var(--vx-primary); border-color: var(--vx-primary); background: #0d0d0d; }
`;
    document.head.appendChild(style);

    const TARGETS = [
        { id: 'settings', label: 'Настройки' },
        { id: 'themes', label: 'Темы' },
        { id: 'card', label: 'Карточка' }
    ];

    function closeAll() {
        const s = document.getElementById('vxs-modal'); if (s) s.classList.remove('active');
        const t = document.getElementById('vxt-modal'); if (t) t.classList.remove('active');
        const c = document.getElementById('vxp-overlay'); if (c) c.classList.remove('active');
    }
    function go(id) {
        closeAll();
        setTimeout(() => {
            if (id === 'settings') { const b = document.getElementById('btn-settings'); if (b) b.click(); }
            else if (id === 'card') { const b = document.getElementById('btn-my-card'); if (b) b.click(); }
            else if (id === 'themes') {
                const tmp = document.createElement('button');
                tmp.id = 'vxs-custom-themes';
                tmp.style.display = 'none';
                document.body.appendChild(tmp);
                tmp.click();
                tmp.remove();
            }
        }, 30);
    }
    function makeBar(current) {
        const b = document.createElement('div');
        b.className = 'vxh-nav';
        TARGETS.forEach(t => {
            const btn = document.createElement('button');
            btn.textContent = t.label;
            if (t.id === current) btn.classList.add('cur');
            btn.onclick = () => go(t.id);
            b.appendChild(btn);
        });
        return b;
    }
    function inject() {
        const spots = [
            { host: document.querySelector('#vxs-modal .modal'), cur: 'settings' },
            { host: document.querySelector('#vxt-modal .modal'), cur: 'themes' },
            { host: document.getElementById('vxp-overlay'), cur: 'card' }
        ];
        spots.forEach(s => {
            if (!s.host) return;
            if (s.host.querySelector(':scope > .vxh-nav')) return;
            s.host.prepend(makeBar(s.cur));
        });
    }
    const mo = new MutationObserver(() => inject());
    mo.observe(document.body, { childList: true, subtree: true });
    setInterval(inject, 1200);
})();
