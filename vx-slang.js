// ===================== VDEX SLANG =====================
(function () {
    const LS_MODE = 'vx_slang_mode', LS_CUSTOM = 'vx_slang_custom';
    const getMode = () => localStorage.getItem(LS_MODE) || 'term';
    const setMode = (m) => localStorage.setItem(LS_MODE, m);

    // словарь: терминал -> человеческий (длинные фразы ОБЯЗАТЕЛЬНО раньше коротких)
    const DICT = [
        ['ТРАНСЛЯЦИЯ В', 'Пишем в'],
        ['ВОССТАНОВЛЕНИЕ ДАННЫХ ИЗ ИНДЕКСА', 'Загрузка истории'],
        ['ЗАПРОС КООРДИНАТ СЕРВЕРА', 'Поиск сервера'],
        ['СЛЕЖЕНИЕ ЗА СЕРВЕРОМ', 'Статус сервера'],
        ['ОЧЕРЕДЬ ОТПРАВКИ', 'Очередь сообщений'],
        ['АКТИВНЫЕ СЕГМЕНТЫ', 'Каналы и чаты'],
        ['ИДЕНТИФИКАЦИЯ УЗЛА', 'Вход в аккаунт'],
        ['РЕГИСТРАЦИЯ НОВОГО УЗЛА', 'Создание аккаунта'],
        ['ПОДКЛЮЧЕНИЕ К УЗЛУ', 'Подключение к серверу'],
        ['ПЕРЕХОД В СЕГМЕНТ', 'Открытие канала'],
        ['СВОДКА СЕГМЕНТА', 'О канале'],
        ['HANDSHAKE УСПЕШЕН', 'Соединение установлено'],
        ['ПОТЕРЯ СВЯЗИ', 'Соединение потеряно'],
        ['УЗЛЫ В СЕТИ', 'Участники онлайн'],
        ['УЗЕЛ СЕТИ', 'участник'],
        ['НОВЫЙ УЗЕЛ', 'Создать канал'],
        ['СПЕЦ-КЛЮЧ УЗЛА', 'Ключ восстановления'],
        ['СПЕЦ-КЛЮЧ', 'Ключ восстановления'],
        ['КЛЮЧ ДОСТУПА', 'Пароль'],
        ['ПОЗЫВНОЙ', 'Никнейм'],
        ['ИНИЦИАЛИЗАЦИЯ', 'Войти'],
        ['РЕКОННЕКТЫ', 'Переподключения'],
        ['АПТАЙМ', 'Время работы'],
        ['СЕГМЕНТ', 'канал'],
        ['УЗЛОВ', 'участников'],
        ['УЗЛУ', 'серверу'],
        ['УЗЛА', 'аккаунта'],
        ['УЗЕЛ', 'участник']
    ];

    function parseCustom() {
        const raw = localStorage.getItem(LS_CUSTOM) || '';
        const out = [];
        raw.split('\n').forEach(line => {
            const i = line.indexOf('=');
            if (i > 0) {
                const a = line.slice(0, i).trim(), b = line.slice(i + 1).trim();
                if (a && b) out.push([a, b]);
            }
        });
        return out;
    }
    function buildRe() {
        const pairs = (getMode() === 'human' ? DICT : []).concat(parseCustom());
        if (!pairs.length) return null;
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(pairs.map(p => esc(p[0])).join('|'), 'gi');
        const map = {};
        pairs.forEach(p => { map[p[0].toLowerCase()] = p[1]; });
        return { re, map };
    }
    const repl = (built, str) => {
        built.re.lastIndex = 0;
        return str.replace(built.re, (m) => { const r = built.map[m.toLowerCase()]; return r !== undefined ? r : m; });
    };

    let applying = false;
    function pass() {
        if (applying) return;
        const built = buildRe();
        if (!built) return;
        applying = true;
        const nodes = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(n) {
                const p = n.parentNode;
                if (!p) return NodeFilter.FILTER_REJECT;
                const tag = p.nodeName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'OPTION') return NodeFilter.FILTER_REJECT;
                if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                built.re.lastIndex = 0;
                return built.re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });
        let n; while ((n = walker.nextNode())) nodes.push(n);
        nodes.forEach(node => { node.nodeValue = repl(built, node.nodeValue); });
        document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
            if (el.id === 'vxs-slang-custom') return;
            el.placeholder = repl(built, el.placeholder);
        });
        applying = false;
    }

    // авто-проход после любой перерисовки
    let t = null;
    const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(pass, 250); });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    setInterval(pass, 4000);

    // ---------- настройки: блок в вкладке «Вид» ----------
    function injectSettings() {
        const panel = document.querySelector('#vxs-modal .vxs-panel[data-p="view"]')
            || document.querySelector('#vxs-modal .vxs-panel[data-p="appearance"]')
            || (document.querySelector('#vxs-modal #settings-theme') ? document.querySelector('#vxs-modal #settings-theme').closest('.vxs-panel') : null);
        if (!panel || panel.querySelector('#vxs-slang')) return;
        const box = document.createElement('div');
        box.id = 'vxs-slang';
        box.innerHTML = '<div class="vxs-label" style="margin-top:14px;">СЛЕНГ ИНТЕРФЕЙСА</div>' +
            '<div class="vxs-note">«Терминал» — текущий техно-стиль (СЕГМЕНТ, УЗЕЛ, ТРАНСЛЯЦИЯ). «Человеческий» — обычные слова (канал, участник, сообщение). Свои замены работают в обоих режимах.</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0;"><span class="vxs-label">Человеческий стиль</span><div class="vxs-switch" id="vxs-slang-mode"></div></div>' +
            '<div class="vxs-label">Свои замены (по строке: что=чем)</div>' +
            '<textarea class="form-input" id="vxs-slang-custom" rows="3" placeholder="УЗЕЛ=человек&#10;ТРАНСЛЯЦИЯ=сообщение"></textarea>' +
            '<button class="btn-modal btn-submit" id="vxs-slang-apply" style="margin-top:8px;width:100%;">Применить сленг</button>';
        panel.appendChild(box);
        const sw = box.querySelector('#vxs-slang-mode');
        sw.classList.toggle('on', getMode() === 'human');
        sw.onclick = () => {
            setMode(sw.classList.contains('on') ? 'term' : 'human');
            sw.classList.toggle('on', getMode() === 'human');
            pass();
        };
        box.querySelector('#vxs-slang-custom').value = localStorage.getItem(LS_CUSTOM) || '';
        box.querySelector('#vxs-slang-apply').onclick = () => {
            localStorage.setItem(LS_CUSTOM, box.querySelector('#vxs-slang-custom').value);
            pass();
            VXApp.UI.showToast('Сленг обновлён', 'info');
        };
    }
    const mo2 = new MutationObserver(() => injectSettings());
    mo2.observe(document.body, { childList: true, subtree: true });

    // ---------- команда /slang ----------
    const origCmd = VXInterface.prototype.handleCommandOrMessage;
    VXInterface.prototype.handleCommandOrMessage = async function () {
        const txt = this.els.input.value.trim();
        const m = txt.match(/^\/slang(?:\s+(.*))?$/i);
        if (!m) return origCmd.call(this);
        const arg = (m[1] || '').toLowerCase();
        if (arg === 'term' || arg === 'terminal' || arg === 'терминал') setMode('term');
        else if (arg === 'human' || arg === 'чел' || arg === 'человеческий') setMode('human');
        else this.appendSystem('СЛЕНГ: режим=[' + getMode() + ']. Команды: /slang terminal | /slang human');
        this.els.input.value = '';
        this.els.input.style.height = '40px';
        this.els.btnSend.classList.remove('active');
        setTimeout(pass, 50);
        return;
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pass);
    else setTimeout(pass, 500);
})();
