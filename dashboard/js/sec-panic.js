// ============================================================
// PENNY DASHBOARD — PANIC MODE
// REF-SEC-34
// ============================================================

async function renderPanicMode() {
    const el = document.getElementById('content');
    const c  = State.config;
    const [channels, roles] = await Promise.all([
        loadChannels(State.guildId),
        loadRoles(State.guildId)
    ]);

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
                ${roleSelect('panic_alert_role', roles, c.panic_alert_role)}
            </div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Alert Channel</div>
                    <div class="toggle-desc">Channel for panic alerts (defaults to log channel)</div>
                </div>
                ${channelSelect('panic_alert_channel', channels, c.panic_alert_channel, [0])}
            </div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Authorized Roles</div>
                    <div class="toggle-desc">Roles that can use /panic command (admins always can)</div>
                </div>
                ${roleSelect('panic_authorized_roles_input', roles, '')}
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