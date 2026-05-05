const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { badRequest, requireBodyFields, requireArrayField, jsonOk } = require('./helpers');

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
    if (requireArrayField(req, res, 'guilds')) return;
    await db.setGuilds(req.body.guilds);
    jsonOk(res);
});

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
    res.json(await db.getConfigAll(guildId, keys));
});

// REF-RT-04
router.patch('/config/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const { key, value } = req.body;
    if (!key || value === undefined) return badRequest(res, 'key and value are required');
    await db.setConfig(guildId, key, value);
    res.json({ success: true, key, value });
});

// REF-RT-05
router.put('/config/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const updates = req.body;
    if (!updates || typeof updates !== 'object') return badRequest(res, 'Body must be a JSON object');
    for (const [key, value] of Object.entries(updates)) {
        await db.setConfig(guildId, key, value);
    }
    res.json({ success: true, updated: Object.keys(updates).length });
});

module.exports = router;