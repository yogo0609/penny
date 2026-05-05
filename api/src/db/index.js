const { pool }                                                          = require('./connection');
const { initSchema }                                                    = require('./schema');
const { getConfig, getConfigAll, setConfig }                           = require('./config');
const { getExemptions, addExemption, removeExemption,
        getModuleExemptions, addModuleExemption, removeModuleExemption } = require('./exemptions');
const { addModLog, getModLogs,
        addWarning, getWarnings, getAllWarnings, clearUserWarnings,
        addBan, removeBan, getActiveBans, getBanHistory,
        getLadder, setLadderStep, deleteLadderStep, clearLadder,
        getPunishmentSettings, setPunishmentSettings,
        clearModLogs, clearWarnings, clearBans }                        = require('./moderation');
const { hasOwner, createUser, getUserByUsername, getUserById,
        getAllUsers, updateUserRole, updateUserTheme, updateUsername,
        updatePassword, updateDiscordId, deleteUser, updateLastLogin }  = require('./auth');
const { addAuditLog, getAuditLogs, getAuditConfig,
        setAuditConfig, clearAuditLogs }                                = require('./audit');
const { setGuilds, getGuilds, setGuildChannels, getGuildChannels,
        setGuildRoles, getGuildRoles,
        addScheduledJob, getDueJobs, markJobDone }                      = require('./guild');
const { getPanicState, setPanicActive, setPanicInactive }              = require('./panic');
const { exportGuildData }                                               = require('./data');

module.exports = {
    pool,
    initSchema,
    getConfig, getConfigAll, setConfig,
    getExemptions, addExemption, removeExemption,
    getModuleExemptions, addModuleExemption, removeModuleExemption,
    addModLog, getModLogs,
    addWarning, getWarnings, getAllWarnings, clearUserWarnings,
    addBan, removeBan, getActiveBans, getBanHistory,
    getLadder, setLadderStep, deleteLadderStep, clearLadder,
    getPunishmentSettings, setPunishmentSettings,
    clearModLogs, clearWarnings, clearBans,
    hasOwner, createUser, getUserByUsername, getUserById,
    getAllUsers, updateUserRole, updateUserTheme, updateUsername,
    updatePassword, updateDiscordId, deleteUser, updateLastLogin,
    addAuditLog, getAuditLogs, getAuditConfig, setAuditConfig, clearAuditLogs,
    setGuilds, getGuilds,
    setGuildChannels, getGuildChannels,
    setGuildRoles, getGuildRoles,
    addScheduledJob, getDueJobs, markJobDone,
    getPanicState, setPanicActive, setPanicInactive,
    exportGuildData,
};