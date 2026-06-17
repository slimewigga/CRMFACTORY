const ui = (() => {
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  const ICONS = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  function ensureRoot() {
    if (document.getElementById('ui-root')) return;

    const root = document.createElement('div');
    root.id = 'ui-root';
    root.innerHTML = `
      <div class="toast-container" id="toastContainer"></div>
      <div class="confirm-overlay" id="confirmOverlay">
        <div class="confirm-dialog" role="dialog" aria-modal="true">
          <div class="confirm-icon" id="confirmIcon">⚠️</div>
          <h3 class="confirm-title" id="confirmTitle">Подтвердите действие</h3>
          <p class="confirm-message" id="confirmMessage"></p>
          <div class="confirm-actions">
            <button type="button" class="btn btn-secondary" id="confirmCancel">Отмена</button>
            <button type="button" class="btn btn-primary" id="confirmOk">Да</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
  }

  function toast(message, type = 'info', duration = 3500) {
    ensureRoot();
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
      <span class="toast-text">${escapeHtml(String(message))}</span>
      <button type="button" class="toast-close" aria-label="Закрыть">&times;</button>
    `;

    const remove = () => {
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 250);
    };

    el.querySelector('.toast-close').addEventListener('click', remove);
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-in'));

    if (duration > 0) setTimeout(remove, duration);
  }

  function confirm(options = {}) {
    ensureRoot();
    const {
      title = 'Подтвердите действие',
      message = '',
      confirmText = 'Да',
      cancelText = 'Отмена',
      danger = false,
      icon = danger ? '🗑️' : '❓'
    } = typeof options === 'string' ? { message: options } : options;

    return new Promise(resolve => {
      const overlay = document.getElementById('confirmOverlay');
      const okBtn = document.getElementById('confirmOk');
      const cancelBtn = document.getElementById('confirmCancel');

      document.getElementById('confirmIcon').textContent = icon;
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMessage').textContent = message;
      okBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;

      okBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';

      const close = result => {
        overlay.classList.remove('active');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        overlay.onclick = null;
        document.removeEventListener('keydown', onKey);
        resolve(result);
      };

      const onKey = e => {
        if (e.key === 'Escape') close(false);
        if (e.key === 'Enter') close(true);
      };

      okBtn.onclick = () => close(true);
      cancelBtn.onclick = () => close(false);
      overlay.onclick = e => { if (e.target === overlay) close(false); };
      document.addEventListener('keydown', onKey);

      overlay.classList.add('active');
      cancelBtn.focus();
    });
  }

  return {
    toast,
    success: (msg, d) => toast(msg, 'success', d),
    error: (msg, d) => toast(msg, 'error', d),
    info: (msg, d) => toast(msg, 'info', d),
    warning: (msg, d) => toast(msg, 'warning', d),
    confirm
  };
})();
