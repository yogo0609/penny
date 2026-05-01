const { PermissionsBitField } = require('discord.js');
const { api } = require('../config');

// REF-BOT-04
async function isExempt(guildId, member) {
    if (!member) return false;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    try {
        const res = await api.get(`/api/exemptions/${guildId}`);
        const { roles, users } = res.data;
        if (users.includes(member.id)) return true;
        if (member.roles.cache.some(r => roles.includes(r.id))) return true;
        return false;
    } catch {
        return false;
    }
}

// REF-BOT-05
async function isChannelExempt(guildId, channelId) {
    try {
        const res = await api.get(`/api/exemptions/${guildId}`);
        return res.data.channels.includes(channelId);
    } catch {
        return false;
    }
}

// REF-BOT-05a
async function isModuleExempt(guildId, module, member, channelId) {
    try {
        const res = await api.get(`/api/module-exemptions/${guildId}/${module}`);
        const { roles, users, channels } = res.data;

        if (users.some(u => u.target_id === member.id))                            return true;
        if (channels.some(c => c.target_id === channelId))                         return true;
        if (member.roles.cache.some(r => roles.some(ro => ro.target_id === r.id))) return true;

        const global = await api.get(`/api/exemptions/${guildId}`);
        if (global.data.users.includes(member.id))                                 return true;
        if (global.data.channels.includes(channelId))                              return true;
        if (member.roles.cache.some(r => global.data.roles.includes(r.id)))        return true;

        return false;
    } catch {
        return false;
    }
}

module.exports = { isExempt, isChannelExempt, isModuleExempt };