// === DEPENDENCIES ===
const { Pool } = require('pg');
require('dotenv').config();

// === CONNECTION ===
// REF-DB-01
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// === INIT SCHEMA ===
// REF-DB-02
async function initSchema() {
    await pool.query(`

        -- REF-DB-03
        CREATE TABLE IF NOT EXISTS config (
            guild_id    TEXT NOT NULL,
            key         TEXT NOT NULL,
            value       TEXT NOT NULL,
            PRIMARY KEY (guild_id, key)
        );

        -- REF-DB-04
        CREATE TABLE IF NOT EXISTS exemptions (
            id          SERIAL PRIMARY KEY,
            guild_id    TEXT NOT NULL,
            type        TEXT NOT NULL,
            target_id   TEXT NOT NULL,
            added_by    TEXT NOT NULL,
            added_at    TIMESTAMPTZ DEFAULT NOW()
        );

        -- REF-DB-05
        CREATE TABLE IF NOT EXISTS mod_log (
            id          SERIAL PRIMARY KEY,
            guild_id    TEXT NOT NULL,
            action      TEXT NOT NULL,
            target_id   TEXT,
            target_tag  TEXT,
            moderator   TEXT,
            reason      TEXT,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        );

        -- REF-DB-06
        CREATE TABLE IF NOT EXISTS warnings (
            id          SERIAL PRIMARY KEY,
            guild_id    TEXT NOT NULL,
            user_id     TEXT NOT NULL,
            user_tag    TEXT NOT NULL,
            reason      TEXT,
            issued_by   TEXT,
            issued_at   TIMESTAMPTZ DEFAULT NOW()
        );

        -- REF-DB-16
        CREATE TABLE IF NOT EXISTS dashboard_users (
            id           SERIAL PRIMARY KEY,
            username     TEXT NOT NULL UNIQUE,
            password     TEXT NOT NULL,
            role         TEXT NOT NULL DEFAULT 'admin',
            discord_id   TEXT,
            theme        TEXT NOT NULL DEFAULT 'light',
            created_at   TIMESTAMPTZ DEFAULT NOW(),
            last_login   TIMESTAMPTZ
        );

        -- REF-DB-17
        CREATE TABLE IF NOT EXISTS dashboard_sessions (
            id           SERIAL PRIMARY KEY,
            user_id      INTEGER NOT NULL REFERENCES dashboard_users(id),
            token        TEXT NOT NULL UNIQUE,
            expires_at   TIMESTAMPTZ NOT NULL,
            created_at   TIMESTAMPTZ DEFAULT NOW()
        );

        -- REF-DB-24
        CREATE TABLE IF NOT EXISTS bans (
            id           SERIAL PRIMARY KEY,
            guild_id     TEXT NOT NULL,
            user_id      TEXT NOT NULL,
            user_tag     TEXT NOT NULL,
            reason       TEXT,
            banned_by    TEXT NOT NULL,
            banned_at    TIMESTAMPTZ DEFAULT NOW(),
            unbanned_by  TEXT,
            unbanned_at  TIMESTAMPTZ,
            active       INTEGER DEFAULT 1
        );

        -- REF-DB-28
        CREATE TABLE IF NOT EXISTS audit_log (
            id          SERIAL PRIMARY KEY,
            guild_id    TEXT NOT NULL,
            event       TEXT NOT NULL,
            category    TEXT NOT NULL,
            target_id   TEXT,
            target_tag  TEXT,
            moderator   TEXT,
            detail      TEXT,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        );

        -- REF-DB-29
        CREATE TABLE IF NOT EXISTS audit_config (
            guild_id    TEXT NOT NULL,
            event       TEXT NOT NULL,
            enabled     INTEGER DEFAULT 1,
            channel_id  TEXT,
            PRIMARY KEY (guild_id, event)
        );

        -- REF-DB-38
        CREATE TABLE IF NOT EXISTS module_exemptions (
            id          SERIAL PRIMARY KEY,
            guild_id    TEXT NOT NULL,
            module      TEXT NOT NULL,
            type        TEXT NOT NULL,
            target_id   TEXT NOT NULL,
            note        TEXT,
            added_by    TEXT NOT NULL,
            added_at    TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(guild_id, module, type, target_id)
        );

        -- REF-DB-36
        CREATE TABLE IF NOT EXISTS punishment_ladder (
            id            SERIAL PRIMARY KEY,
            guild_id      TEXT NOT NULL,
            step          INTEGER NOT NULL,
            action        TEXT NOT NULL DEFAULT 'dm',
            duration      INTEGER,
            duration_unit TEXT,
            custom_dm     TEXT,
            reset_after   INTEGER DEFAULT 0,
            UNIQUE(guild_id, step)
        );

        -- REF-DB-37
        CREATE TABLE IF NOT EXISTS punishment_settings (
            guild_id      TEXT PRIMARY KEY,
            reset_on_kick INTEGER DEFAULT 1,
            reset_on_ban  INTEGER DEFAULT 1,
            per_module    INTEGER DEFAULT 0
        );

        -- REF-DB-32
        CREATE TABLE IF NOT EXISTS guilds (
            id    TEXT PRIMARY KEY,
            name  TEXT NOT NULL,
            icon  TEXT
        );

        -- REF-DB-48
        CREATE TABLE IF NOT EXISTS panic_state (
            guild_id          TEXT PRIMARY KEY,
            active            INTEGER DEFAULT 0,
            triggered_by      TEXT,
            triggered_at      TIMESTAMPTZ,
            deactivated_by    TEXT,
            deactivated_at    TIMESTAMPTZ,
            channel_snapshot  TEXT
        );

        -- REF-DB-62
        CREATE TABLE IF NOT EXISTS guild_channels (
            guild_id    TEXT NOT NULL,
            channel_id  TEXT NOT NULL,
            name        TEXT NOT NULL,
            type        INTEGER NOT NULL,
            position    INTEGER DEFAULT 0,
            PRIMARY KEY (guild_id, channel_id)
        );

        -- REF-DB-63
        CREATE TABLE IF NOT EXISTS guild_roles (
            guild_id    TEXT NOT NULL,
            role_id     TEXT NOT NULL,
            name        TEXT NOT NULL,
            color       INTEGER DEFAULT 0,
            position    INTEGER DEFAULT 0,
            PRIMARY KEY (guild_id, role_id)
        );

        -- REF-DB-64
        CREATE TABLE IF NOT EXISTS scheduled_jobs (
            id          SERIAL PRIMARY KEY,
            guild_id    TEXT NOT NULL,
            type        TEXT NOT NULL,
            target_id   TEXT NOT NULL,
            execute_at  TIMESTAMPTZ NOT NULL,
            payload     TEXT,
            done        INTEGER DEFAULT 0,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        );

    `);
}

// === CONFIG HELPERS ===

// REF-DB-07
async function getConfig(guildId, key, fallback = null) {
    const res = await pool.query(
        'SELECT value FROM config WHERE guild_id = $1 AND key = $2',
        [guildId, key]
    );
    return res.rows[0] ? JSON.parse(res.rows[0].value) : fallback;
}

// REF-DB-07a — Get all config keys for a guild at once
async function getConfigAll(guildId, keys) {
    const res = await pool.query(
        'SELECT key, value FROM config WHERE guild_id = $1 AND key = ANY($2)',
        [guildId, keys]
    );
    const config = {};
    for (const key of keys) config[key] = null;
    for (const row of res.rows) config[row.key] = JSON.parse(row.value);
    return config;
}

// REF-DB-08
async function setConfig(guildId, key, value) {
    await pool.query(
        `INSERT INTO config (guild_id, key, value) VALUES ($1, $2, $3)
         ON CONFLICT (guild_id, key) DO UPDATE SET value = EXCLUDED.value`,
        [guildId, key, JSON.stringify(value)]
    );
}

// === EXEMPTION HELPERS ===

// REF-DB-09
async function getExemptions(guildId, type) {
    const res = await pool.query(
        'SELECT target_id FROM exemptions WHERE guild_id = $1 AND type = $2',
        [guildId, type]
    );
    return res.rows.map(r => r.target_id);
}

// REF-DB-10
async function addExemption(guildId, type, targetId, addedBy) {
    await pool.query(
        `INSERT INTO exemptions (guild_id, type, target_id, added_by)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [guildId, type, targetId, addedBy]
    );
}

// REF-DB-11
async function removeExemption(guildId, type, targetId) {
    await pool.query(
        'DELETE FROM exemptions WHERE guild_id = $1 AND type = $2 AND target_id = $3',
        [guildId, type, targetId]
    );
}

// === MOD LOG HELPERS ===

// REF-DB-12
async function addModLog(guildId, action, targetId, targetTag, moderator, reason) {
    await pool.query(
        `INSERT INTO mod_log (guild_id, action, target_id, target_tag, moderator, reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [guildId, action, targetId, targetTag, moderator, reason]
    );
}

// REF-DB-13
async function getModLogs(guildId, limit = 50) {
    const res = await pool.query(
        'SELECT * FROM mod_log WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
        [guildId, limit]
    );
    return res.rows;
}

// === WARNING HELPERS ===

// REF-DB-14
async function addWarning(guildId, userId, userTag, reason, issuedBy) {
    await pool.query(
        `INSERT INTO warnings (guild_id, user_id, user_tag, reason, issued_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [guildId, userId, userTag, reason, issuedBy]
    );
}

// REF-DB-15
async function getWarnings(guildId, userId) {
    const res = await pool.query(
        'SELECT * FROM warnings WHERE guild_id = $1 AND user_id = $2 ORDER BY issued_at DESC',
        [guildId, userId]
    );
    return res.rows;
}

// REF-DB-55
async function getAllWarnings(guildId) {
    const res = await pool.query(
        'SELECT * FROM warnings WHERE guild_id = $1 ORDER BY issued_at DESC',
        [guildId]
    );
    return res.rows;
}

// REF-DB-56
async function clearUserWarnings(guildId, userId) {
    await pool.query(
        'DELETE FROM warnings WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
    );
}

// === AUTH HELPERS ===

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

// === BAN HELPERS ===

// REF-DB-24
async function addBan(guildId, userId, userTag, reason, bannedBy) {
    await pool.query(
        `INSERT INTO bans (guild_id, user_id, user_tag, reason, banned_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [guildId, userId, userTag, reason, bannedBy]
    );
}

// REF-DB-25
async function removeBan(guildId, userId, unbannedBy) {
    await pool.query(
        `UPDATE bans SET active = 0, unbanned_by = $1, unbanned_at = NOW()
         WHERE guild_id = $2 AND user_id = $3 AND active = 1`,
        [unbannedBy, guildId, userId]
    );
}

// REF-DB-26
async function getActiveBans(guildId) {
    const res = await pool.query(
        'SELECT * FROM bans WHERE guild_id = $1 AND active = 1 ORDER BY banned_at DESC',
        [guildId]
    );
    return res.rows;
}

// REF-DB-27
async function getBanHistory(guildId, userId) {
    const res = await pool.query(
        'SELECT * FROM bans WHERE guild_id = $1 AND user_id = $2 ORDER BY banned_at DESC',
        [guildId, userId]
    );
    return res.rows;
}

// === AUDIT LOG HELPERS ===

// REF-DB-28
async function addAuditLog(guildId, event, category, targetId, targetTag, moderator, detail) {
    await pool.query(
        `INSERT INTO audit_log (guild_id, event, category, target_id, target_tag, moderator, detail)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [guildId, event, category, targetId || null, targetTag || null, moderator || null, detail || null]
    );
}

// REF-DB-29
async function getAuditLogs(guildId, limit = 100, category = null) {
    if (category) {
        const res = await pool.query(
            'SELECT * FROM audit_log WHERE guild_id = $1 AND category = $2 ORDER BY created_at DESC LIMIT $3',
            [guildId, category, limit]
        );
        return res.rows;
    }
    const res = await pool.query(
        'SELECT * FROM audit_log WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
        [guildId, limit]
    );
    return res.rows;
}

// REF-DB-30
async function getAuditConfig(guildId) {
    const res = await pool.query(
        'SELECT * FROM audit_config WHERE guild_id = $1',
        [guildId]
    );
    return res.rows;
}

// REF-DB-31
async function setAuditConfig(guildId, event, enabled, channelId = null) {
    await pool.query(
        `INSERT INTO audit_config (guild_id, event, enabled, channel_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (guild_id, event) DO UPDATE SET enabled = EXCLUDED.enabled, channel_id = EXCLUDED.channel_id`,
        [guildId, event, enabled ? 1 : 0, channelId]
    );
}

// === PANIC STATE HELPERS ===

// REF-DB-49
async function getPanicState(guildId) {
    const res = await pool.query(
        'SELECT * FROM panic_state WHERE guild_id = $1',
        [guildId]
    );
    return res.rows[0] || null;
}

// REF-DB-50
async function setPanicActive(guildId, triggeredBy, channelSnapshot) {
    await pool.query(
        `INSERT INTO panic_state (guild_id, active, triggered_by, triggered_at, channel_snapshot)
         VALUES ($1, 1, $2, NOW(), $3)
         ON CONFLICT (guild_id) DO UPDATE SET
             active           = 1,
             triggered_by     = EXCLUDED.triggered_by,
             triggered_at     = NOW(),
             channel_snapshot = EXCLUDED.channel_snapshot,
             deactivated_by   = NULL,
             deactivated_at   = NULL`,
        [guildId, triggeredBy, JSON.stringify(channelSnapshot)]
    );
}

// REF-DB-51
async function setPanicInactive(guildId, deactivatedBy) {
    await pool.query(
        `UPDATE panic_state SET active = 0, deactivated_by = $1, deactivated_at = NOW()
         WHERE guild_id = $2`,
        [deactivatedBy, guildId]
    );
}

// === GUILD HELPERS ===

// REF-DB-35
async function setGuilds(guilds) {
    for (const g of guilds) {
        await pool.query(
            `INSERT INTO guilds (id, name, icon) VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon`,
            [g.id, g.name, g.icon || null]
        );
    }
}

async function getGuilds() {
    const res = await pool.query('SELECT * FROM guilds ORDER BY name ASC');
    return res.rows;
}

// === CHANNEL & ROLE SYNC ===

// REF-DB-62
async function setGuildChannels(guildId, channels) {
    await pool.query('DELETE FROM guild_channels WHERE guild_id = $1', [guildId]);
    for (const c of channels) {
        await pool.query(
            `INSERT INTO guild_channels (guild_id, channel_id, name, type, position)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
            [guildId, c.id, c.name, c.type, c.position || 0]
        );
    }
}

async function getGuildChannels(guildId) {
    const res = await pool.query(
        'SELECT * FROM guild_channels WHERE guild_id = $1 ORDER BY position ASC',
        [guildId]
    );
    return res.rows;
}

// REF-DB-63
async function setGuildRoles(guildId, roles) {
    await pool.query('DELETE FROM guild_roles WHERE guild_id = $1', [guildId]);
    for (const r of roles) {
        await pool.query(
            `INSERT INTO guild_roles (guild_id, role_id, name, color, position)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
            [guildId, r.id, r.name, r.color || 0, r.position || 0]
        );
    }
}

async function getGuildRoles(guildId) {
    const res = await pool.query(
        'SELECT * FROM guild_roles WHERE guild_id = $1 ORDER BY position DESC',
        [guildId]
    );
    return res.rows;
}

// === SCHEDULED JOBS ===

// REF-DB-64
async function addScheduledJob(guildId, type, targetId, executeAt, payload = null) {
    await pool.query(
        `INSERT INTO scheduled_jobs (guild_id, type, target_id, execute_at, payload)
         VALUES ($1, $2, $3, $4, $5)`,
        [guildId, type, targetId, executeAt, payload ? JSON.stringify(payload) : null]
    );
}

async function getDueJobs() {
    const res = await pool.query(
        `SELECT * FROM scheduled_jobs WHERE done = 0 AND execute_at <= NOW()`
    );
    return res.rows;
}

async function markJobDone(id) {
    await pool.query('UPDATE scheduled_jobs SET done = 1 WHERE id = $1', [id]);
}

// === MODULE EXEMPTION HELPERS ===

// REF-DB-44
async function getModuleExemptions(guildId, module) {
    const res = await pool.query(
        'SELECT * FROM module_exemptions WHERE guild_id = $1 AND module = $2 ORDER BY added_at DESC',
        [guildId, module]
    );
    return {
        roles:    res.rows.filter(r => r.type === 'role'),
        users:    res.rows.filter(r => r.type === 'user'),
        channels: res.rows.filter(r => r.type === 'channel'),
    };
}

// REF-DB-45
async function addModuleExemption(guildId, module, type, targetId, addedBy, note) {
    await pool.query(
        `INSERT INTO module_exemptions (guild_id, module, type, target_id, added_by, note)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [guildId, module, type, targetId, addedBy, note || null]
    );
}

// REF-DB-46
async function removeModuleExemption(guildId, module, type, targetId) {
    await pool.query(
        'DELETE FROM module_exemptions WHERE guild_id = $1 AND module = $2 AND type = $3 AND target_id = $4',
        [guildId, module, type, targetId]
    );
}

// === PUNISHMENT LADDER HELPERS ===

// REF-DB-38
async function getLadder(guildId) {
    const res = await pool.query(
        'SELECT * FROM punishment_ladder WHERE guild_id = $1 ORDER BY step ASC',
        [guildId]
    );
    return res.rows;
}

// REF-DB-39
async function setLadderStep(guildId, step, action, duration, durationUnit, customDm, resetAfter) {
    await pool.query(
        `INSERT INTO punishment_ladder (guild_id, step, action, duration, duration_unit, custom_dm, reset_after)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (guild_id, step) DO UPDATE SET
             action        = EXCLUDED.action,
             duration      = EXCLUDED.duration,
             duration_unit = EXCLUDED.duration_unit,
             custom_dm     = EXCLUDED.custom_dm,
             reset_after   = EXCLUDED.reset_after`,
        [guildId, step, action, duration || null, durationUnit || null, customDm || null, resetAfter ? 1 : 0]
    );
}

// REF-DB-40
async function deleteLadderStep(guildId, step) {
    await pool.query(
        'DELETE FROM punishment_ladder WHERE guild_id = $1 AND step = $2',
        [guildId, step]
    );
}

// REF-DB-41
async function clearLadder(guildId) {
    await pool.query(
        'DELETE FROM punishment_ladder WHERE guild_id = $1',
        [guildId]
    );
}

// REF-DB-42
async function getPunishmentSettings(guildId) {
    const res = await pool.query(
        'SELECT * FROM punishment_settings WHERE guild_id = $1',
        [guildId]
    );
    return res.rows[0] || null;
}

// REF-DB-43
async function setPunishmentSettings(guildId, resetOnKick, resetOnBan, perModule) {
    await pool.query(
        `INSERT INTO punishment_settings (guild_id, reset_on_kick, reset_on_ban, per_module)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (guild_id) DO UPDATE SET
             reset_on_kick = EXCLUDED.reset_on_kick,
             reset_on_ban  = EXCLUDED.reset_on_ban,
             per_module    = EXCLUDED.per_module`,
        [guildId, resetOnKick ? 1 : 0, resetOnBan ? 1 : 0, perModule ? 1 : 0]
    );
}

// === DATA MANAGEMENT HELPERS ===

// REF-DB-57
async function clearModLogs(guildId) {
    await pool.query('DELETE FROM mod_log WHERE guild_id = $1', [guildId]);
}

// REF-DB-58
async function clearAuditLogs(guildId) {
    await pool.query('DELETE FROM audit_log WHERE guild_id = $1', [guildId]);
}

// REF-DB-59
async function clearWarnings(guildId) {
    await pool.query('DELETE FROM warnings WHERE guild_id = $1', [guildId]);
}

// REF-DB-60
async function clearBans(guildId) {
    await pool.query('DELETE FROM bans WHERE guild_id = $1', [guildId]);
}

// REF-DB-61
async function exportGuildData(guildId) {
    const config   = await pool.query('SELECT key, value FROM config WHERE guild_id = $1', [guildId]);
    const warnings = await pool.query('SELECT * FROM warnings WHERE guild_id = $1', [guildId]);
    return { config: config.rows, warnings: warnings.rows };
}

// === EXPORTS ===
module.exports = {
    pool,
    initSchema,
    getConfig,
    getConfigAll,
    setConfig,
    getExemptions,
    addExemption,
    removeExemption,
    addModLog,
    getModLogs,
    addWarning,
    getWarnings,
    getAllWarnings,
    clearUserWarnings,
    hasOwner,
    createUser,
    getUserByUsername,
    getUserById,
    getAllUsers,
    updateUserRole,
    updateUserTheme,
    updateUsername,
    updatePassword,
    updateDiscordId,
    deleteUser,
    updateLastLogin,
    addBan,
    removeBan,
    getActiveBans,
    getBanHistory,
    addAuditLog,
    getAuditLogs,
    getAuditConfig,
    setAuditConfig,
    setGuilds,
    getGuilds,
    setGuildChannels,
    getGuildChannels,
    setGuildRoles,
    getGuildRoles,
    getPanicState,
    setPanicActive,
    setPanicInactive,
    getLadder,
    setLadderStep,
    deleteLadderStep,
    clearLadder,
    getPunishmentSettings,
    setPunishmentSettings,
    getModuleExemptions,
    addModuleExemption,
    removeModuleExemption,
    addScheduledJob,
    getDueJobs,
    markJobDone,
    clearModLogs,
    clearAuditLogs,
    clearWarnings,
    clearBans,
    exportGuildData,
};