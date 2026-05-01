// === DEPENDENCIES ===
const express = require('express');
const router  = express.Router();
const db      = require('./database');
const { verifyToken } = require('./auth');


// === MIDDLEWARE ===
// Uses verifyToken from auth.js to eliminate duplication
router.use(verifyToken);


// === HEALTH CHECK ===
// REF-RT-02
router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Penny API' });
});

// REF-RT-02a
router.get('/guilds', async (req, res) => {
    res.json(await db.getGuilds());
});

// REF-RT-02b
router.post('/guilds', async (req, res) => {
    const { guilds } = req.body;
    if (!guilds || !Array.isArray(guilds)) return res.status(400).json({ error: 'guilds array required' });
    await db.setGuilds(guilds);
    res.json({ success: true });
});


// === CONFIG ROUTES ===

// REF-RT-03
router.get('/config/:guildId', async (req, res) => {
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
        'anti_nuke_enabled', 'anti_nuke_threshold', 'anti_nuke_window_ms', 'anti_nuke_action',
        'antihoist_enabled',
        'accountage_enabled', 'accountage_min_days',
        'joingate_avatar_enabled', 'joingate_username_enabled', 'joingate_rejoin_enabled', 'joingate_rejoin_minutes',
        'verification_enabled', 'verification_channel_id', 'verification_role_id', 'verification_timeout_minutes',
        'welcome_enabled', 'welcome_channel_id', 'welcome_message',
        'autorole_enabled', 'autorole_id',
        'levels_enabled',
        'panic_alert_role', 'panic_alert_channel', 'panic_authorized_roles',
        'audit_channel_id',
        'audit_messages', 'audit_messages_edit', 'audit_messages_bulk',
        'audit_members', 'audit_members_leave', 'audit_members_roles', 'audit_members_nick',
        'audit_members_ban', 'audit_members_unban', 'audit_members_kick', 'audit_members_timeout',
        'audit_server_channel', 'audit_server_role', 'audit_server_emoji', 'audit_server_webhook',
        'audit_voice',
    ];
    const config = await db.getConfigAll(guildId, keys);
    res.json(config);
});

// REF-RT-04
router.patch('/config/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ error: 'key and value are required' });
    await db.setConfig(guildId, key, value);
    res.json({ success: true, key, value });
});

// REF-RT-05
router.put('/config/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const updates = req.body;
    if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'Body must be a JSON object' });
    for (const [key, value] of Object.entries(updates)) {
        await db.setConfig(guildId, key, value);
    }
    res.json({ success: true, updated: Object.keys(updates).length });
});


// === EXEMPTION ROUTES ===

// REF-RT-06
router.get('/exemptions/:guildId', async (req, res) => {
    const { guildId } = req.params;
    res.json({
        roles:    await db.getExemptions(guildId, 'role'),
        users:    await db.getExemptions(guildId, 'user'),
        channels: await db.getExemptions(guildId, 'channel'),
    });
});

// REF-RT-07
router.post('/exemptions/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { type, target_id, added_by } = req.body;
    if (!type || !target_id || !added_by) return res.status(400).json({ error: 'type, target_id, and added_by are required' });
    if (!['role', 'user', 'channel'].includes(type)) return res.status(400).json({ error: 'type must be role, user, or channel' });
    await db.addExemption(guildId, type, target_id, added_by);
    res.json({ success: true });
});

// REF-RT-08
router.delete('/exemptions/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { type, target_id } = req.body;
    if (!type || !target_id) return res.status(400).json({ error: 'type and target_id are required' });
    await db.removeExemption(guildId, type, target_id);
    res.json({ success: true });
});


// === MOD LOG ROUTES ===

// REF-RT-09
router.get('/logs/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    res.json(await db.getModLogs(guildId, limit));
});

// REF-RT-09a
router.post('/logs/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { action, target_id, target_tag, moderator, reason } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required' });
    await db.addModLog(guildId, action, target_id || null, target_tag || null, moderator || 'Penny', reason || null);
    res.json({ success: true });
});


// === WARNING ROUTES ===

// REF-RT-10
router.get('/warnings/:guildId/:userId', async (req, res) => {
    const { guildId, userId } = req.params;
    res.json(await db.getWarnings(guildId, userId));
});

// REF-RT-10a
router.get('/warnings/:guildId', async (req, res) => {
    const { guildId } = req.params;
    res.json(await db.getAllWarnings(guildId));
});

// REF-RT-11
router.post('/warnings/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { user_id, user_tag, reason, issued_by } = req.body;
    if (!user_id || !user_tag || !issued_by) return res.status(400).json({ error: 'user_id, user_tag, and issued_by are required' });
    await db.addWarning(guildId, user_id, user_tag, reason || 'No reason provided', issued_by);
    res.json({ success: true });
});

// REF-RT-12
router.delete('/warnings/:guildId/:userId', async (req, res) => {
    const { guildId, userId } = req.params;
    await db.clearUserWarnings(guildId, userId);
    res.json({ success: true });
});


// === BAN ROUTES ===

// REF-RT-13
router.get('/bans/:guildId', async (req, res) => {
    const { guildId } = req.params;
    res.json(await db.getActiveBans(guildId));
});

// REF-RT-14
router.post('/bans/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { user_id, user_tag, reason, banned_by } = req.body;
    if (!user_id || !user_tag || !banned_by) return res.status(400).json({ error: 'user_id, user_tag and banned_by are required' });
    await db.addBan(guildId, user_id, user_tag, reason || 'No reason provided', banned_by);
    res.json({ success: true });
});

// REF-RT-15
router.patch('/bans/:guildId/:userId', async (req, res) => {
    const { guildId, userId } = req.params;
    const { unbanned_by } = req.body;
    if (!unbanned_by) return res.status(400).json({ error: 'unbanned_by is required' });
    await db.removeBan(guildId, userId, unbanned_by);
    res.json({ success: true });
});

// REF-RT-16
router.get('/bans/:guildId/:userId', async (req, res) => {
    const { guildId, userId } = req.params;
    res.json(await db.getBanHistory(guildId, userId));
});


// === AUDIT LOG ROUTES ===

// REF-RT-17
router.get('/audit/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const limit    = parseInt(req.query.limit) || 100;
    const category = req.query.category || null;
    res.json(await db.getAuditLogs(guildId, limit, category));
});

// REF-RT-18
router.post('/audit/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { event, category, target_id, target_tag, moderator, detail } = req.body;
    if (!event || !category) return res.status(400).json({ error: 'event and category are required' });
    await db.addAuditLog(guildId, event, category, target_id, target_tag, moderator, detail);
    res.json({ success: true });
});

// REF-RT-19
router.get('/audit-config/:guildId', async (req, res) => {
    const { guildId } = req.params;
    res.json(await db.getAuditConfig(guildId));
});

// REF-RT-20
router.post('/audit-config/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { event, enabled, channel_id } = req.body;
    if (!event || enabled === undefined) return res.status(400).json({ error: 'event and enabled are required' });
    await db.setAuditConfig(guildId, event, enabled, channel_id || null);
    res.json({ success: true });
});


// === DATA MANAGEMENT ROUTES ===

// REF-RT-27
router.get('/export/:guildId', async (req, res) => {
    const { guildId } = req.params;
    try {
        const { config, warnings } = await db.exportGuildData(guildId);
        res.json({
            guildId,
            exportedAt: new Date().toISOString(),
            config,
            modLogs:  await db.getModLogs(guildId, 99999),
            warnings,
            bans:     await db.getActiveBans(guildId),
            audit:    await db.getAuditLogs(guildId, 99999),
            ladder:   await db.getLadder(guildId),
        });
    } catch(err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// REF-RT-28
router.delete('/data/logs/:guildId', async (req, res) => {
    const { guildId } = req.params;
    await db.clearModLogs(guildId);
    res.json({ success: true });
});

// REF-RT-29
router.delete('/data/audit/:guildId', async (req, res) => {
    const { guildId } = req.params;
    await db.clearAuditLogs(guildId);
    res.json({ success: true });
});

// REF-RT-30
router.delete('/data/warnings/:guildId', async (req, res) => {
    const { guildId } = req.params;
    await db.clearWarnings(guildId);
    res.json({ success: true });
});

// REF-RT-31
router.delete('/data/bans/:guildId', async (req, res) => {
    const { guildId } = req.params;
    await db.clearBans(guildId);
    res.json({ success: true });
});

// REF-RT-32
router.delete('/data/ladder/:guildId', async (req, res) => {
    const { guildId } = req.params;
    await db.clearLadder(guildId);
    res.json({ success: true });
});


// === MODULE EXEMPTION ROUTES ===

// REF-RT-33
router.get('/module-exemptions/:guildId/:module', async (req, res) => {
    const { guildId, module } = req.params;
    res.json(await db.getModuleExemptions(guildId, module));
});

// REF-RT-34
router.post('/module-exemptions/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { module, type, target_id, added_by, note } = req.body;
    if (!type || !target_id) return res.status(400).json({ error: 'type and target_id are required' });
    if (!['role', 'user', 'channel'].includes(type)) return res.status(400).json({ error: 'type must be role, user or channel' });
    await db.addModuleExemption(guildId, module, type, target_id, added_by || 'dashboard', note || null);
    res.json({ success: true });
});

// REF-RT-35
router.delete('/module-exemptions/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { module, type, target_id } = req.body;
    if (!type || !target_id) return res.status(400).json({ error: 'type and target_id are required' });
    await db.removeModuleExemption(guildId, module, type, target_id);
    res.json({ success: true });
});


// === PANIC MODE ROUTES ===

// REF-RT-36
router.get('/panic/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const state = await db.getPanicState(guildId);
    res.json(state || { active: 0 });
});

// REF-RT-37
router.post('/panic/:guildId/activate', async (req, res) => {
    const { guildId } = req.params;
    const { triggered_by, channel_snapshot } = req.body;
    if (!triggered_by) return res.status(400).json({ error: 'triggered_by required' });
    await db.setPanicActive(guildId, triggered_by, channel_snapshot || []);
    res.json({ success: true });
});

// REF-RT-38
router.post('/panic/:guildId/deactivate', async (req, res) => {
    const { guildId } = req.params;
    const { deactivated_by } = req.body;
    if (!deactivated_by) return res.status(400).json({ error: 'deactivated_by required' });
    await db.setPanicInactive(guildId, deactivated_by);
    res.json({ success: true });
});


// === PUNISHMENT LADDER ROUTES ===

// REF-RT-21
router.get('/ladder/:guildId', async (req, res) => {
    const { guildId } = req.params;
    res.json(await db.getLadder(guildId));
});

// REF-RT-22
router.post('/ladder/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { step, action, duration, duration_unit, custom_dm, reset_after } = req.body;
    if (!step || !action) return res.status(400).json({ error: 'step and action required' });
    await db.setLadderStep(guildId, step, action, duration, duration_unit, custom_dm, reset_after);
    res.json({ success: true });
});

// REF-RT-23
router.delete('/ladder/:guildId/:step', async (req, res) => {
    const { guildId, step } = req.params;
    await db.deleteLadderStep(guildId, parseInt(step));
    res.json({ success: true });
});

// REF-RT-24
router.delete('/ladder/:guildId', async (req, res) => {
    const { guildId } = req.params;
    await db.clearLadder(guildId);
    res.json({ success: true });
});

// REF-RT-25
router.get('/punishment-settings/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const settings = await db.getPunishmentSettings(guildId);
    res.json(settings || { reset_on_kick: 1, reset_on_ban: 1, per_module: 0 });
});

// REF-RT-26
router.post('/punishment-settings/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { reset_on_kick, reset_on_ban, per_module } = req.body;
    await db.setPunishmentSettings(guildId, reset_on_kick, reset_on_ban, per_module);
    res.json({ success: true });
});


// === GUILD CHANNELS & ROLES ===

// REF-RT-39
router.get('/guild-channels/:guildId', async (req, res) => {
    const { guildId } = req.params;
    res.json(await db.getGuildChannels(guildId));
});

// REF-RT-40
router.post('/guild-channels/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { channels } = req.body;
    if (!channels || !Array.isArray(channels)) return res.status(400).json({ error: 'channels array required' });
    await db.setGuildChannels(guildId, channels);
    res.json({ success: true });
});

// REF-RT-41
router.get('/guild-roles/:guildId', async (req, res) => {
    const { guildId } = req.params;
    res.json(await db.getGuildRoles(guildId));
});

// REF-RT-42
router.post('/guild-roles/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { roles } = req.body;
    if (!roles || !Array.isArray(roles)) return res.status(400).json({ error: 'roles array required' });
    await db.setGuildRoles(guildId, roles);
    res.json({ success: true });
});

// REF-RT-43
router.get('/scheduled-jobs/due', async (req, res) => {
    res.json(await db.getDueJobs());
});

// REF-RT-44
router.patch('/scheduled-jobs/:id/done', async (req, res) => {
    await db.markJobDone(parseInt(req.params.id));
    res.json({ success: true });
});

// REF-RT-45
router.post('/scheduled-jobs', async (req, res) => {
    const { guild_id, type, target_id, execute_at, payload } = req.body;
    if (!guild_id || !type || !target_id || !execute_at) {
        return res.status(400).json({ error: 'guild_id, type, target_id, execute_at required' });
    }
    await db.addScheduledJob(guild_id, type, target_id, execute_at, payload || null);
    res.json({ success: true });
});

// === EXPORTS ===
module.exports = router;