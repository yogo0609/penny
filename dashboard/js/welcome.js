// ============================================================
// PENNY DASHBOARD — WELCOME & ROLES
// REF-WEL-01
// Welcome message and auto role configuration
// ============================================================


/// REF-WEL-02
async function renderWelcome(tab) {
    const el = document.getElementById('content');
    const c  = State.config;
    const [channels, roles] = await Promise.all([
        loadChannels(State.guildId),
        loadRoles(State.guildId)
    ]);

    if (tab === 'Welcome Message') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Welcome Message</div></div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Enabled</div>
                        <div class="toggle-desc">Send a welcome message when a new member joins</div>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" id="welcome_enabled" ${c.welcome_enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Channel</div>
                        <div class="toggle-desc">Channel where welcome messages are posted</div>
                    </div>
                    ${channelSelect('welcome_channel_id', channels, c.welcome_channel_id, [0])}
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Message</div>
                        <div class="toggle-desc">Use {user} for mention and {server} for server name</div>
                    </div>
                    <input id="welcome_message" value="${c.welcome_message || 'Welcome to {server}, {user}!'}" placeholder="{user} {server}" style="width:280px">
                </div>
                <div class="card-footer">
                    <button class="btn-primary" onclick="saveWelcome()">Save</button>
                </div>
            </div>`;
    }

    if (tab === 'Auto Role') {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><div class="card-title">Auto Role</div></div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Enabled</div>
                        <div class="toggle-desc">Automatically assign a role when a new member joins</div>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" id="autorole_enabled" ${c.autorole_enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-name">Role</div>
                        <div class="toggle-desc">The role to assign on join</div>
                    </div>
                    ${roleSelect('autorole_id', roles, c.autorole_id)}
                </div>
                <div class="card-footer">
                    <button class="btn-primary" onclick="saveWelcome()">Save</button>
                </div>
            </div>`;
    }
}
// REF-WEL-03
async function saveWelcome() {
    if (!State.guildId) { toast('No server selected', 'error'); return; }
    const keys    = ['welcome_enabled','welcome_channel_id','welcome_message','autorole_enabled','autorole_id'];
    const updates = {};
    keys.forEach(k => {
        const el = document.getElementById(k);
        if (!el) return;
        updates[k] = el.type === 'checkbox' ? el.checked : el.value;
    });
    try {
        await apiPut(`/api/config/${State.guildId}`, updates);
        Object.assign(State.config, updates);
        toast('Saved');
    } catch(e) { toast('Failed to save', 'error'); }
}
