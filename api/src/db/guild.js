const { pool } = require('./connection');

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

module.exports = {
    setGuilds, getGuilds,
    setGuildChannels, getGuildChannels,
    setGuildRoles, getGuildRoles,
    addScheduledJob, getDueJobs, markJobDone,
};