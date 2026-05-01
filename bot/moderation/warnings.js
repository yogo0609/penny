const { api } = require('../config');

// REF-BOT-09a
async function inlineWarn(message, reason) {
    const warning = await message.channel.send(
        `⚠️ <@${message.author.id}> — ${reason} Repeated violations may result in escalated action.`
    ).catch(() => {});
    if (warning) setTimeout(() => warning.delete().catch(() => {}), 8000);
}

// REF-BOT-08
async function takeAction(member, action, reason, config) {
    if (config.test_mode) return;
    try {
        if (action === 'kick') {
            await member.send(
                `🚨 You have been **kicked** from **${member.guild.name}**\nReason: ${reason}`
            ).catch(() => {});
            await member.kick(reason);
            await api.post(`/api/logs/${member.guild.id}`, {
                action:     'KICK',
                target_id:  member.id,
                target_tag: member.user.tag,
                moderator:  'Penny',
                reason,
            }).catch(() => {});
            const { getConfig } = require('../config');
            const kickConfig = await getConfig(member.guild.id);
            const logChannel = member.guild.channels.cache.get(kickConfig.log_channel_id);
            if (logChannel) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setTitle('👢 Member Kicked')
                    .setColor(0xff4444)
                    .addFields(
                        { name: 'User',   value: member.user.tag, inline: true },
                        { name: 'Reason', value: reason,          inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }
        if (action === 'ban')  await member.ban({ reason, deleteMessageSeconds: 86400 });
        if (action === 'warn') await issueWarning(member, reason, config);
    } catch (err) {
        console.error(`[ACTION] Failed ${action} on ${member.user?.tag}: ${err.message}`);
    }
}

// REF-BOT-07a
async function handleModuleAction(action, message, member, reason, config) {
    const act = action || 'ladder';

    if (act === 'delete' || act === 'delete_warn' || act === 'ladder') {
        await message.delete().catch(() => {});
    }
    if (act === 'delete') {
        await inlineWarn(message, `Your message was removed. Reason: ${reason}`);
        return;
    }
    if (act === 'delete_warn' || act === 'ladder') {
        await inlineWarn(message, `Your message was removed. Reason: ${reason}`);
        await issueWarning(member, reason, config);
        return;
    }
    if (act === 'kick') {
        await message.delete().catch(() => {});
        await takeAction(member, 'kick', reason, config);
        return;
    }
    if (act === 'ban') {
        await message.delete().catch(() => {});
        await takeAction(member, 'ban', reason, config);
        return;
    }
}

// REF-BOT-09
async function issueWarning(member, reason, config) {
    try {
        await api.post(`/api/warnings/${member.guild.id}`, {
            user_id:   member.id,
            user_tag:  member.user.tag,
            reason,
            issued_by: 'Penny',
        });

        const res     = await api.get(`/api/warnings/${member.guild.id}/${member.id}`);
        const count   = res.data.length;

        const ladderRes   = await api.get(`/api/ladder/${member.guild.id}`);
        const ladder      = ladderRes.data;
        const settingsRes = await api.get(`/api/punishment-settings/${member.guild.id}`);
        const settings    = settingsRes.data;

        if (ladder && ladder.length > 0) {
            const step  = ladder.find(s => s.step === count);
            const dmMsg = step?.custom_dm ||
                `⚠️ **Warning ${count}/${ladder[ladder.length - 1].step}** in ${member.guild.name}\nReason: ${reason}`;
            await member.send(dmMsg).catch(() => {});

            if (step) {
                const units = { minutes: 60000, hours: 3600000, days: 86400000 };

                if (step.action === 'mute' && step.duration) {
                    const ms = step.duration * (units[step.duration_unit] || 60000);
                    await member.timeout(ms, reason).catch(() => {});
                    await api.post(`/api/logs/${member.guild.id}`, {
                        action: 'MUTE', target_id: member.id, target_tag: member.user.tag,
                        moderator: 'Penny', reason: `Warning ${count} — ${reason}`,
                    }).catch(() => {});
                }
                if (step.action === 'kick') {
                    if (settings?.reset_on_kick) await api.delete(`/api/warnings/${member.guild.id}/${member.id}`).catch(() => {});
                    await takeAction(member, 'kick', `Warning ${count} — ${reason}`, config);
                }
                if (step.action === 'tempban' && step.duration) {
                    const ms = step.duration * (units[step.duration_unit] || 3600000);
                    if (settings?.reset_on_ban) await api.delete(`/api/warnings/${member.guild.id}/${member.id}`).catch(() => {});
                    await member.send(
                        `🚨 You have been **temporarily banned** from **${member.guild.name}**\nDuration: ${step.duration} ${step.duration_unit}\nReason: ${reason}`
                    ).catch(() => {});
                    await member.ban({ reason, deleteMessageSeconds: 0 });
                    await api.post('/api/scheduled-jobs', {
                        guild_id:   member.guild.id,
                        type:       'unban',
                        target_id:  member.id,
                        execute_at: new Date(Date.now() + ms).toISOString(),
                    }).catch(() => {});
                    await api.post(`/api/logs/${member.guild.id}`, {
                        action: 'TEMPBAN', target_id: member.id, target_tag: member.user.tag,
                        moderator: 'Penny', reason: `Warning ${count} — ${reason} (${step.duration} ${step.duration_unit})`,
                    }).catch(() => {});
                }
                if (step.action === 'ban') {
                    if (settings?.reset_on_ban) await api.delete(`/api/warnings/${member.guild.id}/${member.id}`).catch(() => {});
                    await takeAction(member, 'ban', `Warning ${count} — ${reason}`, config);
                }
                if (step.reset_after) await api.delete(`/api/warnings/${member.guild.id}/${member.id}`).catch(() => {});
            }
        } else {
            const maxWarns = config.max_warnings || 3;
            await member.send(
                `⚠️ **Warning ${count}/${maxWarns}** in ${member.guild.name}\nReason: ${reason}`
            ).catch(() => {});
            if (count >= maxWarns) {
                await api.delete(`/api/warnings/${member.guild.id}/${member.id}`).catch(() => {});
                await takeAction(member, 'kick', `Reached ${maxWarns} warnings`, config);
            }
        }
    } catch (err) {
        console.error(`[WARN] Failed to issue warning: ${err.message}`);
    }
}

module.exports = { inlineWarn, takeAction, handleModuleAction, issueWarning };