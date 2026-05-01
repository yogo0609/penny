const { PermissionsBitField } = require('discord.js');
const { getConfig, isModuleExempt, log, handleModuleAction } = require('./helpers');

async function handleMessageCreate(message) {
    if (message.author.bot) return;
    if (!message.guild)     return;

    const config = await getConfig(message.guild.id);
    const member = message.member
        || await message.guild.members.fetch(message.author.id).catch(() => null);

    // Global admin check still applies to everything
    if (member?.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    // === SPAM DETECTION ===
    // REF-BOT-10
    if (config.spam_enabled && !await isModuleExempt(message.guild.id, 'spam', member, message.channel.id)) {
        const now    = Date.now();
        const userId = message.author.id;
        const max    = config.spam_max_messages || 5;
        const window = config.spam_window_ms    || 5000;

        if (!spamTracker.has(userId)) spamTracker.set(userId, []);
        const timestamps = spamTracker.get(userId);
        timestamps.push(now);

        const recent = timestamps.filter(ts => now - ts < window);
        spamTracker.set(userId, recent);

        if (recent.length > max) {
            await log(message.guild, config, 'SPAM DETECTED',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}\n**Messages:** ${recent.length} in ${window / 1000}s`,
                0xff4444, message.author.id, message.author.tag
            );

            if (!config.test_mode) {
                await handleModuleAction(config.spam_action, message, member, 'Spam detected', config);
            }

            spamTracker.set(userId, []);
            return;
        }
    }


    // === BAD WORD FILTER ===
    // REF-BOT-11
    if (config.badwords_enabled && !await isModuleExempt(message.guild.id, 'badwords', member, message.channel.id)) {
        const content  = message.content.toLowerCase();
        const wordList = config.badwords_list || [];
        const found    = wordList.find(w => content.includes(w.toLowerCase()));

        if (found) {
            await log(message.guild, config, 'BAD WORD',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}\n**Trigger:** \`${found}\``,
                0xff4444, message.author.id, message.author.tag
            );

            if (!config.test_mode) {
                await handleModuleAction(config.badwords_action, message, member, `Prohibited word: ${found}`, config);
            }

            return;
        }
    }


    // === CAPS FILTER ===
    // REF-BOT-12
    if (config.caps_enabled && !await isModuleExempt(message.guild.id, 'caps', member, message.channel.id) && message.content.length >= (config.caps_min_length || 10)) {
        const letters = message.content.replace(/[^a-zA-Z]/g, '');
        if (letters.length > 0) {
            const ratio = (message.content.match(/[A-Z]/g) || []).length / letters.length;
            if (ratio >= (config.caps_threshold || 0.7)) {
                await log(message.guild, config, 'CAPS FILTER',
                    `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                    0xff4444, message.author.id, message.author.tag
                );

                if (!config.test_mode) {
                    await handleModuleAction(config.caps_action, message, member, 'Caps filter triggered', config);
                }

                return;
            }
        }
    }


    // === MASS MENTION ===
    // REF-BOT-13
    if (config.mass_mention_enabled && !await isModuleExempt(message.guild.id, 'mass_mention', member, message.channel.id)) {
        const mentionCount = message.mentions.users.size + message.mentions.roles.size;
        if (mentionCount >= (config.mass_mention_max || 5)) {
            await log(message.guild, config, 'MASS MENTION',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}\n**Mentions:** ${mentionCount}`,
                0xff4444, message.author.id, message.author.tag
            );

            if (!config.test_mode) {
                await handleModuleAction(config.mass_mention_action, message, member, `Mass mention (${mentionCount})`, config);
            }

            return;
        }
    }


    // === ANTI INVITE LINK ===
    // REF-BOT-14
    if (config.antilink_enabled && !await isModuleExempt(message.guild.id, 'antilink', member, message.channel.id)) {
        const inviteRegex = /(discord\.gg|discord\.com\/invite)\/\S+/i;
        if (inviteRegex.test(message.content)) {
            await log(message.guild, config, 'INVITE LINK',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                0xff4444, message.author.id, message.author.tag
            );

            if (!config.test_mode) {
                await handleModuleAction(config.antilink_action, message, member, 'Posted invite link', config);
            }

            return;
        }
    }


    // === ANTI-LINK (all URLs) ===
    // REF-BOT-14b
    if (config.antilink_all_enabled && !await isModuleExempt(message.guild.id, 'antilink_all', member, message.channel.id)) {
        const urlRegex = /https?:\/\/[^\s]+/gi;
        if (urlRegex.test(message.content)) {
            await log(message.guild, config, 'LINK DETECTED',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                0xff4444, message.author.id, message.author.tag
            );
            if (!config.test_mode) {
                await handleModuleAction(config.antilink_all_action, message, member, 'Posted a link', config);
            }
            return;
        }
    }


    // === REPEATED TEXT (copypasta) ===
    // REF-BOT-14c
    if (config.repeat_enabled && !await isModuleExempt(message.guild.id, 'repeat', member, message.channel.id)) {
        const content = message.content.trim();
        if (content.length >= (config.repeat_min_length || 20)) {
            const words      = content.split(/\s+/);
            const unique     = new Set(words.map(w => w.toLowerCase()));
            const repeatRatio = 1 - (unique.size / words.length);
            if (repeatRatio >= (config.repeat_threshold || 0.7)) {
                await log(message.guild, config, 'REPEATED TEXT',
                    `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                    0xff4444, message.author.id, message.author.tag
                );
                if (!config.test_mode) {
                    await handleModuleAction(config.repeat_action, message, member, 'Repeated text detected', config);
                }
                return;
            }
        }
    }


    // === EMOJI SPAM ===
    // REF-BOT-14d
    if (config.emojispam_enabled && !await isModuleExempt(message.guild.id, 'emojispam', member, message.channel.id)) {
        const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
        const emojiCount = (message.content.match(emojiRegex) || []).length;
        if (emojiCount >= (config.emojispam_max || 5)) {
            await log(message.guild, config, 'EMOJI SPAM',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}\n**Emojis:** ${emojiCount}`,
                0xff4444, message.author.id, message.author.tag
            );
            if (!config.test_mode) {
                await handleModuleAction(config.emojispam_action, message, member, `Emoji spam (${emojiCount} emojis)`, config);
            }
            return;
        }
    }


    // === NEWLINE SPAM ===
    // REF-BOT-14e
    if (config.newline_enabled && !await isModuleExempt(message.guild.id, 'newline', member, message.channel.id)) {
        const newlineCount = (message.content.match(/\n/g) || []).length;
        if (newlineCount >= (config.newline_max || 10)) {
            await log(message.guild, config, 'NEWLINE SPAM',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}\n**Lines:** ${newlineCount}`,
                0xff4444, message.author.id, message.author.tag
            );
            if (!config.test_mode) {
                await handleModuleAction(config.newline_action, message, member, `Newline spam (${newlineCount} lines)`, config);
            }
            return;
        }
    }


    // === ZALGO TEXT ===
    // REF-BOT-14f
    if (config.zalgo_enabled && !await isModuleExempt(message.guild.id, 'zalgo', member, message.channel.id)) {
        const zalgoRegex = /[\u0300-\u036f\u0489\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]{3,}/g;
        if (zalgoRegex.test(message.content)) {
            await log(message.guild, config, 'ZALGO TEXT',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel.name}`,
                0xff4444, message.author.id, message.author.tag
            );
            if (!config.test_mode) {
                await handleModuleAction(config.zalgo_action, message, member, 'Zalgo text detected', config);
            }
            return;
        }
    }

});


module.exports = { handleMessageCreate };
