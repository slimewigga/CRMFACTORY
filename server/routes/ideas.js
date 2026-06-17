const express = require('express');
const { getDb, parseJson } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function mapIdea(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: parseJson(row.tags),
    hot: !!row.hot,
    archived: !!row.archived,
    authorId: row.author_id,
    createdAt: row.created_at
  };
}

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM ideas ORDER BY created_at DESC').all();
  res.json({ ideas: rows.map(mapIdea) });
});

router.post('/', (req, res) => {
  const { title, description, tags, hot, authorId } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Введите название' });

  const result = getDb().prepare(`
    INSERT INTO ideas (title, description, tags, hot, author_id) VALUES (?, ?, ?, ?, ?)
  `).run(title.trim(), description || '', JSON.stringify(tags || []), hot ? 1 : 0, authorId || req.user.id);

  const row = getDb().prepare('SELECT * FROM ideas WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ idea: mapIdea(row) });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = getDb().prepare('SELECT * FROM ideas WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Не найдено' });

  const { title, description, tags, hot, archived, authorId } = req.body;
  getDb().prepare(`
    UPDATE ideas SET title = ?, description = ?, tags = ?, hot = ?, archived = ?, author_id = ? WHERE id = ?
  `).run(
    title?.trim() || existing.title,
    description ?? existing.description,
    JSON.stringify(tags ?? parseJson(existing.tags)),
    hot !== undefined ? (hot ? 1 : 0) : existing.hot,
    archived !== undefined ? (archived ? 1 : 0) : existing.archived,
    authorId ?? existing.author_id,
    id
  );

  res.json({ idea: mapIdea(getDb().prepare('SELECT * FROM ideas WHERE id = ?').get(id)) });
});

router.delete('/:id', (req, res) => {
  const result = getDb().prepare('DELETE FROM ideas WHERE id = ?').run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: 'Не найдено' });
  res.json({ ok: true });
});

module.exports = router;
