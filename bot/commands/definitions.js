// ============================================================
// PENNY — MODERATION SLASH COMMANDS DEFINITIONS
// REF-CMD-02
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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

    // === TEMPBAN ===
    new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Temporarily ban a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt =>
            opt.setName('user').setDescription('User to tempban').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('duration').setDescription('Duration').setRequired(true))
        .addStringOption(opt =>
            opt.setName('unit').setDescription('Unit of time').setRequired(true)
                .addChoices(
                    { name: 'Minutes', value: 'minutes' },
                    { name: 'Hours',   value: 'hours'   },
                    { name: 'Days',    value: 'days'    },
                ))
        .addStringOption(opt =>
            opt.setName('reason').setDescription('Reason').setRequired(false)),

    new SlashCommandBuilder()
        .setName('quarantine')
        .setDescription('Quarantine a user')
        .addUserOption(o => o.setName('user').setDescription('User to quarantine').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

    new SlashCommandBuilder()
        .setName('unquarantine')
        .setDescription('Release a user from quarantine')
        .addUserOption(o => o.setName('user').setDescription('User to release').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

    // === PANIC ===
    new SlashCommandBuilder()
        .setName('panic')
        .setDescription('Toggle Panic Mode — locks or unlocks all channels instantly')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    // === TEMPMUTE ===
    new SlashCommandBuilder()
        .setName('tempmute')
        .setDescription('Temporarily mute a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt =>
            opt.setName('user').setDescription('User to tempmute').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('duration').setDescription('Duration').setRequired(true))
        .addStringOption(opt =>
            opt.setName('unit').setDescription('Unit of time').setRequired(true)
                .addChoices(
                    { name: 'Minutes', value: 'minutes' },
                    { name: 'Hours',   value: 'hours'   },
                    { name: 'Days',    value: 'days'    },
                ))
        .addStringOption(opt =>
            opt.setName('reason').setDescription('Reason').setRequired(false)),
];

module.exports = { commands };
