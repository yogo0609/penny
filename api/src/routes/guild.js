const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireBodyFields, requireArrayField, jsonOk } = require('./helpers');

// REF-RT-39
router.get('/guild-channels/:guildId', async (req, res) => {
    const { guildId } = req.params;
    res.json(await db.getGuildChannels(guildId));
});

// REF-RT-40
router.post('/guild-channels/:guildId', async (req, res) => {
    const { guildId } = req.params;
    if (requireArrayField(req, res, 'channels')) return;
    await db.setGuildChannels(guildId, req.body.channels);
    jsonOk(res);
});

// REF-RT-41
router.get('/guild-roles/:guildId', async (req, res) => {
    const { guildId } = req.params;
    res.json(await db.getGuildRoles(guildId));
});

// REF-RT-42
router.post('/guild-roles/:guildId', async (req, res) => {
    const { guildId } = req.params;
    if (requireArrayField(req, res, 'roles')) return;
    await db.setGuildRoles(guildId, req.body.roles);
    jsonOk(res);
});

// REF-RT-43
router.get('/scheduled-jobs/due', async (req, res) => {
    res.json(await db.getDueJobs());
});

// REF-RT-44
router.patch('/scheduled-jobs/:id/done', async (req, res) => {
    await db.markJobDone(parseInt(req.params.id));
    jsonOk(res);
});

// REF-RT-45
router.post('/scheduled-jobs', async (req, res) => {
    if (requireBodyFields(req, res, ['guild_id', 'type', 'target_id', 'execute_at'])) return;
    await db.addScheduledJob(
        req.body.guild_id,
        req.body.type,
        req.body.target_id,
        req.body.execute_at,
        req.body.payload || null
    );
    jsonOk(res);
});

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
    } catch {
        res.status(500).json({ error: 'Export failed' });
    }
});

// REF-RT-28
router.delete('/data/logs/:guildId', async (req, res) => {
    const { guildId } = req.params;
    await db.clearModLogs(guildId);
    jsonOk(res);
});

// REF-RT-29
router.delete('/data/audit/:guildId', async (req, res) => {
    const { guildId } = req.params;
    await db.clearAuditLogs(guildId);
    jsonOk(res);
});

// REF-RT-30
router.delete('/data/warnings/:guildId', async (req, res) => {
    const { guildId } = req.params;
    await db.clearWarnings(guildId);
    jsonOk(res);
});

// REF-RT-31
router.delete('/data/bans/:guildId', async (req, res) => {
    const { guildId } = req.params;
    await db.clearBans(guildId);
    jsonOk(res);
});

// REF-RT-32
router.delete('/data/ladder/:guildId', async (req, res) => {
    const { guildId } = req.params;
    await db.clearLadder(guildId);
    jsonOk(res);
});

module.exports = router;