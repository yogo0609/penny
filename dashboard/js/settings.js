// ============================================================
// PENNY DASHBOARD — SETTINGS
// REF-SET-01
// General settings, appearance, data management
// ============================================================


// ============================================================
// SETTINGS RENDERER
// ============================================================

// REF-SET-02
function renderSettings(tab) {
    const el = document.getElementById('content');
    const c  = State.config;

    if (tab === 'General') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">General</div></div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Test Mode</div>
                        <div class="toggle-desc">Penny detects violations but takes no action</div>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" id="test_mode" ${c.test_mode ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Log Channel ID</div>
                        <div class="toggle-desc">Channel where Penny posts moderation actions</div>
                    </div>
                    <input id="log_channel_id" value="${c.log_channel_id || ''}" placeholder="Channel ID" style="width:220px">
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Max Warnings</div>
                        <div class="toggle-desc">Warnings before punishment ladder triggers (fallback if no ladder configured)</div>
                    </div>
                    <input type="number" id="max_warnings" value="${c.max_warnings || 3}" style="width:90px;text-align:right">
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
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Avatar</div>
                        <div class="toggle-desc">Custom avatar for the dashboard brand</div>
                    </div>
                    <input type="file" id="avatar-upload" accept="image/*" onchange="uploadAvatar(this)" style="font-size:13px;width:auto">
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Page Title</div>
                        <div class="toggle-desc">Browser tab title</div>
                    </div>
                    <input id="dash-title" value="${document.title}" style="width:220px">
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
                    <button class="btn-primary btn-sm" onclick="exportData()">Export</button>
                </div>
            </div>
            <div class="card" style="border-color:#fecaca">
                <div class="danger-header"><div class="danger-title">Danger Zone — All actions are irreversible</div></div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Clear Mod Logs</div>
                        <div class="toggle-desc">Permanently deletes all mod log entries for this server</div>
                    </div>
                    <button class="btn-danger btn-sm" onclick="dangerClear('logs', 'mod logs')">Clear</button>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Clear Audit Logs</div>
                        <div class="toggle-desc">Permanently deletes all audit log entries for this server</div>
                    </div>
                    <button class="btn-danger btn-sm" onclick="dangerClear('audit', 'audit logs')">Clear</button>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Clear Warnings</div>
                        <div class="toggle-desc">Permanently deletes all warnings for this server</div>
                    </div>
                    <button class="btn-danger btn-sm" onclick="dangerClear('warnings', 'warnings')">Clear</button>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Clear Ban Records</div>
                        <div class="toggle-desc">Removes ban history from Penny's database (does not unban on Discord)</div>
                    </div>
                    <button class="btn-danger btn-sm" onclick="dangerClear('bans', 'ban records')">Clear</button>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Clear Punishment Ladder</div>
                        <div class="toggle-desc">Resets the punishment ladder (bot falls back to default behavior)</div>
                    </div>
                    <button class="btn-danger btn-sm" onclick="dangerClear('ladder', 'punishment ladder')">Clear</button>
                </div>
            </div>`;
    }
}


// ============================================================
// GENERAL SETTINGS
// ============================================================

// REF-SET-03
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
    } catch(e) { toast('Failed', 'error'); }
}


// ============================================================
// DATA MANAGEMENT
// ============================================================

// REF-SET-04
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

// REF-SET-05
async function dangerClear(type, label) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    openModal(`Clear ${label}`, `
        <div style="font-size:13px;color:var(--text2);line-height:1.6">
            Are you sure you want to permanently delete all <strong>${label}</strong> for this server?
            <br><br>
            <span style="color:var(--red);font-weight:600">This cannot be undone.</span>
        </div>
    `, [
        { label: 'Cancel',          class: 'btn-secondary', action: 'closeModal()' },
        { label: `Clear ${label}`,  class: 'btn-danger',    action: `confirmDangerClear('${type}','${label}')` },
    ]);
}

// REF-SET-06
async function confirmDangerClear(type, label) {
    if (!State.guildId) return;
    try {
        await apiDelete(`/api/data/${type}/${State.guildId}`);
        closeModal();
        toast(`${label} cleared`);
    } catch(e) { toast('Failed', 'error'); }
}
