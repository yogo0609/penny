// ============================================================
// PENNY DASHBOARD — AUTO-MOD
// REF-SEC-07
// ============================================================

function renderSecurity(tab) {
    const el = document.getElementById('content');
    const c  = State.config;

    if (tab === 'General') {
        const modules = [
            { key: 'spam_enabled',         name: 'Spam Detection',    desc: 'Rate-limit messages per user',          action: 'spam_action'         },
            { key: 'badwords_enabled',      name: 'Bad Word Filter',   desc: 'Block prohibited words and phrases',    action: 'badwords_action'     },
            { key: 'caps_enabled',          name: 'Caps Filter',       desc: 'Limit excessive capital letters',       action: 'caps_action'         },
            { key: 'mass_mention_enabled',  name: 'Mass Mention',      desc: 'Prevent mention spam',                  action: 'mass_mention_action' },
            { key: 'antilink_enabled',      name: 'Anti-Invite Links', desc: 'Block Discord invite links',            action: 'antilink_action'     },
            { key: 'antilink_all_enabled',  name: 'Anti-Link',         desc: 'Block all URLs',                        action: 'antilink_all_action' },
            { key: 'repeat_enabled',        name: 'Repeated Text',     desc: 'Detect copypasta and repeated content', action: 'repeat_action'       },
            { key: 'emojispam_enabled',     name: 'Emoji Spam',        desc: 'Limit excessive emoji usage',           action: 'emojispam_action'    },
            { key: 'newline_enabled',       name: 'Newline Spam',      desc: 'Limit excessive line breaks',           action: 'newline_action'      },
            { key: 'zalgo_enabled',         name: 'Zalgo Text',        desc: 'Remove corrupted/glitched text',        action: 'zalgo_action'        },
            { key: 'antihoist_enabled',     name: 'Anti-Hoist',        desc: 'Fix usernames starting with symbols',   action: null                  },
            { key: 'accountage_enabled',    name: 'Account Age Gate',  desc: 'Kick new accounts below minimum age',   action: null                  },
        ];

        const active = modules.filter(m => c[m.key]).length;

        el.innerHTML = `
            <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
                <div class="stat-card blue">
                    <div class="stat-label">Active Filters</div>
                    <div class="stat-value">${active}<span style="font-size:14px;color:var(--text2)">/${modules.length}</span></div>
                </div>
                <div class="stat-card gold">
                    <div class="stat-label">Inactive</div>
                    <div class="stat-value">${modules.length - active}</div>
                </div>
                <div class="stat-card ${active === modules.length ? 'green' : active > modules.length / 2 ? 'gold' : 'red'}">
                    <div class="stat-label">Coverage</div>
                    <div class="stat-value">${Math.round((active / modules.length) * 100)}%</div>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <div class="card-title">All Filters</div>
                    <div class="card-desc">Enable or disable each filter. Click a tab above to configure thresholds and exemptions.</div>
                </div>
                ${modules.map(m => `
                    <div class="toggle-row">
                        <div class="toggle-info">
                            <div class="toggle-name">${m.name}</div>
                            <div class="toggle-desc">${m.desc}</div>
                        </div>
                        <div class="toggle-right" style="gap:12px">
                            ${m.action ? `<span class="action-pill" onclick="cycleAction(this,'${m.action}')" title="Click to change action">${c[m.action] || 'ladder'}</span>` : ''}
                            <label class="toggle">
                                <input type="checkbox" ${c[m.key] ? 'checked' : ''} onchange="toggleModule('${m.key}', this.checked)">
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>`).join('')}
            </div>`;
    }

    if (tab === 'Spam') {
        el.innerHTML = secModuleCard(
            'Spam Detection',
            'Detects users sending too many messages in a short window. The bot tracks message timestamps per user and triggers when the rate exceeds your threshold.',
            'spam_enabled', 'spam_action',
            `<div class="toggle-row">
                <div class="toggle-info"><div class="toggle-name">Max messages</div><div class="toggle-desc">Messages allowed in the time window before triggering</div></div>
                <div class="toggle-right" style="gap:8px">
                    <input type="number" value="${c.spam_max_messages || 5}" data-key="spam_max_messages" style="width:90px;text-align:right">
                    <span style="font-size:11px;color:var(--text3)">messages</span>
                </div>
            </div>
            <div class="toggle-row">
                <div class="toggle-info"><div class="toggle-name">Time window</div><div class="toggle-desc">Rolling window in milliseconds (5000 = 5 seconds)</div></div>
                <div class="toggle-right" style="gap:8px">
                    <input type="number" value="${c.spam_window_ms || 5000}" data-key="spam_window_ms" style="width:90px;text-align:right">
                    <span style="font-size:11px;color:var(--text3)">ms</span>
                </div>
            </div>`,
            null, 'spam'
        );
    }

    if (tab === 'Bad Words') {
        const words = c.badwords_list || [];
        el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
                <div>
                    <div class="card" style="margin-bottom:14px">
                        <div class="toggle-row">
                            <div class="toggle-info">
                                <div class="toggle-name">Bad Word Filter</div>
                                <div class="toggle-desc">Detects and acts on messages containing prohibited words or phrases</div>
                            </div>
                            <label class="toggle">
                                <input type="checkbox" id="badwords_enabled" ${c.badwords_enabled ? 'checked' : ''} onchange="saveSecToggle('badwords_enabled', this.checked)">
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="toggle-row">
                            <div class="toggle-info"><div class="toggle-name">Action</div><div class="toggle-desc">What Penny does when triggered</div></div>
                            <div class="toggle-right">${secActionSelect('badwords_action', c.badwords_action)}</div>
                        </div>
                        <div class="card-footer">
                            <button class="btn-primary" onclick="saveSecModule('badwords_enabled','badwords_action',[])">Save</button>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header"><div class="card-title">Word List</div></div>
                        <div class="word-grid" id="word-grid">
                            ${words.map(w => wordTag(w)).join('') || '<span style="color:var(--text3);font-size:13px;padding:4px">No words added yet</span>'}
                        </div>
                        <div class="word-add">
                            <input class="word-input" id="word-input" placeholder="Add a word or phrase...">
                            <button class="btn-primary btn-sm" onclick="addBadWord()">Add</button>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="toggle-row" style="border-bottom:1px solid var(--border)">
                        <div class="toggle-info"><div class="toggle-name">Exemptions</div><div class="toggle-desc">Roles, users and channels exempt from bad word filter</div></div>
                    </div>
                    <div class="toggle-row">
                        <div class="toggle-info"><div class="toggle-name">Type</div></div>
                        <select id="me-type-badwords" style="width:160px" onchange="filterExemptionId('badwords', this.value)">
                            <option value="role">Role</option><option value="user">User</option><option value="channel">Channel</option>
                        </select>
                    </div>
                    <div class="toggle-row">
                        <div class="toggle-info"><div class="toggle-name">ID</div></div>
                        <select id="me-id-badwords" style="width:220px">
                            <option value="">— Select —</option>
                            ${(State.roles||[]).filter(r=>r.name!=='@everyone').map(r=>`<option value="${r.role_id}" data-t="role">@${r.name}</option>`).join('')}
                            ${(State.channels||[]).filter(ch=>parseInt(ch.type)===0).map(ch=>`<option value="${ch.channel_id}" data-t="channel">#${ch.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="toggle-row">
                        <div class="toggle-info"><div class="toggle-name">Note</div></div>
                        <input id="me-note-badwords" placeholder="Reason" style="width:220px">
                    </div>
                    <div class="card-footer">
                        <button class="btn-primary" onclick="addModuleExemption('badwords')">Add</button>
                    </div>
                    <div id="me-exemptions-badwords" style="padding:8px 0"></div>
                </div>
            </div>`;
        loadModuleExemptions('badwords');
    }

    if (tab === 'Caps') {
        el.innerHTML = secModuleCard(
            'Caps Filter',
            'Detects messages with an excessive ratio of capital letters. Only applies to messages longer than the minimum length.',
            'caps_enabled', 'caps_action',
            `<div class="toggle-row">
                <div class="toggle-info"><div class="toggle-name">Caps threshold</div><div class="toggle-desc">Ratio of caps to trigger — 0.7 means 70% capitals</div></div>
                <div class="toggle-right" style="gap:8px">
                    <input type="number" value="${c.caps_threshold || 0.7}" data-key="caps_threshold" step="0.1" min="0.1" max="1" style="width:90px;text-align:right">
                    <span style="font-size:11px;color:var(--text3)">ratio</span>
                </div>
            </div>
            <div class="toggle-row">
                <div class="toggle-info"><div class="toggle-name">Minimum length</div><div class="toggle-desc">Message must be at least this many characters</div></div>
                <div class="toggle-right" style="gap:8px">
                    <input type="number" value="${c.caps_min_length || 10}" data-key="caps_min_length" style="width:90px;text-align:right">
                    <span style="font-size:11px;color:var(--text3)">chars</span>
                </div>
            </div>`,
            null, 'caps'
        );
    }

    if (tab === 'Mentions') {
        el.innerHTML = secModuleCard(
            'Mass Mention',
            'Detects messages that mention too many users or roles at once. Both @user and @role mentions are counted.',
            'mass_mention_enabled', 'mass_mention_action',
            `<div class="toggle-row">
                <div class="toggle-info"><div class="toggle-name">Max mentions</div><div class="toggle-desc">Total mentions (users + roles) allowed per message</div></div>
                <div class="toggle-right" style="gap:8px">
                    <input type="number" value="${c.mass_mention_max || 5}" data-key="mass_mention_max" style="width:90px;text-align:right">
                    <span style="font-size:11px;color:var(--text3)">mentions</span>
                </div>
            </div>`,
            null, 'mass_mention'
        );
    }

    if (tab === 'Links') {
        el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                ${secModuleCard('Anti-Invite Links', 'Blocks Discord invite links (discord.gg/...). Use this if you want to allow regular URLs but not server invites.', 'antilink_enabled', 'antilink_action', null, null, 'antilink')}
                ${secModuleCard('Anti-Link', 'Blocks all URLs posted in the server. More aggressive than Anti-Invite — catches any http:// or https:// link.', 'antilink_all_enabled', 'antilink_all_action', null, null, 'antilink_all')}
            </div>`;
    }

    if (tab === 'Other') {
        el.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:14px">
                ${secModuleCard('Repeated Text', 'Detects copypasta and messages with excessive word repetition.', 'repeat_enabled', 'repeat_action',
                    `<div class="toggle-row">
                        <div class="toggle-info"><div class="toggle-name">Min length</div><div class="toggle-desc">Minimum characters before checking</div></div>
                        <div class="toggle-right" style="gap:8px"><input type="number" value="${c.repeat_min_length || 20}" data-key="repeat_min_length" style="width:90px;text-align:right"><span style="font-size:11px;color:var(--text3)">chars</span></div>
                    </div>
                    <div class="toggle-row">
                        <div class="toggle-info"><div class="toggle-name">Repeat threshold</div><div class="toggle-desc">Ratio of repeated words to trigger</div></div>
                        <div class="toggle-right" style="gap:8px"><input type="number" value="${c.repeat_threshold || 0.7}" data-key="repeat_threshold" step="0.1" min="0.1" max="1" style="width:90px;text-align:right"><span style="font-size:11px;color:var(--text3)">ratio</span></div>
                    </div>`, null, 'repeat')}
                ${secModuleCard('Emoji Spam', 'Detects messages with too many emojis.', 'emojispam_enabled', 'emojispam_action',
                    `<div class="toggle-row">
                        <div class="toggle-info"><div class="toggle-name">Max emojis</div><div class="toggle-desc">Emoji count allowed per message</div></div>
                        <div class="toggle-right" style="gap:8px"><input type="number" value="${c.emojispam_max || 5}" data-key="emojispam_max" style="width:90px;text-align:right"><span style="font-size:11px;color:var(--text3)">emojis</span></div>
                    </div>`, null, 'emojispam')}
                ${secModuleCard('Newline Spam', 'Detects messages with excessive line breaks.', 'newline_enabled', 'newline_action',
                    `<div class="toggle-row">
                        <div class="toggle-info"><div class="toggle-name">Max lines</div><div class="toggle-desc">Line breaks allowed per message</div></div>
                        <div class="toggle-right" style="gap:8px"><input type="number" value="${c.newline_max || 10}" data-key="newline_max" style="width:90px;text-align:right"><span style="font-size:11px;color:var(--text3)">lines</span></div>
                    </div>`, null, 'newline')}
                ${secModuleCard('Zalgo Text', 'Detects and removes corrupted or glitched-looking text.', 'zalgo_enabled', 'zalgo_action', null, null, 'zalgo')}
                ${secModuleCard('Anti-Hoist', 'Renames users whose display name starts with special characters.', 'antihoist_enabled', null, null, null, 'antihoist')}
            </div>`;
    }
}

// REF-SEC-08
function renderProtection(tab) { renderSecurity(tab); }

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

// REF-SEC-17
function renderSecSpam(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('spam'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = secModuleCard(
        'Spam Detection',
        'Detects users sending too many messages in a short window',
        'spam_enabled', 'spam_action',
        `<div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Max messages</div><div class="toggle-desc">Messages allowed before triggering</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.spam_max_messages || 5}" data-key="spam_max_messages" style="width:90px;text-align:right">
            </div>
        </div>
        <div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Time window</div><div class="toggle-desc">Rolling window in milliseconds</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.spam_window_ms || 5000}" data-key="spam_window_ms" style="width:90px;text-align:right">
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
        'raid_enabled', 'raid_action',
        `<div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Max joins</div><div class="toggle-desc">Joins allowed before triggering</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.raid_max_joins || 5}" data-key="raid_max_joins" style="width:90px;text-align:right">
            </div>
        </div>
        <div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Time window</div><div class="toggle-desc">Rolling window in milliseconds</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.raid_window_ms || 10000}" data-key="raid_window_ms" style="width:90px;text-align:right">
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
            'Bad Word Filter', 'Detects and acts on messages containing prohibited words',
            'badwords_enabled', 'badwords_action', null, null, 'badwords'
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
        'Caps Filter', 'Detects messages with excessive capital letters',
        'caps_enabled', 'caps_action',
        `<div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Caps threshold</div><div class="toggle-desc">Ratio of caps to trigger (0.7 = 70%)</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.caps_threshold || 0.7}" data-key="caps_threshold" step="0.1" min="0.1" max="1" style="width:90px;text-align:right">
            </div>
        </div>
        <div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Minimum length</div><div class="toggle-desc">Minimum characters before checking</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.caps_min_length || 10}" data-key="caps_min_length" style="width:90px;text-align:right">
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
        'Mass Mention', 'Detects messages that mention too many users or roles at once',
        'mass_mention_enabled', 'mass_mention_action',
        `<div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Max mentions</div><div class="toggle-desc">Mentions allowed before triggering</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.mass_mention_max || 5}" data-key="mass_mention_max" style="width:90px;text-align:right">
            </div>
        </div>`,
        null, 'mass_mention'
    );
}

// REF-SEC-22
function renderSecInvite(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('antilink'); return; }
    document.getElementById('content').innerHTML = secModuleCard(
        'Anti-Invite Links', 'Detects and acts on Discord invite links posted in the server',
        'antilink_enabled', 'antilink_action', null, null, 'antilink'
    );
}

// REF-SEC-23
function renderSecAge(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('accountage'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = secModuleCard(
        'Account Age Gate', 'Kicks new members whose Discord account is too new',
        'accountage_enabled', null,
        `<div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Minimum account age</div><div class="toggle-desc">Accounts newer than this are kicked</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.accountage_min_days || 7}" data-key="accountage_min_days" style="width:90px;text-align:right">
            </div>
        </div>`,
        null, 'accountage'
    );
}

// REF-SEC-24
function renderSecAntiLink(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('antilink_all'); return; }
    document.getElementById('content').innerHTML = secModuleCard(
        'Anti-Link', 'Blocks all URLs posted in the server (not just Discord invites)',
        'antilink_all_enabled', 'antilink_all_action', null, null, 'antilink_all'
    );
}

// REF-SEC-25
function renderSecRepeat(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('repeat'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = secModuleCard(
        'Repeated Text', 'Detects copypasta and messages with excessive repeated words',
        'repeat_enabled', 'repeat_action',
        `<div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Minimum length</div><div class="toggle-desc">Minimum characters before checking</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.repeat_min_length || 20}" data-key="repeat_min_length" style="width:90px;text-align:right">
            </div>
        </div>
        <div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Repeat threshold</div><div class="toggle-desc">Ratio of repeated words to trigger (0.7 = 70%)</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.repeat_threshold || 0.7}" data-key="repeat_threshold" step="0.1" min="0.1" max="1" style="width:90px;text-align:right">
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
        'Emoji Spam', 'Detects messages containing too many emojis',
        'emojispam_enabled', 'emojispam_action',
        `<div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Max emojis</div><div class="toggle-desc">Emojis allowed before triggering</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.emojispam_max || 5}" data-key="emojispam_max" style="width:90px;text-align:right">
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
        'Newline Spam', 'Detects messages with excessive line breaks',
        'newline_enabled', 'newline_action',
        `<div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Max lines</div><div class="toggle-desc">Line breaks allowed before triggering</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.newline_max || 10}" data-key="newline_max" style="width:90px;text-align:right">
            </div>
        </div>`,
        null, 'newline'
    );
}

// REF-SEC-28
function renderSecZalgo(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('zalgo'); return; }
    document.getElementById('content').innerHTML = secModuleCard(
        'Zalgo Text', 'Detects and removes corrupted or glitched looking text',
        'zalgo_enabled', 'zalgo_action', null, null, 'zalgo'
    );
}

// REF-SEC-29
function renderSecHoist(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('antihoist'); return; }
    document.getElementById('content').innerHTML = secModuleCard(
        'Anti-Hoist', 'Renames users whose names start with special characters',
        'antihoist_enabled', null, null, null, 'antihoist'
    );
}

// REF-SEC-40
function renderSecAntiNuke(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('antinuke'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = secModuleCard(
        'Anti-Nuke', 'Prevents mass destructive actions like channel or role deletion',
        'anti_nuke_enabled', 'anti_nuke_action',
        `<div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Threshold</div><div class="toggle-desc">Actions allowed before triggering</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.anti_nuke_threshold || 4}" data-key="anti_nuke_threshold" style="width:90px;text-align:right">
            </div>
        </div>
        <div class="toggle-row">
            <div class="toggle-info"><div class="toggle-name">Time Window</div><div class="toggle-desc">Rolling window in milliseconds</div></div>
            <div class="toggle-right" style="gap:8px">
                <input type="number" value="${c.anti_nuke_window_ms || 10000}" data-key="anti_nuke_window_ms" style="width:90px;text-align:right">
            </div>
        </div>`,
        null, 'antinuke'
    );
}