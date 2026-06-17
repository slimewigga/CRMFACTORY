if (!api.requireAuth() || !api.requireAdmin()) throw new Error('admin');

const user = api.getUser();
document.getElementById('adminUserName').textContent = `${user.emoji} ${user.displayName}`;
document.getElementById('adminLogout').addEventListener('click', () => api.logout());

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

function openModal(title, body, footer) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalFooter').innerHTML = footer;
  document.getElementById('modalOverlay').classList.add('active');
}

let users = [];

async function load() {
  const [stats, usersData] = await Promise.all([
    api.get('/admin/stats'),
    api.get('/admin/users')
  ]);
  users = usersData.users;
  renderStats(stats);
  renderUsers();
}

function renderStats(s) {
  document.getElementById('adminStats').innerHTML = `
    <div class="stat-card"><span class="stat-label">Пользователи</span><span class="stat-value">${s.activeUsers}/${s.users}</span></div>
    <div class="stat-card"><span class="stat-label">Идеи</span><span class="stat-value">${s.ideas}</span></div>
    <div class="stat-card"><span class="stat-label">Проекты</span><span class="stat-value">${s.projects}</span></div>
    <div class="stat-card accent"><span class="stat-label">Задачи</span><span class="stat-value">${s.tasksDone}/${s.tasks}</span></div>
  `;
}

function renderUsers() {
  document.getElementById('usersTableBody').innerHTML = users.map(u => `
    <tr class="${u.isActive ? '' : 'inactive-row'}">
      <td><div class="table-user"><span class="avatar sm" style="background:${u.color}">${u.emoji}</span><div><strong>${escapeHtml(u.displayName)}</strong><br><small>@${escapeHtml(u.username)}</small></div></div></td>
      <td>${escapeHtml(u.email)}</td>
      <td><span class="tag ${u.role === 'admin' ? 'hot' : ''}">${u.role === 'admin' ? 'Админ' : 'Участник'}</span></td>
      <td>${u.isActive ? '<span class="tag ai">Активен</span>' : '<span class="tag">Заблокирован</span>'}</td>
      <td class="table-actions">
        <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${u.id}">✏️</button>
        <button class="btn btn-sm btn-secondary" data-action="password" data-id="${u.id}">🔑</button>
        ${u.id !== user.id ? `<button class="btn btn-sm btn-danger" data-action="delete" data-id="${u.id}">🗑️</button>` : ''}
      </td>
    </tr>`).join('');
}

document.getElementById('usersTableBody').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const u = users.find(x => x.id === Number(btn.dataset.id));
  if (btn.dataset.action === 'edit') editUser(u);
  else if (btn.dataset.action === 'password') resetPassword(u);
  else if (btn.dataset.action === 'delete') deleteUser(u);
});

function editUser(u) {
  openModal('Редактировать пользователя', `
    <div class="form-group"><label>Имя</label><input class="form-input" id="fName" value="${escapeHtml(u.displayName)}"></div>
    <div class="form-row">
      <div class="form-group"><label>Роль</label><select class="form-select" id="fRole">
        <option value="member" ${u.role === 'member' ? 'selected' : ''}>Участник</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Админ</option>
      </select></div>
      <div class="form-group"><label>Статус</label><select class="form-select" id="fActive">
        <option value="1" ${u.isActive ? 'selected' : ''}>Активен</option>
        <option value="0" ${!u.isActive ? 'selected' : ''}>Заблокирован</option>
      </select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Эмодзи</label><input class="form-input" id="fEmoji" value="${u.emoji}"></div>
      <div class="form-group"><label>Цвет</label><input class="form-input" type="color" id="fColor" value="${u.color}"></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" id="saveUser">Сохранить</button>`);

  document.getElementById('saveUser').onclick = async () => {
    await api.put(`/admin/users/${u.id}`, {
      displayName: document.getElementById('fName').value.trim(),
      role: document.getElementById('fRole').value,
      isActive: document.getElementById('fActive').value === '1',
      emoji: document.getElementById('fEmoji').value,
      color: document.getElementById('fColor').value
    });
    closeModal();
    await load();
  };
}

function resetPassword(u) {
  openModal(`Сброс пароля: ${u.displayName}`, `
    <div class="form-group"><label>Новый пароль</label><input class="form-input" type="password" id="fPass" minlength="6"></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" id="savePass">Сохранить</button>`);

  document.getElementById('savePass').onclick = async () => {
    const password = document.getElementById('fPass').value;
    if (password.length < 6) return ui.warning('Пароль минимум 6 символов');
    await api.post(`/admin/users/${u.id}/reset-password`, { password });
    closeModal();
    ui.success('Пароль обновлён');
  };
}

async function deleteUser(u) {
  const ok = await ui.confirm({
    title: 'Удалить пользователя?',
    message: `${u.displayName} (@${u.username}) будет удалён без возможности восстановления.`,
    danger: true,
    confirmText: 'Удалить'
  });
  if (!ok) return;
  await api.delete(`/admin/users/${u.id}`);
  await load();
  ui.success('Пользователь удалён');
}

window.closeModal = closeModal;
load();
