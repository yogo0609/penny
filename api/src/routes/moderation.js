const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireBodyFields, requireArrayField, jsonOk } = require('./helpers');

// REF-RT-09
router.get('/logs/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    res.json(await db.getModLogs(guildId, limit));
});

// REF-RT-09a
router.post('/logs/:guildId', async (req, res) => {
    const { guildId } = req.params;
    if (requireBodyFields(req, res, ['action'])) return;
    await db.addModLog(
        guildId,
        req.body.action,
        req.body.target_id  || null,
        req.body.target_tag || null,
        req.body.moderator  || 'Penny',
        req.body.reason     || null
    );
    jsonOk(res);
});

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
    if (requireBodyFields(req, res, ['user_id', 'user_tag', 'issued_by'])) return;
    await db.addWarning(
        guildId,
        req.body.user_id,
        req.body.user_tag,
        req.body.reason || 'No reason provided',
        req.body.issued_by
    );
    jsonOk(res);
});

// REF-RT-12
router.delete('/warnings/:guildId/:userId', async (req, res) => {
    const { guildId, userId } = req.params;
    await db.clearUserWarnings(guildId, userId);
    jsonOk(res);
});

// REF-RT-13
router.get('/bans/:guildId', async (req, res) => {
    const { guildId } = req.params;
    res.json(await db.getActiveBans(guildId));
});

// REF-RT-14
router.post('/bans/:guildId', async (req, res) => {
    const { guildId } = req.params;
    if (requireBodyFields(req, res, ['user_id', 'user_tag', 'banned_by'])) return;
    await db.addBan(
        guildId,
        req.body.user_id,
        req.body.user_tag,
        req.body.reason || 'No reason provided',
        req.body.banned_by
    );
    jsonOk(res);
});

// REF-RT-15
router.patch('/bans/:guildId/:userId', async (req, res) => {
    const { guildId, userId } = req.params;
    if (requireBodyFields(req, res, ['unbanned_by'])) return;
    await db.removeBan(guildId, userId, req.body.unbanned_by);
    jsonOk(res);
});

// REF-RT-16
router.get('/bans/:guildId/:userId', async (req, res) => {
    const { guildId, userId } = req.params;
    res.json(await db.getBanHistory(guildId, userId));
});

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
    jsonOk(res);
});

// REF-RT-23
router.delete('/ladder/:guildId/:step', async (req, res) => {
    const { guildId, step } = req.params;
    await db.deleteLadderStep(guildId, parseInt(step));
    jsonOk(res);
});

// REF-RT-24
router.delete('/ladder/:guildId', async (req, res) => {
    const { guildId } = req.params;
    await db.clearLadder(guildId);
    jsonOk(res);
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
    jsonOk(res);
});

module.exports = router;