// ============================================================
// PENNY DASHBOARD — CORE
// REF-CORE-01
// State, session, auth, routing, guild management,
// navigation, API helpers, initialisation
// ============================================================


// === STATE ===
// REF-CORE-02
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

// REF-CORE-03
function toast(message, type = 'success') {
    const el       = document.createElement('div');
    el.className   = `toast ${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}


// ============================================================
// SESSION MANAGEMENT
// ============================================================

// REF-CORE-04
function saveSession(token, user) {
    localStorage.setItem('penny_token', token);
    localStorage.setItem('penny_user', JSON.stringify(user));
    State.token = token;
    State.user  = user;
    State.theme = user.theme || 'light';
}

// REF-CORE-05
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

// REF-CORE-06
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

// REF-CORE-07
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

// REF-CORE-08
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

// REF-CORE-09
function handleLogout() {
    clearSession();
    showLogin();
}


// ============================================================
// SCREEN ROUTER
// ============================================================

// REF-CORE-10
function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

// REF-CORE-11
function showSetup() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

// REF-CORE-12
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

// REF-CORE-13
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
        }
    } catch(e) { console.error(e); }
}

// REF-CORE-14
function updateServerIcon(name) {
    const icon = document.getElementById('sb-server-icon');
    if (icon) icon.textContent = name ? name[0].toUpperCase() : '?';
}

// REF-CORE-15
function selectGuild(guildId) {
    State.guildId = guildId;
    localStorage.setItem('penny_guild', guildId);
    const select = document.getElementById('guild-select');
    const opt    = select.options[select.selectedIndex];
    if (opt) updateServerIcon(opt.textContent);
    loadGuildConfig().then(() => renderContent());
}

// REF-CORE-16
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

// REF-CORE-17
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

// REF-CORE-18
const SECTIONS = {
    overview:     { label: 'Dashboard',          tabs: ['Summary', 'Activity'],                     render: (t) => renderOverview(t)    },
    security:     { label: 'Auto-Mod',           tabs: ['Modules', 'Thresholds', 'Bad Words'],      render: (t) => renderSecurity(t)    },
    secoverview:  { label: 'Security Overview',  tabs: ['Overview'],                                render: (t) => renderSecOverview(t)  },
    secspam:      { label: 'Spam Detection',     tabs: ['Settings', 'Exemptions'],                  render: (t) => renderSecSpam(t)      },
    secraid:      { label: 'Anti-Raid',          tabs: ['Settings', 'Exemptions'],                  render: (t) => renderSecRaid(t)      },
    secbadwords:  { label: 'Bad Word Filter',    tabs: ['Settings', 'Word List', 'Exemptions'],     render: (t) => renderSecBadWords(t)  },
    seccaps:      { label: 'Caps Filter',        tabs: ['Settings', 'Exemptions'],                  render: (t) => renderSecCaps(t)      },
    secmention:   { label: 'Mass Mention',       tabs: ['Settings', 'Exemptions'],                  render: (t) => renderSecMention(t)   },
    secinvite:    { label: 'Anti-Invite Links',  tabs: ['Settings', 'Exemptions'],                  render: (t) => renderSecInvite(t)    },
    secage:       { label: 'Account Age Gate',   tabs: ['Settings', 'Exemptions'],                  render: (t) => renderSecAge(t)       },
    secantilink:  { label: 'Anti-Link',          tabs: ['Settings', 'Exemptions'],                  render: (t) => renderSecAntiLink(t)  },
    secrepeat:    { label: 'Repeated Text',      tabs: ['Settings', 'Exemptions'],                  render: (t) => renderSecRepeat(t)    },
    secemoji:     { label: 'Emoji Spam',         tabs: ['Settings', 'Exemptions'],                  render: (t) => renderSecEmoji(t)     },
    secnewline:   { label: 'Newline Spam',       tabs: ['Settings', 'Exemptions'],                  render: (t) => renderSecNewline(t)   },
    seczalgo:     { label: 'Zalgo Text',         tabs: ['Settings', 'Exemptions'],                  render: (t) => renderSecZalgo(t)     },
    sechoist:     { label: 'Anti-Hoist',         tabs: ['Settings', 'Exemptions'],                  render: (t) => renderSecHoist(t)     },
    antinuke:     { label: 'Anti-Nuke',          tabs: ['Settings'],                                render: (t) => renderComingSoon(t)   },
    panicmode:    { label: 'Panic Mode',         tabs: ['Settings'],                                render: (t) => renderPanicMode(t)    },
    verification: { label: 'Verification',       tabs: ['Settings'],                                render: (t) => renderComingSoon(t)   },
    joingate:     { label: 'Join Gate',          tabs: ['Settings'],                                render: (t) => renderComingSoon(t)   },
    modlog:       { label: 'Mod Log',            tabs: ['Mod Log'],                                 render: (t) => renderModLog(t)       },
    warnings:     { label: 'Warnings',           tabs: ['Warnings'],                                render: (t) => renderWarnings(t)     },
    punishments:  { label: 'Punishment Ladder',  tabs: ['Ladder'],                                  render: (t) => renderPunishments(t)  },
    exemptions:   { label: 'Exemptions',         tabs: ['Roles', 'Users', 'Channels'],              render: (t) => renderExemptions(t)   },
    auditlog:     { label: 'Audit Log',          tabs: ['Events'],                                  render: (t) => renderAuditLog(t)     },
    auditconfig:  { label: 'Audit Settings',     tabs: ['Settings'],                                render: (t) => renderAuditConfig(t)  },
    leveling:     { label: 'Leveling',           tabs: ['Settings'],                                render: (t) => renderComingSoon(t)   },
    reactionroles:{ label: 'Reaction Roles',     tabs: ['Roles'],                                   render: (t) => renderComingSoon(t)   },
    giveaways:    { label: 'Giveaways',          tabs: ['Active'],                                  render: (t) => renderComingSoon(t)   },
    polls:        { label: 'Polls',              tabs: ['Active'],                                  render: (t) => renderComingSoon(t)   },
    tickets:      { label: 'Ticketing',          tabs: ['Settings'],                                render: (t) => renderComingSoon(t)   },
    commands:     { label: 'Custom Commands',    tabs: ['Commands'],                                render: (t) => renderComingSoon(t)   },
    autoresponder:{ label: 'Auto-Responder',     tabs: ['Triggers'],                                render: (t) => renderComingSoon(t)   },
    scheduled:    { label: 'Scheduled Messages', tabs: ['Messages'],                                render: (t) => renderComingSoon(t)   },
    reminders:    { label: 'Reminders',          tabs: ['Active'],                                  render: (t) => renderComingSoon(t)   },
    afk:          { label: 'AFK Status',         tabs: ['Settings'],                                render: (t) => renderComingSoon(t)   },
    socials:      { label: 'Social Alerts',      tabs: ['Integrations'],                            render: (t) => renderComingSoon(t)   },
    welcome:      { label: 'Welcome & Roles',    tabs: ['Welcome Message', 'Auto Role'],            render: (t) => renderWelcome(t)      },
    users:        { label: 'Users',              tabs: ['Dashboard Users'],                         render: (t) => renderUsers(t),       ownerOnly: true },
    settings:     { label: 'Settings',           tabs: ['General', 'Appearance', 'Data Management'], render: (t) => renderSettings(t)   },
};

// REF-CORE-19
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

// REF-CORE-20
function setTab(tab) {
    State.tab = tab;
    document.querySelectorAll('.subnav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    renderContent();
}

// REF-CORE-21
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

// REF-CORE-22
function renderContent() {
    SECTIONS[State.section].render(State.tab);
}


// ============================================================
// INITIALISATION
// ============================================================

// REF-CORE-23
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

// REF-CORE-24
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

// REF-CORE-25
async function apiGet(path) {
    const res = await fetch(`${window.PENNY_API_URL}${path}`, {
        headers: { 'Authorization': `Bearer ${State.token}` }
    });
    if (res.status === 401) { clearSession(); showLogin(); return; }
    if (!res.ok) throw new Error(`GET ${path} failed`);
    return res.json();
}

// REF-CORE-26
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

// REF-CORE-27
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

// REF-CORE-28
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

// REF-CORE-29
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
