// ============================================================
// PENNY DASHBOARD — MODERATION
// REF-MOD-01
// Mod log, warnings, punishment ladder, exemptions
// ============================================================


// ============================================================
// MOD LOG
// ============================================================

// REF-MOD-02
function renderModLog() {
    document.getElementById('content').innerHTML = `
        <div class="card">
            <table class="data-table">
                <thead><tr><th>Event</th><th>Target</th><th>Moderator</th><th>Reason</th><th>Time</th></tr></thead>
                <tbody id="modlog-body">
                    <tr><td colspan="5" class="table-loading">Loading...</td></tr>
                </tbody>
            </table>
        </div>`;
    loadModLog();
}

// REF-MOD-03
async function loadModLog() {
    if (!State.guildId) return;
    try {
        const logs     = await apiGet(`/api/logs/${State.guildId}?limit=50`);
        const body     = document.getElementById('modlog-body');
        const badgeMap = {
            'SPAM DETECTED': 'badge-spam',
            'WARN ISSUED':   'badge-warn',
            'BAD WORD':      'badge-warn',
            'CAPS FILTER':   'badge-caps',
            'RAID DETECTED': 'badge-raid',
            'MASS MENTION':  'badge-spam',
            'INVITE LINK':   'badge-spam',
            'KICK':          'badge-spam',
            'BAN':           'badge-raid',
            'MUTE':          'badge-warn',
            'TEMPBAN':       'badge-raid',
            'TEMPMUTE':      'badge-warn',
        };
        if (!logs.length) {
            body.innerHTML = `<tr><td colspan="5" class="table-loading">No actions logged</td></tr>`;
            return;
        }
        body.innerHTML = logs.map(l => `
            <tr>
                <td><span class="badge ${badgeMap[l.action] || 'badge-caps'}">${l.action}</span></td>
                <td>${l.target_tag || l.target_id || '—'}</td>
                <td>${l.moderator || '—'}</td>
                <td>${(l.reason || '—').replace(/\*\*/g, '').replace(/`/g, '')}</td>
                <td>${new Date(l.created_at).toLocaleString()}</td>
            </tr>`).join('');
    } catch(e) { console.error(e); }
}


// ============================================================
// WARNINGS
// ============================================================

// REF-MOD-04
function renderWarnings() {
    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">Warnings</div>
                <div style="display:flex;gap:8px">
                    <input id="warn-lookup" placeholder="Filter by User ID" style="width:180px">
                    <button class="btn-primary btn-sm" onclick="lookupWarnings()">Filter</button>
                    <button class="btn-secondary btn-sm" onclick="loadAllWarnings()">Show All</button>
                </div>
            </div>
            <table class="data-table">
                <thead><tr><th>User</th><th>Reason</th><th>Issued By</th><th>Time</th></tr></thead>
                <tbody id="warnings-body"><tr><td colspan="4" class="table-loading">Loading...</td></tr></tbody>
            </table>
        </div>`;
    loadAllWarnings();
}

// REF-MOD-05
async function lookupWarnings() {
    const userId = document.getElementById('warn-lookup').value.trim();
    if (!userId || !State.guildId) return;
    try {
        const warnings = await apiGet(`/api/warnings/${State.guildId}/${userId}`);
        renderWarningsTable(warnings);
    } catch(e) { toast('Lookup failed', 'error'); }
}

// REF-MOD-06
async function loadAllWarnings() {
    if (!State.guildId) return;
    try {
        const warnings = await apiGet(`/api/warnings/${State.guildId}`);
        renderWarningsTable(warnings);
    } catch(e) { console.error(e); }
}

// REF-MOD-07
function renderWarningsTable(warnings) {
    const body = document.getElementById('warnings-body');
    if (!warnings.length) {
        body.innerHTML = `<tr><td colspan="4" class="table-loading">No warnings found</td></tr>`;
        return;
    }
    body.innerHTML = warnings.map(w => `
        <tr>
            <td>${w.user_tag}</td>
            <td>${w.reason || '—'}</td>
            <td>${w.issued_by || '—'}</td>
            <td>${new Date(w.issued_at).toLocaleString()}</td>
        </tr>`).join('');
}


// ============================================================
// PUNISHMENT LADDER
// ============================================================

// REF-MOD-08
async function renderPunishments() {
    const el = document.getElementById('content');
    el.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div>
                    <div class="card-title">Punishment Ladder</div>
                    <div class="card-desc">Define escalating punishments based on warning count</div>
                </div>
                <button class="btn-primary btn-sm" onclick="addLadderStep()">Add Step</button>
            </div>
            <div id="ladder-steps">
                <div class="empty-state"><div class="empty-state-title">Loading...</div></div>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><div class="card-title">Ladder Settings</div></div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Reset warnings after kick</div>
                    <div class="toggle-desc">Warning count goes to 0 when a user is kicked</div>
                </div>
                <label class="toggle">
                    <input type="checkbox" id="reset_on_kick" onchange="savePunishmentSettings()">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Reset warnings after ban</div>
                    <div class="toggle-desc">Warning count goes to 0 when a user is banned</div>
                </div>
                <label class="toggle">
                    <input type="checkbox" id="reset_on_ban" onchange="savePunishmentSettings()">
                    <span class="slider"></span>
                </label>
            </div>
        </div>`;
    await loadLadder();
    await loadPunishmentSettings();
}

// REF-MOD-09
async function loadLadder() {
    if (!State.guildId) {
        document.getElementById('ladder-steps').innerHTML =
            `<div class="empty-state"><div class="empty-state-title">No server selected</div></div>`;
        return;
    }
    try {
        const steps = await apiGet(`/api/ladder/${State.guildId}`);
        renderLadderSteps(steps);
    } catch(e) { console.error(e); }
}

// REF-MOD-10
function renderLadderSteps(steps) {
    const el = document.getElementById('ladder-steps');
    if (!steps.length) {
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-title">No steps configured</div>
                <div style="font-size:13px;color:var(--text3);margin-top:6px">Click "Add Step" to build your ladder</div>
            </div>`;
        return;
    }

    el.innerHTML = steps.map(s => `
        <div class="ladder-step" id="step-${s.step}">
            <div class="ladder-step-num">Warning ${s.step}</div>
            <div class="ladder-step-body">
                <div class="toggle-row" style="padding:8px 0;border:none">
                    <div class="toggle-info"><div class="toggle-name">Action</div></div>
                    <select id="action-select-${s.step}" onchange="updateLadderStep(${s.step}, this)" style="width:160px">
                        <option value="dm"      ${s.action==='dm'      ? 'selected':''}>DM Only</option>
                        <option value="mute"    ${s.action==='mute'    ? 'selected':''}>Mute</option>
                        <option value="kick"    ${s.action==='kick'    ? 'selected':''}>Kick</option>
                        <option value="tempban" ${s.action==='tempban' ? 'selected':''}>Temp Ban</option>
                        <option value="ban"     ${s.action==='ban'     ? 'selected':''}>Permanent Ban</option>
                    </select>
                </div>
                <div class="toggle-row" id="duration-row-${s.step}" style="padding:8px 0;border:none;${['mute','tempban'].includes(s.action) ? '' : 'display:none'}">
                    <div class="toggle-info"><div class="toggle-name">Duration</div></div>
                    <div style="display:flex;gap:8px;align-items:center">
                        <input type="number" value="${s.duration || 1}" min="1" id="duration-${s.step}" style="width:70px;text-align:right">
                        <select id="duration-unit-${s.step}" style="width:110px">
                            <option value="minutes" ${s.duration_unit==='minutes' ? 'selected':''}>Minutes</option>
                            <option value="hours"   ${s.duration_unit==='hours'   ? 'selected':''}>Hours</option>
                            <option value="days"    ${s.duration_unit==='days'    ? 'selected':''}>Days</option>
                        </select>
                    </div>
                </div>
                <div class="toggle-row" style="padding:8px 0;border:none">
                    <div class="toggle-info"><div class="toggle-name">Custom DM</div></div>
                    <input placeholder="Leave blank for default" value="${s.custom_dm || ''}" id="custom-dm-${s.step}" style="width:240px">
                </div>
                <div class="toggle-row" style="padding:8px 0;border:none">
                    <div class="toggle-info"><div class="toggle-name">Reset warnings after this step</div></div>
                    <label class="toggle">
                        <input type="checkbox" id="reset-after-${s.step}" ${s.reset_after ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            <div class="ladder-step-actions">
                <button class="btn-primary btn-sm" onclick="saveLadderStep(${s.step})">Save</button>
                <button class="btn-danger btn-sm" onclick="deleteLadderStep(${s.step})">Remove</button>
            </div>
        </div>`).join('');
}

// REF-MOD-11
async function addLadderStep() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    try {
        const steps   = await apiGet(`/api/ladder/${State.guildId}`);
        const nextStep = steps.length ? Math.max(...steps.map(s => s.step)) + 1 : 1;
        await apiPost(`/api/ladder/${State.guildId}`, { step: nextStep, action: 'dm' });
        await loadLadder();
        toast(`Step ${nextStep} added`);
    } catch(e) { toast('Failed', 'error'); }
}

// REF-MOD-12
async function saveLadderStep(step) {
    if (!State.guildId) return;
    try {
        await apiPost(`/api/ladder/${State.guildId}`, {
            step,
            action:        document.getElementById(`action-select-${step}`)?.value || 'dm',
            duration:      parseInt(document.getElementById(`duration-${step}`)?.value) || null,
            duration_unit: document.getElementById(`duration-unit-${step}`)?.value || null,
            custom_dm:     document.getElementById(`custom-dm-${step}`)?.value || null,
            reset_after:   document.getElementById(`reset-after-${step}`)?.checked || false,
        });
        toast(`Step ${step} saved`);
    } catch(e) { toast('Failed to save', 'error'); }
}

// REF-MOD-13
async function deleteLadderStep(step) {
    if (!State.guildId) return;
    if (!confirm(`Remove warning ${step} from the ladder?`)) return;
    try {
        await apiDelete(`/api/ladder/${State.guildId}/${step}`);
        await loadLadder();
        toast(`Step ${step} removed`);
    } catch(e) { toast('Failed', 'error'); }
}

// REF-MOD-14
function updateLadderStep(step, select) {
    const row = document.getElementById(`duration-row-${step}`);
    if (row) row.style.display = ['mute','tempban'].includes(select.value) ? '' : 'none';
}

// REF-MOD-15
async function loadPunishmentSettings() {
    if (!State.guildId) return;
    try {
        const s = await apiGet(`/api/punishment-settings/${State.guildId}`);
        document.getElementById('reset_on_kick').checked = !!s.reset_on_kick;
        document.getElementById('reset_on_ban').checked  = !!s.reset_on_ban;
    } catch(e) { console.error(e); }
}

// REF-MOD-16
async function savePunishmentSettings() {
    if (!State.guildId) return;
    try {
        await apiPost(`/api/punishment-settings/${State.guildId}`, {
            reset_on_kick: document.getElementById('reset_on_kick').checked,
            reset_on_ban:  document.getElementById('reset_on_ban').checked,
            per_module:    false,
        });
        toast('Settings saved');
    } catch(e) { toast('Failed', 'error'); }
}


// ============================================================
// GLOBAL EXEMPTIONS
// ============================================================

// REF-MOD-17
function renderExemptions(tab) {
    const el    = document.getElementById('content');
    const types = { 'Roles': 'role', 'Users': 'user', 'Channels': 'channel' };
    const type  = types[tab];
    const ph    = { role: 'Role ID', user: 'User ID', channel: 'Channel ID' };

    el.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Exempt ${tab}</div></div>
            <div id="exempt-list" style="padding:16px 18px">
                <div class="empty-state"><div class="empty-state-title">Loading...</div></div>
            </div>
            <div style="padding:0 18px 16px;display:flex;gap:8px">
                <input id="exempt-input" placeholder="${ph[type]}" style="flex:1">
                <button class="btn-primary btn-sm" onclick="addExemption('${type}')">Add</button>
            </div>
        </div>`;
    loadExemptions(type);
}

// REF-MOD-18
async function loadExemptions(type) {
    if (!State.guildId) {
        document.getElementById('exempt-list').innerHTML =
            `<div class="empty-state"><div class="empty-state-title">No server selected</div></div>`;
        return;
    }
    try {
        const data  = await apiGet(`/api/exemptions/${State.guildId}`);
        const items = data[type + 's'] || [];
        const list  = document.getElementById('exempt-list');
        if (!items.length) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-title">None added</div></div>`;
            return;
        }
        list.innerHTML = items.map(id => `
            <div class="exempt-item">
                <span class="exempt-name">${id}</span>
                <button class="exempt-remove" onclick="removeExemption('${type}','${id}')">Remove</button>
            </div>`).join('');
    } catch(e) { console.error(e); }
}

// REF-MOD-19
async function addExemption(type) {
    const input    = document.getElementById('exempt-input');
    const targetId = input.value.trim();
    if (!targetId || !State.guildId) return;
    try {
        await apiPost(`/api/exemptions/${State.guildId}`, {
            type, target_id: targetId, added_by: State.user?.username
        });
        input.value = '';
        toast('Added');
        loadExemptions(type);
    } catch(e) { toast('Failed', 'error'); }
}

// REF-MOD-20
async function removeExemption(type, targetId) {
    if (!State.guildId) return;
    try {
        await apiDelete(`/api/exemptions/${State.guildId}`, { type, target_id: targetId });
        toast('Removed');
        loadExemptions(type);
    } catch(e) { toast('Failed', 'error'); }
}
