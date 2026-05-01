// ============================================================
// PENNY DASHBOARD — AUDIT LOG
// REF-AUD-01
// Audit log events and settings
// ============================================================


// REF-AUD-02
async function renderAuditLog(tab) {
    const el = document.getElementById('content');

    if (tab === 'Events') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Audit Events</div>
                    <select id="audit-category" onchange="filterAuditLog()" style="width:160px">
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
        const channels = await loadChannels(State.guildId);
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Audit Channel</div></div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Default Audit Channel</div>
                        <div class="toggle-desc">Channel where audit events are posted</div>
                    </div>
                    ${channelSelect('audit_channel_id', channels, State.config.audit_channel_id, [0])}
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
                ${auditToggle('audit_members_roles',   'Role Added or Removed')}
                ${auditToggle('audit_members_nick',    'Nickname Changed')}
                ${auditToggle('audit_members_ban',     'Member Banned')}
                ${auditToggle('audit_members_unban',   'Member Unbanned')}
                ${auditToggle('audit_members_kick',    'Member Kicked')}
                ${auditToggle('audit_members_timeout', 'Member Timed Out')}
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">Server Events</div></div>
                ${auditToggle('audit_server_channel', 'Channel Created, Deleted or Updated')}
                ${auditToggle('audit_server_role',    'Role Created, Deleted or Updated')}
                ${auditToggle('audit_server_emoji',   'Emoji Created or Deleted')}
                ${auditToggle('audit_server_webhook', 'Webhook Updated')}
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">Voice Events</div></div>
                ${auditToggle('audit_voice', 'Voice Join, Leave or Move')}
            </div>`;
    }
}

// REF-AUD-03
function renderAuditConfig() { renderAuditLog('Settings'); }

// REF-AUD-04
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

// REF-AUD-05
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
                <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(l.detail || '—').replace(/\*\*/g,'').replace(/`/g,'')}</td>
                <td>${new Date(l.created_at).toLocaleString()}</td>
            </tr>`).join('');
    } catch(e) { console.error(e); }
}

// REF-AUD-06
function filterAuditLog() {
    const category = document.getElementById('audit-category').value;
    loadAuditLog(category || null);
}

// REF-AUD-07
async function loadAuditSettings() {}

// REF-AUD-09
async function saveAuditSettings() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const updates = {
        audit_channel_id: document.getElementById('audit_channel_id').value,
    };
    try {
        await apiPut(`/api/config/${State.guildId}`, updates);
        Object.assign(State.config, updates);
        toast('Saved');
    } catch(e) { toast('Failed', 'error'); }
}

// REF-AUD-08
async function toggleAudit(key, value) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    try {
        await apiPatch(`/api/config/${State.guildId}`, { key, value });
        State.config[key] = value;
        toast(value ? 'Enabled' : 'Disabled');
    } catch(e) { toast('Failed', 'error'); }
}

// REF-AUD-09
async function saveAuditSettings() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const updates = {
        audit_channel_id: document.getElementById('audit_channel_id').value.trim(),
    };
    try {
        await apiPut(`/api/config/${State.guildId}`, updates);
        Object.assign(State.config, updates);
        toast('Saved');
    } catch(e) { toast('Failed', 'error'); }
}
