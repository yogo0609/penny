const { EmbedBuilder } = require('discord.js');
const { api, getConfig } = require('../config');

// REF-BOT-06
async function log(guild, config, type, description, color = 0xff4444, targetId = null, targetTag = null) {
    console.log(`[${type}] ${description}`);

    const channel = guild.channels.cache.get(config.log_channel_id);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(`🛡️ ${type}`)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    if (config.test_mode) embed.setFooter({ text: '⚠️ TEST MODE — no action taken' });

    await channel.send({ embeds: [embed] }).catch(() => {});

    // REF-BOT-07
    try {
        await api.post(`/api/logs/${guild.id}`, {
            action:     type,
            target_id:  targetId,
            target_tag: targetTag,
            moderator:  'Penny',
            reason:     description,
        });
    } catch {}
}

// REF-BOT-24
async function audit(guild, event, category, targetId, targetTag, moderator, detail, color = 0x3b82f6) {
    try {
        const config  = await getConfig(guild.id);
        const channel = guild.channels.cache.get(config.audit_channel_id);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle(`📋 ${event}`)
                .setColor(color)
                .setTimestamp();

            if (targetTag) embed.addFields({ name: 'Target', value: targetTag,                                     inline: true  });
            if (moderator) embed.addFields({ name: 'By',     value: moderator,                                     inline: true  });
            if (detail)    embed.addFields({ name: 'Detail', value: detail.replace(/\*\*/g, '').replace(/`/g, ''), inline: false });

            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    } catch {}

    try {
        await api.post(`/api/audit/${guild.id}`, {
            event, category,
            target_id:  targetId  || null,
            target_tag: targetTag || null,
            moderator:  moderator || null,
            detail:     detail    || null,
        });
    } catch {}
}

module.exports = { log, audit };