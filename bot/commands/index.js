// ============================================================
// MODERATION COMMANDS BARREL EXPORT
// ============================================================

const { commands } = require('./definitions');
const {
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
} = require('./handlers/member-actions');

const {
    handleWarnings,
    handleClearWarnings,
    handleLockdown,
    handleUserinfo,
    handleBans,
    handleServerLockdown,
} = require('./handlers/info');

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
    handleTempban,
    handleTempmute,
};
