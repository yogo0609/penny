const { pool } = require('./connection');

// REF-DB-16
async function hasOwner() {
    const res = await pool.query(
        "SELECT id FROM dashboard_users WHERE role = 'owner' LIMIT 1"
    );
    return res.rows.length > 0;
}

// REF-DB-17
async function createUser(username, hashedPassword, role, discordId = null) {
    await pool.query(
        `INSERT INTO dashboard_users (username, password, role, discord_id)
         VALUES ($1, $2, $3, $4)`,
        [username, hashedPassword, role, discordId]
    );
}

// REF-DB-18
async function getUserByUsername(username) {
    const res = await pool.query(
        'SELECT * FROM dashboard_users WHERE username = $1',
        [username]
    );
    return res.rows[0] || null;
}

// REF-DB-19
async function getUserById(id) {
    const res = await pool.query(
        'SELECT * FROM dashboard_users WHERE id = $1',
        [id]
    );
    return res.rows[0] || null;
}

// REF-DB-20
async function getAllUsers() {
    const res = await pool.query(
        'SELECT id, username, role, discord_id, theme, created_at, last_login FROM dashboard_users ORDER BY created_at ASC'
    );
    return res.rows;
}

// REF-DB-21
async function updateUserRole(id, role) {
    await pool.query(
        'UPDATE dashboard_users SET role = $1 WHERE id = $2',
        [role, id]
    );
}

// REF-DB-22
async function deleteUser(id) {
    await pool.query(
        'DELETE FROM dashboard_users WHERE id = $1',
        [id]
    );
}

// REF-DB-23
async function updateLastLogin(id) {
    await pool.query(
        'UPDATE dashboard_users SET last_login = NOW() WHERE id = $1',
        [id]
    );
}

// REF-DB-34
async function updateUserTheme(id, theme) {
    await pool.query(
        'UPDATE dashboard_users SET theme = $1 WHERE id = $2',
        [theme, id]
    );
}

// REF-DB-52
async function updateUsername(id, username) {
    await pool.query(
        'UPDATE dashboard_users SET username = $1 WHERE id = $2',
        [username, id]
    );
}

// REF-DB-53
async function updatePassword(id, hashedPassword) {
    await pool.query(
        'UPDATE dashboard_users SET password = $1 WHERE id = $2',
        [hashedPassword, id]
    );
}

// REF-DB-54
async function updateDiscordId(id, discordId) {
    await pool.query(
        'UPDATE dashboard_users SET discord_id = $1 WHERE id = $2',
        [discordId, id]
    );
}

module.exports = {
    hasOwner, createUser, getUserByUsername, getUserById, getAllUsers,
    updateUserRole, updateUserTheme, updateUsername, updatePassword,
    updateDiscordId, deleteUser, updateLastLogin,
};