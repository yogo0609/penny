// ============================================================
// PENNY DASHBOARD — OVERVIEW
// REF-OV-01
// Dashboard summary and activity feed
// ============================================================


// REF-OV-02
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
                        <div id="health-badge" style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600"></div>
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


// REF-OV-03
async function loadOverviewStats() {
    if (!State.guildId) return;

    try {
        const config = State.config;

        const modules = [
            { key: 'spam_enabled',         name: 'Anti-Spam'          },
            { key: 'raid_enabled',         name: 'Anti-Raid'          },
            { key: 'badwords_enabled',     name: 'Bad Word Filter'    },
            { key: 'caps_enabled',         name: 'Caps Filter'        },
            { key: 'mass_mention_enabled', name: 'Mass Mention'       },
            { key: 'antilink_enabled',     name: 'Anti-Invite Links'  },
            { key: 'antilink_all_enabled', name: 'Anti-Link'          },
            { key: 'accountage_enabled',   name: 'Account Age Gate'   },
            { key: 'repeat_enabled',       name: 'Repeated Text'      },
            { key: 'emojispam_enabled',    name: 'Emoji Spam'         },
            { key: 'newline_enabled',      name: 'Newline Spam'       },
            { key: 'zalgo_enabled',        name: 'Zalgo Text'         },
            { key: 'antihoist_enabled',    name: 'Anti-Hoist'         },
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

        document.getElementById('stat-actions').textContent  = logs?.length  || 0;
        document.getElementById('stat-members').textContent  = '—';
        document.getElementById('stat-warnings').textContent = warnings?.length || 0;
        document.getElementById('stat-bans').textContent     = bans?.length  || 0;

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
        const feed   = document.getElementById('activity-feed');

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


// REF-OV-04
async function loadActivity() {
    if (!State.guildId) return;
    try {
        const logs     = await apiGet(`/api/logs/${State.guildId}?limit=100`);
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
