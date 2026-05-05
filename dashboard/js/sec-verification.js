// ============================================================
// PENNY DASHBOARD — VERIFICATION
// ============================================================

async function renderVerification(tab) {
    const el = document.getElementById('content');
    const c  = State.config;
    const [channels, roles] = await Promise.all([
        loadChannels(State.guildId),
        loadRoles(State.guildId)
    ]);

    el.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="card-title">Verification</div></div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Enabled</div>
                    <div class="toggle-desc">Require new members to verify before accessing the server</div>
                </div>
                <label class="toggle">
                    <input type="checkbox" data-key="verification_enabled" ${c.verification_enabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Verify Channel</div>
                    <div class="toggle-desc">Channel where the verify button is posted</div>
                </div>
                ${channelSelect('verification_channel_id', channels, c.verification_channel_id, [0])}
            </div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Verified Role</div>
                    <div class="toggle-desc">Role assigned after verification</div>
                </div>
                ${roleSelect('verification_role_id', roles, c.verification_role_id)}
            </div>
            <div class="toggle-row">
                <div class="toggle-info">
                    <div class="toggle-name">Timeout</div>
                    <div class="toggle-desc">Minutes before unverified members are kicked (0 = no timeout)</div>
                </div>
                <div class="toggle-right" style="gap:8px">
                    <input type="number" value="${c.verification_timeout_minutes || 10}" data-key="verification_timeout_minutes" style="width:90px;text-align:right">
                    <span style="font-size:11px;color:var(--text3)">minutes</span>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn-primary" onclick="saveVerification()">Save</button>
            </div>
        </div>`;
}

async function saveVerification() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const updates = {
        verification_enabled:         document.querySelector('[data-key="verification_enabled"]').checked,
        verification_channel_id:      document.getElementById('verification_channel_id').value,
        verification_role_id:         document.getElementById('verification_role_id').value,
        verification_timeout_minutes: parseInt(document.querySelector('[data-key="verification_timeout_minutes"]').value),
    };
    try {
        await apiPut(`/api/config/${State.guildId}`, updates);
        Object.assign(State.config, updates);
        toast('Saved');
    } catch(e) { toast('Failed', 'error'); }
}