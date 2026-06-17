const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, userPublic } = require('../db');
const { authRequired, signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, email, password, displayName } = req.body;
  if (!username?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Заполните все поля. Пароль минимум 6 символов.' });
  }

  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.trim(), email.trim());
  if (exists) return res.status(409).json({ error: 'Пользователь с таким логином или email уже существует' });

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const role = userCount === 0 ? 'admin' : 'member';
  const hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (username, email, password_hash, display_name, role, emoji, color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(username.trim(), email.trim(), hash, (displayName || username).trim(), role, '👤', '#a855f7');

  const user = userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid));
  const token = signToken(user.id);
  res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
  const { login, password } = req.body;
  if (!login?.trim() || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль' });
  }

  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1
  `).get(login.trim(), login.trim());

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const user = userPublic(row);
  const token = signToken(user.id);
  res.json({ token, user });
});

router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

router.put('/profile', authRequired, (req, res) => {
  const { displayName, emoji, color } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE users SET display_name = ?, emoji = ?, color = ? WHERE id = ?
  `).run(
    displayName?.trim() || req.user.displayName,
    emoji || req.user.emoji,
    color || req.user.color,
    req.user.id
  );
  const user = userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id));
  res.json({ user });
});

module.exports = router;
