// ============================================================
// PENNY DASHBOARD — OVERVIEW
// REF-OV-01
// Dashboard summary and activity feed
// ============================================================

// REF-OV-05 — Animated counter
function countUp(el, target, duration = 800) {
    if (!el) return;
    const start = 0;
    const step  = target / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            el.textContent = target;
            clearInterval(timer);
        } else {
            el.textContent = Math.floor(current);
        }
    }, 16);
}

// REF-OV-02
async function renderOverview(tab) {
    const el = document.getElementById('content');

    if (tab === 'Summary') {
        const guildName = document.getElementById('guild-select')?.selectedOptions[0]?.text || 'Your Server';

        el.innerHTML = `
            <div class="card" style="margin-bottom:16px">
                <div style="display:flex;align-items:center;padding:18px 20px;gap:0">
                    <div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
                        <div>
                            <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Server Name</div>
                            <div style="font-size:20px;font-weight:800;color:var(--text)">${guildName}</div>
                        </div>
                        <div>
                            <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Members</div>
                            <div style="font-size:20px;font-weight:800;color:var(--text)" id="stat-members">—</div>
                        </div>
                        <div>
                            <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Status</div>
                            <div style="font-size:20px;font-weight:800;color:var(--gold)">Active</div>
                        </div>
                        <div>
                            <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Modules Active</div>
                            <div style="font-size:20px;font-weight:800;color:var(--text)" id="stat-modules">—</div>
                        </div>
                        <div>
                            <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Actions Today</div>
                            <div style="font-size:20px;font-weight:800;color:var(--text)" id="stat-actions">—</div>
                        </div>
                        <div>
                            <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Warnings Today</div>
                            <div style="font-size:20px;font-weight:800;color:var(--text)" id="stat-warnings">—</div>
                        </div>
                    </div>
                    <div style="width:1px;background:var(--border);margin:0 24px;align-self:stretch"></div>
                    <div style="text-align:center;flex-shrink:0">
                        <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;color:var(--text3);text-transform:uppercase;margin-bottom:10px">Security</div>
                        <div style="position:relative;width:72px;height:72px;margin:0 auto">
                            <svg width="72" height="72" viewBox="0 0 72 72" style="transform:rotate(-90deg)">
                                <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,184,28,0.1)" stroke-width="8"/>
                                <circle cx="36" cy="36" r="28" fill="none" stroke="var(--gold)" stroke-width="8" stroke-dasharray="0 176" stroke-linecap="round" id="security-ring"/>
                            </svg>
                            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:14px;font-weight:800;color:var(--gold)" id="security-score">—</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <div style="font-size:9px;font-weight:700;letter-spacing:0.12em;color:var(--text3);text-transform:uppercase">QUICK SYSTEMS OVERVIEW</div>
                <button class="btn-ghost btn-sm" onclick="setSection('secoverview')" style="color:var(--gold);font-size:11px;padding:0">View all →</button>
            </div>
            <div id="feature-cards" style="display:flex;flex-direction:column;gap:8px"></div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">
                <div class="card">
                    <div class="card-header"><div class="card-title">Module Status</div></div>
                    <div id="module-status-list"></div>
                </div>
                <div class="card">
                    <div class="card-header"><div class="card-title">Recent Activity</div></div>
                    <div id="activity-feed">
                        <div class="empty-state"><div class="empty-state-title">No server selected</div></div>
                    </div>
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

        const allModules = [
            { key: 'spam_enabled',            name: 'Auto Mod',       section: 'secspam',     icon: 'shield',  color: 'gold'  },
            { key: 'anti_nuke_enabled',        name: 'Anti-Nuke',      section: 'antinuke',    icon: 'nuke',    color: 'blue'  },
            { key: 'verification_enabled',     name: 'Verification',   section: 'verification', icon: 'check',  color: 'green' },
            { key: 'joingate_avatar_enabled',  name: 'Join Gate',      section: 'joingate',    icon: 'gate',    color: 'gold'  },
            { key: 'raid_enabled',             name: 'Anti-Raid',      section: 'secraid',     icon: 'raid',    color: 'blue'  },
            { key: 'panicmode',                name: 'Panic Mode',     section: 'panicmode',   icon: 'panic',   color: 'red'   },
        ];

        const statusModules = [
            { key: 'spam_enabled',         name: 'Anti-Spam'         },
            { key: 'raid_enabled',         name: 'Anti-Raid'         },
            { key: 'badwords_enabled',     name: 'Bad Word Filter'   },
            { key: 'caps_enabled',         name: 'Caps Filter'       },
            { key: 'mass_mention_enabled', name: 'Mass Mention'      },
            { key: 'antilink_enabled',     name: 'Anti-Invite Links' },
            { key: 'antilink_all_enabled', name: 'Anti-Link'         },
            { key: 'accountage_enabled',   name: 'Account Age Gate'  },
            { key: 'anti_nuke_enabled',    name: 'Anti-Nuke'         },
            { key: 'verification_enabled', name: 'Verification'      },
        ];

        const activeCount = statusModules.filter(m => config[m.key]).length;
        countUp(document.getElementById('stat-modules'), activeCount);
        document.getElementById('stat-modules').textContent += ` / ${statusModules.length}`;

        // Security score
        const checks = [
            config.spam_enabled,
            config.raid_enabled,
            config.anti_nuke_enabled,
            !!config.log_channel_id,
            !!config.audit_channel_id,
            !config.test_mode,
        ];
        const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
        const circumference = 2 * Math.PI * 28;
        const dash = (score / 100) * circumference;
        document.getElementById('security-ring').setAttribute('stroke-dasharray', `${dash} ${circumference}`);
        document.getElementById('security-score').textContent = score + '%';

        // Feature cards
        const icons = {
            shield: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 1L3 3.5v5c0 4 2.5 6.5 6 7.5 3.5-1 6-3.5 6-7.5v-5L9 1z"/></svg>`,
            nuke:   `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 1l7 2.5v5c0 4.5-3 7-7 8.5C2 15.5 0 13 0 8.5V3.5L9 1z"/></svg>`,
            check:  `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="14" height="14" rx="3"/><path d="M5 9l3 3 5-5"/></svg>`,
            gate:   `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9h12M9 3l6 6-6 6"/></svg>`,
            raid:   `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="9" r="7"/><path d="M9 5v4l3 2"/></svg>`,
            panic:  `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2l1.5 5h5l-4 3 1.5 5L9 12l-4 3 1.5-5-4-3h5z"/></svg>`,
        };
        const colorMap = {
            gold:  { bg: 'rgba(255,184,28,0.1)',  border: 'rgba(255,184,28,0.2)',  color: 'var(--gold)' },
            blue:  { bg: 'rgba(56,139,224,0.1)',  border: 'rgba(56,139,224,0.2)',  color: 'var(--blue)' },
            green: { bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.2)',   color: 'var(--green)' },
            red:   { bg: 'rgba(220,38,38,0.1)',   border: 'rgba(220,38,38,0.2)',   color: 'var(--red)' },
        };

        const descMap = {
            'Auto Mod':     'Anti spam, bad words, caps, mass mention and all message filters',
            'Anti-Nuke':    'Monitors staff actions and guards against mass server destruction',
            'Verification': 'Button gate for new members joining your server',
            'Join Gate':    'Instant filters that scan new members and bots joining',
            'Anti-Raid':    'Detects and responds to mass join events',
            'Panic Mode':   'Instantly lock all channels in an emergency',
        };

        document.getElementById('feature-cards').innerHTML = allModules.map(m => {
            const on = m.key === 'panicmode' ? false : config[m.key];
            const c  = colorMap[m.color];
            return `
            <div class="card" style="margin-bottom:0;cursor:pointer;transition:border-color 0.15s" onmouseenter="this.style.borderColor='var(--gold-border)'" onmouseleave="this.style.borderColor='var(--border)'" onclick="setSection('${m.section}')">
                <div style="display:flex;align-items:center;gap:16px;padding:14px 18px">
                    <div style="width:40px;height:40px;border-radius:10px;background:${c.bg};border:1px solid ${c.border};display:flex;align-items:center;justify-content:center;color:${c.color};flex-shrink:0">
                        ${icons[m.icon]}
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:2px">${m.name}</div>
                        <div style="font-size:11px;color:var(--text3)">${descMap[m.name]}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px;flex-shrink:0">
                        <span class="ms-badge ${on ? 'ms-on' : 'ms-off'}">${on ? 'Active' : 'Off'}</span>
                        <span style="font-size:10px;font-weight:700;letter-spacing:0.06em;color:var(--text3)">SETTINGS</span>
                        <label class="toggle" onclick="event.stopPropagation()">
                            <input type="checkbox" ${on ? 'checked' : ''} onchange="saveSecToggle('${m.key}', this.checked)">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>`;
        }).join('');

// Module status list — random sample with view all
        const shuffled = [...statusModules].sort(() => Math.random() - 0.5).slice(0, 6);
        document.getElementById('module-status-list').innerHTML =
            shuffled.map(m => {
                const on = config[m.key];
                return `<div class="module-status-row">
                    <div class="ms-dot ${on ? 'on' : 'off'}"></div>
                    <div class="ms-name">${m.name}</div>
                    <span class="ms-badge ${on ? 'ms-on' : 'ms-off'}">${on ? 'Active' : 'Off'}</span>
                </div>`;
            }).join('') +
            `<div style="padding:10px 18px;border-top:1px solid var(--border)">
                <button class="btn-ghost btn-sm" onclick="setSection('secoverview')" style="color:var(--gold);font-size:11px;padding:0">View all modules →</button>
            </div>`;

        // Stats
        const [logs, warnings, bans] = await Promise.all([
            apiGet(`/api/logs/${State.guildId}?limit=100`),
            apiGet(`/api/warnings/${State.guildId}`),
            apiGet(`/api/bans/${State.guildId}`),
        ]);

        countUp(document.getElementById('stat-actions'),  logs?.length     || 0);
        countUp(document.getElementById('stat-warnings'), warnings?.length || 0);

        // Activity feed
        const colorFeed = {
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
                    <div class="activity-dot" style="background:${colorFeed[l.action] || 'var(--text3)'}"></div>
                    <div>
                        <div class="activity-text"><strong>${l.action}</strong>${l.target_tag ? ' — ' + l.target_tag : ''}</div>
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