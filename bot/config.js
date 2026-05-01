require('dotenv').config();
const axios = require('axios');

const api = axios.create({
    baseURL: process.env.API_URL,
    headers: { 'x-api-key': process.env.API_SECRET },
});

// REF-BOT-01
const configCache  = new Map();
const CACHE_TTL_MS = 60_000; // 1 minute

async function getConfig(guildId) {
    const cached = configCache.get(guildId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;
    try {
        const res = await api.get(`/api/config/${guildId}`);
        configCache.set(guildId, { data: res.data, ts: Date.now() });
        return res.data;
    } catch (err) {
        console.error(`[CONFIG] Failed to load config for ${guildId}: ${err.message}`);
        return cached?.data || {};
    }
}

function invalidateConfig(guildId) {
    configCache.delete(guildId);
}

module.exports = { api, getConfig, invalidateConfig };