// ============================================================
// MEMBER ACTION HANDLERS (Ban, Kick, Mute, Warn, etc.)
// ============================================================

const { api } = require('../config');

// REF-CMD-03
async function handleBan(interaction, api) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days   = interaction.options.getInteger('days')  || 0;

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: '❌ I cannot ban this user.', ephemeral: true });

    await target.ban({ reason, deleteMessageSeconds: days * 86400 });

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

        try {
            await api.patch(`/api/bans/${interaction.guild.id}/${userId}`, {
                unbanned_by: interaction.user.tag,
            });
        } catch {}

        await logAction(interaction, api, 'UNBAN', { id: userId, tag: userId }, reason);

        const { EmbedBuilder } = require('discord.js');
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

// REF-CMD-17
async function handleTempban(interaction, api) {
    const target   = interaction.options.getMember('user');
    const duration = interaction.options.getInteger('duration');
    const unit     = interaction.options.getString('unit') || 'hours';
    const reason   = interaction.options.getString('reason') || 'No reason provided';

    if (!target)           return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (!target.bannable)  return interaction.reply({ content: '❌ I cannot ban this user.', ephemeral: true });

    const units = { minutes: 60000, hours: 3600000, days: 86400000 };
    const ms    = duration * (units[unit] || 3600000);

    await target.send(
        `🚨 You have been **temporarily banned** from **${interaction.guild.name}**\nDuration: ${duration} ${unit}\nReason: ${reason}`
    ).catch(() => {});

    await target.ban({ reason, deleteMessageSeconds: 0 });

    try {
        await api.post(`/api/bans/${interaction.guild.id}`, {
            user_id:   target.id,
            user_tag:  target.user.tag,
            reason:    `(Tempban ${duration}${unit[0]}) ${reason}`,
            banned_by: interaction.user.tag,
        });
    } catch {}

    await logAction(interaction, api, 'TEMPBAN', target.user, `${reason} (${duration} ${unit})`);

    setTimeout(async () => {
        try {
            await interaction.guild.members.unban(target.id, 'Tempban expired');

            await api.patch(`/api/bans/${interaction.guild.id}/${target.id}`, {
                unbanned_by: 'Penny (auto)',
            }).catch(() => {});

            await api.post(`/api/logs/${interaction.guild.id}`, {
                action:     'TEMPBAN EXPIRED',
                target_id:  target.id,
                target_tag: target.user.tag,
                moderator:  'Penny',
                reason:     `Tempban expired (${duration} ${unit})`,
            }).catch(() => {});

            await target.send(
                `✅ Your temporary ban from **${interaction.guild.name}** has expired. You may rejoin.`
            ).catch(() => {});

        } catch(err) {
            console.error(`[TEMPBAN] Failed to unban ${target.user.tag}: ${err.message}`);
        }
    }, ms);

    await interaction.reply({
        embeds: [actionEmbed(`⏱ Tempbanned for ${duration} ${unit}`, target.user, reason, interaction.user)],
        ephemeral: false
    });
}

// REF-CMD-18
async function handleTempmute(interaction, api) {
    const target   = interaction.options.getMember('user');
    const duration = interaction.options.getInteger('duration');
    const unit     = interaction.options.getString('unit') || 'minutes';
    const reason   = interaction.options.getString('reason') || 'No reason provided';

    if (!target)              return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (!target.moderatable)  return interaction.reply({ content: '❌ I cannot mute this user.', ephemeral: true });

    const units = { minutes: 60000, hours: 3600000, days: 86400000 };
    const ms    = duration * (units[unit] || 60000);

    const maxMs = 28 * 24 * 60 * 60 * 1000;
    if (ms > maxMs) return interaction.reply({ content: '❌ Maximum timeout duration is 28 days.', ephemeral: true });

    await target.timeout(ms, reason);

    await target.send(
        `🔇 You have been **muted** in **${interaction.guild.name}**\nDuration: ${duration} ${unit}\nReason: ${reason}`
    ).catch(() => {});

    await logAction(interaction, api, 'TEMPMUTE', target.user, `${reason} (${duration} ${unit})`);

    await interaction.reply({
        embeds: [actionEmbed(`🔇 Muted for ${duration} ${unit}`, target.user, reason, interaction.user)],
        ephemeral: false
    });
}

// ============================================================
// HELPERS
// ============================================================

function actionEmbed(title, user, reason, moderator) {
    const { EmbedBuilder } = require('discord.js');
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

module.exports = {
    handleBan,
    handleUnban,
    handleKick,
    handleMute,
    handleUnmute,
    handleWarn,
    handleSoftban,
    handlePurge,
    handleTempban,
    handleTempmute,
};
