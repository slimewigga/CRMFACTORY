const express = require('express');
const { getDb, userPublic } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const db = getDb();
  const members = db.prepare('SELECT * FROM users WHERE is_active = 1 ORDER BY created_at ASC').all().map(userPublic);
  const missionRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('mission');
  res.json({ members, mission: missionRow?.value || '' });
});

router.put('/mission', (req, res) => {
  const { mission } = req.body;
  getDb().prepare(`
    INSERT INTO settings (key, value) VALUES ('mission', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(mission || '');
  res.json({ mission });
});

module.exports = router;
