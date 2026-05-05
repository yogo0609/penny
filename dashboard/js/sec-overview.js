// ============================================================
// PENNY DASHBOARD — SECURITY OVERVIEW
// REF-SEC-06
// ============================================================

function renderSecOverview() {
    const el = document.getElementById('content');
    const c  = State.config;

    const modules = [
        { key: 'spam_enabled',               name: 'Spam Detection',       section: 'secspam',              desc: 'Message rate limiting'         },
        { key: 'raid_enabled',               name: 'Anti-Raid',            section: 'secraid',              desc: 'Mass join detection'           },
        { key: 'badwords_enabled',           name: 'Bad Word Filter',      section: 'secbadwords',          desc: 'Prohibited word detection'     },
        { key: 'caps_enabled',               name: 'Caps Filter',          section: 'seccaps',              desc: 'Excessive caps detection'      },
        { key: 'mass_mention_enabled',       name: 'Mass Mention',         section: 'secmention',           desc: 'Mention spam detection'        },
        { key: 'antilink_enabled',           name: 'Anti-Invite Links',    section: 'secinvite',            desc: 'Discord invite link blocking'  },
        { key: 'antilink_all_enabled',       name: 'Anti-Link',            section: 'secantilink',          desc: 'All URL blocking'              },
        { key: 'accountage_enabled',         name: 'Account Age Gate',     section: 'secage',               desc: 'New account filtering'         },
        { key: 'repeat_enabled',             name: 'Repeated Text',        section: 'secrepeat',            desc: 'Copypasta detection'           },
        { key: 'emojispam_enabled',          name: 'Emoji Spam',           section: 'secemoji',             desc: 'Emoji spam detection'          },
        { key: 'newline_enabled',            name: 'Newline Spam',         section: 'secnewline',           desc: 'Line break spam detection'     },
        { key: 'zalgo_enabled',              name: 'Zalgo Text',           section: 'seczalgo',             desc: 'Corrupted text detection'      },
        { key: 'antihoist_enabled',          name: 'Anti-Hoist',           section: 'sechoist',             desc: 'Username hoist prevention'     },
        { key: 'joingate_avatar_enabled',    name: 'Join Gate: Avatar',    section: 'secjoingateavatar',    desc: 'Block users with default avatar'},
        { key: 'joingate_username_enabled',  name: 'Join Gate: Username',  section: 'secjoingateusername',  desc: 'Block suspicious usernames'    },
        { key: 'joingate_rejoin_enabled',    name: 'Join Gate: Rejoin',    section: 'secjoingaterejoin',    desc: 'Block rapid rejoins'           },
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
                <div class="toggle-row" style="cursor:pointer" onclick="openSecurityModule('${m.section}')">
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

function securityTabForSection(section) {
    return {
        secspam:     'Spam',
        secbadwords: 'Bad Words',
        seccaps:     'Caps',
        secmention:  'Mentions',
        secinvite:   'Links',
        secantilink: 'Links',
        secage:      'General',
        secrepeat:   'Other',
        secemoji:    'Other',
        secnewline:  'Other',
        seczalgo:    'Other',
        sechoist:    'Other',
    }[section];
}

function openSecurityModule(section) {
    const tab = securityTabForSection(section);
    if (tab) {
        setSection('security', tab);
    } else {
        setSection(section);
    }
}