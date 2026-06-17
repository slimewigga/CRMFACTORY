const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, userPublic } = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, adminRequired);

router.get('/stats', (req, res) => {
  const db = getDb();
  res.json({
    users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    activeUsers: db.prepare('SELECT COUNT(*) as c FROM users WHERE is_active = 1').get().c,
    ideas: db.prepare('SELECT COUNT(*) as c FROM ideas WHERE archived = 0').get().c,
    projects: db.prepare('SELECT COUNT(*) as c FROM projects').get().c,
    tasks: db.prepare('SELECT COUNT(*) as c FROM tasks').get().c,
    tasksDone: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'done'").get().c,
    notes: db.prepare('SELECT COUNT(*) as c FROM notes').get().c,
    milestones: db.prepare('SELECT COUNT(*) as c FROM milestones').get().c
  });
});

router.get('/users', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  res.json({ users: rows.map(userPublic) });
});

router.put('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const { displayName, role, emoji, color, isActive } = req.body;
  const db = getDb();

  if (id === req.user.id && role && role !== 'admin') {
    return res.status(400).json({ error: 'Нельзя снять с себя роль админа' });
  }

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'Пользователь не найден' });

  db.prepare(`
    UPDATE users SET display_name = ?, role = ?, emoji = ?, color = ?, is_active = ? WHERE id = ?
  `).run(
    displayName?.trim() || target.display_name,
    role || target.role,
    emoji || target.emoji,
    color || target.color,
    isActive !== undefined ? (isActive ? 1 : 0) : target.is_active,
    id
  );

  res.json({ user: userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
});

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Нельзя удалить себя' });

  const db = getDb();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (!result.changes) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ ok: true });
});

router.post('/users/:id/reset-password', (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  if (!result.changes) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ ok: true });
});

module.exports = router;
