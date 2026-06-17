const KANBAN_COLUMNS = [
  { id: 'todo', title: '📋 К выполнению' },
  { id: 'inprogress', title: '🔨 В работе' },
  { id: 'review', title: '👀 На проверке' },
  { id: 'done', title: '✅ Готово' }
];

let state = {
  user: null,
  members: [],
  mission: '',
  ideas: [],
  projects: [],
  tasks: [],
  milestones: [],
  notes: []
};

let currentIdeaFilter = 'all';
let draggedTaskId = null;

if (!api.requireAuth()) throw new Error('auth');

init();

async function init() {
  state.user = api.getUser();
  setupUI();
  setupNav();
  setupMobile();
  document.getElementById('logoutBtn').addEventListener('click', () => api.logout());
  await loadAll();
}

function setupUI() {
  if (state.user?.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }

  document.getElementById('userCard').innerHTML = `
    <div class="user-card-inner">
      <span class="avatar" style="background:${state.user.color}">${state.user.emoji}</span>
      <div>
        <div class="user-name">${escapeHtml(state.user.displayName)}</div>
        <div class="user-role">${state.user.role === 'admin' ? 'Админ' : 'Участник'}</div>
      </div>
    </div>`;

  document.getElementById('mobileUser').innerHTML =
    `<span class="avatar sm" style="background:${state.user.color}">${state.user.emoji}</span>`;
}

function setupNav() {
  const switchView = view => {
    document.querySelectorAll('.nav-item[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
    closeSidebar();
  };

  document.querySelectorAll('.nav-item[data-view], .bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

function setupMobile() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  document.getElementById('menuToggle').addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('active');
  });
  overlay.addEventListener('click', closeSidebar);
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

async function loadAll() {
  try {
    const [team, ideas, projects, tasks, milestones, notes] = await Promise.all([
      api.get('/team'),
      api.get('/ideas'),
      api.get('/projects'),
      api.get('/tasks'),
      api.get('/milestones'),
      api.get('/notes')
    ]);
    state.members = team.members;
    state.mission = team.mission;
    state.ideas = ideas.ideas;
    state.projects = projects.projects;
    state.tasks = tasks.tasks;
    state.milestones = milestones.milestones;
    state.notes = notes.notes;
    renderAll();
  } catch (e) {
    ui.error('Ошибка загрузки: ' + e.message);
  }
}

function getMember(id) {
  return state.members.find(m => m.id === id);
}

function openModal(title, bodyHtml, footerHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

function renderAll() {
  renderDashboard();
  renderIdeas();
  renderProjects();
  renderKanban();
  renderTimeline();
  renderNotes();
  renderTeam();
}

function renderDashboard() {
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  document.getElementById('statIdeas').textContent = state.ideas.filter(i => !i.archived).length;
  document.getElementById('statProjects').textContent = state.projects.length;
  document.getElementById('statTasks').textContent = state.tasks.filter(t => t.status !== 'done').length;
  document.getElementById('statDone').textContent = state.tasks.filter(t => t.status === 'done').length;

  const hot = state.ideas.filter(i => i.hot && !i.archived).slice(0, 5);
  document.getElementById('dashHotIdeas').innerHTML = hot.length
    ? hot.map(i => `<div class="dash-item">🔥 ${escapeHtml(i.title)}</div>`).join('')
    : '<div class="dash-item empty">Пока нет горячих идей</div>';

  const upcoming = state.tasks.filter(t => t.status !== 'done').slice(0, 5);
  document.getElementById('dashUpcomingTasks').innerHTML = upcoming.length
    ? upcoming.map(t => {
        const m = getMember(t.assigneeId);
        return `<div class="dash-item">${m ? m.emoji : '👤'} ${escapeHtml(t.title)}</div>`;
      }).join('')
    : '<div class="dash-item empty">Все задачи выполнены 🎉</div>';

  document.getElementById('dashProjectProgress').innerHTML = state.projects.length
    ? state.projects.map(p => {
        const pts = state.tasks.filter(t => t.projectId === p.id);
        const done = pts.filter(t => t.status === 'done').length;
        const pct = pts.length ? Math.round((done / pts.length) * 100) : 0;
        return `<div class="progress-item"><div class="progress-header"><span>${escapeHtml(p.name)}</span><span>${pct}%</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
      }).join('')
    : '<div class="dash-item empty">Создайте первый проект</div>';

  document.getElementById('sidebarAvatars').innerHTML = state.members.map(m =>
    `<div class="avatar" style="background:${m.color}" title="${escapeHtml(m.displayName)}">${m.emoji}</div>`
  ).join('');
}

function renderIdeas() {
  let ideas = state.ideas;
  if (currentIdeaFilter === 'hot') ideas = ideas.filter(i => i.hot && !i.archived);
  else if (currentIdeaFilter === 'new') ideas = ideas.filter(i => !i.archived).sort((a, b) => b.createdAt - a.createdAt);
  else if (currentIdeaFilter === 'archived') ideas = ideas.filter(i => i.archived);
  else ideas = ideas.filter(i => !i.archived);

  const grid = document.getElementById('ideasGrid');
  if (!ideas.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💡</div><h3>Нет идей</h3><p>Нажмите «+ Новая идея»</p></div>`;
    return;
  }

  grid.innerHTML = ideas.map(idea => {
    const author = getMember(idea.authorId);
    return `<div class="idea-card ${idea.hot ? 'hot' : ''} ${idea.archived ? 'archived' : ''}">
      <div class="idea-header"><span class="idea-title">${escapeHtml(idea.title)}</span>${idea.hot ? '<span class="tag hot">🔥</span>' : ''}</div>
      <p class="idea-desc">${escapeHtml(idea.description)}</p>
      <div class="idea-meta">
        ${idea.tags.map(t => `<span class="tag ai">${escapeHtml(t)}</span>`).join('')}
        ${author ? `<span class="tag">${author.emoji} ${escapeHtml(author.displayName)}</span>` : ''}
      </div>
      <div class="idea-actions">
        <button class="btn btn-sm btn-secondary" data-action="edit-idea" data-id="${idea.id}">✏️</button>
        <button class="btn btn-sm btn-secondary" data-action="toggle-hot" data-id="${idea.id}">${idea.hot ? '❄️' : '🔥'}</button>
        <button class="btn btn-sm btn-secondary" data-action="idea-project" data-id="${idea.id}">🚀</button>
        <button class="btn btn-sm btn-danger" data-action="archive-idea" data-id="${idea.id}">${idea.archived ? '↩️' : '📦'}</button>
      </div>
    </div>`;
  }).join('');
}

document.querySelectorAll('[data-idea-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-idea-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentIdeaFilter = btn.dataset.ideaFilter;
    renderIdeas();
  });
});

document.getElementById('ideasGrid').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const idea = state.ideas.find(i => i.id === id);
  if (!idea) return;

  if (btn.dataset.action === 'edit-idea') showIdeaForm(idea);
  else if (btn.dataset.action === 'toggle-hot') {
    await api.put(`/ideas/${id}`, { ...idea, hot: !idea.hot });
    await loadAll();
  } else if (btn.dataset.action === 'archive-idea') {
    await api.put(`/ideas/${id}`, { ...idea, archived: !idea.archived });
    await loadAll();
  } else if (btn.dataset.action === 'idea-project') {
    await api.post('/projects', { name: idea.title, description: idea.description, status: 'planning' });
    await api.put(`/ideas/${id}`, { ...idea, archived: true });
    await loadAll();
    ui.success(`Идея «${idea.title}» превращена в проект! 🚀`);
  }
});

document.getElementById('addIdeaBtn').addEventListener('click', () => showIdeaForm());

function showIdeaForm(idea = null) {
  const isEdit = !!idea;
  const opts = state.members.map(m =>
    `<option value="${m.id}" ${idea?.authorId === m.id ? 'selected' : ''}>${escapeHtml(m.displayName)}</option>`
  ).join('');

  openModal(isEdit ? 'Редактировать идею' : 'Новая идея', `
    <div class="form-group"><label>Название</label><input class="form-input" id="fIdeaTitle" value="${idea ? escapeHtml(idea.title) : ''}"></div>
    <div class="form-group"><label>Описание</label><textarea class="form-textarea" id="fIdeaDesc">${idea ? escapeHtml(idea.description) : ''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Теги</label><input class="form-input" id="fIdeaTags" value="${idea ? idea.tags.join(', ') : 'AI'}"></div>
      <div class="form-group"><label>Автор</label><select class="form-select" id="fIdeaAuthor">${opts}</select></div>
    </div>
    <label class="checkbox-label"><input type="checkbox" id="fIdeaHot" ${idea?.hot ? 'checked' : ''}> 🔥 Горячая</label>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" id="saveIdeaBtn">${isEdit ? 'Сохранить' : 'Добавить'}</button>`);

  document.getElementById('saveIdeaBtn').onclick = async () => {
    const title = document.getElementById('fIdeaTitle').value.trim();
    if (!title) return ui.warning('Введите название');
    const payload = {
      title,
      description: document.getElementById('fIdeaDesc').value.trim(),
      tags: document.getElementById('fIdeaTags').value.split(',').map(t => t.trim()).filter(Boolean),
      authorId: Number(document.getElementById('fIdeaAuthor').value),
      hot: document.getElementById('fIdeaHot').checked
    };
    if (isEdit) await api.put(`/ideas/${idea.id}`, { ...idea, ...payload });
    else await api.post('/ideas', payload);
    closeModal();
    await loadAll();
  };
}

function renderProjects() {
  const grid = document.getElementById('projectsGrid');
  if (!state.projects.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🚀</div><h3>Нет проектов</h3></div>`;
    return;
  }
  const labels = { active: 'Активный', planning: 'Планирование', done: 'Завершён', paused: 'На паузе' };
  grid.innerHTML = state.projects.map(p => {
    const pts = state.tasks.filter(t => t.projectId === p.id);
    const done = pts.filter(t => t.status === 'done').length;
    const pct = pts.length ? Math.round((done / pts.length) * 100) : 0;
    return `<div class="project-card">
      <span class="project-status status-${p.status}">${labels[p.status] || p.status}</span>
      <div class="project-name">${escapeHtml(p.name)}</div>
      <p class="project-desc">${escapeHtml(p.description || '')}</p>
      <div class="progress-bar" style="margin-bottom:12px"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="card-actions">
        <button class="btn btn-sm btn-secondary" data-action="edit-project" data-id="${p.id}">✏️</button>
        <button class="btn btn-sm btn-danger" data-action="delete-project" data-id="${p.id}">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

document.getElementById('projectsGrid').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const project = state.projects.find(p => p.id === id);
  if (btn.dataset.action === 'edit-project') showProjectForm(project);
  else if (btn.dataset.action === 'delete-project') {
    const ok = await ui.confirm({ title: 'Удалить проект?', message: 'Проект и связь с задачами будут удалены.', danger: true, confirmText: 'Удалить' });
    if (ok) {
      await api.delete(`/projects/${id}`);
      await loadAll();
      ui.success('Проект удалён');
    }
  }
});

document.getElementById('addProjectBtn').addEventListener('click', () => showProjectForm());

function showProjectForm(project = null) {
  const isEdit = !!project;
  openModal(isEdit ? 'Редактировать проект' : 'Новый проект', `
    <div class="form-group"><label>Название</label><input class="form-input" id="fProjName" value="${project ? escapeHtml(project.name) : ''}"></div>
    <div class="form-group"><label>Описание</label><textarea class="form-textarea" id="fProjDesc">${project ? escapeHtml(project.description || '') : ''}</textarea></div>
    <div class="form-group"><label>Статус</label><select class="form-select" id="fProjStatus">
      <option value="planning" ${project?.status === 'planning' ? 'selected' : ''}>Планирование</option>
      <option value="active" ${project?.status === 'active' ? 'selected' : ''}>Активный</option>
      <option value="paused" ${project?.status === 'paused' ? 'selected' : ''}>На паузе</option>
      <option value="done" ${project?.status === 'done' ? 'selected' : ''}>Завершён</option>
    </select></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" id="saveProjBtn">${isEdit ? 'Сохранить' : 'Создать'}</button>`);

  document.getElementById('saveProjBtn').onclick = async () => {
    const name = document.getElementById('fProjName').value.trim();
    if (!name) return ui.warning('Введите название');
    const payload = { name, description: document.getElementById('fProjDesc').value.trim(), status: document.getElementById('fProjStatus').value };
    if (isEdit) await api.put(`/projects/${project.id}`, { ...project, ...payload });
    else await api.post('/projects', payload);
    closeModal();
    await loadAll();
  };
}

function renderKanban() {
  document.getElementById('kanbanBoard').innerHTML = KANBAN_COLUMNS.map(col => {
    const tasks = state.tasks.filter(t => t.status === col.id);
    return `<div class="kanban-column" data-status="${col.id}">
      <div class="column-header"><span class="column-title">${col.title}</span><span class="column-count">${tasks.length}</span></div>
      ${tasks.map(t => renderTaskCard(t)).join('')}
    </div>`;
  }).join('');

  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dragstart', e => { draggedTaskId = Number(card.dataset.id); card.classList.add('dragging'); });
    card.addEventListener('dragend', e => { card.classList.remove('dragging'); draggedTaskId = null; });
    card.addEventListener('click', e => {
      if (e.target.closest('.task-card')) showTaskForm(state.tasks.find(t => t.id === Number(card.dataset.id)));
    });
  });

  document.querySelectorAll('.kanban-column').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', async e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const task = state.tasks.find(t => t.id === draggedTaskId);
      if (task) {
        await api.put(`/tasks/${task.id}`, { ...task, status: col.dataset.status });
        await loadAll();
      }
    });
  });
}

function renderTaskCard(task) {
  const member = getMember(task.assigneeId);
  const project = state.projects.find(p => p.id === task.projectId);
  return `<div class="task-card priority-${task.priority}" draggable="true" data-id="${task.id}">
    <div class="task-title">${escapeHtml(task.title)}</div>
    ${project ? `<span class="tag">${escapeHtml(project.name)}</span>` : ''}
    <div class="task-footer"><span class="priority-dot"></span><span>${member ? member.emoji : '👤'}</span></div>
  </div>`;
}

document.getElementById('addTaskBtn').addEventListener('click', () => showTaskForm());

function showTaskForm(task = null) {
  const isEdit = !!task;
  const memOpts = state.members.map(m => `<option value="${m.id}" ${task?.assigneeId === m.id ? 'selected' : ''}>${escapeHtml(m.displayName)}</option>`).join('');
  const projOpts = `<option value="">— Без проекта —</option>` + state.projects.map(p =>
    `<option value="${p.id}" ${task?.projectId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
  ).join('');

  openModal(isEdit ? 'Редактировать задачу' : 'Новая задача', `
    <div class="form-group"><label>Название</label><input class="form-input" id="fTaskTitle" value="${task ? escapeHtml(task.title) : ''}"></div>
    <div class="form-group"><label>Описание</label><textarea class="form-textarea" id="fTaskDesc">${task ? escapeHtml(task.description || '') : ''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Исполнитель</label><select class="form-select" id="fTaskAssignee">${memOpts}</select></div>
      <div class="form-group"><label>Приоритет</label><select class="form-select" id="fTaskPriority">
        <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Низкий</option>
        <option value="medium" ${task?.priority === 'medium' ? 'selected' : ''}>Средний</option>
        <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>Высокий</option>
      </select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Проект</label><select class="form-select" id="fTaskProject">${projOpts}</select></div>
      <div class="form-group"><label>Статус</label><select class="form-select" id="fTaskStatus">
        ${KANBAN_COLUMNS.map(c => `<option value="${c.id}" ${task?.status === c.id ? 'selected' : ''}>${c.title}</option>`).join('')}
      </select></div>
    </div>
  `, `${isEdit ? '<button class="btn btn-danger" id="deleteTaskBtn">Удалить</button>' : ''}<button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" id="saveTaskBtn">${isEdit ? 'Сохранить' : 'Создать'}</button>`);

  document.getElementById('saveTaskBtn').onclick = async () => {
    const title = document.getElementById('fTaskTitle').value.trim();
    if (!title) return ui.warning('Введите название');
    const projVal = document.getElementById('fTaskProject').value;
    const payload = {
      title,
      description: document.getElementById('fTaskDesc').value.trim(),
      assigneeId: Number(document.getElementById('fTaskAssignee').value),
      priority: document.getElementById('fTaskPriority').value,
      projectId: projVal ? Number(projVal) : null,
      status: document.getElementById('fTaskStatus').value
    };
    if (isEdit) await api.put(`/tasks/${task.id}`, { ...task, ...payload });
    else await api.post('/tasks', payload);
    closeModal();
    await loadAll();
  };

  if (isEdit) {
    document.getElementById('deleteTaskBtn').onclick = async () => {
      const ok = await ui.confirm({ title: 'Удалить задачу?', message: 'Это действие нельзя отменить.', danger: true, confirmText: 'Удалить' });
      if (!ok) return;
      await api.delete(`/tasks/${task.id}`);
      closeModal();
      await loadAll();
      ui.success('Задача удалена');
    };
  }
}

function renderTimeline() {
  const timeline = document.getElementById('timeline');
  const sorted = [...state.milestones].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!sorted.length) {
    timeline.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📅</div><h3>План пуст</h3></div>`;
    return;
  }
  timeline.innerHTML = sorted.map(ms => `
    <div class="milestone ${ms.done ? 'done' : ''}">
      <div class="milestone-date">${formatLongDate(ms.date)}</div>
      <div class="milestone-title">${ms.done ? '✅ ' : ''}${escapeHtml(ms.title)}</div>
      <p class="milestone-desc">${escapeHtml(ms.description || '')}</p>
      <div class="milestone-actions">
        <button class="btn btn-sm btn-secondary" data-action="toggle-ms" data-id="${ms.id}">${ms.done ? '↩️' : '✅'}</button>
        <button class="btn btn-sm btn-secondary" data-action="edit-ms" data-id="${ms.id}">✏️</button>
        <button class="btn btn-sm btn-danger" data-action="delete-ms" data-id="${ms.id}">🗑️</button>
      </div>
    </div>`).join('');
}

document.getElementById('timeline').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const ms = state.milestones.find(m => m.id === id);
  if (btn.dataset.action === 'toggle-ms') { await api.put(`/milestones/${id}`, { ...ms, done: !ms.done }); await loadAll(); }
  else if (btn.dataset.action === 'edit-ms') showMilestoneForm(ms);
  else if (btn.dataset.action === 'delete-ms') {
    const ok = await ui.confirm({ title: 'Удалить этап?', message: 'Этап будет удалён из плана.', danger: true, confirmText: 'Удалить' });
    if (ok) {
      await api.delete(`/milestones/${id}`);
      await loadAll();
      ui.success('Этап удалён');
    }
  }
});

document.getElementById('addMilestoneBtn').addEventListener('click', () => showMilestoneForm());

function showMilestoneForm(ms = null) {
  const isEdit = !!ms;
  openModal(isEdit ? 'Редактировать этап' : 'Новый этап', `
    <div class="form-group"><label>Название</label><input class="form-input" id="fMsTitle" value="${ms ? escapeHtml(ms.title) : ''}"></div>
    <div class="form-group"><label>Описание</label><textarea class="form-textarea" id="fMsDesc">${ms ? escapeHtml(ms.description || '') : ''}</textarea></div>
    <div class="form-group"><label>Дата</label><input class="form-input" type="date" id="fMsDate" value="${ms ? ms.date : new Date().toISOString().split('T')[0]}"></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" id="saveMsBtn">${isEdit ? 'Сохранить' : 'Добавить'}</button>`);

  document.getElementById('saveMsBtn').onclick = async () => {
    const title = document.getElementById('fMsTitle').value.trim();
    if (!title) return ui.warning('Введите название');
    const payload = { title, description: document.getElementById('fMsDesc').value.trim(), date: document.getElementById('fMsDate').value };
    if (isEdit) await api.put(`/milestones/${ms.id}`, { ...ms, ...payload });
    else await api.post('/milestones', payload);
    closeModal();
    await loadAll();
  };
}

function renderNotes() {
  const grid = document.getElementById('notesGrid');
  if (!state.notes.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📝</div><h3>Нет заметок</h3></div>`;
    return;
  }
  grid.innerHTML = state.notes.map(n => `
    <div class="note-card" data-action="edit-note" data-id="${n.id}">
      <div class="note-title">${escapeHtml(n.title)}</div>
      <div class="note-content">${escapeHtml(n.content)}</div>
      <div class="note-date">${formatDate(n.createdAt)}</div>
    </div>`).join('');
}

document.getElementById('notesGrid').addEventListener('click', e => {
  const card = e.target.closest('[data-action="edit-note"]');
  if (card) showNoteForm(state.notes.find(n => n.id === Number(card.dataset.id)));
});

document.getElementById('addNoteBtn').addEventListener('click', () => showNoteForm());

function showNoteForm(note = null) {
  const isEdit = !!note;
  openModal(isEdit ? 'Редактировать заметку' : 'Новая заметка', `
    <div class="form-group"><label>Заголовок</label><input class="form-input" id="fNoteTitle" value="${note ? escapeHtml(note.title) : ''}"></div>
    <div class="form-group"><label>Содержание</label><textarea class="form-textarea" id="fNoteContent" style="min-height:160px">${note ? escapeHtml(note.content) : ''}</textarea></div>
  `, `${isEdit ? '<button class="btn btn-danger" id="deleteNoteBtn">Удалить</button>' : ''}<button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" id="saveNoteBtn">${isEdit ? 'Сохранить' : 'Создать'}</button>`);

  document.getElementById('saveNoteBtn').onclick = async () => {
    const title = document.getElementById('fNoteTitle').value.trim();
    if (!title) return ui.warning('Введите заголовок');
    const payload = { title, content: document.getElementById('fNoteContent').value.trim() };
    if (isEdit) await api.put(`/notes/${note.id}`, { ...note, ...payload });
    else await api.post('/notes', payload);
    closeModal();
    await loadAll();
  };

  if (isEdit) {
    document.getElementById('deleteNoteBtn').onclick = async () => {
      const ok = await ui.confirm({ title: 'Удалить заметку?', danger: true, confirmText: 'Удалить' });
      if (!ok) return;
      await api.delete(`/notes/${note.id}`);
      closeModal();
      await loadAll();
      ui.success('Заметка удалена');
    };
  }
}

function renderTeam() {
  document.getElementById('teamGrid').innerHTML = state.members.map(m => {
    const tasks = state.tasks.filter(t => t.assigneeId === m.id);
    const done = tasks.filter(t => t.status === 'done').length;
    const ideas = state.ideas.filter(i => i.authorId === m.id && !i.archived).length;
    const isMe = m.id === state.user.id;
    return `<div class="member-card">
      <div class="member-avatar" style="background:${m.color}">${m.emoji}</div>
      <div class="member-name">${escapeHtml(m.displayName)}</div>
      <div class="member-role">${escapeHtml(m.role === 'admin' ? 'Админ' : 'Участник')}</div>
      <div class="member-stats">
        <div class="member-stat"><div class="member-stat-value">${tasks.length}</div><div class="member-stat-label">Задач</div></div>
        <div class="member-stat"><div class="member-stat-value">${done}</div><div class="member-stat-label">Готово</div></div>
        <div class="member-stat"><div class="member-stat-value">${ideas}</div><div class="member-stat-label">Идей</div></div>
      </div>
      ${isMe ? `<button class="btn btn-sm btn-secondary" style="margin-top:16px" data-action="edit-profile">✏️ Мой профиль</button>` : ''}
    </div>`;
  }).join('');

  document.getElementById('missionText').value = state.mission || '';
}

document.getElementById('teamGrid').addEventListener('click', e => {
  if (e.target.closest('[data-action="edit-profile"]')) showProfileForm();
});

document.getElementById('saveMissionBtn').addEventListener('click', async () => {
  await api.put('/team/mission', { mission: document.getElementById('missionText').value.trim() });
  ui.success('Миссия сохранена! 🎯');
  await loadAll();
});

function showProfileForm() {
  openModal('Мой профиль', `
    <div class="form-group"><label>Имя</label><input class="form-input" id="fMemName" value="${escapeHtml(state.user.displayName)}"></div>
    <div class="form-row">
      <div class="form-group"><label>Эмодзи</label><input class="form-input" id="fMemEmoji" value="${state.user.emoji}" maxlength="4"></div>
      <div class="form-group"><label>Цвет</label><input class="form-input" type="color" id="fMemColor" value="${state.user.color}"></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" id="saveMemBtn">Сохранить</button>`);

  document.getElementById('saveMemBtn').onclick = async () => {
    const data = await api.put('/auth/profile', {
      displayName: document.getElementById('fMemName').value.trim(),
      emoji: document.getElementById('fMemEmoji').value,
      color: document.getElementById('fMemColor').value
    });
    api.saveSession(localStorage.getItem('dbcrm_token'), data.user);
    state.user = data.user;
    setupUI();
    closeModal();
    await loadAll();
  };
}

window.closeModal = closeModal;
