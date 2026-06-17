const express = require('express');
const { getDb } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function mapTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id,
    projectId: row.project_id,
    createdAt: row.created_at
  };
}

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  res.json({ tasks: rows.map(mapTask) });
});

router.post('/', (req, res) => {
  const { title, description, status, priority, assigneeId, projectId } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Введите название' });

  const result = getDb().prepare(`
    INSERT INTO tasks (title, description, status, priority, assignee_id, project_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(), description || '', status || 'todo', priority || 'medium',
    assigneeId || req.user.id, projectId || null
  );

  res.status(201).json({ task: mapTask(getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)) });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Не найдено' });

  const { title, description, status, priority, assigneeId, projectId } = req.body;
  getDb().prepare(`
    UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, project_id = ? WHERE id = ?
  `).run(
    title?.trim() || existing.title,
    description ?? existing.description,
    status || existing.status,
    priority || existing.priority,
    assigneeId ?? existing.assignee_id,
    projectId !== undefined ? (projectId || null) : existing.project_id,
    id
  );

  res.json({ task: mapTask(getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id)) });
});

router.delete('/:id', (req, res) => {
  const result = getDb().prepare('DELETE FROM tasks WHERE id = ?').run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: 'Не найдено' });
  res.json({ ok: true });
});

module.exports = router;
