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

`);


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
        'SELECT id, username, role, discord_id, created_at, last_login FROM dashboard_users ORDER BY created_at ASC'
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
};
