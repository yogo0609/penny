const { pool } = require('./connection');

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

module.exports = { getPanicState, setPanicActive, setPanicInactive };