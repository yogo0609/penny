// === DEPENDENCIES ===
const express = require('express');
const router  = express.Router();
const db      = require('./database');


// === AUTHENTICATION MIDDLEWARE ===
// REF-RT-01
function authenticate(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === process.env.API_SECRET) {
        return next();
    }

    const auth  = req.headers['authorization'];
    const token = auth && auth.split(' ')[1];
    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            jwt.verify(token, process.env.JWT_SECRET);
            return next();
        } catch {}
    }

    return res.status(401).json({ error: 'Unauthorized' });
}

router.use(authenticate);


// === HEALTH CHECK ===
// REF-RT-02
router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Penny API' });
});

// REF-RT-02a — Get all guilds Penny is in
router.get('/guilds', (req, res) => {
    res.json(db.getGuilds());
});

// REF-RT-02b — Bot registers its guilds on startup
router.post('/guilds', (req, res) => {
    const { guilds } = req.body;
    if (!guilds || !Array.isArray(guilds)) {
        return res.status(400).json({ error: 'guilds array required' });
    }
    db.setGuilds(guilds);
    res.json({ success: true });
});


// === CONFIG ROUTES ===

// REF-RT-03 — Get all config for a guild
router.get('/config/:guildId', (req, res) => {
    const { guildId } = req.params;

    const keys = [
        'test_mode',
        'log_channel_id',
        'spam_enabled', 'spam_max_messages', 'spam_window_ms', 'spam_action',
        'raid_enabled', 'raid_max_joins', 'raid_window_ms', 'raid_action',
        'badwords_enabled', 'badwords_list', 'badwords_action',
        'caps_enabled', 'caps_min_length', 'caps_threshold', 'caps_action',
        'mass_mention_enabled', 'mass_mention_max', 'mass_mention_action',
        'antilink_enabled', 'antilink_action',
        'antilink_all_enabled', 'antilink_all_action',
        'repeat_enabled', 'repeat_action', 'repeat_min_length', 'repeat_threshold',
        'emojispam_enabled', 'emojispam_action', 'emojispam_max',
        'newline_enabled', 'newline_action', 'newline_max',
        'zalgo_enabled', 'zalgo_action',
        'antihoist_enabled',
        'antiphishing_enabled',
        'accountage_enabled', 'accountage_min_days',
        'welcome_enabled', 'welcome_channel_id', 'welcome_message',
        'autorole_enabled', 'autorole_id',
        'levels_enabled',
        'audit_channel_id',
        'audit_messages',
        'audit_messages_edit',
        'audit_messages_bulk',
        'audit_members',
        'audit_members_leave',
        'audit_members_roles',
        'audit_members_nick',
        'audit_members_ban',
        'audit_members_unban',
        'audit_members_kick',
        'audit_members_timeout',
        'audit_server_channel',
        'audit_server_role',
        'audit_server_emoji',
        'audit_server_webhook',
        'audit_voice',
    ];

    const config = {};
    for (const key of keys) {
        config[key] = db.getConfig(guildId, key, null);
    }

    res.json(config);
});

// REF-RT-04 — Update a single config value
router.patch('/config/:guildId', (req, res) => {
    const { guildId } = req.params;
    const { key, value } = req.body;

    if (!key || value === undefined) {
        return res.status(400).json({ error: 'key and value are required' });
    }

    db.setConfig(guildId, key, value);
    res.json({ success: true, key, value });
});

// REF-RT-05 — Bulk update config
router.put('/config/:guildId', (req, res) => {
    const { guildId } = req.params;
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'Body must be a JSON object' });
    }

    for (const [key, value] of Object.entries(updates)) {
        db.setConfig(guildId, key, value);
    }

    res.json({ success: true, updated: Object.keys(updates).length });
});


// === EXEMPTION ROUTES ===

// REF-RT-06 — Get all exemptions for a guild
router.get('/exemptions/:guildId', (req, res) => {
    const { guildId } = req.params;
    res.json({
        roles:    db.getExemptions(guildId, 'role'),
        users:    db.getExemptions(guildId, 'user'),
        channels: db.getExemptions(guildId, 'channel'),
    });
});

// REF-RT-07 — Add an exemption
router.post('/exemptions/:guildId', (req, res) => {
    const { guildId } = req.params;
    const { type, target_id, added_by } = req.body;

    if (!type || !target_id || !added_by) {
        return res.status(400).json({ error: 'type, target_id, and added_by are required' });
    }

    if (!['role', 'user', 'channel'].includes(type)) {
        return res.status(400).json({ error: 'type must be role, user, or channel' });
    }

    db.addExemption(guildId, type, target_id, added_by);
    res.json({ success: true });
});

// REF-RT-08 — Remove an exemption
router.delete('/exemptions/:guildId', (req, res) => {
    const { guildId } = req.params;
    const { type, target_id } = req.body;

    if (!type || !target_id) {
        return res.status(400).json({ error: 'type and target_id are required' });
    }

    db.removeExemption(guildId, type, target_id);
    res.json({ success: true });
});


// === MOD LOG ROUTES ===

// REF-RT-09 — Get mod logs for a guild
router.get('/logs/:guildId', (req, res) => {
    const { guildId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    res.json(db.getModLogs(guildId, limit));
});

// REF-RT-09a — Post a mod log entry from the bot
router.post('/logs/:guildId', (req, res) => {
    const { guildId }                                              = req.params;
    const { action, target_id, target_tag, moderator, reason }    = req.body;

    if (!action) return res.status(400).json({ error: 'action is required' });

    db.addModLog(guildId, action, target_id || null, target_tag || null, moderator || 'Penny', reason || null);
    res.json({ success: true });
});


// === WARNING ROUTES ===

// REF-RT-10 — Get warnings for a user
router.get('/warnings/:guildId/:userId', (req, res) => {
    const { guildId, userId } = req.params;
    res.json(db.getWarnings(guildId, userId));
});

// REF-RT-10a — Get all warnings for a guild
router.get('/warnings/:guildId', (req, res) => {
    const { guildId } = req.params;
    const warnings = db.db.prepare(
        'SELECT * FROM warnings WHERE guild_id = ? ORDER BY issued_at DESC'
    ).all(guildId);
    res.json(warnings);
});

// REF-RT-11 — Add a warning manually from dashboard
router.post('/warnings/:guildId', (req, res) => {
    const { guildId } = req.params;
    const { user_id, user_tag, reason, issued_by } = req.body;

    if (!user_id || !user_tag || !issued_by) {
        return res.status(400).json({ error: 'user_id, user_tag, and issued_by are required' });
    }

    db.addWarning(guildId, user_id, user_tag, reason || 'No reason provided', issued_by);
    res.json({ success: true });
});

// REF-RT-12 — Clear all warnings for a user
router.delete('/warnings/:guildId/:userId', (req, res) => {
    const { guildId, userId } = req.params;
    db.db.prepare(
        'DELETE FROM warnings WHERE guild_id = ? AND user_id = ?'
    ).run(guildId, userId);
    res.json({ success: true });
});


// === BAN ROUTES ===

// REF-RT-13 — Get active bans for a guild
router.get('/bans/:guildId', (req, res) => {
    const { guildId } = req.params;
    res.json(db.getActiveBans(guildId));
});

// REF-RT-14 — Add a ban record
router.post('/bans/:guildId', (req, res) => {
    const { guildId }                              = req.params;
    const { user_id, user_tag, reason, banned_by } = req.body;

    if (!user_id || !user_tag || !banned_by) {
        return res.status(400).json({ error: 'user_id, user_tag and banned_by are required' });
    }

    db.addBan(guildId, user_id, user_tag, reason || 'No reason provided', banned_by);
    res.json({ success: true });
});

// REF-RT-15 — Remove a ban record (unban)
router.patch('/bans/:guildId/:userId', (req, res) => {
    const { guildId, userId } = req.params;
    const { unbanned_by }     = req.body;

    if (!unbanned_by) return res.status(400).json({ error: 'unbanned_by is required' });

    db.removeBan(guildId, userId, unbanned_by);
    res.json({ success: true });
});

// REF-RT-16 — Get ban history for a user
router.get('/bans/:guildId/:userId', (req, res) => {
    const { guildId, userId } = req.params;
    res.json(db.getBanHistory(guildId, userId));
});


// === AUDIT LOG ROUTES ===

// REF-RT-17 — Get audit logs for a guild
router.get('/audit/:guildId', (req, res) => {
    const { guildId }  = req.params;
    const limit        = parseInt(req.query.limit) || 100;
    const category     = req.query.category || null;
    res.json(db.getAuditLogs(guildId, limit, category));
});

// REF-RT-18 — Post an audit log event
router.post('/audit/:guildId', (req, res) => {
    const { guildId }                                                   = req.params;
    const { event, category, target_id, target_tag, moderator, detail } = req.body;

    if (!event || !category) {
        return res.status(400).json({ error: 'event and category are required' });
    }

    db.addAuditLog(guildId, event, category, target_id, target_tag, moderator, detail);
    res.json({ success: true });
});

// REF-RT-19 — Get audit config for a guild
router.get('/audit-config/:guildId', (req, res) => {
    const { guildId } = req.params;
    res.json(db.getAuditConfig(guildId));
});

// REF-RT-20 — Update audit config for a guild
router.post('/audit-config/:guildId', (req, res) => {
    const { guildId }                    = req.params;
    const { event, enabled, channel_id } = req.body;

    if (!event || enabled === undefined) {
        return res.status(400).json({ error: 'event and enabled are required' });
    }

    db.setAuditConfig(guildId, event, enabled, channel_id || null);
    res.json({ success: true });
});

// === DATA MANAGEMENT ROUTES ===

// REF-RT-27 — Export all guild data as JSON
router.get('/export/:guildId', (req, res) => {
    const { guildId } = req.params;
    try {
        const config   = db.db.prepare('SELECT key, value FROM config WHERE guild_id = ?').all(guildId);
        const modLogs  = db.getModLogs(guildId, 99999);
        const warnings = db.db.prepare('SELECT * FROM warnings WHERE guild_id = ?').all(guildId);
        const bans     = db.getActiveBans(guildId);
        const audit    = db.getAuditLogs(guildId, 99999);
        const ladder   = db.getLadder(guildId);
        res.json({
            guildId,
            exportedAt: new Date().toISOString(),
            config,
            modLogs,
            warnings,
            bans,
            audit,
            ladder,
        });
    } catch(err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// REF-RT-28 — Clear mod logs
router.delete('/data/logs/:guildId', (req, res) => {
    const { guildId } = req.params;
    db.db.prepare('DELETE FROM mod_log WHERE guild_id = ?').run(guildId);
    res.json({ success: true });
});

// REF-RT-29 — Clear audit logs
router.delete('/data/audit/:guildId', (req, res) => {
    const { guildId } = req.params;
    db.db.prepare('DELETE FROM audit_log WHERE guild_id = ?').run(guildId);
    res.json({ success: true });
});

// REF-RT-30 — Clear all warnings
router.delete('/data/warnings/:guildId', (req, res) => {
    const { guildId } = req.params;
    db.db.prepare('DELETE FROM warnings WHERE guild_id = ?').run(guildId);
    res.json({ success: true });
});

// REF-RT-31 — Clear ban records
router.delete('/data/bans/:guildId', (req, res) => {
    const { guildId } = req.params;
    db.db.prepare('DELETE FROM bans WHERE guild_id = ?').run(guildId);
    res.json({ success: true });
});

// REF-RT-32 — Clear punishment ladder
router.delete('/data/ladder/:guildId', (req, res) => {
    const { guildId } = req.params;
    db.clearLadder(guildId);
    res.json({ success: true });
});

// === MODULE EXEMPTION ROUTES ===

// REF-RT-33 — Get exemptions for a specific module
router.get('/module-exemptions/:guildId/:module', (req, res) => {
    const { guildId, module } = req.params;
    res.json(db.getModuleExemptions(guildId, module));
});

// REF-RT-34 — Add a module exemption
router.post('/module-exemptions/:guildId/:module', (req, res) => {
    const { guildId, module }          = req.params;
    const { type, target_id, added_by } = req.body;

    if (!type || !target_id || !added_by) {
        return res.status(400).json({ error: 'type, target_id and added_by are required' });
    }

    if (!['role', 'user', 'channel'].includes(type)) {
        return res.status(400).json({ error: 'type must be role, user or channel' });
    }

    db.addModuleExemption(guildId, module, type, target_id, added_by);
    res.json({ success: true });
});

// REF-RT-35 — Remove a module exemption
router.delete('/module-exemptions/:guildId/:module', (req, res) => {
    const { guildId, module }  = req.params;
    const { type, target_id }  = req.body;

    if (!type || !target_id) {
        return res.status(400).json({ error: 'type and target_id are required' });
    }

    db.removeModuleExemption(guildId, module, type, target_id);
    res.json({ success: true });
});

// === PUNISHMENT LADDER ROUTES ===

// REF-RT-21 — Get ladder for a guild
router.get('/ladder/:guildId', (req, res) => {
    const { guildId } = req.params;
    res.json(db.getLadder(guildId));
});

// REF-RT-22 — Set a ladder step
router.post('/ladder/:guildId', (req, res) => {
    const { guildId } = req.params;
    const { step, action, duration, duration_unit, custom_dm, reset_after } = req.body;
    if (!step || !action) return res.status(400).json({ error: 'step and action required' });
    db.setLadderStep(guildId, step, action, duration, duration_unit, custom_dm, reset_after);
    res.json({ success: true });
});

// REF-RT-23 — Delete a ladder step
router.delete('/ladder/:guildId/:step', (req, res) => {
    const { guildId, step } = req.params;
    db.deleteLadderStep(guildId, parseInt(step));
    res.json({ success: true });
});

// REF-RT-24 — Clear entire ladder for a guild
router.delete('/ladder/:guildId', (req, res) => {
    const { guildId } = req.params;
    db.clearLadder(guildId);
    res.json({ success: true });
});

// REF-RT-25 — Get punishment settings
router.get('/punishment-settings/:guildId', (req, res) => {
    const { guildId } = req.params;
    const settings = db.getPunishmentSettings(guildId);
    res.json(settings || { reset_on_kick: 1, reset_on_ban: 1, per_module: 0 });
});

// REF-RT-26 — Save punishment settings
router.post('/punishment-settings/:guildId', (req, res) => {
    const { guildId } = req.params;
    const { reset_on_kick, reset_on_ban, per_module } = req.body;
    db.setPunishmentSettings(guildId, reset_on_kick, reset_on_ban, per_module);
    res.json({ success: true });
});

// === EXPORTS ===
module.exports = router;
