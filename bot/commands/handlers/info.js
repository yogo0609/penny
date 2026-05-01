// ============================================================
// MODERATION INFO & CONTROL HANDLERS (Warnings, Lockdown, Userinfo, Bans)
// ============================================================

const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { api } = require('../config');

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
        await interaction.reply({ content: `✅ Cleared all warnings for ${target.user.tag}.` });
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

module.exports = {
    handleWarnings,
    handleClearWarnings,
    handleLockdown,
    handleUserinfo,
    handleBans,
    handleServerLockdown,
};
