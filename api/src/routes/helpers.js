function badRequest(res, message) {
    return res.status(400).json({ error: message });
}

function requireFields(obj, fields) {
    return fields.filter(f => obj[f] === undefined);
}

function requireBodyFields(req, res, fields) {
    const missing = requireFields(req.body, fields);
    if (missing.length) return badRequest(res, `${missing.join(', ')} required`);
    return null;
}

function requireArrayField(req, res, field) {
    if (!Array.isArray(req.body[field])) {
        return badRequest(res, `${field} array required`);
    }
    return null;
}

function validateType(res, type, allowed) {
    if (!allowed.includes(type)) return badRequest(res, `type must be ${allowed.join(', ')}`);
    return null;
}

function jsonOk(res, payload = { success: true }) {
    return res.json(payload);
}

module.exports = { badRequest, requireFields, requireBodyFields, requireArrayField, validateType, jsonOk };