const express = require('express');
const { getDb } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function mapMilestone(row) {
  return { id: row.id, title: row.title, description: row.description, date: row.date, done: !!row.done };
}

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM milestones ORDER BY date ASC').all();
  res.json({ milestones: rows.map(mapMilestone) });
});

router.post('/', (req, res) => {
  const { title, description, date } = req.body;
  if (!title?.trim() || !date) return res.status(400).json({ error: 'Заполните название и дату' });

  const result = getDb().prepare(`
    INSERT INTO milestones (title, description, date) VALUES (?, ?, ?)
  `).run(title.trim(), description || '', date);

  res.status(201).json({ milestone: mapMilestone(getDb().prepare('SELECT * FROM milestones WHERE id = ?').get(result.lastInsertRowid)) });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = getDb().prepare('SELECT * FROM milestones WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Не найдено' });

  const { title, description, date, done } = req.body;
  getDb().prepare(`
    UPDATE milestones SET title = ?, description = ?, date = ?, done = ? WHERE id = ?
  `).run(
    title?.trim() || existing.title,
    description ?? existing.description,
    date || existing.date,
    done !== undefined ? (done ? 1 : 0) : existing.done,
    id
  );

  res.json({ milestone: mapMilestone(getDb().prepare('SELECT * FROM milestones WHERE id = ?').get(id)) });
});

router.delete('/:id', (req, res) => {
  const result = getDb().prepare('DELETE FROM milestones WHERE id = ?').run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: 'Не найдено' });
  res.json({ ok: true });
});

module.exports = router;
