const { AuditLogEvent, PermissionsBitField } = require('discord.js');
const { api, getConfig, isExempt, log, audit, takeAction } = require('./helpers');
const nukeTracker = new Map();

async function handleChannelCreateAudit(channel) {
    if (!channel.guild) return;

    let executor = null;

    try {
        const logs = await channel.guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelCreate,
            limit: 1
        });

        const entry = logs.entries.first();

        if (entry && Date.now() - entry.createdTimestamp < 5000) {
            executor = entry.executor;
        }
    } catch {}

    const config = await getConfig(channel.guild.id);
    if (!config.audit_server_channel) return;

    if (executor) {
        const now = Date.now();
        const key = `${channel.guild.id}:${executor.id}`;

        if (!nukeTracker.has(key)) nukeTracker.set(key, []);
        const actions = nukeTracker.get(key);

        actions.push({ time: now, type: 'channelCreate' });

        const window = config.anti_nuke_window_ms || 10000;
        const recent = actions.filter(a => now - a.time < window);

        nukeTracker.set(key, recent);

        if (recent.length >= (config.anti_nuke_threshold || 4)) {
            await log(channel.guild, config, 'POTENTIAL NUKE',
                `**User:** ${executor.tag}\n**Action:** Channel Create\n**Count:** ${recent.length} in ${window/1000}s`,
                0xff0000, executor.id, executor.tag
            );

            if (!config.test_mode) {
                const member = await channel.guild.members.fetch(executor.id).catch(() => null);

                if (member && !await isExempt(channel.guild.id, member)) {
                    await takeAction(
                        member,
                        config.anti_nuke_action || 'ban',
                        'Anti-nuke: mass channel creation',
                        config
                    );
                }
            }

            nukeTracker.set(key, []);
        }
    }

    await audit(channel.guild, 'CHANNEL CREATED', 'server',
        channel.id,
        channel.name,
        executor ? executor.tag : null,
        `Channel: ${channel.name}`,
        0x34d399
    );
}

async function handleChannelDeleteAudit(channel) {
    if (!channel.guild) return;

    let executor = null;

    try {
        const logs = await channel.guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelDelete,
            limit: 1
        });

        const entry = logs.entries.first();

        if (entry && Date.now() - entry.createdTimestamp < 5000) {
            executor = entry.executor;
        }
    } catch {}

    const config = await getConfig(channel.guild.id);
    if (!config.audit_server_channel) return;

    if (executor) {
        const now = Date.now();
        const key = `${channel.guild.id}:${executor.id}`;

        if (!nukeTracker.has(key)) nukeTracker.set(key, []);
        const actions = nukeTracker.get(key);

        actions.push({ time: now, type: 'channelDelete' });

        const window = config.anti_nuke_window_ms || 10000;
        const recent = actions.filter(a => now - a.time < window);

        nukeTracker.set(key, recent);

        if (recent.length >= (config.anti_nuke_threshold || 4)) {
            await log(channel.guild, config, 'POTENTIAL NUKE',
                `**User:** ${executor.tag}\n**Action:** Channel Delete\n**Count:** ${recent.length} in ${window/1000}s`,
                0xff0000, executor.id, executor.tag
            );

            if (!config.test_mode) {
                const member = await channel.guild.members.fetch(executor.id).catch(() => null);

                if (member && !await isExempt(channel.guild.id, member)) {
                    await takeAction(
                        member,
                        config.anti_nuke_action || 'ban',
                        'Anti-nuke: mass channel deletion',
                        config
                    );
                }
            }

            nukeTracker.set(key, []);
        }
    }

    await audit(channel.guild, 'CHANNEL DELETED', 'server',
        channel.id,
        channel.name,
        executor ? executor.tag : null,
        `Channel: ${channel.name}`,
        0xff4444
    );
}

async function handleChannelUpdateAudit(oldChannel, newChannel) {
    if (!newChannel.guild) return;
    const config = await getConfig(newChannel.guild.id);
    if (!config.audit_server_channel) return;
    await audit(newChannel.guild, 'CHANNEL UPDATED', 'server',
        newChannel.id, newChannel.name, null,
        `Channel: ${newChannel.name}`,
        0xffa500
    );
}

async function handleRoleCreateAudit(role) {
    const config = await getConfig(role.guild.id);
    if (!config.audit_server_role) return;
    await audit(role.guild, 'ROLE CREATED', 'server',
        role.id, role.name, null,
        `Role: ${role.name}`,
        0x34d399
    );
}

async function handleRoleDeleteAudit(role) {
    if (!role.guild) return;

    let executor = null;

    try {
        const logs = await role.guild.fetchAuditLogs({
            type: AuditLogEvent.RoleDelete,
            limit: 1
        });

        const entry = logs.entries.first();

        if (entry && Date.now() - entry.createdTimestamp < 5000) {
            executor = entry.executor;
        }
    } catch {}

    const config = await getConfig(role.guild.id);
    if (!config.audit_server_role) return;

    if (executor) {
        const now = Date.now();
        const key = `${role.guild.id}:${executor.id}`;

        if (!nukeTracker.has(key)) nukeTracker.set(key, []);
        const actions = nukeTracker.get(key);

        actions.push({ time: now, type: 'roleDelete' });

        const window = config.anti_nuke_window_ms || 10000;
        const recent = actions.filter(a => now - a.time < window);

        nukeTracker.set(key, recent);

        if (recent.length >= (config.anti_nuke_threshold || 4)) {
            await log(role.guild, config, 'POTENTIAL NUKE',
                `**User:** ${executor.tag}\n**Action:** Role Delete\n**Count:** ${recent.length} in ${window/1000}s`,
                0xff0000, executor.id, executor.tag
            );

            if (!config.test_mode) {
                const member = await role.guild.members.fetch(executor.id).catch(() => null);

                if (member && !await isExempt(role.guild.id, member)) {
                    await takeAction(
                        member,
                        config.anti_nuke_action || 'ban',
                        'Anti-nuke: mass role deletion',
                        config
                    );
                }
            }

            nukeTracker.set(key, []);
        }
    }

    await audit(role.guild, 'ROLE DELETED', 'server',
        role.id,
        role.name,
        executor ? executor.tag : null,
        `Role: ${role.name}`,
        0xff4444
    );
}

async function handleGuildBanAdd(ban) {
    const config = await getConfig(ban.guild.id);
    if (!config.anti_nuke_enabled) return;
    const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: 22 }).catch(() => null);
    const entry = fetchedLogs?.entries.first();
    if (!entry) return;
    const executor = entry.executor;
    if (executor.id === ban.client.user.id) return;
    const member = await ban.guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const key = `ban-${ban.guild.id}-${executor.id}`;
    if (!nukeTracker.has(key)) nukeTracker.set(key, []);
    const actions = nukeTracker.get(key);
    const now = Date.now();
    actions.push({ time: now });
    const window = config.anti_nuke_window_ms || 10000;
    const recent = actions.filter(a => now - a.time < window);
    nukeTracker.set(key, recent);
    if (recent.length >= (config.anti_nuke_threshold || 4)) {
        await member.ban({ reason: 'Anti-nuke: mass ban detected' }).catch(() => {});
        await ban.guild.channels.cache.first()?.send(
            `🚨 **Anti-Nuke triggered** — Mass ban detected by ${executor.tag}. Executor banned.`
        ).catch(() => {});
        nukeTracker.set(key, []);
    }
}

async function handleGuildMemberRemoveNuke(member) {
    if (member.id === member.client.user.id) return;
    const config = await getConfig(member.guild.id);
    if (!config.anti_nuke_enabled) return;
    const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: 20 }).catch(() => null);
    const entry = fetchedLogs?.entries.first();
    if (!entry || entry.action !== 20) return;
    if (Date.now() - entry.createdTimestamp > 3000) return;
    const executor = entry.executor;
    if (executor.id === member.client.user.id) return;
    const executorMember = await member.guild.members.fetch(executor.id).catch(() => null);
    if (!executorMember) return;
    if (executorMember.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const key = `kick-${member.guild.id}-${executor.id}`;
    if (!nukeTracker.has(key)) nukeTracker.set(key, []);
    const actions = nukeTracker.get(key);
    const now = Date.now();
    actions.push({ time: now });
    const window = config.anti_nuke_window_ms || 10000;
    const recent = actions.filter(a => now - a.time < window);
    nukeTracker.set(key, recent);
    if (recent.length >= (config.anti_nuke_threshold || 4)) {
        await executorMember.ban({ reason: 'Anti-nuke: mass kick detected' }).catch(() => {});
        await member.guild.channels.cache.first()?.send(
            `🚨 **Anti-Nuke triggered** — Mass kick detected by ${executor.tag}. Executor banned.`
        ).catch(() => {});
        nukeTracker.set(key, []);
    }
}

async function handleRoleUpdateAudit(oldRole, newRole) {
    const config = await getConfig(newRole.guild.id);
    if (!config.audit_server_role) return;
    await audit(newRole.guild, 'ROLE UPDATED', 'server',
        newRole.id, newRole.name, null,
        `Role: ${newRole.name}`,
        0xffa500
    );
}

async function syncGuildChannels(guild) {
    if (!guild) return;
    const channels = guild.channels.cache.map(c => ({ id: c.id, name: c.name, type: c.type, position: c.position || 0 }));
    await api.post(`/api/guild-channels/${guild.id}`, { channels }).catch(() => {});
}

async function handleChannelCreateSync(channel) {
    if (!channel.guild) return;
    await syncGuildChannels(channel.guild);
}

async function handleChannelDeleteSync(channel) {
    if (!channel.guild) return;
    await syncGuildChannels(channel.guild);
}

async function handleChannelUpdateSync(oldChannel, newChannel) {
    if (!newChannel.guild) return;
    await syncGuildChannels(newChannel.guild);
}

async function syncGuildRoles(guild) {
    if (!guild) return;
    const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.color, position: r.position || 0 }));
    await api.post(`/api/guild-roles/${guild.id}`, { roles }).catch(() => {});
}

async function handleRoleCreateSync(role) {
    if (!role.guild) return;
    await syncGuildRoles(role.guild);
}

async function handleRoleDeleteSync(role) {
    if (!role.guild) return;
    await syncGuildRoles(role.guild);
}

async function handleRoleUpdateSync(oldRole, role) {
    if (!role.guild) return;
    await syncGuildRoles(role.guild);
}

async function handleEmojiCreate(emoji) {
    const config = await getConfig(emoji.guild.id);
    if (!config.audit_server_emoji) return;
    await audit(emoji.guild, 'EMOJI CREATED', 'server',
        emoji.id, emoji.name, null,
        `Emoji: ${emoji.name}`,
        0x34d399
    );
}

async function handleEmojiDelete(emoji) {
    const config = await getConfig(emoji.guild.id);
    if (!config.audit_server_emoji) return;
    await audit(emoji.guild, 'EMOJI DELETED', 'server',
        emoji.id, emoji.name, null,
        `Emoji: ${emoji.name}`,
        0xff4444
    );
}

async function handleWebhookUpdate(channel) {
    if (!channel.guild) return;
    const config = await getConfig(channel.guild.id);
    if (!config.audit_server_webhook) return;
    await audit(channel.guild, 'WEBHOOK UPDATED', 'server',
        channel.id, channel.name, null,
        `Channel: ${channel.name}`,
        0xffa500
    );
}

async function handleVoiceStateUpdate(oldState, newState) {
    const guild = newState.guild;
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
}

module.exports = {
    handleGuildBanAdd,
    handleGuildMemberRemoveNuke,
    handleRoleUpdateAudit,
    handleChannelCreateAudit,
    handleChannelDeleteAudit,
    handleChannelUpdateAudit,
    handleRoleCreateAudit,
    handleRoleDeleteAudit,
    handleRoleCreateSync,
    handleRoleDeleteSync,
    handleRoleUpdateSync,
    handleChannelCreateSync,
    handleChannelDeleteSync,
    handleChannelUpdateSync,
    handleEmojiCreate,
    handleEmojiDelete,
    handleWebhookUpdate,
    handleVoiceStateUpdate,
};
