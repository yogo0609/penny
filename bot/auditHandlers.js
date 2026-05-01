const { AuditLogEvent } = require('discord.js');
const { getConfig } = require('./config');
const { audit } = require('./utils/logger');

// === MESSAGE DELETED ===
// REF-BOT-25
async function handleMessageDelete(message) {
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
}

// === MESSAGE EDITED ===
// REF-BOT-25b
async function handleMessageUpdate(oldMsg, newMsg) {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    const config = await getConfig(newMsg.guild.id);
    if (!config.audit_messages_edit) return;

    await audit(newMsg.guild, 'MESSAGE EDITED', 'messages',
        newMsg.author?.id, newMsg.author?.tag, null,
        `Channel: ${newMsg.channel.name} | Before: ${oldMsg.content || 'Unknown'} | After: ${newMsg.content}`,
        0xffa500
    );
}

// === BULK MESSAGE DELETE ===
// REF-BOT-25c
async function handleMessageDeleteBulk(messages, purgeInitiator) {
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
}

// === MEMBER LEFT ===
// REF-BOT-26
async function handleGuildMemberLeft(member) {
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
}

// === MEMBER UPDATED (nickname, roles) ===
// REF-BOT-26b
async function handleGuildMemberUpdate(oldMember, newMember) {
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
}

module.exports = {
    handleMessageDelete,
    handleMessageUpdate,
    handleMessageDeleteBulk,
    handleGuildMemberLeft,
    handleGuildMemberUpdate,
};
