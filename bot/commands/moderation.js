// ============================================================
// PENNY — MODERATION SLASH COMMANDS
// REF-CMD-01
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');


// ============================================================
// COMMAND DEFINITIONS
// ============================================================

// REF-CMD-02
const commands = [

    // === BAN ===
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt =>
            opt.setName('user').setDescription('The user to ban').setRequired(true))
        .addStringOption(opt =>
            opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
        .addIntegerOption(opt =>
            opt.setName('days').setDescription('Days of messages to delete (0-7)').setRequired(false)),

    // === UNBAN ===
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(opt =>
            opt.setName('userid').setDescription('The Discord user ID to unban').setRequired(true))
        .addStringOption(opt =>
            opt.setName('reason').setDescription('Reason for the unban').setRequired(false)),

    // === KICK ===
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt =>
            opt.setName('user').setDescription('The user to kick').setRequired(true))
        .addStringOption(opt =>
            opt.setName('reason').setDescription('Reason for the kick').setRequired(false)),

    // === MUTE ===
    new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeout (mute) a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt =>
            opt.setName('user').setDescription('The user to mute').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
        .addStringOption(opt =>
            opt.setName('reason').setDescription('Reason for the mute').setRequired(false)),

    // === UNMUTE ===
    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout from a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt =>
            opt.setName('user').setDescription('The user to unmute').setRequired(true)),

    // === WARN ===
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issue a warning to a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt =>
            opt.setName('user').setDescription('The user to warn').setRequired(true))
        .addStringOption(opt =>
            opt.setName('reason').setDescription('Reason for the warning').setRequired(true)),

    // === SOFTBAN ===
    new SlashCommandBuilder()
        .setName('softban')
        .setDescription('Ban and immediately unban a user to delete their messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt =>
            opt.setName('user').setDescription('The user to softban').setRequired(true))
        .addStringOption(opt =>
            opt.setName('reason').setDescription('Reason for the softban').setRequired(false)),

    // === PURGE ===
    new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Bulk delete messages in this channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true))
        .addUserOption(opt =>
            opt.setName('user').setDescription('Only delete messages from this user').setRequired(false)),

    // === WARNINGS ===
    new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings for a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt =>
            opt.setName('user').setDescription('The user to check').setRequired(true)),

    // === CLEARWARNINGS ===
    new SlashCommandBuilder()
        .setName('clearwarnings')
        .setDescription('Clear all warnings for a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt =>
            opt.setName('user').setDescription('The user to clear warnings for').setRequired(true)),

    // === LOCKDOWN ===
    new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Lock or unlock this channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption(opt =>
            opt.setName('action').setDescription('Lock or unlock').setRequired(true)
                .addChoices(
                    { name: 'Lock',   value: 'lock'   },
                    { name: 'Unlock', value: 'unlock' }
                )),

    // === SERVER LOCKDOWN ===
    new SlashCommandBuilder()
        .setName('serverlockdown')
        .setDescription('Lock or unlock the entire server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName('action').setDescription('Lock or unlock').setRequired(true)
                .addChoices(
                    { name: 'Lock',   value: 'lock'   },
                    { name: 'Unlock', value: 'unlock' }
                ))
        .addStringOption(opt =>
            opt.setName('reason').setDescription('Reason for the lockdown').setRequired(false)),

    // === USERINFO ===
    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('View information about a member')
        .addUserOption(opt =>
            opt.setName('user').setDescription('The user to look up').setRequired(false)),

    // === BANS ===
    new SlashCommandBuilder()
        .setName('bans')
        .setDescription('View all active bans in this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

];


// ============================================================
// COMMAND HANDLERS
// ============================================================

// REF-CMD-03
async function handleBan(interaction, api) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days   = interaction.options.getInteger('days')  || 0;

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: '❌ I cannot ban this user.', ephemeral: true });

    await target.ban({ reason, deleteMessageSeconds: days * 86400 });

    // REF-CMD-03a — Log ban to database
    try {
        await api.post(`/api/bans/${interaction.guild.id}`, {
            user_id:   target.id,
            user_tag:  target.user.tag,
            reason,
            banned_by: interaction.user.tag,
        });
    } catch {}

    await logAction(interaction, api, 'BAN', target.user, reason);
    await interaction.reply({ embeds: [actionEmbed('🔨 Banned', target.user, reason, interaction.user)], ephemeral: false });
}

// REF-CMD-03b
async function handleUnban(interaction, api) {
    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        await interaction.guild.members.unban(userId, reason);

        // REF-CMD-03c — Update ban record in database
        try {
            await api.patch(`/api/bans/${interaction.guild.id}/${userId}`, {
                unbanned_by: interaction.user.tag,
            });
        } catch {}

        await logAction(interaction, api, 'UNBAN', { id: userId, tag: userId }, reason);

        const embed = new EmbedBuilder()
            .setTitle('🔓 Unbanned')
            .setColor(0x34d399)
            .addFields(
                { name: 'User ID',   value: userId,               inline: true  },
                { name: 'Moderator', value: interaction.user.tag, inline: true  },
                { name: 'Reason',    value: reason,               inline: false },
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: false });
    } catch {
        await interaction.reply({ content: `❌ Could not unban. Make sure the ID is correct.`, ephemeral: true });
    }
}

// REF-CMD-04
async function handleKick(interaction, api) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (!target.kickable) return interaction.reply({ content: '❌ I cannot kick this user.', ephemeral: true });

    await target.kick(reason);

    await logAction(interaction, api, 'KICK', target.user, reason);
    await interaction.reply({ embeds: [actionEmbed('👢 Kicked', target.user, reason, interaction.user)], ephemeral: false });
}

// REF-CMD-05
async function handleMute(interaction, api) {
    const target   = interaction.options.getMember('user');
    const duration = interaction.options.getInteger('duration');
    const reason   = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (!target.moderatable) return interaction.reply({ content: '❌ I cannot mute this user.', ephemeral: true });

    const ms = duration * 60 * 1000;
    await target.timeout(ms, reason);

    await logAction(interaction, api, 'MUTE', target.user, `${reason} (${duration}m)`);
    await interaction.reply({ embeds: [actionEmbed(`🔇 Muted for ${duration}m`, target.user, reason, interaction.user)], ephemeral: false });
}

// REF-CMD-06
async function handleUnmute(interaction, api) {
    const target = interaction.options.getMember('user');

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });

    await target.timeout(null);

    await logAction(interaction, api, 'UNMUTE', target.user, 'Manual unmute');
    await interaction.reply({ embeds: [actionEmbed('🔊 Unmuted', target.user, 'Timeout removed', interaction.user)], ephemeral: false });
}

// REF-CMD-07
async function handleWarn(interaction, api) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason');

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });

    try {
        await api.post(`/api/warnings/${interaction.guild.id}`, {
            user_id:   target.id,
            user_tag:  target.user.tag,
            reason,
            issued_by: interaction.user.tag,
        });

        const res      = await api.get(`/api/warnings/${interaction.guild.id}/${target.id}`);
        const count    = res.data.length;
        const config   = await api.get(`/api/config/${interaction.guild.id}`);
        const maxWarns = config.data.max_warnings || 3;

        await target.send(
            `⚠️ **Warning ${count}/${maxWarns}** in **${interaction.guild.name}**\nReason: ${reason}`
        ).catch(() => {});

        await logAction(interaction, api, 'WARN', target.user, reason);
        await interaction.reply({ embeds: [actionEmbed(`⚠️ Warned (${count}/${maxWarns})`, target.user, reason, interaction.user)], ephemeral: false });

        if (count >= maxWarns) {
            await target.kick(`Reached ${maxWarns} warnings`);
            await interaction.followUp({ content: `⚠️ ${target.user.tag} has been kicked for reaching ${maxWarns} warnings.` });
        }
    } catch {
        await interaction.reply({ content: '❌ Failed to issue warning.', ephemeral: true });
    }
}

// REF-CMD-08
async function handleSoftban(interaction, api) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: '❌ I cannot ban this user.', ephemeral: true });

    await target.ban({ reason, deleteMessageSeconds: 7 * 86400 });
    await interaction.guild.members.unban(target.id, 'Softban — auto unban');

    await logAction(interaction, api, 'SOFTBAN', target.user, reason);
    await interaction.reply({ embeds: [actionEmbed('🔨 Softbanned', target.user, reason, interaction.user)], ephemeral: false });
}

// REF-CMD-09
async function handlePurge(interaction, api, purgeInitiator) {
    const amount = interaction.options.getInteger('amount');
    const user   = interaction.options.getUser('user');

    if (amount < 1 || amount > 100) {
        return interaction.reply({ content: '❌ Amount must be between 1 and 100.', ephemeral: true });
    }

    await interaction.deferReply({ flags: 64 });

    let messages = await interaction.channel.messages.fetch({ limit: amount });
    if (user) messages = messages.filter(m => m.author.id === user.id);
    
    const key = `${interaction.guild.id}:${interaction.channel.id}`;
    if (purgeInitiator) purgeInitiator.set(key, interaction.user.tag);

    const deleted = await interaction.channel.bulkDelete(messages, true);
    await interaction.editReply({ content: `✅ Deleted ${deleted.size} message(s).` });

}

// REF-CMD-10
async function handleWarnings(interaction, api) {
    const target = interaction.options.getMember('user');

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });

    try {
        const res      = await api.get(`/api/warnings/${interaction.guild.id}/${target.id}`);
        const warnings = res.data;

        if (!warnings.length) {
            return interaction.reply({ content: `✅ ${target.user.tag} has no warnings.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`⚠️ Warnings — ${target.user.tag}`)
            .setColor(0xffa500)
            .setDescription(warnings.map((w, i) =>
                `**${i + 1}.** ${w.reason} — *${w.issued_by}* — <t:${Math.floor(new Date(w.issued_at).getTime() / 1000)}:R>`
            ).join('\n'))
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch {
        await interaction.reply({ content: '❌ Failed to fetch warnings.', ephemeral: true });
    }
}

// REF-CMD-11
async function handleClearWarnings(interaction, api) {
    const target = interaction.options.getMember('user');

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });

    try {
        await api.delete(`/api/warnings/${interaction.guild.id}/${target.id}`);
        await interaction.editReply({ content: `✅ Cleared all warnings for ${target.user.tag}.` });
    } catch {
        await interaction.reply({ content: '❌ Failed to clear warnings.', ephemeral: true });
    }
}

// REF-CMD-12
async function handleLockdown(interaction) {
    const action   = interaction.options.getString('action');
    const channel  = interaction.channel;
    const everyone = interaction.guild.roles.everyone;

    if (action === 'lock') {
        await channel.permissionOverwrites.edit(everyone, { SendMessages: false });
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('🔒 Channel Locked')
                .setColor(0xff4444)
                .setDescription(`${channel} has been locked by ${interaction.user}.`)
                .setTimestamp()]
        });
    } else {
        await channel.permissionOverwrites.edit(everyone, { SendMessages: null });
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('🔓 Channel Unlocked')
                .setColor(0x34d399)
                .setDescription(`${channel} has been unlocked by ${interaction.user}.`)
                .setTimestamp()]
        });
    }
}

// REF-CMD-13
async function handleUserinfo(interaction) {
    const target = interaction.options.getMember('user') || interaction.member;
    const user   = target.user;

    const embed = new EmbedBuilder()
        .setTitle(user.tag)
        .setThumbnail(user.displayAvatarURL())
        .setColor(0x3b82f6)
        .addFields(
            { name: 'User ID',    value: user.id,                                                                                                        inline: true  },
            { name: 'Joined',     value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`,                                                           inline: true  },
            { name: 'Registered', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,                                                            inline: true  },
            { name: 'Roles',      value: target.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'None',    inline: false },
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// REF-CMD-16
async function handleBans(interaction, api) {
    try {
        const res  = await api.get(`/api/bans/${interaction.guild.id}`);
        const bans = res.data;

        if (!bans.length) {
            return interaction.reply({ content: '✅ No active bans.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🔨 Active Bans — ${interaction.guild.name}`)
            .setColor(0xff4444)
            .setDescription(bans.map((b, i) =>
                `**${i + 1}.** ${b.user_tag} — ${b.reason} — *${b.banned_by}* — <t:${Math.floor(new Date(b.banned_at).getTime() / 1000)}:R>`
            ).join('\n'))
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch {
        await interaction.reply({ content: '❌ Failed to fetch bans.', ephemeral: true });
    }
}

// REF-CMD-17
async function handleServerLockdown(interaction) {
    const action  = interaction.options.getString('action');
    const reason  = interaction.options.getString('reason') || 'No reason provided';
    const everyone = interaction.guild.roles.everyone;

    await interaction.deferReply();

    const channels = interaction.guild.channels.cache.filter(c =>
        c.type === 0 && c.permissionsFor(interaction.guild.members.me).has('ManageChannels')
    );

    let count = 0;
    for (const [, channel] of channels) {
        try {
            if (action === 'lock') {
                await channel.permissionOverwrites.edit(everyone, { SendMessages: false });
            } else {
                await channel.permissionOverwrites.edit(everyone, { SendMessages: null });
            }
            count++;
        } catch {}
    }

    const embed = new EmbedBuilder()
        .setTitle(action === 'lock' ? '🔒 Server Locked Down' : '🔓 Server Unlocked')
        .setColor(action === 'lock' ? 0xff4444 : 0x34d399)
        .addFields(
            { name: 'Channels Affected', value: `${count}`,              inline: true },
            { name: 'Moderator',         value: interaction.user.tag,    inline: true },
            { name: 'Reason',            value: reason,                  inline: false },
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

// ============================================================
// HELPERS
// ============================================================

// REF-CMD-14
function actionEmbed(title, user, reason, moderator) {
    return new EmbedBuilder()
        .setTitle(title)
        .setColor(0xff4444)
        .addFields(
            { name: 'User',      value: `${user.tag} (${user.id})`, inline: true  },
            { name: 'Moderator', value: moderator.tag,              inline: true  },
            { name: 'Reason',    value: reason,                     inline: false },
        )
        .setTimestamp();
}

// REF-CMD-15
async function logAction(interaction, api, action, user, reason) {
    try {
        await api.post(`/api/logs/${interaction.guild.id}`, {
            action,
            target_id:  user.id,
            target_tag: user.tag,
            moderator:  interaction.user.tag,
            reason,
        });
    } catch {}
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    commands,
    handleBan,
    handleUnban,
    handleKick,
    handleMute,
    handleUnmute,
    handleWarn,
    handleSoftban,
    handlePurge,
    handleWarnings,
    handleClearWarnings,
    handleLockdown,
    handleServerLockdown,
    handleUserinfo,
    handleBans,
};
