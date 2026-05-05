// ============================================================
// PENNY DASHBOARD — JOIN GATE
// ============================================================

function renderJoinGate(tab) {
    if (tab === 'Exemptions') { renderModuleExemptionsTab('joingate'); return; }
    const c = State.config;
    document.getElementById('content').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
            <div class="card">
                <div class="toggle-row" style="border-bottom:1px solid var(--border)">
                    <div class="toggle-info">
                        <div class="toggle-name">Join Gate</div>
                        <div class="toggle-desc">Configure which filters are active on member join</div>
                    </div>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Default Avatar Filter</div>
                        <div class="toggle-desc">Kick users with no profile picture</div>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" id="joingate_avatar_enabled" ${c.joingate_avatar_enabled ? 'checked' : ''} onchange="saveSecToggle('joingate_avatar_enabled', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Username Filter</div>
                        <div class="toggle-desc">Kick users with suspicious usernames</div>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" id="joingate_username_enabled" ${c.joingate_username_enabled ? 'checked' : ''} onchange="saveSecToggle('joingate_username_enabled', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Rapid Rejoin Detection</div>
                        <div class="toggle-desc">Kick users who rejoin too quickly</div>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" id="joingate_rejoin_enabled" ${c.joingate_rejoin_enabled ? 'checked' : ''} onchange="saveSecToggle('joingate_rejoin_enabled', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Rejoin window</div>
                        <div class="toggle-desc">Minutes before a rejoin is flagged</div>
                    </div>
                    <div class="toggle-right" style="gap:8px">
                        <input type="number" value="${c.joingate_rejoin_minutes || 10}" data-key="joingate_rejoin_minutes" style="width:90px;text-align:right">
                        <span style="font-size:11px;color:var(--text3)">minutes</span>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn-primary" onclick="saveSecModule('joingate_avatar_enabled', null, ['joingate_username_enabled','joingate_rejoin_enabled','joingate_rejoin_minutes'])">Save</button>
                </div>
            </div>
            <div class="card">
                <div class="toggle-row" style="border-bottom:1px solid var(--border)">
                    <div class="toggle-info">
                        <div class="toggle-name">Exemptions</div>
                        <div class="toggle-desc">Users, roles or channels exempt from join gate filters</div>
                    </div>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info"><div class="toggle-name">Type</div></div>
                    <select id="jg-exempt-type" style="width:160px">
                        <option value="role">Role</option>
                        <option value="user">User</option>
                        <option value="channel">Channel</option>
                    </select>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info"><div class="toggle-name">ID</div></div>
                    <input id="jg-exempt-id" placeholder="e.g. 123456789012345678" style="width:220px">
                </div>
                <div class="toggle-row">
                    <div class="toggle-info"><div class="toggle-name">Note</div></div>
                    <input id="jg-exempt-note" placeholder="e.g. Staff role" style="width:220px">
                </div>
                <div class="toggle-row">
                    <div class="toggle-info"><div class="toggle-name">Join Gate Function</div></div>
                    <select id="jg-exempt-module" style="width:160px">
                        <option value="joingate_avatar">Avatar Filter</option>
                        <option value="joingate_username">Username Filter</option>
                        <option value="joingate_rejoin">Rapid Rejoin</option>
                    </select>
                </div>
                <div class="card-footer">
                    <button class="btn-primary" onclick="addJoinGateExemption()">Save</button>
                </div>
                <div id="jg-exempt-table" style="padding:0"></div>
            </div>
        </div>`;
    loadJoinGateExemptions();
}

async function addJoinGateExemption() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const type   = document.getElementById('jg-exempt-type').value;
    const id     = document.getElementById('jg-exempt-id').value.trim();
    const note   = document.getElementById('jg-exempt-note').value.trim();
    const module = document.getElementById('jg-exempt-module').value;
    if (!id) return;

    await apiPost(`/api/module-exemptions/${State.guildId}`, {
        module, type, target_id: id, note, added_by: State.user?.username,
    });

    document.getElementById('jg-exempt-id').value   = '';
    document.getElementById('jg-exempt-note').value = '';
    loadJoinGateExemptions();
}

async function loadJoinGateExemptions() {
    if (!State.guildId) return;
    const modules = ['joingate_avatar', 'joingate_username', 'joingate_rejoin'];
    const labels  = { joingate_avatar: 'Avatar Filter', joingate_username: 'Username Filter', joingate_rejoin: 'Rapid Rejoin' };
    let rows = [];

    for (const mod of modules) {
        const data = await apiGet(`/api/module-exemptions/${State.guildId}/${mod}`);
        const all  = [...(data.roles||[]), ...(data.users||[]), ...(data.channels||[])];
        rows = rows.concat(all.map(e => ({ ...e, mod })));
    }

    const table = document.getElementById('jg-exempt-table');
    if (!table) return;
    if (!rows.length) {
        table.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:8px">No exemptions yet</div>';
        return;
    }

    table.innerHTML = `<table class="data-table">
        <thead><tr><th>Function</th><th>Type</th><th>ID</th><th>Note</th><th></th></tr></thead>
        <tbody>${rows.map(e => `<tr>
            <td>${labels[e.mod] || e.mod}</td>
            <td>${e.type}</td>
            <td>${e.target_id}</td>
            <td>${e.note || ''}</td>
            <td><button class="btn-danger btn-sm" onclick="removeJoinGateExemption('${e.mod}','${e.type}','${e.target_id}')">Remove</button></td>
        </tr>`).join('')}</tbody>
    </table>`;
}

async function removeJoinGateExemption(mod, type, targetId) {
    if (!State.guildId) return;
    await apiDelete(`/api/module-exemptions/${State.guildId}`, { module: mod, type, target_id: targetId });
    loadJoinGateExemptions();
}