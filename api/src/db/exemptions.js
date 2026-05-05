const { pool } = require('./connection');

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

module.exports = { getExemptions, addExemption, removeExemption, getModuleExemptions, addModuleExemption, removeModuleExemption };