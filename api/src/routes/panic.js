const express = require('express');
const router  = express.Router();
const db      = require('../db');

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

module.exports = router;