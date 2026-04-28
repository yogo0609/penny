// ============================================================
// PENNY DASHBOARD — APP.JS
// REF-APP-01
// ============================================================


// === STATE ===
// REF-APP-02
const State = {
    token:   null,
    user:    null,
    guildId: null,
    config:  {},
    section: 'overview',
    tab:     null,
};


// ============================================================
// UTILITIES
// ============================================================

// === TOAST ===
// REF-APP-03
function toast(message, type = 'success') {
    const el = document.createElement('div');
    el.className   = `toast ${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}


// ============================================================
// SESSION MANAGEMENT
// ============================================================

// REF-APP-04
function saveSession(token, user) {
    localStorage.setItem('penny_token', token);
    localStorage.setItem('penny_user', JSON.stringify(user));
    State.token = token;
    State.user  = user;
}

// REF-APP-05
function loadSession() {
    const token = localStorage.getItem('penny_token');
    const user  = localStorage.getItem('penny_user');
    if (token && user) {
        State.token = token;
        State.user  = JSON.parse(user);
        return true;
    }
    return false;
}

// REF-APP-06
function clearSession() {
    localStorage.removeItem('penny_token');
    localStorage.removeItem('penny_user');
    State.token  = null;
    State.user   = null;
    State.config = {};
}


// ============================================================
// AUTH HANDLERS
// ============================================================

// === LOGIN ===
// REF-APP-07
async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl  = document.getElementById('login-error');
    const btn      = document.getElementById('login-btn');

    errorEl.classList.add('hidden');

    if (!username || !password) {
        errorEl.textContent = 'Username and password required.';
        errorEl.classList.remove('hidden');
        return;
    }

    btn.textContent = 'Signing in...';
    btn.disabled    = true;

    const res  = await fetch(`${window.PENNY_API_URL}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
        errorEl.textContent = data.error || 'Login failed.';
        errorEl.classList.remove('hidden');
        btn.textContent = 'Sign In';
        btn.disabled    = false;
        return;
    }

    saveSession(data.token, data.user);
    showDashboard();
}


// === SETUP ===
// REF-APP-08
async function handleSetup() {
    const username   = document.getElementById('setup-username').value.trim();
    const password   = document.getElementById('setup-password').value;
    const discord_id = document.getElementById('setup-discord').value.trim();
    const errorEl    = document.getElementById('setup-error');

    errorEl.classList.add('hidden');

    if (!username || !password) {
        errorEl.textContent = 'Username and password required.';
        errorEl.classList.remove('hidden');
        return;
    }

    if (password.length < 8) {
        errorEl.textContent = 'Password must be at least 8 characters.';
        errorEl.classList.remove('hidden');
        return;
    }

    const res  = await fetch(`${window.PENNY_API_URL}/auth/setup`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password, discord_id: discord_id || undefined }),
    });
    const data = await res.json();

    if (!res.ok) {
        errorEl.textContent = data.error || 'Setup failed.';
        errorEl.classList.remove('hidden');
        return;
    }

    toast('Owner account created — sign in to continue.');
    showLogin();
}


// === LOGOUT ===
// REF-APP-09
function handleLogout() {
    clearSession();
    showLogin();
}


// ============================================================
// SCREEN ROUTER
// ============================================================

// REF-APP-10
function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

// REF-APP-11
function showSetup() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

// REF-APP-12
async function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    // Apply role-based visibility
    const isOwner = State.user?.role === 'owner';
    document.querySelectorAll('.owner-only').forEach(el => {
        el.style.display = isOwner ? '' : 'none';
    });

    // Populate user pill
    document.getElementById('user-pill-name').textContent  = State.user?.username || '';
    document.getElementById('user-role-badge').textContent = State.user?.role     || '';

    // Restore saved guild selection
    const savedGuild = localStorage.getItem('penny_guild');
    if (savedGuild) {
        State.guildId = savedGuild;
        document.getElementById('guild-select').value = savedGuild;
        await loadGuildConfig();
    }

    checkPennyStatus();
    loadGuilds();
    const savedSection = localStorage.getItem('penny_section') || 'overview';
    setSection(savedSection);
}


// ============================================================
// GUILD MANAGEMENT
// ============================================================

// REF-APP-12a — Load guilds from API and populate dropdown
async function loadGuilds() {
    try {
        const guilds = await apiGet('/api/guilds');
        const select = document.getElementById('guild-select');
        select.innerHTML = '<option value="">Select Server</option>';
        guilds.forEach(g => {
            const opt = document.createElement('option');
            opt.value       = g.id;
            opt.textContent = g.name;
            select.appendChild(opt);
        });

        // Restore previously selected guild
        const savedGuild = localStorage.getItem('penny_guild');
        if (savedGuild) {
            select.value  = savedGuild;
            State.guildId = savedGuild;
            await loadGuildConfig();
        }
    } catch(e) { console.error(e); }
}

// REF-APP-13
function selectGuild(guildId) {
    State.guildId = guildId;
    localStorage.setItem('penny_guild', guildId);
    loadGuildConfig().then(() => renderContent());
}

// REF-APP-14
async function loadGuildConfig() {
    if (!State.guildId) return;
    try {
        State.config = await apiGet(`/api/config/${State.guildId}`);
        const badge  = document.getElementById('test-badge');
        State.config.test_mode ? badge.classList.remove('hidden') : badge.classList.add('hidden');
    } catch(e) { console.error(e); }
}


// ============================================================
// PENNY STATUS CHECK
// ============================================================

// REF-APP-15
async function checkPennyStatus() {
    try {
        const res  = await fetch(`${window.PENNY_API_URL}/api/health`, {
            headers: { 'Authorization': `Bearer ${State.token}` }
        });
        const dot  = document.querySelector('.status-dot');
        const text = document.querySelector('.status-text');
        if (res.ok) {
            dot.classList.remove('offline');
            text.textContent = 'Penny online';
        } else {
            dot.classList.add('offline');
            text.textContent = 'Penny offline';
        }
    } catch {
        document.querySelector('.status-dot')?.classList.add('offline');
    }
}


// ============================================================
// NAVIGATION
// ============================================================

// === SECTION DEFINITIONS ===
// REF-APP-16
const SECTIONS = {
    overview:   { tabs: ['Summary', 'Activity'],                  action: null,                                         render: renderOverview   },
    protection: { tabs: ['Modules', 'Thresholds', 'Bad Words'],   action: { label: 'Save', fn: saveProtection },       render: renderProtection },
    exemptions: { tabs: ['Roles', 'Users', 'Channels'],           action: null,                                         render: renderExemptions },
    moderation: { tabs: ['Mod Log', 'Warnings'],     action: null,                                         render: renderModeration },
    auditlog:   { tabs: ['Events', 'Settings'], action: null, render: renderAuditLog },
    welcome:    { tabs: ['Welcome Message', 'Auto Role'],         action: { label: 'Save', fn: saveWelcome },          render: renderWelcome    },
    users:      { tabs: ['Dashboard Users'],                      action: { label: 'Add User', fn: showAddUserForm },  render: renderUsers, ownerOnly: true },
    settings:   { tabs: ['General', 'Appearance', 'Danger Zone'], action: null,                                         render: renderSettings   },
};

// === SET SECTION ===
// REF-APP-17
function setSection(section) {
    const def = SECTIONS[section];
    if (!def) return;
    if (def.ownerOnly && State.user?.role !== 'owner') return;

    State.section = section;
    State.tab     = def.tabs[0];

    localStorage.setItem('penny_section', section);

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });

    document.getElementById('page-title').textContent =
        section.charAt(0).toUpperCase() + section.slice(1).replace(/([A-Z])/g, ' $1');

    loadGuildConfig().then(() => {
        renderSubnav();
        renderContent();
    });
}

// === SET TAB ===
// REF-APP-18
function setTab(tab) {
    State.tab = tab;
    document.querySelectorAll('.subnav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    renderContent();
}

// === RENDER SUBNAV ===
// REF-APP-19
function renderSubnav() {
    const def    = SECTIONS[State.section];
    const subnav = document.getElementById('subnav');

    const noSaveTabs = ['Modules', 'Bad Words'];
    const showAction = def.action && !noSaveTabs.includes(State.tab);

    let html = def.tabs.map(t =>
        `<button class="subnav-item${t === State.tab ? ' active' : ''}" data-tab="${t}" onclick="setTab('${t}')">${t}</button>`
    ).join('');

    if (showAction) {
        html += `<div class="subnav-right"><button class="subnav-btn" onclick="${def.action.fn.name}()">${def.action.label}</button></div>`;
    }

    subnav.innerHTML = html;
}

// === RENDER CONTENT ===
// REF-APP-20
function renderContent() {
    SECTIONS[State.section].render(State.tab);
}


// ============================================================
// INITIALISATION
// ============================================================

// REF-APP-21
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => setSection(btn.dataset.section));
    });

    document.getElementById('login-password')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleLogin();
    });

    restoreAppearance();
    init();
});

// REF-APP-22
async function init() {
    const setupRes  = await fetch(`${window.PENNY_API_URL}/auth/setup/status`);
    const setupData = await setupRes.json();
    if (setupData.setupRequired) { showSetup(); return; }
    if (loadSession())           { showDashboard(); return; }
    showLogin();
}


// ============================================================
// API HELPERS
// ============================================================

// REF-APP-23
async function apiGet(path) {
    const res = await fetch(`${window.PENNY_API_URL}${path}`, {
        headers: { 'Authorization': `Bearer ${State.token}` }
    });
    if (!res.ok) throw new Error(`GET ${path} failed`);
    return res.json();
}

// REF-APP-24
async function apiPost(path, body) {
    const res = await fetch(`${window.PENNY_API_URL}${path}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.token}` },
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed`);
    return res.json();
}

// REF-APP-25
async function apiPatch(path, body) {
    const res = await fetch(`${window.PENNY_API_URL}${path}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.token}` },
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${path} failed`);
    return res.json();
}

// REF-APP-26
async function apiPut(path, body) {
    const res = await fetch(`${window.PENNY_API_URL}${path}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.token}` },
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${path} failed`);
    return res.json();
}

// REF-APP-27
async function apiDelete(path, body) {
    const res = await fetch(`${window.PENNY_API_URL}${path}`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.token}` },
        body:    body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`DELETE ${path} failed`);
    return res.json();
}


// ============================================================
// PAGE RENDERERS
// ============================================================


// === OVERVIEW ===
// REF-APP-28
function renderOverview(tab) {
    const el = document.getElementById('content');

    if (tab === 'Summary') {
        el.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card accent">
                    <div class="stat-label">Actions Today</div>
                    <div class="stat-value" id="stat-actions">—</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-label">Spam Blocked</div>
                    <div class="stat-value" id="stat-spam">—</div>
                </div>
                <div class="stat-card red">
                    <div class="stat-label">Warnings Issued</div>
                    <div class="stat-value" id="stat-warnings">—</div>
                </div>
                <div class="stat-card amber">
                    <div class="stat-label">Test Mode</div>
                    <div class="stat-value" id="stat-testmode">—</div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">Protection Status</div></div>
                <div id="protection-status-list">
                    <div class="empty-state"><div class="empty-state-title">No events</div></div>
                </div>
            </div>`;
        loadOverviewStats();
    }

    if (tab === 'Activity') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Event Feed</div></div>
                <div id="activity-feed">
                    <div class="empty-state"><div class="empty-state-title">No events</div></div>
                </div>
            </div>`;
        loadActivity();
    }
}

// REF-APP-29
async function loadOverviewStats() {
    if (!State.guildId) {
        ['stat-actions','stat-spam','stat-warnings','stat-testmode'].forEach(id => {
            document.getElementById(id).textContent = 'N/A';
        });
        document.getElementById('protection-status-list').innerHTML =
            `<div class="empty-state"><div class="empty-state-title">No server selected</div></div>`;
        return;
    }

    try {
        const config = State.config;
        document.getElementById('stat-testmode').textContent = config.test_mode ? 'ON' : 'OFF';

        const modules = [
            { key: 'spam_enabled',        name: 'Spam Detection'    },
            { key: 'raid_enabled',         name: 'Anti-Raid'         },
            { key: 'badwords_enabled',     name: 'Bad Word Filter'   },
            { key: 'caps_enabled',         name: 'Caps Lock Filter'  },
            { key: 'mass_mention_enabled', name: 'Mass Mention'      },
            { key: 'antilink_enabled',     name: 'Anti-Invite Links' },
            { key: 'accountage_enabled',   name: 'Account Age Gate'  },
            { key: 'antiphishing_enabled', name: 'Anti-Phishing'     },
        ];

        document.getElementById('protection-status-list').innerHTML = modules.map(m => `
            <div class="toggle-row">
                <div class="toggle-info"><div class="toggle-name">${m.name}</div></div>
                <span class="badge ${config[m.key] ? 'badge-join' : 'badge-spam'}">${config[m.key] ? 'ACTIVE' : 'OFF'}</span>
            </div>`).join('');

        const logs = await apiGet(`/api/logs/${State.guildId}?limit=100`);
        document.getElementById('stat-actions').textContent  = logs.length;
        document.getElementById('stat-spam').textContent     = logs.filter(l => l.action === 'SPAM DETECTED').length;
        document.getElementById('stat-warnings').textContent = logs.filter(l => l.action === 'WARN ISSUED').length;

    } catch(e) { console.error(e); }
}

// REF-APP-30
async function loadActivity() {
    if (!State.guildId) {
        document.getElementById('activity-feed').innerHTML =
            `<div class="empty-state"><div class="empty-state-title">No server selected</div></div>`;
        return;
    }

    try {
        const logs     = await apiGet(`/api/logs/${State.guildId}?limit=50`);
        const feed     = document.getElementById('activity-feed');
        const colorMap = {
            'SPAM DETECTED': 'var(--red)',
            'WARN ISSUED':   'var(--amber)',
            'RAID DETECTED': '#be185d',
            'BAD WORD':      'var(--amber)',
            'CAPS FILTER':   'var(--accent)',
            'INVITE LINK':   'var(--red)',
            'MASS MENTION':  'var(--red)',
        };

        if (!logs.length) {
            feed.innerHTML = `<div class="empty-state"><div class="empty-state-title">No events logged yet</div></div>`;
            return;
        }

        feed.innerHTML = logs.map(l => `
            <div class="activity-item">
                <div class="activity-dot" style="background:${colorMap[l.action] || 'var(--text3)'}"></div>
                <div>
                    <div class="activity-text"><strong>${l.action}</strong>${l.reason ? ' — ' + l.reason : ''}</div>
                    <div class="activity-time">${new Date(l.created_at).toLocaleString()}</div>
                </div>
            </div>`).join('');

    } catch(e) { console.error(e); }
}


// === PROTECTION ===
// REF-APP-31
function renderProtection(tab) {
    const el = document.getElementById('content');
    const c  = State.config;

    if (tab === 'Modules') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Modules</div></div>
                ${moduleRow('spam_enabled',        'Spam Detection',    'spam_action',         c)}
                ${moduleRow('raid_enabled',         'Anti-Raid',         'raid_action',         c)}
                ${moduleRow('badwords_enabled',     'Bad Word Filter',   'badwords_action',     c)}
                ${moduleRow('caps_enabled',         'Caps Lock Filter',  'caps_action',         c)}
                ${moduleRow('mass_mention_enabled', 'Mass Mention',      'mass_mention_action', c)}
                ${moduleRow('antilink_enabled',     'Anti-Invite Links', 'antilink_action',     c)}
                ${moduleRow('accountage_enabled',   'Account Age Gate',  null,                  c)}
                ${moduleRow('antiphishing_enabled', 'Anti-Phishing',     null,                  c)}
            </div>`;
    }

    if (tab === 'Thresholds') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Thresholds</div></div>
                ${thrRow('spam_max_messages',   'Spam — max messages',      c.spam_max_messages   || 5,     'messages')}
                ${thrRow('spam_window_ms',      'Spam — window',            c.spam_window_ms      || 5000,  'ms')}
                ${thrRow('raid_max_joins',      'Raid — max joins',         c.raid_max_joins      || 5,     'joins')}
                ${thrRow('raid_window_ms',      'Raid — window',            c.raid_window_ms      || 10000, 'ms')}
                ${thrRow('caps_threshold',      'Caps — threshold',         c.caps_threshold      || 0.7,   '%')}
                ${thrRow('caps_min_length',     'Caps — min length',        c.caps_min_length     || 10,    'chars')}
                ${thrRow('mass_mention_max',    'Mass mention — max',       c.mass_mention_max    || 5,     'mentions')}
                ${thrRow('accountage_min_days', 'Account age — minimum',    c.accountage_min_days || 7,     'days')}
                ${thrRow('max_warnings',        'Max warnings before kick', c.max_warnings        || 3,     'warnings')}
            </div>`;
    }

    if (tab === 'Bad Words') {
        const words = State.config.badwords_list || [];
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Bad Words</div></div>
                <div class="word-grid" id="word-grid">
                    ${words.map(w => wordTag(w)).join('') || '<span style="color:var(--text3);font-size:13px;padding:4px">No words added</span>'}
                </div>
                <div class="word-add">
                    <input class="word-input" id="word-input" placeholder="Add a word...">
                    <button class="add-btn" onclick="addBadWord()">Add</button>
                </div>
            </div>`;
    }
}

// REF-APP-32
function moduleRow(key, name, actionKey, config) {
    const checked = config[key] ? 'checked' : '';
    const action  = actionKey ? (config[actionKey] || 'delete') : '';
    const pill    = actionKey
        ? `<span class="action-pill" onclick="cycleAction(this,'${actionKey}')" title="Click to change action">${action}</span>`
        : '';
    return `
        <div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">${name}</div>
            </div>
            <div class="toggle-right">
                ${pill}
                <label class="toggle">
                    <input type="checkbox" ${checked} onchange="toggleModule('${key}', this.checked)">
                    <span class="slider"></span>
                </label>
            </div>
        </div>`;
}

// REF-APP-33
function thrRow(key, label, value, unit) {
    return `
        <div class="thr-row">
            <div class="thr-label">${label}</div>
            <input class="thr-input" type="number" value="${value}" data-key="${key}">
            <div class="thr-unit">${unit}</div>
        </div>`;
}

// REF-APP-34
function wordTag(word) {
    return `<div class="word-tag">${word}<button class="word-remove" onclick="removeBadWord('${word}')">×</button></div>`;
}

// REF-APP-35
async function toggleModule(key, value) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    try {
        await apiPatch(`/api/config/${State.guildId}`, { key, value });
        State.config[key] = value;
        toast(value ? 'Enabled' : 'Disabled');
    } catch(e) { toast('Failed to save', 'error'); }
}

// REF-APP-36
function cycleAction(el, key) {
    const actions = ['delete', 'warn', 'kick'];
    const next    = actions[(actions.indexOf(el.textContent.trim()) + 1) % actions.length];
    el.textContent = next;
    if (State.guildId) {
        apiPatch(`/api/config/${State.guildId}`, { key, value: next })
            .then(() => { State.config[key] = next; toast(`Action → ${next}`); })
            .catch(() => toast('Failed to save', 'error'));
    }
}

// REF-APP-37
async function saveProtection() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }

    if (State.tab === 'Thresholds') {
        const inputs = document.querySelectorAll('.thr-input[data-key]');
        const updates = {};
        inputs.forEach(i => { updates[i.dataset.key] = parseFloat(i.value); });
        try {
            await apiPut(`/api/config/${State.guildId}`, updates);
            Object.assign(State.config, updates);
            toast('Thresholds saved');
        } catch(e) { toast('Failed to save', 'error'); }
        return;
    }

    if (State.tab === 'Modules') {
        toast('Modules save automatically when toggled');
        return;
    }

    if (State.tab === 'Bad Words') {
        toast('Words save automatically when added or removed');
        return;
    }
}

// REF-APP-38
async function addBadWord() {
    const input = document.getElementById('word-input');
    const word  = input.value.trim().toLowerCase();
    if (!word || !State.guildId) return;
    const list  = [...(State.config.badwords_list || [])];
    if (list.includes(word)) { toast('Already in list', 'error'); return; }
    list.push(word);
    try {
        await apiPatch(`/api/config/${State.guildId}`, { key: 'badwords_list', value: list });
        State.config.badwords_list = list;
        input.value = '';
        document.getElementById('word-grid').innerHTML = list.map(w => wordTag(w)).join('');
        toast(`"${word}" added`);
    } catch(e) { toast('Failed to save', 'error'); }
}

// REF-APP-39
async function removeBadWord(word) {
    if (!State.guildId) return;
    const list = (State.config.badwords_list || []).filter(w => w !== word);
    try {
        await apiPatch(`/api/config/${State.guildId}`, { key: 'badwords_list', value: list });
        State.config.badwords_list = list;
        document.getElementById('word-grid').innerHTML =
            list.map(w => wordTag(w)).join('') ||
            '<span style="color:var(--text3);font-size:13px;padding:4px">No words added</span>';
        toast(`"${word}" removed`);
    } catch(e) { toast('Failed to save', 'error'); }
}


// === EXEMPTIONS ===
// REF-APP-40
function renderExemptions(tab) {
    const el    = document.getElementById('content');
    const types = { 'Roles': 'role', 'Users': 'user', 'Channels': 'channel' };
    const type  = types[tab];
    const ph    = { role: 'Role ID', user: 'User ID', channel: 'Channel ID' };

    el.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Exempt ${tab}</div></div>
            <div id="exempt-list" style="padding:16px 20px">
                <div class="empty-state"><div class="empty-state-title">No events</div></div>
            </div>
            <div style="padding:0 20px 16px;display:flex;gap:8px">
                <input class="add-input" id="exempt-input" placeholder="${ph[type]}">
                <button class="add-btn" onclick="addExemption('${type}')">Add</button>
            </div>
        </div>`;

    loadExemptions(type);
}

// REF-APP-41
async function loadExemptions(type) {
    if (!State.guildId) {
        document.getElementById('exempt-list').innerHTML =
            `<div class="empty-state"><div class="empty-state-title">No server selected</div></div>`;
        return;
    }
    try {
        const data  = await apiGet(`/api/exemptions/${State.guildId}`);
        const items = data[type + 's'] || [];
        const list  = document.getElementById('exempt-list');
        if (!items.length) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-title">None added</div></div>`;
            return;
        }
        list.innerHTML = items.map(id => `
            <div class="exempt-item">
                <span class="exempt-name">${id}</span>
                <button class="exempt-remove" onclick="removeExemption('${type}','${id}')">Remove</button>
            </div>`).join('');
    } catch(e) { console.error(e); }
}

// REF-APP-42
async function addExemption(type) {
    const input    = document.getElementById('exempt-input');
    const targetId = input.value.trim();
    if (!targetId || !State.guildId) return;
    try {
        await apiPost(`/api/exemptions/${State.guildId}`, {
            type, target_id: targetId, added_by: State.user?.username
        });
        input.value = '';
        toast('Added');
        loadExemptions(type);
    } catch(e) { toast('Failed', 'error'); }
}

// REF-APP-43
async function removeExemption(type, targetId) {
    if (!State.guildId) return;
    try {
        await apiDelete(`/api/exemptions/${State.guildId}`, { type, target_id: targetId });
        toast('Removed');
        loadExemptions(type);
    } catch(e) { toast('Failed', 'error'); }
}


// === MODERATION ===
// REF-APP-44
function renderModeration(tab) {
    const el = document.getElementById('content');

    if (tab === 'Mod Log') {
        el.innerHTML = `
            <div class="card">
                <table class="data-table">
                    <thead><tr><th>Event</th><th>Target</th><th>Moderator</th><th>Reason</th><th>Time</th></tr></thead>
                    <tbody id="modlog-body">
                        <tr><td colspan="5" class="table-loading">No events</td></tr>
                    </tbody>
                </table>
            </div>`;
        loadModLog();
    }

    if (tab === 'Warnings') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Warnings</div>
                    <div style="display:flex;gap:8px">
                        <input class="add-input" id="warn-lookup" placeholder="Filter by User ID" style="width:180px">
                        <button class="add-btn" onclick="lookupWarnings()">Filter</button>
                        <button class="btn-secondary" onclick="loadAllWarnings()">Show All</button>
                    </div>
                </div>
                <table class="data-table">
                    <thead><tr><th>User</th><th>Reason</th><th>Issued By</th><th>Time</th></tr></thead>
                    <tbody id="warnings-body"><tr><td colspan="4" class="table-loading">No events</td></tr></tbody>
                </table>
            </div>`;
        loadAllWarnings();
    }

    if (tab === 'Audit Log') {
        el.innerHTML = `
            <div class="card">
                <table class="data-table">
                    <thead><tr><th>Event</th><th>Target</th><th>By</th><th>Time</th></tr></thead>
                    <tbody>
                        <tr><td colspan="4" class="table-loading">No audit events yet</td></tr>
                    </tbody>
                </table>
            </div>`;
    }
}

// REF-APP-45
async function loadModLog() {
    if (!State.guildId) return;
    try {
        const logs     = await apiGet(`/api/logs/${State.guildId}?limit=50`);
        const body     = document.getElementById('modlog-body');
        const badgeMap = {
            'SPAM DETECTED': 'badge-spam',
            'WARN ISSUED':   'badge-warn',
            'BAD WORD':      'badge-warn',
            'CAPS FILTER':   'badge-caps',
            'RAID DETECTED': 'badge-raid',
            'MASS MENTION':  'badge-spam',
            'INVITE LINK':   'badge-spam',
        };
        if (!logs.length) {
            body.innerHTML = `<tr><td colspan="5" class="table-loading">No actions logged</td></tr>`;
            return;
        }
        body.innerHTML = logs.map(l => `
            <tr>
                <td><span class="badge ${badgeMap[l.action] || 'badge-caps'}">${l.action}</span></td>
                <td>${l.target_tag || l.target_id || '—'}</td>
                <td>${l.moderator || '—'}</td>
                <td>${(l.reason || '—').replace(/\*\*/g, '').replace(/`/g, '')}</td>
                <td>${new Date(l.created_at).toLocaleString()}</td>
            </tr>`).join('');
    } catch(e) { console.error(e); }
}

// REF-APP-46
async function lookupWarnings() {
    const userId = document.getElementById('warn-lookup').value.trim();
    if (!userId || !State.guildId) return;
    try {
        const warnings = await apiGet(`/api/warnings/${State.guildId}/${userId}`);
        const body     = document.getElementById('warnings-body');
        if (!warnings.length) {
            body.innerHTML = `<tr><td colspan="4" class="table-loading">No warnings found</td></tr>`;
            return;
        }
        body.innerHTML = warnings.map(w => `
            <tr>
                <td>${w.user_tag}</td>
                <td>${w.reason || '—'}</td>
                <td>${w.issued_by || '—'}</td>
                <td>${new Date(w.issued_at).toLocaleString()}</td>
            </tr>`).join('');
    } catch(e) { toast('Lookup failed', 'error'); }
}

// REF-APP-46a
async function loadAllWarnings() {
    if (!State.guildId) return;
    try {
        const warnings = await apiGet(`/api/warnings/${State.guildId}`);
        const body     = document.getElementById('warnings-body');
        if (!warnings.length) {
            body.innerHTML = `<tr><td colspan="4" class="table-loading">No warnings found</td></tr>`;
            return;
        }
        body.innerHTML = warnings.map(w => `
            <tr>
                <td>${w.user_tag}</td>
                <td>${w.reason || '—'}</td>
                <td>${w.issued_by || '—'}</td>
                <td>${new Date(w.issued_at).toLocaleString()}</td>
            </tr>`).join('');
    } catch(e) { console.error(e); }
}

// === WELCOME & ROLES ===
// REF-APP-47
function renderWelcome(tab) {
    const el = document.getElementById('content');
    const c  = State.config;

    if (tab === 'Welcome Message') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Welcome Message</div></div>
                <div class="settings-row">
                    <div class="settings-label">Enabled</div>
                    <label class="toggle">
                        <input type="checkbox" id="welcome_enabled" ${c.welcome_enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="settings-row">
                    <div class="settings-label">Channel ID</div>
                    <input class="settings-input" id="welcome_channel_id" value="${c.welcome_channel_id || ''}" placeholder="Channel ID">
                </div>
                <div class="settings-row">
                    <div class="settings-label">Message</div>
                    <input class="settings-input" id="welcome_message" value="${c.welcome_message || 'Welcome to {server}, {user}!'}" placeholder="{user} {server}">
                </div>
            </div>`;
    }

    if (tab === 'Auto Role') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Auto Role</div></div>
                <div class="settings-row">
                    <div class="settings-label">Enabled</div>
                    <label class="toggle">
                        <input type="checkbox" id="autorole_enabled" ${c.autorole_enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="settings-row">
                    <div class="settings-label">Role ID</div>
                    <input class="settings-input" id="autorole_id" value="${c.autorole_id || ''}" placeholder="Role ID">
                </div>
            </div>`;
    }
}

// REF-APP-48
async function saveWelcome() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const keys    = ['welcome_enabled','welcome_channel_id','welcome_message','autorole_enabled','autorole_id'];
    const updates = {};
    keys.forEach(k => {
        const el = document.getElementById(k);
        if (!el) return;
        updates[k] = el.type === 'checkbox' ? el.checked : el.value;
    });
    try {
        await apiPut(`/api/config/${State.guildId}`, updates);
        Object.assign(State.config, updates);
        toast('Saved');
    } catch(e) { toast('Failed to save', 'error'); }
}


// === USERS (OWNER ONLY) ===
// REF-APP-49
function renderUsers() {
    const el = document.getElementById('content');
    el.innerHTML = `
        <div class="card">
            <table class="data-table">
                <thead><tr><th>User</th><th>Role</th><th>Discord ID</th><th>Last Login</th><th></th></tr></thead>
                <tbody id="users-body">
                    <tr><td colspan="5" class="table-loading">No events</td></tr>
                </tbody>
            </table>
        </div>
        <div class="card" id="add-user-card">
            <div class="card-header"><div class="card-title">Add Admin</div></div>
            <div class="settings-row">
                <div class="settings-label">Username</div>
                <input class="settings-input" id="new-username" placeholder="Username">
            </div>
            <div class="settings-row">
                <div class="settings-label">Password</div>
                <input class="settings-input" type="password" id="new-password" placeholder="Min 8 characters">
            </div>
            <div class="settings-row">
                <div class="settings-label">Discord ID</div>
                <input class="settings-input" id="new-discord" placeholder="Optional">
            </div>
            <div class="card-footer">
                <button class="btn-primary" onclick="createAdminUser()">Create Admin</button>
            </div>
        </div>`;
    loadUsers();
}

// REF-APP-50
async function loadUsers() {
    try {
        const res   = await fetch(`${window.PENNY_API_URL}/auth/users`, {
            headers: { 'Authorization': `Bearer ${State.token}` }
        });
        const users = await res.json();
        const body  = document.getElementById('users-body');
        body.innerHTML = users.map(u => `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-table-avatar">${u.username[0].toUpperCase()}</div>
                        <span>${u.username}</span>
                    </div>
                </td>
                <td><span class="badge ${u.role === 'owner' ? 'badge-owner' : 'badge-admin'}">${u.role}</span></td>
                <td>${u.discord_id || '—'}</td>
                <td>${u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                <td>
                    ${u.id !== State.user?.id ? `
                        <div style="display:flex;gap:6px">
                            <button class="action-pill" onclick="toggleUserRole(${u.id},'${u.role}')">
                                ${u.role === 'admin' ? 'Make Owner' : 'Make Admin'}
                            </button>
                            <button class="btn-danger" style="font-size:12px;padding:5px 12px" onclick="deleteUser(${u.id})">Remove</button>
                        </div>` 
                    : '<span style="color:var(--text3);font-size:12px">You</span>'}
                </td>
            </tr>`).join('');
    } catch(e) { console.error(e); }
}

// REF-APP-50a
async function toggleUserRole(id, currentRole) {
    const newRole = currentRole === 'admin' ? 'owner' : 'admin';
    if (!confirm(`Change this user to ${newRole}?`)) return;
    try {
        await fetch(`${window.PENNY_API_URL}/auth/users/${id}/role`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.token}` },
            body:    JSON.stringify({ role: newRole }),
        });
        toast(`Role updated to ${newRole}`);
        loadUsers();
    } catch(e) { toast('Failed', 'error'); }
}

// REF-APP-51
async function createAdminUser() {
    const username   = document.getElementById('new-username').value.trim();
    const password   = document.getElementById('new-password').value;
    const discord_id = document.getElementById('new-discord').value.trim();

    if (!username || !password) { toast('Username and password required', 'error'); return; }
    if (password.length < 8)   { toast('Password must be 8+ characters', 'error'); return; }

    try {
        await fetch(`${window.PENNY_API_URL}/auth/users`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.token}` },
            body:    JSON.stringify({ username, password, discord_id: discord_id || undefined }),
        });
        document.getElementById('new-username').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('new-discord').value  = '';
        toast(`${username} created`);
        loadUsers();
    } catch(e) { toast('Failed', 'error'); }
}

// REF-APP-52
function showAddUserForm() {
    document.getElementById('add-user-card')?.scrollIntoView({ behavior: 'smooth' });
}

// REF-APP-53
async function deleteUser(id) {
    if (!confirm('Remove this user?')) return;
    try {
        await fetch(`${window.PENNY_API_URL}/auth/users/${id}`, {
            method:  'DELETE',
            headers: { 'Authorization': `Bearer ${State.token}` },
        });
        toast('User removed');
        loadUsers();
    } catch(e) { toast('Failed', 'error'); }
}

// === AUDIT LOG ===
// REF-APP-44a
function renderAuditLog(tab) {
    const el = document.getElementById('content');

    if (tab === 'Events') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Audit Events</div>
                    <div style="display:flex;gap:8px">
                        <select class="guild-select" id="audit-category" onchange="filterAuditLog()" style="font-size:12px">
                            <option value="">All Categories</option>
                            <option value="messages">Messages</option>
                            <option value="members">Members</option>
                            <option value="server">Server</option>
                            <option value="voice">Voice</option>
                        </select>
                    </div>
                </div>
                <table class="data-table">
                    <thead><tr><th>Event</th><th>Category</th><th>Target</th><th>Moderator</th><th>Detail</th><th>Time</th></tr></thead>
                    <tbody id="audit-body"><tr><td colspan="5" class="table-loading">No events</td></tr></tbody>
                </table>
            </div>`;
        loadAuditLog();
    }

    if (tab === 'Settings') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Audit Channel</div></div>
                <div class="settings-row">
                    <div class="settings-label">Default Audit Channel</div>
                    <input class="settings-input" id="audit_channel_id" placeholder="Channel ID">
                </div>
                <div class="card-footer">
                    <button class="btn-primary" onclick="saveAuditSettings()">Save</button>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">Message Events</div></div>
                ${auditToggle('audit_messages',      'Message Deleted')}
                ${auditToggle('audit_messages_edit', 'Message Edited')}
                ${auditToggle('audit_messages_bulk', 'Bulk Message Delete')}
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">Member Events</div></div>
                ${auditToggle('audit_members',         'Member Joined')}
                ${auditToggle('audit_members_leave',   'Member Left')}
                ${auditToggle('audit_members_roles',   'Role Added / Removed')}
                ${auditToggle('audit_members_nick',    'Nickname Changed')}
                ${auditToggle('audit_members_ban',     'Member Banned')}
                ${auditToggle('audit_members_unban',   'Member Unbanned')}
                ${auditToggle('audit_members_kick',    'Member Kicked')}
                ${auditToggle('audit_members_timeout', 'Member Timed Out')}
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">Server Events</div></div>
                ${auditToggle('audit_server_channel', 'Channel Created / Deleted / Updated')}
                ${auditToggle('audit_server_role',    'Role Created / Deleted / Updated')}
                ${auditToggle('audit_server_emoji',   'Emoji Created / Deleted')}
                ${auditToggle('audit_server_webhook', 'Webhook Updated')}
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">Voice Events</div></div>
                ${auditToggle('audit_voice', 'Voice Join / Leave / Move')}
            </div>`;
        loadAuditSettings();
    }
}

// REF-APP-44b
function auditToggle(key, label) {
    const checked = State.config[key] ? 'checked' : '';
    return `
        <div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">${label}</div></div>
            <div class="toggle-right">
                <label class="toggle">
                    <input type="checkbox" ${checked} onchange="toggleAudit('${key}', this.checked)">
                    <span class="slider"></span>
                </label>
            </div>
        </div>`;
}

// REF-APP-44c
async function loadAuditLog(category = null) {
    if (!State.guildId) return;
    try {
        const url  = `/api/audit/${State.guildId}?limit=100${category ? '&category=' + category : ''}`;
        const logs = await apiGet(url);
        const body = document.getElementById('audit-body');
        const colorMap = { messages: 'badge-warn', members: 'badge-join', server: 'badge-caps', voice: 'badge-admin' };
        if (!logs.length) {
            body.innerHTML = `<tr><td colspan="5" class="table-loading">No audit events yet</td></tr>`;
            return;
        }
        body.innerHTML = logs.map(l => `
            <tr>
                <td><span class="badge ${colorMap[l.category] || 'badge-caps'}">${l.event}</span></td>
                <td>${l.category}</td>
                <td>${l.target_tag || '—'}</td>
                <td>${l.moderator || '—'}</td>
                <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(l.detail || '—').replace(/\*\*/g, '').replace(/`/g, '')}</td>
                <td>${new Date(l.created_at).toLocaleString()}</td>
            </tr>`).join('');
    } catch(e) { console.error(e); }
}

// REF-APP-44d
function filterAuditLog() {
    const category = document.getElementById('audit-category').value;
    loadAuditLog(category || null);
}

// REF-APP-44e
async function loadAuditSettings() {
    if (!State.guildId) return;
    const channelInput = document.getElementById('audit_channel_id');
    if (channelInput) channelInput.value = State.config.audit_channel_id || '';
}

// REF-APP-44f
async function toggleAudit(key, value) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    try {
        await apiPatch(`/api/config/${State.guildId}`, { key, value });
        State.config[key] = value;
        toast(value ? 'Enabled' : 'Disabled');
    } catch(e) { toast('Failed to save', 'error'); }
}

// REF-APP-44g
async function saveAuditSettings() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const updates = {
        audit_channel_id: document.getElementById('audit_channel_id').value.trim(),
    };
    try {
        await apiPut(`/api/config/${State.guildId}`, updates);
        Object.assign(State.config, updates);
        toast('Saved');
    } catch(e) { toast('Failed to save', 'error'); }
}

// === SETTINGS ===
// REF-APP-54
function renderSettings(tab) {
    const el = document.getElementById('content');
    const c  = State.config;

    if (tab === 'General') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">General</div></div>
                <div class="settings-row">
                    <div class="settings-label">Test Mode</div>
                    <label class="toggle">
                        <input type="checkbox" id="test_mode" ${c.test_mode ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="settings-row">
                    <div class="settings-label">Log Channel ID</div>
                    <input class="settings-input" id="log_channel_id" value="${c.log_channel_id || ''}" placeholder="Channel ID">
                </div>
                <div class="settings-row">
                    <div class="settings-label">Immune Role ID</div>
                    <input class="settings-input" id="immune_role_id" value="${c.immune_role_id || ''}" placeholder="Role ID">
                </div>
                <div class="settings-row">
                    <div class="settings-label">Max Warnings</div>
                    <input class="settings-input" type="number" id="max_warnings" value="${c.max_warnings || 3}" style="width:80px">
                </div>
                <div class="card-footer">
                    <button class="btn-primary" onclick="saveGeneral()">Save</button>
                </div>
            </div>`;
    }

    if (tab === 'Appearance') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Appearance</div></div>
                <div class="settings-row">
                    <div class="settings-label">Theme</div>
                    <div class="theme-row">
                        <div class="theme-opt active" onclick="setTheme(this,'light')">Light</div>
                        <div class="theme-opt" onclick="setTheme(this,'slate')">Slate</div>
                        <div class="theme-opt" onclick="setTheme(this,'dark')">Dark</div>
                    </div>
                </div>
                <div class="settings-row">
                    <div class="settings-label">Accent</div>
                    <div class="swatch-row">
                        <div class="swatch active" style="background:#1d4ed8" onclick="setAccent(this,'#1d4ed8','#eff6ff','#bfdbfe')"></div>
                        <div class="swatch" style="background:#059669" onclick="setAccent(this,'#059669','#ecfdf5','#a7f3d0')"></div>
                        <div class="swatch" style="background:#7c3aed" onclick="setAccent(this,'#7c3aed','#f5f3ff','#ddd6fe')"></div>
                        <div class="swatch" style="background:#dc2626" onclick="setAccent(this,'#dc2626','#fef2f2','#fecaca')"></div>
                        <div class="swatch" style="background:#d97706" onclick="setAccent(this,'#d97706','#fffbeb','#fde68a')"></div>
                        <div class="swatch" style="background:#0891b2" onclick="setAccent(this,'#0891b2','#ecfeff','#a5f3fc')"></div>
                    </div>
                </div>
                <div class="settings-row">
                    <div class="settings-label">Avatar</div>
                    <input type="file" id="avatar-upload" accept="image/*" onchange="uploadAvatar(this)" style="font-size:13px">
                </div>
                <div class="settings-row">
                    <div class="settings-label">Page Title</div>
                    <input class="settings-input" id="dash-title" value="${document.title}">
                </div>
                <div class="card-footer">
                    <button class="btn-primary" onclick="saveAppearance()">Save</button>
                </div>
            </div>`;
    }

    if (tab === 'Danger Zone') {
        el.innerHTML = `
            <div class="card" style="border-color:#fecaca">
                <div class="danger-header">
                    <div class="danger-title">Irreversible Actions</div>
                </div>
                <div class="settings-row">
                    <div class="settings-label">Reset Config</div>
                    <button class="btn-danger" onclick="dangerResetConfig()">Reset</button>
                </div>
                <div class="settings-row">
                    <div class="settings-label">Clear Mod Logs</div>
                    <button class="btn-danger" onclick="dangerClearLogs()">Clear</button>
                </div>
                <div class="settings-row">
                    <div class="settings-label">Clear Warnings</div>
                    <button class="btn-danger" onclick="dangerClearWarnings()">Clear</button>
                </div>
            </div>`;
    }
}

// REF-APP-55
async function saveGeneral() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const updates = {
        test_mode:      document.getElementById('test_mode').checked,
        log_channel_id: document.getElementById('log_channel_id').value.trim(),
        immune_role_id: document.getElementById('immune_role_id').value.trim(),
        max_warnings:   parseInt(document.getElementById('max_warnings').value),
    };
    try {
        await apiPut(`/api/config/${State.guildId}`, updates);
        Object.assign(State.config, updates);
        const badge = document.getElementById('test-badge');
        updates.test_mode ? badge.classList.remove('hidden') : badge.classList.add('hidden');
        toast('Saved');
    } catch(e) { toast('Failed to save', 'error'); }
}


// ============================================================
// APPEARANCE
// ============================================================

// REF-APP-56
function setTheme(el, theme) {
    document.querySelectorAll('.theme-opt').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    applyTheme(theme);
    localStorage.setItem('penny_theme', theme);
}

// REF-APP-57
function applyTheme(theme) {
    const r = document.documentElement;
    if (theme === 'dark') {
        r.style.setProperty('--bg',       '#0f172a');
        r.style.setProperty('--surface',  '#1e293b');
        r.style.setProperty('--surface2', '#273344');
        r.style.setProperty('--text',     '#f1f5f9');
        r.style.setProperty('--text2',    '#94a3b8');
        r.style.setProperty('--text3',    '#64748b');
        r.style.setProperty('--border',   '#334155');
        r.style.setProperty('--border2',  '#475569');
    } else if (theme === 'slate') {
        r.style.setProperty('--bg',       '#e8edf4');
        r.style.setProperty('--surface',  '#f4f7fb');
        r.style.setProperty('--surface2', '#edf1f7');
        r.style.setProperty('--text',     '#1e293b');
        r.style.setProperty('--text2',    '#64748b');
        r.style.setProperty('--text3',    '#94a3b8');
        r.style.setProperty('--border',   '#d0dae8');
        r.style.setProperty('--border2',  '#c0ccdc');
    } else {
        r.style.setProperty('--bg',       '#f3f4f6');
        r.style.setProperty('--surface',  '#ffffff');
        r.style.setProperty('--surface2', '#f8fafc');
        r.style.setProperty('--text',     '#111827');
        r.style.setProperty('--text2',    '#6b7280');
        r.style.setProperty('--text3',    '#9ca3af');
        r.style.setProperty('--border',   '#e5e7eb');
        r.style.setProperty('--border2',  '#d1d5db');
    }
}

// REF-APP-58
function setAccent(el, color, bgLight, border) {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    document.documentElement.style.setProperty('--accent',        color);
    document.documentElement.style.setProperty('--accent-hover',  color);
    document.documentElement.style.setProperty('--accent-light',  bgLight);
    document.documentElement.style.setProperty('--accent-border', border);
    localStorage.setItem('penny_accent', JSON.stringify({ color, bgLight, border }));
}

// REF-APP-59
function uploadAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        localStorage.setItem('penny_avatar', e.target.result);
        applyAvatar(e.target.result);
        toast('Avatar updated');
    };
    reader.readAsDataURL(file);
}

// REF-APP-60
function applyAvatar(src) {
    const nav   = document.getElementById('nav-avatar');
    const login = document.getElementById('login-avatar');
    if (nav)   nav.innerHTML   = `<img src="${src}" alt="Penny">`;
    if (login) login.innerHTML = `<img src="${src}" alt="Penny">`;
}

// REF-APP-61
function saveAppearance() {
    const title = document.getElementById('dash-title')?.value;
    if (title) { document.title = title; localStorage.setItem('penny_title', title); }
    toast('Saved');
}

// REF-APP-62
function restoreAppearance() {
    const theme  = localStorage.getItem('penny_theme');
    const accent = localStorage.getItem('penny_accent');
    const avatar = localStorage.getItem('penny_avatar');
    const title  = localStorage.getItem('penny_title');
    if (theme)  applyTheme(theme);
    if (accent) {
        const a = JSON.parse(accent);
        document.documentElement.style.setProperty('--accent',        a.color);
        document.documentElement.style.setProperty('--accent-hover',  a.color);
        document.documentElement.style.setProperty('--accent-light',  a.bgLight);
        document.documentElement.style.setProperty('--accent-border', a.border);
    }
    if (avatar) applyAvatar(avatar);
    if (title)  document.title = title;
}


// ============================================================
// DANGER ZONE
// ============================================================

// REF-APP-63
function dangerResetConfig()   { if (confirm('Reset ALL config? Cannot be undone.'))   toast('Coming soon', 'error'); }
function dangerClearLogs()     { if (confirm('Clear ALL mod logs? Cannot be undone.')) toast('Coming soon', 'error'); }
function dangerClearWarnings() { if (confirm('Clear ALL warnings? Cannot be undone.')) toast('Coming soon', 'error'); }
