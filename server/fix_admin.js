require('dotenv').config();
const pool = require('./src/db/connection');

pool.query("UPDATE users SET is_active = true WHERE username = 'annc19324'")
  .then(r => {
    console.log('✅ Admin account re-activated! Rows updated:', r.rowCount);
    return pool.query("SELECT id, username, is_active, role FROM users WHERE username = 'annc19324'");
  })
  .then(r => {
    console.log('Account status:', r.rows[0]);
    pool.end();
  })
  .catch(e => {
    console.error('Error:', e.message);
    pool.end();
  });
