const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { api, getConfig } = require('../config');

// REF-BOT-29
async function activatePanic(guild, triggeredBy) {
    try {
        const channels = guild.channels.cache.filter(c => c.type === 0 || c.type === 2 || c.type === 4);
        const snapshot = [];

        for (const [, channel] of channels) {
            const overwrite = channel.permissionOverwrites.cache.get(guild.id);
            snapshot.push({
                channelId: channel.id,
                allow:     overwrite?.allow.bitfield.toString() || '0',
                deny:      overwrite?.deny.bitfield.toString()  || '0',
            });
        }

        await api.post(`/api/panic/${guild.id}/activate`, {
            triggered_by:     triggeredBy,
            channel_snapshot: snapshot,
        });

        for (const [, channel] of channels) {
            await channel.permissionOverwrites.edit(guild.id, { SendMessages: false }).catch(() => {});
        }

        const config         = await getConfig(guild.id);
        const alertChannelId = config.panic_alert_channel || config.log_channel_id;
        const alertChannel   = guild.channels.cache.get(alertChannelId);

        if (alertChannel) {
            const embed = new EmbedBuilder()
                .setTitle('🚨 PANIC MODE ACTIVATED')
                .setColor(0xff0000)
                .setDescription('All channels have been locked.')
                .addFields({ name: 'Triggered by', value: triggeredBy })
                .setTimestamp();
            const content = config.panic_alert_role ? `<@&${config.panic_alert_role}>` : '';
            await alertChannel.send({ content, embeds: [embed] }).catch(() => {});
        }

        await api.post(`/api/logs/${guild.id}`, {
            action: 'PANIC MODE ACTIVATED', target_id: null, target_tag: null,
            moderator: triggeredBy, reason: 'Panic mode activated — all channels locked',
        }).catch(() => {});

        console.log(`[PANIC] Activated in ${guild.name} by ${triggeredBy}`);
    } catch (err) {
        console.error(`[PANIC] Failed to activate: ${err.message}`);
    }
}

async function deactivatePanic(guild, deactivatedBy) {
    try {
        const panicRes = await api.get(`/api/panic/${guild.id}`);
        const snapshot = JSON.parse(panicRes.data.channel_snapshot || '[]');

        for (const snap of snapshot) {
            const channel = guild.channels.cache.get(snap.channelId);
            if (!channel) continue;
            await channel.permissionOverwrites.edit(guild.id, { SendMessages: null }).catch(() => {});
        }

        await api.post(`/api/panic/${guild.id}/deactivate`, { deactivated_by: deactivatedBy });

        const config       = await getConfig(guild.id);
        const alertChannel = guild.channels.cache.get(config.panic_alert_channel || config.log_channel_id);

        if (alertChannel) {
            const embed = new EmbedBuilder()
                .setTitle('✅ PANIC MODE DEACTIVATED')
                .setColor(0x22c55e)
                .setDescription('All channels have been unlocked.')
                .addFields({ name: 'Deactivated by', value: deactivatedBy })
                .setTimestamp();
            await alertChannel.send({ embeds: [embed] }).catch(() => {});
        }

        await api.post(`/api/logs/${guild.id}`, {
            action: 'PANIC MODE DEACTIVATED', target_id: null, target_tag: null,
            moderator: deactivatedBy, reason: 'Panic mode deactivated — channels restored',
        }).catch(() => {});

        console.log(`[PANIC] Deactivated in ${guild.name} by ${deactivatedBy}`);
    } catch (err) {
        console.error(`[PANIC] Failed to deactivate: ${err.message}`);
    }
}

// REF-BOT-29b
async function handlePanicCommand(interaction) {
    const config          = await getConfig(interaction.guild.id);
    const authorizedRoles = config.panic_authorized_roles || [];
    const hasPermission   = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        interaction.member.roles.cache.some(r => authorizedRoles.includes(r.id));

    if (!hasPermission) {
        return interaction.reply({ content: '❌ You are not authorized to use Panic Mode.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const panicRes = await api.get(`/api/panic/${interaction.guild.id}`);
        if (panicRes.data.active) {
            await deactivatePanic(interaction.guild, interaction.user.tag);
            await interaction.editReply({ content: '✅ Panic Mode deactivated — channels restored.' });
        } else {
            await activatePanic(interaction.guild, interaction.user.tag);
            await interaction.editReply({ content: '🚨 Panic Mode activated — all channels locked.' });
        }
    } catch {
        await interaction.editReply({ content: '❌ Failed to toggle Panic Mode.' });
    }
}

module.exports = { activatePanic, deactivatePanic, handlePanicCommand };