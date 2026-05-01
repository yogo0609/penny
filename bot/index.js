// === DEPENDENCIES ===
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { handleBan, handleUnban, handleKick, handleMute, handleUnmute, handleWarn, handleSoftban, handlePurge, handleWarnings, handleClearWarnings, handleLockdown, handleServerLockdown, handleUserinfo, handleBans, handleTempban, handleTempmute } = require('./commands/moderation');
const { handleGuildMemberAdd } = require('./guildMemberHandler');
const { handleMessageDelete, handleMessageUpdate, handleMessageDeleteBulk, handleGuildMemberLeft, handleGuildMemberUpdate } = require('./auditHandlers');
const { handleMessageCreate } = require('./messageHandler');
const { handleGuildBanAdd, handleGuildMemberRemoveNuke, handleRoleUpdateAudit, handleChannelCreateAudit, handleChannelDeleteAudit, handleChannelUpdateAudit, handleRoleCreateAudit, handleRoleDeleteAudit, handleRoleCreateSync, handleRoleDeleteSync, handleRoleUpdateSync, handleChannelCreateSync, handleChannelDeleteSync, handleChannelUpdateSync, handleEmojiCreate, handleEmojiDelete, handleWebhookUpdate, handleVoiceStateUpdate } = require('./serverEventHandlers');
const { api, getConfig, handlePanicCommand, handleQuarantine, handleUnquarantine } = require('./helpers');



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
const purgeInitiator = new Map();


// === READY ===
client.once('ready', async () => {
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

        // === SYNC CHANNELS & ROLES ===
        for (const [, guild] of client.guilds.cache) {
            const channels = guild.channels.cache.map(c => ({
                id: c.id, name: c.name, type: c.type, position: c.position || 0
            }));
            const roles = guild.roles.cache.map(r => ({
                id: r.id, name: r.name, color: r.color, position: r.position || 0
            }));
            await api.post(`/api/guild-channels/${guild.id}`, { channels }).catch(() => {});
            await api.post(`/api/guild-roles/${guild.id}`, { roles }).catch(() => {});
            console.log(`🔄 Synced channels & roles for ${guild.name}`);
        }
    } catch(err) {
        console.error(`[GUILDS] Failed to register guilds: ${err.message}`);
    }
});


// ============================================================
// MESSAGE HANDLER
// ============================================================

client.on('messageCreate', handleMessageCreate);

// ============================================================
// ============================================================
// MEMBER JOIN HANDLER
// ============================================================
client.on('guildMemberAdd', handleGuildMemberAdd);
client.on('guildMemberRemove', handleGuildMemberRemoveNuke);

// === VERIFICATION BUTTON HANDLER ===
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('verify_')) return;

    const memberId = interaction.customId.replace('verify_', '');
    if (interaction.user.id !== memberId) {
        return interaction.reply({ content: '❌ This button is not for you.', ephemeral: true });
    }

    const config = await getConfig(interaction.guild.id);
    const member = await interaction.guild.members.fetch(memberId).catch(() => null);
    if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });

    const role = interaction.guild.roles.cache.get(config.verification_role_id);
    if (!role) return interaction.reply({ content: '❌ Verified role not configured.', ephemeral: true });

    await member.roles.add(role, 'Verification completed').catch(() => {});
    await interaction.update({ content: `✅ <@${memberId}> has been verified!`, components: [] }).catch(() => {});

    await api.post(`/api/logs/${interaction.guild.id}`, {
        action: 'VERIFIED',
        target_id: memberId,
        target_tag: member.user.tag,
        moderator: 'Penny',
        reason: 'Member verified via button',
    }).catch(() => {});
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
            case 'quarantine':     await handleQuarantine(interaction);                 break;
            case 'unquarantine':   await handleUnquarantine(interaction);               break;
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
client.on('messageDelete', handleMessageDelete);

// === MESSAGE EDITED ===
client.on('messageUpdate', handleMessageUpdate);

// === BULK MESSAGE DELETE ===
client.on('messageDeleteBulk', (messages) => handleMessageDeleteBulk(messages, purgeInitiator));

// === MEMBER LEFT ===
client.on('guildMemberRemove', handleGuildMemberLeft);
client.on('guildBanAdd', handleGuildBanAdd);

// === MEMBER UPDATED (nickname, roles) ===
client.on('guildMemberUpdate', handleGuildMemberUpdate);

// === CHANNEL EVENTS ===
client.on('channelCreate', handleChannelCreateAudit);
client.on('channelDelete', handleChannelDeleteAudit);
client.on('channelUpdate', handleChannelUpdateAudit);

client.on('channelCreate', handleChannelCreateSync);
client.on('channelDelete', handleChannelDeleteSync);
client.on('channelUpdate', handleChannelUpdateSync);

// === ROLE EVENTS ===
client.on('roleCreate', handleRoleCreateAudit);
client.on('roleDelete', handleRoleDeleteAudit);
client.on('roleUpdate', handleRoleUpdateAudit);

client.on('roleCreate', handleRoleCreateSync);
client.on('roleDelete', handleRoleDeleteSync);
client.on('roleUpdate', handleRoleUpdateSync);

// === EMOJI EVENTS ===
client.on('emojiCreate', handleEmojiCreate);
client.on('emojiDelete', handleEmojiDelete);

// === WEBHOOK EVENTS ===
client.on('webhookUpdate', handleWebhookUpdate);

// === VOICE EVENTS ===
client.on('voiceStateUpdate', handleVoiceStateUpdate);

// === SCHEDULED JOB PROCESSOR ===
// REF-BOT-30
async function processScheduledJobs() {
    try {
        const res  = await api.get('/api/scheduled-jobs/due');
        const jobs = res.data;
        for (const job of jobs) {
            try {
                if (job.type === 'unban') {
                    const guild  = client.guilds.cache.get(job.guild_id);
                    if (guild) {
                        await guild.members.unban(job.target_id, 'Tempban expired').catch(() => {});
                        await api.post(`/api/logs/${job.guild_id}`, {
                            action: 'UNBAN',
                            target_id: job.target_id,
                            target_tag: job.target_id,
                            moderator: 'Penny',
                            reason: 'Tempban expired'
                        }).catch(() => {});
                    }
                }
                if (job.type === 'unmute') {
                    const guild  = client.guilds.cache.get(job.guild_id);
                    if (guild) {
                        const member = await guild.members.fetch(job.target_id).catch(() => null);
                        if (member) await member.timeout(null, 'Tempmute expired').catch(() => {});
                    }
                }
                if (job.type === 'verify_timeout') {
                    const guild  = client.guilds.cache.get(job.guild_id);
                    if (guild) {
                        const member = await guild.members.fetch(job.target_id).catch(() => null);
                        const config = await getConfig(job.guild_id);
                        if (member) {
                            const role = guild.roles.cache.get(config.verification_role_id);
                            const isVerified = role && member.roles.cache.has(role.id);
                            if (!isVerified) {
                                await member.send(`⏰ You did not verify in time and have been removed from **${guild.name}**.`).catch(() => {});
                                await member.kick('Verification timeout').catch(() => {});
                            }
                        }
                        // Delete the verify message
                        const payload = job.payload ? JSON.parse(job.payload) : null;
                        if (payload?.channel_id && payload?.message_id) {
                            const channel = guild.channels.cache.get(payload.channel_id);
                            const msg = await channel?.messages.fetch(payload.message_id).catch(() => null);
                            if (msg) await msg.delete().catch(() => {});
                        }
                    }
                }
                await api.patch(`/api/scheduled-jobs/${job.id}/done`).catch(() => {});
            } catch(err) {
                console.error(`[JOBS] Failed job ${job.id}: ${err.message}`);
            }
        }
    } catch(err) {
        console.error(`[JOBS] Poll error: ${err.message}`);
    }
}

setInterval(processScheduledJobs, 30000);

// === LOGIN ===
client.login(process.env.DISCORD_TOKEN);
