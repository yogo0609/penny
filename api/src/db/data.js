const { pool } = require('./connection');

// REF-DB-61
async function exportGuildData(guildId) {
    const config   = await pool.query('SELECT key, value FROM config WHERE guild_id = $1', [guildId]);
    const warnings = await pool.query('SELECT * FROM warnings WHERE guild_id = $1', [guildId]);
    return { config: config.rows, warnings: warnings.rows };
}

module.exports = { exportGuildData };