const jwt = require('jsonwebtoken');
const { getDb, userPublic } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dengi-babki-secret-change-in-production';

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = getDb().prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.userId);
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
    req.user = userPublic(user);
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

function adminRequired(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ только для администратора' });
  }
  next();
}

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { authRequired, adminRequired, signToken, JWT_SECRET };
