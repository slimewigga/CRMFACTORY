const TOKEN_KEY = 'dbcrm_token';
const USER_KEY = 'dbcrm_user';

const api = {
  async request(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.href = '/';
      return;
    }

    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  },

  get: (path) => api.request(path),
  post: (path, body) => api.request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => api.request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => api.request(path, { method: 'DELETE' }),

  saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/';
  },

  requireAuth() {
    if (!localStorage.getItem(TOKEN_KEY)) {
      window.location.href = '/';
      return false;
    }
    return true;
  },

  requireAdmin() {
    const user = api.getUser();
    if (!user || user.role !== 'admin') {
      window.location.href = '/app.html';
      return false;
    }
    return true;
  }
};

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatLongDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
