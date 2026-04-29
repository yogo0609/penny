// ============================================================
// PENNY DASHBOARD — SECURITY
// REF-SEC-01
// All security module pages, exemptions, panic mode
// ============================================================


// ============================================================
// SHARED HELPERS
// ============================================================

// REF-SEC-02
function secActionSelect(key, currentValue) {
    const val = currentValue || 'ladder';
    return `
        <select id="${key}" style="width:200px">
            <option value="ladder"      ${val==='ladder'      ? 'selected':''}>Use Punishment Ladder</option>
            <option value="delete"      ${val==='delete'      ? 'selected':''}>Delete Only</option>
            <option value="delete_warn" ${val==='delete_warn' ? 'selected':''}>Delete + Warn (feeds ladder)</option>
            <option value="kick"        ${val==='kick'        ? 'selected':''}>Kick</option>
            <option value="ban"         ${val==='ban'         ? 'selected':''}>Ban</option>
        </select>`;
}

// REF-SEC-03
function secModuleCard(title, desc, enabledKey, actionKey, thresholds, extra, module) {
    const c             = State.config;
    const thresholdKeys = (thresholds||'').match(/data-key="([^"]+)"/g)?.map(k=>k.replace(/data-key="|"/g,''))||[];
    return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
            <div class="card">
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">${title}</div>
                        <div class="toggle-desc">${desc}</div>
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
                        <div class="toggle-desc">What Penny does when triggered</div>
                    </div>
                    <div class="toggle-right">
                        ${secActionSelect(actionKey, c[actionKey])}
                    </div>
                </div>` : ''}
                ${thresholds || ''}
                ${extra || ''}
                <div class="card-footer">
                    <button class="btn-primary" onclick="saveSecModule('${enabledKey}', ${actionKey ? `'${actionKey}'` : 'null'}, ${JSON.stringify(thresholdKeys)})">Save</button>
                </div>
            </div>
            ${module ? `
            <div class="card">
                <div class="toggle-row" style="border-bottom:1px solid var(--border)">
                    <div class="toggle-info">
                        <div class="toggle-name">Exemptions</div>
                        <div class="toggle-desc">Roles, users and channels exempt from this module only</div>
                    </div>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Type</div>
                        <div class="toggle-desc">What you are exempting</div>
                    </div>
                    <select id="me-type-${module}" style="width:160px">
                        <option value="role">Role</option>
                        <option value="user">User</option>
                        <option value="channel">Channel</option>
                    </select>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">ID</div>
                        <div class="toggle-desc">Role, user or channel ID</div>
                    </div>
                    <input id="me-id-${module}" placeholder="e.g. 123456789012345678" style="width:220px">
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Note</div>
                        <div class="toggle-desc">Reason for this exemption</div>
                    </div>
                    <input id="me-note-${module}" placeholder="e.g. Staff role" style="width:220px">
                </div>
                <div class="card-footer">
                    <button class="btn-primary" onclick="addModuleExemption('${module}')">Add</button>
                </div>
            </div>` : ''}
        </div>`;
}

// REF-SEC-04
async function saveSecToggle(key, value) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    try {
        await apiPatch(`/api/config/${State.guildId}`, { key, value });
        State.config[key] = value;
        toast(value ? 'Enabled' : 'Disabled');
    } catch(e) { toast('Failed', 'error'); }
}

// REF-SEC-05
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


// ============================================================
// SECURITY OVERVIEW
// ============================================================

// REF-SEC-06
function renderSecOverview() {
    const el = document.getElementById('content');
    const c  = State.config;

    const modules = [
        { key: 'spam_enabled',         name: 'Spam Detection',    section: 'secspam',     desc: 'Message rate limiting'         },
        { key: 'raid_enabled',         name: 'Anti-Raid',         section: 'secraid',     desc: 'Mass join detection'           },
        { key: 'badwords_enabled',     name: 'Bad Word Filter',   section: 'secbadwords', desc: 'Prohibited word detection'     },
        { key: 'caps_enabled',         name: 'Caps Filter',       section: 'seccaps',     desc: 'Excessive caps detection'      },
        { key: 'mass_mention_enabled', name: 'Mass Mention',      section: 'secmention',  desc: 'Mention spam detection'        },
        { key: 'antilink_enabled',     name: 'Anti-Invite Links', section: 'secinvite',   desc: 'Discord invite link blocking'  },
        { key: 'antilink_all_enabled', name: 'Anti-Link',         section: 'secantilink', desc: 'All URL blocking'              },
        { key: 'accountage_enabled',   name: 'Account Age Gate',  section: 'secage',      desc: 'New account filtering'         },
        { key: 'repeat_enabled',       name: 'Repeated Text',     section: 'secrepeat',   desc: 'Copypasta detection'           },
        { key: 'emojispam_enabled',    name: 'Emoji Spam',        section: 'secemoji',    desc: 'Emoji spam detection'          },
        { key: 'newline_enabled',      name: 'Newline Spam',      section: 'secnewline',  desc: 'Line break spam detection'     },
        { key: 'zalgo_enabled',        name: 'Zalgo Text',        section: 'seczalgo',    desc: 'Corrupted text detection'      },
        { key: 'antihoist_enabled',    name: 'Anti-Hoist',        section: 'sechoist',    desc: 'Username hoist prevention'     },
    ];

    const active = modules.filter(m => c[m.key]).length;
    const total  = modules.length;

    el.innerHTML = `
        <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
            <div class="stat-card blue">
                <div class="stat-label">Active Modules</div>
                <div class="stat-value">${active}<span style="font-size:14px;color:var(--text2)">/${total}</span></div>
            </div>
            <div class="stat-card gold">
                <div class="stat-label">Modules Off</div>
                <div class="stat-value">${total - active}</div>
            </div>
            <div class="stat-card ${active === total ? 'green' : active > total / 2 ? 'gold' : 'red'}">
                <div class="stat-label">Coverage</div>
                <div class="stat-value">${Math.round((active / total) * 100)}%</div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="card-title">All Modules</div>
                <div class="card-desc">Click any module to configure it</div>
            </div>
            ${modules.map(m => `
                <div class="toggle-row" style="cursor:pointer" onclick="setSection('${m.section}')">
                    <div class="toggle-info">
                        <div class="toggle-name">${m.name}</div>
                        <div class="toggle-desc">${m.desc}</div>
                    </div>
                    <div class="toggle-right">
                        <span class="ms-badge ${c[m.key] ? 'ms-on' : 'ms-off'}">${c[m.key] ? 'Active' : 'Off'}</span>
                        <span style="font-size:12px;color:var(--text3)">→</span>
                    </div>
                </div>`).join('')}
        </div>`;
}


// ============================================================
// MODULE RENDERERS
// ============================================================

// REF-SEC-07
function renderSecurity(tab) { renderProtection(tab); }

// REF-SEC-08
function renderProtection(tab) {
    const el = document.getElementById('content');
    const c  = State.config;

    if (tab === 'Modules') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Modules</div></div>
                ${moduleRow('spam_enabled',         'Spam Detection',    'spam_action',         c)}
                ${moduleRow('raid_enabled',         'Anti-Raid',         'raid_action',         c)}
                ${moduleRow('badwords_enabled',     'Bad Word Filter',   'badwords_action',     c)}
                ${moduleRow('caps_enabled',         'Caps Lock Filter',  'caps_action',         c)}
                ${moduleRow('mass_mention_enabled', 'Mass Mention',      'mass_mention_action', c)}
                ${moduleRow('antilink_enabled',     'Anti-Invite Links', 'antilink_action',     c)}
                ${moduleRow('accountage_enabled',   'Account Age Gate',  null,                  c)}
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
                    <button class="btn-primary btn-sm" onclick="addBadWord()">Add</button>
                </div>
            </div>`;
    }
}

// REF-SEC-09
function moduleRow(key, name, actionKey, config) {
    const checked = config[key] ? 'checked' : '';
    const action  = actionKey ? (config[actionKey] || 'delete') : '';
    const pill    = actionKey
        ? `<span class="action-pill" onclick="cycleAction(this,'${actionKey}')" title="Click to change">${action}</span>`
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

// REF-SEC-10
function thrRow(key, label, value, unit) {
    return `
        <div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">${label}</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${value}" data-key="${key}" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3);white-space:nowrap">${unit}</span>
            </div>
        </div>`;
}

// REF-SEC-11
function wordTag(word) {
    return `<div class="word-tag">${word}<button class="word-remove" onclick="removeBadWord('${word}')">×</button></div>`;
}

// REF-SEC-12
async function toggleModule(key, value) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    try {
        await apiPatch(`/api/config/${State.guildId}`, { key, value });
        State.config[key] = value;
        toast(value ? 'Enabled' : 'Disabled');
    } catch(e) { toast('Failed', 'error'); }
}

// REF-SEC-13
function cycleAction(el, key) {
    const actions = ['delete', 'warn', 'kick'];
    const next    = actions[(actions.indexOf(el.textContent.trim()) + 1) % actions.length];
    el.textContent = next;
    if (State.guildId) {
        apiPatch(`/api/config/${State.guildId}`, { key, value: next })
            .then(() => { State.config[key] = next; toast(`Action → ${next}`); })
            .catch(() => toast('Failed', 'error'));
    }
}

// REF-SEC-14
async function saveProtection() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const inputs  = document.querySelectorAll('[data-key]');
    const updates = {};
    inputs.forEach(i => { updates[i.dataset.key] = parseFloat(i.value); });
    try {
        await apiPut(`/api/config/${State.guildId}`, updates);
        Object.assign(State.config, updates);
        toast('Thresholds saved');
    } catch(e) { toast('Failed', 'error'); }
}

// REF-SEC-15
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
    } catch(e) { toast('Failed', 'error'); }
}

// REF-SEC-16
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
    } catch(e) { toast('Failed', 'error'); }
}


// ============================================================
// INDIVIDUAL MODULE PAGES
// ============================================================

// REF-SEC-17
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
                <div class="toggle-desc">Messages allowed before triggering</div>
            </div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.spam_max_messages || 5}" data-key="spam_max_messages" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3)">messages</span>
            </div>
        </div>
        <div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Time window</div>
                <div class="toggle-desc">Rolling window in milliseconds</div>
            </div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.spam_window_ms || 5000}" data-key="spam_window_ms" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3)">ms</span>
            </div>
        </div>`,
        null, 'spam'
    );
}

// REF-SEC-18
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
                <div class="toggle-desc">Joins allowed before triggering</div>
            </div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.raid_max_joins || 5}" data-key="raid_max_joins" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3)">joins</span>
            </div>
        </div>
        <div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Time window</div>
                <div class="toggle-desc">Rolling window in milliseconds</div>
            </div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.raid_window_ms || 10000}" data-key="raid_window_ms" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3)">ms</span>
            </div>
        </div>`,
        null, 'raid'
    );
}

// REF-SEC-19
function renderSecBadWords(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('badwords'); return; }
    const c = State.config;
    if (tab === 'Settings') {
        document.getElementById('content').innerHTML = secModuleCard(
            'Bad Word Filter',
            'Detects and acts on messages containing prohibited words',
            'badwords_enabled',
            'badwords_action',
            null, null, 'badwords'
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
                    <button class="btn-primary btn-sm" onclick="addBadWord()">Add</button>
                </div>
            </div>`;
    }
}

// REF-SEC-20
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
                <div class="toggle-desc">Ratio of caps to trigger (0.7 = 70%)</div>
            </div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.caps_threshold || 0.7}" data-key="caps_threshold" step="0.1" min="0.1" max="1" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3)">ratio</span>
            </div>
        </div>
        <div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Minimum length</div>
                <div class="toggle-desc">Minimum characters before checking</div>
            </div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.caps_min_length || 10}" data-key="caps_min_length" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3)">chars</span>
            </div>
        </div>`,
        null, 'caps'
    );
}

// REF-SEC-21
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
                <div class="toggle-desc">Mentions allowed before triggering</div>
            </div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.mass_mention_max || 5}" data-key="mass_mention_max" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3)">mentions</span>
            </div>
        </div>`,
        null, 'mass_mention'
    );
}

// REF-SEC-22
function renderSecInvite(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('antilink'); return; }
    document.getElementById('content').innerHTML = secModuleCard(
        'Anti-Invite Links',
        'Detects and acts on Discord invite links posted in the server',
        'antilink_enabled',
        'antilink_action',
        null, null, 'antilink'
    );
}

// REF-SEC-23
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
                <div class="toggle-desc">Accounts newer than this are kicked</div>
            </div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.accountage_min_days || 7}" data-key="accountage_min_days" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3)">days</span>
            </div>
        </div>`,
        null, 'accountage'
    );
}

// REF-SEC-24
function renderSecAntiLink(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('antilink_all'); return; }
    document.getElementById('content').innerHTML = secModuleCard(
        'Anti-Link',
        'Blocks all URLs posted in the server (not just Discord invites)',
        'antilink_all_enabled',
        'antilink_all_action',
        null, null, 'antilink_all'
    );
}

// REF-SEC-25
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
                <div class="toggle-desc">Minimum characters before checking</div>
            </div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.repeat_min_length || 20}" data-key="repeat_min_length" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3)">chars</span>
            </div>
        </div>
        <div class="toggle-row">
            <div class="toggle-info">
                <div class="toggle-name">Repeat threshold</div>
                <div class="toggle-desc">Ratio of repeated words to trigger (0.7 = 70%)</div>
            </div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.repeat_threshold || 0.7}" data-key="repeat_threshold" step="0.1" min="0.1" max="1" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3)">ratio</span>
            </div>
        </div>`,
        null, 'repeat'
    );
}

// REF-SEC-26
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
                <div class="toggle-desc">Emojis allowed before triggering</div>
            </div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.emojispam_max || 5}" data-key="emojispam_max" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3)">emojis</span>
            </div>
        </div>`,
        null, 'emojispam'
    );
}

// REF-SEC-27
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
                <div class="toggle-desc">Line breaks allowed before triggering</div>
            </div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.newline_max || 10}" data-key="newline_max" style="width:90px;text-align:right">
                <span style="font-size:11px;color:var(--text3)">lines</span>
            </div>
        </div>`,
        null, 'newline'
    );
}

// REF-SEC-28
function renderSecZalgo(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('zalgo'); return; }
    document.getElementById('content').innerHTML = secModuleCard(
        'Zalgo Text',
        'Detects and removes corrupted or glitched looking text',
        'zalgo_enabled',
        'zalgo_action',
        null, null, 'zalgo'
    );
}

// REF-SEC-29
function renderSecHoist(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('antihoist'); return; }
    document.getElementById('content').innerHTML = secModuleCard(
        'Anti-Hoist',
        'Renames users whose names start with special characters',
        'antihoist_enabled',
        null,
        null, null, 'antihoist'
    );
}


// ============================================================
// MODULE EXEMPTIONS
// ============================================================

// REF-SEC-30
function renderModuleExemptionsTab(module) {
    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Current Exemptions</div></div>
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

// REF-SEC-31
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
                <td><button class="btn-ghost btn-sm" style="color:var(--red)" onclick="removeModuleExemption('${module}','${e.type.toLowerCase()}','${e.target_id}')">Remove</button></td>
            </tr>`).join('');
    } catch(e) { console.error(e); }
}

// REF-SEC-32
async function addModuleExemption(module) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const type      = document.getElementById(`me-type-${module}`)?.value;
    const target_id = document.getElementById(`me-id-${module}`)?.value.trim();
    const note      = document.getElementById(`me-note-${module}`)?.value.trim() || null;
    if (!target_id) { toast('Enter an ID', 'error'); return; }
    try {
        await apiPost(`/api/module-exemptions/${State.guildId}/${module}`, {
            type, target_id, added_by: State.user?.username, note
        });
        if (document.getElementById(`me-id-${module}`))   document.getElementById(`me-id-${module}`).value   = '';
        if (document.getElementById(`me-note-${module}`)) document.getElementById(`me-note-${module}`).value = '';
        toast('Exemption added');
        loadModuleExemptions(module);
    } catch(e) { toast('Failed', 'error'); }
}

// REF-SEC-33
async function removeModuleExemption(module, type, targetId) {
    if (!State.guildId) return;
    try {
        await apiDelete(`/api/module-exemptions/${State.guildId}/${module}`, { type, target_id: targetId });
        toast('Removed');
        loadModuleExemptions(module);
    } catch(e) { toast('Failed', 'error'); }
}


// ============================================================
// PANIC MODE
// ============================================================

// REF-SEC-34
async function renderPanicMode() {
    const el = document.getElementById('content');
    const c  = State.config;

    let panicState = { active: 0 };
    if (State.guildId) {
        try { panicState = await apiGet(`/api/panic/${State.guildId}`); } catch {}
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
                <button class="${isActive ? 'btn-primary' : 'btn-danger'}" onclick="togglePanicMode(${isActive})">
                    ${isActive ? 'Deactivate Panic Mode' : 'Activate Panic Mode'}
                </button>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><div class="card-title">Configuration</div></div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Alert Role</div>
                    <div class="toggle-desc">Role to ping when panic mode triggers</div>
                </div>
                <input id="panic_alert_role" value="${c.panic_alert_role || ''}" placeholder="Role ID" style="width:220px">
            </div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Alert Channel</div>
                    <div class="toggle-desc">Channel for panic alerts (defaults to log channel)</div>
                </div>
                <input id="panic_alert_channel" value="${c.panic_alert_channel || ''}" placeholder="Channel ID" style="width:220px">
            </div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Authorized Roles</div>
                    <div class="toggle-desc">Roles that can use /panic command (admins always can)</div>
                </div>
                <input id="panic_authorized_roles_input" placeholder="Role ID" style="width:220px">
            </div>
            <div style="padding:8px 18px 14px">
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px" id="panic-roles-list">
                    ${(c.panic_authorized_roles || []).map(id => `
                        <div class="word-tag">
                            ${id}
                            <button class="word-remove" onclick="removePanicRole('${id}')">×</button>
                        </div>`).join('') || '<span style="font-size:12px;color:var(--text3)">No roles added</span>'}
                </div>
                <button class="btn-secondary btn-sm" onclick="addPanicRole()">Add Role</button>
            </div>
            <div class="card-footer">
                <button class="btn-primary" onclick="savePanicConfig()">Save</button>
            </div>
        </div>`;
}

// REF-SEC-35
async function togglePanicMode(isActive) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    if (!isActive) {
        if (!confirm('Activate Panic Mode? This will lock ALL channels immediately.')) return;
    }
    try {
        if (isActive) {
            await apiPost(`/api/panic/${State.guildId}/deactivate`, { deactivated_by: State.user?.username });
            toast('Panic Mode deactivated');
        } else {
            await apiPost(`/api/panic/${State.guildId}/activate`, { triggered_by: State.user?.username, channel_snapshot: [] });
            toast('Panic Mode activated', 'error');
        }
        renderPanicMode();
    } catch(e) { toast('Failed', 'error'); }
}

// REF-SEC-36
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

// REF-SEC-37
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

// REF-SEC-38
function removePanicRole(id) {
    const roles = (State.config.panic_authorized_roles || []).filter(r => r !== id);
    State.config.panic_authorized_roles = roles;
    apiPatch(`/api/config/${State.guildId}`, { key: 'panic_authorized_roles', value: roles })
        .then(() => { renderPanicMode(); toast('Role removed'); })
        .catch(() => toast('Failed', 'error'));
}
