const { Pool } = require('pg');
require('dotenv').config();

// REF-DB-01
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = { pool };