// === DEPENDENCIES ===
const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const router  = express.Router();
const db      = require('./database');


// === CONSTANTS ===
// REF-AUTH-01
const SALT_ROUNDS  = 12;
const TOKEN_EXPIRY = '24h';
const JWT_SECRET   = process.env.JWT_SECRET;


// === MIDDLEWARE: VERIFY TOKEN ===
// REF-AUTH-02
function verifyToken(req, res, next) {
    const auth  = req.headers['authorization'];
    const token = auth && auth.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user      = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}


// === MIDDLEWARE: REQUIRE OWNER ===
// REF-AUTH-03
function requireOwner(req, res, next) {
    if (req.user?.role !== 'owner') {
        return res.status(403).json({ error: 'Owner access required' });
    }
    next();
}


// === SETUP CHECK ===
// REF-AUTH-04
// Returns whether a Platform Owner exists yet
router.get('/setup/status', (req, res) => {
    res.json({ setupRequired: !db.hasOwner() });
});


// === INITIAL SETUP ===
// REF-AUTH-05
// Creates the first Platform Owner — only works if no owner exists yet
router.post('/setup', async (req, res) => {
    if (db.hasOwner()) {
        return res.status(403).json({ error: 'Setup already complete' });
    }

    const { username, password, discord_id } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        db.createUser(username, hashed, 'owner', discord_id || null);
        res.json({ success: true, message: 'Platform Owner created' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create owner' });
    }
});


// === LOGIN ===
// REF-AUTH-06
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.getUserByUsername(username);

    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    db.updateLastLogin(user.id);

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );

    res.json({
        token,
        user: {
            id:         user.id,
            username:   user.username,
            role:       user.role,
            discord_id: user.discord_id,
        }
    });
});


// === GET CURRENT USER ===
// REF-AUTH-07
router.get('/me', verifyToken, (req, res) => {
    const user = db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
        id:         user.id,
        username:   user.username,
        role:       user.role,
        discord_id: user.discord_id,
        last_login: user.last_login,
    });
});


// === GET ALL USERS (owner only) ===
// REF-AUTH-08
router.get('/users', verifyToken, requireOwner, (req, res) => {
    res.json(db.getAllUsers());
});


// === CREATE ADMIN USER (owner only) ===
// REF-AUTH-09
router.post('/users', verifyToken, requireOwner, async (req, res) => {
    const { username, password, discord_id } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        db.createUser(username, hashed, 'admin', discord_id || null);
        res.json({ success: true });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});


// === UPDATE USER ROLE (owner only) ===
// REF-AUTH-10
router.patch('/users/:id/role', verifyToken, requireOwner, (req, res) => {
    const { id }   = req.params;
    const { role } = req.body;

    if (!['owner', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Role must be owner or admin' });
    }

    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot change your own role' });
    }

    db.updateUserRole(parseInt(id), role);
    res.json({ success: true });
});


// === DELETE USER (owner only) ===
// REF-AUTH-11
router.delete('/users/:id', verifyToken, requireOwner, (req, res) => {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    db.deleteUser(parseInt(id));
    res.json({ success: true });
});


// === EXPORTS ===
module.exports = { router, verifyToken, requireOwner };
