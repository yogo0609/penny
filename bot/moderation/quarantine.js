const { api } = require('../config');

// REF-BOT-31
async function quarantineUser(member, reason, config) {
    try {
        const guild = member.guild;

        let role = guild.roles.cache.find(r => r.name === 'Quarantined');
        if (!role) {
            role = await guild.roles.create({
                name: 'Quarantined',
                color: 0x808080,
                reason: 'Penny quarantine system',
            });
            for (const [, channel] of guild.channels.cache) {
                await channel.permissionOverwrites.create(role, {
                    ViewChannel:  false,
                    SendMessages: false,
                }).catch(() => {});
            }
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
            action:     'QUARANTINE',
            target_id:  member.id,
            target_tag: member.user.tag,
            moderator:  'Penny',
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

// REF-BOT-32
async function handleQuarantine(interaction) {
    const { getConfig } = require('../config');
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

module.exports = { quarantineUser, unquarantineUser, handleQuarantine, handleUnquarantine };