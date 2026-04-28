// === DEPENDENCIES ===
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField, AuditLogEvent } = require('discord.js');
const axios = require('axios');
const { handleBan, handleUnban, handleKick, handleMute, handleUnmute, handleWarn, handleSoftban, handlePurge, handleWarnings, handleClearWarnings, handleLockdown, handleServerLockdown, handleUserinfo, handleBans } = require('./commands/moderation');


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


// === ACTION HANDLER ===
// REF-BOT-08
async function takeAction(member, action, reason, config) {
    if (config.test_mode) return;
    try {
        if (action === 'kick') await member.kick(reason);
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
        await api.post(`/api/warnings/${member.guild.id}`, {
            user_id:   member.id,
            user_tag:  member.user.tag,
            reason:    reason,
            issued_by: 'Penny',
        });

        const res      = await api.get(`/api/warnings/${member.guild.id}/${member.id}`);
        const count    = res.data.length;
        const maxWarns = config.max_warnings || 3;

        await member.send(
            `⚠️ **Warning ${count}/${maxWarns}** in ${member.guild.name}\nReason: ${reason}`
        ).catch(() => {});

        if (count >= maxWarns) {
            await takeAction(member, 'kick', `Reached ${maxWarns} warnings`, config);
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

    if (await isExempt(message.guild.id, member))                    return;
    if (await isChannelExempt(message.guild.id, message.channel.id)) return;


    // === SPAM DETECTION ===
    // REF-BOT-10
    if (config.spam_enabled) {
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
                if (config.spam_action === 'delete') {
                    const msgs     = await message.channel.messages.fetch({ limit: 20 });
                    const toDelete = msgs.filter(m => m.author.id === message.author.id);
                    await message.channel.bulkDelete(toDelete).catch(() => {});
                    await inlineWarn(message, 'Your messages were removed for spamming.');
                    await issueWarning(member, 'Spam detected', config);
                } else {
                    await takeAction(member, config.spam_action || 'warn', 'Spam detected', config);
                }
            }

            spamTracker.set(userId, []);
            return;
        }
    }


    // === BAD WORD FILTER ===
    // REF-BOT-11
    if (config.badwords_enabled) {
        const content  = message.content.toLowerCase();
        const wordList = config.badwords_list || [];
        const found    = wordList.find(w => content.includes(w.toLowerCase()));

        if (found) {
            await log(message.guild, config, 'BAD WORD',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}\n**Trigger:** \`${found}\``,
                0xff4444, message.author.id, message.author.tag
            );

            if (!config.test_mode) {
                if (config.badwords_action === 'delete') {
                    await message.delete().catch(() => {});
                    await inlineWarn(message, 'Your message was removed for containing prohibited content.');
                    await issueWarning(member, `Prohibited word: ${found}`, config);
                } else {
                    await takeAction(member, config.badwords_action || 'warn', `Prohibited word: ${found}`, config);
                }
            }

            return;
        }
    }


    // === CAPS FILTER ===
    // REF-BOT-12
    if (config.caps_enabled && message.content.length >= (config.caps_min_length || 10)) {
        const letters = message.content.replace(/[^a-zA-Z]/g, '');
        if (letters.length > 0) {
            const ratio = (message.content.match(/[A-Z]/g) || []).length / letters.length;
            if (ratio >= (config.caps_threshold || 0.7)) {
                await log(message.guild, config, 'CAPS FILTER',
                    `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                    0xff4444, message.author.id, message.author.tag
                );

                if (!config.test_mode) {
                    if (config.caps_action === 'delete') {
                        await message.delete().catch(() => {});
                        await inlineWarn(message, 'Please avoid excessive use of capital letters.');
                        await issueWarning(member, 'Caps filter triggered', config);
                    } else {
                        await takeAction(member, config.caps_action || 'warn', 'Caps filter triggered', config);
                    }
                }

                return;
            }
        }
    }


    // === MASS MENTION ===
    // REF-BOT-13
    if (config.mass_mention_enabled) {
        const mentionCount = message.mentions.users.size + message.mentions.roles.size;
        if (mentionCount >= (config.mass_mention_max || 5)) {
            await log(message.guild, config, 'MASS MENTION',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}\n**Mentions:** ${mentionCount}`,
                0xff4444, message.author.id, message.author.tag
            );

            if (!config.test_mode) {
                if (config.mass_mention_action === 'delete') {
                    await message.delete().catch(() => {});
                    await inlineWarn(message, 'Your message was removed for containing too many mentions.');
                    await issueWarning(member, `Mass mention (${mentionCount})`, config);
                } else {
                    await takeAction(member, config.mass_mention_action || 'warn', `Mass mention (${mentionCount})`, config);
                }
            }

            return;
        }
    }


    // === ANTI INVITE LINK ===
    // REF-BOT-14
    if (config.antilink_enabled) {
        const inviteRegex = /(discord\.gg|discord\.com\/invite)\/\S+/i;
        if (inviteRegex.test(message.content)) {
            await log(message.guild, config, 'INVITE LINK',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                0xff4444, message.author.id, message.author.tag
            );

            if (!config.test_mode) {
                if (config.antilink_action === 'delete') {
                    await message.delete().catch(() => {});
                    await inlineWarn(message, 'Posting invite links is not allowed in this server.');
                    await issueWarning(member, 'Posted invite link', config);
                } else {
                    await takeAction(member, config.antilink_action || 'warn', 'Posted invite link', config);
                }
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

    // === BOT JOIN DETECTION ===
    // REF-BOT-23
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
