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
    theme:   'light',
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
    State.theme = user.theme || 'light';
}

// REF-APP-05
function loadSession() {
    const token = localStorage.getItem('penny_token');
    const user  = localStorage.getItem('penny_user');
    if (token && user) {
        State.token = token;
        State.user  = JSON.parse(user);
        State.theme = State.user.theme || 'light';
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

    applyTheme(State.theme);

    const isOwner = State.user?.role === 'owner';
    document.querySelectorAll('.owner-only').forEach(el => {
        el.style.display = isOwner ? '' : 'none';
    });

    const initials = (State.user?.username || '?')[0].toUpperCase();
    document.getElementById('sb-user-avatar').textContent = initials;
    document.getElementById('sb-user-name').textContent   = State.user?.username || '';
    document.getElementById('sb-user-role').textContent   = State.user?.role     || '';

    checkPennyStatus();
    loadGuilds();
    const savedSection = localStorage.getItem('penny_section') || 'overview';
    setTimeout(() => setSection(savedSection), 100);
}
// ============================================================
// GUILD MANAGEMENT
// ============================================================

// REF-APP-12a
async function loadGuilds() {
    try {
        const guilds = await apiGet('/api/guilds');
        const select = document.getElementById('guild-select');
        select.innerHTML = '<option value="">Select server</option>';
        guilds.forEach(g => {
            const opt       = document.createElement('option');
            opt.value       = g.id;
            opt.textContent = g.name;
            select.appendChild(opt);
        });

        const savedGuild = localStorage.getItem('penny_guild');
                if (savedGuild) {
                    select.value  = savedGuild;
                    State.guildId = savedGuild;
                    const guild   = guilds.find(g => g.id === savedGuild);
                    if (guild) updateServerIcon(guild.name);
                    await loadGuildConfig();
                    renderContent();
                }
    } catch(e) { console.error(e); }
}

function updateServerIcon(name) {
    const icon = document.getElementById('sb-server-icon');
    if (icon) icon.textContent = name ? name[0].toUpperCase() : '?';
}

// REF-APP-13
function selectGuild(guildId) {
    State.guildId = guildId;
    localStorage.setItem('penny_guild', guildId);
    const select = document.getElementById('guild-select');
    const opt    = select.options[select.selectedIndex];
    if (opt) updateServerIcon(opt.textContent);
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
        const dot  = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        if (res.ok) {
            dot?.classList.remove('offline');
            if (text) text.textContent = 'Penny online';
        } else {
            dot?.classList.add('offline');
            if (text) text.textContent = 'Penny offline';
        }
    } catch {
        document.getElementById('status-dot')?.classList.add('offline');
        const text = document.getElementById('status-text');
        if (text) text.textContent = 'Penny offline';
    }
}


// ============================================================
// NAVIGATION
// ============================================================

// === SECTION DEFINITIONS ===
// REF-APP-16
const SECTIONS = {
    overview:     { label: 'Dashboard',          tabs: ['Summary', 'Activity'],                     render: renderOverview   },
    security:     { label: 'Auto-Mod',           tabs: ['Modules', 'Thresholds', 'Bad Words'],      render: renderSecurity   },
    secoverview:  { label: 'Security Overview',  tabs: ['Overview'],                                render: renderSecOverview  },
    secspam:      { label: 'Spam Detection',     tabs: ['Settings', 'Exemptions'],                  render: renderSecSpam      },
    secraid:      { label: 'Anti-Raid',          tabs: ['Settings', 'Exemptions'],                  render: renderSecRaid      },
    secbadwords:  { label: 'Bad Word Filter',    tabs: ['Settings', 'Word List', 'Exemptions'],     render: renderSecBadWords  },
    seccaps:      { label: 'Caps Filter',        tabs: ['Settings', 'Exemptions'],                  render: renderSecCaps      },
    secmention:   { label: 'Mass Mention',       tabs: ['Settings', 'Exemptions'],                  render: renderSecMention   },
    secinvite:    { label: 'Anti-Invite Links',  tabs: ['Settings', 'Exemptions'],                  render: renderSecInvite    },
    secage:       { label: 'Account Age Gate',   tabs: ['Settings', 'Exemptions'],                  render: renderSecAge       },
    secantilink:  { label: 'Anti-Link',          tabs: ['Settings', 'Exemptions'],                  render: renderSecAntiLink  },
    secrepeat:    { label: 'Repeated Text',      tabs: ['Settings', 'Exemptions'],                  render: renderSecRepeat    },
    secemoji:     { label: 'Emoji Spam',         tabs: ['Settings', 'Exemptions'],                  render: renderSecEmoji     },
    secnewline:   { label: 'Newline Spam',       tabs: ['Settings', 'Exemptions'],                  render: renderSecNewline   },
    seczalgo:     { label: 'Zalgo Text',         tabs: ['Settings', 'Exemptions'],                  render: renderSecZalgo     },
    sechoist:     { label: 'Anti-Hoist',         tabs: ['Settings', 'Exemptions'],                  render: renderSecHoist     },
    antinuke:     { label: 'Anti-Nuke',          tabs: ['Settings'],                                render: renderComingSoon   },
    panicmode:    { label: 'Panic Mode',          tabs: ['Settings'],                                render: renderPanicMode     },
    verification: { label: 'Verification',       tabs: ['Settings'],                                render: renderComingSoon   },
    joingate:     { label: 'Join Gate',          tabs: ['Settings'],                                render: renderComingSoon   },
    modlog:       { label: 'Mod Log',            tabs: ['Mod Log'],                                 render: renderModLog     },
    warnings:     { label: 'Warnings',           tabs: ['Warnings'],                                render: renderWarnings   },
    punishments:  { label: 'Punishment Ladder',  tabs: ['Ladder'],                                  render: renderPunishments },
    exemptions:   { label: 'Exemptions',         tabs: ['Roles', 'Users', 'Channels'],              render: renderExemptions },
    auditlog:     { label: 'Audit Log',          tabs: ['Events'],                                  render: renderAuditLog   },
    auditconfig:  { label: 'Audit Settings',     tabs: ['Settings'],                                render: renderAuditConfig},
    leveling:     { label: 'Leveling',           tabs: ['Settings'],                                render: renderComingSoon },
    reactionroles:{ label: 'Reaction Roles',     tabs: ['Roles'],                                   render: renderComingSoon },
    giveaways:    { label: 'Giveaways',          tabs: ['Active'],                                  render: renderComingSoon },
    polls:        { label: 'Polls',              tabs: ['Active'],                                  render: renderComingSoon },
    tickets:      { label: 'Ticketing',          tabs: ['Settings'],                                render: renderComingSoon },
    commands:     { label: 'Custom Commands',    tabs: ['Commands'],                                render: renderComingSoon },
    autoresponder:{ label: 'Auto-Responder',     tabs: ['Triggers'],                                render: renderComingSoon },
    scheduled:    { label: 'Scheduled Messages', tabs: ['Messages'],                                render: renderComingSoon },
    reminders:    { label: 'Reminders',          tabs: ['Active'],                                  render: renderComingSoon },
    afk:          { label: 'AFK Status',         tabs: ['Settings'],                                render: renderComingSoon },
    socials:      { label: 'Social Alerts',      tabs: ['Integrations'],                            render: renderComingSoon },
    welcome:      { label: 'Welcome & Roles',    tabs: ['Welcome Message', 'Auto Role'],            render: renderWelcome    },
    users:        { label: 'Users',              tabs: ['Dashboard Users'],                         render: renderUsers,     ownerOnly: true },
    settings:     { label: 'Settings',           tabs: ['General', 'Appearance', 'Data Management'], render: renderSettings },
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

    document.getElementById('page-title').textContent = def.label || section;
    openGroupForSection(section);

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

    let html = def.tabs.map(t =>
        `<button class="subnav-item${t === State.tab ? ' active' : ''}" data-tab="${t}" onclick="setTab('${t}')">${t}</button>`
    ).join('');

    if (def.action) {
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
    if (res.status === 401) { clearSession(); showLogin(); return; }
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
    if (res.status === 401) { clearSession(); showLogin(); return; }
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
    if (res.status === 401) { clearSession(); showLogin(); return; }
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
    if (res.status === 401) { clearSession(); showLogin(); return; }
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
    if (res.status === 401) { clearSession(); showLogin(); return; }
    if (!res.ok) throw new Error(`DELETE ${path} failed`);
    return res.json();
}


// ============================================================
// THEME
// ============================================================

// REF-APP-64
function applyTheme(theme) {
    State.theme = theme;
    if (theme === 'dark') {
        document.body.classList.add('dark');
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = '☀';
    } else {
        document.body.classList.remove('dark');
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = '☾';
    }
}

async function toggleTheme() {
    const next = State.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    State.user.theme = next;
    localStorage.setItem('penny_user', JSON.stringify(State.user));
    try {
        await fetch(`${window.PENNY_API_URL}/auth/me/theme`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.token}` },
            body:    JSON.stringify({ theme: next }),
        });
    } catch {}
}


// ============================================================
// PANIC MODE
// ============================================================

// REF-APP-65
async function handlePanicMode() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    try {
        const state    = await apiGet(`/api/panic/${State.guildId}`);
        const isActive = state?.active === 1;
        if (isActive) {
            if (!confirm('Deactivate Panic Mode? This will restore all channels.')) return;
            await apiPost(`/api/panic/${State.guildId}/deactivate`, { deactivated_by: State.user?.username });
            toast('Panic Mode deactivated');
        } else {
            if (!confirm('Activate Panic Mode? This will lock ALL channels immediately.')) return;
            await apiPost(`/api/panic/${State.guildId}/activate`, { triggered_by: State.user?.username, channel_snapshot: [] });
            toast('Panic Mode activated', 'error');
        }
    } catch(e) { toast('Failed', 'error'); }
}


// ============================================================
// COMING SOON
// ============================================================

// REF-APP-66
function renderComingSoon() {
    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="empty-state">
                <div class="empty-state-title">Coming soon</div>
                <div style="font-size:13px;color:var(--text3);margin-top:6px">This feature is on the roadmap and will be available in a future update.</div>
            </div>
        </div>`;
}


// ============================================================
// PAGE RENDERERS
// ============================================================


// === OVERVIEW / DASHBOARD ===
// REF-APP-28
function renderOverview(tab) {
    const el = document.getElementById('content');

    if (tab === 'Summary') {
        el.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card blue">
                    <div class="stat-label">Actions Today</div>
                    <div class="stat-value" id="stat-actions">—</div>
                    <div class="stat-trend" id="stat-actions-trend"></div>
                </div>
                <div class="stat-card green">
                    <div class="stat-label">Members</div>
                    <div class="stat-value" id="stat-members">—</div>
                    <div class="stat-trend" id="stat-members-trend"></div>
                </div>
                <div class="stat-card red">
                    <div class="stat-label">Warnings Issued</div>
                    <div class="stat-value" id="stat-warnings">—</div>
                    <div class="stat-trend" id="stat-warnings-trend"></div>
                </div>
                <div class="stat-card gold">
                    <div class="stat-label">Active Bans</div>
                    <div class="stat-value" id="stat-bans">—</div>
                    <div class="stat-trend" id="stat-bans-trend"></div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                <div class="card">
                    <div class="card-header"><div class="card-title">Module status</div></div>
                    <div id="module-status-list">
                        <div class="empty-state"><div class="empty-state-title">No server selected</div></div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">Server health</div>
                            <div class="card-desc">Based on your current configuration</div>
                        </div>
                        <div id="health-badge" style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:var(--green-bg);color:var(--green)"></div>
                    </div>
                    <div style="padding:14px 18px">
                        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:8px">
                            <span class="health-score-val" id="health-score">—</span>
                            <span style="font-size:13px;color:var(--text3)">/100</span>
                        </div>
                        <div class="health-bar"><div class="health-bar-fill" id="health-bar" style="width:0%"></div></div>
                        <div id="health-items"></div>
                    </div>
                </div>
            </div>
            <div class="card" style="margin-top:16px">
                <div class="card-header"><div class="card-title">Recent activity</div></div>
                <div id="activity-feed">
                    <div class="empty-state"><div class="empty-state-title">No server selected</div></div>
                </div>
            </div>`;
        loadOverviewStats();
    }

    if (tab === 'Activity') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Full activity feed</div></div>
                <div id="activity-feed">
                    <div class="empty-state"><div class="empty-state-title">No events</div></div>
                </div>
            </div>`;
        loadActivity();
    }
}

// REF-APP-29
async function loadOverviewStats() {
    if (!State.guildId) return;

    try {
        const config = State.config;

        const modules = [
            { key: 'spam_enabled',        name: 'Anti-Spam'         },
            { key: 'raid_enabled',        name: 'Anti-Raid'         },
            { key: 'badwords_enabled',    name: 'Bad Word Filter'   },
            { key: 'caps_enabled',        name: 'Caps Filter'       },
            { key: 'mass_mention_enabled',name: 'Mass Mention'      },
            { key: 'antilink_enabled',    name: 'Anti-Invite Links' },
            { key: 'accountage_enabled',  name: 'Account Age Gate'  },
            { key: 'antiphishing_enabled',name: 'Anti-Phishing'     },
        ];

        document.getElementById('module-status-list').innerHTML = modules.map(m => {
            const on   = config[m.key];
            const test = on && config.test_mode;
            return `<div class="module-status-row">
                <div class="ms-dot ${on ? 'on' : 'off'}"></div>
                <div class="ms-name">${m.name}</div>
                <span class="ms-badge ${test ? 'ms-test' : on ? 'ms-on' : 'ms-off'}">${test ? 'Test' : on ? 'Active' : 'Off'}</span>
            </div>`;
        }).join('');

        const checks = [
            { label: 'Core modules active',    ok: config.spam_enabled && config.raid_enabled, warn: false },
            { label: 'Log channel configured', ok: !!config.log_channel_id,                   warn: false },
            { label: 'Audit channel set',      ok: !!config.audit_channel_id,                 warn: false },
            { label: 'Verification enabled',   ok: false,                                      warn: true  },
            { label: 'Server backup exists',   ok: false,                                      warn: false },
            { label: 'Test mode is off',       ok: !config.test_mode,                         warn: true  },
        ];

        const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
        document.getElementById('health-score').textContent          = score;
        document.getElementById('health-bar').style.width            = score + '%';
        document.getElementById('health-bar').style.background       = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)';
        document.getElementById('health-badge').textContent          = score >= 70 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
        document.getElementById('health-badge').style.background     = score >= 70 ? 'var(--green-bg)' : score >= 40 ? 'var(--amber-bg)' : 'var(--red-bg)';
        document.getElementById('health-badge').style.color          = score >= 70 ? 'var(--green)'    : score >= 40 ? 'var(--amber)'    : 'var(--red)';

        document.getElementById('health-items').innerHTML = checks.map(c => `
            <div class="health-item">
                <div class="health-dot ${c.ok ? 'ok' : c.warn ? 'warn' : 'bad'}"></div>
                <div class="health-item-label">${c.label}</div>
                <div class="health-item-val">${c.ok ? '✓' : c.warn ? '!' : '✗'}</div>
            </div>`).join('');

        const [logs, warnings, bans] = await Promise.all([
            apiGet(`/api/logs/${State.guildId}?limit=100`),
            apiGet(`/api/warnings/${State.guildId}`),
            apiGet(`/api/bans/${State.guildId}`),
        ]);

        document.getElementById('stat-actions').textContent  = logs?.length || 0;
        document.getElementById('stat-members').textContent  = '—';
        document.getElementById('stat-warnings').textContent = warnings?.length || 0;
        document.getElementById('stat-bans').textContent     = bans?.length || 0;

        const feed     = document.getElementById('activity-feed');
        const colorMap = {
            'SPAM DETECTED': 'var(--red)',
            'WARN ISSUED':   'var(--amber)',
            'RAID DETECTED': '#be185d',
            'BAD WORD':      'var(--amber)',
            'CAPS FILTER':   'var(--blue)',
            'INVITE LINK':   'var(--red)',
            'MASS MENTION':  'var(--red)',
        };

        const recent = logs?.slice(0, 8) || [];
        if (!recent.length) {
            feed.innerHTML = `<div class="empty-state"><div class="empty-state-title">No events logged yet</div></div>`;
        } else {
            feed.innerHTML = recent.map(l => `
                <div class="activity-item">
                    <div class="activity-dot" style="background:${colorMap[l.action] || 'var(--text3)'}"></div>
                    <div>
                        <div class="activity-text"><strong>${l.action}</strong>${l.target_tag ? ' — ' + l.target_tag : ''}${l.reason && !l.target_tag ? ' — ' + l.reason.replace(/\*\*/g,'') : ''}</div>
                        <div class="activity-time">${new Date(l.created_at).toLocaleString()}</div>
                    </div>
                </div>`).join('');
        }

    } catch(e) { console.error(e); }
}

// REF-APP-30
async function loadActivity() {
    if (!State.guildId) return;
    try {
        const logs = await apiGet(`/api/logs/${State.guildId}?limit=100`);
        const feed = document.getElementById('activity-feed');
        const colorMap = {
            'SPAM DETECTED': 'var(--red)',
            'WARN ISSUED':   'var(--amber)',
            'RAID DETECTED': '#be185d',
            'BAD WORD':      'var(--amber)',
            'CAPS FILTER':   'var(--blue)',
            'INVITE LINK':   'var(--red)',
            'MASS MENTION':  'var(--red)',
        };
        if (!logs?.length) {
            feed.innerHTML = `<div class="empty-state"><div class="empty-state-title">No events logged yet</div></div>`;
            return;
        }
        feed.innerHTML = logs.map(l => `
            <div class="activity-item">
                <div class="activity-dot" style="background:${colorMap[l.action] || 'var(--text3)'}"></div>
                <div>
                    <div class="activity-text"><strong>${l.action}</strong>${l.target_tag ? ' — ' + l.target_tag : ''}</div>
                    <div class="activity-time">${new Date(l.created_at).toLocaleString()}</div>
                </div>
            </div>`).join('');
    } catch(e) { console.error(e); }
}


// REF-APP-31a
function renderSecurity(tab) { renderProtection(tab); }

// REF-APP-44h
function renderModLog() {
    const el = document.getElementById('content');
    el.innerHTML = `
        <div class="card">
            <table class="data-table">
                <thead><tr><th>Event</th><th>Target</th><th>Moderator</th><th>Reason</th><th>Time</th></tr></thead>
                <tbody id="modlog-body">
                    <tr><td colspan="5" class="table-loading">Loading...</td></tr>
                </tbody>
            </table>
        </div>`;
    loadModLog();
}

// REF-APP-44i
function renderWarnings() {
    const el = document.getElementById('content');
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
                <tbody id="warnings-body"><tr><td colspan="4" class="table-loading">Loading...</td></tr></tbody>
            </table>
        </div>`;
    loadAllWarnings();
}

// REF-APP-44j
function renderAuditConfig() { renderAuditLog('Settings'); }

// === PUNISHMENT LADDER ===
// REF-APP-69
async function renderPunishments() {
    const el = document.getElementById('content');
    el.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div>
                    <div class="card-title">Punishment Ladder</div>
                    <div class="card-desc">Define escalating punishments based on warning count. Each step triggers when a user reaches that warning number.</div>
                </div>
                <button class="btn-primary" onclick="addLadderStep()">Add Step</button>
            </div>
            <div id="ladder-steps">
                <div class="empty-state"><div class="empty-state-title">Loading...</div></div>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><div class="card-title">Ladder Settings</div></div>
            <div class="settings-row">
                <div>
                    <div class="settings-label">Reset warnings after kick</div>
                    <div style="font-size:12px;color:var(--text3)">Warning count goes to 0 when a user is kicked</div>
                </div>
                <label class="toggle">
                    <input type="checkbox" id="reset_on_kick" onchange="savePunishmentSettings()">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="settings-row">
                <div>
                    <div class="settings-label">Reset warnings after ban</div>
                    <div style="font-size:12px;color:var(--text3)">Warning count goes to 0 when a user is banned</div>
                </div>
                <label class="toggle">
                    <input type="checkbox" id="reset_on_ban" onchange="savePunishmentSettings()">
                    <span class="slider"></span>
                </label>
            </div>
        </div>`;

    await loadLadder();
    await loadPunishmentSettings();
}

async function loadLadder() {
    if (!State.guildId) {
        document.getElementById('ladder-steps').innerHTML =
            `<div class="empty-state"><div class="empty-state-title">No server selected</div></div>`;
        return;
    }
    try {
        const steps = await apiGet(`/api/ladder/${State.guildId}`);
        renderLadderSteps(steps);
    } catch(e) { console.error(e); }
}

function renderLadderSteps(steps) {
    const el = document.getElementById('ladder-steps');
    if (!steps.length) {
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-title">No steps configured</div>
                <div style="font-size:13px;color:var(--text3);margin-top:6px">Click "Add Step" to build your ladder</div>
            </div>`;
        return;
    }

    el.innerHTML = steps.map(s => `
        <div class="ladder-step" id="step-${s.step}">
            <div class="ladder-step-num">Warning ${s.step}</div>
            <div class="ladder-step-body">
                <div class="ladder-row">
                    <div class="thr-label">Action</div>
                    <select class="settings-input" style="width:140px" onchange="updateLadderStep(${s.step}, this)" data-field="action">
                        <option value="dm"      ${s.action==='dm'      ? 'selected':''}>DM Only</option>
                        <option value="mute"    ${s.action==='mute'    ? 'selected':''}>Mute</option>
                        <option value="kick"    ${s.action==='kick'    ? 'selected':''}>Kick</option>
                        <option value="tempban" ${s.action==='tempban' ? 'selected':''}>Temp Ban</option>
                        <option value="ban"     ${s.action==='ban'     ? 'selected':''}>Permanent Ban</option>
                    </select>
                </div>
                <div class="ladder-row" id="duration-row-${s.step}" style="${['mute','tempban'].includes(s.action) ? '' : 'display:none'}">
                    <div class="thr-label">Duration</div>
                    <input class="thr-input" type="number" value="${s.duration || 1}" min="1" id="duration-${s.step}" style="width:70px">
                    <select class="settings-input" style="width:110px" id="duration-unit-${s.step}">
                        <option value="minutes" ${s.duration_unit==='minutes' ? 'selected':''}>Minutes</option>
                        <option value="hours"   ${s.duration_unit==='hours'   ? 'selected':''}>Hours</option>
                        <option value="days"    ${s.duration_unit==='days'    ? 'selected':''}>Days</option>
                    </select>
                </div>
                <div class="ladder-row">
                    <div class="thr-label">Custom DM</div>
                    <input class="settings-input" style="width:280px" placeholder="Leave blank for default warning message" value="${s.custom_dm || ''}" id="custom-dm-${s.step}">
                </div>
                <div class="ladder-row">
                    <div class="thr-label">Reset warnings after this step</div>
                    <label class="toggle">
                        <input type="checkbox" id="reset-after-${s.step}" ${s.reset_after ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            <div class="ladder-step-actions">
                <button class="btn-primary" style="font-size:12px;padding:6px 12px" onclick="saveLadderStep(${s.step})">Save</button>
                <button class="btn-danger" style="font-size:12px;padding:6px 12px" onclick="deleteLadderStep(${s.step})">Remove</button>
            </div>
        </div>`).join('');
}

async function addLadderStep() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    try {
        const steps = await apiGet(`/api/ladder/${State.guildId}`);
        const nextStep = steps.length ? Math.max(...steps.map(s => s.step)) + 1 : 1;
        await apiPost(`/api/ladder/${State.guildId}`, {
            step: nextStep, action: 'dm',
        });
        await loadLadder();
        toast(`Step ${nextStep} added`);
    } catch(e) { toast('Failed', 'error'); }
}

async function saveLadderStep(step) {
    if (!State.guildId) return;
    try {
        await apiPost(`/api/ladder/${State.guildId}`, {
            step,
            action:        document.getElementById(`action-select-${step}`)?.value || document.querySelector(`#step-${step} select`)?.value || 'dm',
            duration:      parseInt(document.getElementById(`duration-${step}`)?.value) || null,
            duration_unit: document.getElementById(`duration-unit-${step}`)?.value || null,
            custom_dm:     document.getElementById(`custom-dm-${step}`)?.value || null,
            reset_after:   document.getElementById(`reset-after-${step}`)?.checked || false,
        });
        toast(`Step ${step} saved`);
    } catch(e) { toast('Failed to save', 'error'); }
}

async function deleteLadderStep(step) {
    if (!State.guildId) return;
    if (!confirm(`Remove warning ${step} from the ladder?`)) return;
    try {
        await apiDelete(`/api/ladder/${State.guildId}/${step}`);
        await loadLadder();
        toast(`Step ${step} removed`);
    } catch(e) { toast('Failed', 'error'); }
}

function updateLadderStep(step, select) {
    const durationRow = document.getElementById(`duration-row-${step}`);
    if (durationRow) {
        durationRow.style.display = ['mute','tempban'].includes(select.value) ? '' : 'none';
    }
}

async function loadPunishmentSettings() {
    if (!State.guildId) return;
    try {
        const s = await apiGet(`/api/punishment-settings/${State.guildId}`);
        document.getElementById('reset_on_kick').checked = !!s.reset_on_kick;
        document.getElementById('reset_on_ban').checked  = !!s.reset_on_ban;
    } catch(e) { console.error(e); }
}

async function savePunishmentSettings() {
    if (!State.guildId) return;
    try {
        await apiPost(`/api/punishment-settings/${State.guildId}`, {
            reset_on_kick: document.getElementById('reset_on_kick').checked,
            reset_on_ban:  document.getElementById('reset_on_ban').checked,
            per_module:    false,
        });
        toast('Settings saved');
    } catch(e) { toast('Failed', 'error'); }
}

// === PROTECTION (Security) ===
// REF-APP-31
function renderProtection(tab) {
    const el = document.getElementById('content');
    const c  = State.config;

    if (tab === 'Modules') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Modules</div></div>
                ${moduleRow('spam_enabled',        'Spam Detection',    'spam_action',         c)}
                ${moduleRow('raid_enabled',        'Anti-Raid',         'raid_action',         c)}
                ${moduleRow('badwords_enabled',    'Bad Word Filter',   'badwords_action',     c)}
                ${moduleRow('caps_enabled',        'Caps Lock Filter',  'caps_action',         c)}
                ${moduleRow('mass_mention_enabled','Mass Mention',      'mass_mention_action', c)}
                ${moduleRow('antilink_enabled',    'Anti-Invite Links', 'antilink_action',     c)}
                ${moduleRow('accountage_enabled',  'Account Age Gate',  null,                  c)}
                ${moduleRow('antiphishing_enabled','Anti-Phishing',     null,                  c)}
            </div>`;
    }

    if (tab === 'Thresholds') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Thresholds</div></div>
                ${thrRow('spam_max_messages',   'Spam (max messages)',      c.spam_max_messages   || 5,     'messages')}
                ${thrRow('spam_window_ms',      'Spam (window)',            c.spam_window_ms      || 5000,  'ms')}
                ${thrRow('raid_max_joins',      'Raid (max joins)',         c.raid_max_joins      || 5,     'joins')}
                ${thrRow('raid_window_ms',      'Raid (window)',            c.raid_window_ms      || 10000, 'ms')}
                ${thrRow('caps_threshold',      'Caps (threshold)',         c.caps_threshold      || 0.7,   '%')}
                ${thrRow('caps_min_length',     'Caps (min length)',        c.caps_min_length     || 10,    'chars')}
                ${thrRow('mass_mention_max',    'Mass mention (max)',       c.mass_mention_max    || 5,     'mentions')}
                ${thrRow('accountage_min_days', 'Account age (minimum)',    c.accountage_min_days || 7,     'days')}
                ${thrRow('max_warnings',        'Max warnings before kick', c.max_warnings        || 3,     'warnings')}
                <div class="card-footer">
                    <button class="btn-primary" onclick="saveProtection()">Save</button>
                </div>
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
            <div class="toggle-info"><div class="toggle-name">${name}</div></div>
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
        <div style="display:flex;flex-direction:column;gap:4px">
            <div style="font-size:12px;font-weight:500;color:var(--text)">${label}</div>
            <div style="display:flex;align-items:center;gap:8px">
                <input class="thr-input" type="number" value="${value}" data-key="${key}" style="width:90px">
                <div style="font-size:11px;color:var(--text3)">${unit}</div>
            </div>
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
    const inputs  = document.querySelectorAll('.thr-input[data-key]');
    const updates = {};
    inputs.forEach(i => { updates[i.dataset.key] = parseFloat(i.value); });
    try {
        await apiPut(`/api/config/${State.guildId}`, updates);
        Object.assign(State.config, updates);
        toast('Thresholds saved');
    } catch(e) { toast('Failed to save', 'error'); }
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
                <div class="empty-state"><div class="empty-state-title">Loading...</div></div>
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


// === MODERATION (legacy — kept for compatibility) ===
// REF-APP-44
function renderModeration(tab) {
    if (tab === 'Mod Log') renderModLog();
    if (tab === 'Warnings') renderWarnings();
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
                <div class="card-footer">
                    <button class="btn-primary" onclick="saveWelcome()">Save</button>
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
                <div class="card-footer">
                    <button class="btn-primary" onclick="saveWelcome()">Save</button>
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


// === USERS ===
// REF-APP-49
function renderUsers() {
    const el = document.getElementById('content');
    el.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">Dashboard Users</div>
                <div style="display:flex;gap:8px">
                    <button class="btn-secondary" onclick="openEditMyProfileModal()">My Profile</button>
                    <button class="btn-primary" onclick="openCreateUserModal()">Create User</button>
                </div>
            </div>
            <table class="data-table">
                <thead><tr><th>User</th><th>Role</th><th>Discord ID</th><th>Last Login</th><th></th></tr></thead>
                <tbody id="users-body">
                    <tr><td colspan="5" class="table-loading">Loading...</td></tr>
                </tbody>
            </table>
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
                            <button class="action-pill" onclick="openEditUserModal(${u.id},'${u.username}','${u.discord_id||''}')">Edit</button>
                            <button class="action-pill" onclick="toggleUserRole(${u.id},'${u.role}')">
                                ${u.role === 'admin' ? 'Make Owner' : 'Make Admin'}
                            </button>
                            <button class="btn-danger" style="font-size:12px;padding:5px 12px" onclick="deleteUser(${u.id})">Remove</button>
                        </div>`
                    : `<div style="display:flex;gap:6px">
                            <button class="action-pill" onclick="openEditMyProfileModal()">Edit</button>
                            <span style="color:var(--text3);font-size:12px;padding:5px 0">You</span>
                        </div>`}
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

// REF-APP-52a
let _editingUserId = null;

function openEditUser(id, username, discordId) {
    _editingUserId = id;
    document.getElementById('edit-user-title').textContent = `Edit User — ${username}`;
    document.getElementById('edit-username').value = '';
    document.getElementById('edit-password').value = '';
    document.getElementById('edit-discord').value  = discordId || '';
    document.getElementById('edit-user-card').style.display = '';
    document.getElementById('edit-user-card').scrollIntoView({ behavior: 'smooth' });
}

function closeEditUser() {
    _editingUserId = null;
    document.getElementById('edit-user-card').style.display = 'none';
}

async function submitEditUser() {
    if (!_editingUserId) return;
    const username   = document.getElementById('edit-username').value.trim();
    const password   = document.getElementById('edit-password').value;
    const discord_id = document.getElementById('edit-discord').value.trim();
    const body = {};
    if (username)            body.username   = username;
    if (password)            body.password   = password;
    body.discord_id = discord_id || null;
    try {
        const res = await fetch(`${window.PENNY_API_URL}/auth/users/${_editingUserId}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.token}` },
            body:    JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { toast(data.error || 'Failed', 'error'); return; }
        toast('User updated');
        closeEditUser();
        loadUsers();
    } catch(e) { toast('Failed', 'error'); }
}

// REF-APP-52b
async function saveMyProfile() {
    const username   = document.getElementById('me-username').value.trim();
    const password   = document.getElementById('me-password').value;
    const discord_id = document.getElementById('me-discord').value.trim();
    const body = {};
    if (username) body.username   = username;
    if (password) body.password   = password;
    body.discord_id = discord_id || null;
    try {
        const res  = await fetch(`${window.PENNY_API_URL}/auth/me`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.token}` },
            body:    JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { toast(data.error || 'Failed', 'error'); return; }
        if (data.user) {
            State.user = { ...State.user, ...data.user };
            localStorage.setItem('penny_user', JSON.stringify(State.user));
            document.getElementById('sb-user-name').textContent = State.user.username;
        }
        toast('Profile saved');
        document.getElementById('me-username').value = '';
        document.getElementById('me-password').value = '';
    } catch(e) { toast('Failed', 'error'); }
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
                    <select class="settings-input" id="audit-category" onchange="filterAuditLog()" style="width:160px;font-size:12px">
                        <option value="">All Categories</option>
                        <option value="messages">Messages</option>
                        <option value="members">Members</option>
                        <option value="server">Server</option>
                        <option value="voice">Voice</option>
                    </select>
                </div>
                <table class="data-table">
                    <thead><tr><th>Event</th><th>Category</th><th>Target</th><th>Moderator</th><th>Detail</th><th>Time</th></tr></thead>
                    <tbody id="audit-body"><tr><td colspan="6" class="table-loading">Loading...</td></tr></tbody>
                </table>
            </div>`;
        loadAuditLog();
    }

    if (tab === 'Settings') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Audit Channel</div></div>
                <div class="settings-row">
                    <div class="settings-label"> </div>
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
            body.innerHTML = `<tr><td colspan="6" class="table-loading">No audit events yet</td></tr>`;
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

    if (tab === 'Data Management') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Export Data</div>
                        <div class="card-desc">Download all server data as a JSON file</div>
                    </div>
                    <button class="btn-primary" onclick="exportData()">Export</button>
                </div>
            </div>
            <div class="card" style="border-color:#fecaca">
                <div class="danger-header"><div class="danger-title">Danger Zone (*All actions are irreversible*)</div></div>
                <div class="settings-row">
                    <div>
                        <div class="settings-label">Clear Mod Logs</div>
                        <div style="font-size:12px;color:var(--text3)">Permanently deletes all mod log entries for this server</div>
                    </div>
                    <button class="btn-danger" onclick="dangerClear('logs', 'mod logs')">Clear</button>
                </div>
                <div class="settings-row">
                    <div>
                        <div class="settings-label">Clear Audit Logs</div>
                        <div style="font-size:12px;color:var(--text3)">Permanently deletes all audit log entries for this server</div>
                    </div>
                    <button class="btn-danger" onclick="dangerClear('audit', 'audit logs')">Clear</button>
                </div>
                <div class="settings-row">
                    <div>
                        <div class="settings-label">Clear Warnings</div>
                        <div style="font-size:12px;color:var(--text3)">Permanently deletes all warnings for this server</div>
                    </div>
                    <button class="btn-danger" onclick="dangerClear('warnings', 'warnings')">Clear</button>
                </div>
                <div class="settings-row">
                    <div>
                        <div class="settings-label">Clear Ban Records</div>
                        <div style="font-size:12px;color:var(--text3)">Removes ban history from Penny's database (does not unban on Discord)</div>
                    </div>
                    <button class="btn-danger" onclick="dangerClear('bans', 'ban records')">Clear</button>
                </div>
                <div class="settings-row">
                    <div>
                        <div class="settings-label">Clear Punishment Ladder</div>
                        <div style="font-size:12px;color:var(--text3)">Resets the punishment ladder (bot falls back to default behavior)</div>
                    </div>
                    <button class="btn-danger" onclick="dangerClear('ladder', 'punishment ladder')">Clear</button>
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
    const avatar = localStorage.getItem('penny_avatar');
    const title  = localStorage.getItem('penny_title');
    if (avatar) applyAvatar(avatar);
    if (title)  document.title = title;
}


// ============================================================
// DANGER ZONE
// ============================================================

// REF-APP-63
async function exportData() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    try {
        const data = await apiGet(`/api/export/${State.guildId}`);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `penny-export-${State.guildId}-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Export downloaded');
    } catch(e) { toast('Export failed', 'error'); }
}

async function dangerClear(type, label) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    openModal(`Clear ${label}`, `
        <div style="font-size:13px;color:var(--text2);line-height:1.6">
            Are you sure you want to permanently delete all <strong>${label}</strong> for this server?
            <br><br>
            <span style="color:var(--red);font-weight:600">This cannot be undone.</span>
        </div>
    `, [
        { label: 'Cancel',            class: 'btn-secondary', action: 'closeModal()' },
        { label: `Clear ${label}`,    class: 'btn-danger',    action: `confirmDangerClear('${type}','${label}')` },
    ]);
}

async function confirmDangerClear(type, label) {
    if (!State.guildId) return;
    try {
        await apiDelete(`/api/data/${type}/${State.guildId}`);
        closeModal();
        toast(`${label} cleared`);
    } catch(e) { toast('Failed', 'error'); }
}

// ============================================================
// COLLAPSIBLE NAV GROUPS
// REF-APP-67
// ============================================================

// Map each section to its group
const SECTION_GROUP = {
    security:     'security',
    secoverview:  'security',
    secspam:      'security',
    secraid:      'security',
    secbadwords:  'security',
    seccaps:      'security',
    secmention:   'security',
    secinvite:    'security',
    secage:       'security',
    secphishing:  'security',
    secantilink:  'security',
    secrepeat:    'security',
    secemoji:     'security',
    secnewline:   'security',
    seczalgo:     'security',
    sechoist:     'security',
    antinuke:     'security',
    panicmode:    'security',
    verification: 'security',
    joingate:     'security',
    modlog:       'moderation',
    warnings:     'moderation',
    punishments:  'moderation',
    exemptions:   'moderation',
    auditlog:     'audit',
    auditconfig:  'audit',
    leveling:     'community',
    reactionroles:'community',
    giveaways:    'community',
    polls:        'community',
    tickets:      'community',
    commands:     'automation',
    autoresponder:'automation',
    scheduled:    'automation',
    reminders:    'automation',
    afk:          'automation',
    socials:      'automation',
    welcome:      'configuration',
    users:        'configuration',
    settings:     'configuration',
};

const ALL_GROUPS = ['security','moderation','audit','community','automation','configuration'];

function toggleGroup(group) {
    const isOpen = document.getElementById(`children-${group}`).classList.contains('open');

    // Close all groups first
    ALL_GROUPS.forEach(g => {
        document.getElementById(`children-${g}`)?.classList.remove('open');
        document.getElementById(`chevron-${g}`)?.classList.remove('open');
        document.getElementById(`group-${g}`)?.querySelector('.nav-group-header')?.classList.remove('open');
    });

    // If it wasn't open, open it
    if (!isOpen) {
        document.getElementById(`children-${group}`)?.classList.add('open');
        document.getElementById(`chevron-${group}`)?.classList.add('open');
        document.getElementById(`group-${group}`)?.querySelector('.nav-group-header')?.classList.add('open');
    }
}

function openGroupForSection(section) {
    const group = SECTION_GROUP[section];
    if (!group) return;
    ALL_GROUPS.forEach(g => {
        document.getElementById(`children-${g}`)?.classList.remove('open');
        document.getElementById(`chevron-${g}`)?.classList.remove('open');
        document.getElementById(`group-${g}`)?.querySelector('.nav-group-header')?.classList.remove('open');
    });
    document.getElementById(`children-${group}`)?.classList.add('open');
    document.getElementById(`chevron-${group}`)?.classList.add('open');
    document.getElementById(`group-${group}`)?.querySelector('.nav-group-header')?.classList.add('open');
}

// ============================================================
// MOBILE SIDEBAR
// REF-APP-68
// ============================================================

function toggleMobileSidebar() {
    const sidebar  = document.querySelector('.sidebar');
    const overlay  = document.getElementById('sidebar-overlay');
    const isOpen   = sidebar.classList.contains('mobile-open');
    if (isOpen) {
        closeMobileSidebar();
    } else {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('visible');
    }
}

function closeMobileSidebar() {
    document.querySelector('.sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
}

// ============================================================
// MODAL SYSTEM
// REF-APP-70
// ============================================================

function openModal(title, bodyHtml, buttons) {
    document.getElementById('modal-title').textContent  = title;
    document.getElementById('modal-body').innerHTML     = bodyHtml;
    document.getElementById('modal-footer').innerHTML   = buttons.map(b =>
        `<button class="${b.class || 'btn-secondary'}" onclick="${b.action}">${b.label}</button>`
    ).join('');
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML   = '';
    document.getElementById('modal-footer').innerHTML = '';
}

function handleModalOverlayClick(e) {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
}


// ============================================================
// USER MODALS
// REF-APP-71
// ============================================================

function openCreateUserModal() {
    openModal('Create Admin User', `
        <div class="modal-field">
            <label class="modal-label">Username</label>
            <input class="modal-input" id="m-new-username" placeholder="Username">
        </div>
        <div class="modal-field">
            <label class="modal-label">Password</label>
            <input class="modal-input" type="password" id="m-new-password" placeholder="Min 8 characters">
        </div>
        <div class="modal-field">
            <label class="modal-label">Discord ID <span style="font-weight:400;color:var(--text3)">(optional)</span></label>
            <input class="modal-input" id="m-new-discord" placeholder="Discord user ID">
        </div>
        <div class="modal-error" id="m-create-error"></div>
    `, [
        { label: 'Cancel',      class: 'btn-secondary', action: 'closeModal()' },
        { label: 'Create User', class: 'btn-primary',   action: 'submitCreateUser()' },
    ]);
}

async function submitCreateUser() {
    const username   = document.getElementById('m-new-username').value.trim();
    const password   = document.getElementById('m-new-password').value;
    const discord_id = document.getElementById('m-new-discord').value.trim();
    const errorEl    = document.getElementById('m-create-error');

    errorEl.classList.remove('visible');

    if (!username || !password) {
        errorEl.textContent = 'Username and password are required.';
        errorEl.classList.add('visible');
        return;
    }
    if (password.length < 8) {
        errorEl.textContent = 'Password must be at least 8 characters.';
        errorEl.classList.add('visible');
        return;
    }

    try {
        const res  = await fetch(`${window.PENNY_API_URL}/auth/users`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.token}` },
            body:    JSON.stringify({ username, password, discord_id: discord_id || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Failed to create user.';
            errorEl.classList.add('visible');
            return;
        }
        closeModal();
        toast(`${username} created`);
        loadUsers();
    } catch(e) { toast('Failed', 'error'); }
}

function openEditUserModal(id, username, discordId) {
    openModal(`Edit User — ${username}`, `
        <div class="modal-field">
            <label class="modal-label">Username</label>
            <input class="modal-input" id="m-edit-username" placeholder="Leave blank to keep current" value="">
        </div>
        <div class="modal-field">
            <label class="modal-label">Password</label>
            <input class="modal-input" type="password" id="m-edit-password" placeholder="Leave blank to keep current">
        </div>
        <div class="modal-field">
            <label class="modal-label">Discord ID</label>
            <input class="modal-input" id="m-edit-discord" placeholder="Discord user ID" value="${discordId || ''}">
        </div>
        <div class="modal-error" id="m-edit-error"></div>
    `, [
        { label: 'Cancel',       class: 'btn-secondary', action: 'closeModal()' },
        { label: 'Save Changes', class: 'btn-primary',   action: `submitEditUserModal(${id})` },
    ]);
}

async function submitEditUserModal(id) {
    const username   = document.getElementById('m-edit-username').value.trim();
    const password   = document.getElementById('m-edit-password').value;
    const discord_id = document.getElementById('m-edit-discord').value.trim();
    const errorEl    = document.getElementById('m-edit-error');

    errorEl.classList.remove('visible');

    const body = {};
    if (username) body.username   = username;
    if (password) {
        if (password.length < 8) {
            errorEl.textContent = 'Password must be at least 8 characters.';
            errorEl.classList.add('visible');
            return;
        }
        body.password = password;
    }
    body.discord_id = discord_id || null;

    try {
        const res  = await fetch(`${window.PENNY_API_URL}/auth/users/${id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.token}` },
            body:    JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Failed.';
            errorEl.classList.add('visible');
            return;
        }
        closeModal();
        toast('User updated');
        loadUsers();
    } catch(e) { toast('Failed', 'error'); }
}

function openEditMyProfileModal() {
    openModal('My Profile', `
        <div class="modal-field">
            <label class="modal-label">Username</label>
            <input class="modal-input" id="m-me-username" placeholder="Leave blank to keep current">
        </div>
        <div class="modal-field">
            <label class="modal-label">New Password</label>
            <input class="modal-input" type="password" id="m-me-password" placeholder="Leave blank to keep current">
        </div>
        <div class="modal-field">
            <label class="modal-label">Discord ID</label>
            <input class="modal-input" id="m-me-discord" value="${State.user?.discord_id || ''}" placeholder="Discord user ID">
        </div>
        <div class="modal-error" id="m-me-error"></div>
    `, [
        { label: 'Cancel',   class: 'btn-secondary', action: 'closeModal()' },
        { label: 'Save',     class: 'btn-primary',   action: 'submitMyProfile()' },
    ]);
}

async function submitMyProfile() {
    const username   = document.getElementById('m-me-username').value.trim();
    const password   = document.getElementById('m-me-password').value;
    const discord_id = document.getElementById('m-me-discord').value.trim();
    const errorEl    = document.getElementById('m-me-error');

    errorEl.classList.remove('visible');

    const body = {};
    if (username) body.username = username;
    if (password) {
        if (password.length < 8) {
            errorEl.textContent = 'Password must be at least 8 characters.';
            errorEl.classList.add('visible');
            return;
        }
        body.password = password;
    }
    body.discord_id = discord_id || null;

    try {
        const res  = await fetch(`${window.PENNY_API_URL}/auth/me`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.token}` },
            body:    JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Failed.';
            errorEl.classList.add('visible');
            return;
        }
        if (data.user) {
            State.user = { ...State.user, ...data.user };
            localStorage.setItem('penny_user', JSON.stringify(State.user));
            document.getElementById('sb-user-name').textContent = State.user.username;
        }
        closeModal();
        toast('Profile saved');
        loadUsers();
    } catch(e) { toast('Failed', 'error'); }
}

// ============================================================
// SECURITY MODULE PAGES
// REF-APP-72
// ============================================================

// === SHARED HELPERS ===

function secActionSelect(key, currentValue) {
    const val = currentValue || 'ladder';
    return `
        <select class="settings-input" id="${key}" style="width:200px">
            <option value="ladder"      ${val==='ladder'      ? 'selected':''}>Use Punishment Ladder</option>
            <option value="delete"      ${val==='delete'      ? 'selected':''}>Delete Only</option>
            <option value="delete_warn" ${val==='delete_warn' ? 'selected':''}>Delete + Warn (feeds ladder)</option>
            <option value="kick"        ${val==='kick'        ? 'selected':''}>Kick</option>
            <option value="ban"         ${val==='ban'         ? 'selected':''}>Ban</option>
        </select>`;
}

function secModuleCard(title, desc, enabledKey, actionKey, thresholds, extra, module) {
    const c = State.config;
    const thresholdKeys = (thresholds||'').match(/data-key="([^"]+)"/g)?.map(k=>k.replace(/data-key="|"/g,''))||[];
    return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
            <div class="card">
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">${title}</div>
                        <div style="font-size:11px;color:var(--text3);margin-top:2px">${desc}</div>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" id="${enabledKey}" ${c[enabledKey] ? 'checked' : ''} onchange="saveSecToggle('${enabledKey}', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
                ${actionKey ? `
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Action</div>
                        <div style="font-size:11px;color:var(--text3);margin-top:2px">What Penny does when triggered</div>
                    </div>
                    <div class="toggle-right">
                        ${secActionSelect(actionKey, c[actionKey])}
                    </div>
                </div>` : ''}
                ${thresholds || ''}
                <div class="card-footer">
                    <button class="btn-primary" onclick="saveSecModule('${enabledKey}', ${actionKey ? `'${actionKey}'` : 'null'}, ${JSON.stringify(thresholdKeys)})">Save</button>
                </div>
            </div>
            ${module ? `
            <div class="card">
                <div class="toggle-row" style="border-bottom:1px solid var(--border)">
                    <div class="toggle-info">
                        <div class="toggle-name">Exemptions</div>
                        <div style="font-size:11px;color:var(--text3);margin-top:2px">Roles, users and channels exempt from this module only</div>
                    </div>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Type</div>
                        <div style="font-size:11px;color:var(--text3);margin-top:2px">What you are exempting</div>
                    </div>
                    <select class="settings-input" id="me-type-${module}" style="width:180px">
                        <option value="role">Role</option>
                        <option value="user">User</option>
                        <option value="channel">Channel</option>
                    </select>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">ID</div>
                        <div style="font-size:11px;color:var(--text3);margin-top:2px">Role, user or channel ID</div>
                    </div>
                    <input class="settings-input" id="me-id-${module}" placeholder="e.g. 123456789012345678" style="width:180px">
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Note</div>
                        <div style="font-size:11px;color:var(--text3);margin-top:2px">Reason for this exemption</div>
                    </div>
                    <input class="settings-input" id="me-note-${module}" placeholder="e.g. Staff role" style="width:180px">
                </div>
                <div class="card-footer">
                    <button class="btn-primary" onclick="addModuleExemption('${module}')">Add</button>
                </div>
            </div>` : ''}
        </div>`;
}

async function saveSecToggle(key, value) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    try {
        await apiPatch(`/api/config/${State.guildId}`, { key, value });
        State.config[key] = value;
        toast(value ? 'Enabled' : 'Disabled');
    } catch(e) { toast('Failed', 'error'); }
}

async function saveSecModule(enabledKey, actionKey, thresholdKeys) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const updates = {};
    updates[enabledKey] = document.getElementById(enabledKey)?.checked || false;
    if (actionKey) {
        updates[actionKey] = document.getElementById(actionKey)?.value || 'ladder';
    }
    if (thresholdKeys && thresholdKeys.length) {
        thresholdKeys.forEach(k => {
            const el = document.querySelector(`[data-key="${k}"]`);
            if (el) updates[k] = parseFloat(el.value);
        });
    }
    try {
        await apiPut(`/api/config/${State.guildId}`, updates);
        Object.assign(State.config, updates);
        toast('Saved');
    } catch(e) { toast('Failed', 'error'); }
}


// === SECURITY OVERVIEW ===
// REF-APP-72a
function renderSecOverview() {
    const el = document.getElementById('content');
    const c  = State.config;

    const modules = [
        { key: 'spam_enabled',         name: 'Spam Detection',    section: 'secspam',     desc: 'Message rate limiting'          },
        { key: 'raid_enabled',         name: 'Anti-Raid',         section: 'secraid',     desc: 'Mass join detection'            },
        { key: 'badwords_enabled',     name: 'Bad Word Filter',   section: 'secbadwords', desc: 'Prohibited word detection'      },
        { key: 'caps_enabled',         name: 'Caps Filter',       section: 'seccaps',     desc: 'Excessive caps detection'       },
        { key: 'mass_mention_enabled', name: 'Mass Mention',      section: 'secmention',  desc: 'Mention spam detection'         },
        { key: 'antilink_enabled',     name: 'Anti-Invite Links', section: 'secinvite',   desc: 'Discord invite link blocking'   },
        { key: 'antilink_all_enabled', name: 'Anti-Link',         section: 'secantilink', desc: 'All URL blocking'               },
        { key: 'accountage_enabled',   name: 'Account Age Gate',  section: 'secage',      desc: 'New account filtering'         },
        { key: 'repeat_enabled',       name: 'Repeated Text',     section: 'secrepeat',   desc: 'Copypasta detection'            },
        { key: 'emojispam_enabled',    name: 'Emoji Spam',        section: 'secemoji',    desc: 'Emoji spam detection'           },
        { key: 'newline_enabled',      name: 'Newline Spam',      section: 'secnewline',  desc: 'Line break spam detection'      },
        { key: 'zalgo_enabled',        name: 'Zalgo Text',        section: 'seczalgo',    desc: 'Corrupted text detection'       },
        { key: 'antihoist_enabled',    name: 'Anti-Hoist',        section: 'sechoist',    desc: 'Username hoist prevention'      },
    ];

    const active  = modules.filter(m => c[m.key]).length;
    const total   = modules.length;

    el.innerHTML = `
        <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
            <div class="stat-card blue">
                <div class="stat-label">Active Modules</div>
                <div class="stat-value">${active}<span style="font-size:14px;color:var(--text2)">/${total}</span></div>
            </div>
            <div class="stat-card green">
                <div class="stat-label">Modules Off</div>
                <div class="stat-value">${total - active}</div>
            </div>
            <div class="stat-card ${active === total ? 'green' : active > total / 2 ? 'gold' : 'red'}">
                <div class="stat-label">Coverage</div>
                <div class="stat-value">${Math.round((active / total) * 100)}%</div>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><div class="card-title">All Modules</div><div class="card-desc">Click any module to configure it</div></div>
            ${modules.map(m => `
                <div class="toggle-row" style="cursor:pointer" onclick="setSection('${m.section}')">
                    <div class="toggle-info">
                        <div class="toggle-name">${m.name}</div>
                        <div style="font-size:11px;color:var(--text3);margin-top:2px">${m.desc}</div>
                    </div>
                    <div class="toggle-right">
                        <span class="ms-badge ${c[m.key] ? 'ms-on' : 'ms-off'}">${c[m.key] ? 'Active' : 'Off'}</span>
                        <span style="font-size:12px;color:var(--text3)">→</span>
                    </div>
                </div>`).join('')}
        </div>`;
}


// === SPAM DETECTION ===
// REF-APP-72b
function renderSecSpam(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('spam'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = secModuleCard(
        'Spam Detection',
        'Detects users sending too many messages in a short window',
        'spam_enabled',
        'spam_action',
        `<div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Max messages</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">Messages allowed before triggering</div>
            </div>
            <input class="settings-input" type="number" value="${c.spam_max_messages || 5}" data-key="spam_max_messages" style="width:90px;text-align:right">
        </div>
        <div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Time window</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">Rolling window in milliseconds</div>
            </div>
            <input class="settings-input" type="number" value="${c.spam_window_ms || 5000}" data-key="spam_window_ms" style="width:90px;text-align:right">
        </div>`,
        null, 'spam'
    );
}

// === ANTI-RAID ===
// REF-APP-72c
function renderSecRaid(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('raid'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = secModuleCard(
        'Anti-Raid',
        'Triggers when too many users join the server in a short window',
        'raid_enabled',
        'raid_action',
        `<div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Max joins</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">Joins allowed before triggering</div>
            </div>
            <input class="settings-input" type="number" value="${c.raid_max_joins || 5}" data-key="raid_max_joins" style="width:90px;text-align:right">
        </div>
        <div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Time window</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">Rolling window in milliseconds</div>
            </div>
            <input class="settings-input" type="number" value="${c.raid_window_ms || 10000}" data-key="raid_window_ms" style="width:90px;text-align:right">
        </div>`,
        null, 'raid'
    );
}


// === BAD WORD FILTER ===
// REF-APP-72d
function renderSecBadWords(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('badwords'); return; }
    const c = State.config;

    if (tab === 'Settings') {
        document.getElementById('content').innerHTML = secModuleCard(
            'Bad Word Filter',
            'Detects and acts on messages containing prohibited words',
            'badwords_enabled',
            'badwords_action',
            null,
            null, 'badwords'
        );
    }

    if (tab === 'Word List') {
        const words = c.badwords_list || [];
        document.getElementById('content').innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Word List</div></div>
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


// === CAPS FILTER ===
// REF-APP-72e
function renderSecCaps(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('caps'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = secModuleCard(
        'Caps Filter',
        'Detects messages with excessive capital letters',
        'caps_enabled',
        'caps_action',
        `<div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Caps threshold</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">Ratio of caps to trigger (0.7 = 70%)</div>
            </div>
            <input class="settings-input" type="number" value="${c.caps_threshold || 0.7}" data-key="caps_threshold" step="0.1" min="0.1" max="1" style="width:90px;text-align:right">
        </div>
        <div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Minimum length</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">Minimum characters before checking</div>
            </div>
            <input class="settings-input" type="number" value="${c.caps_min_length || 10}" data-key="caps_min_length" style="width:90px;text-align:right">
        </div>`,
        null, 'caps'
    );
}


// === MASS MENTION ===
// REF-APP-72f
function renderSecMention(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('mass_mention'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = secModuleCard(
        'Mass Mention',
        'Detects messages that mention too many users or roles at once',
        'mass_mention_enabled',
        'mass_mention_action',
        `<div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Max mentions</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">Mentions allowed before triggering</div>
            </div>
            <input class="settings-input" type="number" value="${c.mass_mention_max || 5}" data-key="mass_mention_max" style="width:90px;text-align:right">
        </div>`,
        null, 'mass_mention'
    );
}


// === ANTI-INVITE LINKS ===
// REF-APP-72g
function renderSecInvite(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('antilink'); return; }
    document.getElementById('content').innerHTML = secModuleCard(
        'Anti-Invite Links',
        'Detects and acts on Discord invite links posted in the server',
        'antilink_enabled',
        'antilink_action',
        null,
        null, 'antilink'
    );
}


// === ACCOUNT AGE GATE ===
// REF-APP-72h
function renderSecAge(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('accountage'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = secModuleCard(
        'Account Age Gate',
        'Kicks new members whose Discord account is too new',
        'accountage_enabled',
        null,
        `<div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Minimum account age</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">Accounts newer than this are kicked</div>
            </div>
            <input class="settings-input" type="number" value="${c.accountage_min_days || 7}" data-key="accountage_min_days" style="width:90px;text-align:right">
        </div>`,
        null, 'accountage'
    );
}

// ============================================================
// MODULE EXEMPTIONS UI
// REF-APP-73
// ============================================================

function moduleExemptionsCard(module) {
    return `
        <div class="card">
            <div class="card-header">
                <div>
                    <div class="card-title">Exemptions</div>
                    <div class="card-desc">Roles, users and channels exempt from this module only</div>
                </div>
            </div>
            <div style="padding:14px 18px;display:flex;gap:10px;border-bottom:1px solid var(--border)">
                <select class="settings-input" id="me-type-${module}" style="width:120px">
                    <option value="role">Role</option>
                    <option value="user">User</option>
                    <option value="channel">Channel</option>
                </select>
                <input class="settings-input" id="me-id-${module}" placeholder="Enter ID" style="flex:1">
                <button class="add-btn" onclick="addModuleExemption('${module}')">Add</button>
            </div>
            <div id="me-list-${module}" style="padding:10px 18px">
                <div class="empty-state" style="padding:16px"><div class="empty-state-title">Loading...</div></div>
            </div>
        </div>`;
}

async function loadModuleExemptions(module) {
    if (!State.guildId) return;
    try {
        const data = await apiGet(`/api/module-exemptions/${State.guildId}/${module}`);
        const el   = document.getElementById(`me-list-${module}`);
        if (!el) return;

        const all = [
            ...data.roles.map(r    => ({ ...r, type: 'Role'    })),
            ...data.users.map(u    => ({ ...u, type: 'User'    })),
            ...data.channels.map(c => ({ ...c, type: 'Channel' })),
        ];

        if (!all.length) {
            el.innerHTML = `<tr><td colspan="6" class="table-loading">No exemptions added</td></tr>`;
            return;
        }

        el.innerHTML = all.map(e => `
            <tr>
                <td>${e.type}</td>
                <td style="font-family:monospace;font-size:12px">${e.target_id}</td>
                <td>${e.note || '—'}</td>
                <td>${e.added_by || '—'}</td>
                <td>${e.added_at ? new Date(e.added_at).toLocaleString() : '—'}</td>
                <td><button class="exempt-remove" onclick="removeModuleExemption('${module}','${e.type.toLowerCase()}','${e.target_id}')">Remove</button></td>
            </tr>`).join('');
    } catch(e) { console.error(e); }
}

async function addModuleExemption(module) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const type      = document.getElementById(`me-type-${module}`).value;
    const target_id = document.getElementById(`me-id-${module}`).value.trim();
    const note      = document.getElementById(`me-note-${module}`)?.value.trim() || null;
    if (!target_id) { toast('Enter an ID', 'error'); return; }
    try {
        await apiPost(`/api/module-exemptions/${State.guildId}/${module}`, {
            type, target_id, added_by: State.user?.username, note
        });
        document.getElementById(`me-id-${module}`).value = '';
        if (document.getElementById(`me-note-${module}`)) {
            document.getElementById(`me-note-${module}`).value = '';
        }
        toast('Exemption added');
        loadModuleExemptions(module);
    } catch(e) { toast('Failed', 'error'); }
}

async function removeModuleExemption(module, type, targetId) {
    if (!State.guildId) return;
    try {
        await apiDelete(`/api/module-exemptions/${State.guildId}/${module}`, {
            type, target_id: targetId
        });
toast('Removed');
        loadModuleExemptions(module);
    } catch(e) { toast('Failed', 'error'); }
}

// === ANTI-LINK ===
// REF-APP-72i
function renderSecAntiLink(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('antilink_all'); return; }
    document.getElementById('content').innerHTML = secModuleCard(
        'Anti-Link',
        'Blocks all URLs posted in the server (not just Discord invites)',
        'antilink_all_enabled',
        'antilink_all_action',
        null,
        null, 'antilink_all'
    );
}


// === REPEATED TEXT ===
// REF-APP-72j
function renderSecRepeat(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('repeat'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = secModuleCard(
        'Repeated Text',
        'Detects copypasta and messages with excessive repeated words',
        'repeat_enabled',
        'repeat_action',
        `<div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Minimum length</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">Minimum characters before checking</div>
            </div>
            <input class="settings-input" type="number" value="${c.repeat_min_length || 20}" data-key="repeat_min_length" style="width:90px;text-align:right">
        </div>
        <div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Repeat threshold</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">Ratio of repeated words to trigger (0.7 = 70%)</div>
            </div>
            <input class="settings-input" type="number" value="${c.repeat_threshold || 0.7}" data-key="repeat_threshold" step="0.1" min="0.1" max="1" style="width:90px;text-align:right">
        </div>`,
        null, 'repeat'
    );
}


// === EMOJI SPAM ===
// REF-APP-72k
function renderSecEmoji(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('emojispam'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = secModuleCard(
        'Emoji Spam',
        'Detects messages containing too many emojis',
        'emojispam_enabled',
        'emojispam_action',
        `<div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Max emojis</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">Emojis allowed before triggering</div>
            </div>
            <input class="settings-input" type="number" value="${c.emojispam_max || 5}" data-key="emojispam_max" style="width:90px;text-align:right">
        </div>`,
        null, 'emojispam'
    );
}


// === NEWLINE SPAM ===
// REF-APP-72l
function renderSecNewline(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('newline'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = secModuleCard(
        'Newline Spam',
        'Detects messages with excessive line breaks',
        'newline_enabled',
        'newline_action',
        `<div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Max lines</div>
                <div style="font-size:11px;color:var(--text3);margin-top:2px">Line breaks allowed before triggering</div>
            </div>
            <input class="settings-input" type="number" value="${c.newline_max || 10}" data-key="newline_max" style="width:90px;text-align:right">
        </div>`,
        null, 'newline'
    );
}


// === ZALGO TEXT ===
// REF-APP-72m
function renderSecZalgo(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('zalgo'); return; }
    document.getElementById('content').innerHTML = secModuleCard(
        'Zalgo Text',
        'Detects and removes corrupted or glitched looking text',
        'zalgo_enabled',
        'zalgo_action',
        null,
        null, 'zalgo'
    );
}


// === ANTI-HOIST ===
// REF-APP-72n
function renderSecHoist(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('antihoist'); return; }
    document.getElementById('content').innerHTML = secModuleCard(
        'Anti-Hoist',
        'Renames users whose names start with special characters to prevent them appearing at the top of the member list',
        'antihoist_enabled',
        null,
        null,
        null, 'antihoist'
    );
}

// REF-APP-73a
function renderModuleExemptionsTab(module) {
    const el = document.getElementById('content');
    el.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Exemptions</div></div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>ID</th>
                        <th>Note</th>
                        <th>Added By</th>
                        <th>Date Added</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="me-list-${module}">
                    <tr><td colspan="6" class="table-loading">Loading...</td></tr>
                </tbody>
            </table>
        </div>`;
    loadModuleExemptions(module);
}

// === PANIC MODE ===
// REF-APP-74
async function renderPanicMode() {
    const el = document.getElementById('content');
    const c  = State.config;

    // Get current panic state
    let panicState = { active: 0 };
    if (State.guildId) {
        try {
            panicState = await apiGet(`/api/panic/${State.guildId}`);
        } catch {}
    }

    const isActive = panicState?.active === 1;

    el.innerHTML = `
        <div class="card" style="${isActive ? 'border-color:var(--red)' : ''}">
            <div class="card-header" style="${isActive ? 'background:var(--red-bg)' : ''}">
                <div>
                    <div class="card-title" style="${isActive ? 'color:var(--red)' : ''}">
                        ${isActive ? '🚨 PANIC MODE ACTIVE' : 'Panic Mode'}
                    </div>
                    <div class="card-desc">
                        ${isActive
                            ? `Activated by ${panicState.triggered_by} at ${new Date(panicState.triggered_at).toLocaleString()}`
                            : 'Instantly locks all channels and kicks new members joining during the emergency'}
                    </div>
                </div>
                <button class="btn-danger" onclick="togglePanicMode(${isActive})"
                    style="background:${isActive ? 'var(--green)' : 'var(--red)'};border-color:${isActive ? 'var(--green)' : 'var(--red)'};color:#fff;min-width:180px">
                    ${isActive ? '✅ Deactivate Panic Mode' : '🚨 Activate Panic Mode'}
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><div class="card-title">Configuration</div></div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Alert Role</div>
                    <div style="font-size:11px;color:var(--text3);margin-top:2px">Role to ping when panic mode triggers</div>
                </div>
                <input class="settings-input" id="panic_alert_role" value="${c.panic_alert_role || ''}" placeholder="Role ID" style="width:200px">
            </div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Alert Channel</div>
                    <div style="font-size:11px;color:var(--text3);margin-top:2px">Channel to post panic alerts (defaults to log channel)</div>
                </div>
                <input class="settings-input" id="panic_alert_channel" value="${c.panic_alert_channel || ''}" placeholder="Channel ID" style="width:200px">
            </div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Authorized Roles</div>
                    <div style="font-size:11px;color:var(--text3);margin-top:2px">Roles that can use /panic command (admins always can)</div>
                </div>
                <input class="settings-input" id="panic_authorized_roles_input" placeholder="Role ID" style="width:200px">
            </div>
            <div style="padding:8px 18px 14px">
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px" id="panic-roles-list">
                    ${(c.panic_authorized_roles || []).map(id => `
                        <div class="word-tag">
                            ${id}
                            <button class="word-remove" onclick="removePanicRole('${id}')">×</button>
                        </div>`).join('') || '<span style="font-size:12px;color:var(--text3)">No roles added</span>'}
                </div>
                <button class="btn-secondary" style="font-size:12px" onclick="addPanicRole()">Add Role</button>
            </div>
            <div class="card-footer">
                <button class="btn-primary" onclick="savePanicConfig()">Save</button>
            </div>
        </div>`;
}

async function togglePanicMode(isActive) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }

    if (!isActive) {
        if (!confirm('Activate Panic Mode? This will lock ALL channels immediately.')) return;
    }

    try {
        if (isActive) {
            await apiPost(`/api/panic/${State.guildId}/deactivate`, {
                deactivated_by: State.user?.username
            });
            toast('Panic Mode deactivated');
        } else {
            await apiPost(`/api/panic/${State.guildId}/activate`, {
                triggered_by: State.user?.username,
                channel_snapshot: []
            });
            toast('Panic Mode activated', 'error');
        }
        renderPanicMode();
    } catch(e) { toast('Failed', 'error'); }
}

async function savePanicConfig() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const updates = {
        panic_alert_role:    document.getElementById('panic_alert_role').value.trim() || null,
        panic_alert_channel: document.getElementById('panic_alert_channel').value.trim() || null,
    };
    try {
        await apiPut(`/api/config/${State.guildId}`, updates);
        Object.assign(State.config, updates);
        toast('Saved');
    } catch(e) { toast('Failed', 'error'); }
}

function addPanicRole() {
    const input = document.getElementById('panic_authorized_roles_input');
    const id    = input.value.trim();
    if (!id) { toast('Enter a role ID', 'error'); return; }
    const roles = [...(State.config.panic_authorized_roles || [])];
    if (roles.includes(id)) { toast('Already added', 'error'); return; }
    roles.push(id);
    State.config.panic_authorized_roles = roles;
    apiPatch(`/api/config/${State.guildId}`, { key: 'panic_authorized_roles', value: roles })
        .then(() => { input.value = ''; renderPanicMode(); toast('Role added'); })
        .catch(() => toast('Failed', 'error'));
}

function removePanicRole(id) {
    const roles = (State.config.panic_authorized_roles || []).filter(r => r !== id);
    State.config.panic_authorized_roles = roles;
    apiPatch(`/api/config/${State.guildId}`, { key: 'panic_authorized_roles', value: roles })
        .then(() => { renderPanicMode(); toast('Role removed'); })
        .catch(() => toast('Failed', 'error'));
}
