// === DEPENDENCIES ===
const express = require('express');
const cors    = require('cors');
require('dotenv').config();


// === APP SETUP ===
const app    = express();
const PORT   = process.env.PORT || 3001;


// === MIDDLEWARE ===
// REF-SRV-01
app.use(cors());
app.use(express.json());


// === ROUTES ===
// REF-SRV-02
app.use('/api', require('./routes'));
app.use('/auth', require('./auth').router);

// REF-SRV-05 — Dynamic client config
app.get('/client-config.js', (req, res) => {
    const apiUrl = process.env.PUBLIC_API_URL || `http://localhost:${PORT}`;
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`window.PENNY_API_URL = '${apiUrl}';`);
});

// === 404 HANDLER ===
// REF-SRV-03
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});


// === ERROR HANDLER ===
// REF-SRV-04
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
});


// === START ===
const db = require('./database');
db.initSchema()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`✅ Penny API running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error(`❌ Failed to initialize database: ${err.message}`);
        process.exit(1);
    });
