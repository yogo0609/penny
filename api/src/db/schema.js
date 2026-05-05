const { pool } = require('./connection');

// REF-DB-02
async function initSchema() {
    await pool.query(`

        -- REF-DB-03
        CREATE TABLE IF NOT EXISTS config (
            guild_id    TEXT NOT NULL,
            key         TEXT NOT NULL,
            value       TEXT NOT NULL,
            PRIMARY KEY (guild_id, key)
        );

        -- REF-DB-04
        CREATE TABLE IF NOT EXISTS exemptions (
            id          SERIAL PRIMARY KEY,
            guild_id    TEXT NOT NULL,
            type        TEXT NOT NULL,
            target_id   TEXT NOT NULL,
            added_by    TEXT NOT NULL,
            added_at    TIMESTAMPTZ DEFAULT NOW()
        );

        -- REF-DB-05
        CREATE TABLE IF NOT EXISTS mod_log (
            id          SERIAL PRIMARY KEY,
            guild_id    TEXT NOT NULL,
            action      TEXT NOT NULL,
            target_id   TEXT,
            target_tag  TEXT,
            moderator   TEXT,
            reason      TEXT,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        );

        -- REF-DB-06
        CREATE TABLE IF NOT EXISTS warnings (
            id          SERIAL PRIMARY KEY,
            guild_id    TEXT NOT NULL,
            user_id     TEXT NOT NULL,
            user_tag    TEXT NOT NULL,
            reason      TEXT,
            issued_by   TEXT,
            issued_at   TIMESTAMPTZ DEFAULT NOW()
        );

        -- REF-DB-16
        CREATE TABLE IF NOT EXISTS dashboard_users (
            id           SERIAL PRIMARY KEY,
            username     TEXT NOT NULL UNIQUE,
            password     TEXT NOT NULL,
            role         TEXT NOT NULL DEFAULT 'admin',
            discord_id   TEXT,
            theme        TEXT NOT NULL DEFAULT 'light',
            created_at   TIMESTAMPTZ DEFAULT NOW(),
            last_login   TIMESTAMPTZ
        );

        -- REF-DB-17
        CREATE TABLE IF NOT EXISTS dashboard_sessions (
            id           SERIAL PRIMARY KEY,
            user_id      INTEGER NOT NULL REFERENCES dashboard_users(id),
            token        TEXT NOT NULL UNIQUE,
            expires_at   TIMESTAMPTZ NOT NULL,
            created_at   TIMESTAMPTZ DEFAULT NOW()
        );

        -- REF-DB-24
        CREATE TABLE IF NOT EXISTS bans (
            id           SERIAL PRIMARY KEY,
            guild_id     TEXT NOT NULL,
            user_id      TEXT NOT NULL,
            user_tag     TEXT NOT NULL,
            reason       TEXT,
            banned_by    TEXT NOT NULL,
            banned_at    TIMESTAMPTZ DEFAULT NOW(),
            unbanned_by  TEXT,
            unbanned_at  TIMESTAMPTZ,
            active       INTEGER DEFAULT 1
        );

        -- REF-DB-28
        CREATE TABLE IF NOT EXISTS audit_log (
            id          SERIAL PRIMARY KEY,
            guild_id    TEXT NOT NULL,
            event       TEXT NOT NULL,
            category    TEXT NOT NULL,
            target_id   TEXT,
            target_tag  TEXT,
            moderator   TEXT,
            detail      TEXT,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        );

        -- REF-DB-29
        CREATE TABLE IF NOT EXISTS audit_config (
            guild_id    TEXT NOT NULL,
            event       TEXT NOT NULL,
            enabled     INTEGER DEFAULT 1,
            channel_id  TEXT,
            PRIMARY KEY (guild_id, event)
        );

        -- REF-DB-38
        CREATE TABLE IF NOT EXISTS module_exemptions (
            id          SERIAL PRIMARY KEY,
            guild_id    TEXT NOT NULL,
            module      TEXT NOT NULL,
            type        TEXT NOT NULL,
            target_id   TEXT NOT NULL,
            note        TEXT,
            added_by    TEXT NOT NULL,
            added_at    TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(guild_id, module, type, target_id)
        );

        -- REF-DB-36
        CREATE TABLE IF NOT EXISTS punishment_ladder (
            id            SERIAL PRIMARY KEY,
            guild_id      TEXT NOT NULL,
            step          INTEGER NOT NULL,
            action        TEXT NOT NULL DEFAULT 'dm',
            duration      INTEGER,
            duration_unit TEXT,
            custom_dm     TEXT,
            reset_after   INTEGER DEFAULT 0,
            UNIQUE(guild_id, step)
        );

        -- REF-DB-37
        CREATE TABLE IF NOT EXISTS punishment_settings (
            guild_id      TEXT PRIMARY KEY,
            reset_on_kick INTEGER DEFAULT 1,
            reset_on_ban  INTEGER DEFAULT 1,
            per_module    INTEGER DEFAULT 0
        );

        -- REF-DB-32
        CREATE TABLE IF NOT EXISTS guilds (
            id    TEXT PRIMARY KEY,
            name  TEXT NOT NULL,
            icon  TEXT
        );

        -- REF-DB-48
        CREATE TABLE IF NOT EXISTS panic_state (
            guild_id          TEXT PRIMARY KEY,
            active            INTEGER DEFAULT 0,
            triggered_by      TEXT,
            triggered_at      TIMESTAMPTZ,
            deactivated_by    TEXT,
            deactivated_at    TIMESTAMPTZ,
            channel_snapshot  TEXT
        );

        -- REF-DB-62
        CREATE TABLE IF NOT EXISTS guild_channels (
            guild_id    TEXT NOT NULL,
            channel_id  TEXT NOT NULL,
            name        TEXT NOT NULL,
            type        INTEGER NOT NULL,
            position    INTEGER DEFAULT 0,
            PRIMARY KEY (guild_id, channel_id)
        );

        -- REF-DB-63
        CREATE TABLE IF NOT EXISTS guild_roles (
            guild_id    TEXT NOT NULL,
            role_id     TEXT NOT NULL,
            name        TEXT NOT NULL,
            color       INTEGER DEFAULT 0,
            position    INTEGER DEFAULT 0,
            PRIMARY KEY (guild_id, role_id)
        );

        -- REF-DB-64
        CREATE TABLE IF NOT EXISTS scheduled_jobs (
            id          SERIAL PRIMARY KEY,
            guild_id    TEXT NOT NULL,
            type        TEXT NOT NULL,
            target_id   TEXT NOT NULL,
            execute_at  TIMESTAMPTZ NOT NULL,
            payload     TEXT,
            done        INTEGER DEFAULT 0,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        );

    `);
}

module.exports = { initSchema };