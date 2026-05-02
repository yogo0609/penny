// ============================================================
// PENNY DASHBOARD — UI
// REF-UI-01
// Theme, mobile sidebar, modal system, nav groups,
// appearance, coming soon
// ============================================================


// ============================================================
// THEME
// ============================================================

// REF-UI-02
function applyTheme(theme) {
    State.theme = theme;
    const btn   = document.getElementById('theme-toggle');
    if (theme === 'dark') {
        document.body.classList.add('dark');
        if (btn) btn.textContent = '☀';
    } else {
        document.body.classList.remove('dark');
        if (btn) btn.textContent = '☾';
    }
}

// REF-UI-03
async function toggleTheme() {
    const next = State.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    State.user.theme = next;
    localStorage.setItem('penny_user', JSON.stringify(State.user));
    try {
        await apiPatch('/auth/me/theme', { theme: next });
    } catch {}
}


// ============================================================
// APPEARANCE
// ============================================================

// REF-UI-04
function uploadAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    const reader   = new FileReader();
    reader.onload  = e => {
        localStorage.setItem('penny_avatar', e.target.result);
        applyAvatar(e.target.result);
        toast('Avatar updated');
    };
    reader.readAsDataURL(file);
}

// REF-UI-05
function applyAvatar(src) {
    const nav   = document.getElementById('nav-avatar');
    const login = document.getElementById('login-avatar');
    if (nav)   nav.innerHTML   = `<img src="${src}" alt="Penny">`;
    if (login) login.innerHTML = `<img src="${src}" alt="Penny">`;
}

// REF-UI-06
function saveAppearance() {
    const title = document.getElementById('dash-title')?.value;
    if (title) { document.title = title; localStorage.setItem('penny_title', title); }
    toast('Saved');
}

// REF-UI-07
function restoreAppearance() {
    const avatar = localStorage.getItem('penny_avatar');
    const title  = localStorage.getItem('penny_title');
    if (avatar) applyAvatar(avatar);
    if (title)  document.title = title;
}


// ============================================================
// MOBILE SIDEBAR
// ============================================================

// REF-UI-08
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isOpen  = sidebar.classList.contains('mobile-open');
    if (isOpen) {
        closeMobileSidebar();
    } else {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('visible');
    }
}

// REF-UI-09
function closeMobileSidebar() {
    document.querySelector('.sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
}


// ============================================================
// COLLAPSIBLE NAV GROUPS
// ============================================================

// REF-UI-10
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

// REF-UI-11
function toggleGroup(group) {
    const isOpen = document.getElementById(`children-${group}`)?.classList.contains('open');

    ALL_GROUPS.forEach(g => {
        document.getElementById(`children-${g}`)?.classList.remove('open');
        document.getElementById(`chevron-${g}`)?.classList.remove('open');
        document.getElementById(`group-${g}`)?.querySelector('.nav-group-header')?.classList.remove('open');
    });

    if (!isOpen) {
        document.getElementById(`children-${group}`)?.classList.add('open');
        document.getElementById(`chevron-${group}`)?.classList.add('open');
        document.getElementById(`group-${group}`)?.querySelector('.nav-group-header')?.classList.add('open');
    }
}

// REF-UI-12
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
// MODAL SYSTEM
// ============================================================

// REF-UI-13
function openModal(title, bodyHtml, buttons) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML    = bodyHtml;
    document.getElementById('modal-footer').innerHTML  = buttons.map(b =>
        `<button class="${b.class || 'btn-secondary'}" onclick="${b.action}">${b.label}</button>`
    ).join('');
    document.getElementById('modal-overlay').classList.remove('hidden');
}

// REF-UI-14
function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML   = '';
    document.getElementById('modal-footer').innerHTML = '';
}

// REF-UI-15
function handleModalOverlayClick(e) {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
}


// ============================================================
// COMING SOON
// ============================================================

// REF-UI-16
function renderComingSoon() {
    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="empty-state">
                <div class="empty-state-title">Coming soon</div>
                <div style="font-size:13px;color:var(--text3);margin-top:6px">This feature is on the roadmap and will be available in a future update.</div>
            </div>
        </div>`;
}
