const { pool } = require('./connection');

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

// REF-DB-58
async function clearAuditLogs(guildId) {
    await pool.query('DELETE FROM audit_log WHERE guild_id = $1', [guildId]);
}

module.exports = { addAuditLog, getAuditLogs, getAuditConfig, setAuditConfig, clearAuditLogs };