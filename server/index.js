const express = require('express');
const path = require('path');
const { getDb } = require('./db');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const ideasRoutes = require('./routes/ideas');
const projectsRoutes = require('./routes/projects');
const tasksRoutes = require('./routes/tasks');
const milestonesRoutes = require('./routes/milestones');
const notesRoutes = require('./routes/notes');
const teamRoutes = require('./routes/team');

const app = express();
const PORT = process.env.PORT || 3000;

getDb();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/milestones', milestonesRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/team', teamRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'dengi-babki-crm' });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  💰 Деньги-Бабки CRM запущена`);
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log(`  👤 Админ по умолчанию: admin / admin123\n`);
});
