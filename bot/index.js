k// === DEPENDENCIES ===
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField, AuditLogEvent } = require('discord.js');
const axios = require('axios');
const { handleBan, handleUnban, handleKick, handleMute, handleUnmute, handleWarn, handleSoftban, handlePurge, handleWarnings, handleClearWarnings, handleLockdown, handleServerLockdown, handleUserinfo, handleBans, handleTempban, handleTempmute } = require('./commands/moderation');


// === API CLIENT ===
// REF-BOT-01
const api = axios.create({
    baseURL: process.env.API_URL,
    headers: { 'x-api-key': process.env.API_SECRET },
});


// === DISCORD CLIENT ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
    ],
    partials: [Partials.Message, Partials.Channel],
});


// === IN-MEMORY STATE ===
// REF-BOT-02
const spamTracker    = new Map();
const raidTracker    = new Map();
const configCache    = new Map();
const purgeInitiator = new Map();


// === CONFIG LOADER ===
// REF-BOT-03
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
                    // Schedule unban
                    setTimeout(async () => {
                        await member.guild.members.unban(member.id, 'Tempban expired').catch(() => {});
                    }, ms);
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

// === READY ===
client.once('clientReady', async () => {
    console.log(`✅ ${client.user.tag} is online`);
    console.log(`🔗 Connected to API at ${process.env.API_URL}`);

    try {
        const guilds = client.guilds.cache.map(g => ({
            id:   g.id,
            name: g.name,
            icon: g.iconURL(),
        }));
        await api.post('/api/guilds', { guilds });
        console.log(`📋 Registered ${guilds.length} guild(s) with API`);
    } catch(err) {
        console.error(`[GUILDS] Failed to register guilds: ${err.message}`);
    }
});


// ============================================================
// MESSAGE HANDLER
// ============================================================

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild)     return;

    const config = await getConfig(message.guild.id);
    const member = message.member
        || await message.guild.members.fetch(message.author.id).catch(() => null);

    // Global admin check still applies to everything
    if (member?.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    // === SPAM DETECTION ===
    // REF-BOT-10
    if (config.spam_enabled && !await isModuleExempt(message.guild.id, 'spam', member, message.channel.id)) {
        const now    = Date.now();
        const userId = message.author.id;
        const max    = config.spam_max_messages || 5;
        const window = config.spam_window_ms    || 5000;

        if (!spamTracker.has(userId)) spamTracker.set(userId, []);
        const timestamps = spamTracker.get(userId);
        timestamps.push(now);

        const recent = timestamps.filter(ts => now - ts < window);
        spamTracker.set(userId, recent);

        if (recent.length > max) {
            await log(message.guild, config, 'SPAM DETECTED',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}\n**Messages:** ${recent.length} in ${window / 1000}s`,
                0xff4444, message.author.id, message.author.tag
            );

            if (!config.test_mode) {
                await handleModuleAction(config.spam_action, message, member, 'Spam detected', config);
            }

            spamTracker.set(userId, []);
            return;
        }
    }


    // === BAD WORD FILTER ===
    // REF-BOT-11
    if (config.badwords_enabled && !await isModuleExempt(message.guild.id, 'badwords', member, message.channel.id)) {
        const content  = message.content.toLowerCase();
        const wordList = config.badwords_list || [];
        const found    = wordList.find(w => content.includes(w.toLowerCase()));

        if (found) {
            await log(message.guild, config, 'BAD WORD',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}\n**Trigger:** \`${found}\``,
                0xff4444, message.author.id, message.author.tag
            );

            if (!config.test_mode) {
                await handleModuleAction(config.badwords_action, message, member, `Prohibited word: ${found}`, config);
            }

            return;
        }
    }


    // === CAPS FILTER ===
    // REF-BOT-12
    if (config.caps_enabled && !await isModuleExempt(message.guild.id, 'caps', member, message.channel.id) && message.content.length >= (config.caps_min_length || 10)) {
        const letters = message.content.replace(/[^a-zA-Z]/g, '');
        if (letters.length > 0) {
            const ratio = (message.content.match(/[A-Z]/g) || []).length / letters.length;
            if (ratio >= (config.caps_threshold || 0.7)) {
                await log(message.guild, config, 'CAPS FILTER',
                    `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                    0xff4444, message.author.id, message.author.tag
                );

                if (!config.test_mode) {
                    await handleModuleAction(config.caps_action, message, member, 'Caps filter triggered', config);
                }

                return;
            }
        }
    }


    // === MASS MENTION ===
    // REF-BOT-13
    if (config.mass_mention_enabled && !await isModuleExempt(message.guild.id, 'mass_mention', member, message.channel.id)) {
        const mentionCount = message.mentions.users.size + message.mentions.roles.size;
        if (mentionCount >= (config.mass_mention_max || 5)) {
            await log(message.guild, config, 'MASS MENTION',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}\n**Mentions:** ${mentionCount}`,
                0xff4444, message.author.id, message.author.tag
            );

            if (!config.test_mode) {
                await handleModuleAction(config.mass_mention_action, message, member, `Mass mention (${mentionCount})`, config);
            }

            return;
        }
    }


    // === ANTI INVITE LINK ===
    // REF-BOT-14
    if (config.antilink_enabled && !await isModuleExempt(message.guild.id, 'antilink', member, message.channel.id)) {
        const inviteRegex = /(discord\.gg|discord\.com\/invite)\/\S+/i;
        if (inviteRegex.test(message.content)) {
            await log(message.guild, config, 'INVITE LINK',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                0xff4444, message.author.id, message.author.tag
            );

            if (!config.test_mode) {
                await handleModuleAction(config.antilink_action, message, member, 'Posted invite link', config);
            }

            return;
        }
    }


    // === ANTI-LINK (all URLs) ===
    // REF-BOT-14b
    if (config.antilink_all_enabled && !await isModuleExempt(message.guild.id, 'antilink_all', member, message.channel.id)) {
        const urlRegex = /https?:\/\/[^\s]+/gi;
        if (urlRegex.test(message.content)) {
            await log(message.guild, config, 'LINK DETECTED',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                0xff4444, message.author.id, message.author.tag
            );
            if (!config.test_mode) {
                await handleModuleAction(config.antilink_all_action, message, member, 'Posted a link', config);
            }
            return;
        }
    }


    // === REPEATED TEXT (copypasta) ===
    // REF-BOT-14c
    if (config.repeat_enabled && !await isModuleExempt(message.guild.id, 'repeat', member, message.channel.id)) {
        const content = message.content.trim();
        if (content.length >= (config.repeat_min_length || 20)) {
            const words      = content.split(/\s+/);
            const unique     = new Set(words.map(w => w.toLowerCase()));
            const repeatRatio = 1 - (unique.size / words.length);
            if (repeatRatio >= (config.repeat_threshold || 0.7)) {
                await log(message.guild, config, 'REPEATED TEXT',
                    `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                    0xff4444, message.author.id, message.author.tag
                );
                if (!config.test_mode) {
                    await handleModuleAction(config.repeat_action, message, member, 'Repeated text detected', config);
                }
                return;
            }
        }
    }


    // === EMOJI SPAM ===
    // REF-BOT-14d
    if (config.emojispam_enabled && !await isModuleExempt(message.guild.id, 'emojispam', member, message.channel.id)) {
        const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
        const emojiCount = (message.content.match(emojiRegex) || []).length;
        if (emojiCount >= (config.emojispam_max || 5)) {
            await log(message.guild, config, 'EMOJI SPAM',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}\n**Emojis:** ${emojiCount}`,
                0xff4444, message.author.id, message.author.tag
            );
            if (!config.test_mode) {
                await handleModuleAction(config.emojispam_action, message, member, `Emoji spam (${emojiCount} emojis)`, config);
            }
            return;
        }
    }


    // === NEWLINE SPAM ===
    // REF-BOT-14e
    if (config.newline_enabled && !await isModuleExempt(message.guild.id, 'newline', member, message.channel.id)) {
        const newlineCount = (message.content.match(/\n/g) || []).length;
        if (newlineCount >= (config.newline_max || 10)) {
            await log(message.guild, config, 'NEWLINE SPAM',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}\n**Lines:** ${newlineCount}`,
                0xff4444, message.author.id, message.author.tag
            );
            if (!config.test_mode) {
                await handleModuleAction(config.newline_action, message, member, `Newline spam (${newlineCount} lines)`, config);
            }
            return;
        }
    }


    // === ZALGO TEXT ===
    // REF-BOT-14f
    if (config.zalgo_enabled && !await isModuleExempt(message.guild.id, 'zalgo', member, message.channel.id)) {
        const zalgoRegex = /[\u0300-\u036f\u0489\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]{3,}/g;
        if (zalgoRegex.test(message.content)) {
            await log(message.guild, config, 'ZALGO TEXT',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                0xff4444, message.author.id, message.author.tag
            );
            if (!config.test_mode) {
                await handleModuleAction(config.zalgo_action, message, member, 'Zalgo text detected', config);
            }
            return;
        }
    }

});
// ============================================================
// MEMBER JOIN HANDLER
// ============================================================

client.on('guildMemberAdd', async (member) => {
    const config = await getConfig(member.guild.id);

    // === ANTI-HOIST ===
    // REF-BOT-14g
    if (config.antihoist_enabled) {
        const hoistRegex = /^[^a-zA-Z0-9]/;
        const name       = member.displayName;
        if (hoistRegex.test(name)) {
            const cleanName = name.replace(/^[^a-zA-Z0-9]+/, '') || 'Member';
            await member.setNickname(cleanName, 'Anti-hoist').catch(() => {});
            await log(member.guild, config, 'ANTI-HOIST',
                `**User:** ${member.user.tag}\n**Original:** ${name}\n**Changed to:** ${cleanName}`,
                0xffa500, member.id, member.user.tag
            );
        }
    }

    // === PANIC MODE JOIN KICK ===
    // REF-BOT-29a
    try {
        const panicRes = await api.get(`/api/panic/${member.guild.id}`);
        if (panicRes.data.active) {
            await member.send(
                `⚠️ **${member.guild.name}** is currently in Panic Mode. You cannot join at this time.`
            ).catch(() => {});
            await member.kick('Panic mode active');
            return;
        }
    } catch {}

    // === BOT JOIN DETECTION ===
    // 	REF-BOT-23
    if (member.user.bot) {
        await audit(member.guild, 'BOT ADDED', 'server',
            member.id, member.user.tag, null,
            `Bot: ${member.user.tag}`,
            0xffa500
        );
        return;
    }

    // === ANTI-RAID ===
    // REF-BOT-15
    if (config.raid_enabled) {
        const now     = Date.now();
        const guildId = member.guild.id;
        const window  = config.raid_window_ms || 10000;
        const max     = config.raid_max_joins  || 5;

        if (!raidTracker.has(guildId)) raidTracker.set(guildId, []);
        const joins  = raidTracker.get(guildId);
        joins.push(now);

        const recent = joins.filter(ts => now - ts < window);
        raidTracker.set(guildId, recent);

        if (recent.length >= max) {
            await log(member.guild, config, '🚨 RAID DETECTED',
                `**${recent.length} joins** in ${window / 1000}s\n**Latest:** ${member.user.tag}`,
                0xff0000, member.id, member.user.tag
            );
            if (!config.test_mode) {
                await takeAction(member, config.raid_action || 'kick', 'Raid detected', config);
            }
        }
    }

    // === ACCOUNT AGE GATE ===
    // REF-BOT-16
    if (config.accountage_enabled) {
        const minDays    = config.accountage_min_days || 7;
        const accountAge = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);

        if (accountAge < minDays) {
            await log(member.guild, config, 'ACCOUNT AGE GATE',
                `**User:** ${member.user.tag}\n**Account Age:** ${Math.floor(accountAge)} days\n**Minimum:** ${minDays} days`,
                0xffa500, member.id, member.user.tag
            );
            if (!config.test_mode) {
                await member.kick(`Account too new (${Math.floor(accountAge)} days old)`);
            }
        }
    }

    // === MEMBER JOIN AUDIT ===
    // REF-BOT-16a
    if (config.audit_members) {
        await audit(member.guild, 'MEMBER JOINED', 'members',
            member.id, member.user.tag, null,
            `User: ${member.user.tag} | Account age: ${Math.floor((Date.now() - member.user.createdTimestamp) / 86400000)} days`,
            0x34d399
        );
    }

    // === WELCOME MESSAGE ===
        // REF-BOT-17
        if (config.welcome_enabled && config.welcome_channel_id) {
            try {
                const channel = member.guild.channels.cache.get(config.welcome_channel_id)
                    || await member.guild.channels.fetch(config.welcome_channel_id).catch(() => null);
                if (channel) {
                    const msg = (config.welcome_message || 'Welcome to the server, {user}!')
                        .replace('{user}',   `<@${member.id}>`)
                        .replace('{server}', member.guild.name);
                    await channel.send(msg);
                } else {
                    console.error(`[WELCOME] Channel ${config.welcome_channel_id} not found`);
                }
            } catch(err) {
                console.error(`[WELCOME] Failed to send welcome message: ${err.message}`);
            }
        }

    // === AUTO ROLE ===
    // REF-BOT-18
    if (config.autorole_enabled && config.autorole_id) {
        const role = member.guild.roles.cache.get(config.autorole_id);
        if (role) await member.roles.add(role).catch(() => {});
    }

});


// ============================================================
// SLASH COMMAND HANDLER
// ============================================================

// REF-BOT-19
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
        switch (interaction.commandName) {
            case 'ban':            await handleBan(interaction, api);                   break;
            case 'unban':          await handleUnban(interaction, api);                 break;
            case 'kick':           await handleKick(interaction, api);                  break;
            case 'mute':           await handleMute(interaction, api);                  break;
            case 'unmute':         await handleUnmute(interaction, api);                break;
            case 'warn':           await handleWarn(interaction, api);                  break;
            case 'softban':        await handleSoftban(interaction, api);               break;
            case 'purge':          await handlePurge(interaction, api, purgeInitiator); break;
            case 'warnings':       await handleWarnings(interaction, api);              break;
            case 'clearwarnings':  await handleClearWarnings(interaction, api);         break;
            case 'lockdown':       await handleLockdown(interaction);                   break;
            case 'serverlockdown': await handleServerLockdown(interaction);             break;
            case 'userinfo':       await handleUserinfo(interaction);                   break;
            case 'bans':           await handleBans(interaction, api);                  break;
            case 'tempban':        await handleTempban(interaction, api);               break;
            case 'tempmute':       await handleTempmute(interaction, api);              break;
            case 'panic':          await handlePanicCommand(interaction);               break;
        }
    } catch (err) {
        console.error(`[SLASH] Error handling /${interaction.commandName}:`, err.message);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ An error occurred.', flags: 64 });
        }
    }
});


// ============================================================
// AUDIT LOG EVENTS
// ============================================================

// === MESSAGE DELETED ===
// REF-BOT-25
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    const config = await getConfig(message.guild.id);
    if (!config.audit_messages) return;

    let moderator = null;
    try {
        const auditLogs = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 1 });
        const entry     = auditLogs.entries.first();
        if (entry && Date.now() - entry.createdTimestamp < 5000) {
            moderator = entry.executor?.tag;
        }
    } catch {}

    await audit(message.guild, 'MESSAGE DELETED', 'messages',
        message.author?.id, message.author?.tag, moderator,
        `Channel: ${message.channel.name} | Content: ${message.content || 'Unknown'}`,
        0xff4444
    );
});

// === MESSAGE EDITED ===
// REF-BOT-25b
client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    const config = await getConfig(newMsg.guild.id);
    if (!config.audit_messages_edit) return;

    await audit(newMsg.guild, 'MESSAGE EDITED', 'messages',
        newMsg.author?.id, newMsg.author?.tag, null,
        `Channel: ${newMsg.channel.name} | Before: ${oldMsg.content || 'Unknown'} | After: ${newMsg.content}`,
        0xffa500
    );
});

// === BULK MESSAGE DELETE ===
// REF-BOT-25c
client.on('messageDeleteBulk', async (messages) => {
    const first = messages.first();
    if (!first?.guild) return;
    const config = await getConfig(first.guild.id);
    if (!config.audit_messages_bulk) return;

    const key       = `${first.guild.id}:${first.channel.id}`;
    const moderator = purgeInitiator.get(key) || null;
    if (moderator) purgeInitiator.delete(key);

    await audit(first.guild, 'BULK DELETE', 'messages',
        null, null, moderator,
        `Channel: ${first.channel.name} | Count: ${messages.size} messages deleted`,
        0xff4444
    );
});

// === MEMBER LEFT ===
// REF-BOT-26
client.on('guildMemberRemove', async (member) => {
    const config = await getConfig(member.guild.id);
    if (!config.audit_members_leave) return;

    const roles = member.roles.cache
        .filter(r => r.id !== member.guild.id)
        .map(r => r.name)
        .join(', ') || 'None';

    await audit(member.guild, 'MEMBER LEFT', 'members',
        member.id, member.user.tag, null,
        `User: ${member.user.tag} | Roles: ${roles}`,
        0xff4444
    );
});

// === MEMBER UPDATED (nickname, roles) ===
// REF-BOT-26b
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const config = await getConfig(newMember.guild.id);

    if (config.audit_members_nick && oldMember.nickname !== newMember.nickname) {
        await audit(newMember.guild, 'NICKNAME CHANGED', 'members',
            newMember.id, newMember.user.tag, null,
            `User: ${newMember.user.tag} | Before: ${oldMember.nickname || 'None'} | After: ${newMember.nickname || 'None'}`,
            0xffa500
        );
    }

    if (config.audit_members_roles) {
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        for (const [, role] of addedRoles) {
            await audit(newMember.guild, 'ROLE ADDED', 'members',
                newMember.id, newMember.user.tag, null,
                `User: ${newMember.user.tag} | Role: ${role.name}`,
                0x34d399
            );
        }

        const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
        for (const [, role] of removedRoles) {
            await audit(newMember.guild, 'ROLE REMOVED', 'members',
                newMember.id, newMember.user.tag, null,
                `User: ${newMember.user.tag} | Role: ${role.name}`,
                0xff4444
            );
        }
    }
});

// === CHANNEL EVENTS ===
// REF-BOT-27
client.on('channelCreate', async (channel) => {
    if (!channel.guild) return;
    const config = await getConfig(channel.guild.id);
    if (!config.audit_server_channel) return;
    await audit(channel.guild, 'CHANNEL CREATED', 'server',
        channel.id, channel.name, null,
        `Channel: ${channel.name}`,
        0x34d399
    );
});

client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    const config = await getConfig(channel.guild.id);
    if (!config.audit_server_channel) return;
    await audit(channel.guild, 'CHANNEL DELETED', 'server',
        channel.id, channel.name, null,
        `Channel: ${channel.name}`,
        0xff4444
    );
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
    if (!newChannel.guild) return;
    const config = await getConfig(newChannel.guild.id);
    if (!config.audit_server_channel) return;
    await audit(newChannel.guild, 'CHANNEL UPDATED', 'server',
        newChannel.id, newChannel.name, null,
        `Channel: ${newChannel.name}`,
        0xffa500
    );
});

// === ROLE EVENTS ===
// REF-BOT-27b
client.on('roleCreate', async (role) => {
    const config = await getConfig(role.guild.id);
    if (!config.audit_server_role) return;
    await audit(role.guild, 'ROLE CREATED', 'server',
        role.id, role.name, null,
        `Role: ${role.name}`,
        0x34d399
    );
});

client.on('roleDelete', async (role) => {
    const config = await getConfig(role.guild.id);
    if (!config.audit_server_role) return;
    await audit(role.guild, 'ROLE DELETED', 'server',
        role.id, role.name, null,
        `Role: ${role.name}`,
        0xff4444
    );
});

client.on('roleUpdate', async (oldRole, newRole) => {
    const config = await getConfig(newRole.guild.id);
    if (!config.audit_server_role) return;
    await audit(newRole.guild, 'ROLE UPDATED', 'server',
        newRole.id, newRole.name, null,
        `Role: ${newRole.name}`,
        0xffa500
    );
});

// === EMOJI EVENTS ===
// REF-BOT-27c
client.on('emojiCreate', async (emoji) => {
    const config = await getConfig(emoji.guild.id);
    if (!config.audit_server_emoji) return;
    await audit(emoji.guild, 'EMOJI CREATED', 'server',
        emoji.id, emoji.name, null,
        `Emoji: ${emoji.name}`,
        0x34d399
    );
});

client.on('emojiDelete', async (emoji) => {
    const config = await getConfig(emoji.guild.id);
    if (!config.audit_server_emoji) return;
    await audit(emoji.guild, 'EMOJI DELETED', 'server',
        emoji.id, emoji.name, null,
        `Emoji: ${emoji.name}`,
        0xff4444
    );
});

// === WEBHOOK EVENTS ===
// REF-BOT-27d
client.on('webhookUpdate', async (channel) => {
    if (!channel.guild) return;
    const config = await getConfig(channel.guild.id);
    if (!config.audit_server_webhook) return;
    await audit(channel.guild, 'WEBHOOK UPDATED', 'server',
        channel.id, channel.name, null,
        `Channel: ${channel.name}`,
        0xffa500
    );
});

// === VOICE EVENTS ===
// REF-BOT-28
client.on('voiceStateUpdate', async (oldState, newState) => {
    const guild  = newState.guild;
    const config = await getConfig(guild.id);
    if (!config.audit_voice) return;
    const member = newState.member;

    if (!oldState.channel && newState.channel) {
        await audit(guild, 'VOICE JOIN', 'voice',
            member.id, member.user.tag, null,
            `User: ${member.user.tag} | Channel: ${newState.channel.name}`,
            0x34d399
        );
    } else if (oldState.channel && !newState.channel) {
        await audit(guild, 'VOICE LEAVE', 'voice',
            member.id, member.user.tag, null,
            `User: ${member.user.tag} | Channel: ${oldState.channel.name}`,
            0xff4444
        );
    } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        await audit(guild, 'VOICE MOVE', 'voice',
            member.id, member.user.tag, null,
            `User: ${member.user.tag} | From: ${oldState.channel.name} | To: ${newState.channel.name}`,
            0xffa500
        );
    }
});


// === LOGIN ===
client.login(process.env.DISCORD_TOKEN);
