const { api, getConfig } = require('./config');
const { log, audit } = require('./utils/logger');
const { takeAction } = require('./moderation/warnings');
const raidTracker = new Map();
const rejoinTracker = new Map();

async function handleGuildMemberAdd(member) {
    const config = await getConfig(member.guild.id);

    // === ANTI-HOIST ===
    // REF-BOT-14g
    if (config.antihoist_enabled) {
        const hoistRegex = /^[^a-zA-Z0-9]/;
        const name       = member.displayName;
        if (hoistRegex.test(name)) {
            const cleanName = name.replace(/^[^a-zA-Z0-9]+/, '') || 'Member';
            await member.setNickname(cleanName, 'Anti-hoist').catch(() => {});
            await log(member.guild, config, 'ANTI-HOIST',
                `**User:** ${member.user.tag}\n**Original:** ${name}\n**Changed to:** ${cleanName}`,
                0xffa500, member.id, member.user.tag
            );
        }
    }

    // === PANIC MODE JOIN KICK ===
    // REF-BOT-29a
    try {
        const panicRes = await api.get(`/api/panic/${member.guild.id}`);
        if (panicRes.data.active) {
            await member.send(
                `⚠️ **${member.guild.name}** is currently in Panic Mode. You cannot join at this time.`
            ).catch(() => {});
            await member.kick('Panic mode active');
            return;
        }
    } catch {}

    // === BOT JOIN DETECTION ===
    // 	REF-BOT-23
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

    // === JOIN GATE: DEFAULT AVATAR ===
    // REF-BOT-38a
    if (config.joingate_avatar_enabled) {
        if (!member.user.avatar) {
            await log(member.guild, config, 'JOIN GATE: DEFAULT AVATAR',
                `**User:** ${member.user.tag}\n**Reason:** Default avatar detected`,
                0xffa500, member.id, member.user.tag
            );
           if (!config.test_mode) await member.kick('Join gate: default avatar');
        }
    }

    // === JOIN GATE: USERNAME FILTER ===
    // REF-BOT-38b
    if (config.joingate_username_enabled) {
        const username = member.user.username.toLowerCase();
        const patterns = [/discord\.gg/i, /invite/i, /free nitro/i, /\u200b/, /^\s/, /discord\.com\/invite/i];
        const hoistChars = /^[^a-zA-Z0-9]/;
       if (patterns.some(p => p.test(username)) || hoistChars.test(username)) {
            await log(member.guild, config, 'JOIN GATE: USERNAME FLAG',
                `**User:** ${member.user.tag}\n**Reason:** Suspicious username`,
                0xffa500, member.id, member.user.tag
            );
            if (!config.test_mode) await member.kick('Join gate: suspicious username');
        }
    }

    // === JOIN GATE: RAPID REJOIN ===
    // REF-BOT-38c
    if (config.joingate_rejoin_enabled) {
        if (!global.rejoinTracker) global.rejoinTracker = new Map();
        const key = `${member.guild.id}-${member.user.id}`;
        const now = Date.now();
        const last = global.rejoinTracker.get(key);
        const window = (config.joingate_rejoin_minutes || 10) * 60 * 1000;
        if (last && now - last < window) {
            await log(member.guild, config, 'JOIN GATE: RAPID REJOIN',
                `**User:** ${member.user.tag}\n**Reason:** Rejoined too quickly`,
                0xffa500, member.id, member.user.tag
            );
            if (!config.test_mode) await member.kick('Join gate: rapid rejoin detected');
        }
        global.rejoinTracker.set(key, now);
    }

    // === VERIFICATION ===
    if (config.verification_enabled && config.verification_channel_id && config.verification_role_id) {
        const verifyChannel = member.guild.channels.cache.get(config.verification_channel_id);
        if (verifyChannel) {
            const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
            const button = new ButtonBuilder()
                .setCustomId(`verify_${member.id}`)
                .setLabel('✅ Verify')
                .setStyle(ButtonStyle.Success);
            const row = new ActionRowBuilder().addComponents(button);
            const msg = await verifyChannel.send({
                content: `👋 Welcome <@${member.id}>! Please click the button below to verify and gain access to the server.`,
                components: [row]
            }).catch(() => null);

            if (msg && config.verification_timeout_minutes) {
                const ms = (config.verification_timeout_minutes || 10) * 60 * 1000;
                const executeAt = new Date(Date.now() + ms).toISOString();
                await api.post('/api/scheduled-jobs', {
                    guild_id:   member.guild.id,
                    type:       'verify_timeout',
                    target_id:  member.id,
                    execute_at: executeAt,
                    payload:    { message_id: msg.id, channel_id: verifyChannel.id }
                }).catch(() => {});
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



module.exports = { handleGuildMemberAdd };
