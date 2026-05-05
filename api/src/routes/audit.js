const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireBodyFields, jsonOk } = require('./helpers');

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
    if (requireBodyFields(req, res, ['event', 'category'])) return;
    await db.addAuditLog(
        guildId,
        req.body.event,
        req.body.category,
        req.body.target_id  || null,
        req.body.target_tag || null,
        req.body.moderator  || null,
        req.body.detail     || null
    );
    jsonOk(res);
});

// REF-RT-19
router.get('/audit-config/:guildId', async (req, res) => {
    const { guildId } = req.params;
    res.json(await db.getAuditConfig(guildId));
});

// REF-RT-20
router.post('/audit-config/:guildId', async (req, res) => {
    const { guildId } = req.params;
    if (requireBodyFields(req, res, ['event', 'enabled'])) return;
    await db.setAuditConfig(guildId, req.body.event, req.body.enabled, req.body.channel_id || null);
    jsonOk(res);
});

module.exports = router;