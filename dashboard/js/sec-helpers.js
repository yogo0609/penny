// ============================================================
// PENNY DASHBOARD — SECURITY HELPERS
// REF-SEC-02
// ============================================================

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
                    <select id="me-type-${module}" style="width:160px" onchange="filterExemptionId('${module}', this.value)">
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
                    <select id="me-id-${module}" style="width:220px">
                        <option value="">— Select —</option>
                        ${(State.roles||[]).filter(r=>r.name!=='@everyone').map(r=>`<option value="${r.role_id}" data-t="role">@${r.name}</option>`).join('')}
                        ${(State.channels||[]).filter(c=>parseInt(c.type)===0).map(c=>`<option value="${c.channel_id}" data-t="channel">#${c.name}</option>`).join('')}
                    </select>
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

function filterExemptionId(module, type) {
    const sel = document.getElementById(`me-id-${module}`);
    if (!sel) return;
    Array.from(sel.options).forEach(opt => {
        if (!opt.value) return;
        opt.hidden = type !== 'user' && opt.dataset.t && opt.dataset.t !== type;
    });
    sel.value = '';
    sel.style.display = type === 'user' ? 'none' : '';
    let userInput = document.getElementById(`me-id-user-${module}`);
    if (type === 'user') {
        if (!userInput) {
            userInput = document.createElement('input');
            userInput.id = `me-id-user-${module}`;
            userInput.placeholder = 'User ID';
            userInput.style.width = '220px';
            sel.parentNode.appendChild(userInput);
        }
        userInput.style.display = '';
    } else {
        if (userInput) userInput.style.display = 'none';
    }
}