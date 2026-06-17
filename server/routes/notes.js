const express = require('express');
const { getDb } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function mapNote(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    authorId: row.author_id,
    createdAt: row.created_at
  };
}

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM notes ORDER BY created_at DESC').all();
  res.json({ notes: rows.map(mapNote) });
});

router.post('/', (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Введите заголовок' });

  const result = getDb().prepare(`
    INSERT INTO notes (title, content, author_id) VALUES (?, ?, ?)
  `).run(title.trim(), content || '', req.user.id);

  res.status(201).json({ note: mapNote(getDb().prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid)) });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Не найдено' });

  const { title, content } = req.body;
  getDb().prepare('UPDATE notes SET title = ?, content = ? WHERE id = ?').run(
    title?.trim() || existing.title,
    content ?? existing.content,
    id
  );

  res.json({ note: mapNote(getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id)) });
});

router.delete('/:id', (req, res) => {
  const result = getDb().prepare('DELETE FROM notes WHERE id = ?').run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: 'Не найдено' });
  res.json({ ok: true });
});

module.exports = router;
