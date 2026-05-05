const { pool } = require('./connection');

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

// REF-DB-57
async function clearModLogs(guildId) {
    await pool.query('DELETE FROM mod_log WHERE guild_id = $1', [guildId]);
}

// REF-DB-59
async function clearWarnings(guildId) {
    await pool.query('DELETE FROM warnings WHERE guild_id = $1', [guildId]);
}

// REF-DB-60
async function clearBans(guildId) {
    await pool.query('DELETE FROM bans WHERE guild_id = $1', [guildId]);
}

module.exports = {
    addModLog, getModLogs,
    addWarning, getWarnings, getAllWarnings, clearUserWarnings,
    addBan, removeBan, getActiveBans, getBanHistory,
    getLadder, setLadderStep, deleteLadderStep, clearLadder,
    getPunishmentSettings, setPunishmentSettings,
    clearModLogs, clearWarnings, clearBans,
};