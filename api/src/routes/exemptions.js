const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireBodyFields, validateType, jsonOk } = require('./helpers');

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
    if (requireBodyFields(req, res, ['type', 'target_id', 'added_by'])) return;
    if (validateType(res, req.body.type, ['role', 'user', 'channel'])) return;
    await db.addExemption(guildId, req.body.type, req.body.target_id, req.body.added_by);
    jsonOk(res);
});

// REF-RT-08
router.delete('/exemptions/:guildId', async (req, res) => {
    const { guildId } = req.params;
    if (requireBodyFields(req, res, ['type', 'target_id'])) return;
    await db.removeExemption(guildId, req.body.type, req.body.target_id);
    jsonOk(res);
});

// REF-RT-33
router.get('/module-exemptions/:guildId/:module', async (req, res) => {
    const { guildId, module } = req.params;
    res.json(await db.getModuleExemptions(guildId, module));
});

// REF-RT-34
router.post('/module-exemptions/:guildId', async (req, res) => {
    const { guildId } = req.params;
    if (requireBodyFields(req, res, ['module', 'type', 'target_id'])) return;
    if (validateType(res, req.body.type, ['role', 'user', 'channel'])) return;
    await db.addModuleExemption(
        guildId,
        req.body.module,
        req.body.type,
        req.body.target_id,
        req.body.added_by || 'dashboard',
        req.body.note || null
    );
    jsonOk(res);
});

// REF-RT-35
router.delete('/module-exemptions/:guildId', async (req, res) => {
    const { guildId } = req.params;
    if (requireBodyFields(req, res, ['module', 'type', 'target_id'])) return;
    await db.removeModuleExemption(guildId, req.body.module, req.body.type, req.body.target_id);
    jsonOk(res);
});

module.exports = router;