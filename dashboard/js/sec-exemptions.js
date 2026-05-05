// ============================================================
// PENNY DASHBOARD — MODULE EXEMPTIONS
// REF-SEC-30
// ============================================================

function renderModuleExemptionsTab(module) {
    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Current Exemptions</div></div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>ID</th>
                        <th>Note</th>
                        <th>Added By</th>
                        <th>Date Added</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="me-list-${module}">
                    <tr><td colspan="6" class="table-loading">No data yet</td></tr>
                </tbody>
            </table>
        </div>`;
    loadModuleExemptions(module);
}

// REF-SEC-31
async function loadModuleExemptions(module) {
    if (!State.guildId) return;
    try {
        const data = await apiGet(`/api/module-exemptions/${State.guildId}/${module}`);
        const el   = document.getElementById(`me-list-${module}`);
        if (!el) return;

        const all = [
            ...data.roles.map(r    => ({ ...r, type: 'Role'    })),
            ...data.users.map(u    => ({ ...u, type: 'User'    })),
            ...data.channels.map(c => ({ ...c, type: 'Channel' })),
        ];

        if (!all.length) {
            el.innerHTML = `<tr><td colspan="6" class="table-loading">No exemptions added</td></tr>`;
            return;
        }

        el.innerHTML = all.map(e => `
            <tr>
                <td>${e.type}</td>
                <td style="font-family:monospace;font-size:12px">${e.target_id}</td>
                <td>${e.note || '—'}</td>
                <td>${e.added_by || '—'}</td>
                <td>${e.added_at ? new Date(e.added_at).toLocaleString() : '—'}</td>
                <td><button class="btn-ghost btn-sm" style="color:var(--red)" onclick="removeModuleExemption('${module}','${e.type.toLowerCase()}','${e.target_id}')">Remove</button></td>
            </tr>`).join('');
    } catch(e) { console.error(e); }
}

// REF-SEC-32
async function addModuleExemption(module) {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const type      = document.getElementById(`me-type-${module}`)?.value;
    const idEl      = type === 'user'
        ? document.getElementById(`me-id-user-${module}`)
        : document.getElementById(`me-id-${module}`);
    const target_id = idEl?.value.trim();
    const note      = document.getElementById(`me-note-${module}`)?.value.trim() || null;
    if (!target_id) { toast('Enter an ID', 'error'); return; }
    try {
        await apiPost(`/api/module-exemptions/${State.guildId}`, {
            module, type, target_id, added_by: State.user?.username, note
        });
        if (document.getElementById(`me-id-${module}`))   document.getElementById(`me-id-${module}`).value   = '';
        if (document.getElementById(`me-note-${module}`)) document.getElementById(`me-note-${module}`).value = '';
        toast('Exemption added');
        loadModuleExemptions(module);
    } catch(e) { toast('Failed', 'error'); }
}

// REF-SEC-33
async function removeModuleExemption(module, type, targetId) {
    if (!State.guildId) return;
    try {
        await apiDelete(`/api/module-exemptions/${State.guildId}`, { module, type, target_id: targetId });
        toast('Removed');
        loadModuleExemptions(module);
    } catch(e) { toast('Failed', 'error'); }
}