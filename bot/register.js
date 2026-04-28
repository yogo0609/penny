// ============================================================
// PENNY — SLASH COMMAND REGISTRATION
// REF-REG-01
// Run this once to register commands with Discord:
// node register.js
// ============================================================

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { commands }     = require('./commands/moderation');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// REF-REG-02
// Registers commands globally — available in all servers Penny is in
// Takes up to 1 hour to propagate globally
// For instant testing use guild-specific registration below

(async () => {
    try {
        console.log('🔄 Registering slash commands...');

        const body = commands.map(c => c.toJSON());

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body }
        );

        console.log(`✅ Registered ${body.length} slash command(s) globally`);
        console.log('⏳ Global commands may take up to 1 hour to appear in Discord');
        console.log('💡 For instant registration, set GUILD_ID in .env and use guild registration');

    } catch (err) {
        console.error('❌ Registration failed:', err.message);
    }
})();
