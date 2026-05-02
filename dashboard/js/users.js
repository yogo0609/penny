// ============================================================
// PENNY DASHBOARD — USERS
// REF-USR-01
// Dashboard user management and profile editing
// ============================================================


// ============================================================
// USERS TABLE
// ============================================================

// REF-USR-02
function renderUsers() {
    const el = document.getElementById('content');
    el.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">Dashboard Users</div>
                <div style="display:flex;gap:8px">
                    <button class="btn-secondary btn-sm" onclick="openEditMyProfileModal()">My Profile</button>
                    <button class="btn-primary btn-sm" onclick="openCreateUserModal()">Create User</button>
                </div>
            </div>
            <table class="data-table">
                <thead><tr><th>User</th><th>Role</th><th>Discord ID</th><th>Last Login</th><th></th></tr></thead>
                <tbody id="users-body">
                    <tr><td colspan="5" class="table-loading">Loading...</td></tr>
                </tbody>
            </table>
        </div>`;
    loadUsers();
}

// REF-USR-03
async function loadUsers() {
    try {
        const users = await apiGet('/auth/users');
        const body  = document.getElementById('users-body');
        body.innerHTML = users.map(u => `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-table-avatar">${u.username[0].toUpperCase()}</div>
                        <span>${u.username}</span>
                    </div>
                </td>
                <td><span class="badge ${u.role === 'owner' ? 'badge-owner' : 'badge-admin'}">${u.role}</span></td>
                <td>${u.discord_id || '—'}</td>
                <td>${u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                <td>
                    ${u.id !== State.user?.id ? `
                        <div style="display:flex;gap:6px">
                            <button class="action-pill" onclick="openEditUserModal(${u.id},'${u.username}','${u.discord_id||''}')">Edit</button>
                            <button class="action-pill" onclick="toggleUserRole(${u.id},'${u.role}')">
                                ${u.role === 'admin' ? 'Make Owner' : 'Make Admin'}
                            </button>
                            <button class="btn-danger btn-sm" onclick="deleteUser(${u.id})">Remove</button>
                        </div>`
                    : `<div style="display:flex;gap:6px;align-items:center">
                            <button class="action-pill" onclick="openEditMyProfileModal()">Edit</button>
                            <span style="color:var(--text3);font-size:12px">You</span>
                        </div>`}
                </td>
            </tr>`).join('');
    } catch(e) { console.error(e); }
}

// REF-USR-04
async function toggleUserRole(id, currentRole) {
    const newRole = currentRole === 'admin' ? 'owner' : 'admin';
    if (!confirm(`Change this user to ${newRole}?`)) return;
    try {
        await apiPatch(`/auth/users/${id}/role`, { role: newRole });
        toast(`Role updated to ${newRole}`);
        loadUsers();
    } catch(e) { toast('Failed', 'error'); }
}

// REF-USR-05
async function deleteUser(id) {
    if (!confirm('Remove this user?')) return;
    try {
        await apiDelete(`/auth/users/${id}`);
        toast('User removed');
        loadUsers();
    } catch(e) { toast('Failed', 'error'); }
}


// ============================================================
// USER MODALS
// ============================================================

// REF-USR-06
function openCreateUserModal() {
    openModal('Create Admin User', `
        <div class="modal-field">
            <label class="modal-label">Username</label>
            <input class="modal-input" id="m-new-username" placeholder="Username">
        </div>
        <div class="modal-field">
            <label class="modal-label">Password</label>
            <input class="modal-input" type="password" id="m-new-password" placeholder="Min 8 characters">
        </div>
        <div class="modal-field">
            <label class="modal-label">Discord ID <span style="font-weight:400;color:var(--text3)">(optional)</span></label>
            <input class="modal-input" id="m-new-discord" placeholder="Discord user ID">
        </div>
        <div class="modal-error" id="m-create-error"></div>
    `, [
        { label: 'Cancel',      class: 'btn-secondary', action: 'closeModal()' },
        { label: 'Create User', class: 'btn-primary',   action: 'submitCreateUser()' },
    ]);
}

// REF-USR-07
async function submitCreateUser() {
    const username   = document.getElementById('m-new-username').value.trim();
    const password   = document.getElementById('m-new-password').value;
    const discord_id = document.getElementById('m-new-discord').value.trim();
    const errorEl    = document.getElementById('m-create-error');

    errorEl.classList.remove('visible');

    if (!username || !password) {
        errorEl.textContent = 'Username and password are required.';
        errorEl.classList.add('visible');
        return;
    }
    if (password.length < 8) {
        errorEl.textContent = 'Password must be at least 8 characters.';
        errorEl.classList.add('visible');
        return;
    }

    try {
        const res  = await apiRequest('/auth/users', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password, discord_id: discord_id || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Failed to create user.';
            errorEl.classList.add('visible');
            return;
        }
        closeModal();
        toast(`${username} created`);
        loadUsers();
    } catch(e) { toast('Failed', 'error'); }
}

// REF-USR-08
function openEditUserModal(id, username, discordId) {
    openModal(`Edit User — ${username}`, `
        <div class="modal-field">
            <label class="modal-label">Username</label>
            <input class="modal-input" id="m-edit-username" placeholder="Leave blank to keep current">
        </div>
        <div class="modal-field">
            <label class="modal-label">Password</label>
            <input class="modal-input" type="password" id="m-edit-password" placeholder="Leave blank to keep current">
        </div>
        <div class="modal-field">
            <label class="modal-label">Discord ID</label>
            <input class="modal-input" id="m-edit-discord" value="${discordId || ''}" placeholder="Discord user ID">
        </div>
        <div class="modal-error" id="m-edit-error"></div>
    `, [
        { label: 'Cancel',       class: 'btn-secondary', action: 'closeModal()' },
        { label: 'Save Changes', class: 'btn-primary',   action: `submitEditUserModal(${id})` },
    ]);
}

// REF-USR-09
async function submitEditUserModal(id) {
    const username   = document.getElementById('m-edit-username').value.trim();
    const password   = document.getElementById('m-edit-password').value;
    const discord_id = document.getElementById('m-edit-discord').value.trim();
    const errorEl    = document.getElementById('m-edit-error');

    errorEl.classList.remove('visible');

    const body = {};
    if (username) body.username = username;
    if (password) {
        if (password.length < 8) {
            errorEl.textContent = 'Password must be at least 8 characters.';
            errorEl.classList.add('visible');
            return;
        }
        body.password = password;
    }
    body.discord_id = discord_id || null;

    try {
        const res  = await apiRequest(`/auth/users/${id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Failed.';
            errorEl.classList.add('visible');
            return;
        }
        closeModal();
        toast('User updated');
        loadUsers();
    } catch(e) { toast('Failed', 'error'); }
}

// REF-USR-10
function openEditMyProfileModal() {
    openModal('My Profile', `
        <div class="modal-field">
            <label class="modal-label">Username</label>
            <input class="modal-input" id="m-me-username" placeholder="Leave blank to keep current">
        </div>
        <div class="modal-field">
            <label class="modal-label">New Password</label>
            <input class="modal-input" type="password" id="m-me-password" placeholder="Leave blank to keep current">
        </div>
        <div class="modal-field">
            <label class="modal-label">Discord ID</label>
            <input class="modal-input" id="m-me-discord" value="${State.user?.discord_id || ''}" placeholder="Discord user ID">
        </div>
        <div class="modal-error" id="m-me-error"></div>
    `, [
        { label: 'Cancel', class: 'btn-secondary', action: 'closeModal()' },
        { label: 'Save',   class: 'btn-primary',   action: 'submitMyProfile()' },
    ]);
}

// REF-USR-11
async function submitMyProfile() {
    const username   = document.getElementById('m-me-username').value.trim();
    const password   = document.getElementById('m-me-password').value;
    const discord_id = document.getElementById('m-me-discord').value.trim();
    const errorEl    = document.getElementById('m-me-error');

    errorEl.classList.remove('visible');

    const body = {};
    if (username) body.username = username;
    if (password) {
        if (password.length < 8) {
            errorEl.textContent = 'Password must be at least 8 characters.';
            errorEl.classList.add('visible');
            return;
        }
        body.password = password;
    }
    body.discord_id = discord_id || null;

    try {
        const res  = await apiRequest(`/auth/me`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Failed.';
            errorEl.classList.add('visible');
            return;
        }
        if (data.user) {
            State.user = { ...State.user, ...data.user };
            localStorage.setItem('penny_user', JSON.stringify(State.user));
            document.getElementById('sb-user-name').textContent = State.user.username;
        }
        closeModal();
        toast('Profile saved');
        loadUsers();
    } catch(e) { toast('Failed', 'error'); }
}
