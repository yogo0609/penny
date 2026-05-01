require('dotenv').config();
const axios = require('axios');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const api = axios.create({
    baseURL: process.env.API_URL,
    headers: { 'x-api-key': process.env.API_SECRET },
});

const configCache = new Map();

async function getConfig(guildId) {
    try {
        if (configCache.has(guildId)) return configCache.get(guildId);
        const res = await api.get(`/api/config/${guildId}`);
        configCache.set(guildId, res.data);
        return res.data;
    } catch (err) {
        console.error(`[CONFIG] Failed to load config for ${guildId}: ${err.message}`);
        return configCache.get(guildId) || {};
    }
}

async function getConfig(guildId) {
    try {
        const res = await api.get(`/api/config/${guildId}`);
        configCache.set(guildId, res.data);
        return res.data;
    } catch (err) {
        console.error(`[CONFIG] Failed to load config for ${guildId}: ${err.message}`);
        return configCache.get(guildId) || {};
    }
}


// === EXEMPTION CHECKER ===
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


// === CHANNEL EXEMPTION CHECKER ===
// REF-BOT-05
async function isChannelExempt(guildId, channelId) {
    try {
        const res = await api.get(`/api/exemptions/${guildId}`);
        return res.data.channels.includes(channelId);
    } catch {
        return false;
    }
}

// === MODULE EXEMPTION CHECKER ===
// REF-BOT-05a
// Checks module-specific exemptions first, then falls back to global exemptions
async function isModuleExempt(guildId, module, member, channelId) {
    try {
        const res = await api.get(`/api/module-exemptions/${guildId}/${module}`);
        const { roles, users, channels } = res.data;

        // Now full objects, extract target_id
        if (users.some(u => u.target_id === member.id))                                    return true;
        if (channels.some(c => c.target_id === channelId))                                 return true;
        if (member.roles.cache.some(r => roles.some(ro => ro.target_id === r.id)))         return true;

        // Fall back to global exemptions
        const global = await api.get(`/api/exemptions/${guildId}`);
        if (global.data.users.includes(member.id))                                         return true;
        if (global.data.channels.includes(channelId))                                      return true;
        if (member.roles.cache.some(r => global.data.roles.includes(r.id)))                return true;

        return false;
    } catch {
        return false;
    }
}
// === SECURITY LOGGER ===
// REF-BOT-06
async function log(guild, config, type, description, color = 0xff4444, targetId = null, targetTag = null) {
    console.log(`[${type}] ${description}`);

    const channelId = config.log_channel_id;
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(`🛡️ ${type}`)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    if (config.test_mode) {
        embed.setFooter({ text: '⚠️ TEST MODE — no action taken' });
    }

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

// === MODULE ACTION HANDLER ===
// REF-BOT-07a
// Handles the new unified action system (ladder, delete, delete_warn, kick, ban)
async function handleModuleAction(action, message, member, reason, config) {
    const act = action || 'ladder';

    // Always delete message for delete, delete_warn and ladder (default)
    if (act === 'delete' || act === 'delete_warn' || act === 'ladder') {
        await message.delete().catch(() => {});
    }

    if (act === 'delete') {
        // Delete only, no warning
        await inlineWarn(message, `Your message was removed. Reason: ${reason}`);
        return;
    }

    if (act === 'delete_warn' || act === 'ladder') {
        // Delete + issue warning (feeds punishment ladder)
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

// === ACTION HANDLER ===
// REF-BOT-08
async function takeAction(member, action, reason, config) {
    if (config.test_mode) return;
    try {
        if (action === 'kick') {
            // REF-BOT-08a — DM user before kick so they receive the message
            await member.send(
                `🚨 You have been **kicked** from **${member.guild.name}**\nReason: ${reason}`
            ).catch(() => {});
            await member.kick(reason);
            // REF-BOT-08b — Log the kick to mod log
            await api.post(`/api/logs/${member.guild.id}`, {
                action:     'KICK',
                target_id:  member.id,
                target_tag: member.user.tag,
                moderator:  'Penny',
                reason:     reason,
            }).catch(() => {});
            // REF-BOT-08c — Post to security log channel
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

// === QUARANTINE SYSTEM ===
// REF-BOT-31
async function quarantineUser(member, reason, config) {
    try {
        const guild = member.guild;

        // Find or create quarantine role
        let role = guild.roles.cache.find(r => r.name === 'Quarantined');
        if (!role) {
            role = await guild.roles.create({
                name: 'Quarantined',
                color: 0x808080,
                reason: 'Penny quarantine system',
            });
            // Deny view in all channels
            for (const [, channel] of guild.channels.cache) {
                await channel.permissionOverwrites.create(role, {
                    ViewChannel: false,
                    SendMessages: false,
                }).catch(() => {});
            }
            // Create or find quarantine channel
            let qChannel = guild.channels.cache.find(c => c.name === 'quarantine');
            if (!qChannel) {
                qChannel = await guild.channels.create({
                    name: 'quarantine',
                    reason: 'Penny quarantine channel',
                    permissionOverwrites: [
                        { id: guild.roles.everyone, deny: ['ViewChannel'] },
                        { id: role, allow: ['ViewChannel'], deny: ['SendMessages'] },
                    ],
                });
            }
            await qChannel.send('⚠️ You have been quarantined. Please wait for a moderator to review your case.');
        }

        await member.roles.add(role, reason);
        await member.send(`🔒 You have been quarantined in **${guild.name}**.\nReason: ${reason}`).catch(() => {});

        await api.post(`/api/logs/${guild.id}`, {
            action: 'QUARANTINE',
            target_id: member.id,
            target_tag: member.user.tag,
            moderator: 'Penny',
            reason,
        }).catch(() => {});

    } catch (err) {
        console.error(`[QUARANTINE] ${err.message}`);
    }
}

async function unquarantineUser(member, reason) {
    try {
        const role = member.guild.roles.cache.find(r => r.name === 'Quarantined');
        if (!role) return;
        await member.roles.remove(role, reason);
        await member.send(`✅ You have been unquarantined in **${member.guild.name}**.`).catch(() => {});
    } catch (err) {
        console.error(`[UNQUARANTINE] ${err.message}`);
    }
}

// === WARNING SYSTEM ===
// REF-BOT-09
async function issueWarning(member, reason, config) {
    try {
        // Save the warning
        await api.post(`/api/warnings/${member.guild.id}`, {
            user_id:   member.id,
            user_tag:  member.user.tag,
            reason:    reason,
            issued_by: 'Penny',
        });

        // Get current warning count
        const res   = await api.get(`/api/warnings/${member.guild.id}/${member.id}`);
        const count = res.data.length;

        // REF-BOT-09a — Check if a punishment ladder exists for this guild
        const ladderRes  = await api.get(`/api/ladder/${member.guild.id}`);
        const ladder     = ladderRes.data;
        const settingsRes = await api.get(`/api/punishment-settings/${member.guild.id}`);
        const settings   = settingsRes.data;

        if (ladder && ladder.length > 0) {
            // === USE LADDER ===
            const step = ladder.find(s => s.step === count);

            // Send DM — use custom message if set, otherwise default
            const dmMsg = step?.custom_dm ||
                `⚠️ **Warning ${count}/${ladder[ladder.length - 1].step}** in ${member.guild.name}\nReason: ${reason}`;
            await member.send(dmMsg).catch(() => {});

            if (step) {
                const action = step.action;

                if (action === 'mute' && step.duration) {
                    // Convert duration to ms
                    const units = { minutes: 60000, hours: 3600000, days: 86400000 };
                    const ms    = step.duration * (units[step.duration_unit] || 60000);
                    await member.timeout(ms, reason).catch(() => {});
                    await api.post(`/api/logs/${member.guild.id}`, {
                        action: 'MUTE', target_id: member.id, target_tag: member.user.tag,
                        moderator: 'Penny', reason: `Warning ${count} — ${reason}`,
                    }).catch(() => {});
                }

                if (action === 'kick') {
                    if (settings?.reset_on_kick) {
                        await api.delete(`/api/warnings/${member.guild.id}/${member.id}`).catch(() => {});
                    }
                    await takeAction(member, 'kick', `Warning ${count} — ${reason}`, config);
                }

                if (action === 'tempban' && step.duration) {
                    const units = { minutes: 60000, hours: 3600000, days: 86400000 };
                    const ms    = step.duration * (units[step.duration_unit] || 3600000);
                    if (settings?.reset_on_ban) {
                        await api.delete(`/api/warnings/${member.guild.id}/${member.id}`).catch(() => {});
                    }
                    await member.send(
                        `🚨 You have been **temporarily banned** from **${member.guild.name}**\nDuration: ${step.duration} ${step.duration_unit}\nReason: ${reason}`
                    ).catch(() => {});
                    await member.ban({ reason, deleteMessageSeconds: 0 });
                    // Schedule unban via persistent job
                    const executeAt = new Date(Date.now() + ms).toISOString();
                    await api.post('/api/scheduled-jobs', {
                        guild_id: member.guild.id,
                        type: 'unban',
                        target_id: member.id,
                        execute_at: executeAt,
                    }).catch(() => {});
                    await api.post(`/api/logs/${member.guild.id}`, {
                        action: 'TEMPBAN', target_id: member.id, target_tag: member.user.tag,
                        moderator: 'Penny', reason: `Warning ${count} — ${reason} (${step.duration} ${step.duration_unit})`,
                    }).catch(() => {});
                }

                if (action === 'ban') {
                    if (settings?.reset_on_ban) {
                        await api.delete(`/api/warnings/${member.guild.id}/${member.id}`).catch(() => {});
                    }
                    await takeAction(member, 'ban', `Warning ${count} — ${reason}`, config);
                }

                if (step.reset_after) {
                    await api.delete(`/api/warnings/${member.guild.id}/${member.id}`).catch(() => {});
                }
            }

        } else {
            // === FALLBACK — no ladder, use max_warnings ===
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


// === INLINE WARNING HELPER ===
// REF-BOT-09a
async function inlineWarn(message, reason) {
    const warning = await message.channel.send(
        `⚠️ <@${message.author.id}> — ${reason} Repeated violations may result in escalated action.`
    ).catch(() => {});
    if (warning) setTimeout(() => warning.delete().catch(() => {}), 8000);
}


// === QUARANTINE COMMAND HANDLER ===
// REF-BOT-32
async function handleQuarantine(interaction) {
    const config = await getConfig(interaction.guild.id);
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    await quarantineUser(member, reason, config);
    await interaction.reply({ content: `🔒 ${target.tag} has been quarantined.`, ephemeral: true });
}

// REF-BOT-33
async function handleUnquarantine(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    await unquarantineUser(member, reason);
    await interaction.reply({ content: `✅ ${target.tag} has been unquarantined.`, ephemeral: true });
}

// === PANIC COMMAND HANDLER ===
// REF-BOT-29b
async function handlePanicCommand(interaction) {
    const config = await getConfig(interaction.guild.id);

    // Check if user has an authorized role
    const authorizedRoles = config.panic_authorized_roles || [];
    const hasPermission   = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        interaction.member.roles.cache.some(r => authorizedRoles.includes(r.id));

    if (!hasPermission) {
        return interaction.reply({ content: '❌ You are not authorized to use Panic Mode.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const panicRes = await api.get(`/api/panic/${interaction.guild.id}`);
        const active   = panicRes.data.active;

        if (active) {
            await deactivatePanic(interaction.guild, interaction.user.tag);
            await interaction.editReply({ content: '✅ Panic Mode deactivated — channels restored.' });
        } else {
            await activatePanic(interaction.guild, interaction.user.tag);
            await interaction.editReply({ content: '🚨 Panic Mode activated — all channels locked.' });
        }
    } catch(err) {
        await interaction.editReply({ content: '❌ Failed to toggle Panic Mode.' });
    }
}

// === AUDIT LOG HELPER ===
// REF-BOT-24
async function audit(guild, event, category, targetId, targetTag, moderator, detail, color = 0x3b82f6) {
    try {
        const config    = await getConfig(guild.id);
        const channelId = config.audit_channel_id;
        if (channelId) {
            const channel = guild.channels.cache.get(channelId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setTitle(`📋 ${event}`)
                    .setColor(color)
                    .setTimestamp();

                if (targetTag) embed.addFields({ name: 'Target', value: targetTag,                               inline: true  });
                if (moderator) embed.addFields({ name: 'By',     value: moderator,                               inline: true  });
                if (detail)    embed.addFields({ name: 'Detail', value: detail.replace(/\*\*/g, '').replace(/`/g, ''), inline: false });

                await channel.send({ embeds: [embed] }).catch(() => {});
            }
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

// === PANIC MODE ===
// REF-BOT-29

async function activatePanic(guild, triggeredBy) {
    try {
        // Snapshot current channel permissions before locking
        const snapshot = [];
        const channels = guild.channels.cache.filter(c =>
            c.type === 0 || c.type === 2 || c.type === 4
        );

        for (const [, channel] of channels) {
            const overwrite = channel.permissionOverwrites.cache.get(guild.id);
            snapshot.push({
                channelId:   channel.id,
                allow:       overwrite?.allow.bitfield.toString() || '0',
                deny:        overwrite?.deny.bitfield.toString()  || '0',
            });
        }

        // Save panic state with snapshot
        await api.post(`/api/panic/${guild.id}/activate`, {
            triggered_by:     triggeredBy,
            channel_snapshot: snapshot,
        });

        // Lock all channels
        for (const [, channel] of channels) {
            await channel.permissionOverwrites.edit(guild.id, {
                SendMessages: false,
            }).catch(() => {});
        }

        // Alert in log channel
        const config  = await getConfig(guild.id);
        const alertChannelId = config.panic_alert_channel || config.log_channel_id;
        const alertRoleId    = config.panic_alert_role;
        const alertChannel   = guild.channels.cache.get(alertChannelId);

        if (alertChannel) {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('🚨 PANIC MODE ACTIVATED')
                .setColor(0xff0000)
                .setDescription('All channels have been locked. New members will be kicked automatically.')
                .addFields({ name: 'Triggered by', value: triggeredBy })
                .setTimestamp();
            const content = alertRoleId ? `<@&${alertRoleId}>` : '';
            await alertChannel.send({ content, embeds: [embed] }).catch(() => {});
        }

        // Log to mod log
        await api.post(`/api/logs/${guild.id}`, {
            action:     'PANIC MODE ACTIVATED',
            target_id:  null,
            target_tag: null,
            moderator:  triggeredBy,
            reason:     'Panic mode activated — all channels locked',
        }).catch(() => {});

        console.log(`[PANIC] Activated in ${guild.name} by ${triggeredBy}`);
    } catch(err) {
        console.error(`[PANIC] Failed to activate: ${err.message}`);
    }
}

async function deactivatePanic(guild, deactivatedBy) {
    try {
        // Get snapshot
        const panicRes  = await api.get(`/api/panic/${guild.id}`);
        const snapshot  = JSON.parse(panicRes.data.channel_snapshot || '[]');

        // Restore channel permissions
        for (const snap of snapshot) {
            const channel = guild.channels.cache.get(snap.channelId);
            if (!channel) continue;
            await channel.permissionOverwrites.edit(guild.id, {
                SendMessages: null,
            }).catch(() => {});
        }

        // Mark panic inactive
        await api.post(`/api/panic/${guild.id}/deactivate`, {
            deactivated_by: deactivatedBy,
        });

        // Alert in log channel
        const config       = await getConfig(guild.id);
        const alertChannel = guild.channels.cache.get(config.panic_alert_channel || config.log_channel_id);

        if (alertChannel) {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('✅ PANIC MODE DEACTIVATED')
                .setColor(0x22c55e)
                .setDescription('All channels have been unlocked.')
                .addFields({ name: 'Deactivated by', value: deactivatedBy })
                .setTimestamp();
            await alertChannel.send({ embeds: [embed] }).catch(() => {});
        }

        // Log to mod log
        await api.post(`/api/logs/${guild.id}`, {
            action:     'PANIC MODE DEACTIVATED',
            target_id:  null,
            target_tag: null,
            moderator:  deactivatedBy,
            reason:     'Panic mode deactivated — channels restored',
        }).catch(() => {});

        console.log(`[PANIC] Deactivated in ${guild.name} by ${deactivatedBy}`);
    } catch(err) {
        console.error(`[PANIC] Failed to deactivate: ${err.message}`);
    }
}



module.exports = {
    api,
    getConfig,
    isExempt,
    isChannelExempt,
    isModuleExempt,
    log,
    inlineWarn,
    issueWarning,
    takeAction,
    quarantineUser,
    unquarantineUser,
    handleQuarantine,
    handleUnquarantine,
    handlePanicCommand,
    activatePanic,
    deactivatePanic,
    audit,
    handleModuleAction,
};
