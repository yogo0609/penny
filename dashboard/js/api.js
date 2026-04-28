// ============================================================
// PENNY DASHBOARD — API CLIENT
// REF-API-01
// ============================================================

const API = (() => {

    // === CONFIG ===
    // REF-API-02
    const BASE_URL = window.PENNY_API_URL || 'http://localhost:4000';

    // === AUTH HEADER ===
    // REF-API-03
    // Uses JWT token from session — no API key in frontend
    const authHeaders = () => ({
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${localStorage.getItem('penny_token') || ''}`,
    });

    // === REQUEST HELPER ===
    // REF-API-04
    async function request(method, path, body = null) {
        try {
            const opts = { method, headers: authHeaders() };
            if (body) opts.body = JSON.stringify(body);
            const res  = await fetch(`${BASE_URL}${path}`, opts);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            return { ok: true, data };
        } catch (err) {
            console.error(`[API] ${method} ${path} —`, err.message);
            return { ok: false, error: err.message };
        }
    }

    // === CONFIG ROUTES ===
    // REF-API-05
    const config = {
        get:        (guildId)             => request('GET',   `/api/config/${guildId}`),
        update:     (guildId, key, value) => request('PATCH', `/api/config/${guildId}`, { key, value }),
        bulkUpdate: (guildId, updates)    => request('PUT',   `/api/config/${guildId}`, updates),
    };

    // === EXEMPTION ROUTES ===
    // REF-API-06
    const exemptions = {
        get:    (guildId)                  => request('GET',    `/api/exemptions/${guildId}`),
        add:    (guildId, type, target_id) => request('POST',   `/api/exemptions/${guildId}`, { type, target_id, added_by: 'dashboard' }),
        remove: (guildId, type, target_id) => request('DELETE', `/api/exemptions/${guildId}`, { type, target_id }),
    };

    // === LOG ROUTES ===
    // REF-API-07
    const logs = {
        get: (guildId, limit = 50) => request('GET', `/api/logs/${guildId}?limit=${limit}`),
    };

    // === WARNING ROUTES ===
    // REF-API-08
    const warnings = {
        get: (guildId, userId)                       => request('GET',  `/api/warnings/${guildId}/${userId}`),
        add: (guildId, user_id, user_tag, reason)    => request('POST', `/api/warnings/${guildId}`, { user_id, user_tag, reason, issued_by: 'dashboard' }),
    };

    // === HEALTH ===
    // REF-API-09
    const health = () => request('GET', '/api/health');

    return { config, exemptions, logs, warnings, health };

})();
