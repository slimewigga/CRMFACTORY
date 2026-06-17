if (localStorage.getItem('dbcrm_token')) {
  window.location.href = '/app.html';
}

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab === 'login' ? 'loginForm' : 'registerForm').classList.add('active');
  });
});

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const err = document.getElementById('loginError');
  err.textContent = '';
  try {
    const data = await api.post('/auth/login', {
      login: document.getElementById('loginInput').value,
      password: document.getElementById('loginPassword').value
    });
    api.saveSession(data.token, data.user);
    window.location.href = '/app.html';
  } catch (ex) {
    err.textContent = ex.message;
  }
});

document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const err = document.getElementById('registerError');
  err.textContent = '';
  try {
    const data = await api.post('/auth/register', {
      displayName: document.getElementById('regName').value,
      username: document.getElementById('regUsername').value,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPassword').value
    });
    api.saveSession(data.token, data.user);
    window.location.href = '/app.html';
  } catch (ex) {
    err.textContent = ex.message;
  }
});
