const { pool } = require('./connection');

// REF-DB-07
async function getConfig(guildId, key, fallback = null) {
    const res = await pool.query(
        'SELECT value FROM config WHERE guild_id = $1 AND key = $2',
        [guildId, key]
    );
    return res.rows[0] ? JSON.parse(res.rows[0].value) : fallback;
}

// REF-DB-07a
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

module.exports = { getConfig, getConfigAll, setConfig };