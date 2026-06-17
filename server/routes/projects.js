const express = require('express');
const { getDb } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function mapProject(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at
  };
}

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json({ projects: rows.map(mapProject) });
});

router.post('/', (req, res) => {
  const { name, description, status } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Введите название' });

  const result = getDb().prepare(`
    INSERT INTO projects (name, description, status) VALUES (?, ?, ?)
  `).run(name.trim(), description || '', status || 'planning');

  res.status(201).json({ project: mapProject(getDb().prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)) });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Не найдено' });

  const { name, description, status } = req.body;
  getDb().prepare('UPDATE projects SET name = ?, description = ?, status = ? WHERE id = ?').run(
    name?.trim() || existing.name,
    description ?? existing.description,
    status || existing.status,
    id
  );

  res.json({ project: mapProject(getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id)) });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  getDb().prepare('UPDATE tasks SET project_id = NULL WHERE project_id = ?').run(id);
  const result = getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
  if (!result.changes) return res.status(404).json({ error: 'Не найдено' });
  res.json({ ok: true });
});

module.exports = router;
