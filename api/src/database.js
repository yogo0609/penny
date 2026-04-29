// === DEPENDENCIES ===
const Database = require('better-sqlite3');
const path     = require('path');
require('dotenv').config();


// === CONNECTION ===
// REF-DB-01
const db = new Database(path.resolve(process.env.DB_PATH));


// === PERFORMANCE ===
// REF-DB-02
db.pragma('journal_mode = WAL');


// === SCHEMA ===

db.exec(`

    -- REF-DB-03
    CREATE TABLE IF NOT EXISTS config (
        guild_id    TEXT NOT NULL,
        key         TEXT NOT NULL,
        value       TEXT NOT NULL,
        PRIMARY KEY (guild_id, key)
    );

    -- REF-DB-04
    CREATE TABLE IF NOT EXISTS exemptions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id    TEXT NOT NULL,
        type        TEXT NOT NULL,
        target_id   TEXT NOT NULL,
        added_by    TEXT NOT NULL,
        added_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- REF-DB-05
    CREATE TABLE IF NOT EXISTS mod_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id    TEXT NOT NULL,
        action      TEXT NOT NULL,
        target_id   TEXT,
        target_tag  TEXT,
        moderator   TEXT,
        reason      TEXT,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- REF-DB-06
    CREATE TABLE IF NOT EXISTS warnings (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id    TEXT NOT NULL,
        user_id     TEXT NOT NULL,
        user_tag    TEXT NOT NULL,
        reason      TEXT,
        issued_by   TEXT,
        issued_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- REF-DB-16
    CREATE TABLE IF NOT EXISTS dashboard_users (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        username     TEXT NOT NULL UNIQUE,
        password     TEXT NOT NULL,
        role         TEXT NOT NULL DEFAULT 'admin',
        discord_id   TEXT,
        theme        TEXT NOT NULL DEFAULT 'light',
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login   DATETIME
    );

    -- REF-DB-17
    CREATE TABLE IF NOT EXISTS dashboard_sessions (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        token        TEXT NOT NULL UNIQUE,
        expires_at   DATETIME NOT NULL,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES dashboard_users(id)
    );

    -- REF-DB-24
    CREATE TABLE IF NOT EXISTS bans (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id     TEXT NOT NULL,
        user_id      TEXT NOT NULL,
        user_tag     TEXT NOT NULL,
        reason       TEXT,
        banned_by    TEXT NOT NULL,
        banned_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        unbanned_by  TEXT,
        unbanned_at  DATETIME,
        active       INTEGER DEFAULT 1
    );

    -- REF-DB-28
    CREATE TABLE IF NOT EXISTS audit_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id    TEXT NOT NULL,
        event       TEXT NOT NULL,
        category    TEXT NOT NULL,
        target_id   TEXT,
        target_tag  TEXT,
        moderator   TEXT,
        detail      TEXT,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
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
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id    TEXT NOT NULL,
        module      TEXT NOT NULL,
        type        TEXT NOT NULL,
        target_id   TEXT NOT NULL,
        note        TEXT,
        added_by    TEXT NOT NULL,
        added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, module, type, target_id)
    );

    -- REF-DB-36
    CREATE TABLE IF NOT EXISTS punishment_ladder (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
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
        guild_id        TEXT PRIMARY KEY,
        active          INTEGER DEFAULT 0,
        triggered_by    TEXT,
        triggered_at    DATETIME,
        deactivated_by  TEXT,
        deactivated_at  DATETIME,
        channel_snapshot TEXT
    );

`);


// REF-DB-33 — Add theme column to existing installs
try { db.prepare("ALTER TABLE dashboard_users ADD COLUMN theme TEXT NOT NULL DEFAULT 'light'").run(); } catch {}
try { db.prepare("ALTER TABLE module_exemptions ADD COLUMN note TEXT").run(); } catch {}


// === CONFIG HELPERS ===

// REF-DB-07
function getConfig(guildId, key, fallback = null) {
    const row = db.prepare(
        'SELECT value FROM config WHERE guild_id = ? AND key = ?'
    ).get(guildId, key);
    return row ? JSON.parse(row.value) : fallback;
}

// REF-DB-08
function setConfig(guildId, key, value) {
    db.prepare(`
        INSERT INTO config (guild_id, key, value)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id, key) DO UPDATE SET value = excluded.value
    `).run(guildId, key, JSON.stringify(value));
}


// === EXEMPTION HELPERS ===

// REF-DB-09
function getExemptions(guildId, type) {
    return db.prepare(
        'SELECT target_id FROM exemptions WHERE guild_id = ? AND type = ?'
    ).all(guildId, type).map(r => r.target_id);
}

// REF-DB-10
function addExemption(guildId, type, targetId, addedBy) {
    db.prepare(`
        INSERT OR IGNORE INTO exemptions (guild_id, type, target_id, added_by)
        VALUES (?, ?, ?, ?)
    `).run(guildId, type, targetId, addedBy);
}

// REF-DB-11
function removeExemption(guildId, type, targetId) {
    db.prepare(
        'DELETE FROM exemptions WHERE guild_id = ? AND type = ? AND target_id = ?'
    ).run(guildId, type, targetId);
}


// === MOD LOG HELPERS ===

// REF-DB-12
function addModLog(guildId, action, targetId, targetTag, moderator, reason) {
    db.prepare(`
        INSERT INTO mod_log (guild_id, action, target_id, target_tag, moderator, reason)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(guildId, action, targetId, targetTag, moderator, reason);
}

// REF-DB-13
function getModLogs(guildId, limit = 50) {
    return db.prepare(
        'SELECT * FROM mod_log WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(guildId, limit);
}


// === WARNING HELPERS ===

// REF-DB-14
function addWarning(guildId, userId, userTag, reason, issuedBy) {
    db.prepare(`
        INSERT INTO warnings (guild_id, user_id, user_tag, reason, issued_by)
        VALUES (?, ?, ?, ?, ?)
    `).run(guildId, userId, userTag, reason, issuedBy);
}

// REF-DB-15
function getWarnings(guildId, userId) {
    return db.prepare(
        'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY issued_at DESC'
    ).all(guildId, userId);
}


// === AUTH HELPERS ===

// REF-DB-16
function hasOwner() {
    const row = db.prepare(
        "SELECT id FROM dashboard_users WHERE role = 'owner' LIMIT 1"
    ).get();
    return !!row;
}

// REF-DB-17
function createUser(username, hashedPassword, role, discordId = null) {
    return db.prepare(`
        INSERT INTO dashboard_users (username, password, role, discord_id)
        VALUES (?, ?, ?, ?)
    `).run(username, hashedPassword, role, discordId);
}

// REF-DB-18
function getUserByUsername(username) {
    return db.prepare(
        'SELECT * FROM dashboard_users WHERE username = ?'
    ).get(username);
}

// REF-DB-19
function getUserById(id) {
    return db.prepare(
        'SELECT * FROM dashboard_users WHERE id = ?'
    ).get(id);
}

// REF-DB-20
function getAllUsers() {
    return db.prepare(
        'SELECT id, username, role, discord_id, theme, created_at, last_login FROM dashboard_users ORDER BY created_at ASC'
    ).all();
}

// REF-DB-21
function updateUserRole(id, role) {
    db.prepare(
        'UPDATE dashboard_users SET role = ? WHERE id = ?'
    ).run(role, id);
}

// REF-DB-22
function deleteUser(id) {
    db.prepare(
        'DELETE FROM dashboard_users WHERE id = ?'
    ).run(id);
}

// REF-DB-23
function updateLastLogin(id) {
    db.prepare(
        'UPDATE dashboard_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(id);
}

// REF-DB-34
function updateUserTheme(id, theme) {
    db.prepare('UPDATE dashboard_users SET theme = ? WHERE id = ?').run(theme, id);
}


// === BAN HELPERS ===

// REF-DB-24
function addBan(guildId, userId, userTag, reason, bannedBy) {
    db.prepare(`
        INSERT INTO bans (guild_id, user_id, user_tag, reason, banned_by)
        VALUES (?, ?, ?, ?, ?)
    `).run(guildId, userId, userTag, reason, bannedBy);
}

// REF-DB-25
function removeBan(guildId, userId, unbannedBy) {
    db.prepare(`
        UPDATE bans
        SET active = 0, unbanned_by = ?, unbanned_at = CURRENT_TIMESTAMP
        WHERE guild_id = ? AND user_id = ? AND active = 1
    `).run(unbannedBy, guildId, userId);
}

// REF-DB-26
function getActiveBans(guildId) {
    return db.prepare(
        'SELECT * FROM bans WHERE guild_id = ? AND active = 1 ORDER BY banned_at DESC'
    ).all(guildId);
}

// REF-DB-27
function getBanHistory(guildId, userId) {
    return db.prepare(
        'SELECT * FROM bans WHERE guild_id = ? AND user_id = ? ORDER BY banned_at DESC'
    ).all(guildId, userId);
}


// === AUDIT LOG HELPERS ===

// REF-DB-28
function addAuditLog(guildId, event, category, targetId, targetTag, moderator, detail) {
    db.prepare(`
        INSERT INTO audit_log (guild_id, event, category, target_id, target_tag, moderator, detail)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(guildId, event, category, targetId || null, targetTag || null, moderator || null, detail || null);
}

// REF-DB-29
function getAuditLogs(guildId, limit = 100, category = null) {
    if (category) {
        return db.prepare(
            'SELECT * FROM audit_log WHERE guild_id = ? AND category = ? ORDER BY created_at DESC LIMIT ?'
        ).all(guildId, category, limit);
    }
    return db.prepare(
        'SELECT * FROM audit_log WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(guildId, limit);
}

// REF-DB-30
function getAuditConfig(guildId) {
    return db.prepare(
        'SELECT * FROM audit_config WHERE guild_id = ?'
    ).all(guildId);
}

// REF-DB-31
function setAuditConfig(guildId, event, enabled, channelId = null) {
    db.prepare(`
        INSERT INTO audit_config (guild_id, event, enabled, channel_id)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id, event) DO UPDATE SET enabled = excluded.enabled, channel_id = excluded.channel_id
    `).run(guildId, event, enabled ? 1 : 0, channelId);
}

// === PANIC STATE HELPERS ===

// REF-DB-49
function getPanicState(guildId) {
    return db.prepare(
        'SELECT * FROM panic_state WHERE guild_id = ?'
    ).get(guildId);
}

// REF-DB-50
function setPanicActive(guildId, triggeredBy, channelSnapshot) {
    db.prepare(`
        INSERT INTO panic_state (guild_id, active, triggered_by, triggered_at, channel_snapshot)
        VALUES (?, 1, ?, CURRENT_TIMESTAMP, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
            active          = 1,
            triggered_by    = excluded.triggered_by,
            triggered_at    = CURRENT_TIMESTAMP,
            channel_snapshot = excluded.channel_snapshot,
            deactivated_by  = null,
            deactivated_at  = null
    `).run(guildId, triggeredBy, JSON.stringify(channelSnapshot));
}

// REF-DB-51
function setPanicInactive(guildId, deactivatedBy) {
    db.prepare(`
        UPDATE panic_state SET
            active         = 0,
            deactivated_by = ?,
            deactivated_at = CURRENT_TIMESTAMP
        WHERE guild_id = ?
    `).run(deactivatedBy, guildId);
}

// === GUILD HELPERS ===

// REF-DB-35
function setGuilds(guilds) {
    const upsert = db.prepare(`
        INSERT INTO guilds (id, name, icon) VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, icon = excluded.icon
    `);
    const tx = db.transaction((gs) => { for (const g of gs) upsert.run(g.id, g.name, g.icon || null); });
    tx(guilds);
}

function getGuilds() {
    return db.prepare('SELECT * FROM guilds ORDER BY name ASC').all();
}

// === MODULE EXEMPTION HELPERS ===

// REF-DB-44
function getModuleExemptions(guildId, module) {
    const rows = db.prepare(
        'SELECT * FROM module_exemptions WHERE guild_id = ? AND module = ? ORDER BY added_at DESC'
    ).all(guildId, module);
    return {
        roles:    rows.filter(r => r.type === 'role'),
        users:    rows.filter(r => r.type === 'user'),
        channels: rows.filter(r => r.type === 'channel'),
    };
}

// REF-DB-45
function addModuleExemption(guildId, module, type, targetId, addedBy, note) {
    db.prepare(`
        INSERT OR IGNORE INTO module_exemptions (guild_id, module, type, target_id, added_by, note)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(guildId, module, type, targetId, addedBy, note || null);
}

// REF-DB-46
function removeModuleExemption(guildId, module, type, targetId) {
    db.prepare(
        'DELETE FROM module_exemptions WHERE guild_id = ? AND module = ? AND type = ? AND target_id = ?'
    ).run(guildId, module, type, targetId);
}

// === PUNISHMENT LADDER HELPERS ===

// REF-DB-38
function getLadder(guildId) {
    return db.prepare(
        'SELECT * FROM punishment_ladder WHERE guild_id = ? ORDER BY step ASC'
    ).all(guildId);
}

// REF-DB-39
function setLadderStep(guildId, step, action, duration, durationUnit, customDm, resetAfter) {
    db.prepare(`
        INSERT INTO punishment_ladder (guild_id, step, action, duration, duration_unit, custom_dm, reset_after)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, step) DO UPDATE SET
            action        = excluded.action,
            duration      = excluded.duration,
            duration_unit = excluded.duration_unit,
            custom_dm     = excluded.custom_dm,
            reset_after   = excluded.reset_after
    `).run(guildId, step, action, duration || null, durationUnit || null, customDm || null, resetAfter ? 1 : 0);
}

// REF-DB-40
function deleteLadderStep(guildId, step) {
    db.prepare(
        'DELETE FROM punishment_ladder WHERE guild_id = ? AND step = ?'
    ).run(guildId, step);
}

// REF-DB-41
function clearLadder(guildId) {
    db.prepare(
        'DELETE FROM punishment_ladder WHERE guild_id = ?'
    ).run(guildId);
}

// REF-DB-42
function getPunishmentSettings(guildId) {
    return db.prepare(
        'SELECT * FROM punishment_settings WHERE guild_id = ?'
    ).get(guildId);
}

// REF-DB-43
function setPunishmentSettings(guildId, resetOnKick, resetOnBan, perModule) {
    db.prepare(`
        INSERT INTO punishment_settings (guild_id, reset_on_kick, reset_on_ban, per_module)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
            reset_on_kick = excluded.reset_on_kick,
            reset_on_ban  = excluded.reset_on_ban,
            per_module    = excluded.per_module
    `).run(guildId, resetOnKick ? 1 : 0, resetOnBan ? 1 : 0, perModule ? 1 : 0);
}


// === EXPORTS ===
module.exports = {
    db,
    getConfig,
    setConfig,
    getExemptions,
    addExemption,
    removeExemption,
    addModLog,
    getModLogs,
    addWarning,
    getWarnings,
    hasOwner,
    createUser,
    getUserByUsername,
    getUserById,
    getAllUsers,
    updateUserRole,
    updateUserTheme,
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
};
